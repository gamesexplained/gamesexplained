#!/usr/bin/env python3
"""The Source tab is the listing and the lines above it, and About leaves out how the analysed
state was reached. facts.md, cheats.md and orientation.md stay in the game folder and no tab shows
them: neither page carries their text, and the Source page's edit link opens symbols.json, where
the listing's names and comments come from (a part's own, in a game of several)."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
from test_build_no_listing import site  # noqa: E402
from test_build_withheld import listed_game  # noqa: E402


class NotesUnpublished(unittest.TestCase):
    def setUp(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen

    def tearDown(self):
        build.shot_html = self.shot

    def check(self, parts):
        with tempfile.TemporaryDirectory() as d:
            g, out_root = listed_game(d, parts, publish=True), site(d)
            (g / "cheats.md").write_text("# Cheats\n\n| Effect | Poke | Status |\n|---|---|---|\n"
                                         "| Lives | `$C010` = 9 | live |\n")
            (g / "orientation.md").write_text("# Orientation\n\nThe snapshot was taken on the title.\n")
            if parts:   # what About's map links to, as a real part has
                (g / "parts" / "engine" / "symbols.json").write_text((g / "symbols.json").read_text())
            build.build_game(str(g), str(out_root))
            src = (Path(out_root) / "c64" / "fixture" / "source.html").read_text()
            self.assertIn('id="src"', src)                 # the listing is there
            for gone in ('id="facts"', "<details", "start is at", "Cheats", "Lives"):
                self.assertNotIn(gone, src)
            symbols = "parts/engine/symbols.json" if parts else "symbols.json"
            self.assertIn(f"/edit/main/games/c64/fixture/{symbols}", src)
            about = (Path(out_root) / "c64" / "fixture" / "about.html").read_text()
            for gone in ("analysed state", "snapshot was taken"):
                self.assertNotIn(gone, about)
            self.assertEqual(build.broken_links(str(out_root)), [])

    def test_a_game_of_one_part(self):
        self.check(parts=False)

    def test_a_game_of_several_parts(self):
        self.check(parts=True)


if __name__ == "__main__":
    unittest.main()
