#!/usr/bin/env python3
"""The Bestiary tab's data, read from the game's own files: every monster file (MON), the combat
figure (COMPIC), close-up (PIC) and 3D-view sprites (SPRITE) its scripts show it with, and the scripts
(ECL) that load it. Writes the JSON between the por-bestiary tags of bestiary.html.

  python3 games/c64/pool-of-radiance/scripts/bestiary_data.py

It reads the files of the eight disk sides from work/files/<side>/, extracted with
`python3 kit/c64/disk.py extract work/disks/<side>.d64 work/files/<side>` for each side (work/ is
gitignored: the images are the contributor's own copy).

A monster file is a character record, loaded by the script command LOAD MONSTER (dungeon,
cmd_load_monster, $1AC6) with three operands: the file's number, how many, and the combat figure's
number. SETUP MONSTER (cmd_setup_monster, $1F0A) and ENCOUNTER MENU name the 3D-view sprite and the
close-up the party sees first. The numbers are the disk side's own: MON16 is a different monster on
two sides. An operand is a number, a variable set by SAVE from a number, or a byte of a table in the
script read by GET TABLE with an index from RANDOM or SAVE; those are followed here. A close-up or
sprite goes with a monster only when an encounter that loads it shows one with a number of its own
(its file's, or the figure it is loaded with most), the scripts' habit for a kind of monster; people,
drawn with the shared figures of fighters, thieves, clerics and magic-users, are mostly met in front
of whoever leads them, and get none of their own.
"""
import base64, glob, hashlib, json, os, re, sys
from collections import Counter, defaultdict

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = os.path.join(GAME, "work", "files")
SIDES = ["disk1_of_4_Side_A", "disk1_of_4_Side_B", "disk2_of_4_Side_A", "disk2_of_4_Side_B",
         "disk3_of_4_Side_A", "disk3_of_4_Side_B", "disk4_of_4_Side_A", "disk4_of_4_Side_B"]

# The script language (dungeon part, command_table): operand counts from operand_counts ($1625);
# SETUP MONSTER reads 3, ENCOUNTER MENU 14, ADD NPC 2, and the menus and ON GOTO/GOSUB a count.
COUNTS = [0, 1, 1, 2, 3, 3, 3, 3, 2, 2, 1, 3, 2, 0, 1, 2, 2, 1, 1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 2, 1, 3,
          2, 4, 0, 0, 0, 8, 3, 13, 3, 0, 6, 1, 5, 3, 3, 0, 1, 0, 1, 3, 1, 3, 1, 1, 0, 3, 1, 0]
GOTO, GOSUB, ADD, RANDOM, SAVE, LOAD_MONSTER, SETUP_MONSTER, PICTURE = 1, 2, 4, 8, 9, 11, 12, 14
ON_GOTO, ON_GOSUB, ENCOUNTER_MENU, GET_TABLE, ADD_NPC = 37, 38, 41, 42, 54
ENDS = (0, 1, 19, 32)          # EXIT, GOTO, RETURN, NEW ECL: the next command is not reached
KINDS = (0, 1, 2, 3, 0x80, 0x81)   # the operand types the scripts use; other bytes there are not commands
IFS = range(22, 28)            # an IF before one of those makes it conditional
HEAD = 0x6DE1                  # SAVEd to: a portrait's head, or 255 for a whole close-up


def side_files(prefix):
    out = {}
    for s, d in enumerate(SIDES, 1):
        for f in sorted(glob.glob(os.path.join(FILES, d, prefix + "[0-9A-F][0-9A-F]"))):
            out[(s, int(f[-2:], 16))] = open(f, "rb").read()[2:]    # less the load address
    return out


def operand(b, i):
    k = b[i]
    if k == 0:
        return (0, b[i + 1]), i + 2
    if k == 0x80:
        return (0x80, None), i + 2 + b[i + 1]
    return (k, b[i + 1] | b[i + 2] << 8), i + 3


def command(b, i):
    cmd = b[i]
    if cmd >= len(COUNTS):
        return None
    i += 1
    ops = []
    n = {SETUP_MONSTER: 3, ENCOUNTER_MENU: 14, ADD_NPC: 2}.get(cmd, COUNTS[cmd])
    if cmd in (21, 43, ON_GOTO, ON_GOSUB):
        for _ in range(2 if cmd == 21 else 1):
            o, i = operand(b, i)
            ops.append(o)
        c, i = operand(b, i)
        ops.append(c)
        n = c[1] if c[0] == 0 else 0
    for _ in range(n):
        o, i = operand(b, i)
        ops.append(o)
    return cmd, ops, i


def flow(b, base=0x9900):
    """The commands reached from the script's five entries, in address order. ON GOTO goes on to the
    next command when its index is not below its count (dungeon cmd_on_goto, $2091), and some scripts
    rely on it, as side 8's ECL1D does to reach NORRIS THE GRAY's fight; others keep a table there.
    So the bytes after an ON GOTO are followed only when every command they lead to, up to a command
    already reached or an end, reads as one with the operand types the scripts use."""
    seen, work = {}, [(base + 4 * k, False) for k in range(5)]
    while work:
        a, tentative = work.pop()
        run, more, prev_if, ok = {}, [], False, True
        while isinstance(a, int) and base <= a < base + len(b) and a not in seen and a not in run:
            try:
                c = command(b, a - base)
            except IndexError:
                ok = not tentative
                break
            if c is None or (tentative and any(o[0] not in KINDS for o in c[1])):
                ok = not tentative
                break
            cmd, ops, nxt = c
            run[a] = (cmd, ops)
            if cmd in (GOTO, GOSUB) and ops[0][0] == 1:
                more.append((ops[0][1], False))
            if cmd in (ON_GOTO, ON_GOSUB):
                more += [(o[1], False) for o in ops[2:] if o[0] == 1]
                if cmd == ON_GOTO and not prev_if:
                    more.append((base + nxt, True))
                    break
            if cmd in ENDS and not prev_if:
                break
            prev_if = cmd in IFS
            a = base + nxt
        if ok:
            seen.update(run)
            work += more
    return [(a,) + seen[a] for a in sorted(seen)]


def resolver(b, cmds, base=0x9900):
    """of(operand): its possible values as (value, key), the key pairing values read with one index."""
    sets, rnd, incs, shifts = defaultdict(list), {}, set(), {}
    for at, cmd, ops in cmds:
        if cmd == SAVE and ops[0][0] in (0, 2) and ops[1][0] == 1:
            sets[ops[1][1]].append(("c", ops[0][1]))
        if cmd == GET_TABLE and ops[0][0] == 1 and ops[2][0] == 1:
            sets[ops[2][1]].append(("t", ops[0][1], ops[1]))
        if cmd == RANDOM and ops[0][0] == 0 and ops[1][0] == 1:
            rnd[ops[1][1]] = max(rnd.get(ops[1][1], 0), ops[0][1])
        if cmd == ADD and ops[0] == (0, 1) and ops[1][0] == 1 and ops[1] == ops[2]:
            incs.add(ops[1][1])
        elif cmd == ADD and ops[0][0] == 0 and ops[1][0] == 1 and ops[1] == ops[2]:
            shifts[ops[1][1]] = max(shifts.get(ops[1][1], 0), ops[0][1])   # side 7's ECL16 adds 7 to a
                                                                            # RANDOM 5 to read 13 entries
        elif cmd == ADD and ops[2][0] == 1 and sorted(o[0] for o in ops[:2]) == [0, 1]:
            lit, var = sorted(ops[:2])          # a number and a variable: the sum, as side 1's ECL18
            sets[ops[2][1]].append(("a", lit[1], var))   # loads a group's leader from the next file

    def indices(var):
        vs = [s[1] for s in sets.get(var, []) if s[0] == "c"]
        hi = max([rnd.get(var, -1)] + vs) if (var in rnd or vs) else 7
        return range(hi + (3 if var in incs else 0) + shifts.get(var, 0) + 1)

    def table(t, i):
        o = t - base + i
        return b[o] if 0 <= o < len(b) else None

    def of(op, depth=0):
        k, v = op
        if k == 0:
            return [(v, None)]
        out = []
        for s in sets.get(v, []):
            if s[0] == "c":
                out.append((s[1], None))
            elif s[0] == "a":
                if depth < 3:
                    out += [((x + s[1]) & 255, key) for x, key in of(s[2], depth + 1)]
            elif s[2][0] == 0:
                out.append((table(s[1], s[2][1]), None))
            elif s[2][0] == 1:
                out += [(table(s[1], i), (s[2][1], i)) for i in indices(s[2][1])]
        return [x for x in out if x[0] is not None]
    return of


def pairs(of, a, c):
    if a == c:
        return {(v, v) for v, _ in of(a)}
    return {(va, vc) for va, ka in of(a) for vc, kc in of(c) if not (ka and kc and ka != kc)}


def name(r):
    return r[:16].split(b"\0")[0].decode("latin-1")


def b64(x):
    return base64.b64encode(x).decode()


def whole_picture(b):
    """A close-up file's frames (ANIMATE00's format) end exactly where the file does."""
    try:
        if b[0x2D] * b[0x2E] != b[0x31] or b[0x31] * 8 != (b[0x2F] | b[0x30] << 8) or b[0x31] > 121:
            return False
        p, k = 0x38, 0
        while b[k]:
            for _ in range(2):
                while b[p]:
                    p += 2 if b[p] & 0x80 else 1 + b[p]
                p += 1
            k += 1
        return k > 0 and p == len(b)
    except IndexError:
        return False


def map_names():
    t = open(os.path.join(GAME, "levels.html")).read()
    m = re.search(r"const POR_MAPS = (\[.*?\]);\n", t, re.S)
    out = {}
    for x in json.loads(m.group(1)):
        s = (int(x["disk"]) - 1) * 2 + (1 if x["side"] == "A" else 2)
        out[(s, int(x["n"], 16))] = x.get("name") or ""
    return out


def main():
    mons, pics, sprites, figs, ecls = (side_files(p) for p in ("MON", "PIC", "SPRITE", "COMPIC", "ECL"))
    if not mons:
        sys.exit("no MON files under " + FILES + ": extract the disk sides first (see -h)")
    fig, look, fights, joins = defaultdict(Counter), defaultdict(Counter), defaultdict(set), defaultdict(set)
    pictures = defaultdict(set)    # the close-ups a script's PICTURE commands show
    for (s, n), b in sorted(ecls.items()):
        cmds = flow(b)
        of = resolver(b, cmds)
        shown, head = set(), None
        for at, cmd, ops in cmds:
            if cmd == SAVE and ops[1] == (1, HEAD):
                head = ops[0][1] if ops[0][0] in (0, 2) else None
            if cmd in (SETUP_MONSTER, ENCOUNTER_MENU):
                shown = {(sp, pc, head) for sp, pc in pairs(of, ops[0], ops[2])}
            if cmd == LOAD_MONSTER:
                for m, f in pairs(of, ops[0], ops[2]):
                    if (s, m) in mons:
                        fig[(s, m)][f] += 1
                        fights[(s, m)].add(n)
                        for x in shown:
                            look[(s, m)][x] += 1
            if cmd == PICTURE:
                pictures[(s, n)] |= {v for v, _ in of(ops[0])}
            if cmd == ADD_NPC:
                for m, _ in of(ops[0]):
                    if (s, m) in mons:
                        joins[(s, m)].add(n)

    store = {"pics": {}, "sprites": {}, "figs": {}}

    def keep(kind, data):
        d, h = store[kind], hashlib.md5(data).hexdigest()
        if h not in d:
            d[h] = (len(d), data)
        return d[h][0]

    maps = map_names()

    def place(s, e):
        """[disk side 1-8, script number, the map's name or "", whether the Maps tab draws it]"""
        return [s, e, maps.get((s, e), ""), (s, e) in maps]

    # one entry per name; a record that differs in any byte is a version of its own
    groups = defaultdict(list)
    for k in sorted(mons):
        groups[name(mons[k])].append(k)
    entries = []
    for nm, keys in sorted(groups.items()):
        recs = {}
        for k in keys:
            v = recs.setdefault(mons[k], {"files": [], "figs": Counter(), "fights": set(), "joins": set()})
            v["files"].append(k)
            v["figs"].update({(k[0], f): c for f, c in fig[k].items()})
            v["fights"] |= {(k[0], e) for e in fights[k]}
            v["joins"] |= {(k[0], e) for e in joins[k]}
        anyfig = Counter()          # a version no script loads takes the figure another version has
        for v in recs.values():
            anyfig.update(v["figs"])
        # the close-up and sprite: one an encounter that loads it shows, with a number of its own:
        # its file's, then the figure it is loaded with most, then another version's file's; the
        # most often shown wins. Failing those, for a monster (race 0, not a person), a close-up
        # with its file's number that a PICTURE command shows in a script that loads it.
        best, mine = Counter(), {k[1] for k in keys}
        for k in keys:
            own = [k[1]] + [f for f, _ in fig[k].most_common(1)]
            rank = lambda n: own.index(n) if n in own else 2 if n in mine else None
            for (sp, pc, hd), c in look[k].items():
                if hd in (255, None) and rank(pc) is not None and (k[0], pc) in pics:
                    best[("pic", rank(pc), k[0], pc)] += c
                if rank(sp) is not None and (k[0], sp) in sprites:
                    best[("spr", rank(sp), k[0], sp)] += c
            if mons[k][0x72] == 0 and k in pics and any(k[1] in pictures[(k[0], e)] for e in fights[k]):
                best[("pic", 3) + k] += 1
        pic = spr = None
        for (kind, rank, s, n), c in sorted(best.items(), key=lambda x: (x[0][1], -x[1], x[0])):
            if kind == "pic" and pic is None:
                pic = keep("pics", pics[(s, n)])
            if kind == "spr" and spr is None:
                spr = keep("sprites", sprites[(s, n)])
        out = []
        for r, v in recs.items():
            f = (v["figs"] or anyfig).most_common(1)
            out.append({"rec": b64(r), "files": sorted(v["files"]),
                        "fig": keep("figs", figs[f[0][0]]) if f and f[0][0] in figs else None,
                        "fights": [place(s, e) for s, e in sorted(v["fights"])],
                        "joins": [place(s, e) for s, e in sorted(v["joins"])]})
        out.sort(key=lambda v: v["files"][0])
        entries.append({"name": nm, "pic": pic, "spr": spr, "records": out})
    # every other close-up, sprite set and figure on the disks, once each
    others = {"pics": [], "sprites": [], "figs": []}
    for kind, files in (("pics", pics), ("sprites", sprites), ("figs", figs)):
        seen = {}
        for k, data in sorted(files.items()):
            h = hashlib.md5(data).hexdigest()
            if h in store[kind]:
                continue
            if kind == "pics" and not whole_picture(data):
                continue
            if h not in seen:
                seen[h] = {"i": keep(kind, data), "files": []}
                others[kind].append(seen[h])
            seen[h]["files"].append(k)
    data = {k: [b64(x) for _, x in sorted(d.values())] for k, d in store.items()}
    data["monsters"] = entries
    data["others"] = others
    page = os.path.join(GAME, "bestiary.html")
    t = open(page).read()
    js = json.dumps(data, separators=(",", ":"))
    new, n = re.subn(r'(<script type="application/json" id="por-bestiary">).*?(</script>)',
                     lambda m: m.group(1) + js + m.group(2), t, flags=re.S)
    if n != 1:
        sys.exit("bestiary.html has no por-bestiary tag")
    open(page, "w").write(new)
    print(f"{len(entries)} names, {sum(len(e['records']) for e in entries)} records, {len(data['pics'])} close-ups, "
          f"{len(data['sprites'])} sprite sets, {len(data['figs'])} figures, {len(js):,} bytes")


if __name__ == "__main__":
    if "-h" in sys.argv[1:]:
        print(__doc__)
        sys.exit()
    main()
