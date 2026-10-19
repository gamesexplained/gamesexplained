#!/usr/bin/env python3
"""site/lib/apple2.js reads the text page as kit/apple2/screen.py does.

A page shows a game's text as text, set in its own font (site/lib/apple2.js says why), so the
letters and the inverse of Apple2.text must be screen.py's: the letter text_lines gives each cell,
and the inverse glyph() draws it with. Every byte value is tried in each of the six screens below
(40 and 80 columns, the alternate character set on and off, page 2), from pseudo-random memory
whose first rows hold every byte in turn. Needs Node, not the emulator; with KIT_REQUIRE_TOOLS set,
a missing Node fails instead of skipping.
"""
import base64
import json
import os
import random
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import screen                                                             # noqa: E402

LIB = os.path.join(ROOT, "site", "lib", "apple2.js")
CASES = [{}, {"altchar": True}, {"80col": True}, {"80col": True, "altchar": True}, {"page2": True},
         {"page2": True, "80store": True}]

RUNNER = r"""
const fs = require('fs');
require(process.argv[2]);
const input = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const main = Uint8Array.from(Buffer.from(input.main, 'base64'));
const aux = Uint8Array.from(Buffer.from(input.aux, 'base64'));
process.stdout.write(JSON.stringify(input.cases.map(sw => globalThis.Apple2.text(main, aux, sw)
  .map(row => [row.map(c => c.ch).join(''), row.map(c => (c.inverse ? '1' : '0')).join('')]))));
"""


def inverse_row(main, aux, sw, row):
    off = 0x400 * (screen._page(sw) - 1)
    a = screen.text_base(row) + off
    out = ""
    for c in range(40):
        if sw.get("80col"):
            out += "1" if screen.glyph(aux[a + c], sw.get("altchar"))[1] else "0"
        out += "1" if screen.glyph(main[a + c], sw.get("altchar"))[1] else "0"
    return out


class Text(unittest.TestCase):
    def test_the_page_reads_the_text_as_the_kit_does(self):
        node = shutil.which("node")
        if not node:
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                self.fail("no node on the path, and KIT_REQUIRE_TOOLS is set")
            self.skipTest("no node on the path: skipped")
        rnd = random.Random(1977)
        main = bytearray(rnd.getrandbits(8) for _ in range(0x10000))
        aux = bytearray(rnd.getrandbits(8) for _ in range(0x10000))
        for page in (0x400, 0x800):                # every byte value on each page's first rows
            for i in range(256):
                row, col = divmod(i, 40)
                main[page + screen.text_base(row) - 0x400 + col] = i
                aux[page + screen.text_base(row) - 0x400 + col] = 255 - i
        with tempfile.TemporaryDirectory() as d:
            inp, runner = os.path.join(d, "in.json"), os.path.join(d, "run.js")
            with open(inp, "w") as f:
                json.dump({"main": base64.b64encode(main).decode(), "aux": base64.b64encode(aux).decode(), "cases": CASES}, f)
            with open(runner, "w") as f:
                f.write(RUNNER)
            r = subprocess.run([node, runner, LIB, inp], capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr)
        got = json.loads(r.stdout)
        for sw, rows in zip(CASES, got):
            want = screen.text_lines(main, aux, sw)
            for row, (letters, inverse) in enumerate(rows):
                self.assertEqual(letters.rstrip(), want[row], f"{sw}: the letters of row {row}")
                self.assertEqual(inverse, inverse_row(main, aux, sw, row), f"{sw}: the inverse of row {row}")


if __name__ == "__main__":
    unittest.main()
