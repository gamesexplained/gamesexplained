#!/usr/bin/env python3
"""The 6510's whole instruction set, and the undocumented opcodes in a game's code.

A disassembler that knows only the documented opcodes shows an undocumented
one as a data byte, may decode the bytes after it as instructions they are
not, and its cross-references miss whatever it touches. Protection code
relies on exactly that (kit/skills/c64/c64-reference, "Undocumented
opcodes"). This decodes with all 256 opcodes of the NMOS 6510, the table
checked against VICE's own disassembler.

Usage:
  opcodes.py <game dir> [<snapshot.vsf>] [--live]
      every undocumented opcode inside a code block, decoded, with what a
      decoder of the documented set makes of the same bytes; then every byte
      block that sits between two code blocks, decoded as code
  opcodes.py <game dir> [<snapshot.vsf>] [--live] --refs <address> [--reach N]
      every instruction in the code that can touch the address: by name, as
      a pointer, through an index of at most N (default 64), or through any
      index that carries it past $FFFF or round zero page
  opcodes.py --check
      compare the table with the running emulator's disassembler, all 256
      opcodes: size and addressing mode (needs `tools.py vice`; it writes
      1 KB at $C000, so not during a game you mean to keep)

The bytes come from the snapshot when one is given, otherwise from the
game's listing.json. The blocks come from symbols.json, or with --live from
the running disassembler. Operands the game writes at run time are read as
the image holds them.

The documented set is listing.py's table; this adds the other 105.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
from listing import OPS, LEN, VSF_RAM_OFFSET   # the documented set, as the Source tab has it  # noqa: E402

UNDOC = {}        # opcode: (mnemonic, mode), with VICE's names
for base, name in ((0x00, "slo"), (0x20, "rla"), (0x40, "sre"), (0x60, "rra"),
                   (0xC0, "dcp"), (0xE0, "isb")):      # read-modify-write, then an ALU operation
    for off, mode in ((0x07, "zp"), (0x17, "zpx"), (0x0F, "abs"), (0x1F, "abx"),
                      (0x1B, "aby"), (0x03, "izx"), (0x13, "izy")):
        UNDOC[base + off] = (name, mode)
UNDOC.update({0x87: ("sax", "zp"), 0x97: ("sax", "zpy"), 0x8F: ("sax", "abs"), 0x83: ("sax", "izx"),
              0xA7: ("lax", "zp"), 0xB7: ("lax", "zpy"), 0xAF: ("lax", "abs"), 0xBF: ("lax", "aby"),
              0xA3: ("lax", "izx"), 0xB3: ("lax", "izy"),
              0x0B: ("anc", "imm"), 0x2B: ("anc", "imm"), 0x4B: ("asr", "imm"), 0x6B: ("arr", "imm"),
              0x8B: ("ane", "imm"), 0xAB: ("lxa", "imm"), 0xCB: ("sbx", "imm"), 0xEB: ("usbc", "imm"),
              0xBB: ("las", "aby"), 0x9B: ("shs", "aby"), 0x9F: ("sha", "aby"), 0x93: ("sha", "izy"),
              0x9E: ("shx", "aby"), 0x9C: ("shy", "abx")})
for op in (0x1A, 0x3A, 0x5A, 0x7A, 0xDA, 0xFA):
    UNDOC[op] = ("noop", "imp")                        # the undocumented no-ops, some of which read memory
for op, mode in ((0x80, "imm"), (0x82, "imm"), (0x89, "imm"), (0xC2, "imm"), (0xE2, "imm"),
                 (0x04, "zp"), (0x44, "zp"), (0x64, "zp"), (0x0C, "abs")):
    UNDOC[op] = ("noop", mode)
for op in (0x14, 0x34, 0x54, 0x74, 0xD4, 0xF4):
    UNDOC[op] = ("noop", "zpx")
for op in (0x1C, 0x3C, 0x5C, 0x7C, 0xDC, 0xFC):
    UNDOC[op] = ("noop", "abx")
for op in (0x02, 0x12, 0x22, 0x32, 0x42, 0x52, 0x62, 0x72, 0x92, 0xB2, 0xD2, 0xF2):
    UNDOC[op] = ("jam", "imp")                         # halts the processor
assert len(UNDOC) == 105 and not set(UNDOC) & set(OPS)
ALL = {**OPS, **UNDOC}     # sizes and modes match VICE's disassembler for all 256; the names are VICE's

# what an instruction does to the memory its operand names
WRITE = {"sta", "stx", "sty", "sax", "shs", "sha", "shx", "shy"}
RMW = {"asl", "rol", "lsr", "ror", "inc", "dec", "slo", "rla", "sre", "rra", "dcp", "isb"}
JUMP = {"jmp", "jsr"}


def decode(ram, a, table=ALL):
    """(mnemonic, mode, bytes) of the instruction at a, or None for an opcode not in table."""
    op = ram[a]
    if op not in table:
        return None
    m, mode = table[op]
    return m, mode, [ram[(a + i) & 0xFFFF] for i in range(LEN[mode])]


def operand(a, mode, bs):
    """The address the operand names (the base, for an indexed mode), or None."""
    if mode in ("zp", "zpx", "zpy", "izx", "izy"):
        return bs[1]
    if mode in ("abs", "abx", "aby", "ind"):
        return bs[1] | bs[2] << 8
    if mode == "rel":
        return (a + 2 + (bs[1] - 256 if bs[1] > 127 else bs[1])) & 0xFFFF
    return None


def text(a, m, mode, bs):
    if mode == "imp":
        return m
    if mode == "acc":
        return m + " a"
    if mode == "imm":
        return f"{m} #${bs[1]:02X}"
    v = operand(a, mode, bs)
    return m + " " + {"zp": "${:02X}", "zpx": "${:02X},x", "zpy": "${:02X},y", "izx": "(${:02X},x)",
                      "izy": "(${:02X}),y", "abs": "${:04X}", "abx": "${:04X},x", "aby": "${:04X},y",
                      "ind": "(${:04X})", "rel": "${:04X}"}[mode].format(v)


def wrap_note(mode, base):
    """Where an indexed operand leaves its page of the address space."""
    if mode in ("abx", "aby") and base > 0xFF00:
        r = "x" if mode == "abx" else "y"
        return f"wraps past $FFFF into zero page when {r.upper()} >= ${0x10000 - base:02X}"
    return ""


# --- the game's bytes and blocks --------------------------------------------
def image(gdir, vsf=None):
    """The 64 KB image and a mask of the bytes that are the game's: a snapshot's RAM, or
    listing.json's bytes, less what game.json and the platform exclude (the tracer follows
    calls into ROM through the RAM underneath, and that RAM is not the game's)."""
    if vsf:
        ram = open(vsf, "rb").read()[VSF_RAM_OFFSET:VSF_RAM_OFFSET + 0x10000]
        assert len(ram) == 0x10000, "snapshot too short"
        ram, known = bytearray(ram), bytearray(b"\x01" * 0x10000)
    else:
        ram, known = bytearray(0x10000), bytearray(0x10000)
        for r in json.load(open(os.path.join(gdir, "listing.json")))["records"]:
            for i, b in enumerate(r.get("b", [])):
                ram[r["a"] + i] = b; known[r["a"] + i] = 1
    from symbols_export import regions
    for lo, hi, _ in regions(json.load(open(os.path.join(gdir, "game.json"))))["exclude"]:
        known[lo:hi + 1] = bytes(hi + 1 - lo)
    return ram, known


def blocks_of(gdir, live):
    if live:
        from symbols_export import from_live
        blocks, syms, _ = from_live("c64")
    else:
        s = json.load(open(os.path.join(gdir, "symbols.json")))
        blocks, syms = s["blocks"], s["symbols"]
    names = {}
    for s in syms:
        names.setdefault(s["address"], s["name"])
    return sorted(blocks, key=lambda b: b["start"]), names


def walk(ram, known, lo, hi, table=ALL):
    """Decode lo..hi in order; yields (address, decoded or None)."""
    a = lo
    while a <= hi:
        if not known[a]:
            yield a, None; a += 1; continue
        d = decode(ram, a, table)
        yield a, d
        a += LEN[d[1]] if d else 1


def row(a, d, note=""):
    m, mode, bs = d
    return f"  ${a:04X}  {' '.join('%02X' % v for v in bs):9} {text(a, m, mode, bs):18} {note}".rstrip()


END = {"rts", "rti", "jmp", "brk", "jam"}       # instructions that never fall through to the next
ALWAYS = [{"bcc", "bcs"}, {"beq", "bne"}, {"bmi", "bpl"}, {"bvc", "bvs"}]   # a pair that always branches


def sandwiched(blocks, ram, known, most=32):
    """Spots typed as data inside code. A short byte block between two code blocks counts
    when the code runs into it (the block before falls through, or an instruction branches
    or jumps into it) and it decodes, with the whole table, to instructions that include an
    undocumented one and end where the next code block starts. A branch to the first address
    after the block, just before it, is the code stepping over a table, not falling into it."""
    code = [b for b in blocks if b["type"] == "Code"]
    starts, ends = {b["start"]: b for b in code}, {b["end"] + 1: b for b in code}
    targets = set()
    for b in code:
        for a, d in walk(ram, known, b["start"], b["end"]):
            if d and (d[1] == "rel" or d[0] in ("jmp", "jsr") and d[1] == "abs"):
                targets.add(operand(a, d[1], d[2]))
    found = []
    for b in blocks:
        if b["type"] != "Byte" or b["start"] not in ends or b["end"] + 1 not in starts \
                or b["end"] - b["start"] >= most or not all(known[x] for x in range(b["start"], b["end"] + 1)):
            continue
        before = list(walk(ram, known, ends[b["start"]]["start"], b["start"] - 1))
        last_a, last = before[-1] if before else (None, None)
        pair = {before[-2][1][0], last[0]} if len(before) > 1 and before[-2][1] and last else set()
        falls = last is not None and last[0] not in END and pair not in ALWAYS and \
            not (last[1] == "rel" and operand(last_a, "rel", last[2]) == b["end"] + 1)
        entered = falls or any(b["start"] <= t <= b["end"] for t in targets)
        seq = list(walk(ram, known, b["start"], b["end"]))
        last_a, last = seq[-1]
        if entered and all(d for _, d in seq) and last_a + LEN[last[1]] == b["end"] + 1 \
                and any(ram[a] in UNDOC for a, _ in seq):
            found.append(b)
    return found


def undocumented(ram, known, blocks, names):
    inside = []
    for b in (b for b in blocks if b["type"] == "Code"):
        legal = dict(walk(ram, known, b["start"], b["end"], OPS))
        for a, d in walk(ram, known, b["start"], b["end"]):
            if d is None or ram[a] not in UNDOC:
                continue
            shown, x = [], a                    # what a decoder of the documented set makes of these bytes
            while x < a + len(d[2]) and x in legal:
                ld = legal[x]
                shown.append(f".byte ${ram[x]:02X}" if ld is None else text(x, *ld))
                x += LEN[ld[1]] if ld else 1
            note = wrap_note(d[1], operand(a, d[1], d[2]) or 0)
            inside.append(row(a, d, "shown as " + (" / ".join(shown) or "part of the instruction before it")
                                    + (f"; {note}" if note else "")))
    lines = ["undocumented opcodes inside code blocks:"] + inside if inside else []
    between = []
    for b in sandwiched(blocks, ram, known):
        name = names.get(b["start"])
        between.append(f"  ${b['start']:04X}-${b['end']:04X}  a {b['type'].lower()} block"
                       + (f", {name}" if name else "") + ":")
        for a, d in walk(ram, known, b["start"], b["end"]):
            if d is None:
                between.append(f"    ${a:04X}  {ram[a]:02X}"); continue
            notes = (["undocumented"] if ram[a] in UNDOC else []) + \
                    [n for n in [wrap_note(d[1], operand(a, d[1], d[2]) or 0)] if n]
            between.append("  " + row(a, d, "; ".join(notes)))
    if between:
        lines += ([""] if lines else []) + ["blocks between two code blocks, decoded as code:"] + between
    return lines


def refs(ram, known, blocks, target, reach):
    """Every instruction that can touch target, in the code blocks and the blocks between them.
    Returns the lines, nearest first, and the number of indexed ones beyond reach."""
    spans = [(b["start"], b["end"], "") for b in blocks if b["type"] == "Code"] + \
            [(b["start"], b["end"], "; in a data block between code blocks") for b in sandwiched(blocks, ram, known)]
    found, beyond = [], 0
    for lo, hi, where in sorted(spans):
        for a, d in walk(ram, known, lo, hi):
            if d is None or d[1] in ("imp", "acc", "imm"):
                continue
            m, mode, bs = d
            v, how, rank = operand(a, mode, bs), None, 0
            if mode in ("zp", "abs") and v == target:
                how = "names it"
            elif mode == "rel" and v == target:
                how = "branches to it"
            elif mode == "ind" and target in (v, (v & 0xFF00) | ((v + 1) & 0xFF)):
                how, rank = "takes its jump address from there", 1
            elif mode in ("izx", "izy") and target in (v, (v + 1) & 0xFF):
                how, rank = "takes its pointer from there", 1
            elif mode in ("abx", "aby", "zpx", "zpy"):
                size = 0x100 if mode in ("zpx", "zpy") else 0x10000
                i = (target - v) % size
                if target < size and i <= 0xFF:
                    r = mode[-1].upper()
                    if size == 0x10000 and v + i >= size:      # rare in plain code, and a known disguise
                        how, rank = f"with {r} = ${i:02X}, wrapping past $FFFF", 2
                    elif i <= reach:
                        how, rank = f"with {r} = ${i:02X}" + (", wrapping round zero page" if v + i >= size else ""), 3 + i
                    else:
                        beyond += 1
            if how is None:
                continue
            kind = "jump" if m in JUMP else "write" if m in WRITE else \
                   "read-modify-write" if m in RMW else "read (a no-op that reads)" if m == "noop" else "read"
            found.append((rank, a, row(a, d, f"{kind}, {how}" + ("; undocumented" if ram[a] in UNDOC else "") + where)))
    return [line for _, _, line in sorted(found)], beyond


def check():
    """The table against VICE's monitor, which decodes every opcode: the same size and mode?"""
    import re
    sys.path.insert(0, HERE)
    from vice import connect, call, poke
    rpc = connect()
    call(rpc, "vice_execution_pause", {})
    poke(rpc, 0xC000, [x for op in range(256) for x in (op, 0x34, 0x12, 0xEA)])
    forms = [("imp", r""), ("acc", r"A"), ("imm", r"#\$..") , ("izx", r"\(\$..,X\)"), ("izy", r"\(\$..\),Y"),
             ("ind", r"\(\$....\)"), ("zpx", r"\$..,X"), ("zpy", r"\$..,Y"), ("abx", r"\$....,X"),
             ("aby", r"\$....,Y"), ("zp", r"\$.."), ("abs", r"\$....")]
    bad = 0
    for op in range(256):
        line = json.loads(call(rpc, "vice_disassemble", {"address": f"${0xC000 + 4 * op:04X}", "count": 1,
                                                           "show_symbols": False}))["lines"][0]
        ins = re.sub(r"^([0-9A-F]{2} )+\s*", "", line["instruction"]).strip().split(None, 1)
        mode = next(m for m, f in forms if re.fullmatch(f, ins[1] if len(ins) > 1 else ""))
        m, mine = ALL[op]
        if line["size"] != LEN[mine] or mode != ("abs" if mine == "rel" else mine) or ins[0].lower() != m:
            bad += 1
            print(f"  ${op:02X}: the emulator says {' '.join(ins)} ({line['size']} bytes); the table {m} {mine}")
    print(f"{256 - bad} of 256 opcodes agree with the emulator's disassembler: name, size and mode")
    return bad


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--check":
        sys.exit(1 if check() else 0)
    gdir = argv[0]
    vsf = argv[1] if len(argv) > 1 and argv[1].endswith(".vsf") else None
    ram, known = image(gdir, vsf)
    blocks, names = blocks_of(gdir, "--live" in argv)
    source = f"bytes from {'the snapshot' if vsf else 'listing.json'}, blocks from " + \
             ("the running disassembler" if "--live" in argv else "symbols.json")
    if "--refs" in argv:
        target = int(argv[argv.index("--refs") + 1].lstrip("$"), 16)
        reach = int(argv[argv.index("--reach") + 1]) if "--reach" in argv else 64
        found, beyond = refs(ram, known, blocks, target, reach)
        print(f"instructions that can touch ${target:04X} ({source}):")
        print("\n".join(found) if found else "  none")
        if beyond:
            print(f"  and {beyond} more through an index above {reach}: --reach 255 lists them")
        return
    lines = undocumented(ram, known, blocks, names)
    print(f"({source})")
    print("\n".join(lines) if lines else "no undocumented opcodes in the code blocks, and no data blocks between them")


if __name__ == "__main__":
    main()
