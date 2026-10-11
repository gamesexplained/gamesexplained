#!/usr/bin/env python3
"""Hold reference/cast.png and reference/figures.png, the Characters tab's pictures, against the
game's own code.

figures.png is every character's figure, 1 to 39, drawn by graphics command 2 (gp, line 7050)
facing right on an empty screen, paper white and ink black, each in a box 40 pixels wide and 24
high round column 14 of the figures' row.

cast.png is every place a character starts at, drawn as line 5105 draws it when you arrive:
the place's picture (lines 7010-7039), then each object lying there that is not in a chest or
cupboard (lines 5110-5118), then each character that starts there (lines 5120-5125), at the
column and facing the tape gives it. You are left out (line 5105 puts you at a random column),
and the objects all face right, where line 5118 picks each one's facing at random. One tile of
256 x 128 to a place, nine to a row, in the order of the places' numbers.

Both are drawn here in SkoolKit's Z80 simulator on the bytes of the committed listing.json, with
the 48K ROM from SkoolKit's own copy, and compared pixel by pixel and colour by colour. The
page's own list of commands for each place, VH.scene in reference/valhalla-page.js, is held
against the same port first.

  python3 games/spectrum/valhalla/test_cast.py            check
  python3 games/spectrum/valhalla/test_cast.py --write    draw both files again
"""
import os
import struct
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import test_pictures as P  # noqa: E402  (rom, commands, and the kit's simulate and port_check)

CHR, MAP, FACING = 0xBC2B, 0xBF3F, 0xC4F7       # the data of c$(39,20), m$(81,18) and d(39)
FIG_W, FIG_H, FIG_COL = 40, 24, 14
PAL = bytes.fromhex("000000" "0000d7" "d70000" "d700d7" "00d700" "00d7d7" "d7d700" "d7d7d7"
                    "000000" "0000ff" "ff0000" "ff00ff" "00ff00" "00ffff" "ffff00" "ffffff")


def c(mem, n, i):
    return mem[CHR + 20 * (n - 1) + i - 1]


def m(mem, h, i):
    return mem[MAP + 18 * (h - 1) + i - 1]


def facing(mem, n):
    """d(n), a small integer in the ROM's five-byte form: 0, sign, low, high, 0."""
    a = FACING + 5 * (n - 1)
    if mem[a] or mem[a + 1] or mem[a + 4] or mem[a + 3]:
        sys.exit(f"d({n}) is not a small integer: {list(mem[a:a + 5])}")
    return mem[a + 2]


def starts(mem):
    """The places characters 2 to 39 start at, in order."""
    return sorted({c(mem, n, 13) for n in range(2, 40)})


def scene(mem, h):
    """The graphics commands that draw place h as you arrive, without you."""
    out = [list(x) for x in P.commands(mem, h)]
    taken, ct = set(), 0
    for j in range(6, 17, 2):
        g, x = m(mem, h, j), m(mem, h, j + 1)
        if not g or x == 255:
            continue
        if x in taken:
            sys.exit(f"place {h}: two objects in column {x}; line 5114 would move one at random")
        taken.add(x)
        if not ct and g in (68, 73):        # the first chest or cupboard is the picture's own
            ct = g
            continue
        out.append([2, g, x, 0, 1])
    cols = set()
    for n in range(2, 40):
        if c(mem, n, 13) != h:
            continue
        x = c(mem, n, 14)
        if x in cols:
            sys.exit(f"place {h}: two characters in column {x}; line 5121 would move one at random")
        cols.add(x)
        out.append([2, n, x, 0, facing(mem, n)])
    return out


def run(mem, cmd):
    """One graphics command through $F7AF, as LET x$=STR$ USR gi runs it."""
    mem[P.X_STR:P.X_STR + len(cmd)] = cmd
    mem[0x5C4D], mem[0x5C4E] = P.X_STR & 255, P.X_STR >> 8          # DEST
    mem[0x5C72], mem[0x5C73] = len(cmd), 0                          # STRLEN
    mem[P.SP], mem[P.SP + 1] = P.RET & 255, P.RET >> 8
    sim = P.simulate.simulator()(mem, registers={"SP": P.SP, "PC": P.GRAPHICS, "IY": 0x5C3A, "^HL": 0x2758},
                                 state={"iff": 0, "im": 1}, config={"fast_djnz": False, "fast_ldir": False})
    ops, r, n = sim.opcodes, sim.registers, 0
    while r[24] != P.RET:
        ops[mem[r[24]]]()
        n += 1
        if n > 30_000_000:
            sys.exit(f"command {cmd} did not return")


def screen(base, cmds, attr):
    mem = bytearray(base)
    mem[0x4000:0x5800] = bytes(0x1800)
    mem[0x5800:0x5B00] = bytes([attr]) * 0x300
    for cmd in cmds:
        run(mem, cmd)
    return mem


def pixels(mem, x0, y0, w, h):
    """Rows of palette indexes, colour + 8 when bright."""
    rows = []
    for y in range(y0, y0 + h):
        a = 0x4000 | ((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2)
        row = []
        for x in range(x0, x0 + w):
            attr, b = mem[0x5800 + (y >> 3) * 32 + (x >> 3)], mem[a + (x >> 3)]
            br = 8 if attr & 0x40 else 0
            row.append((attr & 7) + br if b >> (7 - (x & 7)) & 1 else ((attr >> 3) & 7) + br)
        rows.append(row)
    return rows


def drawn(base):
    """Both sheets as the game's code draws them: (cast, figures), rows of palette indexes."""
    places = starts(base)
    cast = [[0] * (256 * 9) for _ in range(128 * ((len(places) + 8) // 9))]
    for k, h in enumerate(places):
        t = pixels(screen(base, scene(base, h), 0x38), 0, 0, 256, 128)
        for y in range(128):
            cast[(k // 9) * 128 + y][(k % 9) * 256:(k % 9) * 256 + 256] = t[y]
    figures = [[0] * (FIG_W * 39) for _ in range(FIG_H)]
    for n in range(1, 40):
        t = pixels(screen(base, [[2, n, FIG_COL, 0, 1]], 0x38), FIG_COL * 8 - 16, 96, FIG_W, FIG_H)
        for y in range(FIG_H):
            figures[y][(n - 1) * FIG_W:n * FIG_W] = t[y]
    return cast, figures


def write_png(path, rows):
    """4-bit indexed, the Spectrum's 16 colours, no filters."""
    h, w = len(rows), len(rows[0])
    raw = b"".join(b"\x00" + bytes((r[i] << 4) | r[i + 1] for i in range(0, w, 2)) for r in rows)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 4, 3, 0, 0, 0))
                           + chunk(b"PLTE", PAL) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def read_png(path):
    data = open(path, "rb").read()
    w, h = struct.unpack(">II", data[16:24])
    idat, i = b"", 8
    while i < len(data):
        n, t = struct.unpack(">I4s", data[i:i + 8])
        if t == b"IDAT":
            idat += data[i + 8:i + 8 + n]
        i += 12 + n
    raw, rows, stride = zlib.decompress(idat), [], w // 2 + 1
    for y in range(h):
        line = raw[y * stride:(y + 1) * stride]
        if line[0]:
            sys.exit(f"{os.path.basename(path)} uses a PNG filter this test does not read")
        rows.append([v for b in line[1:] for v in (b >> 4, b & 15)])
    return rows


def main(args):
    try:
        P.simulate.simulator()
    except SystemExit:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise
        print("no SkoolKit: the oracle of test_cast.py is missing, so it is skipped "
              "(python3 kit/scripts/tools.py --platform spectrum get-skoolkit installs it)")
        return 0
    base = bytearray(P.port_check.image(HERE))
    base[0:0x4000] = P.rom()
    places = starts(base)
    page = P.port_check.ask(HERE, "reference/valhalla-page.js", "VH",
                            "const ram = game.listing().ram;\nreturn request.places.map(h => VH.scene(ram, h));",
                            {"places": places})
    for h, cmds in zip(places, page):
        if cmds != scene(base, h):
            print(f"not ok - place {h}: the page sends {cmds}, lines 5105-5125 {scene(base, h)}")
            return 1
    cast, figures = drawn(base)
    files = (("cast.png", cast), ("figures.png", figures))
    if "--write" in args:
        for name, rows in files:
            write_png(os.path.join(HERE, "reference", name), rows)
        print("wrote reference/cast.png and reference/figures.png")
        return 0
    for name, rows in files:
        have = read_png(os.path.join(HERE, "reference", name))
        if len(have) != len(rows) or len(have[0]) != len(rows[0]):
            print(f"not ok - {name} is {len(have[0])} x {len(have)}, the game's drawing {len(rows[0])} x {len(rows)}")
            return 1
        for y, (a, b) in enumerate(zip(have, rows)):
            if a != b:
                x = next(i for i in range(len(a)) if a[i] != b[i])
                print(f"not ok - {name}: pixel ({x}, {y}) is {a[x]}, {b[x]} from the game's code")
                return 1
    print(f"ok - test_cast.py: {len(places)} places with their cast in cast.png and 39 figures in figures.png "
          "are the game's own drawing, and the page lists the commands that draw them")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
