#!/usr/bin/env python3
"""`clock.py` records the work, and refuses to record a gap (#170).

A step left open over a night put 1,592 minutes in a `timings.json` for an
hour's work, and the figure is what the next run plans from. Two things stop
that now: `pause`/`resume`, so a run has a way to mark a wait instead of
leaving a step open, and a ceiling in `close_open` - a span past
`MAX_STEP_MINUTES` is refused until `--long` says the number is real.

Driven through the command line rather than by calling the functions, since
the command line is what a run uses.
"""
import datetime
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CLOCK = os.path.join(ROOT, "kit", "scripts", "clock.py")
STEP = "10-orient"


class Clock(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="clock-test-")
        with open(os.path.join(self.dir, "game.json"), "w") as f:
            json.dump({"platform": "c64", "slug": "a-fake-game", "tier": "bronze"}, f)

    def run_clock(self, *args):
        return subprocess.run([sys.executable, CLOCK] + [a for a in args if a is not None]
                              + [self.dir], cwd=ROOT, capture_output=True, text=True)

    def entries(self):
        p = os.path.join(self.dir, "timings.json")
        if not os.path.exists(p):
            return []
        with open(p) as f:
            return json.load(f)["entries"]

    def open_entries(self):
        return [e for e in self.entries() if e.get("end") is None]

    def backdate_the_open_step(self, hours):
        """What a machine that shut down does: the step keeps running."""
        p = os.path.join(self.dir, "timings.json")
        with open(p) as f:
            T = json.load(f)
        then = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
        for e in T["entries"]:
            if e.get("end") is None:
                e["start"] = then.strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(p, "w") as f:
            json.dump(T, f)

    # ---------------------------------------------------------------- pause
    def test_start_pause_resume_stop(self):
        r = self.run_clock("start", STEP, "--model", "unknown")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([e["step"] for e in self.open_entries()], [STEP])

        r = self.run_clock("pause", "--note", "waiting for the contributor")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("resume", r.stdout, "pausing should say how to start the step again")
        self.assertEqual(self.open_entries(), [])
        paused = self.entries()[-1]
        self.assertTrue(paused.get("paused"), "the paused entry is marked so resume can find it")
        self.assertIsNotNone(paused["minutes"])

        r = self.run_clock("resume", "--model", "unknown")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([e["step"] for e in self.open_entries()], [STEP],
                         "resume opens the same step again")
        self.assertEqual(len(self.entries()), 2, "and as a second session, so the minutes still sum")

        r = self.run_clock("stop")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.open_entries(), [])
        for e in self.entries():
            self.assertGreaterEqual(e["minutes"], 0.0)

    def test_resume_without_a_pause_is_refused(self):
        r = self.run_clock("resume", "--model", "unknown")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("nothing to resume", r.stdout + r.stderr)

        self.run_clock("start", STEP, "--model", "unknown")
        r = self.run_clock("resume", "--model", "unknown")
        self.assertNotEqual(r.returncode, 0, "a running step is not a paused one")

    def test_resume_needs_a_model(self):
        self.run_clock("start", STEP, "--model", "unknown")
        self.run_clock("pause")
        r = self.run_clock("resume")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("--model", r.stdout + r.stderr)

    # ------------------------------------------------------------- the gap
    def test_a_step_open_over_a_gap_is_refused(self):
        self.run_clock("start", STEP, "--model", "unknown")
        self.backdate_the_open_step(24)
        r = self.run_clock("stop")
        self.assertNotEqual(r.returncode, 0, "a 24 h span is a gap and must not be recorded")
        self.assertIn("--long", r.stdout + r.stderr, "the refusal says how to accept it if it is real")
        self.assertEqual(len(self.open_entries()), 1, "and it records nothing")
        self.assertEqual(self.entries()[0]["minutes"], None)

    def test_long_records_the_span_as_it_stands(self):
        self.run_clock("start", STEP, "--model", "unknown")
        self.backdate_the_open_step(24)
        r = self.run_clock("stop", "--long", "--note", "the machine really was up that long")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertAlmostEqual(self.entries()[0]["minutes"], 1440, delta=5,
                               msg="--long records the gap honestly rather than inventing a smaller number")

    def test_a_gap_blocks_the_next_start(self):
        """The issue's other half: `start` must not run past an open gap either."""
        self.run_clock("start", STEP, "--model", "unknown")
        self.backdate_the_open_step(24)
        r = self.run_clock("start", "20-features", "--model", "unknown")
        self.assertNotEqual(r.returncode, 0, "starting a step closes the open one, so it hits the same ceiling")
        self.assertEqual([e["step"] for e in self.open_entries()], [STEP],
                         "and the new step did not start")

    def test_pause_hits_the_ceiling_too(self):
        self.run_clock("start", STEP, "--model", "unknown")
        self.backdate_the_open_step(24)
        r = self.run_clock("pause")
        self.assertNotEqual(r.returncode, 0)
        r = self.run_clock("pause", "--long")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue(self.entries()[0].get("paused"))


if __name__ == "__main__":
    unittest.main()
