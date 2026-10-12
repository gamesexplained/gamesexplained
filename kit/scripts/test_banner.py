#!/usr/bin/env python3
"""A Bronze page made on a model not yet proven is published whole, and its banner says it awaits
a maintainer's check rather than that it is incomplete at 100 % (#142). At Silver and above, a
listing not yet audited and sampled within the mark gets a line of its own (accuracy.py)."""
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
        self.assertIn("kit/CHECKING.md", b)
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

    def test_silver_flags_a_listing_until_it_is_checked(self):
        m = ["old-hand"]
        start = [{"step": "research", "web": True, "models": m}, {"step": "annotate", "models": m}]
        first = {"step": "sample", "size": 60, "wrong": 7, "models": m}
        audit = {"step": "audit", "checked": 600, "of": 600, "fixed": 70, "models": m}
        after = {"step": "sample", "size": 60, "wrong": 2, "models": m}
        b = banner(100, "old-hand", tier="silver", accuracy=start + [first])
        self.assertIn('<span class="flag">Its listing has not had a full audit: a sample of 60 of its comments found 7 wrong', b)
        self.assertIn("still found 3 wrong",
                      banner(100, "old-hand", tier="gold", accuracy=start + [first, audit, dict(after, wrong=3)]))
        for b in (banner(100, "old-hand", tier="silver", accuracy=start + [first, audit, after]),
                  banner(100, "old-hand", tier="silver"),                          # made before the record
                  banner(60, "old-hand", accuracy=start + [first])):              # Bronze says it is unfinished
            self.assertNotIn('class="flag"', b)

if __name__ == "__main__":
    unittest.main()
