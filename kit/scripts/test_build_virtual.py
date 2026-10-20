#!/usr/bin/env python3
"""Code a game keeps in a virtual address space, read from the disk during play, which no listing
holds, is named beside the coverage figure (#428): Zork I's interpreter reads 62 KB of its story
from the disk a page at a time, and its pages said 100 % with nothing to say the story's routines
were not in the listing."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ROW = [63488, "the story's other 248 pages, read a page at a time"]


class Virtual(unittest.TestCase):
    def test_none_says_nothing(self):
        self.assertEqual(build.virtual({"coverage": {}}), [])
        self.assertEqual(build.virtual_note([]), "")

    def test_the_source_tab_names_it(self):
        rows = build.virtual({"coverage": {"virtual": [ROW]}})
        note = build.virtual_note(rows)
        self.assertIn("63,488 bytes of its program from the disk during play", note)
        self.assertIn("the story&#x27;s other 248 pages", note)

    def test_a_row_that_is_not_bytes_and_what_stops_the_build(self):
        for bad in (["62 KB", "the story"], [63488], [0, "nothing"], "63488"):
            with self.assertRaises(SystemExit, msg=repr(bad)):
                build.virtual({"platform": "apple2", "slug": "fixture", "coverage": {"virtual": [bad]}})

    def test_zork_declares_its_story(self):
        import json
        game = json.loads((Path(build.ROOT) / "games" / "apple2" / "zork-i" / "game.json").read_text())
        self.assertEqual(sum(n for n, _ in build.virtual(game)), 248 * 256)


if __name__ == "__main__":
    unittest.main()
