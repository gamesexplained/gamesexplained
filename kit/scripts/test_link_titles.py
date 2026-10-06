#!/usr/bin/env python3
"""The About tab shows each of game.json's links by the linked page's title, not by its key
("wiki", "manual"), and check_docs.py fails a link that has a url and no title."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
import check_docs  # noqa: E402

GAME = {"links": {
    "wiki": {"title": "Castle Master – C64-Wiki", "url": "https://www.c64-wiki.com/wiki/Castle_Master"},
    "manual": {"title": "", "url": ""},
    "review": "https://example.org/review",
    "untitled": {"url": "https://example.org/untitled"},
}}


class LinkTitles(unittest.TestCase):
    def test_the_build_shows_the_title(self):
        self.assertEqual(build.link_list(GAME), [
            ("Castle Master – C64-Wiki", "https://www.c64-wiki.com/wiki/Castle_Master"),
            ("review", "https://example.org/review"),
            ("untitled", "https://example.org/untitled")])

    def test_the_check_names_each_link_without_one(self):
        self.assertEqual(check_docs.untitled_links(GAME), ["review", "untitled"])
        self.assertEqual(check_docs.untitled_links({"links": {"wiki": {"title": "", "url": ""}}}), [])


if __name__ == "__main__":
    unittest.main()
