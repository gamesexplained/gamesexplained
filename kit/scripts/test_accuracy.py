#!/usr/bin/env python3
"""A game's `accuracy` lists the steps behind its listing in order. A game at Silver or above
needs a research row, an annotate row and a sample, and check_docs.py fails one without; its
page calls the listing checked only when the last sample came after a full audit and is within
the mark (at most one in 30 wrong, in a sample of at least 60), and flags it otherwise. A sample
row says how many of the comments it found wrong were then corrected, so no other row has to, and
each row ends with a bar of the whole listing as it stood after its step. A Play
tab's port, a page's port checked against the game, and an older maintainer's check are rows of
their own and change nothing the page says;
a maintainer's sample or audit carries their login as `by`. A game made before game.json carried
`accuracy` is not checked."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import accuracy  # noqa: E402

M = ["some-model"]
RESEARCH = {"step": "research", "web": "unknown", "models": ["unknown"]}
ANNOTATE = {"step": "annotate", "models": M}
FIRST = {"step": "sample", "size": 60, "wrong": 7, "fixed": 7, "models": M, "seed": 1}
AUDIT = {"step": "audit", "checked": 640, "of": 640, "fixed": 90, "models": M}
PART = {"step": "audit", "checked": 300, "of": 640, "fixed": 40, "models": M, "note": "routines only"}
AFTER = {"step": "sample", "size": 60, "wrong": 2, "fixed": 2, "models": M, "seed": 2}
PLAY = {"step": "play", "fixed": 16, "models": M}
CHECK = {"step": "check", "by": "someone", "checked": 39, "wrong": 0, "models": M}


def game(*rows, tier="silver"):
    return {"tier": tier, "coverage_percent": 100, "accuracy": list(rows)}


class Accuracy(unittest.TestCase):
    def test_the_mark_is_one_in_thirty(self):
        m = accuracy.within_mark
        self.assertTrue(m(AFTER))
        self.assertFalse(m(dict(AFTER, wrong=3)))
        self.assertTrue(m(dict(AFTER, size=90, wrong=3)))
        self.assertFalse(m(dict(AFTER, size=80, wrong=3)))
        self.assertFalse(m(dict(AFTER, size=40, wrong=0)))   # too few to say

    def test_the_range_is_wilsons(self):
        lo, hi = accuracy.wilson(2, 60)
        self.assertEqual((round(100 * lo), round(100 * hi)), (1, 11))
        self.assertEqual(round(100 * accuracy.wilson(0, 60)[1]), 6)

    def test_silver_needs_research_annotation_and_a_sample(self):
        p = accuracy.problems
        self.assertEqual(p(game(RESEARCH, ANNOTATE, FIRST)), [])
        self.assertEqual(len(p(game(RESEARCH, ANNOTATE))), 1)
        self.assertEqual(len(p(game(ANNOTATE, FIRST))), 1)
        self.assertEqual(p(game(RESEARCH, tier="bronze")), [])   # a run under way
        self.assertEqual(p({"tier": "silver"}), [])               # made before the rule
        self.assertEqual(p(dict(game(RESEARCH, ANNOTATE), created="2026-09-30")), [])   # flagged on its page instead
        self.assertEqual(len(p(dict(game(RESEARCH, ANNOTATE), created=accuracy.SAMPLE_SINCE))), 1)

    def test_each_row_is_well_formed(self):
        p = accuracy.problems
        for bad in (dict(FIRST, models=[]), dict(FIRST, wrong=61), dict(AUDIT, checked=700),
                    dict(RESEARCH, web="yes"), dict(FIRST, checker="x"), {"step": "guess", "models": M},
                    dict(AUDIT, fixed=-1), dict(ANNOTATE, note=""), dict(PLAY, fixed="some"),
                    dict(PLAY, checked=10), dict(CHECK, wrong=40), dict(CHECK, by=""), dict(FIRST, by=""),
                    {"step": "check", "models": M}):
            self.assertEqual(len(p(game(RESEARCH, ANNOTATE, FIRST, bad))), 1, bad)
        self.assertEqual(p(game(RESEARCH, ANNOTATE, FIRST, {k: v for k, v in AUDIT.items() if k != "fixed"})), [])
        self.assertEqual(p(game(RESEARCH, ANNOTATE, FIRST, {"step": "play", "models": M})), [])
        self.assertEqual(p(game(RESEARCH, ANNOTATE, FIRST, dict(AUDIT, by="someone"), dict(AFTER, by="someone"))), [])
        old = dict(game(RESEARCH, ANNOTATE, FIRST, CHECK), verification={"by": "someone"})
        self.assertEqual(len(p(old)), 1)                              # the old record, which nothing reads

    def test_the_page_calls_a_listing_checked_after_a_full_audit_and_a_sample_within_the_mark(self):
        st = accuracy.status
        self.assertIsNone(st({"tier": "silver"}))
        first = st(game(RESEARCH, ANNOTATE, FIRST))
        self.assertFalse(first["checked"])
        self.assertEqual(first["lead"], "Not audited.")
        self.assertIn("not had a full audit", first["note"])
        self.assertIn("between 6 and 22 %", first["row"])
        self.assertFalse(st(game(RESEARCH, ANNOTATE, FIRST, PART, AFTER))["checked"])   # a part is not every comment
        high = st(game(RESEARCH, ANNOTATE, FIRST, AUDIT, dict(AFTER, wrong=3)))
        self.assertFalse(high["checked"])
        self.assertTrue(high["row"].startswith("Audited & high error rate. Every comment was audited once, but"))
        self.assertIn("still found 3 wrong", high["note"])
        self.assertEqual(st(game(RESEARCH, ANNOTATE, FIRST, AUDIT, dict(AFTER, size=40, wrong=3)))["lead"],
                         "Audited & high error rate.")                        # small, and over one in 30 anyway
        small = st(game(RESEARCH, ANNOTATE, FIRST, AUDIT, dict(AFTER, size=40, wrong=1, fixed=1)))
        self.assertEqual(small["lead"], "Audited & sample too small.")
        self.assertIn("40 comments, is too small to say", small["note"])
        none = st(game(RESEARCH, ANNOTATE))
        self.assertEqual(none["row"], "Not measured. No sample of the listing’s comments has been checked.")
        self.assertFalse(st(game(RESEARCH, ANNOTATE, dict(FIRST, wrong=1, fixed=1)))["checked"])   # no audit, however good
        since = st(game(RESEARCH, ANNOTATE, FIRST, AUDIT))                              # audited, not measured since
        self.assertFalse(since["checked"])
        self.assertTrue(since["row"].startswith("Not measured since its audit. The last sample of 60 comments had 7"))
        self.assertIn("no sample has measured it since", since["note"])
        done = st(game(RESEARCH, ANNOTATE, FIRST, AUDIT, AFTER))
        self.assertTrue(done["checked"])
        self.assertEqual(st(game(RESEARCH, ANNOTATE, FIRST, AUDIT, AFTER, PLAY, CHECK)), done)   # neither samples comments
        self.assertTrue(done["row"].startswith("Audited & low error rate. Every comment was audited once"))
        self.assertEqual(done["note"], "This listing has been audited, and a later sample of 60 of its comments "
                                       "found 2 wrong, about one in 30.")

    def test_the_table_keeps_every_step_in_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "listing.json").write_text(json.dumps({"records": [{"c": "x"}, {"c": ""}, {"c": "y"}]}))
            rows = accuracy.table(game(RESEARCH, ANNOTATE, FIRST, dict(FIRST, wrong=5, fixed=3), PART, AUDIT,
                                       dict(AFTER, by="someone"), PLAY), tmp)
        self.assertEqual([r[0] for r in rows],
                         ["Research", "Annotation", "Sample 1", "Sample 2", "Audit 1", "Audit 2", "Sample 3", "Play tab"])
        self.assertEqual([r[4] for r in rows], ["research-unknown", "annotate-run", "sample-bad", "sample-bad", "audit-part",
                                                "audit-full", "sample-good", "play-port"])
        self.assertIn("corrected 16 comments it showed wrong", rows[7][2])
        self.assertTrue(rows[2][2].endswith("likely wrong. All 7 were then corrected."))
        self.assertTrue(rows[3][2].endswith(" 3 of them were then corrected."))
        self.assertEqual(rows[6][1], "someone, with some-model")      # a maintainer's sample
        self.assertIn("in 2 comments", rows[1][2])
        self.assertEqual(rows[0][1], "not recorded")
        self.assertIn("Checked 300 of 640 comments and corrected 40", rows[4][2])
        self.assertEqual(rows[4][3], "routines only")
        self.assertIn("Checked all 640 comments", rows[5][2])
        loose = {"step": "audit", "of": 640, "fixed": 6, "models": M, "note": "the movement routines"}
        self.assertEqual(accuracy.problems(game(RESEARCH, ANNOTATE, FIRST, loose)), [])
        self.assertEqual(len(accuracy.problems(game(RESEARCH, ANNOTATE, FIRST, dict(loose, note=None)))), 1)
        self.assertFalse(accuracy.full(loose))
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIn("Checked part of the 640 comments and corrected 6",
                          accuracy.table(game(RESEARCH, ANNOTATE, FIRST, loose), tmp)[3][2])
            self.assertIn("was not recorded", accuracy.table(game(RESEARCH, ANNOTATE, {"step": "play", "models": M}), tmp)[2][2])
            two = accuracy.table(game(RESEARCH, ANNOTATE, dict(CHECK, wrong=18), FIRST, CHECK), tmp)
        self.assertEqual([r[0] for r in two][2:], ["Maintainer’s check 1", "Sample 1", "Maintainer’s check 2"])
        self.assertEqual(two[2][1], "someone, with some-model")
        self.assertIn("18 were wrong, so the check failed", two[2][2])
        self.assertIn("none was wrong, so the check passed", two[4][2])

    def test_a_pages_port_has_a_row(self):
        port = {"step": "port", "fixed": 15, "models": M, "note": "the stage maps"}
        self.assertEqual(accuracy.problems(game(RESEARCH, ANNOTATE, FIRST, port)), [])
        self.assertEqual(len(accuracy.problems(game(RESEARCH, ANNOTATE, FIRST, dict(port, fixed="15")))), 1)
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "listing.json").write_text(json.dumps({"records": [{"c": "x"}] * 100}))
            rows = accuracy.table(game(RESEARCH, ANNOTATE, FIRST, port, {"step": "port", "models": M}), tmp)
        self.assertEqual([r[0] for r in rows][3:], ["Port check", "Port check"])
        self.assertEqual([r[4] for r in rows][3:], ["port-check", "port-check"])
        self.assertIn("corrected 15 comments it showed wrong", rows[3][2])
        self.assertIn("was not recorded", rows[4][2])
        self.assertTrue(rows[3][5][1].startswith("Corrected 15 of the listing’s 100 comments"))

    def test_each_row_ends_with_a_bar_of_the_listing_as_it_stood_after_the_step(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "listing.json").write_text(json.dumps({"records": [{"c": "x"}] * 640}))
            bars = [r[5] for r in accuracy.table(game(RESEARCH, ANNOTATE, FIRST, PART, AUDIT, AFTER, PLAY, CHECK), tmp)]
        shares = lambda bar: [(k, round(v, 4)) for k, v in bar[0]]
        est = lambda w, n, f=1: [(k, round(v * f, 4)) for k, v in
                                 zip(("wrong", "maybe", "right"), (lambda lo, hi: (lo, hi - lo, 1 - hi))(*accuracy.wilson(w, n)))]
        for b in bars:                                                          # each is the whole listing
            self.assertAlmostEqual(sum(v for _, v in b[0]), 1 if b[0] else 0)
        self.assertEqual(bars[0], ([], ""))                                     # research changes no comment
        self.assertEqual(bars[1], ([("done", 1.0)], "Written, not yet measured"))
        self.assertEqual(shares(bars[2]), est(7, 60))
        self.assertEqual(bars[2][1], "6 to 22 % of the listing likely wrong, at least 78 % likely right")
        part = dict(shares(bars[3]))                                            # what it did not reach, as the sample left it
        w, m, r = est(7, 60, 340 / 640)
        self.assertEqual(list(part), ["wrong", "maybe", "fixed", "right"])
        self.assertEqual((part["wrong"], part["maybe"], part["fixed"]), (w[1], m[1], round(40 / 640, 4)))
        self.assertAlmostEqual(part["right"], round(260 / 640 + r[1], 4), places=3)
        self.assertEqual(bars[3][1], "Checked 300 of 640 comments: 40 corrected, 260 right; "
                                     "the other 340 as the last sample measured them")
        self.assertEqual(shares(bars[4]), [("fixed", round(90 / 640, 4)), ("right", round(550 / 640, 4))])
        self.assertEqual(bars[4][1], "Checked 640 of 640 comments: 90 corrected, 550 right")
        self.assertEqual(shares(bars[5]), est(2, 60))
        port = dict(shares(bars[6]))
        self.assertEqual((port["fixed"], port["wrong"]), (round(16 / 640, 4), est(2, 60, 624 / 640)[0][1]))
        self.assertEqual(bars[6][1], "Corrected 16 of the listing’s 640 comments; the other 624 as the last sample measured them")
        self.assertEqual(bars[7], ([], ""))                                     # claims, not comments
        bar, measured = accuracy.ribbon, bars[5][0]
        self.assertEqual(bar({"step": "audit", "of": 640, "fixed": 6, "models": M, "note": "x"}, None, 0),
                         ([("fixed", 6 / 640), ("done", 634 / 640)],
                          "Corrected 6 of 640 comments, how many it checked not recorded; the rest not yet measured"))
        self.assertEqual(bar({"step": "audit", "fixed": 6, "models": M, "note": "x"}, None, 0), ([], ""))   # nothing to measure it by
        self.assertEqual(bar({"step": "play", "models": M}, measured, 600),
                         (measured, "How many it corrected is not recorded; the comments as the last sample measured them"))
        self.assertEqual(bar(ANNOTATE, measured, 600)[0], [("done", 1.0)])      # new comments, measured by nothing

    def test_a_sample_says_whether_its_wrong_comments_were_corrected(self):
        said = accuracy.corrected
        self.assertEqual(said(dict(FIRST, wrong=0, fixed=0)), "")
        self.assertEqual(said(dict(FIRST, wrong=1, fixed=1)), " It was then corrected.")
        self.assertEqual(said(AFTER), " Both were then corrected.")
        self.assertEqual(said(FIRST), " All 7 were then corrected.")
        self.assertEqual(said(dict(FIRST, fixed=1)), " 1 of them was then corrected.")
        self.assertEqual(said(dict(FIRST, fixed=0)), " None of them was corrected.")
        self.assertEqual(said(dict(AFTER, wrong=1, fixed=None)), " Whether it was then corrected was not recorded.")
        self.assertEqual(said({k: v for k, v in FIRST.items() if k != "fixed"}),
                         " Whether they were then corrected was not recorded.")
        p = accuracy.problems
        unsaid = {k: v for k, v in FIRST.items() if k != "fixed"}
        self.assertEqual(len(p(game(RESEARCH, ANNOTATE, unsaid))), 1)                   # a run on the kit as it is
        self.assertEqual(len(p(dict(game(RESEARCH, ANNOTATE, unsaid), created=accuracy.FIXED_SINCE))), 1)
        self.assertEqual(p(dict(game(RESEARCH, ANNOTATE, unsaid), created="2026-10-10")), [])   # says "not recorded"
        self.assertEqual(p(game(RESEARCH, ANNOTATE, dict(unsaid, wrong=0))), [])          # nothing to correct
        self.assertEqual(len(p(game(RESEARCH, ANNOTATE, dict(FIRST, fixed=8)))), 1)        # more than it found
        self.assertEqual(len(p(game(RESEARCH, ANNOTATE, dict(FIRST, fixed="all")))), 1)

    def test_the_check_reads_every_game(self):
        made = {"old": {"tier": "silver"},
                "good": game(RESEARCH, ANNOTATE, FIRST),
                "bad": game(RESEARCH, ANNOTATE)}
        with tempfile.TemporaryDirectory() as tmp:
            for slug, g in made.items():
                d = Path(tmp, "games", "x", slug)
                d.mkdir(parents=True)
                (d / "game.json").write_text(json.dumps(g))
            self.assertEqual(accuracy.check(tmp), 1)


if __name__ == "__main__":
    unittest.main()
