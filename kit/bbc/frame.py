#!/usr/bin/env python3
"""Check the site's BBC Micro screen, site/lib/bbc.js, against jsbeeb, pixel by pixel.

In each of modes 0 to 6 the check has BASIC set the mode and hide the cursor, fills the whole
screen with a pattern of its own, saves jsbeeb's picture of it (`screenshot`), draws the same
memory with BBC.render under node, and compares the two at every pixel. A scrolled screen is
checked too: the CRTC's start moved down eight character rows, so the bottom of the picture
comes from the memory that wraps round to the screen's start. Mode 7, teletext, is not drawn
by bbc.js and is not checked.

It resets the machine it is given, so give it one of its own:

  python3 kit/scripts/tools.py --platform bbc jsbeeb --port 6848
  KIT_JSBEEB_PORT=6848 python3 kit/bbc/frame.py test
  python3 kit/scripts/tools.py --platform bbc stop --port 6848

The parts that need no emulator are kit/bbc/test_frame.py, which CI runs.

Usage:
  frame.py test [--keep]     --keep leaves the pictures in tools/logs/bbc-frame/
"""
import json, os, struct, subprocess, sys, tempfile, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(ROOT, "site", "lib", "bbc.js")
OUT = os.path.join(ROOT, "tools", "logs", "bbc-frame")
# The eight physical colours as jsbeeb draws them (src/video.js, collook), in RGB.
RGB = {(0, 0, 0): 0, (255, 0, 0): 1, (0, 255, 0): 2, (255, 255, 0): 3,
       (0, 0, 255): 4, (255, 0, 255): 5, (0, 255, 255): 6, (255, 255, 255): 7}


def png_pixels(path):
    """(width, height, [colour number or None for each pixel]) from an 8-bit RGB PNG whose
    rows are unfiltered, as the kit's server writes them."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        sys.exit(f"{path}: not a PNG")
    at, idat, w = 8, b"", None
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
    raw = zlib.decompress(idat)
    px, stride = [], w * 3 + 1
    for y in range(h):
        row = raw[y * stride:(y + 1) * stride]
        if row[0] != 0:
            sys.exit(f"{path}: row {y} uses PNG filter {row[0]}; the kit's server writes none")
        px.extend(RGB.get(tuple(row[1 + 3 * x:4 + 3 * x])) for x in range(w))
    return w, h, px


def render(ram, mode, base, palette=None):
    """BBC.render from site/lib/bbc.js, under node: (w, h, [physical colour of each pixel])."""
    with tempfile.TemporaryDirectory() as d:
        mem, out = os.path.join(d, "ram"), os.path.join(d, "px")
        open(mem, "wb").write(ram)
        script = ("const fs = require('fs'), vm = require('vm');"
                  "vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf8'));"
                  "const r = BBC.render(new Uint8Array(fs.readFileSync(process.argv[2])), JSON.parse(process.argv[4]));"
                  "fs.writeFileSync(process.argv[3], Buffer.from(r.px));"
                  "console.log(JSON.stringify({w: r.w, h: r.h}));")
        opts = json.dumps({"mode": mode, "base": base, "palette": palette})
        r = subprocess.run(["node", "-e", script, LIB, mem, out, opts], capture_output=True, text=True)
        if r.returncode:
            sys.exit(f"bbc.js under node failed:\n{r.stderr}")
        size = json.loads(r.stdout)
        return size["w"], size["h"], list(open(out, "rb").read())


def first_lit(get, width, height):
    """(x, y) of the top-left of what is not black: the leftmost column and the top row."""
    rows = [y for y in range(height) if any(get(x, y) for x in range(width))]
    cols = [x for x in range(width) if any(get(x, y) for y in rows)]
    return cols[0], rows[0]


def compare(shot, expected):
    """(pixels that differ, (x, y) of the picture in the screenshot). jsbeeb draws each pixel
    640 / w of its frame's pixels wide and two tall. No logical colour is black in the check's
    palette, so the picture is where the screenshot stops being black, and only the blank
    lines of modes 3 and 6 are black inside it."""
    W, H, spx = shot
    w, h, epx = expected
    pw = 640 // w
    sx, sy = first_lit(lambda x, y: spx[y * W + x], W, H)
    ex, ey = first_lit(lambda x, y: epx[y * w + x], w, h)
    dx, dy = sx - ex * pw, sy - ey * 2
    bad = 0
    for y in range(h):
        for x in range(w):
            for fx, fy in ((dx + x * pw, dy + y * 2), (dx + x * pw + pw - 1, dy + y * 2 + 1)):
                got = spx[fy * W + fx] if 0 <= fx < W and 0 <= fy < H else None
                if got != epx[y * w + x]:
                    bad += 1
                    break
    return bad, (dx, dy)


def pattern(a):
    """A byte for every screen address: every bit set and clear somewhere in every column and
    every line of a cell, and no two neighbouring cells alike."""
    return (a * 151 + (a >> 3) * 17 + (a >> 8)) & 0xFF


# The check's palette, typed as VDU 19: logical 0 is blue rather than black, and mode 2's
# flashing colours 8 to 15 are steady, so that nothing in the picture is black but the blank
# lines of modes 3 and 6, and a still picture is the same whichever moment it is taken.
PALETTES = {1: [4, 7], 2: [4, 1, 3, 7], 4: [4, 1, 2, 3, 4, 5, 6, 7, 5, 1, 2, 3, 4, 5, 6, 7]}
BPP = {0: 1, 1: 2, 2: 4, 3: 1, 4: 1, 5: 2, 6: 1}
SIZE = {0: 0x5000, 1: 0x5000, 2: 0x5000, 3: 0x4000, 4: 0x2800, 5: 0x2800, 6: 0x2000}
ROW = {0: 640, 1: 640, 2: 640, 3: 640, 4: 320, 5: 320, 6: 320}


def test(keep=False):
    sys.path.insert(0, HERE)
    from jsbeeb import connect
    os.makedirs(OUT, exist_ok=True)
    failed = 0
    with connect() as m:
        for mode, scroll in ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0), (1, 8), (4, 8)):
            pal = PALETTES[BPP[mode]]
            vdu = ";".join(f"19,{n},{p};0" for n, p in enumerate(pal) if n == 0 or n >= 8)   # the rest are the MOS's
            m.boot()
            m.type(f"MODE {mode}\nVDU 23,1,0;0;0;0;\nVDU {vdu};\n")
            m.frames(2)
            crtc = m.chips()["crtc"]
            start = ((crtc[12] << 8) | crtc[13]) * 8
            size = SIZE[mode]
            m.write(0x8000 - size, bytes(pattern(a) for a in range(0x8000 - size, 0x8000)))
            if scroll:          # the CRTC starts the picture `scroll` character rows further on
                start += scroll * ROW[mode]
                ma = start // 8
                for reg, val in ((12, ma >> 8), (13, ma & 0xFF)):
                    m.write(0xFE00, bytes([reg]), io=True)
                    m.write(0xFE01, bytes([val]), io=True)
            m.frames(3)
            path = os.path.join(OUT, f"mode{mode}{'-scrolled' if scroll else ''}.png")
            m.screenshot(path)
            ram = bytes(m.read(0, 0x8000)) + bytes(0x8000)
            expected = render(ram, mode, start, pal)
            bad, at = compare(png_pixels(path), expected)
            name = f"mode {mode}" + (f", scrolled {scroll} rows" if scroll else "")
            print(f"{'PASS' if not bad else 'FAIL'}  {name}: {bad} of {expected[0] * expected[1]} pixels differ"
                  f" (the picture at {at[0]}, {at[1]} in the screenshot; the screen starts at ${start:04X})")
            failed += bool(bad)
            if not keep and not bad:
                os.remove(path)
    print("nothing differed" if not failed else f"{failed} picture(s) differed; kept in {os.path.relpath(OUT, ROOT)}")
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
