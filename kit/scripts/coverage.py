#!/usr/bin/env python3
"""Understanding ledger: how much of the game is actually explained.

Same metric for every game, so tiers are comparable.

DENOMINATOR: bytes the game uses. A byte counts if it lies in a block typed
as code, or in the span of any symbol (the disassembler mints a symbol for
every referenced address), or in an "extra" region declared in game.json
(authored data nothing references by address, such as a charset). Runtime
state is excluded: stack, screen RAM, I/O, and anything else listed under
"exclude" in game.json. Platform defaults apply when game.json says nothing.

NUMERATOR: a byte is explained when the symbol whose span owns it carries a
non-blank line comment. A description belongs to a routine, not to every
branch target inside it, so only real boundaries (subroutines, data
symbols, commented symbols) start a span.

Usage:
  coverage.py <game dir>                 from symbols.json
  coverage.py <game dir> --live          from the running disassembler
  coverage.py <game dir> --top 40        longer work queue
  coverage.py <game dir> --code | --data queue only that side
"""
import bisect, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

MAX_SPAN = 64
BOUNDARY_TYPES = {"Subroutine", "UserDefined", "Field", "ZeroPageField",
                  "ZeroPagePointer", "AbsoluteAddress", "ZeroPageAbsoluteAddress"}


def load(gdir, live):
    if live:
        from symbols_export import from_live, regions
        blocks, syms, comments = from_live()
        game = json.load(open(os.path.join(gdir, "game.json")))
        reg = regions(game)
    else:
        s = json.load(open(os.path.join(gdir, "symbols.json")))
        blocks, syms, comments, reg = s["blocks"], s["symbols"], s["comments"], s["regions"]
    return blocks, syms, comments, reg


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    top = int(argv[argv.index("--top") + 1]) if "--top" in argv else 25
    only = "data" if "--data" in argv else ("code" if "--code" in argv else None)
    blocks, syms, comments, reg = load(gdir, "--live" in argv)
    exclude = reg.get("exclude", [])
    extra = reg.get("extra", [])

    def excluded(a):
        return any(lo <= a <= hi for lo, hi, _ in exclude)

    commented = {c["address"] for c in comments if c["type"] == "line" and c["text"].strip()}
    code = bytearray(0x10000)
    for b in blocks:
        if b["type"] == "Code":
            for a in range(b["start"], b["end"] + 1):
                code[a] = 1
    edges = {0x0000, 0x0100, 0x0200, 0x0400, 0x0800, 0x1000, 0x4000, 0x8000, 0xA000, 0xC000, 0xD000, 0xE000}
    for b in blocks:
        edges.add(b["start"]); edges.add(b["end"] + 1)
    edges = sorted(edges)

    def wall_after(a):
        i = bisect.bisect_right(edges, a)
        return edges[i] if i < len(edges) else 0x10000

    syms = sorted(syms, key=lambda s: s["address"])
    bounds = [s for s in syms if s["type"] in BOUNDARY_TYPES or s["address"] in commented]
    baddrs = [s["address"] for s in bounds]
    state = bytearray(0x10000)
    owner = {}
    for i, s in enumerate(bounds):
        a = s["address"]
        if excluded(a) or a >= 0x10000:
            continue
        nxt = baddrs[i + 1] if i + 1 < len(bounds) else a + 1
        routine = s["type"] in ("Subroutine", "UserDefined") or code[a]
        end = min(nxt, a + (0x400 if routine else MAX_SPAN), wall_after(a))
        val = 2 if a in commented else 1
        for x in range(a, max(end, a + 1)):
            if not excluded(x) and state[x] < val:
                state[x] = val
            owner.setdefault(x, (s["name"], a))
    for a in range(0x10000):
        if excluded(a):
            state[a] = 0
        elif state[a] == 0 and (code[a] or any(lo <= a <= hi for lo, hi, _ in extra)):
            state[a] = 1

    tracked = [a for a in range(0x10000) if state[a]]
    if not tracked:
        print("nothing tracked: no code blocks or symbols yet"); return
    expl = sum(1 for a in tracked if state[a] == 2)
    ccount = sum(1 for a in tracked if code[a]); cexpl = sum(1 for a in tracked if code[a] and state[a] == 2)
    dcount = len(tracked) - ccount; dexpl = expl - cexpl
    print("GAME IMAGE LEDGER  (denominator = bytes the game actually uses)")
    print(f"  tracked bytes : {len(tracked)}")
    print(f"  explained     : {expl}  ({100*expl/len(tracked):.1f}%)")
    print(f"  bare          : {len(tracked)-expl}  ({100*(len(tracked)-expl)/len(tracked):.1f}%)\n")
    print(f"  code  {cexpl:>5}/{ccount:<5} explained  ({100*cexpl/max(ccount,1):.1f}%)")
    print(f"  data  {dexpl:>5}/{dcount:<5} explained  ({100*dexpl/max(dcount,1):.1f}%)\n")
    print(f"  {'REGION':<12} {'BYTES':>7} {'EXPL':>7} {'%':>6}")
    agg = {}
    for a in tracked:
        k = a >> 12
        t, e = agg.get(k, (0, 0)); agg[k] = (t + 1, e + (state[a] == 2))
    for k in sorted(agg):
        t, e = agg[k]
        print(f"  ${k:X}000-${k:X}FFF  {t:>7} {e:>7} {100*e/t:>5.0f}%")
    runs, cur = [], None
    for a in range(0x10000):
        if state[a] == 1:
            if cur and cur[1] + cur[2] == a:
                cur[2] += 1
            else:
                cur = [owner.get(a, ("(unlabelled)", a))[0], a, 1]; runs.append(cur)
        else:
            cur = None
    if only:
        runs = [r for r in runs if bool(code[r[1]]) == (only == "code")]
    print(f"\n  WORK QUEUE - largest undescribed runs{(' ('+only+' only)') if only else ''}:")
    print(f"  {'ADDR':<8} {'BYTES':<7} {'KIND':<6} NEAREST SYMBOL")
    for name, addr, size in sorted(runs, key=lambda r: -r[2])[:top]:
        print(f"  ${addr:04X}    {size:<7} {'code' if code[addr] else 'data':<6} {name}")


if __name__ == "__main__":
    main()
