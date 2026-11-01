#!/usr/bin/env python3
"""check_listing.py fails a comment that names a label by an automatic name it no longer has:
s_10B4 in a comment, after the routine at $10B4 was renamed show_bonus, leads a reader of the
Source tab nowhere (#641). symbols_export.py names them as it writes; this keeps them out of main."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check_listing import old_name_error   # noqa: E402


def sym(address, name):
    return {"address": address, "name": name, "type": "Subroutine", "kind": "user"}


def line(address, text):
    return {"address": address, "type": "line", "text": text}


class OldNameError(unittest.TestCase):
    def test_old_name_fails(self):
        S = {"symbols": [sym(0x10B4, "show_bonus"), sym(0x090D, "stage_won")],
             "comments": [line(0x090D, "shows BONUS (s_10B4) and counts it")]}
        said = old_name_error(S)
        self.assertIn("$090D: s_10B4 is now show_bonus", said)
        self.assertTrue(said.startswith("1 comment(s)"))

    def test_current_names_pass(self):
        S = {"symbols": [sym(0x10B4, "show_bonus")], "comments": [line(0x090D, "shows BONUS (show_bonus)")]}
        self.assertIsNone(old_name_error(S))


if __name__ == "__main__":
    unittest.main()
