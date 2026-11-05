#!/usr/bin/env python3
"""The kit's SCUMM decoder reads the kit's test game as ScummVM runs it.

The test writes the test game (kit/scumm/testgame.py), plays it in the kit's build of ScummVM
with a trace, and checks:

  - every instruction that ran decodes, in kit/scumm/scode.py, to the opcode, the parameters
    (variable or constant, and the constants' values) and a way on that ScummVM's trace shows
    (strace.check finds nothing);
  - every conditional jump the test game checks went where the condition scode.py writes for it
    says, so the conditions' text is ScummVM's, not only their length;
  - every handler ran but the ones testgame.NOT_RUN names, and every script, room script and object
    script, one from the inventory among them; restart started the game again;
  - the opcode table is ScummVM's: each opcode names the handler engines/scumm/script_v2.cpp gives it;
  - a run repeats: the same input gives the same trace, and a screenshot is the screen's size.

The test needs the build `python3 kit/scripts/tools.py get-scummvm` makes; without it, it skips,
and with KIT_REQUIRE_TOOLS set it fails.
"""
import collections
import os
import re
import shutil
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scode  # noqa: E402
import scummvm  # noqa: E402
import strace  # noqa: E402
import testgame  # noqa: E402
from game import Game  # noqa: E402

STOP = 12          # seconds of the game's clock: the whole test game runs in about 4.5


class ScummVM(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not scummvm.available():
            if os.environ.get("KIT_REQUIRE_TOOLS"):
                raise AssertionError(f"no ScummVM for the test ({scummvm.build_line()}), and KIT_REQUIRE_TOOLS is set")
            raise unittest.SkipTest(f"no ScummVM: {scummvm.build_line()}")
        cls.work = scummvm.scratch("test-scummvm-")
        cls.game_dir = testgame.write(os.path.join(cls.work, "game"))
        cls.game = Game(cls.game_dir)
        cls.trace = os.path.join(cls.work, "run.trace")
        cls.out = scummvm.run(cls.game_dir, trace=cls.trace, stop=STOP)
        cls.steps = strace.steps(cls.trace)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.work, ignore_errors=True)

    def test_decoder_agrees(self):
        self.assertGreater(len(self.steps), 500, f"the trace is short; ScummVM printed:\n{self.out}")
        problems = [f"{strace.label(s)} at {s.at:04X}: {p}" for s, p in strace.check(self.game, self.steps)]
        self.assertEqual(problems, [], "the decoder and ScummVM read these differently")

    def test_conditions(self):
        ends = collections.defaultdict(set)
        for s in self.steps:
            ends[(s.where, s.number, s.room if s.where == "r" else None, s.at)].add(s.end)
        wrong = []
        for key, want in testgame.expectations().items():
            got = ends.get(key)
            if got != {want}:
                code, _, _ = self.game.code(key[0], key[1], key[2])
                ins = scode.decode(code, key[3])
                wrong.append(f"script {key[1]} at {key[3]:04X} {ins.text}: went on to "
                             f"{sorted(f'{e:04X}' for e in got or [] if e is not None) or 'nowhere'}, "
                             f"where the condition says {want:04X}")
        self.assertEqual(wrong, [])

    def test_everything_ran(self):
        ran = {scode.OPCODES_V12[s.opcode] for s in self.steps}
        missed = sorted(set(scode.OPCODES_V12) - ran - set(testgame.NOT_RUN))
        self.assertEqual(missed, [], "handlers that never ran")
        scripts = {s.script() for s in self.steps}
        want = {("g", n, None) for n in testgame.GLOBAL_SCRIPTS}
        for room in testgame.ROOM_SCRIPTS:
            want |= {("r", 10001, room), ("r", 10002, room)}
        want |= {("r", o, row[0]) for o, row in testgame.OBJECTS_AT.items() if o != testgame.KEY}
        want.add(("i", testgame.KEY, None))
        self.assertEqual(sorted(want - scripts), [], "scripts that never ran")
        starts = [s for s in self.steps if s.script() == ("g", 1, None) and s.at == 4]
        self.assertGreaterEqual(len(starts), 2, "restart did not start the game again")

    def test_opcode_table(self):
        """Each opcode names the handler ScummVM's version 2 table gives it (o2_, o4_, o5_ dropped)."""
        with open(os.path.join(scummvm.SRC, "engines", "scumm", "script_v2.cpp"), encoding="utf-8") as f:
            text = f.read()
        table = {int(op, 16): name for op, name in re.findall(r"OPCODE\(0x([0-9a-fA-F]{2}), o\d_(\w+)\)", text)}
        self.assertEqual(len(table), 256)
        wrong = [(f"${op:02X}", scode.OPCODES_V12[op], table[op]) for op in range(256)
                 if scode.OPCODES_V12[op] != table[op]]
        self.assertEqual(wrong, [], "opcodes the kit names differently from ScummVM")

    def test_repeats_and_screenshot(self):
        """The same input gives the same trace (the kit's clock moves only when the game waits), and
        a screenshot is 320 by 200."""
        traces = []
        for k in (1, 2):
            trace = os.path.join(self.work, f"repeat{k}.trace")
            scummvm.run(self.game_dir, "1000 shot screen.png\n3000 quit\n", os.path.join(self.work, f"shots{k}"),
                        trace=trace)
            with open(trace) as f:
                traces.append([ln for ln in f if not ln.startswith("#")])
        self.assertGreater(len(traces[0]), 100)
        self.assertEqual(traces[0], traces[1], "two runs with the same input gave different traces")
        with open(os.path.join(self.work, "shots1", "screen.png"), "rb") as f:
            png = f.read()
        self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual((int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big")), (320, 200))


if __name__ == "__main__":
    unittest.main()
