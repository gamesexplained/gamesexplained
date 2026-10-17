#!/usr/bin/env python3
"""The hardware register census of kit/skills/core/40-sweep, from every instruction in the code.

Decodes every instruction in the code blocks and lists those whose operand
names one of the machine's registers: the chips at $D000-$DFFF (colour RAM
aside) and the processor port at $00-$01. One row per register and
instruction, with how many times it occurs and the first address; then the
chips' registers that no instruction names. A text search in the
disassembler stops at a fixed number of results without saying so, which
lost a game's whole sound chip from its census; this has no limit.

Usage:
  census.py <game or part dir> [<snapshot.vsf>] [--live]

The bytes come from the snapshot when one is given, otherwise from the
folder's listing.json; the blocks from symbols.json, or with --live from
the running disassembler (as kit/c64/opcodes.py, which this uses).

An operand on one of a chip's repeats (the video chip every 64 bytes to
$D3FF, the sound chip every 32 to $D7FF, each CIA every 16 through its
page) is counted under the register it repeats, and the row says which
address the code used. An indexed operand is counted under the register
its base names, with the index (`sta,x`), and may reach the registers
after it. What it cannot see: an access through a pointer (`sta ($FB),y`),
code outside the code blocks, and whether the chips were banked in when
the instruction ran (kit/skills/core/50-coverage, "A game can live under
its I/O").
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from opcodes import image, blocks_of, walk, operand   # noqa: E402
from registers import NAMES                         # noqa: E402

PORT = {0x00: "cpu_port_ddr", 0x01: "cpu_port"}
CHIPS = [(0xD000, 0xD3FF, 0x3F, 0xD02E), (0xD400, 0xD7FF, 0x1F, 0xD41C),   # (first, last, repeat mask, last register)
         (0xDC00, 0xDCFF, 0x0F, 0xDC0F), (0xDD00, 0xDDFF, 0x0F, 0xDD0F)]


def register(v):
    """(the register an operand names, after folding a chip's repeats), or None for RAM."""
    if v in PORT:
        return v
    for lo, hi, mask, last in CHIPS:
        if lo <= v <= hi:
            r = lo + (v & mask)
            return r if r <= last else None      # the unused addresses at the end of a chip's page
    if 0xDE00 <= v <= 0xDFFF:                    # I/O 1 and 2, the expansion port's
        return v
    return None


def chip(r):
    """Which of CHIPS a register belongs to, or None."""
    return next((i for i, (lo, _, _, last) in enumerate(CHIPS) if lo <= r <= last), None)


def name(r):
    return PORT.get(r) or NAMES.get(r) or ("io1" if r < 0xDF00 else "io2")


def census(ram, known, blocks):
    """{(register, instruction): [count, first address, {addresses the code wrote}]}."""
    rows = {}
    for b in (b for b in blocks if b["type"] == "Code"):
        for a, d in walk(ram, known, b["start"], b["end"]):
            if d is None or d[1] not in ("zp", "abs", "zpx", "zpy", "abx", "aby"):
                continue
            m, mode, bs = d
            v = operand(a, mode, bs)
            r = register(v)
            if r is None or r in PORT and mode[-1] in "xy":   # from $00 or $01, an index clears zero page
                continue
            key = (r, m + ("," + mode[-1] if mode[-1] in "xy" else ""))
            row = rows.setdefault(key, [0, a, set()])
            row[0] += 1
            row[1] = min(row[1], a)
            row[2].add(v)
    return rows


def never(rows):
    """The chips' registers no instruction names, as runs of (first, last)."""
    named = {r for r, _ in rows}
    every = [r for lo, _, _, last in CHIPS for r in range(lo, last + 1)]
    runs = []
    for r in every:
        if r in named:
            continue
        if runs and runs[-1][1] == r - 1:
            runs[-1][1] = r
        else:
            runs.append([r, r])
    return runs


def report(rows, source):
    lines = [f"register census ({source}): {sum(c for c, _, _ in rows.values())} instructions"
             f" name {len({r for r, _ in rows})} registers"]
    last = None
    for (r, ins), (count, first, used) in sorted(rows.items(), key=lambda kv: (kv[0][0], kv[1][1])):
        aka = sorted(used - {r})
        note = "  as " + ", ".join(f"${u:04X}" for u in aka) if aka else ""
        reg = f"${r:04X}  {name(r):24}" if r != last else " " * 31
        lines.append(f"  {reg} {ins:7} {count:4}  first ${first:04X}{note}")
        last = r
    reached = [r for r, ins in rows if "," in ins]
    lines.append("")
    lines.append("named by no instruction:")
    for lo, hi in never(rows):
        names = name(lo) if lo == hi else f"{name(lo)} to {name(hi)}"
        span = f"${lo:04X}" if lo == hi else f"${lo:04X}-${hi:04X}"
        near = [b for b in reached if b < lo and chip(b) == chip(lo)]
        lines.append(f"  {span:12} {names}" + (f"  (an indexed access from ${max(near):04X} may reach it)"
                                               if near else ""))
    return lines


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    vsf = argv[1] if len(argv) > 1 and argv[1].endswith(".vsf") else None
    ram, known = image(gdir, vsf)
    blocks, _ = blocks_of(gdir, "--live" in argv)
    source = f"bytes from {'the snapshot' if vsf else 'listing.json'}, blocks from " + \
             ("the running disassembler" if "--live" in argv else "symbols.json")
    print("\n".join(report(census(ram, known, blocks), source)))


if __name__ == "__main__":
    main()
