#!/usr/bin/env python3
"""The ZX Spectrum's CPU and text decoding, for kit/scripts/listing.py.

The platform adapter listing.py loads by `game.json`'s platform: the Z80
instruction tables and the operand formatter live in `z80.py` beside this
file, and `test_z80.py` checks them against SkoolKit over the whole opcode
space. Sinclair BASIC, the program and its variables as the tape left
them, is the text type `BASIC`, read by `basic.py`.

  decode(ram, a)                     -> (mnemonic, template, nbytes) or None
  operand(a, m, t, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  text_items(kind, ram, start, end)  -> (texts, starts) or None
      for a text type whose items are longer than a byte: walked once over
      the type's whole extent, each byte's share of its item's text and
      where each item starts, with its index kind (see basic.pieces)
  TEXT_TYPES                         the block types this machine can hold
"""
import basic
import z80
from z80 import decode, operand

TEXT_TYPES = z80.TEXT_TYPES + ("BASIC",)


def text_decode(kind, byte):
    if kind == "BASIC":
        return basic.byte_text(byte)
    return z80.text_decode(kind, byte)


def text_items(kind, ram, start, end):
    if kind == "BASIC":
        return basic.pieces(ram, start, end)
    return None


__all__ = ["TEXT_TYPES", "decode", "operand", "text_decode", "text_items"]
