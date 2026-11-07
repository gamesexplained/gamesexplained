#!/usr/bin/env python3
"""Alter Ego's p-code as statements: vm.py's instructions run symbolically, a basic block at a
time, so `ldp L-4; lds #3; add; stp L-4` reads `L-4 = (L-4 + 3)`. It is a reading aid for the
listing's comments and the port; it does not try to recover loops.

  decompile.py <snapshot.vsf> <proc address> [<names.json>]

Locals print as L-n (below the frame pointer), arguments as A+n (A+8 is the first), globals as
their label or $XXXX, and calls with their arguments in order, the first argument first.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vm  # noqa: E402

BIN = {"mul": "*", "divs": "/", "divu": "/u", "rems": "%", "remu": "%u", "add": "+", "sub": "-",
       "shl": "<<", "shr": ">>u", "sar": ">>", "eq": "==", "ne": "!=", "lt": "<", "le": "<=",
       "gt": ">", "ge": ">=", "ltu": "<u", "leu": "<=u", "gtu": ">u", "geu": ">=u", "and": "&",
       "or": "|", "xor": "^"}


def operand(i, names, byte=False):
    k, v = i.kind, i.arg
    pre = "b:" if byte else ""
    if k in ("fs", "fw"):
        return pre + (f"L{v}" if v < 0 else f"A+{v}")
    if k == "fa":
        return "&" + (f"L{v}" if v < 0 else f"A+{v}")
    if k == "a":
        return pre + names.get(v, f"${v:04X}")
    if k in ("ib", "iw"):
        if k == "iw" and v & 0xFFFF in names and (v & 0xFFFF) >= 0x2000:
            return "#" + names[v & 0xFFFF]
        return str(v) if -256 < v < 4096 else f"${v & 0xFFFF:04X}"
    return str(v)


def decompile(mem, entry, names=None):
    names = names or {}
    p = vm.procedure(mem, entry)
    ins = p["ins"]
    starts = {p["body"]} | {t for i in ins.values() for t in i.targets}
    out = [f"proc {names.get(entry, '$%04X' % entry)}  ; locals {-p['adjust']} bytes"]
    P, S, stack = "P", "S", []
    last_call = 0
    prev_falls = True

    def emit(a, s):
        out.append(f"  {a:04X}  {s}")

    order = sorted(ins)
    skip_adj = None
    for n_, a in enumerate(order):
        i = ins[a]
        nxt = ins[order[n_ + 1]] if n_ + 1 < len(order) else None
        if a in starts and a != p["body"]:
            if P != "P" and prev_falls:
                emit(a, f"P = {P}  ; on to {a:04X}")
            out.append(f" {a:04X}:")
            P, S = "P", "S"
        m, k = i.m, i.kind
        byte = m.endswith("b") or m.startswith("ldpb") or m.startswith("ldsb") or m.startswith("pushb")
        base = m.replace("b", "") if m in ("ldpb", "ldsb", "stpb", "pushb") else m
        if base == "ldp" and k:
            P = operand(i, names, m == "ldpb")
        elif base == "lds" and k:
            S = operand(i, names, m == "ldsb")
        elif base == "push" and k:
            stack.append(operand(i, names, m == "pushb"))
        elif m == "push p":
            stack.append(P if P != "P" else f"P@{last_call:04X}")
        elif m == "pop s":
            S = stack.pop() if stack else "pop()"
        elif base == "stp":
            t = operand(i, names, m == "stpb")
            emit(a, f"{t} = {P}")
            P = t if not t.startswith("b:") else P
        elif m == "stw [s],p":
            emit(a, f"*{S} = {P}")
        elif m == "stb [s],p":
            emit(a, f"*b:{S} = {P}")
        elif m == "ldp [p]":
            P = f"*({P})"
        elif m == "ldpb [p]":
            P = f"*b:({P})"
        elif m in BIN and k is None:
            P = f"({P} {BIN[m]} {S})"
        elif m == "not":
            P = f"!{P}"
        elif m == "neg":
            P = f"-{P}"
        elif m == "cpl":
            P = f"~{P}"
        elif m == "swap":
            P, S = S, P
        elif m == "inc":
            P = f"({P} + 1)"
        elif m == "dec":
            P = f"({P} - 1)"
        elif m == "shl1":
            P = f"({P} << 1)"
        elif m == "add" and k == "ib":
            P = f"({P} + {i.arg})" if i.arg >= 0 else f"({P} - {-i.arg})"
        elif m == "add":
            P = f"({P} + {operand(i, names)})"
        elif m in ("call", "call p"):
            # the call's arguments are the words the adj after it takes back; any pushed before
            # them are the caller's temporaries, still on the stack while it runs
            nargs = nxt.arg // 2 if nxt is not None and nxt.m == "adj" and nxt.arg > 0 else 0
            nargs = min(nargs, len(stack))
            args = ", ".join(reversed(stack[len(stack) - nargs:]))
            temps = len(stack) - nargs
            del stack[len(stack) - nargs:]
            skip_adj = order[n_ + 1] if nargs else None
            note = f"  ; temps {temps}" if temps else ""
            target = names.get(i.arg, '$%04X' % i.arg) if m == "call" else f"(*{P})"
            emit(a, f"P = {target}({args}){note}")
            P = "P"
            last_call = a
        elif m == "call $02A7":
            emit(a, "call $02A7")
        elif m == "adj" and a == skip_adj:
            skip_adj = None
        elif m == "adj":
            n = i.arg
            if n > 0 and n % 2 == 0 and len(stack) >= n // 2:
                del stack[len(stack) - n // 2:]
            else:
                emit(a, f"sp += {n}")
                stack = []
        elif m == "copy":
            emit(a, f"memcpy({S}, {P}, {i.arg})")
        elif m == "prim":
            emit(a, f"primitive {i.text()}")
        elif m == "jmp":
            if P != "P":
                emit(a, f"P = {P}")
            emit(a, f"goto {i.arg:04X}")
        elif m == "jz":
            emit(a, f"if !{P} goto {i.arg:04X}")
        elif m == "jnz":
            emit(a, f"if {P} goto {i.arg:04X}")
        elif m == "ret":
            emit(a, f"return {P}")
        elif m == "case":
            bias, cases, default = i.arg
            emit(a, f"case {P} from {-bias}: " + " ".join(f"{t:04X}" for t in cases) + f" else {default:04X}")
        elif m == "switch":
            pairs, default = i.arg
            emit(a, f"switch {P}: " + " ".join(f"{v}->{t:04X}" for v, t in pairs) + f" else {default:04X}")
        elif m == "nop":
            pass
        else:
            emit(a, f"?? {i.text()}")
        prev_falls = i.falls
        if stack and len(stack) > 40:
            stack = stack[-40:]
    return "\n".join(out)


def load_names(game_dir):
    names = {}
    for part in ("main", "start", "life"):
        f = os.path.join(game_dir, "parts", part, "symbols.json")
        if os.path.exists(f):
            for s in json.load(open(f))["symbols"]:
                names.setdefault(s["address"], s["name"])
    return names


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(here, "../../../../../kit/c64"))
    import snapshot
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    mem = snapshot.read(sys.argv[1])
    names = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else load_names(os.path.join(here, "../.."))
    names = {int(k) if not isinstance(k, int) else k: v for k, v in names.items()}
    for x in sys.argv[2].split(","):
        print(decompile(mem, int(x.lstrip("$"), 16), names))
        print()
