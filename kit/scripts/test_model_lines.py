#!/usr/bin/env python3
"""A line of models declared in kit/models.json is proven from its first version on.

`lines` names a line and the version it starts at: {"claude-opus": {"from": "5.5"}}. Every
model of the line at or above that version is proven, with no entry of its own, and a model
below it, or of another line, is not. Made-up games in a temp dir show what follows: a
Silver game run on a model of the line needs no check, one run below the line's first
version does, and a maintainer's sample drawn on a model of the line counts as the check.
"""
import json, os, sys, tempfile, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models  # noqa: E402

LINES = {"claude-opus": {"from": "5.5", "why": "a test"}, "claude-fable": {"from": "5.1", "why": "a test"}}
IN = ["claude-opus-5-5", "claude-opus-5-5[1m]", "claude-opus-5-6", "claude-opus-5-10", "claude-opus-6",
      "claude-opus-6-1[200k]", "claude-opus-10", "claude-opus-5-5-20260801", "claude-opus-6-20270101",
      "anthropic/claude-opus-5-5", "Claude-Opus-5-5",
      "claude-fable-5-1", "claude-fable-5-2[1m]", "claude-fable-5.2", "claude-fable-6", "anthropic/claude-fable-5-2"]
OUT = ["claude-opus-5", "claude-opus-5-4", "claude-opus-4-8", "claude-opus-5-20260101", "claude-opus",
       "claude-opus-5-5-preview", "claude-fable-5", "claude-fable-5-0", "claude-fable-4-9",
       "claude-sonnet-5-5", "claude-haiku-6", "claude-mythos-5-2", "gpt-6", "gpt-6.1-terra", "unknown", ""]


class Lines(unittest.TestCase):
    def setUp(self):
        self.keep, self.tmp = models.ROOT, tempfile.TemporaryDirectory()
        models.ROOT = self.tmp.name
        os.makedirs(os.path.join(self.tmp.name, "kit"))
        self.write({"lines": LINES, "declared": {"old-hand": "a test"}})

    def tearDown(self):
        models.ROOT = self.keep
        self.tmp.cleanup()

    def write(self, d):
        with open(os.path.join(self.tmp.name, "kit", "models.json"), "w") as f:
            json.dump(d, f)

    def game(self, slug, g, *ms):
        d = os.path.join(self.tmp.name, "games", "x", slug)
        os.makedirs(d)
        with open(os.path.join(d, "game.json"), "w") as f:
            json.dump(dict(g, step_models={s: list(ms) for s in models.PROVING_STEPS}), f)

    def test_a_model_at_or_above_the_first_version_is_proven(self):
        for m in IN:
            self.assertTrue(models.is_proven(m), m)

    def test_a_model_below_it_or_of_another_line_is_not(self):
        for m in OUT:
            self.assertFalse(models.is_proven(m), m)

    def test_an_id_still_proves_itself_without_a_line(self):
        self.write({"declared": {"old-hand": "a test"}})
        self.assertTrue(models.is_proven("old-hand"))
        self.assertFalse(models.is_proven("claude-opus-5-5"))
        self.assertEqual(models.lines(), {})

    def test_a_line_with_no_readable_version_declares_nothing(self):
        self.write({"lines": {"claude-opus": {"from": "new"}, "claude-fable": {}}})
        self.assertEqual(models.lines(), {})
        self.assertFalse(models.is_proven("claude-opus-6"))

    def test_games_on_the_line_need_no_check_and_a_sample_on_it_is_a_check(self):
        mine = lambda m: [{"step": "research", "web": True, "models": [m]}, {"step": "annotate", "models": [m]}]
        sample = {"step": "sample", "size": 60, "wrong": 1, "fixed": 1, "by": "someone", "models": ["claude-fable-5-3[1m]"]}
        made = {
            "on-the-line": ({"tier": "silver", "kit_version": "0.0.60"}, ["claude-fable-5-2[1m]"]),
            "below-it": ({"tier": "silver", "kit_version": "0.0.60"}, ["claude-opus-5"]),
            "mixed": ({"tier": "silver", "kit_version": "0.0.60"}, ["claude-opus-6", "newcomer"]),
            "sampled-on-it": ({"tier": "silver", "kit_version": "0.0.60", "accuracy": mine("newcomer") + [sample]}, ["newcomer"]),
            "sampled-below-it": ({"tier": "silver", "kit_version": "0.0.60",
                                  "accuracy": mine("newcomer") + [dict(sample, models=["claude-fable-5"])]}, ["newcomer"]),
        }
        for slug, (g, ms) in made.items():
            self.game(slug, g, *ms)
        P, untrusted = models.settle()
        self.assertEqual({os.path.basename(u[0]): u[1] for u in untrusted},
                         {"below-it": ["claude-opus-5"], "mixed": ["newcomer"], "sampled-below-it": ["newcomer"]})
        self.assertEqual(P.get("claude-fable-5-2"), [os.path.join("games", "x", "on-the-line")])   # listed with its game
        self.assertNotIn("newcomer", P)                                                            # a check proves no model
        waits = {slug: models.awaits_check(dict(g, step_models={s: ms for s in models.PROVING_STEPS}), P)
                 for slug, (g, ms) in made.items()}
        self.assertEqual(waits, {"on-the-line": [], "below-it": ["claude-opus-5"], "mixed": ["newcomer"],
                                 "sampled-on-it": [], "sampled-below-it": ["newcomer"]})

    def test_the_list_names_each_line(self):
        self.assertEqual(models.proven_names({"old-hand": []}),
                         ["claude-fable from 5.1 on", "claude-opus from 5.5 on", "old-hand"])


if __name__ == "__main__":
    unittest.main(warnings='ignore')   # models.py opens files the way the kit does, unclosed
