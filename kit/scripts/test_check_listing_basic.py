#!/usr/bin/env python3
"""check_listing.py asks that two bytes at BASIC's start that hold a BASIC line's link say they
are BASIC's: the link points one past the zero that ends the line, looked for from its sixth byte."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_listing import unnamed_basic_link  # noqa: E402

# 10 SYS 2061: the link $080B, the line number 10, SYS ($9E), "2061", the zero ending the
# line, then the two zero bytes ending the program
LINE = [0x0B, 0x08, 0x0A, 0x00, 0x9E, 0x32, 0x30, 0x36, 0x31, 0x00, 0x00, 0x00]


def rec(a, bs, **kw):
    return dict({"a": a, "t": "byte", "b": bs}, **kw)


class BasicLink(unittest.TestCase):
    def test_a_line_nothing_names(self):
        self.assertEqual(unnamed_basic_link([rec(0x0801, LINE, l="tables")], 0x0801), 0x080B)
        self.assertIsNone(unnamed_basic_link([rec(0x0801, LINE, l="stub", c="The BASIC line 10 SYS 2061")], 0x0801))
        self.assertIsNone(unnamed_basic_link([rec(0x0801, LINE, l="basic_stub")], 0x0801))

    def test_the_record_that_holds_the_start(self):
        # a link inside graphics that begin a byte early, as the C16's skyline at $1000
        gfx = [0x00, 0x09, 0x10, 0x3E, 0x3E, 0x3E, 0x3E, 0x3E, 0x00, 0x7F]
        self.assertEqual(unnamed_basic_link([rec(0x1000, gfx, l="skyline_chars")], 0x1001), 0x1009)
        self.assertIsNone(unnamed_basic_link([rec(0x1000, gfx, l="skyline_chars"),
                                              {"a": 0x1001, "t": "note", "c": "BASIC's line link, $1009"}], 0x1001))

    def test_bytes_that_are_not_a_link(self):
        self.assertIsNone(unnamed_basic_link([rec(0x0801, [0x0C] + LINE[1:])], 0x0801))     # one off
        self.assertIsNone(unnamed_basic_link([rec(0x0801, [0x00, 0x00, 0x00])], 0x0801))    # no program
        self.assertIsNone(unnamed_basic_link([rec(0x0801, LINE[:6])], 0x0801))              # runs off the bytes held
        self.assertIsNone(unnamed_basic_link([rec(0x0900, LINE)], 0x0801))                  # not held at all
        # the sixth byte is the first one looked at: a zero in the fifth does not end the line
        early = [0x06, 0x08, 0x0A, 0x00, 0x00, 0x41, 0x00]
        self.assertIsNone(unnamed_basic_link([rec(0x0801, early)], 0x0801))
        early[0] = 0x08
        self.assertEqual(unnamed_basic_link([rec(0x0801, early)], 0x0801), 0x0808)


if __name__ == "__main__":
    unittest.main()
