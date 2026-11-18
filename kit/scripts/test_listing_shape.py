#!/usr/bin/env python3
"""listing_shape.py names a game whose notes leave a use open, or tell how the run checked, note
after note, over the game's listing and its parts', and passes a game that says so now and then:
one listing had 9,526 notes that ended "Display use and other possible code uses remain open" after
"A controlled resource load copied them", and its checkers passed them."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import listing_shape   # noqa: E402


def write(path, notes):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    records = [{"a": 0x4000 + 8 * i, "t": "data", "b": [0] * 8, "c": c} for i, c in enumerate(notes)]
    records.append({"a": 0x9000, "t": "gap", "b": [0] * 100})            # a gap's bytes are not counted
    with open(path, "w") as f:
        json.dump({"schema": 1, "records": records}, f)


PADDED = ("Character ${:02X}: eight rows of the copied set. A controlled resource load copied them to $D500; "
          "no instruction entered them in a 200-frame capture. Display use and other possible code uses remain open.")


class Shape(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.g = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_padded_notes_in_a_part_are_named(self):
        write(os.path.join(self.g, "parts", "resident", "listing.json"),
              [f"Routine {i} draws the score." for i in range(100)])
        write(os.path.join(self.g, "parts", "load-1", "listing.json"), [PADDED.format(i) for i in range(100)])
        s = listing_shape.shape(self.g)
        self.assertEqual((s["notes"], s["bytes"], s["open"], s["run"]), (200, 1600, 100, 100))
        self.assertEqual(s["open_at"][:2], ("parts/load-1", 0x4000))
        self.assertIn("remain open", s["open_at"][2])
        w = listing_shape.warnings(self.g, s)
        self.assertEqual(len(w), 2)
        self.assertIn("100 of 200 notes (50 %) leave a use open", w[0])
        self.assertIn("parts/load-1 $4000", w[0])
        self.assertIn("tell how the run checked", w[1])

    def test_an_open_question_now_and_then_passes(self):
        notes = [f"Table {i} holds the speeds." for i in range(400)]
        notes[:60] = [f"Byte {i}: its reader remains open." for i in range(60)]      # 15 %: under the line
        notes[60:70] = ["Seen in a controlled load." for _ in range(10)]               # under fifty notes
        write(os.path.join(self.g, "listing.json"), notes)
        s = listing_shape.shape(self.g)
        self.assertEqual((s["open"], s["run"]), (60, 10))
        self.assertEqual(listing_shape.warnings(self.g, s), [])

    def test_words_that_are_not_padding(self):
        for t in ("The sequence index is not bounded at entry.", "Opens the gate when the lever is left open.",
                  "The door is open when bit 7 is set."):
            self.assertIsNone(listing_shape.RUN.search(t), t)
        self.assertIsNone(listing_shape.OPEN.search("The door is open when bit 7 is set."))


if __name__ == "__main__":
    unittest.main()
