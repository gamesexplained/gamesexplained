#!/usr/bin/env python3
"""Shared ledger: which bytes the game uses, who owns them, what is explained.

Used by coverage.py (the metric) and listing.py (the Source tab) so the two
never disagree about what counts as the game. See coverage.py for the rules.
"""
import bisect, re

MAX_SPAN = 64
BOUNDARY_TYPES = {"Subroutine", "UserDefined", "Field", "ZeroPageField",
                  "ZeroPagePointer", "AbsoluteAddress", "ZeroPageAbsoluteAddress"}


def compute(blocks, syms, comments, regions):
    """Returns dict with: state (bytearray: 0 untracked, 1 bare, 2 explained),
    code (bytearray), owner {addr: (name, sym_addr)}, commented (set),
    dups [(addr, first_addr)], excluded(fn)."""
    exclude = regions.get("exclude", [])
    extra = regions.get("extra", [])

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

    code = bytearray(0x10000)
    for b in blocks:
        if b["type"] == "Code":
            for a in range(b["start"], b["end"] + 1):
                code[a] = 1
    # A span ends at the edge of its block. A data span also ends at the fixed edges of the
    # memory map, so that a table's reach cannot run on into the next region; a routine
    # runs on across them, since code that crosses $1000 is still one routine.
    block_edges = set()
    for b in blocks:
        block_edges.add(b["start"]); block_edges.add(b["end"] + 1)
    fixed = {0x0000, 0x0100, 0x0200, 0x0400, 0x0800, 0x1000, 0x4000, 0x8000, 0xA000, 0xC000, 0xD000, 0xE000}
    walls = {True: sorted(block_edges), False: sorted(block_edges | fixed)}

    def wall_after(a):
        edges = walls[bool(code[a])]
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
        nxt = baddrs[i + 1] if i + 1 < len(bounds) else 0x10000   # the last symbol spans to its cap, not one byte
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
    return {"state": state, "code": code, "owner": owner, "commented": commented,
            "dups": dups, "excluded": excluded}
