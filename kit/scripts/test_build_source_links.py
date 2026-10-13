#!/usr/bin/env python3
"""The sources in a game's features.md, on the About tab, link the way "Other places to love
this game" does: the words a source opens with become the link, and a web address is never
set out in full. Before, each address showed as a long code span."""
from pathlib import Path
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


def links(h):
    return re.findall(r'<a href="([^"]+)">([^<]*)', h)


class SourceLinks(unittest.TestCase):
    def test_the_opening_words_become_the_link(self):
        h = build.inline("Wikipedia, `https://en.wikipedia.org/wiki/A_(b)`, read 1 May 2026.", False, urls=True)
        self.assertEqual(h, '<a href="https://en.wikipedia.org/wiki/A_(b)">Wikipedia</a>, read 1 May 2026.')

    def test_bare_and_angled_addresses(self):
        h = build.inline("C64-Wiki: https://www.c64-wiki.com/wiki/X (revision 4) and <https://archive.org/x>.", False, urls=True)
        self.assertEqual(links(h), [("https://www.c64-wiki.com/wiki/X", "C64-Wiki"), ("https://archive.org/x", "archive.org")])
        self.assertTrue(h.endswith("(revision 4) and " + '<a href="https://archive.org/x">archive.org</a>.'))

    def test_an_address_mid_sentence_shows_its_site(self):
        h = build.inline("CRASH 34, review at `http://www.crashonline.org.uk/34/f.htm`, read.", False, urls=True)
        self.assertEqual(h, 'CRASH 34, review at <a href="http://www.crashonline.org.uk/34/f.htm">crashonline.org.uk</a>, read.')

    def test_a_trailing_parenthesis_and_a_markdown_link_stay_put(self):
        h = build.inline("OCR (**Zzap**, https://archive.org/z) and [the wiki](https://example.org/w)", False, urls=True)
        self.assertEqual(links(h), [("https://archive.org/z", "archive.org"), ("https://example.org/w", "the wiki")])
        self.assertIn("<b>Zzap</b>", h)

    def test_off_by_default(self):
        self.assertNotIn("<a ", build.inline("Wikipedia, https://en.wikipedia.org/wiki/A", False))


if __name__ == "__main__":
    unittest.main()
