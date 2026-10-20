#!/usr/bin/env python3
"""kit/apple2/screen.py draws the Apple II's screen from memory and the switches, with no emulator.

The row addresses are the IIe's (kit/skills/apple2/apple2-reference, "The screen"); the text page's
letters, the page that shows, and the size and colours of what is drawn are checked on memory
written here.
"""
import os
import struct
import sys
import tempfile
import unittest
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import screen                                                             # noqa: E402

TEXT = {"text": True}


def blank():
    return bytearray(b"\xa0" * 0x10000), bytearray(b"\xa0" * 0x10000)      # $A0, a normal space


class Addresses(unittest.TestCase):
    def test_text_rows(self):
        self.assertEqual([screen.text_base(r) for r in (0, 1, 7, 8, 16, 23)],
                         [0x400, 0x480, 0x780, 0x428, 0x450, 0x7D0])

    def test_hires_lines(self):
        self.assertEqual([screen.hires_base(y) for y in (0, 1, 7, 8, 63, 64, 191)],
                         [0x2000, 0x2400, 0x3C00, 0x2080, 0x3F80, 0x2028, 0x3FD0])


class Letters(unittest.TestCase):
    def test_normal_inverse_flashing(self):
        for b in (0xC1, 0x01, 0x41):                  # A: normal, inverse, flashing
            self.assertEqual(screen.letter(b, False), "A", hex(b))
        self.assertEqual(screen.glyph(0xC1, False)[1], False)
        self.assertEqual(screen.glyph(0x01, False)[1], True)
        self.assertEqual(screen.glyph(0x41, False)[1], True, "flashing is drawn inverse")

    def test_lower_case_and_mousetext(self):
        self.assertEqual(screen.letter(0xE1, False), "a")
        self.assertEqual(screen.letter(0x61, True), "a", "the alternate set's inverse lower case")
        self.assertEqual(screen.letter(0x41, True), " ", "MouseText reads as a space")
        self.assertEqual(screen.glyph(0x41, True)[0], screen.BOX)

    def test_ii_plus_has_no_lower_case(self):
        """The II Plus's video ROM shows $E0-$FF as the signs of $A0-$BF, and has no MouseText."""
        for b in (0xE1, 0xF0, 0xFF):
            self.assertEqual(screen.glyph(b, False, iiplus=True), screen.glyph(b - 0x40, False))
        self.assertNotEqual(screen.glyph(0xE1, False), screen.glyph(0xA1, False))
        self.assertEqual(screen.glyph(0x41, True, iiplus=True), screen.glyph(0x41, False))
        self.assertEqual(screen.letter(0xE1, False, iiplus=True), "!")

    def test_text_lines(self):
        main, aux = blank()
        main[0x400:0x405] = bytes(c | 0x80 for c in b"HELLO")
        main[0x7D0:0x7D2] = bytes((0x01, 0x02))                       # inverse AB, row 23
        lines = screen.text_lines(main, aux, TEXT)
        self.assertEqual((len(lines), lines[0], lines[23]), (24, "HELLO", "AB"))

    def test_eighty_columns_take_aux_first(self):
        main, aux = blank()
        aux[0x400], main[0x400] = 0xC1, 0xC2
        self.assertEqual(screen.text_lines(main, aux, {"text": True, "80col": True})[0], "AB")

    def test_page_2(self):
        main, aux = blank()
        main[0x800] = 0xC1
        self.assertEqual(screen.text_lines(main, aux, {"text": True, "page2": True})[0], "A")
        self.assertEqual(screen.text_lines(main, aux, {"text": True, "page2": True, "80store": True})[0], "",
                         "with 80STORE on, PAGE2 picks aux memory and page 1 shows")


class Pictures(unittest.TestCase):
    def test_modes(self):
        self.assertEqual(screen.mode_of({"text": True}), "text")
        self.assertEqual(screen.mode_of({"hires": True}), "hires")
        self.assertEqual(screen.mode_of({"hires": True, "80col": True, "dhires": True}), "dhires")
        self.assertEqual(screen.mode_of({}), "lores")

    def test_hires_colours(self):
        main, aux = bytearray(0x10000), bytearray(0x10000)
        main[0x2000] = 0x01                    # one dot, the first column: violet
        main[0x2002] = 0x81                    # one dot with the high bit, column 14: blue
        main[0x2004] = 0x03                    # two dots side by side: white
        w, h, pix = screen.render(main, aux, {"hires": True})
        self.assertEqual((w, h), (560, 384))
        self.assertEqual(pix[0][0], screen.VIOLET)
        self.assertEqual(pix[0][28], screen.BLUE)
        self.assertEqual((pix[1][56], pix[0][58]), (screen.WHITE, screen.WHITE))
        self.assertEqual(pix[2][0], screen.BLACK, "the next line is another address")

    def test_lores_colours(self):
        main, aux = bytearray(0x10000), bytearray(0x10000)
        main[0x400] = 0x1F                     # top block white, bottom block magenta
        _, _, pix = screen.render(main, aux, {})
        self.assertEqual((pix[0][0], pix[8][0]), (screen.COLOURS[15], screen.COLOURS[1]))

    def test_mixed_mode_keeps_four_text_rows(self):
        main, aux = bytearray(0x10000), bytearray(0x10000)
        main[screen.text_base(20)] = 0x01      # inverse A at the start of row 20
        _, _, pix = screen.render(main, aux, {"hires": True, "mixed": True})
        self.assertEqual(pix[20 * 16][0], screen.FG, "an inverse cell's edge is lit")

    def test_png(self):
        main, aux = blank()
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "s.png")
            screen.png(path, *screen.render(main, aux, TEXT))
            with open(path, "rb") as f:
                blob = f.read()
        self.assertTrue(blob.startswith(b"\x89PNG\r\n\x1a\n"))
        width, height = struct.unpack(">II", blob[16:24])
        self.assertEqual((width, height), (560, 384))
        start = blob.index(b"IDAT") + 4
        raw = zlib.decompress(blob[start:start + struct.unpack(">I", blob[start - 8:start - 4])[0]])
        self.assertEqual(len(raw), 384 * (1 + 560 * 3))


if __name__ == "__main__":
    unittest.main()
