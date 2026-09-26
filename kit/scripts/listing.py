#!/usr/bin/env python3
"""Build listing.json, the data behind the Source tab, from symbols.json
and the contributor's own snapshot.

Our own 6502 decoder, so the listing depends on no disassembler. Emits one
record per instruction or data item for every byte the ledger counts as
the game (code blocks, typed data blocks, symbol-owned spans), and a gap
record for each skipped run. Labels, comments and block types come from
symbols.json; the bytes come from the snapshot; cross-references are
computed here.

Then it lists the data the ledger does not count. RAM that a default
exclusion covers but a game can still use (on the C64, the RAM under the
I/O area) is named whenever it holds data and game.json has not said what
it is. With the hand-over snapshot, so is every stretch of loaded data,
the same bytes at the hand-over and in play, that the ledger neither
tracks nor has been told to leave out: the tail of a table longer than
its symbol's reach, a table no symbol starts, a picture nothing refers to
by address.

An address the chips share with RAM (the platform's "hidden" ranges: on
the C64, $D000-$DFFF) has two meanings, and an instruction's operand there
takes the one the instruction sees. Code located in that range runs with
the chips banked out, so it sees the RAM and gets the game's symbols; all
other code sees the chips, and gets the register's name from
kit/<platform>/registers.py, or the bare address where there is none. A
jump or a call always gets the code's symbol. game.json overrides the rule
for code that banks the chips out itself, over the instructions' own
addresses, the last row that holds the instruction deciding:

  "io": [["$B275", "$B2F0", "ram", "the I/O area is banked out from $B273 to $B2F1"]]

with "registers" for code under the I/O area that banks the chips in.

Usage:
  listing.py <game dir> <snapshot.vsf> [--entry <hand-over.vsf>]
                         the hand-over defaults to the game's work/entry.vsf
  listing.py <game dir> --relabel
                         name the operands of the existing listing.json again,
                         for a change to "io" or to the register names, without
                         the snapshot; refused once symbols.json has changed

Record fields (short, the file is large):
  a  address            t  kind: code | byte | word | addr | lohi | text | gap | note
  b  bytes              m  mnemonic (code)         o  operand text, symbolic
  oa operand address, except on a chip's register (nothing in the listing is there)
  l  label at this address                         c  line comment
  s  side comment       x  addresses that reference this one
  d  decoded text (text records) / value list (word, addr)
"""
import hashlib, importlib.util, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledger import compute

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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


def symbol_names(sym):
    names = {}
    for s in sym["symbols"]:
        names.setdefault(s["address"], s["name"])     # first name wins
    return names


def register_names(platform):
    """kit/<platform>/registers.py's NAMES, or none."""
    path = os.path.join(KIT, platform or "", "registers.py")
    if not platform or not os.path.exists(path):
        return {}
    spec = importlib.util.spec_from_file_location(f"{platform}_registers", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.NAMES


def io_meaning(game):
    """chips(target, at): whether the instruction at `at` sees a chip's register at
    `target` rather than the RAM beneath it. The rule is in this file's help."""
    from symbols_export import PLATFORM_DEFAULTS, hexint
    plat = PLATFORM_DEFAULTS.get(game.get("platform", "c64"), {})
    hidden = [(hexint(r[0]), hexint(r[1])) for r in plat.get("hidden", [])]
    rows = []
    for r in game.get("io", []):
        if len(r) != 4 or r[2] not in ("ram", "registers"):
            sys.exit(f'game.json "io": each row is [first, last, "ram" or "registers", why], not {r}')
        rows.append((hexint(r[0]), hexint(r[1]), r[2] == "registers"))

    def two(a):
        return any(lo <= a <= hi for lo, hi in hidden)

    def chips(target, at):
        if not two(target):
            return False
        for lo, hi, registers in reversed(rows):
            if lo <= at <= hi:
                return registers
        return not two(at)
    return chips


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


def uncounted(game, reg, L, ram, entry=None, top=12):
    """The data the ledger does not count, as lines to print (none when there is nothing).

    $00 and $FF are not counted as data anywhere here: the emulator fills unwritten RAM
    with them, and a stretch of that pattern is not the game's."""
    from symbols_export import PLATFORM_DEFAULTS, hexint
    plat = PLATFORM_DEFAULTS.get(game.get("platform", "c64"), {})
    cov = game.get("coverage", {})

    def ranges(rows):
        return [(hexint(r[0]), hexint(r[1])) for r in rows]

    def inside(a, rs):
        return any(lo <= a <= hi for lo, hi in rs)

    said = ranges(cov.get("include", []) + cov.get("exclude", []))
    found = []                                  # (start, end, bytes of data, what)
    hidden = []
    for row in plat.get("hidden", []):          # RAM a default exclusion covers: reported by the page
        lo, hi = hexint(row[0]), hexint(row[1])
        for p in range(lo, hi + 1, 256):
            e = min(p + 255, hi)
            n = sum(1 for a in range(p, e + 1) if ram[a] not in (0, 0xFF) and not inside(a, said))
            if n < 16:                          # the fill pattern leaves a few stray bytes a page
                continue
            if hidden and hidden[-1][1] == p - 1:
                hidden[-1][1] = e; hidden[-1][2] += n
            else:
                hidden.append([p, e, n, f"{row[2]} holds data, and game.json does not say what it is ({row[3]})"])
    found += hidden
    if entry is not None:
        state, owner = L["state"], L["owner"]
        left_out = ranges(cov.get("exclude", [])) + ranges(plat.get("system", [])) + [(s, e) for s, e, *_ in hidden]
        free = [not state[a] and not inside(a, left_out) for a in range(0x10000)]
        loaded = [free[a] and ram[a] == entry[a] and ram[a] not in (0, 0xFF) for a in range(0x10000)]
        a = 0
        while a < 0x10000:                      # stretches of loaded data, split at 64 bytes of anything else
            if not loaded[a]:
                a += 1; continue
            s = e = a; n = gap = 0
            while a < 0x10000 and free[a] and gap < 64:
                if loaded[a]:
                    e, n, gap = a, n + 1, 0
                else:
                    gap += 1
                a += 1
            if n < 8:
                continue
            ex = next((name for lo, hi, name in reg["exclude"] if lo <= s <= hi), None)
            before = owner.get(s - 1)
            where = f"excluded by default as {ex}" if ex else \
                f"after {before[0]} (${before[1]:04X})" if before else "untracked"
            found.append([s, e, n, f"loaded with the game, {where}"])
    if not found:
        return []
    found.sort(key=lambda f: -(f[1] - f[0]))
    lines = ["", f"data the ledger does not count ({'hand-over and play snapshots' if entry else 'play snapshot only'}):"]
    for s, e, n, what in found[:top]:
        lines.append(f"  ${s:04X}-${e:04X} {e - s + 1:6} bytes  {what}")
    if len(found) > top:
        rest = found[top:]
        lines.append(f"  and {len(rest)} more stretches, {sum(f[1] - f[0] + 1 for f in rest)} bytes")
    lines.append("Say what each is: label and describe it, or list it in game.json under coverage.extra")
    lines.append("(authored data), coverage.include (RAM under a default exclusion) or coverage.exclude")
    lines.append("(not the game's, with the reason). kit/skills/core/50-coverage, \"Data the ledger cannot see\".")
    return lines


def relabel(gdir):
    """Name the operands of gdir's listing.json again, from the bytes it already holds."""
    game = json.load(open(os.path.join(gdir, "game.json")))
    spath, lpath = os.path.join(gdir, "symbols.json"), os.path.join(gdir, "listing.json")
    out = json.load(open(lpath))
    if out.get("symbols_sha256") != hashlib.sha256(open(spath, "rb").read()).hexdigest():
        sys.exit(f"{lpath} was built from a different symbols.json: rebuild it from the snapshot")
    names = symbol_names(json.load(open(spath)))
    regs, chips = register_names(game.get("platform")), io_meaning(game)
    code, xrefs, changed = set(), {}, 0
    for r in out["records"]:
        if r["t"] != "code":
            continue
        code.add(r["a"])
        m, mode = OPS[r["b"][0]]
        o, ta = operand(r["a"], m, mode, r["b"], names, regs, chips)
        changed += (r.get("o"), r.get("oa")) != (o, ta)
        for k, v in (("o", o), ("oa", ta)):
            r.pop(k, None)
            if v is not None:
                r[k] = v
        if ta is not None:
            xrefs.setdefault(ta, []).append(r["a"])
    for r in out["records"]:          # references from data (.addr, split tables) stand as built
        for src in r.get("x", []):
            if src not in code:
                xrefs.setdefault(r["a"], []).append(src)
    for r in out["records"]:
        r.pop("x", None)
        if r["a"] in xrefs:
            r["x"] = sorted(set(xrefs[r["a"]]))
    with open(lpath, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {lpath}: {changed} operands named differently")


def main():
    argv = sys.argv[1:]
    if len(argv) == 2 and argv[1] == "--relabel":
        relabel(argv[0]); return
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir, vsf = argv[0], argv[1]
    game = json.load(open(os.path.join(gdir, "game.json")))
    spath = os.path.join(gdir, "symbols.json")
    sym = json.load(open(spath))
    ram = open(vsf, "rb").read()[VSF_RAM_OFFSET:VSF_RAM_OFFSET + 0x10000]
    assert len(ram) == 0x10000, "snapshot too short"
    epath = argv[argv.index("--entry") + 1] if "--entry" in argv else os.path.join(gdir, "work", "entry.vsf")
    entry = None
    if os.path.exists(epath) and os.path.abspath(epath) != os.path.abspath(vsf):
        entry = open(epath, "rb").read()[VSF_RAM_OFFSET:VSF_RAM_OFFSET + 0x10000]
        assert len(entry) == 0x10000, "hand-over snapshot too short"
    elif "--entry" in argv:
        sys.exit(f"no hand-over snapshot at {epath}")

    from symbols_export import regions
    reg = regions(game)
    L = compute(sym["blocks"], sym["symbols"], sym["comments"], reg)
    state, code = L["state"], L["code"]

    names = symbol_names(sym)
    regs, chips = register_names(game.get("platform")), io_meaning(game)
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
                o, ta = operand(a, m, mode, bs, names, regs, chips)
                if ta is not None:
                    rec["oa"] = ta; xref(ta, a)
                if o is not None:
                    rec["o"] = o
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
        # a word or pointer is two bytes: a label on its second byte (the base of a table's high
        # bytes, which code reads as table+1,Y) must not split the pair and shift every entry
        # after it by one. The label is still shown, as a note inside the item.
        def pair_end(limit):
            blk = next(b for b in sym["blocks"] if b["start"] <= a <= b["end"])
            e = a + 1
            while e < 0x10000 and e < a + limit and state[e] and btype[e] == btype[a] \
                    and ((e - blk["start"]) % 2 == 1 or (e not in names and e not in line and e not in side)):
                e += 1
            return e
        if t in ("Word", "Lo/Hi Word", "Hi/Lo Word"):
            e = pair_end(8); bs = list(ram[a:e])
            vals = [bs[i] | (bs[i + 1] << 8) for i in range(0, len(bs) - 1, 2)] if t != "Hi/Lo Word" else \
                   [(bs[i] << 8) | bs[i + 1] for i in range(0, len(bs) - 1, 2)]
            rec.update({"t": "word", "b": bs, "d": vals})
        elif t == "Address":
            e = min(pair_end(2), a + 2); bs = list(ram[a:e])
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
    for line in uncounted(game, reg, L, ram, entry):
        print(line)


if __name__ == "__main__":
    main()
