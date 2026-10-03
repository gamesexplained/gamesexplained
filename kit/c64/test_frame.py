#!/usr/bin/env python3
"""Beam-phase regression checks; no emulator, ROMs or game image required."""
import unittest
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


if __name__ == '__main__':
    unittest.main()
