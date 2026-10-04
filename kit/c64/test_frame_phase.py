#!/usr/bin/env python3
"""Beam-phase regressions that need neither an emulator nor image libraries."""
import unittest
from frame import phase


class SparsePhase(unittest.TestCase):
    def test_same_line_one_frame_later(self):
        self.assertEqual(phase([(530, 10), (530 + 19656, 10)], 312, 63), (100, 62))

    def test_several_frames_with_a_rising_line(self):
        self.assertEqual(phase([(530, 10), (40283, 17)], 312, 63), (100, 62))

    def test_multiple_wraps_and_subline_offsets(self):
        # Origin100; line10/cycle5, line11/cycle40 after three wraps,
        # then line9/cycle20 in the following frame.
        samples = [(535, 10), (3 * 19656 + 633, 11), (4 * 19656 + 487, 9)]
        low, spread = phase(samples, 312, 63)
        self.assertLessEqual(low, 100)
        self.assertGreaterEqual(low + spread, 100)
        self.assertEqual((low, spread), (95, 27))

    def test_counter_zero_is_one_cycle_late(self):
        self.assertEqual(phase([(0, 311), (1, 0)], 312, 63), (19656, 0))

    def test_contradictory_samples_still_fail(self):
        with self.assertRaisesRegex(RuntimeError, 'samples disagree'):
            phase([(0, 10), (500, 10)], 312, 63)


if __name__ == '__main__':
    unittest.main()
