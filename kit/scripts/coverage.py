#!/usr/bin/env python3
"""Understanding ledger: how much of the game is actually explained.

Same metric for every game, so tiers are comparable.

DENOMINATOR: bytes the game uses. A byte counts if it lies in a block typed
as code or as data of any kind (bytes, words, text, a program in BASIC), or
in the span of any symbol (the disassembler mints a symbol for every
referenced address), or in an "extra" region declared in game.json (authored
data nothing references by address, such as a charset). Runtime
state is excluded: stack, screen RAM, I/O, and anything else listed under
"exclude" in game.json. Platform defaults apply when game.json says nothing;
a range under "include" is given back from them (the RAM under I/O, in a
game that runs code there).

NUMERATOR: a byte is explained when the symbol whose span owns it carries a
non-blank line comment. A description belongs to a routine, not to every
branch target inside it, so only real boundaries (subroutines, data
symbols, commented symbols) start a span. A line comment on bytes no span
reaches starts one too, as a label there would. An identical description pasted
onto several symbols counts once, at its first address: thirty-two copies
of "character set" explain nothing about glyphs 32 to 63. Say which glyphs
a block holds and what they draw, and each description is its own.

REGIONS come from game.json: "video" (screen and character-set bases, which
give the platform's standard exclude/extra blocks) and "coverage" (extra
exclusions and authored data), so every game is scored by the same rule.

THE WORK QUEUE lists the largest bare runs, one row for each fix, and says
why each is bare: the symbol that owns it, or the label it starts at, has no
comment, or its comment repeats another's; or no symbol owns it, because the
span before it ran out of reach, stopped at its block's end or at a fixed
edge of the memory map, or there is none. The first two want a comment on
that symbol, the rest a symbol of your own at the run's address, with its
own comment.

DATA THE LEDGER CANNOT SEE (untyped, and nothing refers to it by address, so it
is neither explained nor bare) is listed under the figure, as listing.json's last build found
it (listing.py, "uncounted"): a figure of 100 % with that list is not the whole game.

A GAME OF SEVERAL PARTS (kit/scripts/parts.py) has a ledger per part, read
from the part's folder, and each part counts only the addresses it owns, so
the game's figure, the sum, counts every byte once. Given the game's own
folder, this prints each part's figure and the total; the work queue is a
part's (give the part's folder). With --live it leaves out the automatic
symbols that symbols_export.py leaves out of a part, so the two agree.

Usage:
  coverage.py <game dir>                 from symbols.json
  coverage.py <game dir> --live          from the running disassembler
  coverage.py <part dir> --live --from <part dir>
                                         a part's share of the session started on another's snapshot
  coverage.py <game dir> --top 40        longer work queue
  coverage.py <game dir> --code | --data queue only that side
  coverage.py <game dir> --range $2000 $27FF   figures and queue for one address range,
                                         for an agent that owns that range
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def load(gdir, live, session=None):
    from symbols_export import drop_strays, read_live, regions, platform_of
    from parts import load_game
    if not live and not os.path.isfile(os.path.join(gdir, "symbols.json")):     # a part that is only named
        sys.exit(f"{gdir} has no symbols.json: nothing is analysed there (symbols_export.py writes one)")
    game = load_game(gdir)
    reg = regions(game)
    if live:
        blocks, syms, comments = read_live(platform_of(game), session or gdir)
        if reg.get("elsewhere"):
            syms, _ = drop_strays(platform_of(game), session or gdir, syms, game)
    else:
        s = json.load(open(os.path.join(gdir, "symbols.json")))
        blocks, syms, comments = s["blocks"], s["symbols"], s["comments"]
    return blocks, syms, comments, reg


def reasons(L, syms):
    """Why each bare byte is bare, in words that point at the fix: {address: reason}."""
    state, owner = L["state"], L["owner"]
    repeats = dict(L["dups"])
    labels = {}
    for s in syms:
        labels.setdefault(s["address"], s["name"])
    cut = {end: (name, why, reach) for name, end, why, reach in L["stops"].values() if why != "next"}

    def uncommented(name, a):
        return f"{name}'s comment repeats ${repeats[a]:04X}'s" if a in repeats else f"no comment on {name}"

    out, lead = {}, None
    for a in range(len(state)):
        if state[a] != 1:
            lead = None
        elif a in owner:
            lead = None
            out[a] = uncommented(*owner[a])
        else:
            if lead is None:        # the first unowned byte: a label here, or what stopped the span before
                name, why, reach = cut.get(a, (None, None, None))
                lead = (uncommented(labels[a], a) if a in labels else
                        {"reach": f"past {name}'s {reach}-byte reach",
                         "block": f"{name} stops where its block ends",
                         "edge": f"{name} stops at the memory-map edge ${a:04X}"}.get(why, "no symbol owns it"))
            out[a] = lead
    return out


def uncounted_lines(gdir):
    """The data the ledger does not count, as listing.py found it at the listing's last build
    (listing.json's "uncounted"), as lines to print under the figure; none when there is none."""
    lp = os.path.join(gdir, "listing.json")
    left = (json.load(open(lp)).get("uncounted") or []) if os.path.isfile(lp) else []
    if not left:
        return []
    lines = [f"  NOT COUNTED - {len(left)} stretch(es) of data, {sum(e - s + 1 for s, e, _ in left)} bytes, that "
             "listing.json's last build found outside the ledger:"]
    lines += [f"  ${s:04X}-${e:04X} {e - s + 1:6} bytes  {why}" for s, e, why in left]
    lines += ["  Until each is labelled, or listed in game.json's coverage, the figure above leaves them out",
              "  (kit/skills/core/50-coverage, \"Data the ledger cannot see\"). Build the listing again after.", ""]
    return lines


def tracked_count(gdir):
    """(tracked bytes, explained bytes) from symbols.json, for parts.py and build.py.
    A game of several parts counts the sum of the parts that have been started."""
    from parts import parts, started, left_out
    P = parts(gdir)
    if P:
        counts = [tracked_count(p["dir"]) for p in P if started(p) and not left_out(p)]
        return sum(t for t, _ in counts), sum(e for _, e in counts)
    blocks, syms, comments, reg = load(gdir, False)
    from ledger import compute
    state = compute(blocks, syms, comments, reg)["state"]
    tracked = sum(1 for a in range(len(state)) if state[a])
    return tracked, sum(1 for a in range(len(state)) if state[a] == 2)


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    from parts import parts, table
    if parts(gdir):
        if len(argv) > 1:
            sys.exit(f"{gdir} is a game of several parts: the queue is a part's, "
                     f"{os.path.join(gdir, 'parts', '<id>')}")
        print("GAME IMAGE LEDGER  (a game of several parts: each counts the bytes it owns)")
        print("\n".join(table(gdir)[0]))
        left = [p["id"] for p in parts(gdir) if uncounted_lines(p["dir"])]
        if left:
            print(f"\n  NOT COUNTED - the listings of {', '.join(left)} name data outside the ledger: "
                  f"coverage.py {os.path.join(gdir, 'parts', left[0])} lists it")
        return
    top = int(argv[argv.index("--top") + 1]) if "--top" in argv else 25
    only = "data" if "--data" in argv else ("code" if "--code" in argv else None)
    blocks, syms, comments, reg = load(gdir, "--live" in argv, argv[argv.index("--from") + 1] if "--from" in argv else None)
    exclude = reg.get("exclude", [])
    extra = reg.get("extra", [])

    def excluded(a):
        return any(lo <= a <= hi for lo, hi, _ in exclude)

    from ledger import compute
    L = compute(blocks, syms, comments, reg)
    state, code, dups = L["state"], L["code"], L["dups"]
    lo, hi = 0, len(state) - 1
    if "--range" in argv:
        i = argv.index("--range")
        lo, hi = (int(x.lstrip("$"), 16) for x in argv[i + 1:i + 3])
    tracked = [a for a in range(lo, hi + 1) if state[a]]
    if not tracked:
        print("nothing tracked: no code blocks or symbols yet"); return
    expl = sum(1 for a in tracked if state[a] == 2)
    ccount = sum(1 for a in tracked if code[a]); cexpl = sum(1 for a in tracked if code[a] and state[a] == 2)
    dcount = len(tracked) - ccount; dexpl = expl - cexpl
    print("GAME IMAGE LEDGER  (denominator = bytes the game actually uses)")
    if dups:
        print(f"  duplicate descriptions ignored: {len(dups)} "
              f"(e.g. ${dups[0][0]:04X} repeats ${dups[0][1]:04X}); describe each block on its own, "
              f"or, if they are uninitialised RAM, list them under coverage.exclude in game.json")
    print(f"  tracked bytes : {len(tracked)}")
    print(f"  explained     : {expl}  ({100*expl/len(tracked):.1f}%)")
    print(f"  bare          : {len(tracked)-expl}  ({100*(len(tracked)-expl)/len(tracked):.1f}%)\n")
    print(f"  code  {cexpl:>5}/{ccount:<5} explained  ({100*cexpl/max(ccount,1):.1f}%)")
    print(f"  data  {dexpl:>5}/{dcount:<5} explained  ({100*dexpl/max(dcount,1):.1f}%)\n")
    for line in uncounted_lines(gdir):
        print(line)
    print(f"  {'REGION':<12} {'BYTES':>7} {'EXPL':>7} {'%':>6}")
    agg = {}
    for a in tracked:
        k = a >> 12
        t, e = agg.get(k, (0, 0)); agg[k] = (t + 1, e + (state[a] == 2))
    for k in sorted(agg):
        t, e = agg[k]
        print(f"  ${k:X}000-${k:X}FFF  {t:>7} {e:>7} {100*e/t:>5.0f}%")
    why = reasons(L, syms)
    runs, cur = [], None
    for a in range(lo, hi + 1):
        if state[a] == 1:
            if cur and cur[1] + cur[2] == a and cur[0] == why[a]:
                cur[2] += 1
            else:
                cur = [why[a], a, 1]; runs.append(cur)
        else:
            cur = None
    if only:
        runs = [r for r in runs if bool(code[r[1]]) == (only == "code")]
    print(f"\n  WORK QUEUE - largest undescribed runs{(' ('+only+' only)') if only else ''}:")
    print(f"  {'ADDR':<8} {'BYTES':<7} {'KIND':<6} WHY IT IS BARE")
    for reason, addr, size in sorted(runs, key=lambda r: -r[2])[:top]:
        print(f"  ${addr:04X}    {size:<7} {'code' if code[addr] else 'data':<6} {reason}")


if __name__ == "__main__":
    main()
