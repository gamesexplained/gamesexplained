#!/usr/bin/env python3
"""A Bronze page made on a model not yet proven is published whole, and its banner says it awaits
a maintainer's check rather than that it is incomplete at 100 % (#142). At Silver and above, the
Source tab says how accurate the listing's comments are (accuracy.py), and the banner leaves it out."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

PROVEN = {"old-hand": ["declared in kit/models.json"]}
CHECKED = [{"step": "research", "web": True, "models": ["newcomer"]}, {"step": "annotate", "models": ["newcomer"]},
           {"step": "sample", "size": 60, "wrong": 1, "by": "someone", "models": ["old-hand"]}]


def banner(cov, model, tier="bronze", **more):
    steps = {s: [model] for s in ("50-coverage", "60-verify")}
    game = dict(platform="c64", slug="made-up", tier=tier, kit_version="0.0.80",
                coverage_percent=cov, step_models=steps, **more)
    keep = build.proven_models
    build.proven_models = lambda: PROVEN
    try:
        return build.banner(game, [])
    finally:
        build.proven_models = keep


class Banner(unittest.TestCase):
    def test_a_whole_run_on_an_unproven_model_awaits_the_check(self):
        b = banner(100, "newcomer[1m]")
        self.assertIn("awaits a maintainer’s check", b)
        self.assertIn("A model this site has not proven yet worked on it (newcomer)", b)
        self.assertIn('href="../../accuracy.html#check"', b)
        self.assertNotIn("not complete", b)

    def test_an_unfinished_one_says_both(self):
        b = banner(60, "newcomer")
        self.assertIn("awaits a maintainer’s check", b)
        self.assertIn("not complete either: 60 % of the program is explained", b)
        self.assertIn('data-copy="#prompt"', b)

    def test_an_imported_analysis_by_a_model_nobody_named(self):
        b = banner(100, "old-hand", imported={"model": "unknown"})
        self.assertIn("(one whose name was not recorded)", b)

    def test_proven_or_checked_is_only_unfinished(self):
        for b in (banner(60, "old-hand"), banner(60, "newcomer", accuracy=CHECKED)):
            self.assertIn("This minisite is not complete: 60 %", b)
            self.assertNotIn("awaits", b)

    def test_the_source_tab_says_how_accurate_the_listing_is_and_the_banner_does_not(self):
        m = ["old-hand"]
        start = [{"step": "research", "web": True, "models": m}, {"step": "annotate", "models": m}]
        first = {"step": "sample", "size": 60, "wrong": 7, "models": m}
        audit = {"step": "audit", "checked": 600, "of": 600, "fixed": 70, "models": m}
        after = {"step": "sample", "size": 60, "wrong": 2, "models": m}

        def note(tier, rows=None):
            return build.source_note(dict(platform="c64", slug="made-up", tier=tier,
                                          **({"accuracy": rows} if rows is not None else {})))
        self.assertNotIn("audit", banner(100, "old-hand", tier="silver", accuracy=start + [first]))
        n = note("silver", start + [first])
        self.assertIn('<p class="srcnote bad"><b>Not audited.</b> This listing has not had a full audit: '
                      'a sample of 60 of its comments found 7 wrong', n)
        self.assertIn('See <a href="about.html#ledger">every step on the About tab</a>, '
                      'or <a href="../../accuracy.html#row">how listings are checked</a>.</p>', n)
        self.assertIn("<b>Audited &amp; high error rate.</b>", note("gold", start + [first, audit, dict(after, wrong=3)]))
        self.assertIn('<p class="srcnote ok"><b>Audited &amp; low error rate.</b>', note("silver", start + [first, audit, after]))
        self.assertEqual(note("silver"), "")                                  # made before the record
        self.assertEqual(note("bronze", start + [first]), "")                 # Bronze says it is unfinished


if __name__ == "__main__":
    unittest.main()
