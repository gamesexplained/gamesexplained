#!/usr/bin/env python3
"""The hardware register census of kit/skills/core/40-sweep, from every instruction in the code.

For a machine built on the 6502 whose chips answer at addresses (the C64, the BBC
Micro). Decodes every instruction in the code blocks and lists those whose operand
names one of the machine's registers, one row per register and instruction, with how
many times it occurs and the first address; then the registers that no instruction
names. A text search in the disassembler stops at a fixed number of results without
saying so, which lost a game's whole sound chip from its census; this has no limit.

Usage:
  census.py <game or part dir> [<snapshot>] [--live]

The bytes come from the snapshot when one is given, otherwise from the folder's
listing.json; the blocks from symbols.json, or with --live from the running
disassembler (as kit/cpu/opcodes.py, which this uses).

Which addresses are registers is the machine's, from kit/<platform>/registers.py:
  NAMES          each register's name, as the Source tab shows it
  CENSUS_CHIPS   [(first, last, repeat mask, last register)]: a chip that repeats its
                 registers through its pages. An operand on a repeat is counted under the
                 register it repeats, and the row says which address the code used; an
                 address past the last register is not a register.
  CENSUS_PAGES   [(first, last, name)]: pages where every address is its own register,
                 named from NAMES or else after the page
  CENSUS_OTHER   {address: name}: registers outside those, such as the C64's processor
                 port, which an indexed operand never reaches (an index from $00 or $01
                 clears zero page)
A machine without CENSUS_CHIPS or CENSUS_PAGES has no registers at addresses: the ZX
Spectrum's are ports (kit/skills/spectrum/steps, "census").

An indexed operand is counted under the register its base names, with the index
(`sta,x`), and may reach the registers after it. What it cannot see: an access through
a pointer (`sta ($FB),y`), code outside the code blocks, and whether the chips were
banked in when the instruction ran (kit/skills/c64/c64-reference, "Code and tables
under the I/O area").
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from opcodes import image, blocks_of, walk, operand, platform, snapshot_arg   # noqa: E402


class Machine:
    """A platform's registers, from kit/<platform>/registers.py."""

    def __init__(self, plat):
        sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
        from symbols_export import KIT, load_by_path
        regs = load_by_path(os.path.join(KIT, plat, "registers.py"), f"{plat}_registers")
        self.names = regs.NAMES
        self.chips = getattr(regs, "CENSUS_CHIPS", [])
        self.pages = getattr(regs, "CENSUS_PAGES", [])
        self.other = getattr(regs, "CENSUS_OTHER", {})
        if not (self.chips or self.pages or self.other):
            sys.exit(f"kit/{plat}/registers.py names no registers at addresses for a census; "
                     f"see kit/skills/{plat}/steps, \"census\"")

    def register(self, v, indexed):
        """The register an operand names, after folding a chip's repeats, or None for RAM."""
        if v in self.other:
            return None if indexed else v
        for lo, hi, mask, last in self.chips:
            if lo <= v <= hi:
                r = lo + (v & mask)
                return r if r <= last else None      # the unused addresses at the end of a chip's page
        for lo, hi, _ in self.pages:
            if lo <= v <= hi:
                return v
        return None

    def group(self, r):
        """Which chip or page a register belongs to, or None."""
        spans = [(lo, last) for lo, _, _, last in self.chips] + [(lo, hi) for lo, hi, _ in self.pages]
        return next((i for i, (lo, last) in enumerate(spans) if lo <= r <= last), None)

    def name(self, r):
        return self.other.get(r) or self.names.get(r) or \
            next((n for lo, hi, n in self.pages if lo <= r <= hi), f"${r:04X}")

    def every(self):
        """Every register a census can list as named by no instruction: each chip's, and the
        named ones in its pages."""
        return sorted({r for lo, _, _, last in self.chips for r in range(lo, last + 1)} |
                      {r for lo, hi, _ in self.pages for r in self.names if lo <= r <= hi})


def census(ram, known, blocks, machine):
    """{(register, instruction): [count, first address, {addresses the code wrote}]}."""
    rows = {}
    for b in (b for b in blocks if b["type"] == "Code"):
        for a, d in walk(ram, known, b["start"], b["end"]):
            if d is None or d[1] not in ("zp", "abs", "zpx", "zpy", "abx", "aby"):
                continue
            m, mode, bs = d
            v = operand(a, mode, bs)
            r = machine.register(v, mode[-1] in "xy")
            if r is None:
                continue
            key = (r, m + ("," + mode[-1] if mode[-1] in "xy" else ""))
            row = rows.setdefault(key, [0, a, set()])
            row[0] += 1
            row[1] = min(row[1], a)
            row[2].add(v)
    return rows


def never(rows, machine):
    """The registers no instruction names, as runs of (first, last)."""
    named = {r for r, _ in rows}
    runs = []
    for r in machine.every():
        if r in named:
            continue
        if runs and runs[-1][1] == r - 1 and machine.group(r) == machine.group(runs[-1][0]):
            runs[-1][1] = r
        else:
            runs.append([r, r])
    return runs


def report(rows, source, machine):
    lines = [f"register census ({source}): {sum(c for c, _, _ in rows.values())} instructions"
             f" name {len({r for r, _ in rows})} registers"]
    last = None
    for (r, ins), (count, first, used) in sorted(rows.items(), key=lambda kv: (kv[0][0], kv[1][1])):
        aka = sorted(used - {r})
        note = "  as " + ", ".join(f"${u:04X}" for u in aka) if aka else ""
        reg = f"${r:04X}  {machine.name(r):24}" if r != last else " " * 31
        lines.append(f"  {reg} {ins:7} {count:4}  first ${first:04X}{note}")
        last = r
    reached = [r for r, ins in rows if "," in ins]
    lines.append("")
    lines.append("named by no instruction:")
    for lo, hi in never(rows, machine):
        names = machine.name(lo) if lo == hi else f"{machine.name(lo)} to {machine.name(hi)}"
        span = f"${lo:04X}" if lo == hi else f"${lo:04X}-${hi:04X}"
        near = [b for b in reached if b < lo and machine.group(b) == machine.group(lo)]
        lines.append(f"  {span:12} {names}" + (f"  (an indexed access from ${max(near):04X} may reach it)"
                                               if near else ""))
    return lines


def no_code(blocks, live):
    """Why the census would be empty, or None. With no code blocks it would print every register
    as named by nothing, which reads as a finding; a first session's work is in the disassembler
    until symbols_export.py writes it to symbols.json."""
    if any(b["type"] == "Code" for b in blocks):
        return None
    if live:
        return "the running disassembler has no code blocks: disassemble the game's code first"
    return ("symbols.json has no code blocks, so there is nothing to take a census of: export the "
            "disassembler's work first (kit/scripts/symbols_export.py), or pass --live")


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    snap = snapshot_arg(argv)
    machine = Machine(platform(gdir))
    ram, known = image(gdir, snap)
    blocks, _ = blocks_of(gdir, "--live" in argv)
    why = no_code(blocks, "--live" in argv)
    if why:
        sys.exit(why)
    source = f"bytes from {'the snapshot' if snap else 'listing.json'}, blocks from " + \
             ("the running disassembler" if "--live" in argv else "symbols.json")
    print("\n".join(report(census(ram, known, blocks, machine), source, machine)))


if __name__ == "__main__":
    main()
