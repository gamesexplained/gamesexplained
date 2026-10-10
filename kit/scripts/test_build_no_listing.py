#!/usr/bin/env python3
"""A game folder with no listing (#255): at tier none it builds as new_game.py made it, with no
Source tab, no footprint and no address linked into a Source page; at Bronze or above the build
stops and says to make the listing."""
from pathlib import Path
import json
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

TEMPLATE = Path(build.ROOT) / "kit" / "template"


def new_game(root, tier="none"):
    """A game folder as new_game.py makes it, with an address on How it works and in features.md."""
    g = Path(root) / "games" / "c64" / "fixture"
    shutil.copytree(TEMPLATE, g)
    game = json.loads((g / "game.json").read_text())
    game.update(platform="c64", slug="fixture", title="Fixture", tier=tier)
    (g / "game.json").write_text(json.dumps(game))
    (g / "symbols.json").write_text(json.dumps({"schema": 1, "blocks": [], "symbols": [], "comments": []}))
    page = (g / "index.html").read_text()
    (g / "index.html").write_text(page + "\n<p>It starts at <code>$C000</code>.</p>\n")
    with open(g / "features.md", "a") as f:
        f.write("\n- It starts at `$C000`.\n")
    return g


def site(root):
    """An output folder with what build.py's main writes around the games: lib/ and the pages the
    breadcrumb links."""
    out = Path(root) / "_site"
    shutil.copytree(Path(build.SITE) / "lib", out / "lib")
    (out / "c64").mkdir()
    (out / "index.html").write_text("")
    (out / "c64" / "index.html").write_text("")
    return out


def links(f):
    p = build.AddressLinks()
    p.feed(f.read_text())
    p.close()
    return p.links


class NoListing(unittest.TestCase):
    def setUp(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen

    def tearDown(self):
        build.shot_html = self.shot

    def test_a_tier_none_game_builds_without_a_source_tab(self):
        with tempfile.TemporaryDirectory() as d:
            g, out_root = new_game(d), site(d)
            game = build.build_game(str(g), str(out_root))
            out = out_root / "c64" / "fixture"
            self.assertFalse(list(out.glob("source*.html")))
            self.assertFalse((out / "memmap.json").exists())
            for f in ("index.html", "about.html"):
                h = (out / f).read_text()
                self.assertIn('<nav class="gametabs" data-nolink="1">', h, f)
                self.assertNotIn("source.html", h, f)
                self.assertEqual(links(out / f), [], f)   # nor does site.js link the address there
            about = (out / "about.html").read_text()
            self.assertNotIn('id="memmap"', about)
            self.assertNotIn("<h2>Footprint</h2>", about)
            self.assertIn("<code>$C000</code>", about)
            self.assertEqual(build.broken_links(str(out_root)), [])
            card = build.card_html(game)
            self.assertNotIn("KB", card)
            self.assertNotIn("data-strip", card)

    def test_a_game_of_several_parts_none_listed(self):
        with tempfile.TemporaryDirectory() as d:
            g, out_root = new_game(d), site(d)
            for pid, own in (("engine", {"title": "Engine", "order": 1}),
                             ("level", {"title": "Level", "order": 2, "over": "engine"})):
                (g / "parts" / pid).mkdir(parents=True)
                (g / "parts" / pid / "part.json").write_text(json.dumps(own))
            build.build_game(str(g), str(out_root))
            out = out_root / "c64" / "fixture"
            self.assertFalse(list(out.glob("source*.html")))
            self.assertIn("In the 0 of 2 parts analysed", (out / "about.html").read_text())
            self.assertEqual(build.broken_links(str(out_root)), [])

    def test_a_bronze_game_needs_its_listing(self):
        with tempfile.TemporaryDirectory() as d:
            g = new_game(d, tier="bronze")
            with self.assertRaises(SystemExit) as e:
                build.build_game(str(g), str(Path(d) / "_site"))
            self.assertIn("has no listing.json", str(e.exception))
            self.assertIn("listing.py", str(e.exception))


if __name__ == "__main__":
    unittest.main()
