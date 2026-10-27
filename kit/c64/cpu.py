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


# --- the string sweep (kit/cpu/strings.py) ------------------------------------
# A screen code is in one of the character ROM's two sets, and the listing shows the first, where
# $41-$5A are graphics; the second has its capitals there and its small letters at $01-$1A, so a
# sweep that ends a run at $41-$5A reports mixed-case text a byte late, at its second letter.
# PETSCII's lower-case mode is the same: $41-$5A small, $C1-$DA (and $61-$7A) capitals. Only the
# letters, the digits, the space and the signs text uses count, since code read as screen codes is
# mostly the rest.
_FIRST = {c: ch for c, ch in enumerate("@ABCDEFGHIJKLMNOPQRSTUVWXYZ[£]↑←" + "".join(map(chr, range(0x20, 0x40))))
          if ch.isalnum() or ch in " !\"&'(),-./:;?+"}


def _screen(c, second):
    c &= 0x7F                      # $80-$FF are the same characters reversed
    if 0x41 <= c <= 0x5A:
        return chr(c) if second else None
    ch = _FIRST.get(c)
    return ch.lower() if ch and second else ch


def _pet(c, lower):
    if 0x41 <= c <= 0x5A:
        return chr(c).lower() if lower else chr(c)
    if 0xC1 <= c <= 0xDA or 0x61 <= c <= 0x7A:
        return chr((c & 0x1F) + 0x40) if lower else None
    return _FIRST.get(c) if 0x20 <= c <= 0x5F else None


def sweep_runs(kind, ram):
    """[(first, last, text)]: each run of characters for the string sweep. A run is read in the
    second set (or lower-case mode) when it holds a byte that only that one has as a letter,
    otherwise in the first, which is the machine's at power-on: text in small letters alone reads
    as capitals. Reversed screen codes are a run of their own."""
    if kind not in TEXT_TYPES:
        sys.exit(f"kit/c64/cpu.py: no text type {kind!r}")
    one = _pet if kind == "PETSCII" else _screen
    out, a = [], 0
    while a < len(ram):
        if one(ram[a], True) is None and one(ram[a], False) is None:
            a += 1; continue
        b = a
        while b < len(ram) and (one(ram[b], True) is not None or one(ram[b], False) is not None) \
                and (kind == "PETSCII" or (ram[b] ^ ram[a]) & 0x80 == 0):
            b += 1
        second = any(one(c, False) is None for c in ram[a:b])
        out.append((a, b - 1, "".join(one(c, second) for c in ram[a:b])))
        a = b
    return out


def text_decode(kind, byte):
    """One byte of text, in the block type `kind`."""
    if kind == "PETSCII":
        return petscii(byte)
    if kind == "Screencode":
        return screencode(byte)
    sys.exit(f"kit/c64/cpu.py: no text type {kind!r}")


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
