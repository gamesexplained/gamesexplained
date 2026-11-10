#!/usr/bin/env python3
"""The Items tab's data, read from the game's own files: every item list (ITEMFILE) on the eight disk
sides with the places that give it, every item a monster file (MON) carries, the random treasure's
table, the item types and name words, the spell names a scroll shows, and the saved character
$01PENDRAGON the page's sheet is built on. Writes the JSON between the por-items tags of items.html.

  python3 games/c64/pool-of-radiance/scripts/items_data.py

It reads the files of the eight disk sides from work/files/<side>/, as bestiary_data.py does (see its
-h): work/ is gitignored, the images being the contributor's own copy. The word and type tables and the
random treasure's table come from the committed listings (tables and post-com parts).

An item is 16 bytes: its type, three name words (printed third, second, first), its plus, a byte
armour_bonus adds to the saving-throw bonus, its flags (bit 7 readied, bits 0-2 hide a word each until
the item is identified), a byte with bit 7 for cursed, its weight, its count, its worth, and three
bytes for charges and powers or, on a scroll, its three spells. An ITEMFILE is a list of them after
the two-byte load address; the script command TREASURE names the file by its number in its eighth
operand (post-com, set_out_items, $0F15). A number with bit 7 set asks for that many random items
instead (random_items, $1E68).

Which script gives which list comes from the scripts themselves: areas/events.py ties each TREASURE to
the squares it is met on, and three scripts pick the list from a variable, read by hand: the Temple of
Bane quarter (ECL18 SAVEs 4, 6, 8, 9 or 17 before its TREASURE at $AA34), the lizard men's keep (ECL10
reads 31 or 32 from the table at $ACBA) and the city hall (ECL08 SAVEs 51 at $A058).
"""
import glob, json, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(GAME, "areas"))
from bestiary_data import FILES, SIDES, side_files, name  # noqa: E402
import ecl     # noqa: E402
import events  # noqa: E402

# The lists three scripts choose from a variable: (side, script) -> numbers (see the docstring).
VARIABLE = {(1, 0x18): [4, 6, 8, 9, 17], (8, 0x10): [31, 32], (3, 0x08): [51]}


def listing_memory(part):
    m = bytearray(65536)
    for r in json.load(open(os.path.join(GAME, "parts", part, "listing.json")))["records"]:
        for i, b in enumerate(r.get("b") or []):
            m[r["a"] + i] = b
    return m


def flow(b, base=0x9900):
    """ecl.flow, stepping over a jump whose target is not a number."""
    seen, todo = {}, [base + 4 * k for k in range(5)]
    while todo:
        a = todo.pop()
        if not isinstance(a, int) or a in seen or not base <= a < base + len(b):
            continue
        r = ecl.decode(b, base, a - base)
        if not r or r[0][0] != a:
            seen[a] = None
            continue
        _, cmd, ops = r[0]
        seen[a] = (cmd, ops)
        if cmd in (1, 2):
            todo.append(ops[0].v)
        if cmd in (37, 38):
            todo += [o.v for o in ops[2:]]
        if cmd not in (0, 1, 19, 32, 56):
            n = ecl.cmd_len(b, a - base)
            todo.append(a + n)
            if 22 <= cmd <= 27:
                n2 = ecl.cmd_len(b, a - base + n)
                if n2:
                    todo.append(a + n + n2)
    return {k: v for k, v in seen.items() if v}


def treasure_refs():
    """(side, number) -> the scripts that give that list or that many random items."""
    refs = defaultdict(set)
    for s, d in enumerate(SIDES, 1):
        for p in sorted(glob.glob(os.path.join(FILES, d, "ECL[0-9A-F][0-9A-F]"))):
            n = int(p[-2:], 16)
            if n >= 0x64:              # ECL64 and ECL65 are code and a table, not scripts
                continue
            _, b = ecl.load(p)
            f = flow(b)
            for cmd, ops in f.values():
                if cmd == 39 and ops[7].kind in (0, 2) and ops[7].v not in (0, 255):
                    refs[(s, ops[7].v)].add(n)
            for v in VARIABLE.get((s, n), []):
                refs[(s, v)].add(n)
    return refs


def squares():
    """(script, list number) -> {(map, square)}, from the events of every map, and script -> its maps."""
    orig = events.money
    seen, maps_of = defaultdict(set), defaultdict(set)

    def money(ops):
        it = ops[7]
        tag = it.v if it.kind in (0, 2) else None
        return orig(ops) + ('' if tag in (None, 0, 255) else ' #%d' % tag)
    events.money = money
    try:
        maps = sorted(int(os.path.basename(p)[3:], 16) for p in glob.glob(os.path.join(FILES, "*", "GEO*")))
        data = events.export(maps)
    finally:
        events.money = orig
    for mk, layers in data.items():
        m = int(mk, 16)
        for L in layers:
            maps_of[int(L["s"], 16)].add(m)
            at = defaultdict(list)
            for sq, hs in L["sq"].items():
                for ev, _ in hs:
                    at[ev].append(int(sq))
            for i, ev in enumerate(L["ev"]):
                for r in ev.get("r", []):
                    for t in re.findall(r"#(\d+)", r):
                        for sq in at.get(i, []):
                            seen[(int(L["s"], 16), int(t))].add((m, sq))
                        seen[(int(L["s"], 16), int(t))].add((m, None))
    return seen, maps_of


def spell_names():
    d = open(os.path.join(FILES, SIDES[0], "SPELLN00"), "rb").read()[2:]
    rd = lambda a: d[a - 0xAF00]   # noqa: E731  SPELLN00 loads at $AF00 (combat-set, print_spell_name)
    out = [""]
    for n in range(1, 0x39):
        a = rd(0xAF00 + n) | rd(0xAF80 + n) << 8
        s = bytearray()
        while rd(a):
            s.append(rd(a))
            a += 1
        out.append(s.decode("latin1"))
    return out


def main():
    lists = side_files("ITEMFILE")
    mons = side_files("MON")
    if not lists or not mons:
        sys.exit("no ITEMFILE or MON files under work/files: extract the disk sides first (bestiary_data.py -h)")
    T = listing_memory("tables")
    P = listing_memory("post-com")

    def word(n):
        a = T[0x6F00 + n] | T[0x7000 + n] << 8
        s = bytearray()
        while n and T[a]:
            s.append(T[a])
            a += 1
        return s.decode("latin1")
    words = [word(n) for n in range(256)]
    types = [T[0x7B00 + 16 * t:0x7B10 + 16 * t].hex() for t in range(128)]

    refs = treasure_refs()
    where, maps_of = squares()
    sets = []
    for (s, n), b in sorted(lists.items(), key=lambda x: (x[0][1], x[0][0])):
        items = [b[i:i + 16].hex() for i in range(0, len(b) - 15, 16)]
        at = []
        for e in sorted(refs.get((s, n), [])):
            maps = sorted({m for (m, sq) in where.get((e, n), set())} or maps_of.get(e, set()))
            sqs = sorted({(m, sq) for (m, sq) in where.get((e, n), set()) if sq is not None})
            at.append({"e": e, "p": events.PLACES.get(e, "script %02X" % e), "m": ["%02X" % m for m in maps],
                       "sq": [[m, sq & 15, sq >> 4] for m, sq in sqs][:12]})
        sets.append({"n": n, "s": s, "i": items, "at": at})

    rnd = []
    for (s, n), es in sorted(refs.items()):
        if 128 < n < 255:
            for e in sorted(es):
                rnd.append({"k": n & 127, "s": s, "e": e, "p": events.PLACES.get(e, ""),
                            "m": ["%02X" % m for m in sorted({m for (m, sq) in where.get((e, n), set())} or maps_of.get(e, set()))]})

    carried = defaultdict(lambda: {"who": set(), "f": set()})
    for (s, n), r in sorted(mons.items()):
        for i in range(0x120, len(r) - 15, 16):
            it = bytearray(r[i:i + 16])
            if not it[0]:
                continue
            it[6] &= 0x7F               # add_monster_items clears the readied bit
            c = carried[bytes(it).hex()]
            c["who"].add(name(r))
            c["f"].add((s, n))
    mon_items = [{"i": k, "who": sorted(v["who"]), "f": sorted(v["f"])} for k, v in sorted(carried.items())]

    rand = {k: list(P[a:a + 36]) for k, a in (("chance", 0x1F7C), ("type", 0x1FA0), ("n3", 0x1FC4), ("n2", 0x1FE8))}
    rand["wt"] = [P[0x200C + i] | P[0x2030 + i] << 8 for i in range(36)]
    rand["worth"] = [P[0x2054 + i] | P[0x2078 + i] << 8 for i in range(36)]

    pen = open(os.path.join(FILES, SIDES[2], "$01PENDRAGON"), "rb").read()[2:]
    out = {"w": words, "t": types, "sets": sets, "rnd": rnd, "mon": mon_items, "rand": rand,
           "spells": spell_names(), "pen": pen.hex()}
    page = os.path.join(GAME, "items.html")
    t = open(page).read()
    js = json.dumps(out, separators=(",", ":"))
    new, k = re.subn(r'(<script type="application/json" id="por-items">).*?(</script>)',
                     lambda m: m.group(1) + js + m.group(2), t, flags=re.S)
    if k != 1:
        sys.exit("items.html has no por-items tag")
    open(page, "w").write(new)
    print(f"{len(sets)} item lists, {len(mon_items)} items on monsters, {len(rnd)} random treasures, {len(js):,} bytes")


if __name__ == "__main__":
    if "-h" in sys.argv[1:]:
        print(__doc__)
        sys.exit()
    main()
