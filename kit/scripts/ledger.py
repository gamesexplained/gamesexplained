#!/usr/bin/env python3
"""Shared ledger: which bytes the game uses, who owns them, what is explained.

Used by coverage.py (the metric) and listing.py (the Source tab) so the two
never disagree about what counts as the game. See coverage.py for the rules.
"""
import bisect, re

MAX_SPAN = 64
PROGRAM_TYPES = {"BASIC"}       # text that is a program, its spans crossing the map's edges as code's do
BOUNDARY_TYPES = {"Subroutine", "UserDefined", "Field", "ZeroPageField",
                  "ZeroPagePointer", "AbsoluteAddress", "ZeroPageAbsoluteAddress"}


def compute(blocks, syms, comments, regions):
    """Returns dict with: state (bytearray: 0 untracked, 1 bare, 2 explained),
    code (bytearray), owner {addr: (name, sym_addr)}, commented (set),
    dups [(addr, first_addr)], excluded(fn), and stops {sym_addr: (name, end, why, reach)}:
    where each span ends and what ended it ("next" symbol, its "reach", its "block" or a
    fixed "edge" of the memory map)."""
    exclude = regions.get("exclude", [])
    extra = regions.get("extra", [])
    size = regions.get("size", 0x10000)     # 64 KB, or a virtual address space's own (a story's)

    def excluded(a):
        return any(lo <= a <= hi for lo, hi, _ in exclude)

    seen, commented, dups = {}, set(), []
    for c in sorted(comments, key=lambda c: c["address"]):
        if c["type"] != "line" or not c["text"].strip():
            continue
        key = re.sub(r"\s+", " ", c["text"].strip().lower())
        if key in seen:
            dups.append((c["address"], seen[key]))
        else:
            seen[key] = c["address"]
            commented.add(c["address"])

    # typed: data blocks given a shape (bytes, words, text, pointers), not left undefined
    code, typed, program = bytearray(size), bytearray(size), bytearray(size)
    for b in blocks:
        if b["type"] == "Undefined":
            continue
        grid = code if b["type"] == "Code" else typed
        for a in range(b["start"], b["end"] + 1):
            grid[a] = 1
            if b["type"] in PROGRAM_TYPES:
                program[a] = 1
    # A span ends at the edge of its block. A data span also ends at the fixed edges of the
    # memory map, the machine's own (symbols_export.PLATFORM_DEFAULTS, "edges"), so that a
    # table's reach cannot run on into the next region; a routine runs on across them, since
    # code that crosses an edge is still one routine, and so does a program in BASIC, whose
    # line that crosses one is still one line.
    block_edges = set()
    for b in blocks:
        block_edges.add(b["start"]); block_edges.add(b["end"] + 1)
    fixed = set(regions.get("edges", []))
    walls = {True: sorted(block_edges), False: sorted(block_edges | fixed)}

    def wall_after(a):
        edges = walls[bool(code[a] or program[a])]
        i = bisect.bisect_right(edges, a)
        return edges[i] if i < len(edges) else size

    syms = sorted(syms, key=lambda s: s["address"])
    bounds = [s for s in syms if s["type"] in BOUNDARY_TYPES or s["address"] in commented]
    baddrs = [s["address"] for s in bounds]
    state = bytearray(size)
    owner, stops = {}, {}
    for i, s in enumerate(bounds):
        a = s["address"]
        if excluded(a) or a >= size:
            continue
        nxt = baddrs[i + 1] if i + 1 < len(bounds) else size   # the last symbol spans to its cap, not one byte
        # the long reach: code, a label made afresh, or a symbol the tracer minted that the
        # agent has renamed inside a typed data block. Renaming keeps the tracer's type, and a
        # renamed variable in undefined memory would otherwise take in the bytes after it.
        long_reach = (s["type"] in ("Subroutine", "UserDefined") or code[a]
                      or (s.get("kind") == "user" and typed[a]))
        reach = 0x400 if long_reach else MAX_SPAN
        wall = wall_after(a)
        end = min(nxt, a + reach, wall)
        stops[a] = (s["name"], end, "next" if end == nxt else "reach" if end == a + reach
                    else "block" if wall in block_edges else "edge", reach)
        val = 2 if a in commented else 1
        for x in range(a, max(end, a + 1)):
            if not excluded(x) and state[x] < val:
                state[x] = val
            owner.setdefault(x, (s["name"], a))
    # A line comment on bytes no span reaches describes them as a label would: it owns them
    # up to the next boundary, with a label's reach. Without this, a run's comment on a stray
    # instruction or a table's tail is shown with none of the bytes it explains (#442).
    labelled = {s["address"] for s in syms}
    loose = sorted(a for a in commented if a < size and a not in labelled and a not in owner
                   and not excluded(a))
    starts = sorted(set(baddrs) | set(loose))
    for a in loose:
        i = bisect.bisect_right(starts, a)
        nxt = starts[i] if i < len(starts) else size
        reach = 0x400 if code[a] or typed[a] else MAX_SPAN
        wall = wall_after(a)
        end = min(nxt, a + reach, wall)
        name = f"the comment at ${a:04X}"
        stops[a] = (name, end, "next" if end == nxt else "reach" if end == a + reach
                    else "block" if wall in block_edges else "edge", reach)
        for x in range(a, end):
            if not excluded(x):
                state[x] = 2
            owner.setdefault(x, (name, a))
    # Code, a program, typed data and declared extras are the game's whether or not a span
    # reaches them: typed data no label reaches is bare, so coverage asks for its description
    # and the listing holds its bytes (#442).
    for a in range(size):
        if excluded(a):
            state[a] = 0
        elif state[a] == 0 and (code[a] or typed[a] or any(lo <= a <= hi for lo, hi, _ in extra)):
            state[a] = 1
    return {"state": state, "code": code, "owner": owner, "commented": commented,
            "dups": dups, "excluded": excluded, "stops": stops}
