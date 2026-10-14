#!/usr/bin/env python3
"""The link at the end of a tab to the next one: it names the tab after it in the bar, skips a tab
the game does not have, sits above the edit footer, and the last tab has none."""
from pathlib import Path
import json
import re
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


def target(h):
    m = re.search(r'<nav class="nexttab"[^>]*><a href="([^"]*)"[^>]*>.*?<span class="nx-t">([^<]*)</span>', h)
    return m and m.groups()


class NextTab(unittest.TestCase):
    def test_the_tab_after_in_the_bar(self):
        every = {f for f, _ in build.TABS}
        self.assertEqual(target(build.next_tab({}, every, "index.html")), ("discoveries.html", "Discoveries"))
        self.assertEqual(target(build.next_tab({}, every, "discoveries.html")), ("source.html", "Source code"))
        self.assertEqual(target(build.next_tab({}, every, "play.html")), ("about.html", "About"))
        self.assertEqual(build.next_tab({}, every, "about.html"), "")

    def test_a_tab_the_game_does_not_have_is_skipped(self):
        self.assertEqual(target(build.next_tab({}, {"index.html", "source.html", "about.html"}, "source.html")),
                         ("about.html", "About"))

    def test_a_game_with_its_own_tabs(self):
        game = {"tabs": [["index.html", "Overview"], ["source.html", "Source code"], ["levels.html", "Maps & rooms"],
                         ["about.html", "About"]]}
        present = {"index.html", "source.html", "levels.html", "about.html"}
        self.assertEqual(target(build.next_tab(game, present, "source.html")), ("levels.html", "Maps &amp; rooms"))
        self.assertEqual(target(build.next_tab(game, present, "index.html")), ("source.html", "Source code"))
        self.assertEqual(build.next_tab(game, present, "about.html"), "")

    def test_built_above_the_edit_footer_and_not_on_the_last_tab(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen
        try:
            with tempfile.TemporaryDirectory() as d:
                g = Path(d) / "games" / "c64" / "fixture"
                shutil.copytree(Path(build.ROOT) / "kit" / "template", g)
                game = json.loads((g / "game.json").read_text())
                game.update(platform="c64", slug="fixture", title="Fixture", tier="none")
                (g / "game.json").write_text(json.dumps(game))
                out = Path(d) / "_site"
                shutil.copytree(Path(build.SITE) / "lib", out / "lib")
                build.build_game(str(g), str(out))
                index = (out / "c64" / "fixture" / "index.html").read_text()
                self.assertEqual(target(index), ("about.html", "About"))   # no listing, so no Source tab
                self.assertLess(index.index('<nav class="nexttab"'), index.index('<footer class="editfoot"'))
                self.assertNotIn('class="nexttab"', (out / "c64" / "fixture" / "about.html").read_text())
        finally:
            build.shot_html = self.shot


if __name__ == "__main__":
    unittest.main()
