#!/usr/bin/env python3
"""The Commodore 16's and Plus/4's CPU and text decoding, for kit/scripts/listing.py.

The C16's and Plus/4's CPU is a 7501 or an 8501, an NMOS 6502 with a port of its own at $00 and
$01, which runs the 6502's instructions, the undocumented ones included, as the C64's 6510 does:
`kit/cpu/m6502.py` holds it, shared by every machine built on one (kit/skills/c16/c16-reference,
"The CPU").

What is the machine's is its text. Commodore's 8-bit machines share it: the KERNAL prints
PETSCII, and TED's character ROM holds the C64's two character sets, 128 characters each at $D000
and $D400, in the C64's order (TED draws the reversed ones itself), so a string on the screen is in
the C64's screen codes (c16-reference, "TED"). The two decoders are the C64's own, loaded from
kit/c64/cpu.py, so that a fix to one is a fix to both.

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold

A BASIC 3.5 program (a game's loader, or the line with SYS that starts it) is typed as bytes,
with its text in the comment, as on the C64.
"""
import importlib.util, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CPU = os.path.join(os.path.dirname(HERE), "cpu")
if CPU not in sys.path:
    sys.path.append(CPU)
from m6502 import OPS, LEN, UNDOCUMENTED, FORMAT, decode, operand  # noqa: E402,F401  the 6502, shared

_spec = importlib.util.spec_from_file_location("c64_cpu_text", os.path.join(os.path.dirname(HERE), "c64", "cpu.py"))
_c64 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_c64)
petscii, screencode = _c64.petscii, _c64.screencode

TEXT_TYPES = ("PETSCII", "Screencode")


def text_decode(kind, byte):
    """One byte of text, in the block type `kind`."""
    if kind == "PETSCII":
        return petscii(byte)
    if kind == "Screencode":
        return screencode(byte)
    sys.exit(f"kit/c16/cpu.py: no text type {kind!r}")


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
