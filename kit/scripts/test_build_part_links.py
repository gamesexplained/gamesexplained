#!/usr/bin/env python3
"""Where the facts of a game of several parts send an address: a bare one into the page being
built (a part's own Source page) or nowhere (the whole game's facts), and one written with a
part's name before it ("engine `$25BD`") into that part's page, wherever it is written."""
from pathlib import Path
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

PAGES = {"engine": "source-engine.html", "game": "source-game.html", "map-05": "source-map-05.html"}


def links(h):
    return re.findall(r'<a href="([^"]+)">', h)


class PartLinks(unittest.TestCase):
    def test_a_parts_own_facts(self):
        h = build.inline("reads `$3C9E`, then engine `$0335` and game `$8E3A-$8E44`",
                         "source-map-05.html", PAGES)
        self.assertEqual(links(h), ["source-map-05.html#3C9E", "source-engine.html#0335",
                                    "source-game.html#8E3A", "source-game.html#8E44"])
        self.assertIn("then engine <code>", h)   # the part's name stays in the text

    def test_the_whole_games_facts(self):
        h = build.inline("`$1C-$1E` at game `$8163`, and map-05 `$3C9E`", False, PAGES)
        self.assertEqual(links(h), ["source-game.html#8163", "source-map-05.html#3C9E"])
        self.assertIn("<code>$1C-$1E</code>", h)   # no part named: no link

    def test_words_that_name_no_part(self):
        h = build.inline("at `$8163`, the engine's `$0B53` and tiles-9 `$D000`", "source-game.html", PAGES)
        self.assertEqual(links(h), ["source-game.html#8163", "source-game.html#0B53", "source-game.html#D000"])

    def test_a_game_of_one_part(self):
        h = build.markdown("- at `$8163`\n", addr=True)
        self.assertEqual(links(h), ["source.html#8163"])

    def test_tables_and_lists(self):
        h = build.markdown("| a | b |\n|---|---|\n| game `$8163` | `$01` |\n\n- engine `$25BD`\n", addr=False, parts=PAGES)
        self.assertEqual(links(h), ["source-game.html#8163", "source-engine.html#25BD"])


if __name__ == "__main__":
    unittest.main()
