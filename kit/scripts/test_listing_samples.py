#!/usr/bin/env python3
"""A game at Silver or above needs its last sample of listing comments within the pass mark
(at most one in 30 wrong, in a sample of at least 60), and check_docs.py fails one that is not;
a game made before game.json carried `listing_samples` is not checked."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import listing_samples  # noqa: E402

FAIL = {"seed": 1, "size": 60, "wrong": 7, "checker": "some-model"}
PASS = {"seed": 2, "size": 60, "wrong": 2, "checker": "some-model"}


class ListingSamples(unittest.TestCase):
    def test_the_mark_is_one_in_thirty(self):
        self.assertTrue(listing_samples.passes(PASS))
        self.assertFalse(listing_samples.passes(dict(PASS, wrong=3)))
        self.assertTrue(listing_samples.passes(dict(PASS, size=90, wrong=3)))
        self.assertFalse(listing_samples.passes(dict(PASS, size=80, wrong=3)))
        self.assertFalse(listing_samples.passes(dict(PASS, size=40, wrong=0)))   # too few to say

    def test_silver_needs_the_last_sample_to_pass(self):
        p = listing_samples.problems
        self.assertEqual(p({"tier": "silver", "listing_samples": [FAIL, PASS]}), [])
        self.assertEqual(len(p({"tier": "silver", "listing_samples": [PASS, FAIL]})), 1)
        self.assertEqual(len(p({"tier": "gold", "listing_samples": []})), 1)
        self.assertEqual(p({"tier": "bronze", "listing_samples": [FAIL]}), [])   # a run under way
        self.assertEqual(p({"tier": "silver"}), [])                              # made before the rule

    def test_each_sample_names_its_checker(self):
        bad = dict(PASS)
        del bad["checker"]
        self.assertEqual(len(listing_samples.problems({"tier": "bronze", "listing_samples": [bad]})), 1)

    def test_the_check_reads_every_game(self):
        made = {"old": {"tier": "silver"},
                "good": {"tier": "silver", "listing_samples": [FAIL, PASS]},
                "bad": {"tier": "silver", "listing_samples": [FAIL]}}
        with tempfile.TemporaryDirectory() as tmp:
            for slug, g in made.items():
                d = Path(tmp, "games", "x", slug)
                d.mkdir(parents=True)
                (d / "game.json").write_text(json.dumps(g))
            self.assertEqual(listing_samples.check(tmp), 1)


if __name__ == "__main__":
    unittest.main()
