#!/usr/bin/env python3
"""sample.py draws the listing sample the same way for the same seed, keeps a stratum's
comments apart, and counts the checker's verdicts only when each was given the text drawn and
every finding has been settled (#657): on one run two drawn comments were corrected before the
checker read them, and the rate came out lower than the listing's."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sample   # noqa: E402


def write_listing(path, comments):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    records = [{"a": a, "t": "code", "l": f"l_{a:04X}", "c": c} for a, c in comments]
    records.append({"a": 0xFFFF, "t": "code"})                 # no comment: not drawn
    with open(path, "w") as f:
        json.dump({"schema": 1, "records": records}, f)


class Sample(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.g = self.tmp.name
        write_listing(os.path.join(self.g, "listing.json"),
                      [(0x1000 + i, f"hand comment {i}") for i in range(100)]
                      + [(0x2000 + i, f"Record {i}: a template's sentence") for i in range(300)])
        write_listing(os.path.join(self.g, "parts", "level", "listing.json"),
                      [(0x1000 + i, f"level comment {i}") for i in range(50)])
        self.strata = [sample.parse_stratum(r"generated=^Record \d+:")]

    def tearDown(self):
        self.tmp.cleanup()

    def test_same_seed_same_draw_with_strata_apart(self):
        a = sample.draw(self.g, 7, 60, self.strata)
        b = sample.draw(self.g, 7, 60, self.strata)
        self.assertEqual(a["comments"], b["comments"])
        self.assertNotEqual(a["comments"], sample.draw(self.g, 8, 60, self.strata)["comments"])
        self.assertEqual([(s["name"], s["population"], s["drawn"]) for s in a["strata"]],
                         [("generated", 300, 20), ("written", 150, 60)])
        self.assertEqual(set(a["listings"]), {".", "parts/level"})
        gen = [c for c in a["comments"] if c["stratum"] == "generated"]
        self.assertTrue(all(c["text"].startswith("Record ") for c in gen))
        self.assertTrue(any(c["folder"] == "parts/level" for c in a["comments"]))

    def verdicts(self, s, wrong=()):
        return [{"folder": c["folder"], "address": c["address"], "text": c["text"],
                 "verdict": "wrong-detail" if (c["folder"], c["address"]) in wrong else "right",
                 "problem": "", "evidence": ""} for c in s["comments"]]

    def test_counts_rate_interval_and_weighted_rate(self):
        s = sample.draw(self.g, 7, 60, self.strata)
        hand = [(c["folder"], c["address"]) for c in s["comments"] if c["stratum"] == "written"][:6]
        v = self.verdicts(s, hand)
        for x in v:
            if x["verdict"] != "right":
                x["held"] = True
        problems, r = sample.count(s, v)
        self.assertEqual(problems, [])
        self.assertEqual((r["size"], r["wrong"]), (80, 6))
        lo, hi = r["interval"]
        self.assertTrue(lo < 6 / 80 < hi)
        self.assertAlmostEqual(r["weighted"], 150 / 450 * 6 / 60)

    def test_text_changed_before_the_check_is_refused(self):
        s = sample.draw(self.g, 7, 60, self.strata)
        v = self.verdicts(s)
        v[3]["text"] = v[3]["text"] + ", corrected"
        problems, r = sample.count(s, v)
        self.assertIsNone(r)
        self.assertEqual(len(problems), 1)
        self.assertIn("other text than was drawn", problems[0])

    def test_unsettled_findings_and_missing_verdicts_are_refused(self):
        s = sample.draw(self.g, 7, 60, self.strata)
        first = (s["comments"][0]["folder"], s["comments"][0]["address"])
        v = self.verdicts(s, [first])[:-1]
        problems, r = sample.count(s, v)
        self.assertIsNone(r)
        self.assertEqual(len(problems), 2)
        self.assertIn('"held"', problems[0])
        self.assertIn("0 verdicts", problems[1])

    def test_a_false_alarm_is_not_counted(self):
        s = sample.draw(self.g, 7, 60, self.strata)
        first = (s["comments"][0]["folder"], s["comments"][0]["address"])
        v = self.verdicts(s, [first])
        v[0]["held"] = False
        self.assertEqual(sample.count(s, v)[1]["wrong"], 0)


if __name__ == "__main__":
    unittest.main()
