#!/usr/bin/env python3
"""symbols.json names the KERNAL's entry points the same whichever file the session started on (#260)."""
import glob
import json
import unittest
from pathlib import Path

from kernal import NAMES, entry_points

ROOT = Path(__file__).resolve().parents[2]


def auto(a):
    return {"address": a, "name": f"s_{a:04X}", "type": "Subroutine", "kind": "auto"}


def system(a):
    return {"address": a, "name": NAMES[a], "type": "Predefined", "kind": "system"}


START = {"address": 0x3000, "name": "start", "type": "UserDefined", "kind": "user"}


class EntryPoints(unittest.TestCase):
    # What regenerator2000 0.9.20 returned for one program, code at $1000 calling SETLFS,
    # SETNAM and CHROUT and code at $2000 calling GETIN, its snapshot's PC at $3000.
    def test_start_file_does_not_show(self):
        on_snapshot = [START, auto(0xFFBA), auto(0xFFBD), auto(0xFFD2), auto(0xFFE4)]
        # started on symbols_import.py's project, with $2000 traced after the start
        on_project = [START, system(0xFFBA), system(0xFFBD), system(0xFFD2), auto(0xFFE4)]
        self.assertEqual(entry_points(on_snapshot), entry_points(on_project))
        self.assertEqual(entry_points(on_snapshot),
                         [START, system(0xFFBA), system(0xFFBD), system(0xFFD2), system(0xFFE4)])

    def test_own_label_wins(self):
        own = {"address": 0xFFD2, "name": "print_char", "type": "Subroutine", "kind": "user"}
        # a session on a project names the KERNAL's routine beside your own label, one on
        # a snapshot does not
        self.assertEqual(entry_points([own, system(0xFFD2)]), [own])
        self.assertEqual(entry_points([own]), [own])

    def test_everything_else_passes_through(self):
        rest = [{"address": 0x1000, "name": "b_1000", "type": "Branch", "kind": "auto"},
                {"address": 0xFFFE, "name": "irq_vector", "type": "UserDefined", "kind": "user"}]
        self.assertEqual(entry_points(rest), rest)

    def test_hardware_vectors_are_left_unnamed(self):
        # the same file lists $FFFA-$FFFF as excluded: a session gives them no symbol of its own
        self.assertFalse([a for a in NAMES if a >= 0xFFFA])

    def test_names_are_the_ones_sessions_exported(self):
        seen = 0
        for f in glob.glob(str(ROOT / "games/c64/**/symbols.json"), recursive=True):
            for s in json.loads(Path(f).read_text())["symbols"]:
                if s.get("kind") == "system":
                    seen += 1
                    self.assertEqual(NAMES.get(s["address"]), s["name"], f"{f}: ${s['address']:04X}")
        print(f"{seen} KERNAL names in the games' symbol maps match the table")


if __name__ == "__main__":
    unittest.main()
