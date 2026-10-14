#!/usr/bin/env python3
"""A page that names pieces of a listing in a <script type="application/json" data-listing="URL">
tag gets those records of the game folder's listing in place of the list, each cut to its address,
type, label and bytes: a label stands for its record and those after it up to the next label, a
range "$C000-$C3FF" for every record with a byte in it. The listing.json the Source tab reads is still served. A piece the listing
does not have, or a URL the game folder has no listing at, stops the build."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
from test_build_no_listing import site  # noqa: E402
from test_build_withheld import LISTING, listed_game, embedded  # noqa: E402

GAP = {"a": 0xC005, "t": "gap", "b": []}
START, TABLE = ({k: r[k] for k in ("a", "t", "l", "b")} for r in LISTING["records"])
MORE = {"a": 0xC100, "t": "data", "l": "more", "b": [7]}


class Embed(unittest.TestCase):
    def setUp(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen

    def tearDown(self):
        build.shot_html = self.shot

    def built(self, pieces, url="listing.json", parts=False):
        """The records the fixture's How it works carries once built, its data-listing tag naming
        pieces for url, and the names of the files served beside it."""
        with tempfile.TemporaryDirectory() as d:
            g, out_root = listed_game(d, parts, publish=True), site(d)
            where = g / "parts" / "engine" if parts else g
            L = dict(LISTING, records=LISTING["records"] + [GAP, MORE])
            (where / "listing.json").write_text(json.dumps(L))
            page = (g / "index.html").read_text()
            tag = f'data-listing="{"parts/engine/listing.json" if parts else "listing.json"}">["start"]'
            (g / "index.html").write_text(page.replace(tag, f'data-listing="{url}">{json.dumps(pieces)}'))
            build.build_game(str(g), str(out_root))
            out = out_root / "c64" / "fixture"
            E = embedded((out / "index.html").read_text())[url]
            self.assertNotIn("index", E)
            self.assertEqual(E["schema"], 1)
            return E["records"], sorted(str(p.relative_to(out)) for p in out.rglob("*.json"))

    def test_a_label_brings_its_records_without_their_comments(self):
        recs, served = self.built(["table"])
        self.assertEqual(recs, [TABLE, GAP])
        self.assertIn("listing.json", served)
        self.assertIn("symbols.json", served)

    def test_a_range_brings_every_record_with_a_byte_in_it(self):
        recs, _ = self.built(["$C001-$C003", "$C100-$C100"])
        self.assertEqual(recs, [START, TABLE, MORE])

    def test_a_part_listing(self):
        recs, served = self.built(["start"], "parts/engine/listing.json", parts=True)
        self.assertEqual(recs, [START])
        self.assertIn("parts/engine/listing.json", served)

    def test_an_unknown_label_stops_the_build(self):
        with self.assertRaises(SystemExit) as e:
            self.built(["nowhere"])
        self.assertIn("'nowhere'", str(e.exception))

    def test_a_listing_the_folder_lacks_stops_the_build(self):
        with self.assertRaises(SystemExit) as e:
            self.built(["start"], "parts/gone/listing.json")
        self.assertIn("parts/gone/listing.json", str(e.exception))


if __name__ == "__main__":
    unittest.main()
