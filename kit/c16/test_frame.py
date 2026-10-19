#!/usr/bin/env python3
"""The parts of kit/c16/frame.py and site/lib/c16.js that need no emulator.

This is what CI runs. It reads a PNG written here as the kit's server writes one, finds the
display window inside a frame, and runs c16.js under Node to check its rules against the
platform reference's (kit/skills/c16/c16-reference, "TED"): the palette, reverse with 128
characters and none with 256, the cursor and the flash, extended colour's four backgrounds, a
bitmap's colours from the screen, multicolour's pairs, the narrower windows, the scroll and the
26th row, RAM that repeats on a 16 KB machine, the display switched off, and a mode TED does not
have.

The drawing is checked against the machine, and only there: `python3 kit/c16/frame.py test`
fills TED's memory with patterns in every mode and compares plus4emu's picture with c16.js's
pixel by pixel. That needs a plus4emu server, which CI does not start, so it is run by hand
after any change to site/lib/c16.js. Node is needed here; with KIT_REQUIRE_TOOLS set, a missing
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
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import frame                                                              # noqa: E402

MEMMAP = os.path.join(ROOT, "site", "lib", "memmap.js")


def png(w, h, colours):
    """An 8-bit RGB PNG with unfiltered rows, as the kit's server writes its screenshots."""
    raw = b"".join(b"\0" + b"".join(bytes(c) for c in colours[y * w:(y + 1) * w]) for y in range(h))
    chunk = lambda kind, body: struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def node_eval(expr, setup=""):
    """The value of a JavaScript expression with site/lib/memmap.js and c16.js loaded, as JSON.
    `setup` runs first; `ted(...)` and `mem(...)` are there to build a machine."""
    node = shutil.which("node")
    if not node:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise AssertionError("no node on the path, and KIT_REQUIRE_TOOLS is set")
        raise unittest.SkipTest("no node on the path: skipped")
    script = ("const fs = require('fs'), vm = require('vm');"
              "globalThis.window = globalThis;"            # memmap.js names C64Map on window
              "vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf8'));"
              "vm.runInThisContext(fs.readFileSync(process.argv[2], 'utf8'));"
              # TED as the KERNAL leaves it, but the characters in RAM at $3000 and the cursor out of sight
              "const ted = (o = {}) => { const t = new Array(32).fill(0);"
              " Object.assign(t, {6: 0x1B, 7: 0x08, 0x0C: 3, 0x0D: 0xFF, 0x12: 0x08, 0x13: 0x30, 0x14: 0x08,"
              " 0x15: 0x32, 0x16: 0x45, 0x17: 0x56, 0x18: 0x67, 0x19: 0x26}, o); return t; };"
              "const mem = (size = 0x4000) => new Uint8Array(size);"
              "const at = (r, x, y) => r.px[y * r.w + x];"
              f"{setup};"
              f"console.log(JSON.stringify({expr}));")
    r = subprocess.run([node, "-e", script, MEMMAP, frame.LIB], capture_output=True, text=True)
    if r.returncode:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


class Picture(unittest.TestCase):
    def test_png_reads_back(self):
        colours = [(8, 8, 8), (244, 244, 244), (55, 55, 163), (1, 2, 3), (250, 0, 7), (0, 0, 0)]
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "s.png")
            open(p, "wb").write(png(3, 2, colours))
            self.assertEqual(frame.png_rgb(p), (3, 2, colours))

    def test_window_and_compare(self):
        W, H, border, inside = 340, 210, (55, 55, 163), (1, 1, 1)
        px = [border] * (W * H)
        for y in range(200):
            for x in range(320):
                px[(4 + y) * W + 9 + x] = inside
        shot = (W, H, px)
        self.assertEqual(frame.window(shot, border), (9, 4))
        expected = (320, 200, [inside] * 64000)
        self.assertEqual(frame.compare(shot, (9, 4), expected), (0, None))
        px[(4 + 5) * W + 9 + 1] = (2, 2, 2)
        self.assertEqual(frame.compare(shot, (9, 4), expected), (1, (1, 5)))
        self.assertEqual(frame.compare(shot, (9, 4), expected, skip=(2, 0)), (0, None))


class Palette(unittest.TestCase):
    def test_colours(self):
        got = node_eval("[C16.PALETTE.length, [0, 0x10, 0x70].map(c => C16.css(c)), C16.css(0x71), C16.css(0xF1),"
                        " C16.css(0x26)]")
        self.assertEqual(got, [128, ["#080808"] * 3, "#f4f4f4", "#f4f4f4", "#3737a3"])


class Text(unittest.TestCase):
    SETUP = ("const m = mem(); m[0x3000 + 8] = 0xF0;"          # character 1: the left half lit, every line
             "m[0x0800] = 0x71; m[0x0C00] = 1;"                 # place 0: character 1 in white
             "m[0x0801] = 0x71; m[0x0C01] = 0x81;"              # place 1: character 1 reversed
             "m[0x0802] = 0xF1; m[0x0C02] = 1;")                # place 2: character 1, flashing

    def test_reverse_with_128_characters_only(self):
        got = node_eval("[[0, 4, 8, 12].map(x => at(C16.render(m, ted()), x, 0)),"
                        " [8, 12].map(x => at(C16.render(m, ted({7: 0x88})), x, 0))]", self.SETUP)
        # 128: place 0 lit then background; place 1 the reverse. 256: character 129 is blank
        self.assertEqual(got, [[0x71, 0x32, 0x32, 0x71], [0x32, 0x32]])

    def test_flash_and_cursor(self):
        got = node_eval("[[1, 0].map(f => at(C16.render(m, ted(), {flash: f}), 16, 0)),"
                        " [1, 0].map(f => at(C16.render(m, ted({0x0C: 0, 0x0D: 0}), {flash: f}), 0, 0)),"
                        " [1, 0].map(f => at(C16.render(m, ted({0x0C: 0, 0x0D: 2}), {flash: f}), 16, 0))]", self.SETUP)
        # a flashing character shows when lit and not when dark; the cursor's cell is reversed
        # when lit; the cursor's own cell does not flash
        self.assertEqual(got, [[0xF1, 0x32], [0x32, 0x71], [0x32, 0xF1]])

    def test_extended_colour(self):
        got = node_eval("[0, 1, 2, 3].map(k => { m[0x0C00] = (k << 6) | 1; return at(C16.render(m, ted({6: 0x5B})), 4, 0); })",
                        self.SETUP)
        self.assertEqual(got, [0x32, 0x45, 0x56, 0x67])

    def test_multicolour_text(self):
        got = node_eval("(() => { m[0x3000 + 16] = 0b00011011; m[0x0C00] = 2;"
                        " const r = [0x79, 0x71].map(a => { m[0x0800] = a; const p = C16.render(m, ted({7: 0x18}));"
                        " return [0, 2, 4, 6].map(x => at(p, x, 0)); }); return r; })()", self.SETUP)
        # attribute bit 3 set: pairs 00, 01, 10, 11 are $FF15, $FF16, $FF17 and the attribute
        # without bits 7 and 3; clear: one bit a pixel, as plain text
        self.assertEqual(got, [[0x32, 0x45, 0x56, 0x71], [0x32, 0x32, 0x71, 0x71]])

    def test_ram_repeats_on_a_16k_machine(self):
        got = node_eval("(() => { const big = mem(0x10000); big[0x0800] = 0x71; big[0x0C00] = 1; big[0x1008] = 0xFF;"
                        " return [at(C16.render(big, ted({0x13: 0xD0}), {size: 0x4000}), 0, 0),"
                        " at(C16.render(big, ted({0x13: 0xD0})), 0, 0)]; })()")
        self.assertEqual(got, [0x71, 0x32])


class Bitmap(unittest.TestCase):
    SETUP = "const m = mem(); m[0x0800] = 0x53; m[0x0C00] = 0x9A; m[0x2000] = 0b00011011"

    def test_hires_colours(self):
        got = node_eval("[0, 7].map(x => at(C16.render(m, ted({6: 0x3B})), x, 0))", self.SETUP)
        # a 0 is the character's low nibble at the attribute's bits 6-4, a 1 its high nibble at bits 2-0
        self.assertEqual(got, [0x5A, 0x39])

    def test_multicolour_pairs(self):
        got = node_eval("[0, 2, 4, 6].map(x => at(C16.render(m, ted({6: 0x3B, 7: 0x18})), x, 0))", self.SETUP)
        self.assertEqual(got, [0x32, 0x39, 0x5A, 0x45])


class Window(unittest.TestCase):
    SETUP = ("const m = mem(); for (let p = 0; p < 0x400; p++) { m[0x0800 + p] = 0x71; m[0x0C00 + p] = 1; }"
             "for (let i = 0; i < 8; i++) m[0x3008 + i] = 0xFF;")

    def test_narrow_windows(self):
        got = node_eval("(() => { const r = C16.render(m, ted({6: 0x13, 7: 0x00}));"
                        " return [at(r, 7, 100), at(r, 8, 100), at(r, 311, 100), at(r, 312, 100),"
                        " at(r, 100, 3), at(r, 100, 4), at(r, 100, 195), at(r, 100, 196)]; })()", self.SETUP)
        self.assertEqual(got, [0x26, 0x71, 0x71, 0x26, 0x26, 0x71, 0x71, 0x26])

    def test_scroll_and_the_26th_row(self):
        got = node_eval("(() => { m[0x0800 + 1000] = 0x45; m[0x0800 + 40] = 0x56;"
                        " const up = C16.render(m, ted({6: 0x19})), right = C16.render(m, ted({7: 0x0B}));"
                        " return [at(up, 0, 197), at(up, 0, 198), at(up, 0, 5), at(up, 0, 6),"
                        " at(right, 2, 8), at(right, 3, 8)]; })()", self.SETUP)
        # two up: row 1 starts at line 6, and the 26th row (place 1000) at line 198; three right:
        # the first three pixels of a line in the background colour
        self.assertEqual(got, [0x71, 0x45, 0x71, 0x56, 0x32, 0x56])

    def test_display_off_and_no_such_mode(self):
        got = node_eval("[at(C16.render(m, ted({6: 0x0B})), 160, 100), at(C16.render(m, ted({6: 0x7B})), 160, 100)]",
                        self.SETUP)
        self.assertEqual(got, [0x26, 0])

    def test_footprint_widget(self):
        self.assertTrue(node_eval("typeof C16Map === 'object' && typeof C16Map.render === 'function'"))


if __name__ == "__main__":
    unittest.main()
