#!/usr/bin/env python3
"""The links into a Source page that build.py counts as landing on no record (#215): which
addresses a page links, as site.js links them, and which of those the page's listing holds."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402


def links(page):
    p = build.AddressLinks()
    p.feed(page)
    p.close()
    return [(s, f"{a:04X}") for s, a in p.links]


class Links(unittest.TestCase):
    def test_what_site_js_links(self):
        self.assertEqual(links('<p>at <code>$D020</code>, <a href="source-game.html#8163">there</a>'
                               '<div data-part="map-05"><p>and <code> $3c9e </code></div>'),
                         [("source.html", "D020"), ("source-game.html", "8163"), ("source-map-05.html", "3C9E")])

    def test_what_it_leaves(self):
        self.assertEqual(links('<a href="x.html"><code>$D020</code></a><pre><code>$D021</code></pre>'
                               '<code>$D022-$D023</code><code><b>$D024</b></code>'
                               '<div data-part=""><p><code>$D025</code></div>'
                               '<div data-cut><code>$D026</code><a href="source.html#D027">x</a></div>'), [])

    def test_a_page_that_links_none(self):
        self.assertEqual(links('<body data-nolink="1"><code>$D020</code><a href="source.html#E000">x</a>'),
                         [("source.html", "E000")])


class Unrecorded(unittest.TestCase):
    def test_links_to_a_gap_or_past_a_row(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "c64" / "fixture"
            out.mkdir(parents=True)
            records = [{"a": 0, "t": "gap", "n": 0xE000},
                       {"a": 0xE000, "t": "byte", "b": [1, 2, 3, 4], "l": "table"},
                       {"a": 0xE004, "t": "gap", "n": 0x1FFC}]
            (out / "listing.json").write_text(json.dumps({"records": records, "index": []}))
            (out / "source.html").write_text('<body data-nolink="1"><a href="source.html#E002">in a row</a>')
            (out / "index.html").write_text("<code>$E000</code> <code>$E004</code> <code>$D020</code>")
            total, lost = build.unrecorded(tmp)
        self.assertEqual(total, 4)
        self.assertEqual(lost, [("c64/fixture/index.html", "source.html", 0xE004),
                                ("c64/fixture/index.html", "source.html", 0xD020)])


if __name__ == "__main__":
    unittest.main()
