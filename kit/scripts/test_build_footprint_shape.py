#!/usr/bin/env python3
"""The About tab's footprint is a banner on every machine: at least three times as wide as it is
tall, so a small memory (the Commodore 16's 16 KB, a Game & Watch's 2 KB of ROM) does not fill the
page with a square or a tower. The 64 KB and 48 KB maps keep their columns of 128 bytes."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

SPANS = {"64 KB": (0, 0x10000), **{p: s for p, s in build.PLATFORM_MAP_SPAN.items()}}


class FootprintShape(unittest.TestCase):
    def test_every_map_is_a_banner(self):
        for name, (lo, hi) in SPANS.items():
            column = build.map_column(hi - lo)
            wide, tall = (hi - lo) // column, column
            with self.subTest(name):
                self.assertEqual((hi - lo) % column, 0)
                self.assertGreaterEqual(wide, 3 * tall)

    def test_large_maps_keep_their_shape(self):
        self.assertEqual(build.map_column(0x10000), 128)
        self.assertEqual(build.map_column(0xC000), 128)
        self.assertEqual(build.map_column(0x4000), 64)

    def test_memmap_names_a_column_only_when_it_is_not_128(self):
        self.assertNotIn("column", build.memmap_doc([], {}, [], (0, 0x10000)))
        self.assertNotIn("column", build.memmap_doc([], {}, [], (0x4000, 0x10000)))
        doc = build.memmap_doc([], {}, [], (0, 0x4000))
        self.assertEqual((doc["base"], doc["size"], doc["column"]), (0, 0x4000, 64))


if __name__ == "__main__":
    unittest.main()
