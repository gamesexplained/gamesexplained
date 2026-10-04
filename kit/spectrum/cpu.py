#!/usr/bin/env python3
"""The ZX Spectrum's CPU and text decoding, for kit/scripts/listing.py.

The platform adapter listing.py loads by `game.json`'s platform: the Z80
instruction tables and the operand formatter live in `z80.py` beside this
file, and `test_z80.py` checks them against SkoolKit over the whole opcode
space.

  decode(ram, a)                     -> (mnemonic, template, nbytes) or None
  operand(a, m, t, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold
"""
from z80 import TEXT_TYPES, decode, operand, text_decode

__all__ = ["TEXT_TYPES", "decode", "operand", "text_decode"]
