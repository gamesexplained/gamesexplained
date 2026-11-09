#!/usr/bin/env python3
"""A small assembler for the Sharp SM5A, for the kit's own test programs (check_emulator.py).

    from asm import assemble
    rom = assemble({0x0F: [("loop", "KTA"), (None, "TR", "loop")]})   # page -> lines

A program is a dict of pages (0-$1C, CB included as $10 and up) to lines (label, mnemonic,
operand); each page's lines go in the order the chip runs them (kit/cpu/sm5a.py, the logical
order), and the result is the 1,856-byte ROM in the ROM's own order, every unused byte 0
(SKIP). Operands: a number, or for TR a label on the same page, for TRS a label on page $10,
for LBL a data address. Mnemonics are kit/cpu/sm5a.py's, MAME's.
"""
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpu"))
from sm5a import L2R, ROM_SIZE, _T, EXTENDED   # noqa: E402

PLAIN = {m: op for op, (m, kind) in _T.items() if kind is None}
BASE = {"RM": 0x04, "SM": 0x0C, "EXC": 0x10, "EXCI": 0x14, "LDA": 0x18, "EXCD": 0x1C, "TM": 0x54,
        "LAX": 0x20, "ADX": 0x30, "LB": 0x40, "SSR": 0x70}
WIDTH = {"RM": 3, "SM": 3, "EXC": 3, "EXCI": 3, "LDA": 3, "EXCD": 3, "TM": 3, "LAX": 15, "ADX": 15, "LB": 15, "SSR": 15}
EXT = {m: p for p, m in EXTENDED.items()}


def assemble(pages):
    rom = bytearray(ROM_SIZE)
    for page, lines in pages.items():
        labels, at = {}, 0
        for line in lines:
            label, m = line[0], line[1]
            if label:
                labels[label] = at
            at += 2 if m in ("LBL",) or m in EXT else 1
        if at > 63:
            raise ValueError(f"page ${page:02X}: {at} bytes, a page runs 63")
        at = 0
        for line in lines:
            label, m, arg = line[0], line[1], (line[2] if len(line) > 2 else None)
            out = []
            if m in PLAIN:
                out = [PLAIN[m]]
            elif m in BASE:
                if not 0 <= arg <= WIDTH[m]:
                    raise ValueError(f"{m} {arg}: out of range")
                out = [BASE[m] | arg]
            elif m == "TR":
                out = [0x80 | L2R[labels[arg]] if isinstance(arg, str) else 0x80 | arg]
            elif m == "TRS":
                out = [0xC0 | (arg & 0x3F)]
            elif m == "LBL":
                out = [0x5F, arg & 0xFF]
            elif m in EXT:
                out = [0x5E, EXT[m]]
            else:
                raise ValueError(f"{m}: not an SM5A mnemonic")
            for b in out:
                rom[page << 6 | L2R[at]] = b
                at += 1
    return bytes(rom)


if __name__ == "__main__":
    print(__doc__)
