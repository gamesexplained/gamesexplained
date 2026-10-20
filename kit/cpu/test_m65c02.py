#!/usr/bin/env python3
"""Self-check for kit/cpu/m65c02.py and the 65C02 in opcodes.py: no emulator needed.

The whole table is checked against the kit's Apple II by `opcodes.py --check apple2`, which
needs the emulator; this pins what the listing and the references search rely on.
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import m65c02  # noqa: E402
import opcodes  # noqa: E402
from m6502 import OPS as NMOS  # noqa: E402

NAMES, REGS = {0x1234: "table", 0x0034: "ptr"}, {}


def text(bs, a=0x2000):
    ram = bytearray(0x10000)
    ram[a:a + len(bs)] = bytes(bs)
    m, mode, n = m65c02.decode(ram, a)
    o, _ = m65c02.operand(a, m, mode, list(ram[a:a + n]), NAMES, REGS, lambda t, at: False)
    return f"{m} {o}" if o else m


class Table(unittest.TestCase):
    def test_counts(self):
        self.assertEqual(len(m65c02.OPS), 178)
        self.assertEqual(len(m65c02.NOPS), 78)
        self.assertEqual(set(m65c02.OPS) | set(m65c02.NOPS), set(range(256)))

    def test_the_nmos_set_is_kept(self):
        for op, e in NMOS.items():
            self.assertEqual(m65c02.OPS[op], e, f"${op:02X}")

    def test_the_additions(self):
        for bs, want in (([0x80, 0xFE], "bra $2000"), ([0xDA], "phx"), ([0x7A], "ply"),
                         ([0x9C, 0x34, 0x12], "stz table"), ([0x74, 0x10], "stz $10,x"),
                         ([0x04, 0x34], "tsb ptr"), ([0x1C, 0x34, 0x12], "trb table"),
                         ([0x1A], "inc a"), ([0x3A], "dec a"), ([0x89, 0x80], "bit #$80"),
                         ([0x3C, 0x34, 0x12], "bit table,x"),
                         ([0x7C, 0x34, 0x12], "jmp (table,x)"), ([0xB2, 0x34], "lda (ptr)"),
                         ([0x92, 0x34], "sta (ptr)")):
            self.assertEqual(text(bs), want)

    def test_no_ops_are_data(self):
        ram = bytearray(0x10000)
        for op in m65c02.NOPS:
            ram[0x2000] = op
            self.assertIsNone(m65c02.decode(ram, 0x2000), f"${op:02X}")

    def test_no_op_lengths(self):
        length = {op: m65c02.LEN[mode] for op, (_, mode) in m65c02.NOPS.items()}
        self.assertEqual({op for op, n in length.items() if n == 3}, {0x5C, 0xDC, 0xFC})
        self.assertEqual({op for op, n in length.items() if n == 2},
                         {0x02, 0x22, 0x42, 0x62, 0x82, 0xC2, 0xE2, 0x44, 0x54, 0xD4, 0xF4})


class Search(unittest.TestCase):
    """opcodes.py with the 65C02's tables, as a game on an Apple II gets them."""

    def setUp(self):
        opcodes.use("65c02")

    def tearDown(self):
        opcodes.use("6502")

    def code(self, bs):
        ram, known = bytearray(0x10000), bytearray(b"\x01" * 0x10000)
        ram[0x2000:0x2000 + len(bs)] = bytes(bs)
        return ram, known, [{"start": 0x2000, "end": 0x2000 + len(bs) - 1, "type": "Code"}]

    def test_pointer_and_table_references(self):
        ram, known, blocks = self.code([0xB2, 0x80,          # lda ($80)
                                        0x7C, 0x00, 0x40,    # jmp ($4000,x)
                                        0x9C, 0x00, 0x30,    # stz $3000
                                        0x60])
        found, _ = opcodes.refs(ram, known, blocks, 0x81, 64)
        self.assertTrue(any("lda ($80)" in f and "pointer" in f for f in found), found)
        found, _ = opcodes.refs(ram, known, blocks, 0x4005, 64)
        self.assertTrue(any("jmp ($4000,x)" in f and "X = $04 or $05" in f for f in found), found)
        found, _ = opcodes.refs(ram, known, blocks, 0x3000, 64)
        self.assertTrue(any("stz $3000" in f and "write" in f for f in found), found)

    def test_a_no_op_in_code_is_reported(self):
        ram, known, blocks = self.code([0xA9, 0x00, 0x03, 0x60])     # lda #$00, then $03: a no-op
        lines = opcodes.undocumented(ram, known, blocks, {})
        self.assertTrue(any("$2002" in ln for ln in lines), lines)

    def test_the_nmos_tables_come_back(self):
        opcodes.use("6502")
        self.assertEqual(opcodes.ALL[0xA7], ("lax", "zp"))
        opcodes.use("65c02")
        self.assertEqual(opcodes.ALL[0xA7], ("noop", "imp"))


if __name__ == "__main__":
    unittest.main()
