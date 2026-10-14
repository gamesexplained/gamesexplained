#!/usr/bin/env python3
"""Check basic.py, the listing's BBC BASIC text type, with no emulator.

This is what CI runs. A program that uses every token, line numbers in its text, strings
with top-bit bytes in them, REM and DATA (basic.sample()) is laid out at PAGE as BASIC II
keeps it, and each line's text is checked against what BASIC's own LIST printed for the same
bytes on the kit's machine on 14 October 2026. Every line number from 0 to 32767 is encoded
as the tokeniser writes it after &8D and decoded back.

The check against the machine itself is `python3 kit/bbc/basic.py test [--port N] [snapshot
...]`: it compares the keyword table with the BASIC ROM jsbeeb ships, puts the same program
in the machine, LISTs it and compares every line, and does the same for the program in each
snapshot given. It needs a jsbeeb server, which CI does not start, so it is run by hand after any change
to basic.py, on a server of its own (`tools.py --platform bbc jsbeeb --port 6848`).
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import basic                                                              # noqa: E402

# what BASIC's LIST printed for basic.sample(), shown through basic.listed()
LISTED = [
    "    0A=1:REM first",
    "   10" + ":".join(basic.TOKENS[t] for t in sorted(basic.TOKENS)[:63]) + ":",
    "   20" + ":".join(basic.TOKENS[t] for t in sorted(basic.TOKENS)[63:]) + ":",
    "   30GOTO10:GOSUB32767:RESTORE0:GOTO1000:GOTO256:GOTO4863",
    '   40PRINT"a{&80}{&8D}{&96}{&FF}{&07}b"EOR"c"',
    '   50REM xAND "y{&84}" EOR',
    '   60DATA1,AND,"z",GOTO',
    "32767IFATHEN30ELSE40",
]


# The variables BASIC made for one line typed at the prompt on the kit's machine, 14 October 2026:
#   A%=-7:B=7.5:C$="AB":try%=300:in$="":DIM D(3):D(2)=-5:DIM E$(2,1):E$(1,0)="X":E$(2,1)="YZ":
#   DIM F%(2):F%(1)=12345:xx=0.1
# &0400-&04FF (@%, A%-Z% and the first variable of each initial), then &1900-&1983 (PAGE, an
# empty program, then LOMEM to VARTOP), as jsbeeb held them.
VARS_0400 = bytes.fromhex(
    "0a090000f9ffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000"
    "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    "00000000000000000000000000000000000000000000000000000000000000000000000002190a192719421967190000"
    "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    "0000000000000000000000000000000000001e1900000000000000000000000000000000000000001419000000000000"
    "7b190000000000000000000000000000")
VARS_1900 = bytes.fromhex(
    "0dff0000008370000000000024001219020241420000727925002c01000000006e240000000000000028000304000000"
    "000000000000000083a00000000000000000000024280005030002000000000000000000641901010000000000000000"
    "6519020258595a0000252800030300000000003930000000000000000078007d4ccccccd")


def image():
    prog = basic.assemble(basic.sample())
    ram = bytearray(0x10000)
    ram[basic.PAGE:basic.PAGE + len(prog)] = bytes(prog)
    return ram, basic.PAGE + len(prog) - 1


class Basic(unittest.TestCase):
    def test_lines_read_as_list_prints_them(self):
        ram, end = image()
        got = basic.items(ram, basic.PAGE, end)
        self.assertEqual([t for t, _ in got], LISTED + ["(the end of the program)"])
        self.assertEqual({k for _, k in got}, {"routine"})

    def test_every_line_number(self):
        for n in range(32768):
            self.assertEqual(basic.line_number(*basic.encode_number(n)), n)

    def test_a_line_cut_by_a_label(self):
        # the texts are per byte, so a line a label cuts in two still reads as the whole
        ram, end = image()
        texts, starts = basic.pieces(ram, basic.PAGE, end)
        a = sorted(starts)[4]                                   # line 40
        n = ram[a + 3]
        self.assertEqual("".join(texts[x] for x in range(a, a + n)), LISTED[4])
        self.assertEqual(texts[a], "   40")
        self.assertEqual([texts[x] for x in range(a + 1, a + 4)], ["", "", ""])

    def test_bytes_alone(self):
        self.assertEqual(basic.byte_text(0xF1), "PRINT")
        self.assertEqual(basic.byte_text(0x8D), "{&8D}")      # a line number's mark, alone
        self.assertEqual(basic.byte_text(0xCE), "{&CE}")      # no keyword
        self.assertEqual(basic.byte_text(0x41), "A")
        self.assertEqual(len(basic.TOKENS), 126)

    def test_lost_place(self):
        # a block that does not start on a line's &0D is shown byte by byte until one does
        ram, end = image()
        texts, starts = basic.pieces(ram, basic.PAGE + 1, end)
        self.assertNotIn(basic.PAGE + 1, starts)
        self.assertEqual(len(starts), len(LISTED))              # line 0 is lost, the end is not


    def test_variables(self):
        ram = bytearray(0x10000)
        ram[0x400:0x500] = VARS_0400
        ram[0x1900:0x1900 + len(VARS_1900)] = VARS_1900
        read = lambda a, n: ram[a:a + n]
        self.assertEqual(len(VARS_0400), 0x100)
        self.assertEqual(basic.variable(read, "A%"), -7)
        self.assertEqual(basic.variable(read, "B"), 7.5)
        self.assertEqual(basic.variable(read, "C$"), "AB")
        self.assertEqual(basic.variable(read, "try%"), 300)
        self.assertEqual(basic.variable(read, "in$"), "")
        self.assertAlmostEqual(basic.variable(read, "xx"), 0.1, places=9)
        self.assertEqual(basic.variable(read, "D("), ([3], [0.0, 0.0, -5.0, 0.0]))
        self.assertEqual(basic.variable(read, "E$("), ([2, 1], ["", "", "X", "", "", "YZ"]))
        self.assertEqual(basic.variable(read, "F%("), ([2], [0, 12345, 0]))
        self.assertIsNone(basic.variable(read, "nope"))


if __name__ == "__main__":
    unittest.main()
