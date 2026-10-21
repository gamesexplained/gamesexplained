#!/usr/bin/env python3
"""A game whose authors' source survives says what it shows on its Source tab, in a section of its own
above the listing, from original-source.md in the game folder: Tycoon Tex's source disk showed a
cheat taken out and the extra life made rarer before release, and the How it works page links to it
(source.html#original-source)."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


class OriginalSource(unittest.TestCase):
    def test_none_without_the_file(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(build.original_source(d), "")

    def test_a_section_never_folded_away_that_links_addresses(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d, build.ORIGINAL).write_text("# The authors' source\n\nThe life comes at `$3261`.\n\n## Taken out\n\nA cheat.\n")
            sec = build.original_source(d)
        self.assertTrue(sec.startswith('<section class="origsrc" id="original-source"><h2>The authors'))
        self.assertNotIn("<details", sec)
        self.assertIn('<a href="source.html#3261">$3261</a>', sec)
        self.assertIn("<h3>Taken out</h3>", sec)

    def test_the_template_has_a_place_for_it(self):
        self.assertIn("<!-- original -->", (Path(build.SITE) / "source.html").read_text())

    def test_tycoon_tex_has_one(self):
        game = Path(build.ROOT) / "games" / "c16" / "tycoon-tex"
        self.assertIn('id="original-source"', build.original_source(str(game)))
        self.assertIn('href="source.html#original-source"', (game / "index.html").read_text())


if __name__ == "__main__":
    unittest.main()
