#!/usr/bin/env python3
"""preview.py links each game a pull request changes to its page in the preview, once each,
and a pull request that changes no game to the preview's home page. Offline: no request is made."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import preview  # noqa: E402

SITE = "https://gamesexplained-abc123-gamesexplained.vercel.app"


class Pages(unittest.TestCase):
    def test_each_game_once_in_the_order_first_changed(self):
        files = ["games/c64/wasteland/index.html", "kit/START.md", "games/c64/wasteland/parts/engine/facts.md",
                 "games/spectrum/fat-worm-blows-a-sparky/facts.md", "games/c64/wasteland/game.json"]
        self.assertEqual(preview.games(files), ["c64/wasteland", "spectrum/fat-worm-blows-a-sparky"])
        self.assertEqual(preview.pages(SITE + "/", preview.games(files)),
                         [SITE + "/c64/wasteland/", SITE + "/spectrum/fat-worm-blows-a-sparky/"])

    def test_no_game_gives_the_home_page(self):
        self.assertEqual(preview.pages(SITE, preview.games(["kit/START.md", "games/README.md"])), [SITE + "/"])

    def test_the_repository_comes_from_the_site_config(self):
        self.assertEqual(preview.repo(), "gamesexplained/gamesexplained")


if __name__ == "__main__":
    unittest.main()
