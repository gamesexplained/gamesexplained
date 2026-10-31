#!/usr/bin/env python3
"""kit/c64/basic.py lists a C64 BASIC program as LIST prints it, and symbols_export.py types a
range game.json declares under "basic" as one BASIC block. The keyword table was checked against
VICE's petcat over every token, $80-$CB and $FF (kit/lessons/2026-10-31-gunship-basic.md)."""
import importlib.util
import os
import struct
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("c64_basic_test", os.path.join(HERE, "basic.py"))
basic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(basic)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
from symbols_export import basic_blocks  # noqa: E402


def program(lines, start=0x0801):
    """A 64 KB image holding the tokenized lines from `start`, each linked to the next."""
    ram, a = bytearray(0x10000), start
    for number, body in lines:
        nxt = a + 4 + len(body) + 1
        ram[a:nxt] = struct.pack("<HH", nxt, number) + body + b"\0"
        a = nxt
    return ram, a + 1          # the image, and the last byte of the two zeros that end it


PRINT, REM, DATA, GOTO, IF, THEN, EQ, TIMES, GT, PI = 0x99, 0x8F, 0x83, 0x89, 0x8B, 0xA7, 0xB2, 0xAC, 0xB1, 0xFF
UPPER = [(10, bytes([PRINT]) + b'"' + bytes([0x93, 0x05]) + b'HELLO "' + b";"),
         (20, bytes([REM, 0x14, 0x14]) + b"X" + bytes([EQ])),
         (30, bytes([DATA]) + b"1,2:" + bytes([PRINT]) + b"A"),
         (40, b"A" + bytes([EQ, PI, TIMES]) + b"2:" + bytes([IF]) + b"A" + bytes([GT]) + b"1" + bytes([THEN, GOTO]) + b"10")]


class Listing(unittest.TestCase):
    def test_lines_as_list_prints_them(self):
        ram, _ = program(UPPER)
        self.assertEqual([(n, t) for _, n, t in basic.lines(ram, 0x0801)], [
            (10, 'PRINT"{clr}{wht}hello ";'),
            (20, "REM{del}{del}x{$b2}"),            # a REM's bytes as typed: no keyword, as petcat shows them
            (30, "DATA1,2:PRINTA"),                  # a DATA ends at its colon
            (40, "A=π*2:IFA>1THENGOTO10")])

    def test_letters_in_quotes_as_petcat_writes_them(self):
        # unshifted letters small, shifted capitals, as the lower-case set shows them; the code
        # outside the quotes in capitals
        ram, _ = program([(1, bytes([PRINT]) + b'"' + bytes([0xC1]) + b'ND "' + b";A")])
        self.assertEqual(basic.lines(ram, 0x0801)[0][2], 'PRINT"And ";A')

    def test_pieces_cover_every_byte(self):
        ram, end = program(UPPER)
        texts, starts = basic.pieces(ram, 0x0801, end)
        self.assertEqual(sorted(texts), list(range(0x0801, end + 1)))
        self.assertEqual(set(starts.values()), {"routine"})
        first = sorted(starts)
        self.assertEqual("".join(texts[a] for a in range(first[0], first[1])), '10 PRINT"{clr}{wht}hello ";')
        self.assertEqual(texts[first[-1]], "(end of the program)")

    def test_byte_text(self):
        self.assertEqual((basic.byte_text(0x9E), basic.byte_text(0xCB), basic.byte_text(0x41)), ("SYS", "GO", "A"))


class Declared(unittest.TestCase):
    def test_a_declared_range_is_one_basic_block(self):
        blocks = [{"start": 0x0700, "end": 0x0810, "type": "Byte"},
                  {"start": 0x0811, "end": 0x0900, "type": "Code"},
                  {"start": 0x0901, "end": 0x0A00, "type": "Byte"}]
        got = sorted(basic_blocks(blocks, {"basic": [["$0801", "$0950", "the loader"]]}), key=lambda b: b["start"])
        self.assertEqual([(b["start"], b["end"], b["type"]) for b in got],
                         [(0x0700, 0x0800, "Byte"), (0x0801, 0x0950, "BASIC"), (0x0951, 0x0A00, "Byte")])
        self.assertEqual(basic_blocks(blocks, {}), blocks)


if __name__ == "__main__":
    unittest.main()
