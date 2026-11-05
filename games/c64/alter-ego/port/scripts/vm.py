#!/usr/bin/env python3
"""Alter Ego's p-code: the instruction set of the interpreter at $713C, decoded from memory.

The game is a program compiled to a stack machine of 16-bit values. Its registers live in zero
page: $04/$05 the stack pointer (it grows down), $06/$07 the frame pointer, $08/$09 the
instruction pointer, $0A/$0B the primary value and $0E/$0F the secondary. A procedure starts
with a 6502 call, so a 6502 routine and a p-code procedure are called the same way:

  JSR $70F8 ; .word adjust ; p-code ...          a p-code procedure (8-byte frame)
  JSR $7059 ; .byte saved ; .word adjust ; 6502  a 6502 body with its own frame

Locals sit below the frame pointer, arguments from fp+8 up. This module decodes the operands of
every instruction, so the listing, the JavaScript port and its tests read p-code one way.

  decode(mem, a) -> Ins or None       one instruction at a
  procedure(mem, entry) -> dict       every instruction a procedure reaches from its stub
  procedures(mem, lo, hi) -> list     every stub in lo..hi

Run as a script: vm.py <snapshot.vsf> <lo> <hi> [--proc <addr>] prints the procedures.
"""
import os, sys

GATEWAY, NATIVE_FRAME = 0x70F8, 0x7059

# the frame offsets of the one-byte local instructions $00-$3F, by low nibble
LOCAL = [-24, -22, -20, -18, -16, -14, -12, -10, -8, -6, -4, -2, 8, 10, 12, 14]

ONE = {0x70: "nop", 0xB0: "ldp [p]", 0xB1: "stw [s],p", 0xB2: "call $02A7", 0xB3: "push p",
       0xB4: "pop s", 0xB5: "mul", 0xB6: "divs", 0xB8: "divu", 0xB9: "rems", 0xBA: "remu",
       0xBB: "add", 0xBC: "sub", 0xBD: "shl", 0xBE: "shr", 0xBF: "sar", 0xC0: "eq", 0xC1: "ne",
       0xC2: "lt", 0xC3: "le", 0xC4: "gt", 0xC5: "ge", 0xC6: "ltu", 0xC7: "leu", 0xC8: "gtu",
       0xC9: "geu", 0xCA: "not", 0xCB: "neg", 0xCC: "cpl", 0xCD: "swap", 0xCF: "ret",
       0xD0: "inc", 0xD1: "dec", 0xD2: "shl1", 0xD3: "ldpb [p]", 0xD4: "stb [s],p",
       0xDA: "and", 0xDB: "or", 0xDC: "xor", 0xDD: "call p"}
# two- and three-byte forms: (mnemonic, operand kind) where kind is
# 'fs' a frame offset (signed byte), 'fw' a frame offset (word), 'a' an absolute address,
# 'ib' an immediate signed byte, 'iw' an immediate word, 'j' a jump target, 'n' a byte count
FORMS = {0x81: ("ldp", "fs"), 0x82: ("ldp", "fw"), 0x83: ("lds", "fs"), 0x84: ("lds", "fw"),
         0x85: ("stp", "fs"), 0x86: ("stp", "fw"), 0x87: ("push", "fs"), 0x88: ("push", "fw"),
         0x89: ("ldp", "ib"), 0x8A: ("ldp", "iw"), 0x8B: ("lds", "ib"), 0x8C: ("lds", "iw"),
         0x8D: ("push", "ib"), 0x8E: ("push", "iw"), 0x8F: ("add", "ib"), 0x90: ("add", "iw"),
         0xA0: ("ldpb", "fw"), 0xA1: ("ldsb", "fw"), 0xA2: ("stpb", "fw"), 0xA3: ("pushb", "fw"),
         0xA4: ("ldp", "a"), 0xA5: ("ldpb", "a"), 0xA6: ("lds", "a"), 0xA7: ("ldsb", "a"),
         0xA8: ("stp", "a"), 0xA9: ("stpb", "a"), 0xAA: ("push", "a"), 0xAB: ("pushb", "a"),
         0xAC: ("call", "a"), 0xAD: ("copy", "n"), 0xAE: ("adj", "ib"), 0xAF: ("adj", "iw"),
         0xB7: ("prim", "u8"), 0xD6: ("jmp", "j"), 0xD7: ("jnz", "j"), 0xD8: ("jz", "j"),
         0xDE: ("ldp", "fa"), 0xDF: ("lds", "fa")}
# the 32-bit primitives of $B7 ($7B27: their table at $7B42) that take operands after their number:
# 12-15 a frame offset word ($78ED), 16-19 an absolute address ($78D6), 24 and 25 a four-byte
# immediate
PRIM_OPERAND = {12: 2, 13: 2, 14: 2, 15: 2, 16: 2, 17: 2, 18: 2, 19: 2, 24: 4, 25: 4}
SIZE = {"fs": 2, "ib": 2, "u8": 2, "fw": 3, "a": 3, "iw": 3, "j": 3, "n": 3, "fa": 3}


def w(mem, a):
    return mem[a & 0xFFFF] | mem[(a + 1) & 0xFFFF] << 8


def sw(v):
    return v - 0x10000 if v & 0x8000 else v


def sb(v):
    return v - 0x100 if v & 0x80 else v


class Ins:
    """One instruction: its address, opcode, size, text, its operand's value, where control can go
    next (targets), and whether it falls through to the next instruction."""
    def __init__(self, a, op, size, m, arg=None, kind=None, targets=(), falls=True, table=None):
        self.a, self.op, self.size, self.m, self.arg, self.kind = a, op, size, m, arg, kind
        self.targets, self.falls, self.table = list(targets), falls, table

    def text(self, names=None):
        names = names or {}
        k, v = self.kind, self.arg
        if k is None:
            return self.m
        if k in ("fs", "fw"):
            return f"{self.m} L{v:+d}" if v < 0 else f"{self.m} A{v:+d}"
        if k == "fa":
            return f"{self.m} &L{v:+d}" if v < 0 else f"{self.m} &A{v:+d}"
        if k in ("a", "j"):
            return f"{self.m} {names.get(v, '$%04X' % v)}"
        if k == "ib":
            return f"{self.m} #{v}"
        if k == "iw":
            return f"{self.m} #${v & 0xFFFF:04X}" if abs(v) > 255 else f"{self.m} #{v}"
        if k == "n":
            return f"{self.m} {v}"
        if k == "u8":
            if isinstance(v, tuple):
                n, x = v
                return f"{self.m} {n}, ${x & 0xFFFFFFFF:X}" if n >= 16 else f"{self.m} {n}, {'L' if x < 0 else 'A'}{x:+d}"
            return f"{self.m} {v}"
        if k == "case":
            bias, cases, default = v
            return f"case {cases} from {-bias}, default {names.get(default, '$%04X' % default)}"
        if k == "switch":
            pairs, default = v
            return "switch " + ", ".join(f"{val}:{names.get(t, '$%04X' % t)}" for val, t in pairs) + \
                f", default {names.get(default, '$%04X' % default)}"
        return self.m


def decode(mem, a):
    op = mem[a]
    if op < 0x40:
        group = ("ldp", "lds", "stp", "push")[op >> 4]
        return Ins(a, op, 1, group, LOCAL[op & 15], "fs")
    if op < 0x70:
        group = ("ldp", "lds", "push")[(op >> 4) - 4]
        return Ins(a, op, 1, group, op & 15, "ib")
    if 0x71 <= op <= 0x7F:
        return Ins(a, op, 1, "add", op - 0x70, "ib")
    if op == 0xCF:
        return Ins(a, op, 1, "ret", falls=False)
    if op in ONE:
        return Ins(a, op, 1, ONE[op])
    if op in FORMS:
        m, k = FORMS[op]
        n = SIZE[k]
        if k in ("fs", "ib"):
            v = sb(mem[a + 1])
        elif k == "u8":
            v = mem[a + 1]
            more = PRIM_OPERAND.get(v, 0)
            if more == 4:
                v = (v, mem[a + 2] | mem[a + 3] << 8 | mem[a + 4] << 16 | mem[a + 5] << 24)
            elif more == 2:
                v = (v, w(mem, a + 2) if v >= 16 else sw(w(mem, a + 2)))
            return Ins(a, op, 2 + more, m, v, k)
        elif k in ("fw", "fa"):
            v = sw(w(mem, a + 1))
        elif k == "iw":
            v = sw(w(mem, a + 1))
        else:
            v = w(mem, a + 1)
        if k == "j":
            return Ins(a, op, 3, m, v, k, targets=[v], falls=op != 0xD6)
        return Ins(a, op, n, m, v, k)
    if op == 0xD5:          # dense case: bias, count, default, count targets
        bias, count, default = sw(w(mem, a + 1)), w(mem, a + 3), w(mem, a + 5)
        if count > 512:
            return None
        cases = [w(mem, a + 7 + 2 * i) for i in range(count)]
        return Ins(a, op, 7 + 2 * count, "case", (bias, cases, default), "case",
                   targets=cases + [default], falls=False)
    if op == 0xD9:          # sparse switch: count, count (value, target), default
        count = w(mem, a + 1)
        if count > 512:
            return None
        pairs = [(sw(w(mem, a + 3 + 4 * i)), w(mem, a + 5 + 4 * i)) for i in range(count)]
        default = w(mem, a + 3 + 4 * count)
        return Ins(a, op, 5 + 4 * count, "switch", (pairs, default), "switch",
                   targets=[t for _, t in pairs] + [default], falls=False)
    return None             # $80, $91-$9F, $CE and $E0-$FF stop the machine (BRK)


def stub(mem, a):
    """('vm', adjust, body) for a p-code procedure's stub at a, ('native', saved, adjust, body)
    for a 6502 body with a frame, or None."""
    if mem[a] == 0x20 and w(mem, a + 1) == GATEWAY:
        return ("vm", sw(w(mem, a + 3)), a + 5)
    if mem[a] == 0x20 and w(mem, a + 1) == NATIVE_FRAME:
        return ("native", mem[a + 3], sw(w(mem, a + 4)), a + 6)
    return None


def procedure(mem, entry):
    """Every instruction of the p-code procedure whose stub is at entry, reached by following its
    jumps and cases: {'entry', 'adjust', 'ins': {addr: Ins}, 'calls': set, 'bad': [addr],
    'end': one past the highest byte}."""
    s = stub(mem, entry)
    assert s and s[0] == "vm", f"no p-code stub at ${entry:04X}"
    ins, todo, bad, calls = {}, [s[2]], [], set()
    while todo:
        a = todo.pop()
        while a not in ins:
            i = decode(mem, a)
            if i is None:
                bad.append(a)
                break
            ins[a] = i
            if i.op == 0xAC:
                calls.add(i.arg)
            todo.extend(i.targets)
            if not i.falls:
                break
            a += i.size
    end = max(a + i.size for a, i in ins.items()) if ins else s[2]
    return {"entry": entry, "adjust": s[1], "body": s[2], "ins": ins, "calls": calls, "bad": bad, "end": end}


def procedures(mem, lo, hi):
    """The address of every stub in lo..hi, in order."""
    return [a for a in range(lo, hi - 2) if stub(mem, a)]


def main(argv):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../../../kit/c64"))
    import snapshot
    if len(argv) < 4:
        print(__doc__)
        return 2
    mem = snapshot.read(argv[1])
    lo, hi = int(argv[2].lstrip("$"), 16), int(argv[3].lstrip("$"), 16)
    only = int(argv[argv.index("--proc") + 1].lstrip("$"), 16) if "--proc" in argv else None
    for a in procedures(mem, lo, hi):
        if only is not None and a != only:
            continue
        s = stub(mem, a)
        if s[0] == "native":
            print(f"\n${a:04X} native frame: saves {s[1]} workspace bytes, adjust {s[2]}, 6502 at ${s[3]:04X}")
            continue
        p = procedure(mem, a)
        print(f"\n${a:04X} procedure: adjust {p['adjust']}, ends ${p['end']:04X}, "
              f"{len(p['ins'])} instructions" + (f", stops at {['$%04X' % b for b in p['bad']]}" if p["bad"] else ""))
        if only is not None:
            for x in sorted(p["ins"]):
                i = p["ins"][x]
                print(f"  {x:04X}  {' '.join('%02X' % mem[x + k] for k in range(min(i.size, 7))):20s} {i.text()}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
