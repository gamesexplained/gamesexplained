#!/usr/bin/env python3
"""symbols_export.py says to use --from when a part's export holds less than its file or nothing
(#842): a part annotated in the session another part started has an empty session of its own.
A game that is one load, a file source and an export already given --from get no such line."""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_export import from_hint   # noqa: E402


class FromHint(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.game = os.path.join(self.tmp.name, "games", "c64", "made-up")
        self.part = os.path.join(self.game, "parts", "stage-1")
        os.makedirs(self.part)
        with open(os.path.join(self.part, "part.json"), "w") as f:
            json.dump({"title": "Stage 1", "order": 1}, f)

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_part_read_from_its_own_session_is_told(self):
        self.assertIn("--from", from_hint(self.part, [self.part]))

    def test_no_line_once_from_is_given_or_for_a_file(self):
        self.assertEqual(from_hint(self.part, [self.part, "--from", self.game]), "")
        self.assertEqual(from_hint(self.part, [self.part, "--project", "x.regen2000proj"]), "")

    def test_no_line_for_a_game_of_one_load(self):
        self.assertEqual(from_hint(self.game, [self.game]), "")


if __name__ == "__main__":
    unittest.main()
