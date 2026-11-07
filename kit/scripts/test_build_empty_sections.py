#!/usr/bin/env python3
"""A section of an authored page with a heading and nothing under it fails the build: a template's
section left unfilled would be published as a heading over nothing, as a Play page's results and
differences once were when the files they are built from had not been written."""
from pathlib import Path
import glob
import os
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

HEAD = '<p class="fig">02 · Differences</p>\n  <h2 class="t">What differs from a C64</h2>\n'


class EmptySections(unittest.TestCase):
    def test_a_heading_over_a_placeholder_is_empty(self):
        page = f'<section id="differences">\n  {HEAD}  <!-- differences -->\n</section>'
        self.assertEqual(build.empty_sections(page), ["differences"])

    def test_a_section_with_no_id_is_named_by_its_heading(self):
        self.assertEqual(build.empty_sections(f"<section>{HEAD}</section>"), ["What differs from a C64"])

    def test_a_section_with_anything_under_its_heading_is_kept(self):
        for body in ("<ul><li>Fast.</li></ul>", '<div id="viewer"></div>', "Some words."):
            self.assertEqual(build.empty_sections(f'<section id="d">{HEAD}{body}</section>'), [], body)

    def test_every_game_page_has_something_in_each_section(self):
        root = Path(build.ROOT)
        for f in sorted(glob.glob(str(root / "games/*/*/*.html"))):
            with self.subTest(page=os.path.relpath(f, root)):
                self.assertEqual(build.empty_sections(Path(f).read_text(encoding="utf-8")), [])


if __name__ == "__main__":
    unittest.main()
