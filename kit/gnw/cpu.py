#!/usr/bin/env python3
"""The Game & Watch's processor, for kit/scripts/listing.py: the Sharp SM5A, from kit/cpu/sm5a.py.

The listing's addresses are logical: the ROM in the order the chip runs it (kit/cpu/sm5a.py), so
each page reads top to bottom as the chip steps through it. The data cells are at $1000-$107F.
The machine has no text: its screen is fixed shapes (kit/skills/gnw/gnw-reference, "The LCD").

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold: none
"""
import os, sys

CPU = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpu")
if CPU not in sys.path:
    sys.path.append(CPU)
from sm5a import decode, operand, physical, logical, ROM_SIZE, RAM_BASE, WHAT  # noqa: E402,F401

TEXT_TYPES = ()


def text_decode(kind, byte):
    sys.exit(f"kit/gnw/cpu.py: no text type {kind!r}: a Game & Watch has no text, only the LCD's shapes")


if __name__ == "__main__":
    print(__doc__)
