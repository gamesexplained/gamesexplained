#!/usr/bin/env python3
"""The parts of kit/spectrum/frame.py and of the site's palette that need no emulator.

This is the test `kit/scripts/test_kit.py` runs, and it is the one that runs in CI, so it
needs no emulator, no ROM, no game image and no JavaScript runtime: the test screen's own
coverage, the .bmp reader, the crop, the reading of a picture's colours as Spectrum colour
numbers, and the structure of the palette in site/lib/spectrum.js. Like kit/c64/test_frame.py
beside the C64's frame renderer, it does **not** check the drawing.

The drawing is checked against the machine and only against the machine:
`python3 kit/spectrum/frame.py test` paints a test screen in ZEsarUX and compares the two
pictures pixel by pixel. That one needs the emulator (`python3 kit/scripts/tools.py --platform
spectrum zesarux`) and is run by hand - by an agent on a machine that has one, and by hand
after any change to site/lib/spectrum.js - because no CI runner has an emulator and a
discovered test that required one would fail there rather than skip (AGENTS.md, "Working on
the kit or the site", and `kit/scripts/test_kit.py --require-tools`).
"""
import os
import re
import struct
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import frame                                                              # noqa: E402


def bitmap_addr(x, y):
    """The address of the bitmap byte holding pixel (x, y), from the platform reference.

    `kit/skills/spectrum/zx-spectrum-reference`: the 192 lines are three thirds of 64, and
    inside a third the eight lines of a character cell are not adjacent.
    """
    return ((y & 0xC0) << 5) | ((y & 0x07) << 8) | ((y & 0x38) << 2) | ((x >> 3) & 31)


def bmp_bytes(w, h, rows, bpp=24, top_down=False, planes=1, comp=0):
    """A .bmp written here, so that the reader is tested against something it did not make.

    ZRCP's save-screen writes 24 bits a pixel, uncompressed, rows bottom-up, each row padded
    to four bytes: the padding is what a reader gets wrong, so widths here are not multiples
    of four. `top_down` and the other arguments write the forms read_bmp must refuse.
    """
    stride = (w * bpp // 8 + 3) // 4 * 4
    body = bytearray()
    order = range(h) if top_down else range(h - 1, -1, -1)
    for y in order:
        row = bytearray()
        for pixel in rows[y]:
            row += bytes((pixel[2], pixel[1], pixel[0])) if bpp == 24 else bytes(pixel[:1])
        body += row + bytes(stride - len(row))
    header = (struct.pack("<2sIHHI", b"BM", 54 + len(body), 0, 0, 54)
              + struct.pack("<IiiHHIIiiII", 40, w, -h if top_down else h, planes, bpp, comp,
                            len(body), 2835, 2835, 0, 0))
    return bytes(header + body)


def write_temp(data):
    f = tempfile.NamedTemporaryFile("wb", suffix=".bmp", delete=False)
    f.write(data)
    f.close()
    return f.name


def site_palette():
    """site/lib/spectrum.js's own PAL: the 16 strings a page's canvas is handed."""
    src = None
    with open(os.path.join(ROOT, "site", "lib", "spectrum.js")) as f:
        src = f.read()
    m = re.search(r"const PAL = \[(.*?)\];", src, re.S)
    if not m:
        raise AssertionError("site/lib/spectrum.js has no `const PAL = [...]` to read")
    return re.findall(r"'(#[0-9a-fA-F]{6})'", m.group(1))


class TestScreen(unittest.TestCase):
    def test_the_screen_is_the_two_halves_the_ula_reads(self):
        mem = frame.screen_memory()
        self.assertEqual(len(mem), frame.SCREEN, "the video memory is $4000-$5AFF")
        self.assertEqual(mem[:0x1800], frame.bitmap(), "the bitmap comes first")
        self.assertEqual(mem[0x1800:], frame.attributes(), "then the 768 attributes")

    def test_every_colour_and_every_state_is_in_the_attributes(self):
        """All 64 ink/paper pairs, BRIGHT on and off, FLASH on and off, and solid FLASH cells."""
        attrs = frame.attributes()
        self.assertEqual(len(attrs), 768)
        states = {(a & 7, (a >> 3) & 7, (a >> 6) & 1, a >> 7) for a in attrs}
        self.assertEqual(states, {(i, p, b, f) for i in range(8) for p in range(8)
                                  for b in range(2) for f in range(2)})
        for what, bit in (("ink", 0), ("paper", 3)):
            got = {((a >> bit) & 7) | ((a >> 6) & 1) << 3 for a in attrs}
            self.assertEqual(got, set(range(16)), f"every colour as {what}, BRIGHT and normal")
        solid = [a for a in attrs if (a & 7) == ((a >> 3) & 7) and a >> 7]
        self.assertTrue(solid, "FLASH in a cell whose ink and paper are the same colour: it must "
                                "change nothing, so a drawing that flashes there is caught")

    def test_the_thirds_the_lines_and_the_columns_are_all_told_apart(self):
        """The bitmap the drawing is pointed at, byte for byte.

        A drawing that read the thirds linearly, or swapped the line-in-cell field with
        either of the others, lands on a different byte; this checks the bytes the ULA reads
        differ wherever that could hide, which is what makes the emulator comparison able to
        see it at all.
        """
        mem = frame.bitmap()
        self.assertEqual(len(mem), 0x1800, "6144 bytes, $4000-$57FF")
        self.assertEqual(len({bitmap_addr(x, y) for y in range(192) for x in range(0, 256, 8)}), 0x1800,
                         "the layout is a bijection: every byte is one cell's line")
        self.assertEqual(len(set(mem)), 256, "every byte value appears, so no pattern hides")
        for cellrow in range(0, 64, 8):                 # one line of each cell, 8 rows x 3 thirds
            for x in range(0, 256, 8):
                self.assertEqual(len({mem[bitmap_addr(x, third * 64 + cellrow)] for third in range(3)}), 3,
                                 f"the three thirds must differ at cell row {cellrow // 8}, column {x // 8}")
        for cell in range(0x1800 // 8):                 # and each cell shows ink and paper both
            bits = {(mem[cell * 8 + line] >> b) & 1 for line in range(8) for b in range(8)}
            self.assertEqual(bits, {0, 1}, f"cell {cell} has a single colour in it")

    def test_the_program_writes_the_border_colour_the_drawing_is_told(self):
        code = frame.program()
        self.assertEqual(code[0], 0xF3, "di: the ROM's interrupt must not run")
        self.assertEqual(code[1], 0x3E, "ld a,<border colour>")
        self.assertEqual(code[2], frame.BORDER, "the number the drawing is told as borderColour")
        self.assertEqual(code[3:5], bytes([0xD3, 0xFE]), "out ($FE),a: the ULA's port, nothing else")


class ReadingAPicture(unittest.TestCase):
    def test_read_bmp_reads_every_row_of_a_padded_bottom_up_bmp(self):
        rows = [[(1, 2, 3), (4, 5, 6), (7, 8, 9)], [(10, 11, 12), (13, 14, 15), (16, 17, 18)]]
        path = write_temp(bmp_bytes(3, 2, rows))         # 9 bytes a row, padded to 12
        try:
            self.assertEqual(frame.read_bmp(path), (3, 2, rows))
        finally:
            os.remove(path)

    def test_read_bmp_refuses_a_form_it_does_not_read(self):
        rows = [[(1, 2, 3)]]
        for what, data in (("top-down rows", bmp_bytes(1, 1, rows, top_down=True)),
                           ("eight bits a pixel", bmp_bytes(1, 1, rows, bpp=8)),
                           ("compressed", bmp_bytes(1, 1, rows, comp=1)),
                           ("two planes", bmp_bytes(1, 1, rows, planes=2))):
            path = write_temp(data)
            try:
                with self.assertRaises(SystemExit, msg=f"a .bmp {what} must be refused, not guessed at"):
                    frame.read_bmp(path)
            finally:
                os.remove(path)

    def test_crop_centres_the_drawing_in_the_emulators_picture(self):
        self.assertEqual(frame.crop((352, 304), 16), (32, 40, 288, 224), "ZEsarUX 13.0's picture")
        self.assertEqual(frame.crop((352, 304), 0), (48, 56, 256, 192), "the screen alone")
        with self.assertRaises(SystemExit):
            frame.crop((100, 100), 16)

    def test_colour_numbers_reads_the_machines_numbers_out_of_the_picture(self):
        rows = [[(0, 0, 0), (192, 0, 192)], [(0, 0, 255), (255, 255, 0)]]
        numbers, levels = frame.colour_numbers(rows)
        self.assertEqual(levels, (192, 255))
        self.assertEqual({rgb: numbers[rgb] for rgb in ((0, 0, 0), (192, 0, 192), (0, 0, 255), (255, 255, 0))},
                         {(0, 0, 0): 0, (192, 0, 192): 3, (0, 0, 255): 9, (255, 255, 0): 14},
                         "bit 0 blue, bit 1 red, bit 2 green, bit 3 the brighter level")

    def test_colour_numbers_refuses_a_picture_it_cannot_read(self):
        three_levels = [[(0, 0, 0), (128, 0, 0)], [(192, 0, 0), (255, 0, 0)]]
        with self.assertRaises(SystemExit, msg="three levels: which of them is BRIGHT?"):
            frame.colour_numbers(three_levels)
        two_names = [[(255, 0, 0), (255, 1, 0)], [(0, 0, 0), (0, 0, 192)]]
        with self.assertRaises(SystemExit, msg="two colours that read as the same number"):
            frame.colour_numbers(two_names)

    def test_differ_names_the_pixels_the_drawing_moved(self):
        rows = [[(0, 0, 0), (192, 0, 0)], [(0, 192, 0), (255, 0, 0)]]
        numbers, _ = frame.colour_numbers(rows)
        self.assertEqual(frame.differ(rows, numbers, 0, 0, 2, 2, bytes([0, 2, 4, 10])), [])
        self.assertEqual(frame.differ(rows, numbers, 0, 0, 2, 2, bytes([0, 2, 4, 11])), [(1, 1)])


class TheSitesPalette(unittest.TestCase):
    def test_the_site_palette_is_the_machines_sixteen_colours(self):
        """The one check of site/lib/spectrum.js that needs no emulator: its colour numbers."""
        pal = site_palette()
        self.assertEqual(len(pal), 16, "the ULA has 16 colours, numbered 0-15")
        frame.palette_check(pal)                        # raises if it is not the machine's order

    def test_palette_check_refuses_a_palette_that_is_not_the_machines(self):
        pal = site_palette()
        swapped = list(pal)
        swapped[2], swapped[4] = swapped[4], swapped[2]          # red and green exchanged
        for what, wrong in (("red and green exchanged", swapped),
                            ("BRIGHT darker than normal", pal[:9] + ["#0000d0"] + pal[10:]),
                            ("fifteen colours", pal[:15])):
            with self.assertRaises(SystemExit, msg=what):
                frame.palette_check(wrong)


if __name__ == "__main__":
    unittest.main()
