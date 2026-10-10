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

A game whose cartridge switches banks has a part for each bank
(kit/scripts/parts.py), built from the bank's own image (on the C64, its
work/bank.crt), and the data in it that the ledger does not count is named
as for a hand-over. Code in a RAM part that reads a bank where it is, with
the bank switched in, says so in rows of its part.json, over the
instructions' own addresses, the last row that holds one deciding:

  "banks": [["$5A10", "$5A3F", "bank-00", "prints the stage names with bank 0 switched in"]]

An operand of those instructions, or a pointer in a row's range, that points
where the bank shows takes the bank's name for it and links to the bank's
listing ("pt", the bank's part id), and is not counted as a reference to
the RAM there.

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
  listing.py <game dir> --rebuild [--write]
                         build the listing again from the image its own records
                         describe, and say whether it matches the file; needs no
                         snapshot. For maintainers: a mismatch means the kit has
                         moved under a listing that was never rebuilt, and CI
                         fails it (check_listing.py). With --write, the rebuild
                         replaces the file, as the snapshot would have built it;
                         refused when symbols.json has changed since. A byte the
                         ledger counts that the listing does not hold, which only
                         the snapshot has, becomes a gap with a note (LOST) until a
                         build from the snapshot fills it

What CI checks (check_listing.py): every code record re-decodes, from the image the
listing's own bytes describe, to the same length, mnemonic, bytes and operand, and
the whole listing builds again from those bytes to the same file. That is the
permanent guard against a decoder, a ledger or a record format that drifts under a
listing, and against an off-by-one record.

Beside the records, listing.json names what it was built from: `symbols_sha256`, and
`snapshot`, the snapshot's file (from the game folder, or its name alone when it lies
outside) and its SHA-256. A game's snapshots differ in the data it changes as it runs,
so building over a listing from another snapshot says so and names the old one (#214).
--relabel and --recomment keep the field; --rebuild has no snapshot of its own.

Record fields (short, the file is large):
  a  address            t  kind: code | byte | word | addr | lohi | text | gap | note
  b  bytes              m  mnemonic (code)         o  operand text, symbolic
  oa operand address, except on a chip's register (nothing in the listing is there)
  l  label at this address                         c  line comment
  s  side comment       x  addresses that reference this one
  d  decoded text (text records) / value list (word, addr)
  ta the targets of a split table, on its first row, as addresses
  note on a gap: bytes the game uses that the listing does not hold (LOST)
"""
import contextlib, hashlib, importlib.util, io, json, os, sys

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


def bank_view(gdir, game, names):
    """(names_for(at), bank_of(at, target)): the names an operand of the instruction or pointer at
    `at` takes, and the bank's part id when its target is in a bank that instruction sees (None
    otherwise). From the "banks" rows of the part's part.json; the rule is in this file's help."""
    rows = game.get("banks") or []
    if not rows:
        return (lambda at: names), (lambda at, target: None)
    from parts import home, parts as all_parts, ranges
    from symbols_export import hexint
    P = {p["id"]: p for p in all_parts(home(gdir)[0])}
    views = []
    for r in rows:
        if len(r) != 4 or r[2] not in P or P[r[2]].get("bank") is None:
            sys.exit(f'part.json "banks": each row is [first, last, a bank\'s part id, why], not {r}')
        q = P[r[2]]
        own = ranges(q)
        inside = lambda a, own=own: any(lo <= a <= hi for lo, hi in own)
        seen = {a: n for a, n in names.items() if not inside(a)}      # the RAM's names go where the bank shows
        f = os.path.join(q["dir"], "symbols.json")
        if os.path.isfile(f):
            for x in json.load(open(f))["symbols"]:
                if inside(x["address"]):
                    seen.setdefault(x["address"], x["name"])
        views.append((hexint(r[0]), hexint(r[1]), q["id"], inside, seen))

    def view(at):
        return next((v for v in reversed(views) if v[0] <= at <= v[1]), None)

    def names_for(at):
        v = view(at)
        return v[4] if v else names

    def bank_of(at, target):
        v = view(at)
        return v[2] if v and v[3](target) else None
    return names_for, bank_of


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
            found.append([s, e, n, f"{'in the bank' if (game.get('part') or {}).get('bank') is not None else 'loaded with the game'}, {where}"])
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
    names_for, bank_of = bank_view(gdir, game, names)
    regs, chips = register_names(game.get("platform")), io_meaning(game)
    xrefs, changed = {}, 0
    for r in out["records"]:
        if r["t"] == "addr":               # a pointer, and a split table's targets: named as they were built
            o, pt = names_for(r["a"]).get(r["oa"]) or f"${r['oa']:04X}", bank_of(r["a"], r["oa"])
            changed += (r.get("o"), r.get("pt")) != (o, pt); r["o"] = o
            r.pop("pt", None)
            if pt:
                r["pt"] = pt
            else:
                xrefs.setdefault(r["oa"], []).append(r["a"])
        elif "ta" in r:
            d = [names_for(r["a"]).get(x) or f"${x:04X}" for x in r["ta"]]
            changed += r.get("d") != d; r["d"] = d
            lo = r["a"] + (len(r["ta"]) if "hi/lo" in r.get("note", "") else 0)
            for i, x in enumerate(r["ta"]):
                if not bank_of(r["a"], x):
                    xrefs.setdefault(x, []).append(lo + i)
        if r["t"] != "code":
            continue
        m, mode = cpu.decode(r["b"], 0)[:2]
        o, ta = cpu.operand(r["a"], m, mode, r["b"], names_for(r["a"]), regs, chips)
        pt = bank_of(r["a"], ta) if ta is not None else None
        changed += (r.get("o"), r.get("oa"), r.get("pt")) != (o, ta, pt)
        for k, v in (("o", o), ("oa", ta), ("pt", pt)):
            r.pop(k, None)
            if v is not None:
                r[k] = v
        if ta is not None and not pt:
            xrefs.setdefault(ta, []).append(r["a"])
    if not write:
        return changed
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
    names_for = bank_view(gdir, game, names)[0]
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
            o, ta = cpu.operand(r["a"], m, mode, r["b"], names_for(r["a"]), regs, chips)
            if ta != r.get("oa"):
                sys.exit(f"${r['a']:04X}: the operand now points elsewhere: rebuild it from the snapshot")
            r.pop("o", None)
            if o is not None:
                r["o"] = o
        elif r["t"] == "addr":
            r["o"] = names_for(r["a"]).get(r["oa"]) or f"${r['oa']:04X}"
        elif "note" in r and r["note"].startswith("split table"):
            d = []
            for v in r["d"]:
                a = int(v[1:], 16) if v.startswith("$") else at.get(v)
                if a is None:
                    sys.exit(f"${r['a']:04X}: no one address for {v}: rebuild it from the snapshot")
                d.append(names_for(r["a"]).get(a) or f"${a:04X}")
            r["d"] = d
        changed += r != was_r
    for i in out["index"]:
        i["n"] = own[i["a"]]
    out["symbols_sha256"] = sha
    with open(lpath, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {lpath}: {changed} records with new comments or names")


# The note on a gap of bytes the ledger counts and the listing does not hold: it was built
# before the kit counted them, and its snapshot is gone (#210). The Source tab shows it.
LOST = "the game uses, missing from this listing"


def held_by_records(gdir):
    """1 at each address gdir's listing.json holds a byte for, else 0."""
    have = bytearray(0x10000)
    for r in json.load(open(os.path.join(gdir, "listing.json")))["records"]:
        have[r["a"]:r["a"] + len(r.get("b") or [])] = b"\x01" * len(r.get("b") or [])
    return have


def image_from_records(gdir):
    """The memory image gdir's listing.json describes, rebuilt from the bytes its own
    records carry. State 0 (a gap) is read for its state, never its bytes, so only the
    addresses the listing lists need a byte; every other address stays $00."""
    ram = bytearray(0x10000)
    for r in json.load(open(os.path.join(gdir, "listing.json")))["records"]:
        b = r.get("b")
        if b:
            ram[r["a"]:r["a"] + len(b)] = bytes(b)
    return ram


def decode_problems(gdir):
    """Every code record in gdir's listing, decoded again from the memory image the
    listing's own bytes describe, with the platform's current decoder. Returns the
    records that no longer agree as (address, what changed): the permanent guard
    against a decoder that drifts under a listing, and against an off-by-one record.
    Needs no snapshot, and none of the ledger or the symbols walk."""
    from parts import load_game
    game = load_game(gdir)
    cpu = platform_modules(game.get("platform"))[0]
    recs = json.load(open(os.path.join(gdir, "listing.json")))["records"]
    ram = image_from_records(gdir)
    names = all_names(gdir, game, json.load(open(os.path.join(gdir, "symbols.json"))))
    names_for, bank_of = bank_view(gdir, game, names)
    regs, chips = register_names(game.get("platform")), io_meaning(game)
    bad = []
    for r in recs:
        if r["t"] != "code":
            continue
        d = cpu.decode(ram, r["a"])
        if not d:
            bad.append((r["a"], "no longer decodes to an instruction")); continue
        m, mode, n = d
        if n != len(r["b"]) or m != r["m"] or list(ram[r["a"]:r["a"] + n]) != r["b"]:
            bad.append((r["a"], f"decodes as {m} ({n} bytes), the listing has {r['m']} ({len(r['b'])} bytes)"))
            continue
        o, ta = cpu.operand(r["a"], m, mode, r["b"], names_for(r["a"]), regs, chips)
        if (o, ta) != (r.get("o"), r.get("oa")):
            bad.append((r["a"], f"operand now reads {o!r}, the listing has {r.get('o')!r}"))
        elif (bank_of(r["a"], ta) if ta is not None else None) != r.get("pt"):
            bad.append((r["a"], f"operand's bank is now {bank_of(r['a'], ta)!r}, the listing has {r.get('pt')!r}"))
    return bad


def compare(was, now):
    """A listing rebuilt from its own bytes (`now`) against the committed one (`was`):
    0 when they match, else 1, naming the first place they differ. The build is
    deterministic, so a difference means the decoder, the ledger or symbols.json has
    moved under a listing that was not rebuilt."""
    if was == now:
        print(f"OK - the listing rebuilds from its own bytes ({len(now['records'])} records)")
        return 0
    if was.get("symbols_sha256") != now.get("symbols_sha256"):
        print("FAILED - symbols.json has changed since the listing was built"); return 1
    a, b = was.get("records", []), now.get("records", [])
    for i in range(min(len(a), len(b))):
        if a[i] != b[i]:
            keys = [k for k in sorted(set(a[i]) | set(b[i])) if a[i].get(k) != b[i].get(k)]
            print(f"FAILED - record {i} at ${a[i]['a']:04X} differs in {', '.join(keys)}")
            for k in keys:
                print(f"  {k}: listing {json.dumps(a[i].get(k))[:160]}  rebuilt {json.dumps(b[i].get(k))[:160]}")
            return 1
    if len(a) != len(b):
        print(f"FAILED - the listing has {len(a)} records, the rebuild {len(b)}"); return 1
    for k in sorted(set(was) | set(now)):
        if was.get(k) != now.get(k):
            print(f"FAILED - {k} differs: {json.dumps(was.get(k))[:120]} vs {json.dumps(now.get(k))[:120]}")
            return 1
    print("FAILED - the rebuild differs from the listing"); return 1


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
    rebuild = vsf == "--rebuild"      # check_listing.py: the image comes from the listing's own bytes
    from parts import load_game, parts
    if parts(gdir):
        sys.exit(f"{gdir} is a game of several parts: list one, {os.path.join(gdir, 'parts', '<id>')}, "
                 "from that part's own snapshot")
    game = load_game(gdir)
    platform = game.get("platform")
    cpu, snap = platform_modules(platform)
    spath = os.path.join(gdir, "symbols.json")
    sym = json.load(open(spath))
    entry = None
    bank = (game.get("part") or {}).get("bank")
    have = bytearray(b"\x01" * 0x10000)   # a snapshot gives every byte; a rebuild only the listing's
    if rebuild:
        ram, have = image_from_records(gdir), held_by_records(gdir)
    elif bank is not None:      # a bank of a cartridge: its bytes are all loaded with the game, as at a hand-over
        ram = snap.read(vsf, bank=bank)
        entry = ram
    else:
        ram = snap.read(vsf)
        from symbols_export import PLATFORM_DEFAULTS
        ext = PLATFORM_DEFAULTS.get(platform, {}).get("snapshot_ext")
        if not ext:
            sys.exit(f"{platform!r} has no snapshot_ext in symbols_export.PLATFORM_DEFAULTS; see kit/PLATFORMS.md")
        epath = argv[argv.index("--entry") + 1] if "--entry" in argv else os.path.join(gdir, "work", f"entry.{ext}")
        if os.path.exists(epath) and os.path.abspath(epath) != os.path.abspath(vsf):
            entry = snap.read(epath)
        elif not os.path.exists(epath) and "--entry" in argv:
            sys.exit(f"no hand-over snapshot at {epath}")

    from symbols_export import regions
    reg = regions(game)
    L = compute(sym["blocks"], sym["symbols"], sym["comments"], reg)
    state, code = L["state"], L["code"]

    names = all_names(gdir, game, sym)
    names_for, bank_of = bank_view(gdir, game, names)
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
        if not have[a]:
            g = a
            while a < 0x10000 and state[a] and not have[a]:
                a += 1
            records.append({"a": g, "t": "gap", "n": a - g, "note": LOST})
            continue
        rec = {"a": a}
        if a in names: rec["l"] = names[a]
        if a in line: rec["c"] = line[a]
        if a in side: rec["s"] = side[a]
        t = TYPES[btype[a]]
        if code[a]:
            d = cpu.decode(ram, a)
            if d and not all(have[a:a + d[2]]):
                sys.exit(f"${a:04X}: the listing holds only part of the instruction there: "
                         "rebuild it from the snapshot")
            if d:
                m, mode, n = d
                bs = list(ram[a:a + n])
                rec.update({"t": "code", "b": bs, "m": m})
                o, ta = cpu.operand(a, m, mode, bs, names_for(a), regs, chips)
                if ta is not None:
                    rec["oa"] = ta
                    pt = bank_of(a, ta)
                    if pt:
                        rec["pt"] = pt
                    else:
                        xref(ta, a)
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
            while e < 0x10000 and e < a + limit and state[e] and have[e] and btype[e] == btype[a] \
                    and e not in names and e not in line and e not in side:
                e += 1
            return e
        # a word or pointer is two bytes: a label on its second byte (the base of a table's high
        # bytes, which code reads as table+1,Y) must not split the pair and shift every entry
        # after it by one. The label is still shown, as a note inside the item.
        def pair_end(limit):
            blk = next(b for b in sym["blocks"] if b["start"] <= a <= b["end"])
            e = a + 1
            while e < 0x10000 and e < a + limit and state[e] and have[e] and btype[e] == btype[a] \
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
                ta = bs[0] | (bs[1] << 8)
                rec.update({"t": "addr", "b": bs, "oa": ta, "o": names_for(a).get(ta) or f"${ta:04X}"})
                if bank_of(a, ta):
                    rec["pt"] = bank_of(a, ta)
                else:
                    xref(ta, a)
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
                if not all(have[blk["start"]:blk["end"] + 1]):
                    sys.exit(f"${a:04X}: the listing holds only part of the split table there: "
                             "rebuild it from the snapshot")
                targets = [ram[lo + i] | (ram[hi + i] << 8) for i in range(n)]
                for i, ta in enumerate(targets):
                    if not bank_of(a, ta):
                        xref(ta, lo + i)
                rec["d"] = [names_for(a).get(x) or f"${x:04X}" for x in targets]
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
        if state[ad] and not have[ad]:
            rec["note"] = "in bytes this listing does not hold"
        elif state[ad]:
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
    })
    path = os.path.join(gdir, "listing.json")
    try:
        was = json.load(open(path)).get("snapshot")
    except (OSError, ValueError):
        was = None
    if rebuild:   # the image is the listing's own bytes, so the snapshot is still the one it names
        shot = was
    else:
        rel = os.path.relpath(os.path.abspath(vsf), os.path.abspath(gdir))
        shot = {"file": os.path.basename(vsf) if rel.startswith("..") else rel.replace(os.sep, "/"),
                "sha256": hashlib.sha256(open(vsf, "rb").read()).hexdigest()}
    if shot:
        out["snapshot"] = shot
    out.update({"index": index, "records": records})
    if rebuild and "--write" not in argv:
        sys.exit(compare(json.load(open(path)), out))
    if rebuild:
        old = json.load(open(path))
        if old == out:
            print(f"OK - {path} already rebuilds from its own bytes"); return
        if old.get("symbols_sha256") != out["symbols_sha256"]:
            sys.exit(f"{path} was built from a different symbols.json: rebuild it from the snapshot")
        said = io.StringIO()
        with contextlib.redirect_stdout(said):
            compare(old, out)
        with open(path, "w") as f:
            json.dump(out, f, separators=(",", ":"))
        print(f"wrote {path}, rebuilt from its own bytes: {len(records)} records; it differed from the file "
              f"first in {said.getvalue().splitlines()[0].replace('FAILED - ', '')}")
        lost = [r for r in records if r.get("note") == LOST]
        if lost:
            print(f"  {sum(r['n'] for r in lost)} byte(s) the ledger counts are not in the listing, the first at "
                  f"${lost[0]['a']:04X}: only the snapshot has them, so they show as missing until a build from it")
        return
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    kinds = {}
    for i in index: kinds[i["k"]] = kinds.get(i["k"], 0) + 1
    print(f"wrote {path}: {len(records)} records, {sum(1 for r in records if r['t']=='code')} instructions, "
          f"index {kinds}, {os.path.getsize(path)//1024} KB")
    if was and was.get("sha256") != shot["sha256"]:
        print(f"note: the listing was built from {was.get('file')} ({str(was.get('sha256'))[:12]}), and this one "
              f"from {shot['file']} ({shot['sha256'][:12]}). Data the game changes as it runs may have moved: "
              "read git diff before committing it.")
    for line in uncounted(game, reg, L, ram, entry) + ([] if bank is not None else beneath(gdir, game, ram)):
        print(line)
    # a short run of untyped bytes between two code records is usually a missed
    # instruction (the opcode byte of a BIT skip, an undocumented NOP), and the
    # page's interpreter reads its code from the listing: name them at build time (#229)
    for i, r in enumerate(records):
        if r["t"] == "gap" and not r.get("note") and r["n"] < 16:
            prev = records[i - 1] if i else None
            nxt = records[i + 1] if i + 1 < len(records) else None
            if prev and nxt and prev["t"] == "code" and nxt["t"] == "code":
                span = f"${r['a']:04X}" if r["n"] == 1 else f"${r['a']:04X}-${r['a'] + r['n'] - 1:04X}"
                print(f"  {span}: {r['n']} byte(s) with no type between code: likely a missed "
                      f"instruction; give it a type, or the page's interpreter reads a zero opcode there")


if __name__ == "__main__":
    main()
