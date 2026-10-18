#!/usr/bin/env python3
"""Self-check for kit/cpu/census.py: no emulator needed."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from census import Machine, census, no_code, report  # noqa: E402

C64, BBC = Machine("c64"), Machine("bbc")

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
        self.rows = census(*machine(), C64)

    def test_every_instruction_that_names_a_register(self):
        self.assertEqual({k: v[:2] for k, v in self.rows.items()},
                         {(0xD418, "sta"): [2, 0x1000], (0xD400, "sta,y"): [1, 0x1003],
                          (0xD41B, "lda"): [1, 0x1006], (0x0001, "sta"): [1, 0x1009]})

    def test_a_repeat_is_counted_under_its_register(self):
        self.assertEqual(self.rows[(0xD41B, "lda")][2], {0xD43B})
        text = "\n".join(report(self.rows, "test", C64))
        self.assertIn("as $D43B", text)
        self.assertIn("sid_v3_oscillator", text)

    def test_registers_no_instruction_names(self):
        text = report(self.rows, "test", C64)
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


BBC_CODE = [0x8D, 0x4E, 0xFE,   # $2000 sta $FE4E: the system VIA's IER
            0x8D, 0x5E, 0xFE,   # $2003 sta $FE5E: a repeat of it
            0x8D, 0x21, 0xFE,   # $2006 sta $FE21: the palette
            0x8D, 0x00, 0xFE,   # $2009 sta $FE00: the CRTC's register number
            0x8D, 0x06, 0xFE,   # $200C sta $FE06: a repeat of $FE00
            0x8D, 0x34, 0xFE,   # $200F sta $FE34: an address of ROMSEL's page with no name
            0x9D, 0x60, 0xFE,   # $2012 sta $FE60,x
            0x85, 0x01,         # $2015 sta $01: zero page, RAM on the BBC
            0x60]               # $2017 rts


class BBCCensus(unittest.TestCase):
    def setUp(self):
        ram, known = bytearray(0x10000), bytearray(b"\x01" * 0x10000)
        ram[0x2000:0x2000 + len(BBC_CODE)] = bytes(BBC_CODE)
        self.rows = census(ram, known, [{"start": 0x2000, "end": 0x2017, "type": "Code"}], BBC)
        self.text = report(self.rows, "test", BBC)

    def test_sheila_registers_with_the_reference_s_repeats(self):
        self.assertEqual({k: v[:2] for k, v in self.rows.items()},
                         {(0xFE4E, "sta"): [2, 0x2000], (0xFE21, "sta"): [1, 0x2006],
                          (0xFE00, "sta"): [2, 0x2009], (0xFE34, "sta"): [1, 0x200F],
                          (0xFE60, "sta,x"): [1, 0x2012]})
        self.assertEqual(self.rows[(0xFE4E, "sta")][2], {0xFE4E, 0xFE5E})
        joined = "\n".join(self.text)
        self.assertIn("sysvia_ier", joined)
        self.assertIn("romsel", joined)             # an unnamed address takes its page's name

    def test_registers_no_instruction_names(self):
        never = self.text[self.text.index("named by no instruction:") + 1:]
        self.assertIn("  $FE01        crtc_data", never)
        self.assertIn("  $FE30        romsel", never)     # named, in a page, and only $FE34 written
        self.assertTrue(any(line.startswith("  $FE61-$FE6F") and "indexed access from $FE60" in line
                            for line in never), never)
        self.assertFalse(any("$FE4E" in line.split()[0] for line in never), never)

    def test_a_machine_with_ports_has_no_census(self):
        with self.assertRaises(SystemExit) as e:
            Machine("spectrum")
        self.assertIn("steps", str(e.exception))


if __name__ == "__main__":
    unittest.main()
