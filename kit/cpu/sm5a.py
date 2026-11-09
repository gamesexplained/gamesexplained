#!/usr/bin/env python3
"""The Sharp SM5A, the 4-bit microcontroller in the early Game & Watch: its opcode table,
the order its program counter runs in, and the listing's view of both.

    from sm5a import decode, operand, ROM_SIZE, logical, physical

The machine's facts are in kit/skills/gnw/gnw-reference; this follows MAME 0.289's SM5A
(src/devices/cpu/sm510/sm5a.cpp, sm500.cpp, sm500op.cpp, sm510op.cpp) and its disassembler
(sm510d.cpp), whose mnemonics and operand text it copies, so that a line of the listing reads
as MAME's debugger shows it. kit/gnw/test_sm5a.py holds it to MAME's own disassembly.

The program counter is 11 bits: CB (1 bit), the page PM (4 bits) and the step PL (6 bits).
PL does not count up. It is a shift register that steps through 63 values in a fixed order
(0, $20, $30, $38, ...) and never leaves its page: after the 63rd it is back at 0. So the kit
keeps the program in the order the chip runs it, a "logical" address per byte, page * 64 +
the step's place in that order; `physical` gives the byte's place in the ROM, `logical` the
reverse. The snapshot holds the ROM in logical order (kit/gnw/snapshot.py), so the listing
reads each page top to bottom as the chip runs it. Step $3F, the 64th byte of a page, is
never reached by counting: it is logical place 63 and physical $3F alike.

The data memory is 4-bit cells at data addresses $00-$7F (BM, 3 bits, and BL, 4 bits). The
snapshot puts cell n at RAM_BASE + n, one byte each, so that an operand that sets B can name
the cell it points at.
"""

ROM_SIZE = 0x740          # 29 pages of 64 bytes; $740-$7FF repeat page $1C
PAGE = 0x40
RAM_BASE = 0x1000         # where the snapshot's flat image keeps data cell 0
RAM_CELLS = 0x80          # data addresses $00-$7F, mirrors included (gnw-reference, "The data memory")
SUB_PAGE = 0x10           # TRS without SSR calls into page $10, the ROM's $400-$43F


def _step(pl):
    """The next value of a 6-bit PL: shift right, feeding in 1 when bits 0 and 1 are equal."""
    feed = 0 if (pl >> 1 ^ pl) & 1 else 0x20
    return feed | (pl >> 1 & 0x1F)


L2R = [0] * 64            # logical place in a page -> PL
R2L = [0] * 64            # PL -> logical place
_pl = 0
for _i in range(63):
    L2R[_i] = _pl
    R2L[_pl] = _i
    _pl = _step(_pl)
L2R[63] = R2L[63] = 0x3F


def physical(a):
    """A logical address -> the ROM offset of its byte (page and PL)."""
    return (a & ~0x3F) | L2R[a & 0x3F]


def logical(pc):
    """A program counter (CB, page, PL) -> its logical address."""
    if pc >= ROM_SIZE:
        pc = 0x700 | (pc & 0x3F)
    return (pc & ~0x3F) | R2L[pc & 0x3F]


def reorder(rom):
    """The ROM in logical order: byte at logical address a = rom[physical(a)]."""
    return bytes(rom[physical(a)] for a in range(ROM_SIZE))


# ---- the opcode table: MAME's sm5a_mnemonic, with the operand kind of each -------------------
# kind: None (no operand), "b2" (2-bit operand), "n4" (4-bit), "lb" (LB's 4 bits), "t6" (TR),
# "c6" (TRS), "ssr" (SSR's 4 bits), "lbl" (a second byte, a data address), "ext" (5E, a second
# byte naming the instruction)
_T = {}
for _o, _m in ((0x00, "SKIP"), (0x01, "ATR"), (0x02, "SBM"), (0x03, "ATBP"), (0x08, "ADD"), (0x09, "ADDC"),
               (0x0A, "COMA"), (0x0B, "EXBLA"),
               (0x50, "TA"), (0x51, "TB"), (0x52, "TC"), (0x53, "TAM"), (0x58, "TG"), (0x59, "PTW"),
               (0x5A, "TA0"), (0x5B, "TABL"), (0x5C, "TW"), (0x5D, "DTW"),
               (0x60, "COMCN"), (0x61, "PDTW"), (0x62, "WR"), (0x63, "WS"), (0x64, "INCB"), (0x65, "IDIV"),
               (0x66, "RC"), (0x67, "SC"), (0x68, "RMF"), (0x69, "SMF"), (0x6A, "KTA"), (0x6B, "RBM"),
               (0x6C, "DECB"), (0x6D, "COMCB"), (0x6E, "RTN"), (0x6F, "RTNS")):
    _T[_o] = (_m, None)
for _b, _m in ((0x04, "RM"), (0x0C, "SM"), (0x10, "EXC"), (0x14, "EXCI"), (0x18, "LDA"), (0x1C, "EXCD"),
               (0x54, "TM")):
    for _i in range(4):
        _T[_b + _i] = (_m, "b2")
for _i in range(16):
    _T[0x20 + _i] = ("LAX", "n4")
    _T[0x30 + _i] = ("ADX", "n4")
    _T[0x40 + _i] = ("LB", "lb")
    _T[0x70 + _i] = ("SSR", "ssr")
for _i in range(0x40):
    _T[0x80 + _i] = ("TR", "t6")
    _T[0xC0 + _i] = ("TRS", "c6")
_T[0x5E] = ("EXT", "ext")
_T[0x5F] = ("LBL", "lbl")
EXTENDED = {0x00: "CEND", 0x04: "DTA"}

# what each instruction does, in a few words, for the listing's reader (gnw-reference has the detail)
WHAT = {
    "SKIP": "no operation", "ATR": "R pins (the buzzer) = A", "SBM": "set B's top bit (BM bit 2)",
    "ATBP": "BP (LCD on, digit row) = A", "ADD": "A += M", "ADDC": "A += M + C, skip on carry",
    "COMA": "A = ~A", "EXBLA": "swap A and BL", "TA": "skip if the alpha input is high",
    "TB": "skip if the beta input is high", "TC": "skip if C is clear", "TAM": "skip if A = M",
    "TG": "skip if the 1 Hz flag (gamma) is clear, then clear it", "PTW": "copy the last two W' latches to W",
    "TA0": "skip if A = 0", "TABL": "skip if A = BL", "TW": "copy W' to W, the LCD's segments",
    "DTW": "shift a digit's segments into W'", "COMCN": "flip the digit row (BP bit 3)",
    "PDTW": "shift a digit into the last two W' latches", "WR": "shift A into W', bit 3 clear",
    "WS": "shift A into W', bit 3 set", "INCB": "BL += 1, skip when it reaches 8",
    "IDIV": "reset the divider's low 9 bits", "RC": "C = 0", "SC": "C = 1", "RMF": "m' = 0, A = 0",
    "SMF": "m' = 1", "KTA": "A = the K inputs (the buttons the R pins select)", "RBM": "clear B's top bit",
    "DECB": "BL -= 1, skip when it wraps from 0", "COMCB": "flip CB, the half of the ROM a jump goes to",
    "RTN": "return", "RTNS": "return and skip", "RM": "clear a bit of M", "SM": "set a bit of M",
    "EXC": "swap A and M, BM ^= n", "EXCI": "swap A and M, BM ^= n, BL += 1, skip past 15",
    "LDA": "A = M, BM ^= n", "EXCD": "swap A and M, BM ^= n, BL -= 1, skip past 0", "TM": "skip if bit n of M is set",
    "LAX": "A = n (a run of LAX loads only the first)", "ADX": "A += n, skip on carry", "LB": "B = a cell",
    "SSR": "page for the next TR, or a long TRS", "TR": "jump", "TRS": "call", "LBL": "B = a cell",
    "CEND": "stop the clock until a button or the 1 Hz flag", "DTA": "A = the divider's bits 11-14",
}


def decode(ram, a):
    """(mnemonic, mode, nbytes) for the instruction at logical address a, or None. The mode
    carries what the operand needs: the kind, and for TR and TRS the page an SSR just before
    names, if one does (the byte at a - 1; at the top of a page, none is looked at)."""
    if a >= ROM_SIZE:
        return None
    op = ram[a]
    m, kind = _T[op]
    if kind in ("lbl", "ext"):
        if (a & 0x3F) == 0x3E or (a & 0x3F) == 0x3F:
            return None   # its second byte would be past the 63 steps of the page
        if kind == "ext":
            m = EXTENDED.get(ram[a + 1])
            if m is None:
                return None
        return (m, kind, 2)
    if kind in ("t6", "c6") and (a & 0x3F) and _T[ram[a - 1]][1] == "ssr":
        kind += ":" + str(ram[a - 1] & 0x0F)
    return (m, kind, 1)


def _num(v):
    return "%d" % v if v < 10 else "$%X" % v


def target(a, mode, op):
    """The logical address a TR or TRS at logical address a goes to, as the listing shows it:
    TR stays on its page, or goes to the page an SSR just before named; TRS calls page $10, or
    with SSR before it that page (gnw-reference, "Jumps and calls")."""
    kind, _, ssr = mode.partition(":")
    pl = op & 0x3F
    cb = a >> 10 & 1
    if kind == "t6":
        page = (a >> 6) if not ssr else (cb << 4 | int(ssr))
    else:
        page = SUB_PAGE if not ssr else (cb << 4 | int(ssr))
    pc = page << 6 | pl
    return logical(pc) if pc < 0x800 else None


def operand(a, m, mode, bs, names, regs=None, chips=None):
    """(text, target) for the listing: the operand as MAME writes it, a name where a label is
    on the target, and the target's address (logical, or RAM_BASE + cell) for the cross
    references."""
    names = names or {}
    op = bs[0]
    if mode is None:
        return None, None
    kind = mode.split(":")[0]
    if kind == "b2":
        return "%d" % (op & 3), None
    if kind in ("n4", "ssr"):
        return _num(op & 0x0F), None
    if kind == "lb":
        bm, bl = op & 3, (op >> 2 & 3) | (8 if op & 0x0C else 0)
        cell = RAM_BASE + (bm << 4 | bl)
        return names.get(cell) or _num(op & 0x0F), cell
    if kind == "lbl":
        cell = RAM_BASE + (bs[1] & 0x7F)
        return names.get(cell) or "$%02X" % bs[1], cell
    if kind == "ext":
        return None, None
    t = target(a, mode, op)
    text = "$%02X" % (op & 0x3F)
    if t is not None and t in names:
        text = names[t]
    return text, t


def text(ram, a):
    """One line, MAME's way: the mnemonic padded to 8 and its operand."""
    d = decode(ram, a)
    if not d:
        return "?"
    m, mode, n = d
    o, _ = operand(a, m, mode, list(ram[a:a + n]), {})
    return ("%-8s" % m + (o or "")).rstrip()


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__.split("\n\n")[0] + "\n\n    python3 kit/cpu/sm5a.py <rom>   prints the ROM in the order it runs")
        sys.exit(0 if len(sys.argv) == 2 else 2)
    rom = open(sys.argv[1], "rb").read()
    img = reorder(rom)
    a = 0
    while a < ROM_SIZE:
        pc = physical(a)
        d = decode(img, a)
        n = d[2] if d else 1
        print("%d:%X:%02X: %-6s %s" % (pc >> 10, pc >> 6 & 0xF, pc & 0x3F, " ".join("%02X" % b for b in img[a:a + n]), text(img, a)))
        a += n
