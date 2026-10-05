#!/usr/bin/env python3
"""A Bronze page made on a model not yet proven is published whole, and its banner says it awaits
a maintainer's check rather than that it is incomplete at 100 % (#142)."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

PROVEN = {"old-hand": ["declared in kit/models.json"]}
CHECK = {"by": "someone", "model": "old-hand", "date": "2026-10-04", "checked": 40, "wrong": 0}


def banner(cov, model, **more):
    steps = {s: [model] for s in ("50-coverage", "60-verify")}
    game = dict(platform="c64", slug="made-up", tier="bronze", kit_version="0.0.80",
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
        for b in (banner(60, "old-hand"), banner(60, "newcomer", verification=CHECK)):
            self.assertIn("This minisite is not complete: 60 %", b)
            self.assertNotIn("awaits", b)


if __name__ == "__main__":
    unittest.main()
