#!/usr/bin/env python3
"""Build listing.json, the data behind the Source tab, from symbols.json
and the contributor's own snapshot.

Our own 6502 decoder, so the listing depends on no disassembler. Emits one
record per instruction or data item for every byte the ledger counts as
the game (code blocks, typed data blocks, symbol-owned spans), and a gap
record for each skipped run. Labels, comments and block types come from
symbols.json; the bytes come from the snapshot; cross-references are
computed here.

Usage:
  listing.py <game dir> <snapshot.vsf>

Record fields (short, the file is large):
  a  address            t  kind: code | byte | word | addr | lohi | text | gap | note
  b  bytes              m  mnemonic (code)         o  operand text, symbolic
  oa operand address    l  label at this address   c  line comment
  s  side comment       x  addresses that reference this one
  d  decoded text (text records) / value list (word, addr)
"""
import hashlib, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledger import compute

VSF_RAM_OFFSET = 209

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


def main():
    argv = sys.argv[1:]
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir, vsf = argv[0], argv[1]
    game = json.load(open(os.path.join(gdir, "game.json")))
    spath = os.path.join(gdir, "symbols.json")
    sym = json.load(open(spath))
    ram = open(vsf, "rb").read()[VSF_RAM_OFFSET:VSF_RAM_OFFSET + 0x10000]
    assert len(ram) == 0x10000, "snapshot too short"

    from symbols_export import regions
    reg = regions(game)
    L = compute(sym["blocks"], sym["symbols"], sym["comments"], reg)
    state, code = L["state"], L["code"]

    names = {}
    for s in sym["symbols"]:
        names.setdefault(s["address"], s["name"])     # first name wins
    line = {c["address"]: c["text"] for c in sym["comments"] if c["type"] == "line"}
    side = {c["address"]: c["text"] for c in sym["comments"] if c["type"] == "side"}
    btype = bytearray(0x10000)
    TYPES = ["Undefined", "Code", "Byte", "Word", "Address", "PETSCII", "Screencode",
             "Lo/Hi Address", "Hi/Lo Address", "Lo/Hi Word", "Hi/Lo Word", "External File"]
    for b in sym["blocks"]:
        t = TYPES.index(b["type"]) if b["type"] in TYPES else 0
        for a in range(b["start"], b["end"] + 1):
            btype[a] = t

    def sym_or_hex(a, width=4):
        return names.get(a) or (f"${a:04X}" if width == 4 else f"${a:02X}")

    xrefs = {}
    def xref(target, src):
        xrefs.setdefault(target, []).append(src)

    records = []
    a = 0
    while a < 0x10000:
        if state[a] == 0:
            g = a
            while a < 0x10000 and state[a] == 0:
                a += 1
            records.append({"a": g, "t": "gap", "n": a - g})
            continue
        rec = {"a": a}
        if a in names: rec["l"] = names[a]
        if a in line: rec["c"] = line[a]
        if a in side: rec["s"] = side[a]
        t = TYPES[btype[a]]
        if code[a]:
            op = ram[a]
            if op in OPS:
                m, mode = OPS[op]
                n = LEN[mode]
                bs = list(ram[a:a + n])
                rec.update({"t": "code", "b": bs, "m": m})
                if mode == "imm":
                    rec["o"] = f"#${bs[1]:02X}"
                elif mode == "acc":
                    rec["o"] = "a"
                elif mode in ("zp", "zpx", "zpy", "izx", "izy"):
                    ta = bs[1]; rec["oa"] = ta; xref(ta, a)
                    s = sym_or_hex(ta, 2)
                    rec["o"] = {"zp": s, "zpx": s + ",x", "zpy": s + ",y", "izx": f"({s},x)", "izy": f"({s}),y"}[mode]
                elif mode in ("abs", "abx", "aby", "ind"):
                    ta = bs[1] | (bs[2] << 8); rec["oa"] = ta; xref(ta, a)
                    s = sym_or_hex(ta)
                    rec["o"] = {"abs": s, "abx": s + ",x", "aby": s + ",y", "ind": f"({s})"}[mode]
                elif mode == "rel":
                    ta = (a + 2 + (bs[1] - 256 if bs[1] > 127 else bs[1])) & 0xFFFF
                    rec["oa"] = ta; xref(ta, a); rec["o"] = sym_or_hex(ta)
                records.append(rec); a += n
            else:
                rec.update({"t": "byte", "b": [op], "note": "not a legal opcode"})
                records.append(rec); a += 1
            continue
        # data: an item never crosses a labelled address, a comment, a block edge or a state edge
        def run_end(limit):
            e = a + 1
            while e < 0x10000 and e < a + limit and state[e] and btype[e] == btype[a] \
                    and e not in names and e not in line and e not in side:
                e += 1
            return e
        if t in ("Word", "Lo/Hi Word", "Hi/Lo Word"):
            e = run_end(8); bs = list(ram[a:e])
            vals = [bs[i] | (bs[i + 1] << 8) for i in range(0, len(bs) - 1, 2)] if t != "Hi/Lo Word" else \
                   [(bs[i] << 8) | bs[i + 1] for i in range(0, len(bs) - 1, 2)]
            rec.update({"t": "word", "b": bs, "d": vals})
        elif t == "Address":
            e = min(run_end(2), a + 2); bs = list(ram[a:e])
            if len(bs) == 2:
                ta = bs[0] | (bs[1] << 8); xref(ta, a)
                rec.update({"t": "addr", "b": bs, "oa": ta, "o": sym_or_hex(ta)})
            else:
                rec.update({"t": "byte", "b": bs})
        elif t in ("Lo/Hi Address", "Hi/Lo Address"):
            # a split table: emit the byte rows, and a note with the resolved targets at the block start
            e = run_end(8); bs = list(ram[a:e])
            rec.update({"t": "byte", "b": bs})
            blk = next(b for b in sym["blocks"] if b["start"] <= a <= b["end"])
            if a == blk["start"]:
                n = (blk["end"] - blk["start"] + 1) // 2
                lo, hi = (blk["start"], blk["start"] + n) if t == "Lo/Hi Address" else (blk["start"] + n, blk["start"])
                targets = [ram[lo + i] | (ram[hi + i] << 8) for i in range(n)]
                for i, ta in enumerate(targets):
                    xref(ta, lo + i)
                rec["d"] = [sym_or_hex(x) for x in targets]
                rec["note"] = f"split table: {n} {'lo/hi' if t == 'Lo/Hi Address' else 'hi/lo'} pointers"
        elif t in ("PETSCII", "Screencode"):
            e = run_end(32); bs = list(ram[a:e])
            f = petscii if t == "PETSCII" else screencode
            rec.update({"t": "text", "b": bs, "d": "".join(f(c) for c in bs), "enc": t.lower()})
        else:
            e = run_end(8); bs = list(ram[a:e])
            rec.update({"t": "byte", "b": bs})
        records.append(rec); a = e

    # labels and comments whose address starts no record still have to appear:
    # inside an instruction (an operand that is also a table base), or on an
    # address outside the tracked image (screen RAM, a ROM entry point).
    starts = {r["a"]: r for r in records if r["t"] != "gap"}
    orphans = []
    wanted = {s["address"] for s in sym["symbols"] if s.get("kind") == "user"} | set(line)
    for ad in sorted(wanted):
        if ad in starts:
            continue
        rec = {"a": ad, "t": "note"}
        if ad in names: rec["l"] = names[ad]
        if ad in line: rec["c"] = line[ad]
        if ad in side: rec["s"] = side[ad]
        if state[ad]:
            host = max(r["a"] for r in records if r["t"] != "gap" and r["a"] < ad)
            rec["note"] = f"inside the item at ${host:04X}"
        else:
            rec["note"] = "outside the tracked image"
        orphans.append(rec)
    records = sorted(records + orphans, key=lambda r: (r["a"], r["t"] == "note"))
    for r in records:
        if r["a"] in xrefs:
            r["x"] = sorted(set(xrefs[r["a"]]))
    # left-pane index: every labelled address that owns a span, with a kind
    owner = L["owner"]
    index = []
    for s in sorted(sym["symbols"], key=lambda s: s["address"]):
        ad = s["address"]
        if names.get(ad) != s["name"] or state[ad] == 0:
            continue
        span = 1
        while ad + span < 0x10000 and owner.get(ad + span, (None, None))[1] == ad:
            span += 1
        if code[ad]:
            kind = "routine" if s["type"] in ("Subroutine", "UserDefined") or ad in line else "branch"
        elif TYPES[btype[ad]] in ("PETSCII", "Screencode"):
            kind = "string"
        elif span <= 2 and ad < 0x0400:
            kind = "variable"
        elif span <= 2:
            kind = "variable"
        else:
            kind = "table"
        index.append({"a": ad, "n": s["name"], "k": kind, "len": span, "c": ad in line})

    out = {
        "schema": 1, "platform": game.get("platform"), "game": game.get("slug"),
        "title": game.get("title"), "build": game.get("build"),
        "symbols_sha256": hashlib.sha256(open(spath, "rb").read()).hexdigest(),
        "index": index, "records": records,
    }
    path = os.path.join(gdir, "listing.json")
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    kinds = {}
    for i in index: kinds[i["k"]] = kinds.get(i["k"], 0) + 1
    print(f"wrote {path}: {len(records)} records, {sum(1 for r in records if r['t']=='code')} instructions, "
          f"index {kinds}, {os.path.getsize(path)//1024} KB")


if __name__ == "__main__":
    main()
