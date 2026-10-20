#!/usr/bin/env python3
"""site/lib/apple2.js draws the Apple II's graphics exactly as kit/apple2/screen.py draws them.

The kit's server draws nothing, so screen.py is the kit's one drawing of the screen, and a page's
frame rebuilt from memory (kit/skills/core/70-minisite) must agree with it: lo-res, hi-res in
colour, double hi-res and double lo-res, pages 1 and 2, mixed mode's graphics rows. Each is drawn
by both from the same pseudo-random memory and compared pixel by pixel. Needs Node, not the
emulator; with KIT_REQUIRE_TOOLS set, a missing Node fails instead of skipping.
"""
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
CASES = [("lores", {}), ("lores page 2", {"page2": True}), ("hires", {"hires": True}),
         ("hires page 2", {"hires": True, "page2": True}), ("hires with 80store", {"hires": True, "page2": True, "80store": True}),
         ("mixed", {"hires": True, "mixed": True}), ("dhires", {"hires": True, "80col": True, "dhires": True}),
         ("double lo-res", {"80col": True, "dhires": True})]

RUNNER = r"""
const fs = require('fs');
require(process.argv[2]);
const input = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const main = Uint8Array.from(Buffer.from(input.main, 'base64'));
const aux = Uint8Array.from(Buffer.from(input.aux, 'base64'));
const out = input.cases.map(sw => Buffer.from(globalThis.Apple2.render(main, aux, sw).data).toString('base64'));
process.stdout.write(JSON.stringify(out));
"""


class Frame(unittest.TestCase):
    def test_the_page_draws_as_the_kit_does(self):
        node = shutil.which("node")
        if not node:
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                self.fail("no node on the path, and KIT_REQUIRE_TOOLS is set")
            self.skipTest("no node on the path: skipped")
        rnd = random.Random(6502)
        main = bytearray(rnd.getrandbits(8) for _ in range(0x10000))
        aux = bytearray(rnd.getrandbits(8) for _ in range(0x10000))
        for a in range(0x2000, 0x2400):            # some runs of lone dots, where the colours come from
            main[a] = rnd.choice((0x01, 0x81, 0x02, 0x82, 0x2A, 0xD5, 0x00, 0x7F))
        import base64
        with tempfile.TemporaryDirectory() as d:
            inp, runner = os.path.join(d, "in.json"), os.path.join(d, "run.js")
            with open(inp, "w") as f:
                json.dump({"main": base64.b64encode(main).decode(), "aux": base64.b64encode(aux).decode(),
                           "cases": [sw for _, sw in CASES]}, f)
            with open(runner, "w") as f:
                f.write(RUNNER)
            r = subprocess.run([node, runner, LIB, inp], capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr)
        drawn = json.loads(r.stdout)
        for (name, sw), js in zip(CASES, drawn):
            w, h, pix = screen.render(main, aux, sw)
            want = bytearray()
            for y, row in enumerate(pix):
                for x, p in enumerate(row):
                    text_row = sw.get("mixed") and y >= 320       # the page leaves mixed mode's text black
                    want += bytes((0, 0, 0, 255) if text_row else (*p, 255))
            got = base64.b64decode(js)
            self.assertEqual(len(got), len(want), name)
            bad = next((i // 4 for i in range(0, len(want), 4) if got[i:i + 4] != want[i:i + 4]), None)
            self.assertIsNone(bad, f"{name}: the first pixel that differs is x {bad % w}, y {bad // w}" if bad is not None else name)


if __name__ == "__main__":
    unittest.main()
