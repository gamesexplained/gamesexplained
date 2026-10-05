#!/usr/bin/env python3
"""Build listing.json, the data behind the Source tab, from symbols.json
and the contributor's own snapshot.

The platform's own decoder (kit/<platform>/cpu.py), so the listing depends
on no disassembler. Emits one record per instruction or data item for
every byte the ledger counts as the game (code blocks, typed data blocks,
symbol-owned spans), and a gap record for each skipped run. Labels,
comments and block types come from symbols.json; the bytes come from the
snapshot, read by kit/<platform>/snapshot.py; cross-references are
computed here.

Then it lists the data the ledger does not count. RAM that a default
exclusion covers but a game can still use (on the C64, the RAM under the
I/O area) is named whenever it holds data and game.json has not said what
it is. With the hand-over snapshot, so is every stretch of loaded data,
the same bytes at the hand-over and in play, that the ledger neither
tracks nor has been told to leave out: the tail of a table longer than
its symbol's reach, a table no symbol starts, a picture nothing refers to
by address. And so is data copied after the hand-over: a stretch of 32
bytes or more that nothing tracks in play and that the hand-over holds at
another address is listed with both addresses.

An address the chips share with RAM (the platform's "hidden" ranges: on
the C64, $D000-$DFFF) has two meanings, and an instruction's operand there
takes the one the instruction sees. Code located in that range runs with
the chips banked out, so it sees the RAM and gets the game's symbols; all
other code sees the chips, and gets the register's name from
kit/<platform>/registers.py, or the bare address where there is none. A
jump or a call always gets the code's symbol. game.json overrides the rule
for code that banks the chips out itself, over the instructions' own
addresses, the last row that holds the instruction deciding:

  "io": [["$B275", "$B2F0", "ram", "the I/O area is banked out from $B273 to $B2F1"]]

with "registers" for code under the I/O area that banks the chips in.

A part of a game that is several loads (kit/scripts/parts.py) is listed
from its own folder and its own snapshot, and holds only the addresses it
owns. Where it lies over another part, an operand that points out of it
takes that part's name: when one of those changes, `--relabel` names the
part's operands again (check_listing.py says when). The Source tab lays
the part over the listings beneath it.

Usage:
  listing.py <game dir> <snapshot> [--entry <hand-over snapshot>]
                         the hand-over defaults to the platform's work/entry.<ext>
  listing.py <game dir> --relabel
                         name the operands of the existing listing.json again,
                         for a change to "io" or to the register names, without
                         the snapshot; refused once symbols.json has changed
  listing.py <game dir> --recomment
                         put symbols.json's comments and label names into the
                         existing listing.json, without the snapshot; refused
                         when anything else in symbols.json has changed since
                         the listing was built (its blocks, its symbols'
                         addresses and types, which addresses carry a comment,
                         the ledger), or when git no longer has that symbols.json

Record fields (short, the file is large):
  a  address            t  kind: code | byte | word | addr | lohi | text | gap | note
  b  bytes              m  mnemonic (code)         o  operand text, symbolic
  oa operand address, except on a chip's register (nothing in the listing is there)
  l  label at this address                         c  line comment
  s  side comment       x  addresses that reference this one
  d  decoded text (text records) / value list (word, addr)
  ta the targets of a split table, on its first row, as addresses
"""
import hashlib, importlib.util, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledger import compute

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The ledger, the record format and this whole loop are shared. What the CPU is,
# how a snapshot is read and what a text byte means are the machine's: each
# platform keeps a `cpu.py` and a `snapshot.py` beside its other code, and this
# script loads them by `game.json`'s platform. The interface is in kit/PLATFORMS.md.
_PLATFORM = {}


def platform_modules(platform):
    """(cpu, snapshot) for `platform`, loaded by path from kit/<platform>/."""
    if platform in _PLATFORM:
        return _PLATFORM[platform]
    d = os.path.join(KIT, platform or "")
    if not platform or not os.path.isdir(d):
        sys.exit(f'game.json names platform {platform!r}, but kit/{platform}/ does not exist')
    if d not in sys.path:
        sys.path.insert(0, d)          # so a platform module can import its own siblings (z80.py)
    mods = []
    for name in ("cpu", "snapshot"):
        path = os.path.join(d, name + ".py")
        spec = importlib.util.spec_from_file_location(f"{platform}_{name}", path)
        mod = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = mod
        spec.loader.exec_module(mod)
        mods.append(mod)
    _PLATFORM[platform] = tuple(mods)
    return _PLATFORM[platform]


def symbol_names(sym):
    names = {}
    for s in sym["symbols"]:
        names.setdefault(s["address"], s["name"])     # first name wins
    return names


def all_names(gdir, game, sym):
    """The symbol map's own names and, for a part that lies over others, the names those give
    the addresses this part does not own: how an operand that points out of the part reads."""
    names = symbol_names(sym)
    if (game.get("part") or {}).get("over"):
        from parts import names_under
        for a, n in names_under(gdir, game).items():
            names.setdefault(a, n)
    return names


def register_names(platform):
    """kit/<platform>/registers.py's NAMES, or none."""
    path = os.path.join(KIT, platform or "", "registers.py")
    if not platform or not os.path.exists(path):
        return {}
    spec = importlib.util.spec_from_file_location(f"{platform}_registers", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.NAMES


def io_meaning(game):
    """chips(target, at): whether the instruction at `at` sees a chip's register at
    `target` rather than the RAM beneath it. The rule is in this file's help."""
    from symbols_export import PLATFORM_DEFAULTS, hexint, platform_of
    plat = PLATFORM_DEFAULTS.get(platform_of(game), {})
    hidden = [(hexint(r[0]), hexint(r[1])) for r in plat.get("hidden", [])]
    rows = []
    for r in game.get("io", []):
        if len(r) != 4 or r[2] not in ("ram", "registers"):
            sys.exit(f'game.json "io": each row is [first, last, "ram" or "registers", why], not {r}')
        rows.append((hexint(r[0]), hexint(r[1]), r[2] == "registers"))

    def two(a):
        return any(lo <= a <= hi for lo, hi in hidden)

    def chips(target, at):
        if not two(target):
            return False
        for lo, hi, registers in reversed(rows):
            if lo <= at <= hi:
                return registers
        return not two(at)
    return chips


def copies(ram, entry, look, least=32):
    """What the play image holds at the addresses look marks that the hand-over image holds at
    another address: data copied after the hand-over, out of the way of the I/O area, under a
    ROM or into another bank (#146). Each is (start, end, where the hand-over holds it): a run
    of `least` bytes found exactly, then as far as the two agree, less the $00 and $FF at its
    ends; runs a few bytes apart at the same distance from their source are one copy that the
    game has since changed a byte of."""
    img, out, a = bytes(entry), [], 0
    while a < 0x10000:
        if not look[a]:
            a += 1; continue
        b = a
        while b < 0x10000 and look[b]:
            b += 1
        i = a
        while i + least <= b:
            w = bytes(ram[i:i + least])
            src = img.find(w) if len(set(w) - {0, 0xFF}) >= 4 else -1   # a fill, or a near-blank shape, is everywhere
            while src == i:
                src = img.find(w, src + 1)
            if src < 0:
                i += 1; continue
            n = least
            while i + n < b and src + n < 0x10000 and ram[i + n] == entry[src + n]:
                n += 1
            s, e = i, i + n - 1                # unwritten RAM ($00, $FF) on either side agrees too
            while ram[s] in (0, 0xFF):
                s += 1
            while ram[e] in (0, 0xFF):
                e -= 1
            if out and out[-1][0] >= a and out[-1][2] - out[-1][0] == src - i and s - out[-1][1] <= 16:
                out[-1] = (out[-1][0], e, out[-1][2])
            else:
                out.append((s, e, src + s - i))
            i += n
        a = b
    return out


def uncounted(game, reg, L, ram, entry=None, top=12):
    """The data the ledger does not count, as lines to print (none when there is nothing).

    $00 and $FF are not counted as data anywhere here: the emulator fills unwritten RAM
    with them, and a stretch of that pattern is not the game's."""
    from symbols_export import PLATFORM_DEFAULTS, hexint, platform_of
    plat = PLATFORM_DEFAULTS.get(platform_of(game), {})
    cov = game.get("coverage", {})

    def ranges(rows):
        return [(hexint(r[0]), hexint(r[1])) for r in rows]

    def inside(a, rs):
        return any(lo <= a <= hi for lo, hi in rs)

    away = [(lo, hi) for lo, hi, _ in game.get("elsewhere") or []]   # another part's, in a game of several
    said = ranges(cov.get("include", []) + cov.get("exclude", [])) + away
    found = []                                  # (start, end, bytes of data, what)
    hidden = []
    for row in plat.get("hidden", []):          # RAM a default exclusion covers: reported by the page
        lo, hi = hexint(row[0]), hexint(row[1])
        for p in range(lo, hi + 1, 256):
            e = min(p + 255, hi)
            n = sum(1 for a in range(p, e + 1) if ram[a] not in (0, 0xFF) and not inside(a, said))
            if n < 16:                          # the fill pattern leaves a few stray bytes a page
                continue
            if hidden and hidden[-1][1] == p - 1:
                hidden[-1][1] = e; hidden[-1][2] += n
            else:
                hidden.append([p, e, n, f"{row[2]} holds data, and game.json does not say what it is ({row[3]})"])
    found += hidden
    if entry is not None:
        state, owner = L["state"], L["owner"]
        left_out = ranges(cov.get("exclude", [])) + ranges(plat.get("system", [])) + [(s, e) for s, e, *_ in hidden] + away
        free = [not state[a] and not inside(a, left_out) for a in range(0x10000)]
        loaded = [free[a] and ram[a] == entry[a] and ram[a] not in (0, 0xFF) for a in range(0x10000)]
        a = 0
        while a < 0x10000:                      # stretches of loaded data, split at 64 bytes of anything else
            if not loaded[a]:
                a += 1; continue
            s = e = a; n = gap = 0
            while a < 0x10000 and free[a] and gap < 64:
                if loaded[a]:
                    e, n, gap = a, n + 1, 0
                else:
                    gap += 1
                a += 1
            if n < 8:
                continue
            ex = next((name for lo, hi, name in reg["exclude"] if lo <= s <= hi), None)
            before = owner.get(s - 1)
            where = f"excluded by default as {ex}" if ex else \
                f"after {before[0]} (${before[1]:04X})" if before else "untracked"
            found.append([s, e, n, f"loaded with the game, {where}"])
        # data copied after the hand-over differs there at its own address: look for it at another
        for s, e, src in copies(ram, entry, [free[a] and not loaded[a] for a in range(0x10000)]):
            found.append([s, e, e - s + 1, f"copied here after the hand-over, which holds it at ${src:04X}-${src + e - s:04X}"])
        under = [False] * 0x10000
        for p, e, *_ in hidden:
            for a in range(p, e + 1):
                under[a] = not inside(a, said)
        moved = {}
        for s, e, src in copies(ram, entry, under):
            moved.setdefault(next(i for i, h in enumerate(hidden) if h[0] <= s <= h[1]), []).append((s, e, src))
        for i, seen in moved.items():
            (s, e, src), more = seen[0], len(seen) - 1
            hidden[i][3] += (f"; ${s:04X}-${e:04X} is copied there after the hand-over, which holds it at ${src:04X}"
                             + (f", and {more} more stretch{'es' if more > 1 else ''} the same way" if more else ""))
    if not found:
        return []
    found.sort(key=lambda f: -(f[1] - f[0]))
    lines = ["", f"data the ledger does not count ({'hand-over and play snapshots' if entry else 'play snapshot only'}):"]
    for s, e, n, what in found[:top]:
        lines.append(f"  ${s:04X}-${e:04X} {e - s + 1:6} bytes  {what}")
    if len(found) > top:
        rest = found[top:]
        lines.append(f"  and {len(rest)} more stretches, {sum(f[1] - f[0] + 1 for f in rest)} bytes")
    lines.append("Say what each is: label and describe it, or list it in game.json under coverage.extra")
    lines.append("(authored data), coverage.include (RAM under a default exclusion) or coverage.exclude")
    lines.append("(not the game's, with the reason). kit/skills/core/50-coverage, \"Data the ledger cannot see\".")
    return lines


def beneath(gdir, game, ram):
    """Whether the parts this one lies over are the same program in this part's snapshot, as
    lines to print (none when they are, or when it lies over none). Their code, as their own
    listings hold it, is compared with the snapshot: data changes as a game runs, code does not,
    but for an instruction that rewrites itself."""
    from parts import home, parts as all_parts, ranges, under
    top, pid = home(gdir)
    if pid is None:
        return []
    P = all_parts(top)
    me = next(p for p in P if p["id"] == pid)
    chain = under(P, me)
    lines = []
    for n, q in enumerate(chain):
        lp = os.path.join(q["dir"], "listing.json")
        if not os.path.isfile(lp):
            continue
        # this part's load, and the loads of the parts between it and q, replace q's code in their own ranges
        mine = [r for p in [me] + chain[:n] for r in ranges(p)]
        code = {r["a"] + i: b for r in json.load(open(lp))["records"] if r["t"] == "code" for i, b in enumerate(r["b"])
                if not any(lo <= r["a"] + i <= hi for lo, hi in mine)}
        bad = sorted(a for a, b in code.items() if ram[a] != b)
        if bad:
            lines += ["", f"{len(bad)} of the {len(code)} code bytes of {q['id']}, the part beneath, "
                          + ("outside this load's ranges, " if mine else "")
                          + f"differ in this snapshot: {', '.join(f'${a:04X}' for a in bad[:12])}"
                          + (" ..." if len(bad) > 12 else ""),
                      "A few are instructions that rewrite themselves. Many mean this load replaces that code:",
                      'widen "ranges" in this part\'s part.json to take in every address its load writes.']
    return lines


def relabel(gdir, write=True):
    """Name the operands of gdir's listing.json again, from the bytes it already holds.
    Returns how many read differently; write=False only counts them (check_listing.py)."""
    from parts import load_game
    game = load_game(gdir)
    cpu = platform_modules(game.get("platform"))[0]
    spath, lpath = os.path.join(gdir, "symbols.json"), os.path.join(gdir, "listing.json")
    out = json.load(open(lpath))
    if out.get("symbols_sha256") != hashlib.sha256(open(spath, "rb").read()).hexdigest():
        sys.exit(f"{lpath} was built from a different symbols.json: rebuild it from the snapshot")
    names = all_names(gdir, game, json.load(open(spath)))
    regs, chips = register_names(game.get("platform")), io_meaning(game)
    code, xrefs, changed = set(), {}, 0
    for r in out["records"]:
        if r["t"] == "addr":               # a pointer, and a split table's targets: named as they were built
            o = names.get(r["oa"]) or f"${r['oa']:04X}"
            changed += r.get("o") != o; r["o"] = o
        elif "ta" in r:
            d = [names.get(x) or f"${x:04X}" for x in r["ta"]]
            changed += r.get("d") != d; r["d"] = d
        if r["t"] != "code":
            continue
        code.add(r["a"])
        m, mode = cpu.decode(r["b"], 0)[:2]
        o, ta = cpu.operand(r["a"], m, mode, r["b"], names, regs, chips)
        changed += (r.get("o"), r.get("oa")) != (o, ta)
        for k, v in (("o", o), ("oa", ta)):
            r.pop(k, None)
            if v is not None:
                r[k] = v
        if ta is not None:
            xrefs.setdefault(ta, []).append(r["a"])
    if not write:
        return changed
    for r in out["records"]:          # references from data (.addr, split tables) stand as built
        for src in r.get("x", []):
            if src not in code:
                xrefs.setdefault(r["a"], []).append(src)
    for r in out["records"]:
        r.pop("x", None)
        if r["a"] in xrefs:
            r["x"] = sorted(set(xrefs[r["a"]]))
    with open(lpath, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {lpath}: {changed} operands named differently")
    return changed


def built_from(gdir, sha):
    """The symbols.json, from gdir's git history, whose hash is sha; None when there is none."""
    import subprocess
    def git(*args):
        return subprocess.run(["git", "-C", gdir, *args], capture_output=True).stdout
    for rev in [":"] + git("rev-list", "HEAD", "--", "symbols.json").decode().split():
        blob = git("show", f"{rev.rstrip(':')}:./symbols.json")
        if blob and hashlib.sha256(blob).hexdigest() == sha:
            return json.loads(blob)
    return None


def recomment(gdir):
    """Put symbols.json's comments and label names into gdir's listing.json, whose bytes,
    records and cross-references stay as they were built."""
    from symbols_export import regions
    from parts import load_game
    game = load_game(gdir)
    cpu = platform_modules(game.get("platform"))[0]
    spath, lpath = os.path.join(gdir, "symbols.json"), os.path.join(gdir, "listing.json")
    out = json.load(open(lpath))
    sha = hashlib.sha256(open(spath, "rb").read()).hexdigest()
    if out.get("symbols_sha256") == sha:
        print(f"{lpath} was built from this symbols.json: nothing to do"); return
    old, new = built_from(gdir, out.get("symbols_sha256")), json.load(open(spath))
    if old is None:
        sys.exit(f"{lpath} was built from a symbols.json git does not have: restore listing.json "
                 "from git and run this again, or rebuild it from the snapshot")

    def shape(sym):
        L = compute(sym["blocks"], sym["symbols"], sym["comments"], regions(game))
        return {"blocks": sym["blocks"],
                "symbols": [(s["address"], s["type"], s.get("kind")) for s in sym["symbols"]],
                "comments": sorted((c["address"], c["type"]) for c in sym["comments"]),
                "state": L["state"], "code": L["code"], "commented": L["commented"],
                "owner": {a: o[1] for a, o in L["owner"].items()}}
    was, now = shape(old), shape(new)
    moved = [k for k in was if was[k] != now[k]]
    if moved:
        sys.exit(f"symbols.json has changed more than comments and names ({', '.join(moved)}): "
                 "rebuild it from the snapshot")

    names, before = all_names(gdir, game, new), all_names(gdir, game, old)
    own = symbol_names(new)                          # a row's label is the part's own, never one from beneath
    at = {}                                          # an old name's address, for split tables
    for a, n in before.items():
        at[n] = a if n not in at else None
    line = {c["address"]: c["text"] for c in new["comments"] if c["type"] == "line"}
    side = {c["address"]: c["text"] for c in new["comments"] if c["type"] == "side"}
    regs, chips = register_names(game.get("platform")), io_meaning(game)
    changed = 0
    for r in out["records"]:
        was_r = dict(r)
        for k, m in (("l", own), ("c", line), ("s", side)):
            if k in r:
                r[k] = m[r["a"]]
        if r["t"] == "code":
            m, mode = cpu.decode(r["b"], 0)[:2]
            o, ta = cpu.operand(r["a"], m, mode, r["b"], names, regs, chips)
            if ta != r.get("oa"):
                sys.exit(f"${r['a']:04X}: the operand now points elsewhere: rebuild it from the snapshot")
            r.pop("o", None)
            if o is not None:
                r["o"] = o
        elif r["t"] == "addr":
            r["o"] = names.get(r["oa"]) or f"${r['oa']:04X}"
        elif "note" in r and r["note"].startswith("split table"):
            d = []
            for v in r["d"]:
                a = int(v[1:], 16) if v.startswith("$") else at.get(v)
                if a is None:
                    sys.exit(f"${r['a']:04X}: no one address for {v}: rebuild it from the snapshot")
                d.append(names.get(a) or f"${a:04X}")
            r["d"] = d
        changed += r != was_r
    for i in out["index"]:
        i["n"] = own[i["a"]]
    out["symbols_sha256"] = sha
    with open(lpath, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {lpath}: {changed} records with new comments or names")


def main():
    argv = sys.argv[1:]
    if len(argv) == 2 and argv[1] == "--relabel":
        relabel(argv[0]); return
    if len(argv) == 2 and argv[1] == "--recomment":
        recomment(argv[0]); return
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if len(argv) < 2:
        sys.exit(f"listing.py {argv[0]}: no snapshot, so no listing. Build it from one, "
                 "listing.py <game dir> <snapshot>, or rename and recomment the one there is "
                 "with --relabel or --recomment (-h says more)")
    gdir, vsf = argv[0], argv[1]
    from parts import load_game, parts
    if parts(gdir):
        sys.exit(f"{gdir} is a game of several parts: list one, {os.path.join(gdir, 'parts', '<id>')}, "
                 "from that part's own snapshot")
    game = load_game(gdir)
    platform = game.get("platform")
    cpu, snap = platform_modules(platform)
    spath = os.path.join(gdir, "symbols.json")
    sym = json.load(open(spath))
    ram = snap.read(vsf)
    from symbols_export import PLATFORM_DEFAULTS
    ext = PLATFORM_DEFAULTS.get(platform, {}).get("snapshot_ext")
    if not ext:
        sys.exit(f"{platform!r} has no snapshot_ext in symbols_export.PLATFORM_DEFAULTS; see kit/PLATFORMS.md")
    epath = argv[argv.index("--entry") + 1] if "--entry" in argv else os.path.join(gdir, "work", f"entry.{ext}")
    entry = None
    if os.path.exists(epath) and os.path.abspath(epath) != os.path.abspath(vsf):
        entry = snap.read(epath)
    elif "--entry" in argv:
        sys.exit(f"no hand-over snapshot at {epath}")

    from symbols_export import regions
    reg = regions(game)
    L = compute(sym["blocks"], sym["symbols"], sym["comments"], reg)
    state, code = L["state"], L["code"]

    names = all_names(gdir, game, sym)
    regs, chips = register_names(game.get("platform")), io_meaning(game)
    line = {c["address"]: c["text"] for c in sym["comments"] if c["type"] == "line"}
    side = {c["address"]: c["text"] for c in sym["comments"] if c["type"] == "side"}
    btype = bytearray(0x10000)
    TEXT_TYPES = list(cpu.TEXT_TYPES)
    TYPES = ["Undefined", "Code", "Byte", "Word", "Address"] + TEXT_TYPES + \
            ["Lo/Hi Address", "Hi/Lo Address", "Lo/Hi Word", "Hi/Lo Word", "External File"]
    for b in sym["blocks"]:
        t = TYPES.index(b["type"]) if b["type"] in TYPES else 0
        for a in range(b["start"], b["end"] + 1):
            btype[a] = t

    def sym_or_hex(a, width=4):
        return names.get(a) or (f"${a:04X}" if width == 4 else f"${a:02X}")

    xrefs = {}
    def xref(target, src):
        xrefs.setdefault(target, []).append(src)

    records = []
    a = 0
    while a < 0x10000:
        if state[a] == 0:
            g = a
            while a < 0x10000 and state[a] == 0:
                a += 1
            records.append({"a": g, "t": "gap", "n": a - g})
            continue
        rec = {"a": a}
        if a in names: rec["l"] = names[a]
        if a in line: rec["c"] = line[a]
        if a in side: rec["s"] = side[a]
        t = TYPES[btype[a]]
        if code[a]:
            d = cpu.decode(ram, a)
            if d:
                m, mode, n = d
                bs = list(ram[a:a + n])
                rec.update({"t": "code", "b": bs, "m": m})
                o, ta = cpu.operand(a, m, mode, bs, names, regs, chips)
                if ta is not None:
                    rec["oa"] = ta; xref(ta, a)
                if o is not None:
                    rec["o"] = o
                records.append(rec); a += n
            else:
                rec.update({"t": "byte", "b": [ram[a]], "note": "not a legal opcode"})
                records.append(rec); a += 1
            continue
        # data: an item never crosses a labelled address, a comment, a block edge or a state edge
        def run_end(limit):
            e = a + 1
            while e < 0x10000 and e < a + limit and state[e] and btype[e] == btype[a] \
                    and e not in names and e not in line and e not in side:
                e += 1
            return e
        # a word or pointer is two bytes: a label on its second byte (the base of a table's high
        # bytes, which code reads as table+1,Y) must not split the pair and shift every entry
        # after it by one. The label is still shown, as a note inside the item.
        def pair_end(limit):
            blk = next(b for b in sym["blocks"] if b["start"] <= a <= b["end"])
            e = a + 1
            while e < 0x10000 and e < a + limit and state[e] and btype[e] == btype[a] \
                    and ((e - blk["start"]) % 2 == 1 or (e not in names and e not in line and e not in side)):
                e += 1
            return e
        if t in ("Word", "Lo/Hi Word", "Hi/Lo Word"):
            e = pair_end(8); bs = list(ram[a:e])
            vals = [bs[i] | (bs[i + 1] << 8) for i in range(0, len(bs) - 1, 2)] if t != "Hi/Lo Word" else \
                   [(bs[i] << 8) | bs[i + 1] for i in range(0, len(bs) - 1, 2)]
            rec.update({"t": "word", "b": bs, "d": vals})
        elif t == "Address":
            e = min(pair_end(2), a + 2); bs = list(ram[a:e])
            if len(bs) == 2:
                ta = bs[0] | (bs[1] << 8); xref(ta, a)
                rec.update({"t": "addr", "b": bs, "oa": ta, "o": sym_or_hex(ta)})
            else:
                rec.update({"t": "byte", "b": bs})
        elif t in ("Lo/Hi Address", "Hi/Lo Address"):
            # a split table: emit the byte rows, and a note with the resolved targets at the block start
            e = run_end(8); bs = list(ram[a:e])
            rec.update({"t": "byte", "b": bs})
            blk = next(b for b in sym["blocks"] if b["start"] <= a <= b["end"])
            if a == blk["start"]:
                n = (blk["end"] - blk["start"] + 1) // 2
                lo, hi = (blk["start"], blk["start"] + n) if t == "Lo/Hi Address" else (blk["start"] + n, blk["start"])
                targets = [ram[lo + i] | (ram[hi + i] << 8) for i in range(n)]
                for i, ta in enumerate(targets):
                    xref(ta, lo + i)
                rec["d"] = [sym_or_hex(x) for x in targets]
                rec["ta"] = targets
                rec["note"] = f"split table: {n} {'lo/hi' if t == 'Lo/Hi Address' else 'hi/lo'} pointers"
        elif t in TEXT_TYPES:
            e = run_end(32); bs = list(ram[a:e])
            rec.update({"t": "text", "b": bs, "d": "".join(cpu.text_decode(t, c) for c in bs),
                        "enc": t.lower()})
        else:
            e = run_end(8); bs = list(ram[a:e])
            rec.update({"t": "byte", "b": bs})
        records.append(rec); a = e

    # labels and comments whose address starts no record still have to appear:
    # inside an instruction (an operand that is also a table base), or on an
    # address outside the tracked image (screen RAM, a ROM entry point).
    starts = {r["a"]: r for r in records if r["t"] != "gap"}
    orphans = []
    wanted = {s["address"] for s in sym["symbols"] if s.get("kind") == "user"} | set(line)
    for ad in sorted(wanted):
        if ad in starts:
            continue
        rec = {"a": ad, "t": "note"}
        if ad in names: rec["l"] = names[ad]
        if ad in line: rec["c"] = line[ad]
        if ad in side: rec["s"] = side[ad]
        if state[ad]:
            host = max(r["a"] for r in records if r["t"] != "gap" and r["a"] < ad)
            rec["note"] = f"inside the item at ${host:04X}"
        else:
            rec["note"] = "outside the tracked image"
        orphans.append(rec)
    records = sorted(records + orphans, key=lambda r: (r["a"], r["t"] == "note"))
    for r in records:
        if r["a"] in xrefs:
            r["x"] = sorted(set(xrefs[r["a"]]))
    # left-pane index: every labelled address that owns a span, with a kind
    owner = L["owner"]
    index = []
    for s in sorted(sym["symbols"], key=lambda s: s["address"]):
        ad = s["address"]
        if names.get(ad) != s["name"] or state[ad] == 0:
            continue
        span = 1
        while ad + span < 0x10000 and owner.get(ad + span, (None, None))[1] == ad:
            span += 1
        if code[ad]:
            kind = "routine" if s["type"] in ("Subroutine", "UserDefined") or ad in line else "branch"
        elif TYPES[btype[ad]] in TEXT_TYPES:
            kind = "string"
        elif span <= 2 and ad < 0x0400:
            kind = "variable"
        elif span <= 2:
            kind = "variable"
        else:
            kind = "table"
        index.append({"a": ad, "n": s["name"], "k": kind, "len": span, "c": ad in line})

    out = {"schema": 1, "platform": game.get("platform"), "game": game.get("slug")}
    if game.get("part"):
        out["part"] = game["part"]["id"]
    out.update({
        "title": game.get("title"), "build": game.get("build"),
        "symbols_sha256": hashlib.sha256(open(spath, "rb").read()).hexdigest(),
        "index": index, "records": records,
    })
    path = os.path.join(gdir, "listing.json")
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    kinds = {}
    for i in index: kinds[i["k"]] = kinds.get(i["k"], 0) + 1
    print(f"wrote {path}: {len(records)} records, {sum(1 for r in records if r['t']=='code')} instructions, "
          f"index {kinds}, {os.path.getsize(path)//1024} KB")
    for line in uncounted(game, reg, L, ram, entry) + beneath(gdir, game, ram):
        print(line)


if __name__ == "__main__":
    main()
