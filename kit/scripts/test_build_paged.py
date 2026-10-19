#!/usr/bin/env python3
"""Code a game reads from the disk during play, which no listing holds, is named beside the
coverage figure (#428): Zork I's interpreter pages 62 KB of its story in from the disk, and its
pages said 100 % with nothing to say the story's routines were not in the listing."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ROW = [63488, "the story's other 248 pages, read a page at a time"]


class Paged(unittest.TestCase):
    def test_none_says_nothing(self):
        self.assertEqual(build.paged({"coverage": {}}), [])
        self.assertEqual(build.paged_note([]), "")

    def test_the_source_tab_names_it(self):
        rows = build.paged({"coverage": {"paged": [ROW]}})
        note = build.paged_note(rows)
        self.assertIn("63,488 bytes of its program from the disk during play", note)
        self.assertIn("the story&#x27;s other 248 pages", note)

    def test_a_row_that_is_not_bytes_and_what_stops_the_build(self):
        for bad in (["62 KB", "the story"], [63488], [0, "nothing"], "63488"):
            with self.assertRaises(SystemExit, msg=repr(bad)):
                build.paged({"platform": "apple2", "slug": "fixture", "coverage": {"paged": [bad]}})

    def test_zork_declares_its_story(self):
        import json
        game = json.loads((Path(build.ROOT) / "games" / "apple2" / "zork-i" / "game.json").read_text())
        self.assertEqual(sum(n for n, _ in build.paged(game)), 248 * 256)


if __name__ == "__main__":
    unittest.main()
