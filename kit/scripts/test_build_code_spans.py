#!/usr/bin/env python3
"""What the Markdown in a game's notes keeps literal inside a code span: a file name with
brackets and parentheses, asterisks and a LOAD"*" stay text, while the same marks outside a
code span still become links, bold and italic. Before the fix, a disk image's name such as
`armalyte_s1[thalamus_1988](pal)(!).g64` became a link to "pal" on the About tab."""
from pathlib import Path
import re
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


class CodeSpans(unittest.TestCase):
    def test_a_file_name_stays_text(self):
        h = build.inline("`armalyte_s1[thalamus_1988](pal)(!).g64`, kept as `work/armalyte_s1.g64`", False)
        self.assertNotIn("<a ", h)
        self.assertIn("<code>armalyte_s1[thalamus_1988](pal)(!).g64</code>", h)

    def test_asterisks_stay_text(self):
        h = build.inline('runs `LOAD"*",8,1` and one at `**-**`, and `**` (as `*`)', False)
        self.assertNotIn("<i>", h)
        self.assertNotIn("<b>", h)
        self.assertIn('<code>LOAD"*",8,1</code>', h)
        self.assertIn("<code>**-**</code>", h)

    def test_markup_outside_still_works(self):
        h = build.inline("**bold**, *live*, [the wiki](https://example.org/x) and `$A000`")
        self.assertIn("<b>bold</b>", h)
        self.assertIn("<i>live</i>", h)
        self.assertEqual(re.findall(r'<a href="([^"]+)">', h), ["https://example.org/x", "source.html#A000"])

    def test_a_part_named_before_a_span(self):
        h = build.inline("engine `$25BD` and *live*", "source-game.html", {"engine": "source-engine.html"})
        self.assertIn('engine <code><a href="source-engine.html#25BD">$25BD</a></code>', h)
        self.assertIn("<i>live</i>", h)


if __name__ == "__main__":
    unittest.main()
