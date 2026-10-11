#!/usr/bin/env python3
"""Hold reference/pictures.png, the 81 location pictures on the page, against the game's own code.

Each picture is drawn here the way the game draws it when you arrive: the commands
BASIC lines 7010-7039 send for the location (worked out below, with the ROM's RND),
run through the graphics entry at $F7AF in SkoolKit's Z80 simulator on the bytes of
the committed listing.json, with the 48K ROM from SkoolKit's own copy (the drawers
call its PLOT-SUB and DRAW-LINE). The screen's top sixteen character rows are then
compared, pixel by pixel and colour by colour, with the location's tile in the sheet.

The page's own list of commands for each location, VH.commands in
reference/valhalla-page.js, is held against the same port first.

Nothing private is needed: no game image, no snapshot, no emulator. Run it as a
script; it exits 1 on the first picture or command list that differs.

  python3 games/spectrum/valhalla/test_pictures.py [location ...]
"""
import os
import struct
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "spectrum", "simulate.py")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_pictures.py must run from inside the repository")
    ROOT = parent
sys.path.insert(0, os.path.join(ROOT, "kit", "spectrum"))
sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
import simulate  # noqa: E402
import port_check  # noqa: E402

GRAPHICS, X_STR, SP, RET = 0xF7AF, 0x5B00, 0xD040, 0xFFFE
MAP, SPECIAL = 0xBF3F, 0xC64C          # the data of m$(81,18) and s$(36,9)


def rom():
    """The 48K ROM from the SkoolKit the simulator came from: tools/skoolkit, or the one CI
    installs with pip."""
    package = os.path.dirname(sys.modules[simulate.simulator().__module__].__file__)
    p = os.path.join(package, "resources", "48.rom")
    if not os.path.isfile(p):
        sys.exit(f"SkoolKit's 48.rom was not found in {package}")
    return open(p, "rb").read()


class Rnd:
    """BASIC's RND: RANDOMIZE n sets SEED to n; each RND makes it (75 x (SEED + 1)) mod 65537 - 1."""
    def __init__(self, n):
        self.seed = n

    def __call__(self):
        self.seed = (75 * (self.seed + 1)) % 65537 - 1
        return self.seed / 65536


def commands(mem, h):
    """The graphics commands lines 7010-7039 send for location h, in order (mprop, line 3760,
    gives te and tb first)."""
    row = lambda h: mem[MAP + 18 * (h - 1): MAP + 18 * h]
    srow = lambda n: mem[SPECIAL + 9 * (n - 1): SPECIAL + 9 * n]
    r = row(h)
    te, sp = r[0] or 3, 0
    if te > 128:
        sp = te - 128
        te = srow(sp)[0]
    tb = 3
    if h <= 72:
        tb = row(h + 9)[0]
        if tb > 128:
            tb = srow(tb - 128)[0]
    tb = {8: 6, 0: 3}.get(tb, tb)
    rnd = Rnd(h * 500)
    fr = lambda x: int(rnd() * x) + 1
    out = []
    if h < 46 or h in (56, 57, 65, 66, 81):
        out.append([19])
    out.append([1, h >> 4, h & 15, te, tb])
    if te == 8:
        j = fr(3)
        while j <= 14:
            out.append([18, 11 * 16 + j])
            j += fr(4) + 1

    def feature(x):
        if x:
            out.append([18, x])
        if not x or x > 79:
            return
        p, x = x >> 4, x & 15
        w = 5 if p == 2 else 4 + 4 * (p > 0)
        if p == 4:
            if rnd() < 0.5:
                out.append([18, 160 + x])
            if rnd() < 0.25:
                out.append([18, 112 + x + 1])
            return
        for k in range(1, w + 1):
            y = 1 if rnd() < 0.5 else 0
            if p < 2 and k == 2:
                y = 1
            if (p == 1 and k in (3, 4)) or (p == 3 and 3 < k < 7):
                continue
            if p == 2:
                y = 0
                if k in (2, 3):
                    continue
            if p == 3:
                y = 0 if k in (3, 7) else 1
            if p == 1 and k == 5:
                y = 0
            out.append([18, (10 + y) * 16 + k + x])

    feature(r[17])
    if sp:
        for x in srow(sp)[5:9]:
            feature(x)
    return out


def draw(base, h):
    """The screen after the commands for h, run on a cleared screen as line 5105 leaves it."""
    mem = list(base)
    mem[0x4000:0x5800] = [0] * 0x1800
    mem[0x5800:0x5B00] = [0x38] * 0x300
    Sim = simulate.simulator()
    for cmd in commands(base, h):
        mem[X_STR:X_STR + len(cmd)] = cmd
        mem[0x5C4D], mem[0x5C4E] = X_STR & 255, X_STR >> 8          # DEST
        mem[0x5C72], mem[0x5C73] = len(cmd), 0                      # STRLEN
        mem[SP], mem[SP + 1] = RET & 255, RET >> 8
        sim = Sim(mem, registers={"SP": SP, "PC": GRAPHICS, "IY": 0x5C3A, "^HL": 0x2758},
                  state={"iff": 0, "im": 1}, config={"fast_djnz": False, "fast_ldir": False})
        ops, r = sim.opcodes, sim.registers
        n = 0
        while r[24] != RET:
            ops[mem[r[24]]]()
            n += 1
            if n > 30_000_000:
                sys.exit(f"location {h}: command {cmd} did not return")
    return mem


def sheet():
    """reference/pictures.png: 4-bit indexed, 9 x 9 tiles of 256 x 128, location 1 bottom left;
    index = colour + 8 when bright."""
    data = open(os.path.join(HERE, "reference", "pictures.png"), "rb").read()
    w, h = struct.unpack(">II", data[16:24])
    idat, i = b"", 8
    while i < len(data):
        n, t = struct.unpack(">I4s", data[i:i + 8])
        if t == b"IDAT":
            idat += data[i + 8:i + 8 + n]
        i += 12 + n
    raw, rows, stride = zlib.decompress(idat), [], w // 2 + 1
    for y in range(h):
        line = raw[y * stride: (y + 1) * stride]
        if line[0]:
            sys.exit("pictures.png uses a PNG filter this test does not read")
        rows.append([v for b in line[1:] for v in (b >> 4, b & 15)])
    return rows


def main(args):
    try:
        simulate.simulator()
    except SystemExit:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise
        print("no SkoolKit: the oracle of test_pictures.py is missing, so it is skipped "
              "(python3 kit/scripts/tools.py --platform spectrum get-skoolkit installs it)")
        return 0
    base = bytearray(port_check.image(HERE))
    base[0:0x4000] = rom()
    img = sheet()
    todo = [int(a) for a in args] or list(range(1, 82))
    # the page lists the same commands, from its own port of lines 7010-7039
    page = port_check.ask(HERE, "reference/valhalla-page.js", "VH", "const ram = game.listing().ram;\n"
                          "return request.places.map(h => VH.commands(ram, h));", {"places": todo})
    for h, cmds in zip(todo, page):
        if cmds != commands(base, h):
            print(f"not ok - location {h}: the page sends {cmds}, lines 7010-7039 {commands(base, h)}")
            return 1
    for h in todo:
        mem = draw(base, h)
        gx, gy = (h - 1) % 9 * 256, (8 - (h - 1) // 9) * 128
        for y in range(128):
            a = 0x4000 | ((y & 0xC0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2)
            for cx in range(32):
                attr, b = mem[0x5800 + (y >> 3) * 32 + cx], mem[a + cx]
                br = 8 if attr & 0x40 else 0
                for bit in range(8):
                    want = (attr & 7) + br if b >> (7 - bit) & 1 else ((attr >> 3) & 7) + br
                    if img[gy + y][gx + cx * 8 + bit] != want:
                        print(f"not ok - location {h}: pixel ({cx * 8 + bit}, {y}) is {img[gy + y][gx + cx * 8 + bit]} "
                              f"in pictures.png, {want} from the game's code")
                        return 1
    print(f"ok - test_pictures.py: {len(todo)} location pictures in pictures.png are the game's own drawing, "
          "and the page lists the commands that draw them")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
