#!/usr/bin/env python3
"""Check the site's Commodore 16 screen, site/lib/c16.js, against plus4emu, pixel by pixel.

For each case the check stops the KERNAL (two instructions in the tape buffer, SEI and a jump to
itself), fills the screen, the character set and the bitmap with patterns of its own, sets TED's
registers, lets three frames pass, saves plus4emu's picture (`screenshot`) and draws the same
memory with C16.render under node; the two are compared at every pixel of the display window,
whose place in the picture the first case finds. The cases: text with 128 characters and
reverse, with 256, multicolour text with both, extended colour, bitmap, multicolour bitmap, the
KERNAL's own characters from ROM, an impossible mode, the display switched off, flashing
characters and the cursor in each half of TED's flash, and the scroll: in the 38-column, 24-row
window a scrolling game uses, a 26th row brought in by a vertical scroll below 3, and a
horizontal scroll in 40 columns.

It resets the machine it is given, so give it one of its own:

  python3 kit/scripts/tools.py --platform c16 plus4emu --port 7509
  KIT_PLUS4EMU_PORT=7509 python3 kit/c16/frame.py test
  python3 kit/scripts/tools.py --platform c16 stop --port 7509

The parts that need no emulator are kit/c16/test_frame.py, which CI runs.

Usage:
  frame.py test [--keep]     --keep leaves the pictures in tools/logs/c16-frame/
"""
import json, os, random, struct, subprocess, sys, tempfile, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "site", "lib", "c16.js")
OUT = os.path.join(ROOT, "tools", "logs", "c16-frame")
LOOP = 0x0333                 # the tape buffer: SEI, then JMP to itself
SCREEN, CHARS, BITMAP = 0x0800, 0x3000, 0x2000
BORDER = 0x26                 # the first case's border, a colour no other case's window shows


def png_rgb(path):
    """(width, height, [(r, g, b) of each pixel]) from an 8-bit RGB PNG whose rows are
    unfiltered, as the kit's server writes them."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit(f"{path}: not a PNG")
    at, idat, w, h = 8, b"", None, None
    while at < len(data):
        n, kind = struct.unpack(">I4s", data[at:at + 8])
        body = data[at + 8:at + 8 + n]
        if kind == b"IHDR":
            w, h, depth, colour = struct.unpack(">IIBB", body[:10])
            if (depth, colour) != (8, 2):
                sys.exit(f"{path}: {depth}-bit, colour type {colour}; expected 8-bit RGB")
        elif kind == b"IDAT":
            idat += body
        at += 12 + n
    raw, stride = zlib.decompress(idat), w * 3 + 1
    px = []
    for y in range(h):
        row = raw[y * stride:(y + 1) * stride]
        if row[0] != 0:
            sys.exit(f"{path}: row {y} uses PNG filter {row[0]}; the kit's server writes none")
        px.extend(tuple(row[1 + 3 * x:4 + 3 * x]) for x in range(w))
    return w, h, px


def render(ram, ted, flash=1, rom=None):
    """C16.render from site/lib/c16.js, under node: (w, h, [(r, g, b) of each pixel])."""
    with tempfile.TemporaryDirectory() as d:
        mem, romf, out = os.path.join(d, "ram"), os.path.join(d, "rom"), os.path.join(d, "px")
        open(mem, "wb").write(ram)
        open(romf, "wb").write(rom or b"")
        script = ("const fs = require('fs'), vm = require('vm');"
                  "vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf8'));"
                  "const rom = fs.readFileSync(process.argv[3]);"
                  "const r = C16.render(new Uint8Array(fs.readFileSync(process.argv[2])), JSON.parse(process.argv[5]),"
                  " {flash: +process.argv[6], rom: rom.length ? new Uint8Array(rom) : null});"
                  "fs.writeFileSync(process.argv[4], Buffer.from(C16.rgba(r)));"
                  "console.log(JSON.stringify({w: r.w, h: r.h}));")
        r = subprocess.run(["node", "-e", script, LIB, mem, romf, out, json.dumps(list(ted)), str(flash)],
                           capture_output=True, text=True)
        if r.returncode:
            sys.exit(f"c16.js under node failed:\n{r.stderr}")
        size = json.loads(r.stdout)
        b = open(out, "rb").read()
        return size["w"], size["h"], [tuple(b[i:i + 3]) for i in range(0, len(b), 4)]


def window(shot, border_rgb):
    """(x, y) of the display window's top-left: the box of what is not the border colour, which
    must be 320 by 200."""
    W, H, px = shot
    inside = [(x, y) for y in range(H) for x in range(W) if px[y * W + x] != border_rgb]
    xs, ys = [x for x, _ in inside], [y for _, y in inside]
    if not inside or (max(xs) - min(xs) + 1, max(ys) - min(ys) + 1) != (320, 200):
        sys.exit(f"the display window is not 320 by 200 in the screenshot: {len(inside)} pixels inside"
                 + (f", from {min(xs)},{min(ys)} to {max(xs)},{max(ys)}" if inside else ""))
    return min(xs), min(ys)


def compare(shot, at, expected, skip=(0, 0)):
    """(pixels that differ, the first of them as (x, y) in the window, or None). skip leaves out
    the first columns and lines of the window, which c16.js does not claim to draw exactly."""
    W, H, spx = shot
    w, h, epx = expected
    x0, y0 = at
    bad, first = 0, None
    for y in range(skip[1], h):
        for x in range(skip[0], w):
            if spx[(y0 + y) * W + x0 + x] != epx[y * w + x]:
                bad += 1
                first = first or (x, y)
    return bad, first


def colour(rnd):
    """A random TED colour byte other than the first case's border and black, whose colour 0
    looks the same at every luminance."""
    while True:
        c = rnd.randrange(0x80)
        if c & 0x0F and c != BORDER:
            return c


class Case:
    def __init__(self, name, regs, attrs="plain", rom=False, flash=None, skip=(0, 0)):
        self.name, self.regs, self.attrs, self.rom, self.flash, self.skip = name, regs, attrs, rom, flash, skip


# TED's registers for each case, beside the defaults below: $FF06 and $FF07 pick the mode, the
# rows and columns and the scroll; $FF12 the bitmap at $2000 and where characters come from;
# $FF13 the characters at $3000 (or the KERNAL's at $D000, from ROM); $FF14 the screen at $0800.
BASE = {0x06: 0x1B, 0x07: 0x08, 0x0C: 0x03, 0x0D: 0xFF, 0x12: 0x08, 0x13: 0x30, 0x14: 0x08}
CASES = [
    Case("text, 128 characters and reverse", {}),
    Case("text, 256 characters", {0x07: 0x88}),
    Case("multicolour text, 128 characters", {0x07: 0x18}, attrs="flash"),
    Case("multicolour text, 256 characters", {0x07: 0x98}, attrs="flash"),
    Case("extended colour", {0x06: 0x5B}),
    Case("bitmap", {0x06: 0x3B}),
    Case("multicolour bitmap", {0x06: 0x3B, 0x07: 0x18}),
    Case("the KERNAL's characters, from ROM", {0x12: 0x0C, 0x13: 0xD0}, rom=True),
    Case("the KERNAL's 256 characters, from ROM", {0x07: 0x88, 0x12: 0x0C, 0x13: 0xD0}, rom=True),
    Case("extended colour with bitmap, a mode TED does not have", {0x06: 0x7B}),
    Case("the display off", {0x06: 0x0B}),
    Case("flashing characters and the cursor", {0x0C: 0x01, 0x0D: 0xF4}, attrs="flash", flash=True),
    Case("scrolled 5 right and 2 up, in 38 columns and 24 rows", {0x06: 0x11, 0x07: 0x05}),
    Case("scrolled 2 right and 3 down, in 38 columns and 24 rows", {0x06: 0x16, 0x07: 0x02}),
    Case("a bitmap scrolled 7 right and 3 up, in 38 columns and 24 rows", {0x06: 0x30, 0x07: 0x07}),
    Case("scrolled 2 up in 25 rows: a 26th row", {0x06: 0x19}),
    # In 40 columns and 25 rows a scroll leaves pixels to what TED last held, which c16.js draws in
    # the background colour and does not claim to match; the rest of the window must
    Case("scrolled 3 right in 40 columns, beside the first 3 pixels of each line", {0x07: 0x0B}, skip=(3, 0)),
    Case("scrolled 2 down in 25 rows, below the first 2 lines", {0x06: 0x1D}, skip=(0, 2)),
]


def test(keep=False):
    sys.path.insert(0, HERE)
    from plus4emu import connect
    os.makedirs(OUT, exist_ok=True)
    rnd = random.Random(16)
    failed, at = 0, None
    with connect() as m:
        m.reset(hard=True)
        m.frames(150)
        m.write(LOOP, bytes([0x78, 0x4C, (LOOP + 1) & 0xFF, (LOOP + 1) >> 8]))
        m.set_registers(pc=LOOP)
        m.frames(2)
        rom = bytes(m.read(0x8000, 0x4000, space="basic")) + bytes(m.read(0xC000, 0x4000, space="kernal"))
        border_rgb = None
        for case in CASES:
            regs = dict(BASE)
            regs.update({0x15 + i: colour(rnd) for i in range(4)})
            regs[0x19] = BORDER if at is None else colour(rnd)
            regs.update(case.regs)
            attrs = bytes((colour(rnd) | (0x80 if case.attrs == "flash" and rnd.random() < 0.5 else 0)) for _ in range(0x400))
            chars = bytes(rnd.randrange(256) for _ in range(0x400))
            m.write(SCREEN, attrs + chars)
            m.write(BITMAP, bytes(rnd.randrange(256) for _ in range(0x1000)))
            m.write(CHARS, bytes(rnd.randrange(256) for _ in range(0x1000)))
            for r, v in sorted(regs.items()):
                m.write(0xFF00 + r, bytes([v]))
            ted = [regs.get(i, 0) for i in range(32)]
            shots = []
            for k in range(2 if case.flash else 1):
                m.frames(3 if k == 0 else 16)
                path = os.path.join(OUT, f"{CASES.index(case):02d}{'abc'[k]}.png")
                m.screenshot(path)
                shots.append((path, png_rgb(path)))
            if at is None:
                border_rgb = shots[0][1][2][0]
                at = window(shots[0][1], border_rgb)
            ram = bytes(m.read(0, 0x4000, space="ram"))
            phases = [render(ram, ted, flash, rom if case.rom else None) for flash in (1, 0)]
            seen, worst = [], None
            for path, shot in shots:
                diffs = [compare(shot, at, ph, case.skip) for ph in phases]
                best = min(range(2), key=lambda i: diffs[i][0])
                seen.append(best if case.flash else 0)
                if worst is None or diffs[seen[-1]][0] > worst[0]:
                    worst = diffs[seen[-1]]
            ok = worst[0] == 0 and (not case.flash or seen[0] != seen[1])
            n = (320 - case.skip[0]) * (200 - case.skip[1])
            print(f"{'PASS' if ok else 'FAIL'}  {case.name}: {worst[0]} of {n} pixels differ"
                  + (f", the first at {worst[1][0]},{worst[1][1]} in the window" if worst[1] else "")
                  + (f"; the flash's halves seen: {', '.join(('lit', 'dark')[s] for s in seen)}" if case.flash else ""))
            failed += not ok
            if ok and not keep:
                for path, _ in shots:
                    os.remove(path)
    print(f"the display window at {at[0]},{at[1]} in plus4emu's picture; "
          + ("nothing differed" if not failed else f"{failed} case(s) differed; pictures kept in {os.path.relpath(OUT, ROOT)}"))
    sys.exit(1 if failed else 0)


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "test":
        test(keep="--keep" in a); return
    sys.exit(__doc__)


if __name__ == "__main__":
    main()
