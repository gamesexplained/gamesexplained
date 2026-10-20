#!/usr/bin/env python3
"""The 65C02, for every machine built on one: the opcode table and decoding, over the NMOS
6502's (m6502.py).

The enhanced Apple IIe runs a 65C02 (kit/skills/apple2/apple2-reference). It runs the NMOS
6502's 151 documented opcodes, and adds 27 opcodes and two addressing modes, (zp) and (abs,x):

  bra                     branch always
  phx phy plx ply         push and pull X and Y
  stz                     store zero: zp, zp,x, abs, abs,x
  trb tsb                 test and reset, test and set the accumulator's bits in memory: zp, abs
  inc a, dec a            the accumulator
  bit                     immediate, zp,x and abs,x as well
  jmp (abs,x)             a jump through a table of addresses
  ora and eor adc sta lda cmp sbc (zp)

The other 78 opcodes are no-ops of fixed lengths, NOPS below, and none of the NMOS 6502's
undocumented instructions survives: a game that relies on one goes wrong on this processor.
Rockwell's bit instructions (rmb, smb, bbr, bbs) and WDC's wai and stp are no-ops here too,
as on the kit's Apple II (Apple2TS 3.7.0, src/worker/instructions.ts, which this table matches
opcode for opcode: `opcodes.py --check apple2`).

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None; a no-op is None,
                                        a byte the listing shows as data
  operand(a, m, mode, bs, names, regs, chips) -> (text, target), m6502's, which knows both modes
  OPS, LEN, FORMAT                   the 178 documented opcodes, each mode's length, its text
  NOPS                               the 78 no-ops, as "noop" with the mode that gives each its length
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from m6502 import OPS as NMOS, LEN, FORMAT, operand  # noqa: E402,F401  operand is shared

OPS = dict(NMOS)
OPS.update({
    0x80: ("bra", "rel"),
    0xDA: ("phx", "imp"), 0x5A: ("phy", "imp"), 0xFA: ("plx", "imp"), 0x7A: ("ply", "imp"),
    0x64: ("stz", "zp"), 0x74: ("stz", "zpx"), 0x9C: ("stz", "abs"), 0x9E: ("stz", "abx"),
    0x14: ("trb", "zp"), 0x1C: ("trb", "abs"), 0x04: ("tsb", "zp"), 0x0C: ("tsb", "abs"),
    0x1A: ("inc", "acc"), 0x3A: ("dec", "acc"),
    0x89: ("bit", "imm"), 0x34: ("bit", "zpx"), 0x3C: ("bit", "abx"),
    0x7C: ("jmp", "iax"),
    0x12: ("ora", "zpi"), 0x32: ("and", "zpi"), 0x52: ("eor", "zpi"), 0x72: ("adc", "zpi"),
    0x92: ("sta", "zpi"), 0xB2: ("lda", "zpi"), 0xD2: ("cmp", "zpi"), 0xF2: ("sbc", "zpi"),
})
assert len(OPS) == 178, len(OPS)

# The no-ops: one byte in columns 3, 7, B and F; two in column 2 and at $44, $54, $D4 and $F4
# (which read zero page as they pass); three at $5C, $DC and $FC. Which bytes each reads as it
# passes is in kit/skills/apple2/apple2-reference, "The 65C02".
NOPS = {}
for _row in range(16):
    for _col in (0x3, 0x7, 0xB, 0xF):
        NOPS[_row * 16 + _col] = ("noop", "imp")
for _op in (0x02, 0x22, 0x42, 0x62, 0x82, 0xC2, 0xE2):
    NOPS[_op] = ("noop", "imm")
NOPS[0x44] = ("noop", "zp")
for _op in (0x54, 0xD4, 0xF4):
    NOPS[_op] = ("noop", "zpx")
for _op in (0x5C, 0xDC, 0xFC):
    NOPS[_op] = ("noop", "abs")
assert len(NOPS) == 78 and not set(NOPS) & set(OPS)


def decode(ram, a):
    """(mnemonic, mode, nbytes) for the instruction at a, or None for a no-op: a byte
    that code does not use, which the listing shows as data."""
    e = OPS.get(ram[a])
    return (e[0], e[1], LEN[e[1]]) if e else None


if __name__ == "__main__":
    print(f"{len(OPS)} documented opcodes, {len(NOPS)} no-ops")
