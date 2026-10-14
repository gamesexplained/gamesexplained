#!/usr/bin/env python3
"""The C64's CPU and text decoding, for kit/scripts/listing.py.

listing.py keeps the ledger, the record format and the source of every
byte; this module owns only what is specific to the machine. The 6502 itself,
its opcode table, addressing modes and operand text, is `kit/cpu/m6502.py`,
shared with every machine built on one; this adds the C64's two character
sets. `kit/<platform>/cpu.py` is the same interface for another machine, and
listing.py picks it by `game.json`'s `platform`.

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold

`regs` maps an address to a chip register's name (kit/<platform>/registers.py)
and `chips(target, at)` says whether an instruction at `at` sees a chip
there rather than the RAM beneath; listing.py's help explains the rule.
"""
import os, sys

CPU = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpu")
if CPU not in sys.path:
    sys.path.append(CPU)
from m6502 import OPS, LEN, UNDOCUMENTED, FORMAT, decode, operand  # noqa: E402,F401  the 6502, shared


# --- text -------------------------------------------------------------------
def screencode(c):
    c &= 0x7F
    if c == 0: return "@"
    if 1 <= c <= 26: return chr(64 + c)
    if 32 <= c <= 63: return chr(c)
    if c == 27: return "["
    if c == 29: return "]"
    return "."


def petscii(c):
    if 0x20 <= c <= 0x5A: return chr(c)
    if 0xC1 <= c <= 0xDA: return chr(c - 0x80)
    if 0x41 <= c <= 0x5A: return chr(c)
    return "."


TEXT_TYPES = ("PETSCII", "Screencode")


def text_decode(kind, byte):
    """One byte of text, in the block type `kind`."""
    if kind == "PETSCII":
        return petscii(byte)
    if kind == "Screencode":
        return screencode(byte)
    sys.exit(f"kit/c64/cpu.py: no text type {kind!r}")


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
