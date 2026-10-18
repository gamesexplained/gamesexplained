#!/usr/bin/env python3
"""The NES's CPU and text decoding, for kit/scripts/listing.py.

The 2A03's CPU is an NMOS 6502 without decimal mode: the D flag can be set and cleared, but
ADC and SBC ignore it (kit/skills/nes/nes-reference, "The CPU"). Decoding is the same as any
6502's, so `kit/cpu/m6502.py` holds it, shared by every machine built on one. The simulator,
kit/cpu/cpu6502.js, does honour D, which matters only to a port that runs a game's
arithmetic (kit/skills/nes/steps, "simulator").

The NES has no character set of its own: a game's text is tile numbers into its own pattern
table, in whatever order the game drew its font. That is a private alphabet, typed `Byte`
with the words in the comment (kit/skills/core/30-text). A game whose font sits at the ASCII
places, so that "A" is tile $41, has text type `ASCII`.

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold

regenerator2000 has no ASCII block of its own: a NES project types it as its PETSCII text,
and kit/nes/project.py and kit/nes/r2000.py translate it to "ASCII" on the way out.
"""
import os, sys

CPU = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpu")
if CPU not in sys.path:
    sys.path.append(CPU)
from m6502 import OPS, LEN, UNDOCUMENTED, FORMAT, decode, operand  # noqa: E402,F401  the 6502, shared

TEXT_TYPES = ("ASCII",)


def text_decode(kind, byte):
    """One byte of text, in the block type `kind`: printable ASCII, and a dot for anything else."""
    if kind == "ASCII":
        return chr(byte) if 0x20 <= byte <= 0x7E else "."
    sys.exit(f"kit/nes/cpu.py: no text type {kind!r} (the NES's only text type is ASCII; a font of the "
             "game's own is typed Byte, kit/skills/core/30-text)")


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
