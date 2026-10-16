#!/usr/bin/env python3
"""A page of a withheld game names the pieces of a listing it reads in a <script
type="application/json" data-listing="URL"> tag and gets those records of the game folder's
listing in place of the list, cut to address, type, label and bytes: a label stands for its record
and those after it up to the next label, a range "$C000-$C3FF" for every record with a byte in it.
It names no fields beyond those. A page of a game whose listing is published fetches the whole
listing, which the site serves, and a tag on it is left out of the built page. A piece the listing
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

    def built(self, pieces, url="listing.json", parts=False, fields=None, publish=False):
        """The listing the fixture's How it works carries once built, its data-listing tag naming
        pieces for url (None when the tag is left out), and the JSON files served beside it."""
        with tempfile.TemporaryDirectory() as d:
            g, out_root = listed_game(d, parts, publish=publish), site(d)
            where = g / "parts" / "engine" if parts else g
            L = dict(LISTING, records=LISTING["records"] + [GAP, MORE])
            (where / "listing.json").write_text(json.dumps(L))
            page = (g / "index.html").read_text()
            tag = f'data-listing="{"parts/engine/listing.json" if parts else "listing.json"}">["start"]'
            more = f' data-fields="{fields}"' if fields is not None else ""
            (g / "index.html").write_text(page.replace(tag, f'data-listing="{url}"{more}>{json.dumps(pieces)}'))
            build.build_game(str(g), str(out_root))
            out = out_root / "c64" / "fixture"
            built = (out / "index.html").read_text()
            E = embedded(built).get(url)
            served = {str(p.relative_to(out)): json.loads(p.read_text()) for p in out.rglob("*.json")}
            if E is None:
                self.assertNotIn("data-listing", built)
                return None, served
            self.assertNotIn("index", E)
            self.assertEqual(E["schema"], 1)
            return E, served

    def test_a_label_brings_its_records_cut_to_their_bytes(self):
        E, served = self.built(["table"])
        self.assertEqual(E["records"], [TABLE, GAP])
        self.assertEqual([f for f in served if "listing" in f], [])     # a withheld game serves none

    def test_a_range_brings_every_record_with_a_byte_in_it(self):
        E, _ = self.built(["$C001-$C003", "$C100-$C100"])
        self.assertEqual(E["records"], [START, TABLE, MORE])

    def test_a_part_listing(self):
        E, served = self.built(["start"], "parts/engine/listing.json", parts=True)
        self.assertEqual(E["records"], [START])
        self.assertEqual([f for f in served if "listing" in f], [])

    def test_a_published_listing_is_served_whole_and_the_tag_left_out(self):
        for parts, at in ((False, ""), (True, "parts/engine/")):
            for fields in (None, "d"):
                E, served = self.built(["start"], at + "listing.json", parts=parts, fields=fields, publish=True)
                self.assertIsNone(E)
                self.assertEqual(served[at + "listing.json"]["records"], LISTING["records"] + [GAP, MORE])
                self.assertEqual([f for f in served if "listing" in f], [at + "listing.json"])

    def test_fields_on_a_withheld_game_stop_the_build(self):
        with self.assertRaises(SystemExit) as e:
            self.built(["start"], fields="d")
        self.assertIn("publish_source", str(e.exception))

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
