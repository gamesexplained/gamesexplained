#!/usr/bin/env python3
"""The build's check for links to nothing: a page's own link to a file it did not publish is
reported, and a string a script puts together at run time is not."""
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


class BrokenLinks(unittest.TestCase):
    def test_a_link_to_nothing_and_a_link_a_script_builds(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            (out / "there.html").write_text("")
            (out / "page.html").write_text(
                '<a href="there.html">here</a> <a href="missing.html">gone</a>\n'
                "<script>const href = 'source-' + part + '.html#' + addr; a.href = href;\n"
                'img.src = "pic-" + n + ".png"; link.href = `source-${p}.html`;</script>\n')
            self.assertEqual(build.broken_links(str(out)), [("page.html", "missing.html")])


if __name__ == "__main__":
    unittest.main()
