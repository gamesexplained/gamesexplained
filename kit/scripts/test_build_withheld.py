#!/usr/bin/env python3
"""A game whose annotated listing is withheld, game.json's "publish_source": false. Its Source
tab keeps the line on the comments and says the annotations are not published, with none of the
listing, the facts or a part's page; no tab links an address into it, the About tab's map opens
nothing, and the site serves no listing.json and no symbols.json. A page that names pieces of a
listing in a data-listing tag gets those records with only their addresses, types, labels and
bytes."""
from pathlib import Path
import json
import re
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
from test_build_no_listing import new_game, site, links  # noqa: E402

LISTING = {"schema": 1,
           "records": [{"a": 0xC000, "t": "code", "l": "start", "c": "The start: clears A and returns.",
                        "b": [0xA9, 0x00, 0x60], "d": "LDA #$00"},
                       {"a": 0xC003, "t": "data", "l": "table", "c": "The table the start never reads.",
                        "b": [1, 2]}],
           "index": [{"a": 0xC000, "n": "start", "k": "routine", "len": 3, "c": True}]}
LEDGER = [{"step": "annotate", "models": ["m"]},
          {"step": "sample", "size": 60, "wrong": 10, "fixed": 10, "seed": 1, "models": ["m"]}]


def embedded(page):
    """{url: listing} for each data-listing tag on a built page."""
    return {u: json.loads(j) for u, j in
            re.findall(r'<script type="application/json" data-listing="([^"]+)">(.*?)</script>', page, re.S)}


def listed_game(root, parts=False, publish=False):
    """The fixture game at Silver with a listing, its own or one part's, and the flag set unless
    publish. How it works names the listing's start in a data-listing tag."""
    g = new_game(root)
    game = json.loads((g / "game.json").read_text())
    game.update(tier="silver", accuracy=LEDGER)
    if not publish:
        game["publish_source"] = False
    (g / "game.json").write_text(json.dumps(game))
    (g / "facts.md").write_text("# Facts\n\n- The start is at `$C000`.\n")
    where, url = g, "listing.json"
    if parts:
        where, url = g / "parts" / "engine", "parts/engine/listing.json"
        where.mkdir(parents=True)
        (where / "part.json").write_text(json.dumps({"title": "Engine", "order": 1}))
        (where / "facts.md").write_text("- The engine's start is at `$C000`.\n")
    (where / "listing.json").write_text(json.dumps(LISTING))
    with open(g / "index.html", "a") as f:
        f.write(f'<script type="application/json" data-listing="{url}">["start"]</script>\n')
    return g


class Withheld(unittest.TestCase):
    def setUp(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen

    def tearDown(self):
        build.shot_html = self.shot

    def check(self, parts):
        with tempfile.TemporaryDirectory() as d:
            g, out_root = listed_game(d, parts), site(d)
            build.build_game(str(g), str(out_root))
            out = out_root / "c64" / "fixture"
            self.assertEqual(sorted(p.name for p in out.glob("source*.html")), ["source.html"])
            src = (out / "source.html").read_text()
            self.assertIn(build.WITHHELD, src)
            self.assertIn('class="srcnote', src)          # the line on the comments stays
            for gone in ('id="src"', 'id="facts"', "The start is at", "clears A"):
                self.assertNotIn(gone, src)
            for f in ("index.html", "about.html", "source.html"):
                h = (out / f).read_text()
                self.assertIn('<nav class="gametabs" data-nolink="1">', h, f)
                self.assertEqual(links(out / f), [], f)
            about = (out / "about.html").read_text()
            self.assertIn(build.WITHHELD, about)
            self.assertNotIn("listing.json", about)
            self.assertIs(json.loads((out / "memmap.json").read_text())["source"], False)
            self.assertFalse(list(out.rglob("listing.json")))
            self.assertFalse(list(out.rglob("symbols.json")))
            page = (out / "index.html").read_text()
            url = "parts/engine/listing.json" if parts else "listing.json"
            self.assertEqual(embedded(page)[url]["records"],
                             [{"a": 0xC000, "t": "code", "l": "start", "b": [0xA9, 0x00, 0x60]}])
            for gone in ("clears A", "LDA #$00", '"index"'):
                self.assertNotIn(gone, page)
            self.assertEqual(build.broken_links(str(out_root)), [])

    def test_a_game_of_one_part(self):
        self.check(parts=False)

    def test_a_game_of_several_parts(self):
        self.check(parts=True)


if __name__ == "__main__":
    unittest.main()
