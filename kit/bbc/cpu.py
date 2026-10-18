#!/usr/bin/env python3
"""The BBC Micro's CPU and text decoding, for kit/scripts/listing.py.

The Model B's CPU is an NMOS 6502, the C64's own: `kit/cpu/m6502.py` holds it, shared by
every machine built on one. What is the BBC's is its text, which is ASCII: the MOS prints
it through OSWRCH, and Mode 7's screen holds it as it is, with the teletext control codes
(128 to 159, colours and graphics) between the words.

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  text_items(kind, ram, start, end)  -> (texts, starts) or None
      for BASIC, whose items are longer than a byte: a program line each (basic.pieces)
  TEXT_TYPES                         the block types this machine can hold

A program in BBC BASIC, as LOAD or CHAIN leaves it at PAGE, is the text type `BASIC`, read by
`basic.py` beside this file and listed a line at a time as BASIC's own LIST prints it.

regenerator2000 has no ASCII block of its own, and no BASIC: a BBC project types text as its
PETSCII text and a BASIC program as its screencode text, and kit/bbc/project.py and
kit/bbc/r2000.py translate them to "ASCII" and "BASIC" on the way out
(kit/skills/bbc/tool-regen2000).

A Master's 65C12 adds instructions the shared table lacks (BRA, PHX, STZ and others): a
game written for the Master needs them added to kit/cpu/ first.
"""
import os, sys

CPU = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpu")
if CPU not in sys.path:
    sys.path.append(CPU)
from m6502 import OPS, LEN, UNDOCUMENTED, FORMAT, decode, operand  # noqa: E402,F401  the 6502, shared
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import basic  # noqa: E402

TEXT_TYPES = ("ASCII", "BASIC")


def ascii_char(c):
    """One byte as the listing shows it: printable ASCII, and a dot for anything else
    (a control code, or a top-bit character such as a teletext colour)."""
    return chr(c) if 0x20 <= c <= 0x7E else "."


def text_decode(kind, byte):
    """One byte of text, in the block type `kind`."""
    if kind == "ASCII":
        return ascii_char(byte)
    if kind == "BASIC":
        return basic.byte_text(byte)
    sys.exit(f"kit/bbc/cpu.py: no text type {kind!r} (the BBC's text is ASCII, or a BASIC program)")


def text_items(kind, ram, start, end):
    if kind == "BASIC":
        return basic.pieces(ram, start, end)
    return None


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
