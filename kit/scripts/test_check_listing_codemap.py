#!/usr/bin/env python3
"""check_listing.py holds symbols.json against a committed code map (#184): every byte that ran
is typed Code, and code only the map's trace reached is told apart."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_listing import untyped_code  # noqa: E402


class CodeMap(unittest.TestCase):
    def test_code_that_ran_and_code_only_traced(self):
        S = {"blocks": [{"start": 0x8000, "end": 0x8008, "type": "Code"},
                        {"start": 0x8010, "end": 0x8013, "type": "Byte"}]}
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(untyped_code(d, S), ([], []))                  # no map: nothing to hold it against
            (Path(d) / "codemap.json").write_text(json.dumps(
                {"starts": [], "code": [[0x8000, 0x8008], [0x8010, 0x8013], [0x8030, 0x8031]], "executed": [],
                 "ran": [[0x8000, 0x8004], [0x8030, 0x8031]]}))
            self.assertEqual(untyped_code(d, S), ([0x8030, 0x8031], [0x8010, 0x8011, 0x8012, 0x8013]))
            S["blocks"][1]["type"] = "Code"
            S["blocks"].append({"start": 0x8030, "end": 0x8031, "type": "Code"})
            self.assertEqual(untyped_code(d, S), ([], []))


if __name__ == "__main__":
    unittest.main()
