#!/usr/bin/env python3
"""kit/apple2/cpu.py names the Apple II's operands and reads its text, as the Source tab shows them.

A soft switch means one thing read and another written, so a store takes the write's name; an
operand in $C080-$C08F indexed by X is a slot's register; text is ASCII with bit 7 set or clear, or
the text screen's own codes. Checked on bytes written here: no emulator.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cpu                                                                # noqa: E402
import registers                                                          # noqa: E402

NAMES = {0x6000: "start", 0x0080: "ptr"}


def chips(target, at):
    return 0xC000 <= target <= 0xCFFF            # symbols_export.py's io_only for the Apple II


def text(bs, a=0x6000):
    ram = bytearray(0x10000)
    ram[a:a + len(bs)] = bytes(bs)
    m, mode, n = cpu.decode(ram, a)
    o, target = cpu.operand(a, m, mode, list(ram[a:a + n]), NAMES, registers.NAMES, chips)
    return (f"{m} {o}" if o else m), target


class Operands(unittest.TestCase):
    def test_read_and_write_names(self):
        self.assertEqual(text([0xAD, 0x00, 0xC0])[0], "lda kbd")
        self.assertEqual(text([0x8D, 0x00, 0xC0])[0], "sta clr80store")
        self.assertEqual(text([0x8D, 0x01, 0xC0])[0], "sta set80store")
        self.assertEqual(text([0x9C, 0x05, 0xC0])[0], "stz wrcardram", "the 65C02's store")
        self.assertEqual(text([0x8D, 0x0D, 0xC0])[0], "sta set80vid")
        self.assertEqual(text([0x2C, 0x10, 0xC0])[0], "bit kbdstrb")
        self.assertEqual(text([0xAD, 0x19, 0xC0])[0], "lda rdvblbar")

    def test_any_access_switches(self):
        self.assertEqual(text([0x2C, 0x30, 0xC0])[0], "bit spkr")
        self.assertEqual(text([0x8D, 0x50, 0xC0])[0], "sta txtclr")
        self.assertEqual(text([0xAD, 0x57, 0xC0])[0], "lda hires")
        self.assertEqual(text([0xAD, 0x8B, 0xC0])[0], "lda lc_ram1")

    def test_a_repeat_keeps_its_address(self):
        self.assertEqual(text([0x2C, 0x3F, 0xC0])[0], "bit $C03F")

    def test_slot_registers_indexed_by_x(self):
        self.assertEqual(text([0xBD, 0x8C, 0xC0])[0], "lda q6l,x")
        self.assertEqual(text([0xBD, 0x89, 0xC0])[0], "lda motoron,x")
        self.assertEqual(text([0x9D, 0x8F, 0xC0])[0], "sta q7h,x")
        self.assertEqual(text([0xB9, 0x8C, 0xC0])[0], "lda q6l,y")
        self.assertEqual(text([0xAD, 0x8C, 0xC0])[0], "lda $C08C", "without an index, the language card's repeat")

    def test_slot_6_and_the_mockingboard(self):
        self.assertEqual(text([0xAD, 0xEC, 0xC0])[0], "lda s6_q6l")
        self.assertEqual(text([0x8D, 0x01, 0xC4])[0], "sta mb1_ora")
        self.assertEqual(text([0x8D, 0x8E, 0xC4])[0], "sta mb2_ier")

    def test_a_register_is_never_a_target(self):
        self.assertIsNone(text([0xAD, 0x00, 0xC0])[1])
        self.assertIsNone(text([0xBD, 0x8C, 0xC0])[1])

    def test_ram_is_named_from_the_symbols(self):
        self.assertEqual(text([0x20, 0x00, 0x60]), ("jsr start", 0x6000))
        self.assertEqual(text([0xB2, 0x80]), ("lda (ptr)", 0x80))

    def test_no_op_is_data(self):
        ram = bytearray(0x10000)
        ram[0x6000] = 0x03
        self.assertIsNone(cpu.decode(ram, 0x6000))


class Registers(unittest.TestCase):
    def test_a_read_of_the_memory_switches_is_the_keyboard(self):
        self.assertEqual(registers.NAMES[0xC000], "kbd")
        self.assertNotIn(0xC008, registers.NAMES)
        self.assertEqual(text([0xCD, 0x08, 0xC0])[0], "cmp $C008", "a II+ game's read of the keyboard")
        self.assertEqual(text([0x8D, 0x08, 0xC0])[0], "sta setstdzp")

    def test_every_name_is_unique(self):
        names = list(registers.NAMES.values())
        self.assertEqual(len(names), len(set(names)))

    def test_census_groups_lie_in_the_io_area(self):
        for lo, hi, *_ in registers.CENSUS_CHIPS + registers.CENSUS_PAGES:
            self.assertTrue(0xC000 <= lo <= hi <= 0xCFFF, hex(lo))


class Text(unittest.TestCase):
    def test_ascii_either_way(self):
        self.assertEqual("".join(cpu.text_decode("ASCII", b) for b in b"HI\xc8\xc9\x8d"), "HIHI.")

    def test_screen_codes(self):
        self.assertEqual("".join(cpu.text_decode("Screen", b) for b in (0xC8, 0x09, 0x41, 0xB1, 0xE1)), "HIA1a")

    def test_unknown_type(self):
        with self.assertRaises(SystemExit):
            cpu.text_decode("PETSCII", 0x41)


if __name__ == "__main__":
    unittest.main()
