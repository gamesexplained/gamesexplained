#!/usr/bin/env python3
"""Beam-phase and video-chip regression checks; no emulator, ROMs or game image required."""
import re
import unittest
from unittest import mock
import frame
from frame import phase


class PhaseTests(unittest.TestCase):
    def test_quiet_frame_with_no_intermediate_writes(self):
        self.assertEqual(phase([(0, 0), (19656, 0), (19717, 0), (19718, 1)], 312, 63), (1, 0))

    def test_multiple_frames_between_samples(self):
        self.assertEqual(phase([(0, 0), (58968, 0), (59029, 0), (59030, 1)], 312, 63), (1, 0))

    def test_dense_samples_and_wrap(self):
        origin = 19590
        samples = []
        for elapsed in range(0, 500, 3):
            clock = (origin + elapsed) % 19656
            line = 311 if clock == 0 else clock // 63
            samples.append((elapsed, line))
        low, width = phase(samples, 312, 63)
        self.assertLessEqual(low, origin)
        self.assertGreaterEqual(low + width, origin)
        self.assertLess(width, 3)

    def test_contradictory_measurements_fail(self):
        with self.assertRaises(RuntimeError):
            phase([(0, 10), (1, 20)], 312, 63)

    def test_empty_samples_fail(self):
        with self.assertRaises(ValueError):
            phase([], 312, 63)


class FakeMachine:
    """The MCP side of the emulator, for vicii(): a standard, a chip, and whether it stopped."""
    def __init__(self, std, chip, paused=False):
        self.std, self.chip, self.stopped, self.rpc = std, chip, paused, None

    def j(self, tool, args=None):
        return {"video_standard": self.std}

    def _call(self, rpc, tool, args):
        pass

    def paused(self):
        return self.stopped


class ChipTests(unittest.TestCase):
    def vicii(self, machine):
        sent = []

        def monitor(cmd):
            sent.append(cmd)
            if cmd.startswith("resourceset"):
                machine.chip = int(re.findall(r'"(\d+)"', cmd)[0])
                return "(C:$e5cd) "
            return f"(C:$e5cd) VICIIModel={machine.chip}\n(C:$e5cd) "
        with mock.patch("codemap.monitor", monitor), mock.patch("builtins.print"):
            frame.vicii(machine)
        return sent

    def test_pal_after_a_switch_gets_the_8565_back(self):
        m = FakeMachine("PAL", 0)
        sent = self.vicii(m)
        self.assertEqual(m.chip, 1)
        self.assertTrue(all("\n" not in cmd for cmd in sent), "one monitor command to a connection")

    def test_the_right_chip_is_left_alone(self):
        self.assertEqual(self.vicii(FakeMachine("NTSC", 3)), ['resourceget "VICIIModel"'])

    def test_a_stopped_machine_is_not_sent_a_command(self):
        self.assertEqual(self.vicii(FakeMachine("PAL", 0, paused=True)), [])


if __name__ == '__main__':
    unittest.main()
