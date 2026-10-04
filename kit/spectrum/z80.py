#!/usr/bin/env python3
"""The Z80's instruction set, for kit/scripts/listing.py.

A disassembler of our own, so the listing depends on no disassembler at
run time. `kit/spectrum/cpu.py` is the thin platform adapter that
listing.py loads; this module holds the tables. The table was checked
against SkoolKit's decoder over every byte in every prefix context
(`test_z80.py`), which needs SkoolKit only to run that test, never to
build a listing.

  decode(ram, a)          -> (mnemonic, operand template, nbytes) or None
  operand(a, m, t, bs, names, regs, chips) -> (text, target)
  text_decode(kind, byte) -> str
  TEXT_TYPES              the block types this machine can hold

The operand template is the instruction's operand text with holes:
`{n}` immediate byte, `{nn}` immediate word, `{a}` a word that is an
address (a cross-reference target), `{r}` a relative jump target,
`{d}` a signed index displacement. Everything else — register names, bit
numbers, condition codes — is written out in the table. A template of
None means the instruction takes no operand.

The undocumented instructions are decoded the way SkoolKit's fullest setting
decodes them (the halves of IX and IY, the DDCB/FDCB register copies, `sll`,
the ED aliases of NEG, RETN and IM, and ED63, ED6B, ED70 and ED71);
`test_z80.py` holds the two tables against each other. A byte neither
decodes is one record of its own in the listing.
"""
import sys

# --- whole registers and helpers -------------------------------------------
REG8 = ("b", "c", "d", "e", "h", "l", "(hl)", "a")
RP = ("bc", "de", "hl", "sp")
RP2 = ("bc", "de", "hl", "af")
CC = ("nz", "z", "nc", "c", "po", "pe", "p", "m")
ALU = (("add", "a,{o}"), ("adc", "a,{o}"), ("sub", "{o}"), ("sbc", "a,{o}"),
       ("and", "{o}"), ("xor", "{o}"), ("or", "{o}"), ("cp", "{o}"))
ROT = ("rlc", "rrc", "rl", "rr", "sla", "sra", "sll", "srl")


def _base():
    T = {}
    # LD r,r' (0x76 is HALT, not LD (HL),(HL))
    for op in range(0x40, 0x80):
        if op != 0x76:
            T[op] = ("ld", f"{REG8[(op >> 3) & 7]},{REG8[op & 7]}", 1)
    # LD r,n and LD (HL),n
    for r in range(8):
        if r == 6:
            T[0x36] = ("ld", "(hl),{n}", 2)
        else:
            T[0x06 + 8 * r] = ("ld", f"{REG8[r]},{{n}}", 2)
    # INC r / DEC r
    for r in range(8):
        T[0x04 + 8 * r] = ("inc", REG8[r], 1)
        T[0x05 + 8 * r] = ("dec", REG8[r], 1)
    # the ALU group, register and immediate forms
    for i, (mn, fmt) in enumerate(ALU):
        for r in range(8):
            T[0x80 + 8 * i + r] = (mn, fmt.replace("{o}", REG8[r]), 1)
        T[0xC6 + 8 * i] = (mn, fmt.replace("{o}", "{n}"), 2)
    # 16-bit loads, incs, decs and adds
    for i, rp in enumerate(RP):
        T[0x01 + 0x10 * i] = ("ld", f"{rp},{{nn}}", 3)
        T[0x03 + 0x10 * i] = ("inc", rp, 1)
        T[0x0B + 0x10 * i] = ("dec", rp, 1)
        T[0x09 + 0x10 * i] = ("add", f"hl,{rp}", 1)
    for i, cc in enumerate(CC):
        if i < 4:
            T[0x20 + 8 * i] = ("jr", f"{cc},{{r}}", 2)   # only nz, z, nc, c
        T[0xC0 + 8 * i] = ("ret", cc, 1)
        T[0xC2 + 8 * i] = ("jp", f"{cc},{{a}}", 3)
        T[0xC4 + 8 * i] = ("call", f"{cc},{{a}}", 3)
        T[0xC7 + 8 * i] = ("rst", f"${8 * i:02X}", 1)
    T.update({
        0x00: ("nop", None, 1), 0x02: ("ld", "(bc),a", 1), 0x0A: ("ld", "a,(bc)", 1),
        0x12: ("ld", "(de),a", 1), 0x1A: ("ld", "a,(de)", 1),
        0x22: ("ld", "({a}),hl", 3), 0x2A: ("ld", "hl,({a})", 3),
        0x32: ("ld", "({a}),a", 3), 0x3A: ("ld", "a,({a})", 3),
        0x07: ("rlca", None, 1), 0x0F: ("rrca", None, 1), 0x17: ("rla", None, 1),
        0x1F: ("rra", None, 1), 0x27: ("daa", None, 1), 0x2F: ("cpl", None, 1),
        0x37: ("scf", None, 1), 0x3F: ("ccf", None, 1), 0x76: ("halt", None, 1),
        0x08: ("ex", "af,af'", 1), 0x10: ("djnz", "{r}", 2), 0x18: ("jr", "{r}", 2),
        0xC9: ("ret", None, 1), 0xCD: ("call", "{a}", 3), 0xC3: ("jp", "{a}", 3),
        0xD9: ("exx", None, 1), 0xE3: ("ex", "(sp),hl", 1), 0xE9: ("jp", "(hl)", 1),
        0xEB: ("ex", "de,hl", 1), 0xF3: ("di", None, 1), 0xF9: ("ld", "sp,hl", 1),
        0xFB: ("ei", None, 1), 0xD3: ("out", "({n}),a", 2), 0xDB: ("in", "a,({n})", 2),
    })
    for rp, op in (("bc", 0xC1), ("de", 0xD1), ("hl", 0xE1), ("af", 0xF1)):
        T[op] = ("pop", rp, 1)
    for rp, op in (("bc", 0xC5), ("de", 0xD5), ("hl", 0xE5), ("af", 0xF5)):
        T[op] = ("push", rp, 1)
    for _p in (0xCB, 0xED, 0xDD, 0xFD):
        T.pop(_p, None)                  # prefixes, handled apart
    return T


def _index(reg):
    """The DD/FD table for index register `reg` ('ix' or 'iy').

    Only the opcodes the prefix changes are here; the rest are undefined
    under the prefix, exactly as SkoolKit has them (a DD that changes
    nothing is shown as a byte, not as a prefixed instruction)."""
    h, l, x = reg + "h", reg + "l", reg
    mem = f"({x}{{d}})"
    T = {}

    def reg_at(n, other_is_mem):
        # with the other operand in (IX+d), H and L stay H and L; on their
        # own they become the index halves. This is the documented Z80 quirk.
        if n == 6:
            return mem
        if n == 4:
            return "h" if other_is_mem else h
        if n == 5:
            return "l" if other_is_mem else l
        return REG8[n]

    for op in range(0x40, 0x80):
        if op == 0x76:
            continue
        d, s = (op >> 3) & 7, op & 7
        if not ({d, s} & {4, 5, 6}):
            continue                    # nothing here the prefix changes
        n = 3 if d == 6 or s == 6 else 2
        T[op] = ("ld", f"{reg_at(d, s == 6)},{reg_at(s, d == 6)}", n)
    for i, (mn, fmt) in enumerate(ALU):
        for r in (4, 5, 6):
            T[0x80 + 8 * i + r] = (mn, fmt.replace("{o}", reg_at(r, False)), 3 if r == 6 else 2)
    T.update({
        0x09: ("add", f"{x},bc", 2), 0x19: ("add", f"{x},de", 2),
        0x29: ("add", f"{x},{x}", 2), 0x39: ("add", f"{x},sp", 2),
        0x21: ("ld", f"{x},{{nn}}", 4), 0x22: ("ld", f"({{a}}),{x}", 4),
        0x2A: ("ld", f"{x},({{a}})", 4), 0x23: ("inc", x, 2), 0x2B: ("dec", x, 2),
        0x24: ("inc", h, 2), 0x25: ("dec", h, 2), 0x2C: ("inc", l, 2), 0x2D: ("dec", l, 2),
        0x26: ("ld", f"{h},{{n}}", 3), 0x2E: ("ld", f"{l},{{n}}", 3),
        0x34: ("inc", mem, 3), 0x35: ("dec", mem, 3), 0x36: ("ld", f"{mem},{{n}}", 4),
        0xE1: ("pop", x, 2), 0xE3: ("ex", f"(sp),{x}", 2), 0xE5: ("push", x, 2),
        0xE9: ("jp", f"({x})", 2), 0xF9: ("ld", f"sp,{x}", 2),
    })
    return T


def _cb():
    T = {}
    for b in range(256):
        op, y, z = b >> 6, (b >> 3) & 7, b & 7
        if op == 0:
            text = ROT[y] + f" {REG8[z]}"
        elif op == 1:
            text = f"bit {y},{REG8[z]}"
        elif op == 2:
            text = f"res {y},{REG8[z]}"
        else:
            text = f"set {y},{REG8[z]}"
        mn, rest = text.split(" ", 1)
        T[b] = (mn, rest, 2)
    return T


def _cb_index(reg):
    T = {}
    mem = f"({reg}{{d}})"
    for b in range(256):
        op, y, z = b >> 6, (b >> 3) & 7, b & 7
        r = REG8[z]
        if op == 0:
            T[b] = (ROT[y], mem if z == 6 else f"{mem},{r}", 4)
        elif op == 1:
            T[b] = ("bit", f"{y},{mem}", 4)
        elif op == 2:
            T[b] = ("res", f"{y},{mem}" if z == 6 else f"{y},{mem},{r}", 4)
        else:
            T[b] = ("set", f"{y},{mem}" if z == 6 else f"{y},{mem},{r}", 4)
    return T


def _ed():
    T = {}
    for r in range(8):
        if r == 6:
            continue                         # ED70/ED71 are undocumented; added below
        T[0x40 + 8 * r] = ("in", f"{REG8[r]},(c)", 2)
        T[0x41 + 8 * r] = ("out", f"(c),{REG8[r]}", 2)
    for i, rp in enumerate(RP):
        T[0x42 + 0x10 * i] = ("sbc", f"hl,{rp}", 2)
        T[0x4A + 0x10 * i] = ("adc", f"hl,{rp}", 2)
        T[0x43 + 0x10 * i] = ("ld", f"({{a}}),{rp}", 4)
        T[0x4B + 0x10 * i] = ("ld", f"{rp},({{a}})", 4)
    for op in (0x44, 0x4C, 0x54, 0x5C, 0x64, 0x6C, 0x74, 0x7C):
        T[op] = ("neg", None, 2)
    for op in (0x45, 0x55, 0x5D, 0x65, 0x6D, 0x75, 0x7D):
        T[op] = ("retn", None, 2)
    T[0x4D] = ("reti", None, 2)
    T[0x70] = ("in", "f,(c)", 2)              # undocumented IN F,(C): reads the port, sets flags
    T[0x71] = ("out", "(c),0", 2)             # undocumented OUT (C),0: writes zero
    for op, im in ((0x46, "0"), (0x4E, "0"), (0x66, "0"), (0x6E, "0"),
                   (0x56, "1"), (0x76, "1"), (0x5E, "2"), (0x7E, "2")):
        T[op] = ("im", im, 2)
    T.update({
        0x47: ("ld", "i,a", 2), 0x4F: ("ld", "r,a", 2), 0x57: ("ld", "a,i", 2),
        0x5F: ("ld", "a,r", 2), 0x67: ("rrd", None, 2), 0x6F: ("rld", None, 2),
        0xA0: ("ldi", None, 2), 0xA1: ("cpi", None, 2), 0xA2: ("ini", None, 2),
        0xA3: ("outi", None, 2), 0xA8: ("ldd", None, 2), 0xA9: ("cpd", None, 2),
        0xAA: ("ind", None, 2), 0xAB: ("outd", None, 2), 0xB0: ("ldir", None, 2),
        0xB1: ("cpir", None, 2), 0xB2: ("inir", None, 2), 0xB3: ("otir", None, 2),
        0xB8: ("lddr", None, 2), 0xB9: ("cpdr", None, 2), 0xBA: ("indr", None, 2),
        0xBB: ("otdr", None, 2),
    })
    return T


BASE = _base()
CB = _cb()
ED = _ed()
IX = _index("ix")
IY = _index("iy")
IXCB = _cb_index("ix")
IYCB = _cb_index("iy")


# --- decoding ---------------------------------------------------------------
def decode(ram, a):
    """(mnemonic, operand template, nbytes) at `a`, or None for a byte that is not
    an opcode (or a prefix that changes nothing, which SkoolKit also leaves as data)."""
    op = ram[a]
    n = len(ram)
    if op == 0xCB:
        return CB[ram[a + 1]] if a + 1 < n else None
    if op == 0xED:
        return ED.get(ram[a + 1]) if a + 1 < n else None
    if op in (0xDD, 0xFD):
        if a + 1 >= n:
            return None
        b = ram[a + 1]
        if b == 0xCB:
            if a + 3 >= n:
                return None
            return (IXCB if op == 0xDD else IYCB)[ram[a + 3]]
        return (IX if op == 0xDD else IY).get(b)
    return BASE.get(op)


# --- operands ---------------------------------------------------------------
def operand(a, m, mode, bs, names, regs, chips):
    """(text, address) of the instruction's operand. The address is None where the
    word is not an address, and `names` gives the game's symbol for one. Spectrum I/O
    is port-mapped, so `regs` and `chips` never name anything here."""
    if mode is None:
        return None, None
    n = len(bs)
    word = bs[n - 2] | (bs[n - 1] << 8)
    target = None
    fields = {"n": f"${bs[n - 1]:02X}", "nn": f"${word:04X}"}
    if "{a}" in mode:
        fields["a"] = names.get(word) or f"${word:04X}"
        target = word
    if "{r}" in mode:
        off = bs[1] - 256 if bs[1] > 127 else bs[1]
        ta = (a + n + off) & 0xFFFF
        fields["r"] = names.get(ta) or f"${ta:04X}"
        target = ta
    if "{d}" in mode:
        off = bs[2] - 256 if bs[2] > 127 else bs[2]
        fields["d"] = f"+${off:02X}" if off >= 0 else f"-${-off:02X}"
    return mode.format(**fields), target


# --- text -------------------------------------------------------------------
def text_decode(kind, byte):
    """One byte of ZX Spectrum text. Codes $20-$7F are ASCII-1967 with three
    changes ($5E, $60, $7F); anything else is the machine's tokens or graphics,
    which a game's own table handles, so it shows as a dot here."""
    if kind != "ZX":
        sys.exit(f"kit/spectrum/z80.py: no text type {kind!r}")
    if byte == 0x0D:
        return "\n"
    if byte == 0x5E:
        return "^"
    if byte == 0x60:
        return "\u00a3"
    if byte == 0x7F:
        return "\u00a9"
    if 0x20 <= byte <= 0x7E:
        return chr(byte)
    return "."


TEXT_TYPES = ("ZX",)


if __name__ == "__main__":
    ram = bytearray(0x10000)
    for seq, want in (([0x00], ("nop", None, 1)),
                      ([0xDD, 0x21, 0x34, 0x12], ("ld", "ix,{nn}", 4)),
                      ([0xDD, 0xCB, 0xFE, 0x06], ("rlc", "(ix{d})", 4)),
                      ([0xDD, 0x66, 0x05], ("ld", "h,(ix{d})", 3)),
                      ([0xCB, 0xFF], ("set", "7,a", 2)),
                      ([0x76], ("halt", None, 1))):
        ram[0x8000:0x8000 + len(seq)] = seq
        got = decode(ram, 0x8000)
        assert got == want, (seq, got, want)
    ram[0x8000:0x8002] = [0xDD, 0x00]
    assert decode(ram, 0x8000) is None, "DD 00 changes nothing and stays data"
    text = "".join(text_decode("ZX", c) for c in (0x48, 0x49, 0x5E, 0x60, 0x7F, 0x01))
    assert text == "HI^\u00a3\u00a9.", text
    print(f"ok - z80.py self-check: {len(BASE)} base, {len(IX)} IX, {len(CB)} CB, "
          f"{len(ED)} ED opcodes; text {text!r}")
