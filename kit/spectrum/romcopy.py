#!/usr/bin/env python3
"""Which parts of a snapshot are the machine's ROM, copied into RAM.

A turbo loader, and a tape utility saved along with a game, are often the
ROM's own cassette routines moved up in memory with their timing changed.
Annotated as the game's code they read as an original loader, and listed
they publish the ROM. This finds them before the first block is typed.

  romcopy.py <snapshot.sna> [--rom FILE] [--min N]
      Every stretch of RAM of at least N bytes (default 64) that matches
      the ROM at one constant offset, allowing the bytes a relocation and a
      retiming change: prints the RAM range, the ROM range, the offset and
      how many bytes are equal. Exits 1 when it finds one.
  romcopy.py --test
      self-check on a synthetic image (writes only to a temp dir)

The ROM is read from SkoolKit's own copy under tools/skoolkit (48.rom), so
none is committed here; --rom names another file, such as one read from
the emulator. What to do with a match: leave it out of the listing
(`coverage.exclude` in game.json, with the ROM's name and addresses as the
reason), and describe in facts.md what the copy changes.
"""
import glob, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import snapshot  # noqa: E402

W = 12            # bytes that must match exactly to seed an offset
GAP = 24          # the longest run of differing bytes a stretch may contain


def default_rom():
    for p in glob.glob(os.path.join(ROOT, "tools", "skoolkit", "lib", "python*", "site-packages", "skoolkit", "resources", "48.rom")):
        return p
    sys.exit("no ROM found: run `python3 kit/scripts/tools.py --platform spectrum get-skoolkit`, or pass --rom FILE")


def find(mem, rom, least=64):
    """[(ram start, ram end, rom start, equal bytes)] for stretches of RAM that follow the ROM at one offset."""
    seeds = {}
    for r in range(len(rom) - W):
        key = bytes(rom[r:r + W])
        if len(set(key)) > 3:                      # runs of one value match everywhere
            seeds.setdefault(key, []).append(r)
    offsets = set()
    for a in range(0x4000, 0x10000 - W):
        for r in seeds.get(bytes(mem[a:a + W]), ()):
            offsets.add(a - r)
    out = []
    for off in sorted(offsets):
        lo, hi = max(0x4000, off), min(0x10000, off + len(rom))
        a = lo
        while a < hi:
            if mem[a] != rom[a - off]:
                a += 1; continue
            start = end = a; equal = 0; miss = 0
            while a < hi and miss <= GAP:
                if mem[a] == rom[a - off]:
                    equal += 1; end = a; miss = 0
                else:
                    miss += 1
                a += 1
            if end - start + 1 >= least and equal * 10 >= (end - start + 1) * 8:
                out.append((start, end, start - off, equal))
    return out


def test():
    import random, tempfile
    rnd = random.Random(48)
    rom = bytes(rnd.randrange(256) for _ in range(0x4000))
    mem = bytearray(rnd.randrange(256) for _ in range(0x10000))
    mem[0xF000:0xF200] = rom[0x0500:0x0700]        # a copy of ROM $0500-$06FF at $F000
    for a in range(0xF010, 0xF200, 37):            # with a relocated operand every 37 bytes
        mem[a] ^= 0x5A; mem[a + 1] ^= 0xA5
    mem[0x9000:0x9020] = rom[0x1000:0x1020]        # 32 bytes: shorter than the minimum
    got = find(mem, rom)
    assert len(got) == 1, got
    s, e, r, eq = got[0]
    assert s == 0xF000 and e == 0xF1FF and r == 0x0500, got
    assert eq == 0x200 - 2 * len(range(0xF010, 0xF200, 37)), got
    assert find(mem, rom, least=24) != got                      # the short one is found when asked for
    with tempfile.TemporaryDirectory() as d:
        sna, rp = os.path.join(d, "x.sna"), os.path.join(d, "x.rom")
        open(sna, "wb").write(bytes(snapshot.SNA_HEADER) + bytes(mem[0x4000:]))
        open(rp, "wb").write(rom)
        import contextlib, io
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            rc = report(sna, rp, 64)
        assert rc == 1 and "$F000-$F1FF" in out.getvalue() and "$0500-$06FF" in out.getvalue(), out.getvalue()
    print("ok - romcopy.py self-check: a relocated copy is found with its offset, a short match is left out")


def report(sna, rom_path, least):
    mem = snapshot.read(sna)
    rom = open(rom_path, "rb").read()
    got = find(mem, rom, least)
    if not got:
        print(f"no stretch of {least} bytes or more follows the ROM ({os.path.basename(rom_path)})")
        return 0
    for s, e, r, eq in got:
        n = e - s + 1
        print(f"${s:04X}-${e:04X} is the ROM's ${r:04X}-${r + n - 1:04X} moved by ${(s - r) & 0xFFFF:04X}: "
              f"{eq} of {n} bytes equal, {n - eq} changed")
    print("a copy of the ROM is not the game's code: leave it out of the listing (coverage.exclude) and say in facts.md what it changes")
    return 1


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "--test":
        test(); return
    rom = argv[argv.index("--rom") + 1] if "--rom" in argv else default_rom()
    least = int(argv[argv.index("--min") + 1]) if "--min" in argv else 64
    sys.exit(report(argv[0], rom, least))


if __name__ == "__main__":
    main()
