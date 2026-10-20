#!/usr/bin/env python3
"""The enhanced Apple IIe's CPU and text decoding, for kit/scripts/listing.py.

The enhanced IIe's CPU is a 65C02: `kit/cpu/m65c02.py` holds it, the NMOS 6502's table and the
27 opcodes the 65C02 adds. A game written for an older Apple II is NMOS code, which the 65C02
runs the same, its undocumented opcodes aside (kit/skills/apple2/apple2-reference, "The 65C02").

What is the Apple II's is how an operand in the I/O page is named, and its text:

  * a soft switch means one thing read and another written (registers.py): a store's operand
    takes the write's name, every other instruction's the read's;
  * $C080-$C08F indexed by X or Y is a slot's own sixteen addresses, the index being the slot
    times 16, and takes the name DOS 3.3 gives the register (registers.SLOT): `lda q6l,x`. The
    language card's switches there are reached without an index;
  * text is ASCII, with bit 7 set or clear: COUT prints a byte with bit 7 set as the same letter,
    and most games keep their messages that way. A string poked straight onto the text screen is
    in the screen's own codes (inverse $00-$3F, flashing $40-$7F, normal $80-$FF), the type
    "Screen".

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold

regenerator2000 has neither type: an Apple II project types ASCII as its PETSCII text and the
screen's codes as its screencode text, and kit/apple2/project.py and r2000.py translate them
back (kit/skills/apple2/tool-regen2000). Nor does it know the 65C02's 27 opcodes.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CPU = os.path.join(os.path.dirname(HERE), "cpu")
if CPU not in sys.path:
    sys.path.append(CPU)
from m65c02 import OPS, LEN, NOPS, FORMAT, decode, operand as _operand  # noqa: E402,F401  the 65C02, shared
sys.path.insert(0, HERE)
import registers  # noqa: E402

TEXT_TYPES = ("ASCII", "Screen")
STORES = {"sta", "stx", "sty", "stz"}


def operand(a, m, mode, bs, names, regs, chips):
    """m65c02's operand, with a store's write name and a slot's register indexed by X or Y."""
    text, target = _operand(a, m, mode, bs, names, regs, chips)
    if mode in ("abs", "abx", "aby") and text is not None:
        ta = bs[1] | (bs[2] << 8)
        if mode != "abs" and 0xC080 <= ta <= 0xC08F:
            return f"{registers.SLOT[ta & 0x0F]},{mode[-1]}", None
        if m in STORES and ta in registers.WRITES and chips(ta, a):
            return FORMAT[mode].format(registers.WRITES[ta]), None
    return text, target


def ascii_char(c):
    """A byte of Apple II text as the listing shows it: bit 7 set or clear, the same letter; a
    dot for a control code."""
    c &= 0x7F
    return chr(c) if 0x20 <= c <= 0x7E else "."


def screen_char(c):
    """A byte on the text screen, with the IIe's primary character set: $00-$3F inverse,
    $40-$7F flashing, $80-$FF normal, each the same letters ($00-$1F and $40-$5F the capitals and
    @[\\]^_, $20-$3F the digits and signs); $E0-$FF is lower case."""
    if c < 0x80:
        c &= 0x3F
    else:
        c &= 0x7F
    if c < 0x20:
        c += 0x40
    return chr(c) if c < 0x7F else "."


def text_decode(kind, byte):
    """One byte of text, in the block type `kind`."""
    if kind == "ASCII":
        return ascii_char(byte)
    if kind == "Screen":
        return screen_char(byte)
    sys.exit(f"kit/apple2/cpu.py: no text type {kind!r} (the Apple II's text is ASCII, or the screen's codes)")


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
