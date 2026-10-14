#!/usr/bin/env python3
"""The parts of kit/bbc/frame.py and site/lib/bbc.js that need no emulator.

This is what CI runs. It reads a PNG written here as the kit's server writes one, finds a
picture inside a frame, and runs bbc.js under Node to check its rules against the platform
reference's: which bits make each pixel in two, four and sixteen colours, where a pixel's
byte is, how an address past &7FFF wraps, the blank lines of modes 3 and 6, and mode 2's
flashing colours; and teletext's rules for what a cell shows: set-after and set-at codes,
mosaics and the capitals among them, hold, and double height.

The drawing is checked against the machine, and only there: `python3 kit/bbc/frame.py test`
paints a test pattern in jsbeeb in every mode from 0 to 6 and compares jsbeeb's picture with
bbc.js's pixel by pixel, and mode 7 cell by cell. That needs a jsbeeb server, which CI does not start, so it is run by hand after
any change to site/lib/bbc.js. Node is needed here; with KIT_REQUIRE_TOOLS set, a missing
Node fails instead of skipping.
"""
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import frame                                                              # noqa: E402


def png(w, h, colours):
    """An 8-bit RGB PNG with unfiltered rows, as the kit's server writes its screenshots."""
    rgb = {v: k for k, v in frame.RGB.items()}
    raw = b"".join(b"\0" + b"".join(bytes(rgb[c]) for c in colours[y * w:(y + 1) * w]) for y in range(h))
    chunk = lambda kind, body: struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def node_eval(expr):
    """The value of a JavaScript expression with site/lib/bbc.js loaded, as JSON."""
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise AssertionError("no node on the path, and KIT_REQUIRE_TOOLS is set")
        raise unittest.SkipTest("no node on the path: skipped")
    script = ("const fs = require('fs'), vm = require('vm');"
              "vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf8'));"
              f"console.log(JSON.stringify({expr}));")
    r = subprocess.run([node, "-e", script, frame.LIB], capture_output=True, text=True)
    if r.returncode:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


class Picture(unittest.TestCase):
    def test_png_reads_back(self):
        colours = [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4]
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "s.png")
            open(p, "wb").write(png(4, 3, colours))
            self.assertEqual(frame.png_pixels(p), (4, 3, colours))

    def test_compare_finds_the_picture(self):
        # a two-pixel-wide picture (mode 1 width would be 320; here w = 320 means pw = 2)
        w, h = 320, 2
        expected = [((x + y) % 7) + 1 for y in range(h) for x in range(w)]
        W, H, dx, dy = 700, 8, 30, 3
        shot = [0] * (W * H)
        for y in range(h):
            for x in range(w):
                for fy in (0, 1):
                    for fx in (0, 1):
                        shot[(dy + 2 * y + fy) * W + dx + 2 * x + fx] = expected[y * w + x]
        self.assertEqual(frame.compare((W, H, shot), (w, h, expected)), (0, (dx, dy)))
        shot[(dy + 2) * W + dx + 10] = 0
        self.assertEqual(frame.compare((W, H, shot), (w, h, expected))[0], 1)


class Rules(unittest.TestCase):
    """bbc.js against the bit rules in kit/skills/bbc/bbc-reference, worked out here by hand."""

    def test_pixels(self):
        got = node_eval("[BBC.pixels(0xA5, 1), BBC.pixels(0x8C, 2), BBC.pixels(0xA5, 4), BBC.pixels(0x6A, 4)]")
        self.assertEqual(got[0], [1, 0, 1, 0, 0, 1, 0, 1])
        # four colours: pixel i is bit 7-i (high) and bit 3-i (low); &8C is 1000 1100
        self.assertEqual(got[1], [3, 1, 0, 0])
        # sixteen colours: left pixel bits 7,5,3,1, right 6,4,2,0; &A5 is 1010 0101: 1100, 0011
        self.assertEqual(got[2], [12, 3])
        # &6A is 0110 1010: left 7,5,3,1 = 0,1,1,1 = 7; right 6,4,2,0 = 1,0,0,0 = 8
        self.assertEqual(got[3], [7, 8])

    def test_addresses(self):
        got = node_eval("[BBC.addr(1, 0, 0), BBC.addr(1, 4, 0), BBC.addr(1, 0, 1), BBC.addr(1, 0, 8),"
                        " BBC.addr(2, 3, 9), BBC.addr(4, 319, 255), BBC.addr(1, 0, 0, 0x7FF8),"
                        " BBC.addr(4, 8, 0, 0x7FF8)]")
        self.assertEqual(got[:4], [0x3000, 0x3008, 0x3001, 0x3280], "a cell is 8 bytes; a row 640")
        self.assertEqual(got[4], 0x3000 + 640 + 8 + 1, "mode 2: 2 pixels a byte, so x = 3 is the second cell")
        self.assertEqual(got[5], 0x5800 + 31 * 320 + 39 * 8 + 7, "mode 4's last byte")
        self.assertEqual(got[6], 0x7FF8)
        self.assertEqual(got[7], 0x8000 - 0x2800, "past &7FFF the screen wraps by its size")

    def test_render(self):
        got = node_eval("(() => { const ram = new Uint8Array(0x10000);"
                        " ram[0x3000] = 0x80; ram[0x4000] = 0xFF; ram[0x5800] = 0x0F;"
                        " const m2 = new Uint8Array(0x10000); m2[0x3000] = 0xAA;"
                        " const r0 = BBC.render(ram, {mode: 0}), r3 = BBC.render(ram, {mode: 3}),"
                        "   r5 = BBC.render(ram, {mode: 5}),"
                        "   a = BBC.render(m2, {mode: 2}), b = BBC.render(m2, {mode: 2, phase: 1});"
                        " return [r0.w, r0.h, r0.px[0], r0.px[1], r3.h, Array.from(r3.px.slice(0, 2)),"
                        "   r3.px[8 * 640], r5.px[0], a.px[0], b.px[0], a.px[1]]; })()")
        w, h, first, second, h3, row3, gap3, m5, flash0, flash1, steady = got
        self.assertEqual((w, h, first, second), (640, 256, 7, 0), "mode 0 by default: white on black")
        self.assertEqual(h3, 250, "mode 3: 25 rows of ten lines")
        self.assertEqual(row3, [7, 7])
        self.assertEqual(gap3, 0, "the ninth line of a row is blank")
        self.assertEqual(m5, 1, "mode 5: &0F's first pixel is bits 7 and 3, 0 and 1: logical 1, red")
        # &AA in mode 2: left 7,5,3,1 = 1111 = 15, flashing white and black; right 6,4,2,0 = 0
        self.assertEqual((flash0, flash1, steady), (7, 0, 0))


class Teletext(unittest.TestCase):
    """BBC.cells against the SAA5050's rules as the platform reference and jsbeeb's
    src/teletext.js give them; frame.py test compares whole screens of them with jsbeeb."""

    def row(self, *codes, rows=1):
        b = list(codes) + [32] * (40 * rows - len(codes))
        return node_eval(f"BBC.cells({json.dumps(b)}, {rows})")

    def test_set_after_and_set_at(self):
        r = self.row(0x81, 0x41, 0x9D, 0x42, 0x82, 0x43)[0]
        self.assertEqual((r[0]["fg"], r[1]["fg"]), (7, 1), "a colour acts from the next cell")
        self.assertEqual((r[2]["bg"], r[3]["bg"]), (1, 1), "new background acts at its own cell")
        self.assertEqual((r[4]["fg"], r[5]["fg"]), (1, 2))

    def test_mosaics_and_capitals(self):
        r = self.row(0x92, 0xFF, 0x41, 0x7F, 0x9A, 0x6F)[0]
        self.assertEqual((r[1]["mosaic"], r[1]["ch"], r[1]["fg"]), (True, 0x7F, 2))
        self.assertFalse(r[2]["mosaic"], "a capital in graphics mode stays a letter")
        self.assertTrue(r[5]["mosaic"] and r[5]["sep"], "separated from the cell after the code")
        self.assertFalse(r[3]["sep"])
        self.assertEqual(node_eval("BBC.sixels(0x7F)"), [True] * 6)
        self.assertEqual(node_eval("BBC.sixels(0x21 | 0x40)"), [True, False, False, False, False, True])

    def test_hold(self):
        r = self.row(0x97, 0x9E, 0xEC, 0x93, 0x94, 0x9F, 0x95)[0]
        self.assertEqual((r[3]["ch"], r[3]["fg"]), (0x6C, 7), "a held mosaic, in the colour before the code")
        self.assertEqual((r[4]["ch"], r[4]["fg"]), (0x6C, 3))
        self.assertEqual(r[5]["ch"], 0x6C, "release acts after its own cell")
        self.assertEqual(r[6]["ch"], 32)
        r = self.row(0x97, 0xEC, 0x93)[0]
        self.assertEqual(r[2]["ch"], 32, "without hold a code is a space")

    def test_double_height(self):
        g = self.row(*([0x8D, 0x48] + [32] * 38 + [0x8D, 0x48, 0x8C, 0x49]), rows=3)
        self.assertEqual((g[0][0]["half"], g[0][1]["half"]), (0, 1), "double height from the next cell")
        self.assertEqual((g[1][1]["half"], g[1][1]["blank"]), (2, False), "the row under: bottom halves")
        self.assertTrue(g[1][3]["blank"], "and its other cells blank")
        self.assertEqual(g[2][0]["half"], 0, "the row after the pair is a row of its own")


if __name__ == "__main__":
    unittest.main()
