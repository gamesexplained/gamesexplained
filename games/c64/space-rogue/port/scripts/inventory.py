#!/usr/bin/env python3
"""Every routine of every part, for planning the port: its label, address, size in instructions,
the routines it calls and jumps to, and whether it reads the raster, waits, or writes into code.

  python3 games/c64/space-rogue/port/scripts/inventory.py [part ...]   prints a summary per part
  ... --json <out>                                                      writes the whole table
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.normpath(os.path.join(HERE, "..", ".."))
PARTS = ["title", "intro", "engine", "flight", "station", "nav", "hive", "ending"]


def routines(part):
    L = json.load(open(os.path.join(GAME, "parts", part, "listing.json")))
    S = json.load(open(os.path.join(GAME, "parts", part, "symbols.json")))
    subs = set()
    def walk(o):
        if isinstance(o, dict):
            if o.get("type") == "Subroutine" and isinstance(o.get("address"), int):
                subs.add(o["address"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(S)
    code = [r for r in L["records"] if r.get("t") == "code"]
    label = {r["a"]: r.get("l") for r in L["records"] if r.get("l")}
    out, cur = [], None
    written = set()
    for r in code:
        if r.get("m") in ("sta", "stx", "sty", "inc", "dec", "asl", "lsr", "rol", "ror") and isinstance(r.get("oa"), int):
            written.add(r["oa"])
    codeset = set()
    for r in code:
        codeset.update(range(r["a"], r["a"] + len(r["b"])))
    for r in code:
        if r["a"] in subs or cur is None:
            cur = {"part": part, "a": r["a"], "label": label.get(r["a"]) or "sub_%04X" % r["a"], "n": 0,
                   "calls": set(), "jumps": set(), "raster": False, "smc": False, "end": r["a"]}
            out.append(cur)
        cur["n"] += 1
        cur["end"] = r["a"] + len(r["b"])
        m, oa = r.get("m"), r.get("oa")
        if m == "jsr" and isinstance(oa, int):
            cur["calls"].add(oa)
        if m == "jmp" and isinstance(oa, int) and not (cur["a"] <= oa < cur["end"] + 64):
            cur["jumps"].add(oa)
        if m in ("lda", "ldx", "ldy", "bit", "cmp", "cpx", "cpy") and oa in (0xD012, 0xD011):
            cur["raster"] = True
        if any(a in written for a in range(r["a"] + 1, r["a"] + len(r["b"]))):
            cur["smc"] = True
    return out


def main(argv):
    js = None
    if "--json" in argv:
        i = argv.index("--json"); js = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    parts = argv or PARTS
    allr = []
    for p in parts:
        rs = routines(p)
        allr += rs
        n = sum(r["n"] for r in rs)
        print(f"{p:8} {len(rs):4} routines {n:6} instructions; raster {sum(r['raster'] for r in rs)}, "
              f"self-modified {sum(r['smc'] for r in rs)}")
    if js:
        for r in allr:
            r["calls"] = sorted(r["calls"]); r["jumps"] = sorted(r["jumps"])
        json.dump(allr, open(js, "w"), indent=0)


if __name__ == "__main__":
    main(sys.argv[1:])
