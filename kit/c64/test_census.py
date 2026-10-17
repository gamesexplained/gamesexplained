#!/usr/bin/env python3
"""Self-check for kit/c64/census.py: no emulator needed."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from census import census, no_code, report  # noqa: E402

CODE = [0x8D, 0x18, 0xD4,   # $1000 sta $D418
        0x99, 0x00, 0xD4,   # $1003 sta $D400,y
        0xAD, 0x3B, 0xD4,   # $1006 lda $D43B, a repeat of $D41B
        0x85, 0x01,         # $1009 sta $01
        0x99, 0x01, 0x00,   # $100B sta $0001,y: clears zero page
        0x8D, 0x00, 0xC0,   # $100E sta $C000: RAM
        0xAD, 0x2F, 0xD0,   # $1011 lda $D02F: past the video chip's last register
        0x8D, 0x18, 0xD4,   # $1014 sta $D418 again
        0x60]               # $1017 rts


def machine():
    ram, known = bytearray(0x10000), bytearray(b"\x01" * 0x10000)
    ram[0x1000:0x1000 + len(CODE)] = bytes(CODE)
    ram[0x1100:0x1103] = bytes([0x8D, 0x20, 0xD0])   # sta $D020, but in a data block
    blocks = [{"start": 0x1000, "end": 0x1017, "type": "Code"},
              {"start": 0x1100, "end": 0x1102, "type": "Byte"}]
    return ram, known, blocks


class Census(unittest.TestCase):
    def setUp(self):
        self.rows = census(*machine())

    def test_every_instruction_that_names_a_register(self):
        self.assertEqual({k: v[:2] for k, v in self.rows.items()},
                         {(0xD418, "sta"): [2, 0x1000], (0xD400, "sta,y"): [1, 0x1003],
                          (0xD41B, "lda"): [1, 0x1006], (0x0001, "sta"): [1, 0x1009]})

    def test_a_repeat_is_counted_under_its_register(self):
        self.assertEqual(self.rows[(0xD41B, "lda")][2], {0xD43B})
        text = "\n".join(report(self.rows, "test"))
        self.assertIn("as $D43B", text)
        self.assertIn("sid_v3_oscillator", text)

    def test_registers_no_instruction_names(self):
        text = report(self.rows, "test")
        self.assertIn("5 instructions name 4 registers", text[0])
        never = text[text.index("named by no instruction:") + 1:]
        self.assertIn("  $D000-$D02E  vic_sprite0_x to vic_sprite7_colour", never)   # the data block's sta $D020 is not code
        self.assertTrue(any(line.startswith("  $D401-$D417") and "indexed access from $D400" in line
                            for line in never), never)
        self.assertTrue(any(line.startswith("  $D419-$D41A") for line in never), never)
        self.assertIn("  $DC00-$DC0F  cia1_port_a to cia1_control_b", never)

    def test_no_code_blocks_is_refused_not_reported(self):
        self.assertIsNone(no_code(machine()[2], False))
        unexported = [{"start": 0, "end": 0xFFFF, "type": "Undefined"}]
        self.assertIn("symbols_export.py", no_code(unexported, False))
        self.assertIn("disassemble", no_code(unexported, True))


if __name__ == "__main__":
    unittest.main()
