#!/usr/bin/env python3
"""The build's check for links to nothing: a page's own link to a file it did not publish is
reported, and a string a script puts together at run time is not. And its check for loads of
nothing: a file a page's script loads by name that the build did not publish is reported, in
the page and in a script of its reference/ folder."""
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


class UnpublishedLoads(unittest.TestCase):
    def game(self, d, listing):
        """A built game of two parts, with a listing of its own when asked for one."""
        g = Path(d) / "c64" / "fixture"
        for part in ("one", "two"):
            (g / "parts" / part).mkdir(parents=True)
            (g / "parts" / part / "listing.json").write_text("{}")
        (g / "reference").mkdir()
        (g / "reference" / "route.json").write_text("{}")
        if listing:
            (g / "listing.json").write_text("{}")
        return g

    def test_a_page_and_its_script_that_load_a_listing_the_parts_hold(self):
        for listing in (False, True):
            with tempfile.TemporaryDirectory() as d:
                g = self.game(d, listing)
                (g / "index.html").write_text(
                    '<script src="reference/page.js"></script>\n'
                    "<p>Prose that names C64.load('prose.json') is no script.</p>\n"
                    "<script>C64.load().then(draw); Spectrum.load('parts/one/listing.json');\n"
                    "fetch('reference/route.json'); fetch('reference/gone.json').then(play);\n"
                    "// C64.load('comment.json') in a comment, and a URL: https://example.org/ BBC.load()\n"
                    "const part = id => C64.load('parts/' + id + '/listing.json'); Tune.load(); audio.load('click');\n"
                    "fetch(`parts/${id}/listing.json`); fetch('https://example.org/x.json');</script>\n")
                (g / "reference" / "page.js").write_text("game = await C64.load('listing.json');\n")
                want = [("c64/fixture/index.html", "reference/gone.json")]
                if not listing:
                    want = [("c64/fixture/index.html", "listing.json")] + want + [("c64/fixture/reference/page.js", "listing.json")]
                self.assertEqual(build.unpublished_loads(d), want)

    def test_a_listing_the_page_carries(self):
        with tempfile.TemporaryDirectory() as d:
            g = self.game(d, listing=False)
            (g / "parts" / "one" / "listing.json").unlink()   # withheld: the pages carry the pieces they read
            (g / "index.html").write_text(
                '<script type="application/json" data-listing="parts/one/listing.json">{"records": []}</script>\n'
                "<script src=\"reference/page.js\"></script><script>BBC.load('parts/one/listing.json');</script>\n")
            (g / "levels.html").write_text("<script>BBC.load('parts/one/listing.json');</script>\n")
            (g / "reference" / "page.js").write_text("BBC.load('parts/one/listing.json');\n")
            self.assertEqual(build.unpublished_loads(d), [("c64/fixture/levels.html", "parts/one/listing.json")])

    def test_the_loaders_that_fetch_listing_json_unasked(self):
        self.assertLessEqual({"Apple2", "BBC", "C16", "C64", "Spectrum"}, set(build.loaders()))


if __name__ == "__main__":
    unittest.main()
