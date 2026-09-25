#!/usr/bin/env python3
"""A small two-pass 6502 assembler, so that the kit's test programs are source, not bytes.

    from asm import assemble
    code, labels = assemble('''
    start:  sei
            lda #$7f
            sta $dc0d        ; comments after a semicolon
    wait:   cmp $d012
            bne wait
            .byte 1, 2, <start, >start
            .word start
            .fill 8, $ea
    ''', org=0xC000)

Operands: #imm, zp, abs, zp,x, abs,y, (zp,x), (zp),y, (abs), a label for a branch; an
expression is numbers ($hex, %bin, decimal), labels, `name = value` constants, + and -,
with < or > in front for the low or high byte. A value under 256 known in the first pass
takes the zero-page form where the instruction has one. The documented instructions only.
"""
import os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "kit", "scripts"))
from listing import OPS, LEN  # noqa: E402

CODE = {(m, mode): op for op, (m, mode) in OPS.items()}


def _value(expr, labels, strict):
    expr = expr.strip()
    part = None
    if expr[:1] in "<>":
        part, expr = expr[0], expr[1:].strip()
    total, sign, pos = 0, 1, 0
    for tok in re.findall(r"[+-]|[^+-]+", expr):
        tok = tok.strip()
        if tok == "+":
            sign = 1; continue
        if tok == "-":
            sign = -1; continue
        if tok.startswith("$"):
            v = int(tok[1:], 16)
        elif tok.startswith("%"):
            v = int(tok[1:], 2)
        elif tok.isdigit():
            v = int(tok)
        elif tok in labels:
            v = labels[tok]
        elif strict:
            raise ValueError(f"unknown name {tok!r}")
        else:
            return None
        total += sign * v; pos += 1
    total &= 0xFFFF
    return total & 0xFF if part == "<" else total >> 8 if part == ">" else total


def _parse(m, arg):
    """(mode, expression) for mnemonic m and operand text arg."""
    a = arg.replace(" ", "")
    if not a:
        return ("acc" if (m, "acc") in CODE else "imp"), None
    if a.lower() == "a" and (m, "acc") in CODE:
        return "acc", None
    if a.startswith("#"):
        return "imm", a[1:]
    if (m, "rel") in CODE:
        return "rel", a
    low = a.lower()
    if low.startswith("(") and low.endswith(",x)"):
        return "izx", a[1:-3]
    if low.startswith("(") and low.endswith("),y"):
        return "izy", a[1:-3]
    if low.startswith("(") and low.endswith(")"):
        return "ind", a[1:-1]
    if low.endswith(",x"):
        return "abx", a[:-2]
    if low.endswith(",y"):
        return "aby", a[:-2]
    return "abs", a


def assemble(src, org):
    """Returns (bytes, labels)."""
    lines = []
    for raw in src.splitlines():
        line = raw.split(";", 1)[0].rstrip()
        m = re.match(r"\s*([A-Za-z_][\w.]*):(.*)", line)
        label = None
        if m:
            label, line = m.group(1), m.group(2)
        lines.append((label, line.strip(), raw))
    labels, forms = {}, {}
    for final in (False, True):
        pc, out = org, bytearray()
        for i, (label, line, raw) in enumerate(lines):
            if label:
                labels[label] = pc
            if not line:
                continue
            c = re.match(r"([A-Za-z_]\w*)\s*=\s*(.+)", line)
            if c:
                v = _value(c.group(2), labels, final)
                if v is not None:
                    labels[c.group(1)] = v
                continue
            word, _, arg = line.partition(" ")
            word, arg = word.lower(), arg.strip()
            if word in (".byte", ".word"):
                vals = [_value(x, labels, final) for x in arg.split(",")]
                for v in vals:
                    v = v or 0
                    out += bytes([v & 0xFF]) if word == ".byte" else bytes([v & 0xFF, v >> 8])
                pc += len(vals) * (1 if word == ".byte" else 2)
                continue
            if word == ".fill":
                n, v = (_value(x, labels, True) for x in arg.split(","))
                out += bytes([v & 0xFF] * n); pc += n
                continue
            mode, expr = _parse(word, arg)
            if mode in ("abs", "abx", "aby") and i not in forms:
                v = _value(expr, labels, False)       # the first pass decides zero page or not
                zp = {"abs": "zp", "abx": "zpx", "aby": "zpy"}[mode]
                forms[i] = zp if v is not None and v < 0x100 and (word, zp) in CODE else mode
            mode = forms.get(i, mode)
            if (word, mode) not in CODE:
                raise ValueError(f"no such instruction: {raw.strip()!r}")
            op, n = CODE[(word, mode)], LEN[mode]
            v = _value(expr, labels, final) if expr is not None else 0
            v = v or 0
            if mode == "rel":
                d = v - (pc + 2)
                if final and not -128 <= d <= 127:
                    raise ValueError(f"branch out of range: {raw.strip()!r}")
                operand = [d & 0xFF]
            else:
                operand = [v & 0xFF, v >> 8][:n - 1]
            out += bytes([op] + operand); pc += n
    return bytes(out), labels


if __name__ == "__main__":
    print(__doc__)
