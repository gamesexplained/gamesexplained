#!/usr/bin/env python3
"""r2000.py --seed disassembles from every start in a code map until each is inside a code block
(#642). The disassembler's walk stops at an RTS, an RTI or an indirect JMP, so a routine that
starts on the byte after one is left out when only the first address of each run is given. A
stand-in for the disassembler walks from an address to the end of its routine."""
import json
import os
import sys
import tempfile
import unittest
from unittest import mock

import r2000  # noqa: E402

# three routines back to back, as a code map holds them in one run; $1020 is a start the
# stand-in refuses to walk from (bytes the game rewrote after they ran)
ROUTINES = [(0x1000, 0x100A), (0x100B, 0x1010), (0x1011, 0x101F), (0x1020, 0x1022)]
REFUSED = {0x1020}


class Disassembler:
    def __init__(self):
        self.code, self.calls = set(), []

    def blocks(self):
        out, run = [], None
        for a in sorted(self.code):
            if run and a == run[1] + 1:
                run[1] = a
            else:
                run = [a, a]
                out.append(run)
        return [{"start_address": s, "end_address": e, "type": "Code"} for s, e in out]

    def call(self, rpc, name, arguments):
        if name == "r2000_get_blocks":
            return json.dumps(self.blocks())
        assert name == "r2000_batch_execute", name
        results = []
        for c in arguments["calls"]:
            a = c["arguments"]["address"]
            self.calls.append(a)
            if a in REFUSED:
                results.append({"status": "error", "error": "not code"})
                continue
            end = next(e for s, e in ROUTINES if s <= a <= e)
            self.code |= set(range(a, end + 1))
            results.append({"status": "success", "result": {"content": [{"text": "ok"}]}})
        return json.dumps(results)


class Seed(unittest.TestCase):
    def run_seed(self, starts, per_round, already=()):
        d = Disassembler()
        d.code |= set(already)
        with tempfile.TemporaryDirectory() as g:
            open(os.path.join(g, "game.json"), "w").write("{}")
            path = os.path.join(g, "codemap.json")
            json.dump({"starts": starts, "code": [[0x1000, 0x1022]]}, open(path, "w"))
            with mock.patch.object(r2000, "make_client", lambda gdir=None: None), \
                    mock.patch.object(r2000, "call", d.call), \
                    mock.patch("sys.stdout", new=open(os.devnull, "w")):
                left = r2000.seed(path, explicit=g, per_round=per_round)
            log = [json.loads(l)["arguments"]["address"] for l in open(os.path.join(g, "work", "annotations.jsonl"))]
        return left, d, log

    def test_every_routine_after_a_stop_is_reached(self):
        starts = [0x1000, 0x1003, 0x100B, 0x100E, 0x1011, 0x1018]
        left, d, log = self.run_seed(starts, per_round=60)
        self.assertEqual(left, 0)
        for s, e in ROUTINES[:3]:
            self.assertTrue(set(range(s, e + 1)) <= d.code)
        self.assertEqual(log, d.calls)       # each walk that took is in the replay log

    def test_one_a_round_skips_what_an_earlier_walk_took_in(self):
        starts = [0x1000, 0x1003, 0x100B, 0x100E, 0x1011, 0x1018]
        left, d, _ = self.run_seed(starts, per_round=1, already=range(0x1000, 0x100B))
        self.assertEqual(left, 0)
        self.assertEqual(d.calls, [0x100B, 0x1011])

    def test_a_refused_start_is_counted_and_the_rest_still_seeded(self):
        starts = [0x1020, 0x1000, 0x100B, 0x1011]
        left, d, log = self.run_seed(starts, per_round=1)
        self.assertEqual(left, 1)
        self.assertEqual(sorted(d.calls), [0x1000, 0x100B, 0x1011, 0x1020])
        self.assertNotIn(0x1020, log)


if __name__ == "__main__":
    unittest.main()
