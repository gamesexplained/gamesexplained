#!/usr/bin/env python3
"""Which bytes of a Z80 image are code, and whether symbols.json agrees.

A control file has no flow tracer behind it: SkoolKit decodes what a `c`
block tells it to and nothing else. Code typed as data is then invisible:
it has no cross-references, reads as a table, and coverage still reaches
100 %. The first Spectrum game had 5.9 KB of it. This builds the code map
from two sources and holds symbols.json against it.

  codemap.py <game dir> <snapshot.sna> [--entry ADDR ...] [--map FILE ...]
      A recursive trace from each --entry (and from every address in each
      --map, an executed-address list: one hex address per line or
      space-separated, with or without `$`, as ZEsarUX's
      `cpu-code-coverage get` prints them). Reports code the map has that
      symbols.json types as data, and Code blocks neither source reached.
      Writes <game dir>/work/codemap.json. Exits 1 when code is typed as
      data.
  codemap.py <game dir> <snapshot.sna> --refs ADDR
      Every instruction in work/codemap.json's code whose operand is ADDR,
      and every place ADDR occurs in the image as a little-endian word.
      Indexed access (IX+d, HL after arithmetic) is not found by either.
  codemap.py --test
      self-check on a synthetic image (writes only to a temp dir)

The trace follows JP, JR, DJNZ and CALL operands and stops at RET, an
unconditional jump and `JP (HL)`. What it cannot see, and so what --entry
is for: a handler whose address is only stored in data, an operand another
instruction writes, code that ran before the snapshot was taken, and code
nothing calls. An entry given by hand is a claim: say in the game's
facts.md what shows it is code.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import z80, snapshot  # noqa: E402

RAM_LO = 0x4000


def instruction(mem, a):
    """(length, text, targets, stops) for the instruction at a; None for a byte that decodes as nothing."""
    d = z80.decode(mem, a)
    if d is None:
        return None
    m, t, n = d
    text, target = z80.operand(a, m, t, bytes(mem[a:a + n]), {}, {}, lambda *_: False)
    targets, stops = [], False
    if m in ("jp", "jr", "djnz", "call"):
        if t and t.startswith("("):                    # jp (hl), (ix), (iy)
            stops = True
        else:
            if target is not None:
                targets.append(target)
            stops = m in ("jp", "jr") and "," not in t
    elif m in ("ret", "reti", "retn"):
        stops = not t
    return n, m + (" " + text if text else ""), targets, stops


def trace(mem, entries):
    """(instruction starts, code bytes) reached from the entries."""
    starts, code, work = set(), set(), list(entries)
    while work:
        a = work.pop()
        while RAM_LO <= a < 0x10000 and a not in starts:
            ins = instruction(mem, a)
            if ins is None:
                break
            n, _, targets, stops = ins
            starts.add(a)
            code.update(range(a, a + n))
            work.extend(t for t in targets if RAM_LO <= t < 0x10000 and t not in starts)
            if stops:
                break
            a += n
    return starts, code


def runs(addrs):
    out, prev, start = [], None, None
    for a in sorted(addrs):
        if prev is None or a != prev + 1:
            if prev is not None:
                out.append((start, prev))
            start = a
        prev = a
    if prev is not None:
        out.append((start, prev))
    return out


def read_map(path):
    return {int(w.lstrip("$").rstrip("Hh"), 16) for w in open(path).read().split()}


def hexarg(s):
    return int(s.lstrip("$").rstrip("Hh"), 16)


def build(gdir, sna, entries, maps):
    mem = bytearray(snapshot.read(sna))
    executed = set()
    for m in maps:
        executed |= {a for a in read_map(m) if a >= RAM_LO}
    starts, code = trace(mem, list(entries) + sorted(executed))
    ex_bytes = set()
    for a in executed:
        ins = instruction(mem, a)
        ex_bytes.update(range(a, a + (ins[0] if ins else 1)))
    sym = json.load(open(os.path.join(gdir, "symbols.json")))
    typed = set()
    for b in sym["blocks"]:
        if b["type"] == "Code":
            typed.update(range(b["start"], b["end"] + 1))
    os.makedirs(os.path.join(gdir, "work"), exist_ok=True)
    json.dump({"starts": sorted(starts), "code": sorted(code), "executed": sorted(executed)},
              open(os.path.join(gdir, "work", "codemap.json"), "w"))
    as_data, unreached = code - typed, typed - code
    print(f"code map: {len(code)} bytes in {len(runs(code))} runs "
          f"({len(ex_bytes)} executed, {len(code - ex_bytes)} reached by the trace alone)")
    print(f"symbols.json types {len(typed)} bytes as Code")
    print(f"code typed as data: {len(as_data)} bytes in {len(runs(as_data))} runs")
    for s, e in sorted(runs(as_data), key=lambda r: r[0] - r[1])[:40]:
        print(f"  ${s:04X}-${e:04X}  {e - s + 1}")
    print(f"typed Code, reached by neither source: {len(unreached)} bytes in {len(runs(unreached))} runs "
          "(a handler in a table, an operand written at run time, or data)")
    for s, e in runs(unreached)[:40]:
        print(f"  ${s:04X}-${e:04X}  {e - s + 1}")
    return 1 if as_data else 0


def refs(gdir, sna, target):
    mem = bytearray(snapshot.read(sna))
    path = os.path.join(gdir, "work", "codemap.json")
    if not os.path.exists(path):
        sys.exit(f"no {path}: build the code map first")
    cm = json.load(open(path))
    starts, executed = cm["starts"], set(cm["executed"])
    hits = []
    for a in starts:
        n, text, _, _ = instruction(mem, a)
        if any(int(h, 16) == target for h in re.findall(r"\$([0-9A-F]{4})", text)):
            hits.append((a, text))
    print(f"instructions whose operand is ${target:04X}: {len(hits)}")
    for a, text in hits:
        print(f"  ${a:04X}  {text}{'' if a in executed else '   (not executed in the maps)'}")
    code, sset = set(cm["code"]), set(starts)
    words = [a for a in range(RAM_LO, 0xFFFF) if mem[a] == target & 255 and mem[a + 1] == target >> 8]
    print(f"the word ${target:04X} occurs at {len(words)} addresses:")
    for a in words:
        where = "data"
        if a in code:
            b = a
            while b not in sset and b > a - 4:
                b -= 1
            where = f"in the instruction at ${b:04X} ({instruction(mem, b)[1]})" if b in sset else "code"
        print(f"  ${a:04X}  {where}")
    print("indexed access (IX+d, IY+d, HL after arithmetic) is found by neither search")


def test():
    import struct, tempfile
    mem = bytearray(0x10000)
    prog = {
        0x8000: [0xCD, 0x10, 0x80,        # call $8010
                 0x28, 0x03,              # jr z,$8008
                 0xC3, 0x20, 0x80,        # jp $8020: the trace stops here
                 0xC9,                    # $8008: ret, reached only through the jr
                 0x3E, 0x01],             # $8009: bytes after a ret that nothing jumps to: data
        0x8010: [0x3A, 0x00, 0x90,        # ld a,($9000)
                 0xC9],                   # ret
        0x8020: [0xE9],                   # jp (hl): stops
        0x8030: [0x21, 0x00, 0x90, 0xC9],  # a handler only a table names: ld hl,$9000 / ret
        0x9000: [0x30, 0x80],             # the table: the word $8030
    }
    for a, bs in prog.items():
        mem[a:a + len(bs)] = bytes(bs)
    starts, code = trace(mem, [0x8000])
    assert code == set(range(0x8000, 0x8009)) | set(range(0x8010, 0x8014)) | {0x8020}, sorted(code)
    assert 0x8030 not in code                     # a trace cannot find it
    starts, code = trace(mem, [0x8000, 0x8030])   # an executed map, or --entry, can
    assert set(range(0x8030, 0x8034)) <= code
    with tempfile.TemporaryDirectory() as d:
        game = os.path.join(d, "g")
        os.makedirs(os.path.join(game, "work"))
        sna = os.path.join(game, "work", "x.sna")
        open(sna, "wb").write(bytes(snapshot.SNA_HEADER) + bytes(mem[RAM_LO:]))
        json.dump({"blocks": [{"start": 0x8000, "end": 0x8008, "type": "Code"},
                              {"start": 0x8010, "end": 0x8013, "type": "Byte"},     # code typed as data
                              {"start": 0x8040, "end": 0x8041, "type": "Code"}],    # never reached
                   "symbols": [], "comments": []}, open(os.path.join(game, "symbols.json"), "w"))
        open(os.path.join(game, "work", "cov.txt"), "w").write("8030 8033\n$8020")
        import contextlib, io
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            rc = build(game, sna, [0x8000], [os.path.join(game, "work", "cov.txt")])
        text = out.getvalue()
        assert rc == 1, text
        assert "$8010-$8013  4" in text and "$8030-$8033  4" in text, text          # typed as data
        assert "$8040-$8041  2" in text, text                                        # typed Code, unreached
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            refs(game, sna, 0x9000)
        text = out.getvalue()
        assert "$8010  ld a,($9000)" in text and "$8030  ld hl,$9000" in text, text
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            refs(game, sna, 0x8030)
        assert "$9000  data" in out.getvalue(), out.getvalue()                       # the table entry
    print("ok - codemap.py self-check: the trace stops where it must, a map adds what it cannot see, "
          "code typed as data is reported, refs finds operands and stored words")


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--test":
        test(); return
    if len(argv) < 2:
        sys.exit(__doc__)
    gdir, sna, rest = argv[0], argv[1], argv[2:]
    if "--refs" in rest:
        refs(gdir, sna, hexarg(rest[rest.index("--refs") + 1])); return
    entries = [hexarg(rest[i + 1]) for i, a in enumerate(rest) if a == "--entry"]
    maps = [rest[i + 1] for i, a in enumerate(rest) if a == "--map"]
    if not entries and not maps:
        sys.exit("give at least one --entry or --map: the trace needs somewhere to start")
    sys.exit(build(gdir, sna, entries, maps))


if __name__ == "__main__":
    main()
