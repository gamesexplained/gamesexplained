#!/usr/bin/env python3
"""Which bytes of a Z80 image are code, and whether symbols.json agrees.

A control file has no flow tracer behind it: SkoolKit decodes what a `c`
block tells it to and nothing else. Code typed as data is then invisible:
it has no cross-references, reads as a table, and coverage still reaches
100 %. The first Spectrum game had 5.9 KB of it. This builds the code map
from two sources and holds symbols.json against it.

  codemap.py <game dir> <snapshot.sna> [--entry ADDR ...] [--map FILE ...] [--inline ADDR:N ...]
      Each option takes every value after it, up to the next option.
      A recursive trace from each --entry (and from every address in each
      --map, an executed-address list: one hex address per line or
      space-separated, with or without `$`, as ZEsarUX's
      `cpu-code-coverage get` prints them). Reports code the map has that
      symbols.json types as data, and Code blocks neither source reached.
      Writes <game dir>/codemap.json: addresses only, no byte of the game,
      so it is committed beside symbols.json (#184). Code that ran is the
      evidence: check_listing.py fails the game, and this exits 1, while
      symbols.json types any of it as data. Code only the trace reached is
      reported to be read, since a trace can walk into data (an inline table
      after a call). --inline ADDR:N names a routine at ADDR that takes N
      bytes of arguments after each CALL to it and returns past them: the
      trace goes on after the arguments instead of decoding them as code.
      Name every such routine the annotation found, or the trace walks
      from its arguments into whatever they decode to.
  codemap.py <game dir> <snapshot.sna> --refs ADDR
      Every instruction in codemap.json's code whose operand is ADDR,
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


def trace(mem, entries, inline=None):
    """(instruction starts, code bytes) reached from the entries; inline maps a routine's
    address to the number of argument bytes that follow each CALL to it."""
    inline = inline or {}
    starts, code, work = set(), set(), list(entries)
    while work:
        a = work.pop()
        while RAM_LO <= a < 0x10000 and a not in starts:
            ins = instruction(mem, a)
            if ins is None:
                break
            n, text, targets, stops = ins
            starts.add(a)
            code.update(range(a, a + n))
            work.extend(t for t in targets if RAM_LO <= t < 0x10000 and t not in starts)
            if stops:
                break
            a += n
            if text.startswith("call") and targets:
                a += inline.get(targets[0], 0)        # the arguments after the CALL are data
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


def options(rest):
    """(entries, maps, inline) from the arguments after the snapshot. Each option takes every
    value up to the next option, so a shell glob after --map and a list of addresses after
    --entry are all read; a value before any option is an error."""
    opts, opt = {"--entry": [], "--map": [], "--inline": []}, None
    for a in rest:
        if a in opts:
            opt = a
        elif opt is None:
            sys.exit(f"{a}: give it after --entry, --map or --inline")
        else:
            opts[opt].append(a)
    inline = {}
    for a in opts["--inline"]:
        at, _, n = a.partition(":")
        if not n.isdigit():
            sys.exit(f"--inline {a}: give the routine and its argument bytes, as ADDR:N")
        inline[hexarg(at)] = int(n)
    return [hexarg(a) for a in opts["--entry"]], opts["--map"], inline


def build(gdir, sna, entries, maps, inline=None):
    mem = bytearray(snapshot.read(sna))
    executed = set()
    for m in maps:
        executed |= {a for a in read_map(m) if a >= RAM_LO}
    starts, code = trace(mem, list(entries) + sorted(executed), inline)
    ex_bytes = set()
    for a in executed:
        ins = instruction(mem, a)
        ex_bytes.update(range(a, a + (ins[0] if ins else 1)))
    sym = json.load(open(os.path.join(gdir, "symbols.json")))
    typed = set()
    for b in sym["blocks"]:
        if b["type"] == "Code":
            typed.update(range(b["start"], b["end"] + 1))
    with open(os.path.join(gdir, "codemap.json"), "w") as f:
        json.dump({"starts": sorted(starts), "code": runs(code), "executed": sorted(executed),
                   "ran": runs(ex_bytes)}, f)
    as_data, unreached = code - typed, typed - code
    ran_as_data = as_data & ex_bytes
    print(f"code map: {len(code)} bytes in {len(runs(code))} runs "
          f"({len(ex_bytes)} executed, {len(code - ex_bytes)} reached by the trace alone)")
    print(f"symbols.json types {len(typed)} bytes as Code")
    for what, part in (("code that ran, typed as data", ran_as_data),
                       ("code only the trace reached, typed as data (read it: a trace can walk into data)",
                        as_data - ran_as_data)):
        print(f"{what}: {len(part)} bytes in {len(runs(part))} runs")
        for s, e in sorted(runs(part), key=lambda r: r[0] - r[1])[:40]:
            print(f"  ${s:04X}-${e:04X}  {e - s + 1}")
    print(f"typed Code, reached by neither source: {len(unreached)} bytes in {len(runs(unreached))} runs "
          "(a handler in a table, an operand written at run time, or data)")
    for s, e in runs(unreached)[:40]:
        print(f"  ${s:04X}-${e:04X}  {e - s + 1}")
    return 1 if ran_as_data else 0


def refs(gdir, sna, target):
    mem = bytearray(snapshot.read(sna))
    path = os.path.join(gdir, "codemap.json")
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
    code, sset = {a for s, e in cm["code"] for a in range(s, e + 1)}, set(starts)
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
        0x8060: [0xCD, 0x70, 0x80,        # call $8070, which takes two bytes after the call:
                 0xC3, 0x00,              #   jp $C900 if they were read as code
                 0xC9],                   # $8065: ret, where the routine returns to
        0x8070: [0xC9],
    }
    for a, bs in prog.items():
        mem[a:a + len(bs)] = bytes(bs)
    starts, code = trace(mem, [0x8000])
    assert code == set(range(0x8000, 0x8009)) | set(range(0x8010, 0x8014)) | {0x8020}, sorted(code)
    assert 0x8030 not in code                     # a trace cannot find it
    starts, code = trace(mem, [0x8000, 0x8030])   # an executed map, or --entry, can
    assert set(range(0x8030, 0x8034)) <= code
    starts, code = trace(mem, [0x8060])           # without --inline the arguments read as a jump
    assert 0x8063 in starts and 0xC900 in starts, "the arguments were not decoded as a jump"
    assert options(["--entry", "8000", "$8030", "--map", "a.txt", "b.txt", "--inline", "8070:2"]) == \
        ([0x8000, 0x8030], ["a.txt", "b.txt"], {0x8070: 2})          # every value after an option
    starts, code = trace(mem, [0x8060], {0x8070: 2})
    assert code == {0x8060, 0x8061, 0x8062, 0x8065, 0x8070}, sorted(code)
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
        cm = json.load(open(os.path.join(game, "codemap.json")))                     # beside symbols.json
        assert cm["code"][0] == [0x8000, 0x8008] and [0x8030, 0x8033] in cm["ran"], cm
        ran, traced = text.split("code only the trace reached")
        assert "$8030-$8033  4" in ran and "$8010-$8013  4" in traced, text          # typed as data
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
          "code typed as data is reported, refs finds operands and stored words, "
          "--inline skips a call's arguments")


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
    entries, maps, inline = options(rest)
    if not entries and not maps:
        sys.exit("give at least one --entry or --map: the trace needs somewhere to start")
    sys.exit(build(gdir, sna, entries, maps, inline))


if __name__ == "__main__":
    main()
