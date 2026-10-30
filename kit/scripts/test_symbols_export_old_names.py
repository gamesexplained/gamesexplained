#!/usr/bin/env python3
"""symbols_export.py prints the comments that name a label by an automatic name it no longer
has: s_10B4 in a comment, after the routine at $10B4 was renamed show_bonus, leads a reader
of the listing nowhere."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_export import old_names   # noqa: E402


def sym(address, name):
    return {"address": address, "name": name, "type": "Subroutine", "kind": "user"}


def line(address, text):
    return {"address": address, "type": "line", "text": text}


class OldNames(unittest.TestCase):
    def test_renamed_routine_is_found(self):
        syms = [sym(0x10B4, "show_bonus"), sym(0x090D, "stage_won")]
        self.assertEqual(old_names(syms, [line(0x090D, "shows BONUS (s_10B4) and counts it")]),
                         [("s_10B4", "show_bonus", 0x090D)])

    def test_current_names_and_unknown_addresses_pass(self):
        syms = [sym(0x10B4, "show_bonus"), {"address": 0xC000, "name": "a_C000", "type": "Field", "kind": "auto"}]
        comments = [line(0x10B4, "reads a_C000 and calls show_bonus"), line(0x10B4, "the byte at s_2000")]
        self.assertEqual(old_names(syms, comments), [])


if __name__ == "__main__":
    unittest.main()
