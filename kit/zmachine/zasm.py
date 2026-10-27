#!/usr/bin/env python3
"""A small Z-code assembler, so that the kit's test stories are source, not story files.

    from zasm import assemble
    asm = assemble(3, '''
    main:   .routine 0
            add #1 #2 -> sp           ; a comment runs from a semicolon
            je sp #3 ?ok              ; ?label branches when true, ?~label when false,
            print "bad"               ; ?rtrue and ?rfalse return, ?s:label is the short form
    ok:     call twice #21 -> G00
            print_paddr msg
            quit
    twice:  .routine 1 #$0000         ; locals, and to version 4 their first values
            mul L01 #2 -> sp
            ret_popped
    msg:    .string "Hello{a:0}\\n"  ; {a:N} is abbreviation N, \\n a new line
    ''', objects=[...], dictionary=[...], abbreviations=[...])
    asm.story, asm.labels, asm.instructions

Operands: #n or #$hex is a constant, small under 256 unless written with four hex digits;
sp, L01-L0F and G00-GEF are variables; [L01] is a variable's number, for the opcodes that
take one (inc, store, pull...); a routine's or a string's label is its packed address, a
table's its address, and &label any label's address; a code label is a jump's offset. Two
operands that are not large make the long form of a 2OP; any other count, the variable
form. A branch is the two-byte form unless ?s: asks for the one-byte one. call and sread
are also the names of call_vs and aread, so that one source serves every version.

The story: the header, the abbreviations, the object table, 240 globals and the tables in
dynamic memory; the dictionary and (version 5 on, when given) the alphabet table in static
memory; then the code and strings. The header carries the length and the checksum, so
verify passes. objects is a list of dicts (name, attrs, parent, sibling, child, props as
{number: bytes}); dictionary a list of (word, data bytes), with separators=; abbreviations
a list of strings; globals {number: value}; tables {label: size or bytes}; alphabet the 78
characters of a version 5 alphabet table. locks=True writes text in versions 1 and 2 with
the shift locks Infocom's compiler used where it could.

Run as a script: zasm.py <version> <source> <story out>.
"""
import os, re, sys
from dataclasses import dataclass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import zcode  # noqa: E402
from story import A0, A1, A2, A2_V1, Story, zscii  # noqa: E402

VAR = re.compile(r"^(sp|L(0[1-9A-F])|G([0-9A-E][0-9A-F]))$", re.I)


class AsmError(Exception):
    pass


@dataclass
class Assembled:
    story: bytes
    labels: dict          # name -> (kind, address): routine, string, code or data
    instructions: list    # the address of every instruction, in order


def _unquote(s):
    return re.sub(r'\\(n|.)', lambda m: "\n" if m[1] == "n" else m[1], s)


def scale(version):
    return 2 if version <= 3 else 4 if version <= 7 else 8


def alphabets(version, alphabet=None):
    if alphabet:
        return [alphabet[0:26], alphabet[26:52], " \n" + alphabet[54:78]]
    return [A0, A1, A2_V1 if version == 1 else A2]


def encode_zchars(version, text, alphabet=None, locks=False):
    """Text as Z-characters (not packed): shifts to A1 and A2, a ten-bit escape for anything
    else, {a:N} for abbreviation N, and new lines as the version writes them."""
    A = alphabets(version, alphabet)
    out, cur = [], 0
    pieces = re.findall(r"\{a:(\d+)\}|(.)", text, re.S)

    def where(ch):
        if ch == "\n":
            return (0, [1]) if version == 1 else (2, [7])
        for k in range(3):
            j = A[k].find(ch, 1 if k == 2 else 0)     # A2's first place is the escape
            if j >= 0:
                return k, [j + 6]
        code = next((z for z in range(256) if zscii(z) == ch), ord(ch))
        return 2, [6, code >> 5, code & 31]

    for n, (abbr, ch) in enumerate(pieces):
        if abbr:
            a = int(abbr)
            if version < 2 or (version == 2 and a > 31):
                raise AsmError(f"abbreviation {a} in version {version}")
            out += [1, a] if version == 2 else [1 + a // 32, a % 32]
            continue
        if ch == " ":
            out.append(0); continue
        k, body = where(ch)
        if version == 1 and ch == "\n":
            out += body; continue
        if version <= 2:
            if k != cur:
                delta = (k - cur) % 3
                nxt = pieces[n + 1][1] if n + 1 < len(pieces) else ""
                lock = locks and nxt not in ("", " ") and where(nxt)[0] == k
                out.append(1 + delta + (2 if lock else 0))
                if lock:
                    cur = k
        elif k:
            out.append(3 + k)
        out += body
    return out


def pack_zchars(zc):
    zc = list(zc) or [5]
    while len(zc) % 3:
        zc.append(5)
    b = bytearray()
    for j in range(0, len(zc), 3):
        w = (zc[j] << 10) | (zc[j + 1] << 5) | zc[j + 2]
        if j + 3 == len(zc):
            w |= 0x8000
        b += bytes((w >> 8, w & 0xFF))
    return bytes(b)


def encode_text(version, text, alphabet=None, locks=False):
    return pack_zchars(encode_zchars(version, text, alphabet, locks))


# The same instruction under the name another version gives it, so that one source serves
# every version.
ALIASES = (("call", "call_vs"), ("sread", "aread"))


def _names(version):
    out = {}
    for (count, number), rows in zcode.OPS.items():
        for first, last, name, flags in rows:
            if first <= version <= last:
                out.setdefault(name, (count, number, flags))
    for a, b in ALIASES:
        for x, y in ((a, b), (b, a)):
            if x not in out and y in out:
                out[x] = out[y]
    return out


def _const(tok):
    t = tok[1:]
    if t.startswith("$"):
        v = int(t[1:], 16)
        return v & 0xFFFF, len(t) - 1 >= 4
    v = int(t, 0)
    return v & 0xFFFF, not 0 <= v <= 255


class Assembler:
    def __init__(self, version, alphabet=None, locks=False):
        self.v, self.alphabet, self.locks = version, alphabet, locks
        self.instructions = []
        self.names = _names(version)
        self.s = scale(version)

    def parse(self, source):
        items = []      # (label or None, directive/opcode, args string)
        for raw in source.splitlines():
            line = re.sub(r';(?=(?:[^"]*"[^"]*")*[^"]*$).*', "", raw).rstrip()
            if not line.strip():
                continue
            m = re.match(r"^\s*([A-Za-z_]\w*):(.*)$", line)
            label, rest = (m[1], m[2]) if m else (None, line)
            rest = rest.strip()
            if not rest:
                items.append((label, None, "")); continue
            op, _, args = rest.partition(" ")
            items.append((label, op, args.strip()))
        return items

    def operands(self, args):
        """[(token)] and the store, branch and text after them."""
        text = None
        m = re.search(r'"((?:[^"\\]|\\.)*)"\s*$', args)
        if m:
            text = _unquote(m[1])
            args = args[:m.start()]
        toks = args.split()
        store = branch = None
        ops = []
        i = 0
        while i < len(toks):
            t = toks[i]
            if t == "->":
                store = toks[i + 1]; i += 2; continue
            if t.startswith("?"):
                branch = t[1:]; i += 1; continue
            ops.append(t); i += 1
        return ops, store, branch, text

    def var(self, t):
        m = VAR.match(t)
        if not m:
            raise AsmError(f"not a variable: {t}")
        return 0 if t.lower() == "sp" else int(t[1:], 16) + (16 if t[0] in "Gg" else 0)

    def instruction(self, op, args, here, labels, final):
        if op not in self.names:
            raise AsmError(f"no opcode {op!r} in version {self.v}")
        count, number, flags = self.names[op]
        ops, store, branch, text = self.operands(args)
        kinds, vals = [], []
        for k, t in enumerate(ops):
            if t.startswith("#"):
                v, large = _const(t)
                kinds.append("large" if large else "small"); vals.append(v)
            elif t.startswith("["):
                kinds.append("small"); vals.append(self.var(t[1:-1]))
            elif VAR.match(t):
                kinds.append("var"); vals.append(self.var(t))
            elif t.startswith("&"):
                kinds.append("large"); vals.append(("address", t[1:], k))
            else:
                kinds.append("large"); vals.append(("label", t, k))
        b = bytearray()
        if count == "0OP":
            b.append(0xB0 | number)
        elif count == "1OP":
            b.append(0x80 | ({"large": 0, "small": 1, "var": 2}[kinds[0]] << 4) | number)
        elif count == "2OP" and len(kinds) == 2 and "large" not in kinds:
            b.append((0x40 if kinds[0] == "var" else 0) | (0x20 if kinds[1] == "var" else 0) | number)
        else:
            if count == "EXT":
                b += bytes((0xBE, number))
            else:
                b.append((0xE0 if count == "VAR" else 0xC0) | number)
            two = (count, number) in zcode.DOUBLE_TYPES
            tk = kinds + [None] * ((8 if two else 4) - len(kinds))
            codes = [{"large": 0, "small": 1, "var": 2, None: 3}[k] for k in tk]
            for j in range(0, len(codes), 4):
                c = codes[j:j + 4]
                b.append((c[0] << 6) | (c[1] << 4) | (c[2] << 2) | c[3])
        fix = []
        for k, v in zip(kinds, vals):
            if isinstance(v, tuple):
                fix.append((len(b), v)); b += b"\0\0"
            elif k == "large":
                b += bytes((v >> 8, v & 0xFF))
            else:
                b.append(v)
        if "s" in flags:
            if store is None:
                raise AsmError(f"{op} stores: give it -> var")
            b.append(self.var(store))
        brfix = None
        if "b" in flags:
            if branch is None:
                raise AsmError(f"{op} branches: give it ?label")
            on = not branch.startswith("~")
            target = branch.lstrip("~")
            short = target.startswith("s:")
            target = target[2:] if short else target
            if target in ("rtrue", "rfalse"):
                b.append((0x80 if on else 0) | 0x40 | (1 if target == "rtrue" else 0))
            else:
                brfix = (len(b), on, target, short)
                b += b"\0" if short else b"\0\0"
        if "t" in flags:
            b += encode_text(self.v, text or "", self.alphabet, self.locks)
        end = here + len(b)
        if final:
            for at, (how, name, k) in fix:
                if name not in labels:
                    raise AsmError(f"no label {name}")
                kind, addr = labels[name]
                if how == "address":
                    v = addr
                elif "j" in flags and k == 0:
                    v = (addr - end + 2) & 0xFFFF
                elif kind in ("routine", "string"):
                    v = addr // self.s
                else:
                    v = addr
                b[at:at + 2] = bytes((v >> 8, v & 0xFF))
            if brfix:
                at, on, target, short = brfix
                if target not in labels:
                    raise AsmError(f"no label {target}")
                off = labels[target][1] - end + 2
                if short:
                    if not 2 <= off <= 63:
                        raise AsmError(f"?s:{target} is {off} bytes away; the short form reaches 2-63")
                    b[at] = (0x80 if on else 0) | 0x40 | off
                else:
                    if not -8192 <= off <= 8191:
                        raise AsmError(f"branch to {target} out of range")
                    off &= 0x3FFF
                    b[at:at + 2] = bytes(((0x80 if on else 0) | (off >> 8), off & 0xFF))
        return bytes(b)

    def code(self, items, base, labels, final):
        """The high memory: routines, their code and the strings, from base."""
        out = bytearray()
        for label, op, args in items:
            here = base + len(out)
            if op in (".routine", ".string"):
                while (base + len(out)) % self.s:
                    out.append(0)
                here = base + len(out)
            if label:
                kind = "routine" if op == ".routine" else "string" if op == ".string" else "code"
                labels[label] = (kind, here)
            if op is None:
                continue
            if op == ".routine":
                parts = args.split()
                n = int(parts[0])
                out.append(n)
                if self.v <= 4:
                    inits = [_const(p)[0] for p in parts[1:]] + [0] * n
                    for v in inits[:n]:
                        out += bytes((v >> 8, v & 0xFF))
                if label:
                    labels[label + ".code"] = ("code", base + len(out))
            elif op == ".string":
                m = re.match(r'"((?:[^"\\]|\\.)*)"', args)
                out += encode_text(self.v, _unquote(m[1]), self.alphabet, self.locks)
            elif op == ".byte":
                out += bytes(_const("#" + x.strip())[0] & 0xFF for x in args.split(","))
            else:
                if final:
                    self.instructions.append(here)
                out += self.instruction(op, args, here, labels, final)
        return bytes(out)


def _objects(version, objects, base, alphabet, locks):
    """The object table, and its property tables after it, from base."""
    small = version <= 3
    ndef, esize, abytes = (31, 9, 4) if small else (63, 14, 6)
    head = bytearray(2 * ndef)
    props_at = base + len(head) + esize * len(objects)
    tables = bytearray()
    entries = bytearray()
    for o in objects:
        bits = 0
        for a in o.get("attrs", ()):
            bits |= 1 << (8 * abytes - 1 - a)
        entries += bits.to_bytes(abytes, "big")
        links = (o.get("parent", 0), o.get("sibling", 0), o.get("child", 0))
        entries += bytes(links) if small else b"".join(x.to_bytes(2, "big") for x in links)
        entries += (props_at + len(tables)).to_bytes(2, "big")
        name = encode_text(version, o.get("name", ""), alphabet, locks) if o.get("name") else b""
        tables.append(len(name) // 2)
        tables += name
        for num, data in sorted(o.get("props", {}).items(), reverse=True):
            data = bytes(data)
            if small:
                tables.append(((len(data) - 1) << 5) | num)
            elif len(data) <= 2:
                tables.append((0x40 if len(data) == 2 else 0) | num)
            else:
                tables += bytes((0x80 | num, 0x80 | (len(data) & 63)))
            tables += data
        tables.append(0)
    return bytes(head + entries + tables)


def assemble(version, source, objects=(), dictionary=(), separators=b".,", abbreviations=(),
             alphabet=None, locks=False, globals=None, tables=None, release=1, serial="KITASM"):
    a = Assembler(version, alphabet, locks)
    items = a.parse(source)
    labels = {}
    mem = bytearray(0x40)
    # abbreviations: the strings, then the table of their word addresses
    abbr_at = 0
    if version >= 2:
        n = 32 if version == 2 else 96
        strings = []
        for i in range(n):
            while len(mem) % 2:
                mem.append(0)
            strings.append(len(mem))
            mem += encode_text(version, abbreviations[i] if i < len(abbreviations) else "", alphabet, locks)
        while len(mem) % 2:
            mem.append(0)
        abbr_at = len(mem)
        for addr in strings:
            mem += (addr // 2).to_bytes(2, "big")
    obj_at = len(mem)
    mem += _objects(version, list(objects), obj_at, alphabet, locks)
    while len(mem) % 2:
        mem.append(0)
    globals_at = len(mem)
    mem += bytes(480)
    for g, value in (globals or {}).items():
        mem[globals_at + 2 * g:globals_at + 2 * g + 2] = (value & 0xFFFF).to_bytes(2, "big")
    for name, data in (tables or {}).items():
        labels[name] = ("data", len(mem))
        mem += bytes(data) if not isinstance(data, int) else bytes(data)
        while len(mem) % 2:
            mem.append(0)
    static_at = len(mem)
    dict_at = len(mem)
    mem.append(len(separators)); mem += separators
    wlen = 4 if version <= 3 else 6
    data_len = max([len(d) for _, d in dictionary] + [3])
    mem.append(wlen + data_len)
    probe = Story(bytes([version]) + bytes(0x3F))       # its encoder, for the dictionary's words
    if alphabet:
        probe.alphabets = alphabets(version, alphabet)
    entries = sorted((probe.encode(w), bytes(d)) for w, d in dictionary)
    mem += len(entries).to_bytes(2, "big")
    for enc, d in entries:
        mem += enc + d + bytes(data_len - len(d))
    alpha_at = 0
    if alphabet and version >= 5:
        alpha_at = len(mem)
        mem += bytes(ord(c) for c in alphabet)
    while len(mem) % a.s:
        mem.append(0)
    high = len(mem)
    a.code(items, high, labels, False)
    code = a.code(items, high, labels, True)
    mem += code
    unit = 2 if version <= 3 else 4 if version <= 5 else 8   # the header gives the length in these
    while len(mem) % unit:
        mem.append(0)
    if "main" not in labels:
        raise AsmError("no routine called main")
    hdr = {0x00: (version, 1), 0x02: (release, 2), 0x04: (high, 2), 0x08: (dict_at, 2),
           0x0A: (obj_at, 2), 0x0C: (globals_at, 2), 0x0E: (static_at, 2)}
    if version == 6:
        hdr[0x06] = (labels["main"][1] // 4, 2)
    else:
        hdr[0x06] = (labels["main.code"][1], 2)
    if version >= 2:
        hdr[0x18] = (abbr_at, 2)
    if version >= 3:
        hdr[0x1A] = (len(mem) // unit, 2)
    if alpha_at:
        hdr[0x34] = (alpha_at, 2)
    for off, (v, size) in hdr.items():
        mem[off:off + size] = v.to_bytes(size, "big")
    mem[0x12:0x18] = serial.encode("ascii")[:6].ljust(6, b"0")
    if version >= 3:
        mem[0x1C:0x1E] = (sum(mem[0x40:]) & 0xFFFF).to_bytes(2, "big")
    return Assembled(bytes(mem), labels, a.instructions)


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    open(sys.argv[3], "wb").write(assemble(int(sys.argv[1]), open(sys.argv[2]).read()).story)
