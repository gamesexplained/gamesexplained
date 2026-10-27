#!/usr/bin/env python3
"""Self-check for kit/cpu/strings.py: no emulator needed."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
from strings import sweep  # noqa: E402
from listing import platform_modules  # noqa: E402

C64, BBC = platform_modules("c64")[0], platform_modules("bbc")[0]


def screen(text, second=False):
    """Screen codes for text: the first set's capitals at $01-$1A, or the second set's small letters
    there and its capitals at $41-$5A."""
    out = []
    for ch in text:
        if ch.isalpha():
            out.append(ord(ch.upper()) - 0x40 if ch.islower() or not second else ord(ch))
        else:
            out.append(ord(ch))
    return out


CODE = [0xA9, 0x00, 0x8D, 0x20, 0xD0, 0xA2, 0x27, 0xBD, 0x00, 0x04, 0x9D, 0x00, 0xD8, 0xCA,
        0x10, 0xF7, 0x4C, 0x48, 0x45, 0x60, 0xEA, 0xEA]


def image(*pieces):
    ram, known = bytearray(0x10000), bytearray(b"\x01" * 0x10000)
    for a, bs in pieces:
        ram[a:a + len(bs)] = bytes(bs)
    return ram, known


def found(cpu, ram, known, **kw):
    """{first: (text, kinds)}, the PETSCII reading where two runs start at one address."""
    out = {}
    for lo, hi, s, kinds in sweep(cpu, ram, known, **kw):
        if lo not in out or "PETSCII" in kinds:
            out[lo] = (s, kinds)
    return out


class C64Strings(unittest.TestCase):
    def test_the_second_sets_capital_starts_its_run(self):
        # a capital of the second set ($41-$5A) is graphics in the first: a sweep that ends a run
        # there reports "emmings" a byte late
        got = found(C64, *image((0x5000, [0x00] + screen("Lemmings to be saved", True) + [0xFF])))
        self.assertEqual(got[0x5001], ("Lemmings to be saved", ["Screencode"]))

    def test_the_first_set_reads_in_capitals(self):
        got = found(C64, *image((0x5000, [0x00] + screen("GAME OVER") + [0x00])))
        self.assertEqual(got[0x5001][0], "GAME OVER")

    def test_petscii(self):
        got = found(C64, *image((0x5000, [0x0D] + list(b"PRESS FIRE") + [0x0D])))
        self.assertIn("PETSCII", got[0x5001][1])
        self.assertEqual(got[0x5001][0], "PRESS FIRE")

    def test_letters_glued_to_the_first_word_are_left_out(self):
        bs = [0x0B, 0x0A, 0x10] + screen("Number of Lemmings", True)
        got = found(C64, *image((0x5000, [0x00] + bs + [0x00])))
        self.assertEqual(got[0x5004][0], "Number of Lemmings")

    def test_reversed_text_is_reversed_throughout(self):
        bs = [c | 0x80 for c in screen("GAME")] + screen(" OVER")
        got = found(C64, *image((0x5000, [0x00] + bs + [0x00])), least=4)
        self.assertEqual(got[0x5001][0], "GAME")
        self.assertEqual(got[0x5005][0], " OVER")

    def test_code_is_not_text(self):
        self.assertEqual(sweep(C64, *image((0x1000, CODE * 20))), [])

    def test_a_byte_that_is_not_the_games_ends_a_run(self):
        ram, known = image((0x5000, [0x00] + screen("GAME OVER") + [0x00]))
        known[0x5005] = 0
        self.assertEqual(found(C64, ram, known), {})


class AsciiStrings(unittest.TestCase):
    def test_a_machine_with_no_sweep_text(self):
        got = found(BBC, *image((0x3000, [0x00] + list(b"Granny's Garden.") + [0x0D])))
        self.assertEqual(got[0x3001], ("Granny's Garden.", ["ASCII"]))

    def test_a_basic_program_is_left_to_its_own_type(self):
        self.assertNotIn("BASIC", {k for _, _, _, kinds in sweep(BBC, *image((0x3000, list(b"PRINT HELLO WORLD"))))
                                   for k in kinds})


if __name__ == "__main__":
    unittest.main()
