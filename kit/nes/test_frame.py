#!/usr/bin/env python3
"""The parts of kit/nes/frame.py and site/lib/nes.js that need no emulator.

This is what CI runs. It reads back a PNG written as the kit's server writes one, and runs
nes.js under Node to check its rules against the platform reference's (kit/skills/nes/
nes-reference, "The PPU"): a tile's two planes, an attribute byte's four quarters, the
backdrop, the scroll across the four nametables, sprites with their flips and their Y plus
one, 8 by 16 sprites and their pattern table, eight sprites a line with the lower number in
front, a sprite behind the background hiding the sprites after it, and the left 8 pixels'
clipping. Its palette is checked against jsnes's own when jsnes is installed.

The drawing is checked against the machine by `python3 kit/nes/frame.py test`, which needs a
jsnes server, so it is run by hand after any change to site/lib/nes.js. Node is needed here;
with KIT_REQUIRE_TOOLS set, a missing Node fails instead of skipping.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import frame                                                              # noqa: E402

JSNES_PALETTE = os.path.join(frame.ROOT, "tools", "nes", "node_modules", "jsnes", "src", "ppu", "palette-table.js")

# A small PPU world, built in JavaScript: tile 1 solid colour 1, tile 2 solid colour 2, tile 3 the
# left column only in colour 3 (so a flip moves it), tile 4 the top row only in colour 1; in the
# $1000 table, tile 2 solid colour 3. Each palette entry is its own address's low byte, so a
# pixel's colour number says which entry drew it, and the backdrop is $3F.
SETUP = """
const ppu = new Uint8Array(0x4000), oam = new Uint8Array(256).fill(0xff);
const solid = (base, n, c) => { for (let y = 0; y < 8; y++) { ppu[base + n*16 + y] = c & 1 ? 0xff : 0; ppu[base + n*16 + y + 8] = c & 2 ? 0xff : 0; } };
solid(0, 1, 1); solid(0, 2, 2); solid(0x1000, 2, 3);
for (let y = 0; y < 8; y++) { ppu[3*16 + y] = 0x80; ppu[3*16 + y + 8] = 0x80; }
ppu[4*16] = 0xff;
for (let i = 0; i < 32; i++) ppu[0x3f00 + i] = i; ppu[0x3f00] = 0x3f; ppu[0x3f10] = 0x3f;
const at = (px, x, y) => px[y * 256 + x];
const sprite = (i, y, t, a, x) => { oam[i*4] = y; oam[i*4+1] = t; oam[i*4+2] = a; oam[i*4+3] = x; };
"""


def node_eval(body):
    """The value `body` returns, with site/lib/nes.js and SETUP loaded, as JSON."""
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise AssertionError("no node on the path, and KIT_REQUIRE_TOOLS is set")
        raise unittest.SkipTest("no node on the path: skipped")
    script = (f"require(process.argv[1]);{SETUP}"
              f"console.log(JSON.stringify((function () {{ {body} }})()));")
    r = subprocess.run([node, "-e", script, frame.LIB], capture_output=True, text=True)
    if r.returncode:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


class Picture(unittest.TestCase):
    def test_png_reads_back(self):
        rgb = [(0, 0, 0), (255, 0, 0), (0, 255, 0), (1, 2, 3), (9, 9, 9), (200, 100, 50)]
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "x.png")
            frame.write_png(p, 3, 2, rgb)
            self.assertEqual(frame.png_rgb(p), (3, 2, rgb))


class Rules(unittest.TestCase):
    def test_tile_planes(self):
        got = node_eval("return Array.from(NES.tile([0x80,0,0,0,0,0,0,0, 0xc0,0,0,0,0,0,0,0], 0).slice(0, 3));")
        self.assertEqual(got, [3, 2, 0], "bit 0 from the first eight bytes, bit 1 from the next, leftmost in bit 7")

    def test_backdrop_and_attributes(self):
        got = node_eval("""
            ppu[0x2000] = 1; ppu[0x2002] = 1; ppu[0x2040] = 1; ppu[0x2042] = 1;    // a tile in each quarter
            ppu[0x23c0] = 0b11100100;                                                   // quarters 0, 1, 2, 3
            const px = NES.frame(ppu, oam, {mask: 0x0e});
            return [at(px, 0, 0), at(px, 16, 0), at(px, 0, 16), at(px, 16, 16), at(px, 8, 0)];""")
        self.assertEqual(got, [0x01, 0x05, 0x09, 0x0D, 0x3F], "top left, top right, bottom left, bottom right; the backdrop")

    def test_scroll_crosses_nametables(self):
        got = node_eval("""
            ppu[0x2400] = 1; ppu[0x2800] = 2; ppu[0x2c00] = 1; ppu[0x2fc0] = 0xff;
            const right = NES.frame(ppu, oam, {mask: 0x0e, scrollX: 255});
            const down = NES.frame(ppu, oam, {mask: 0x0e, scrollY: 239});
            const corner = NES.frame(ppu, oam, {mask: 0x0e, ctrl: 3});
            const wrap = NES.frame(ppu, oam, {mask: 0x0e, ctrl: 3, scrollX: 255, scrollY: 239});
            return [at(right, 1, 0), at(down, 0, 1), at(corner, 0, 0), at(wrap, 1, 1)];""")
        self.assertEqual(got, [0x01, 0x02, 0x0D, 0x3F],
                         "nametable 1 to the right, 2 below, 3 from PPUCTRL with its attributes; past 3, back to 0")

    def test_sprite_place_and_flips(self):
        got = node_eval("""
            sprite(0, 9, 3, 0x00, 20); sprite(1, 9, 3, 0x41, 40); sprite(2, 29, 4, 0x82, 60);
            const px = NES.frame(ppu, oam, {mask: 0x1e});
            return [at(px, 20, 9), at(px, 20, 10), at(px, 27, 10), at(px, 47, 10), at(px, 60, 30), at(px, 60, 37)];""")
        self.assertEqual(got, [0x3F, 0x13, 0x3F, 0x17, 0x3F, 0x19],
                         "Y is the line before the top; flipped across, the column moves right; flipped down, the row moves to the bottom")

    def test_tall_sprites(self):
        got = node_eval("""
            sprite(0, 9, 3, 0x00, 20); sprite(1, 9, 2, 0x00, 40); sprite(2, 9, 2, 0x80, 60);
            const px = NES.frame(ppu, oam, {mask: 0x1e, ctrl: 0x20});
            return [at(px, 20, 10), at(px, 20, 18), at(px, 40, 10), at(px, 40, 18), at(px, 60, 10), at(px, 60, 18)];""")
        self.assertEqual(got, [0x13, 0x3F, 0x12, 0x13, 0x13, 0x12],
                         "an odd tile is the $1000 table's, its top the even tile below it and its bottom the next; "
                         "flipped down, the halves swap")

    def test_eight_a_line_lower_in_front(self):
        got = node_eval("""
            for (let i = 0; i < 9; i++) sprite(i, 49, 1, i & 3, 8 * i + 16);
            sprite(9, 49, 2, 0, 16);                 // under sprite 0, and past the eighth
            const px = NES.frame(ppu, oam, {mask: 0x1e});
            return [at(px, 16, 50), at(px, 72, 50), at(px, 80, 50)];""")
        self.assertEqual(got, [0x11, 0x1D, 0x3F], "sprite 0 in front; the eighth drawn; the ninth dropped")

    def test_behind_the_background(self):
        got = node_eval("""
            ppu[0x2000 + 6 * 32 + 2] = 1;                                // background at x 16-23, y 48-55
            sprite(0, 49, 1, 0x21, 16); sprite(1, 49, 2, 0x02, 16);      // 0 behind, 1 in front of it
            sprite(2, 49, 1, 0x23, 32);                                  // behind, over the backdrop
            const px = NES.frame(ppu, oam, {mask: 0x1e});
            return [at(px, 16, 50), at(px, 32, 50)];""")
        self.assertEqual(got, [0x01, 0x1D],
                         "a sprite behind the background still hides the sprites after it; over the backdrop it shows")

    def test_left_clipping(self):
        got = node_eval("""
            ppu[0x2000] = 1; sprite(0, 19, 1, 0, 0);
            const show = NES.frame(ppu, oam, {mask: 0x1e}), hide = NES.frame(ppu, oam, {mask: 0x18});
            return [at(show, 0, 0), at(show, 0, 20), at(hide, 0, 0), at(hide, 0, 20), at(hide, 8, 20)];""")
        self.assertEqual(got, [0x01, 0x11, 0x3F, 0x3F, 0x3F], "clipped, the left 8 pixels show the backdrop")

    def test_palette_is_jsnes(self):
        if not os.path.isfile(JSNES_PALETTE):
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                self.fail(f"no {os.path.relpath(JSNES_PALETTE, frame.ROOT)}, and KIT_REQUIRE_TOOLS is set")
            self.skipTest("jsnes is not installed: skipped")
        with open(JSNES_PALETTE) as f:
            src = f.read()
        ntsc = re.search(r"loadNTSCPalette\(\) \{.*?Uint32Array\(\[(.*?)\]\)", src, re.S).group(1)
        want = []
        for v in (int(x, 16) for x in re.findall(r"0x[0-9A-Fa-f]+", ntsc)):
            want.append(f"#{v & 0xff:02x}{(v >> 8) & 0xff:02x}{v >> 16:02x}")
        self.assertEqual(node_eval("return NES.PALETTE;"), want)


if __name__ == "__main__":
    unittest.main()
