#!/usr/bin/env python3
"""A game at Silver or above needs a sample of its listing's comments, and check_docs.py fails
one that has none; its page calls the listing checked only when the last sample came after a full
audit and is within the mark (at most one in 30 wrong, in a sample of at least 60), and flags it
otherwise. A game made before game.json carried `listing_samples` is not checked."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import listing_samples  # noqa: E402

FIRST = {"seed": 1, "size": 60, "wrong": 7, "audits": 0, "checker": "some-model"}
AFTER = {"seed": 2, "size": 60, "wrong": 2, "audits": 1, "checker": "some-model"}


class ListingSamples(unittest.TestCase):
    def test_the_mark_is_one_in_thirty(self):
        m = listing_samples.within_mark
        self.assertTrue(m(AFTER))
        self.assertFalse(m(dict(AFTER, wrong=3)))
        self.assertTrue(m(dict(AFTER, size=90, wrong=3)))
        self.assertFalse(m(dict(AFTER, size=80, wrong=3)))
        self.assertFalse(m(dict(AFTER, size=40, wrong=0)))   # too few to say

    def test_the_range_is_wilsons(self):
        lo, hi = listing_samples.wilson(2, 60)
        self.assertEqual((round(100 * lo), round(100 * hi)), (1, 11))
        self.assertEqual(round(100 * listing_samples.wilson(0, 60)[1]), 6)

    def test_silver_needs_a_sample_and_not_the_mark(self):
        p = listing_samples.problems
        self.assertEqual(p({"tier": "silver", "listing_samples": [FIRST]}), [])
        self.assertEqual(len(p({"tier": "gold", "listing_samples": []})), 1)
        self.assertEqual(p({"tier": "bronze", "listing_samples": []}), [])   # a run under way
        self.assertEqual(p({"tier": "silver"}), [])                          # made before the rule

    def test_each_sample_names_its_checker_and_audits(self):
        for key in ("checker", "audits"):
            bad = dict(AFTER)
            del bad[key]
            self.assertEqual(len(listing_samples.problems({"tier": "bronze", "listing_samples": [bad]})), 1)
        self.assertEqual(len(listing_samples.problems({"listing_samples": [AFTER, FIRST]})), 1)   # audits undone

    def test_the_page_flags_a_listing_until_an_audit_and_a_sample_within_the_mark(self):
        st = listing_samples.status
        self.assertIsNone(st({"tier": "silver"}))
        first = st({"tier": "silver", "listing_samples": [FIRST]})
        self.assertFalse(first["checked"])
        self.assertIn("not been audited", first["flag"])
        self.assertIn("between 6 and 22 %", first["row"])
        self.assertFalse(st({"listing_samples": [FIRST, dict(AFTER, wrong=3)]})["checked"])
        self.assertFalse(st({"listing_samples": [dict(FIRST, wrong=1)]})["checked"])   # no audit, however good
        done = st({"listing_samples": [FIRST, AFTER]})
        self.assertTrue(done["checked"])
        self.assertIsNone(done["flag"])
        self.assertTrue(done["row"].startswith("Checked. Every comment was audited once"))

    def test_the_check_reads_every_game(self):
        made = {"old": {"tier": "silver"},
                "good": {"tier": "silver", "listing_samples": [FIRST]},
                "bad": {"tier": "silver", "listing_samples": []}}
        with tempfile.TemporaryDirectory() as tmp:
            for slug, g in made.items():
                d = Path(tmp, "games", "x", slug)
                d.mkdir(parents=True)
                (d / "game.json").write_text(json.dumps(g))
            self.assertEqual(listing_samples.check(tmp), 1)


if __name__ == "__main__":
    unittest.main()
