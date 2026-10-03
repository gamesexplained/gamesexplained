#!/usr/bin/env python3
"""The C64's CPU and text decoding, for kit/scripts/listing.py.

listing.py keeps the ledger, the record format and the source of every
byte; this module owns only what is specific to the machine: the opcode
table, the addressing modes and their operand text, and the two character
sets. `kit/<platform>/cpu.py` is the same interface for another machine,
and listing.py picks it by `game.json`'s `platform`.

  decode(ram, a)                     -> (mnemonic, mode, nbytes) or None
  operand(a, m, mode, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte)            -> str
  TEXT_TYPES                         the block types this machine can hold

`regs` maps an address to a chip register's name (kit/<platform>/registers.py)
and `chips(target, at)` says whether an instruction at `at` sees a chip
there rather than the RAM beneath; listing.py's help explains the rule.
"""
import sys

# --- opcode table -----------------------------------------------------------
OPS = {}
def _alu(base, name):
    for off, mode in ((0x09, "imm"), (0x05, "zp"), (0x15, "zpx"), (0x0D, "abs"),
                      (0x1D, "abx"), (0x19, "aby"), (0x01, "izx"), (0x11, "izy")):
        OPS[base + off] = (name, mode)
for base, name in ((0x00, "ora"), (0x20, "and"), (0x40, "eor"), (0x60, "adc"),
                   (0x80, "sta"), (0xA0, "lda"), (0xC0, "cmp"), (0xE0, "sbc")):
    _alu(base, name)
del OPS[0x89]  # sta has no immediate form
for base, name in ((0x00, "asl"), (0x20, "rol"), (0x40, "lsr"), (0x60, "ror")):
    for off, mode in ((0x0A, "acc"), (0x06, "zp"), (0x16, "zpx"), (0x0E, "abs"), (0x1E, "abx")):
        OPS[base + off] = (name, mode)
for base, name in ((0xC0, "dec"), (0xE0, "inc")):
    for off, mode in ((0x06, "zp"), (0x16, "zpx"), (0x0E, "abs"), (0x1E, "abx")):
        OPS[base + off] = (name, mode)
for op, name in ((0x90, "bcc"), (0xB0, "bcs"), (0xF0, "beq"), (0x30, "bmi"),
                 (0xD0, "bne"), (0x10, "bpl"), (0x50, "bvc"), (0x70, "bvs")):
    OPS[op] = (name, "rel")
for op, name in ((0x00, "brk"), (0x18, "clc"), (0xD8, "cld"), (0x58, "cli"), (0xB8, "clv"),
                 (0xCA, "dex"), (0x88, "dey"), (0xE8, "inx"), (0xC8, "iny"), (0xEA, "nop"),
                 (0x48, "pha"), (0x08, "php"), (0x68, "pla"), (0x28, "plp"), (0x40, "rti"),
                 (0x60, "rts"), (0x38, "sec"), (0xF8, "sed"), (0x78, "sei"), (0xAA, "tax"),
                 (0xA8, "tay"), (0xBA, "tsx"), (0x8A, "txa"), (0x9A, "txs"), (0x98, "tya")):
    OPS[op] = (name, "imp")
OPS.update({0x24: ("bit", "zp"), 0x2C: ("bit", "abs"),
            0xE0: ("cpx", "imm"), 0xE4: ("cpx", "zp"), 0xEC: ("cpx", "abs"),
            0xC0: ("cpy", "imm"), 0xC4: ("cpy", "zp"), 0xCC: ("cpy", "abs"),
            0x4C: ("jmp", "abs"), 0x6C: ("jmp", "ind"), 0x20: ("jsr", "abs"),
            0xA2: ("ldx", "imm"), 0xA6: ("ldx", "zp"), 0xB6: ("ldx", "zpy"), 0xAE: ("ldx", "abs"), 0xBE: ("ldx", "aby"),
            0xA0: ("ldy", "imm"), 0xA4: ("ldy", "zp"), 0xB4: ("ldy", "zpx"), 0xAC: ("ldy", "abs"), 0xBC: ("ldy", "abx"),
            0x86: ("stx", "zp"), 0x96: ("stx", "zpy"), 0x8E: ("stx", "abs"),
            0x84: ("sty", "zp"), 0x94: ("sty", "zpx"), 0x8C: ("sty", "abs")})
LEN = {"imp": 1, "acc": 1, "imm": 2, "zp": 2, "zpx": 2, "zpy": 2, "rel": 2,
       "abs": 3, "abx": 3, "aby": 3, "ind": 3, "izx": 2, "izy": 2}
assert len(OPS) == 151, len(OPS)

# Explicitly code-typed NMOS instruction verified in a game. Keep it
# separate from the documented table used by other tooling.
UNDOCUMENTED = {0xBF: ("lax", "aby")}


def decode(ram, a):
    """(mnemonic, mode, nbytes) for the instruction at a, or None for a byte that
    is not an opcode. One byte per instruction: this machine has no prefixes."""
    e = OPS.get(ram[a]) or UNDOCUMENTED.get(ram[a])
    return (e[0], e[1], LEN[e[1]]) if e else None


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


# --- operands ---------------------------------------------------------------
FORMAT = {"zp": "{}", "zpx": "{},x", "zpy": "{},y", "izx": "({},x)", "izy": "({}),y",
          "abs": "{}", "abx": "{},x", "aby": "{},y", "ind": "({})", "rel": "{}"}


def operand(a, m, mode, bs, names, regs, chips):
    """(text, address) of the operand of the instruction at a. The address is None where
    there is none, and on a chip's register: nothing in the listing is there to link to or
    to be referenced from."""
    if mode == "imp":
        return None, None
    if mode == "imm":
        return f"#${bs[1]:02X}", None
    if mode == "acc":
        return "a", None
    if mode == "rel":
        ta = (a + 2 + (bs[1] - 256 if bs[1] > 127 else bs[1])) & 0xFFFF
    elif LEN[mode] == 2:
        ta = bs[1]
    else:
        ta = bs[1] | (bs[2] << 8)
    width = 2 if LEN[mode] == 2 and mode != "rel" else 4
    plain = f"${ta:0{width}X}"
    goes = mode == "rel" or (m in ("jsr", "jmp") and mode == "abs")   # code never runs in the chips
    if not goes and chips(ta, a):
        return FORMAT[mode].format(regs.get(ta) or plain), None
    return FORMAT[mode].format(names.get(ta) or plain), ta


if __name__ == "__main__":
    print(f"{len(OPS)} opcodes; text types {', '.join(TEXT_TYPES)}")
