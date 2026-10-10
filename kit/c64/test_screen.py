#!/usr/bin/env python3
"""Tests for kit/c64/screen.py, the screen's text, on memory images and a stand-in emulator.

    python3 kit/c64/test_screen.py

Runs in CI, with no emulator and no ROM: the fonts are made up here, and the character ROM's
place is taken by bytes that only have to differ from the RAM under them.
"""
import json, os, random, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import screen   # noqa: E402
from screen import Font, ROM_LOWER, ROM_UPPER, decode, text, wait_text   # noqa: E402
from vice import ViceError   # noqa: E402

ASCII = "".join(map(chr, range(0x20, 0x7F)))


def made_up_font(width, seed=7):
    """95 glyphs in ASCII order from the space, each one different, drawn in the leftmost
    width - 1 pixels of rows 1-6 as letters are, and a few as thin as punctuation gets."""
    rnd, out, seen = random.Random(seed), {}, set()
    thin = {"-": {3: 0xF0}, "_": {6: 0xF0}, ".": {6: 0x40}, "'": {1: 0x40, 2: 0x40}}
    for ch in ASCII:
        rows = [0] * 8
        if ch in thin:
            for r, b in thin[ch].items():
                rows[r] = b & (0xFF << (9 - width)) & 0xFF
        elif ch != " ":
            while True:
                rows = [0] + [rnd.getrandbits(width - 1) << (9 - width) for _ in range(6)] + [0]
                if bytes(rows) not in seen and any(rows):
                    break
        seen.add(bytes(rows))
        out[ch] = bytes(rows)
    return b"".join(out[ch] for ch in ASCII), out


def regs(d011=0x1B, d016=0xC8, d018=0x15):
    r = [0] * 47
    r[0x11], r[0x16], r[0x18] = d011, d016, d018
    return r


class Memory:
    """64 KB of RAM, and a stand-in character ROM that read() shows where the video chip sees it."""

    def __init__(self):
        self.ram = bytearray(0x10000)
        self.rom = bytes((i * 37 + 11) & 0xFF for i in range(0x1000))

    def read(self, a, n):
        return bytes(self.rom[(a + i) & 0xFFF] if (a + i) & 0x7000 == 0x1000 else self.ram[a + i]
                     for i in range(n))

    def put(self, a, data):
        self.ram[a:a + len(data)] = data

    def blank(self, a, code=0x20):
        """A screen matrix of spaces: zeroed RAM reads as @, screen code 0."""
        self.put(a, bytes([code]) * 1000)
        return self


def codes(s, table=ROM_UPPER):
    return bytes(table.index(c) for c in s)


def draw_cells(mem, bitmap, glyphs, s, row, col, inverse=False):
    for i, ch in enumerate(s):
        g = glyphs[ch]
        mem.put(bitmap + row * 320 + (col + i) * 8, bytes(b ^ 0xFF for b in g) if inverse else g)


def draw_pixels(mem, bitmap, glyphs, width, s, x, y):
    for ch in s:
        for i, b in enumerate(glyphs[ch]):
            for j in range(width):
                if b & 0x80 >> j:
                    px, py = x + j, y + i
                    mem.ram[bitmap + (py >> 3) * 320 + (px >> 3) * 8 + (py & 7)] |= 0x80 >> (px & 7)
        x += width


class TextMode(unittest.TestCase):
    def test_screen_codes_upper_set(self):
        m = Memory().blank(0x0400)
        m.put(0x0400, codes("@HELLO, 64!"))
        m.put(0x0400 + 5 * 40 + 3, bytes(c | 0x80 for c in codes("READY.")))      # reversed
        m.put(0x0400 + 7 * 40, bytes([0x5D, 0x60, 0x41]))                          # graphics, blank
        lines = decode(regs(), 0x97, m.read)
        self.assertEqual(len(lines), 25)
        self.assertEqual(lines[0], "@HELLO, 64!")
        self.assertEqual(lines[5], "   READY.")
        self.assertEqual(lines[7], screen.GRAPHIC + " " + screen.GRAPHIC)

    def test_lower_case_set_where_d018_picks_it(self):
        m = Memory().blank(0x0400)
        m.put(0x0400, codes("Insert Disk", ROM_LOWER))
        self.assertEqual(decode(regs(d018=0x17), 0x97, m.read)[0], "Insert Disk")
        self.assertEqual(decode(regs(d018=0x15), 0x97, m.read)[0],
                         "".join(ROM_UPPER[c] for c in codes("Insert Disk", ROM_LOWER)))

    def test_video_bank_from_cia2(self):
        m = Memory().blank(0x0800).blank(0xC800)
        m.put(0xC000 + 0x0800, codes("BANK THREE"))          # $D018 $25: matrix at $0800 of the bank
        self.assertEqual(decode(regs(d018=0x25), 0x94, m.read)[0], "BANK THREE")
        self.assertEqual(decode(regs(d018=0x25), 0x97, m.read)[0], "")

    def test_extended_colour_keeps_six_bits(self):
        m = Memory().blank(0x0400)
        m.put(0x0400, bytes(c | 0x40 for c in codes("ECM")) + bytes([codes("X")[0] | 0xC0]))
        self.assertEqual(decode(regs(d011=0x5B), 0x97, m.read)[0], "ECMX")

    def test_own_character_set_read_through_its_font(self):
        data, glyphs = made_up_font(8)
        order = "ZYXWVUTSRQPONMLKJIHGFEDCBA "          # the game's own screen codes
        m = Memory().blank(0x4400, order.index(" "))
        m.put(0x4800, b"".join(glyphs[c] for c in order))   # character set at $0800 of bank 1
        m.put(0x5000, data)                                 # its font, elsewhere
        m.put(0x4400, bytes(order.index(c) for c in "SAVE GAME"))
        r = regs(d018=0x12)                                 # matrix $0400, characters $0800
        self.assertEqual(decode(r, 0x96, m.read, Font(0x5000), m.read(0x5000, len(data)))[0], "SAVE GAME")


class BitmapCells(unittest.TestCase):
    def setUp(self):
        self.data, self.glyphs = made_up_font(7)
        self.m = Memory()
        rnd = random.Random(3)
        self.m.put(0x6000, bytes(rnd.getrandbits(8) for _ in range(16 * 320)))   # a picture above
        draw_cells(self.m, 0x6000, self.glyphs, "Insert side 1. (RETURN)", 20, 2)
        draw_cells(self.m, 0x6000, self.glyphs, "COPY SIDE 1.", 22, 0, inverse=True)
        self.m.put(0xC600, self.data)
        self.r = regs(d011=0x3B, d016=0xD8, d018=0x79)   # multicolour bitmap $6000, matrix $5C00

    def lines(self, font):
        return decode(self.r, 0x96, self.m.read, font, self.m.read(font.address, 8 * len(font.chars)))

    def test_needs_a_font(self):
        with self.assertRaisesRegex(ValueError, "bitmap"):
            decode(self.r, 0x96, self.m.read)

    def test_reads_plain_and_inverted_glyphs_in_cells(self):
        lines = self.lines(Font(0xC600, first=0x20))
        self.assertEqual(lines[20], "  Insert side 1. (RETURN)")
        self.assertEqual(lines[22], "COPY SIDE 1.")
        self.assertTrue(all(not lines[r].strip() for r in range(16)), lines[:16])

    def test_count_and_first_place_the_characters(self):
        font = Font(0xC600 + 8 * (ord("A") - 0x20), first=ord("A"), count=26)    # capitals alone
        self.assertEqual(self.lines(font)[22], "COPY SIDE")
        self.assertEqual(self.lines(font)[20], "  I" + " " * 15 + "RETURN")


class BitmapPixels(unittest.TestCase):
    def setUp(self):
        self.data, self.glyphs = made_up_font(5)
        self.m = Memory()
        draw_pixels(self.m, 0x2000, self.glyphs, 5, "Insert destination disk.", 13, 101)
        draw_pixels(self.m, 0x2000, self.glyphs, 5, "Press 'Y' to go on", 1, 3)
        draw_pixels(self.m, 0x2000, self.glyphs, 5, "1 - 2 _ 3", 200, 150)   # "-" is "_" moved up
        self.m.put(0x8000, self.data)
        self.r = regs(d011=0x3B, d018=0x18)               # bitmap $2000

    def lines(self, font):
        return decode(self.r, 0x97, self.m.read, font, self.m.read(font.address, 8 * len(font.chars)))

    def test_lines_at_any_pixel(self):
        lines = self.lines(Font(0x8000, width=5))
        self.assertEqual(lines[(101 + 4) >> 3], "   Insert destination disk.")
        self.assertEqual(lines[(3 + 4) >> 3], "Press 'Y' to go on")
        self.assertEqual(lines[(150 + 4) >> 3].strip(), "1 - 2 _ 3")
        self.assertEqual(sum(1 for l in lines if l.strip()), 3, lines)

    def test_glyphs_wider_than_width_are_refused(self):
        with self.assertRaisesRegex(ValueError, "wider than that"):
            self.lines(Font(0x8000, width=3))


class Reader(unittest.TestCase):
    def test_character_rom_where_the_chip_sees_it(self):
        asked = []
        fake = Fake(Memory())
        fake.asked = asked
        screen.vic_reader(fake.rpc)(0x0FF0, 0x20)
        screen.vic_reader(fake.rpc)(0x9800, 8)
        screen.vic_reader(fake.rpc)(0x5000, 8)
        self.assertEqual(asked, [("$0FF0", 16, "ram"), ("$D000", 16, "rom"), ("$D800", 8, "rom"),
                                 ("$5000", 8, "ram")])


class Fake:
    """The emulator's tools that screen.py calls, over a Memory; the screen changes after a while."""

    def __init__(self, mem, paused=False):
        self.mem, self.paused, self.reads, self.later, self.asked = mem, paused, 0, None, []

    def rpc(self, method, params=None, notif=False):
        name, a = params["name"], params["arguments"]
        if name == "vice_vicii_get_state":
            self.reads += 1
            if self.later and self.reads == self.later[0]:
                self.mem.put(*self.later[1:])
            out = {"registers": regs()}
        elif name == "vice_memory_read":
            start = int(a["address"].lstrip("$"), 16)
            self.asked.append((a["address"], a["size"], a.get("bank")))
            if a.get("bank") == "io":
                out = {"data_hex": "97"}
            else:
                src = self.mem.rom if a.get("bank") == "rom" else self.mem.ram
                base = 0xD000 if a.get("bank") == "rom" else 0
                out = {"data_hex": bytes(src[start - base:start - base + a["size"]]).hex()}
        elif name == "vice_ping":
            out = {"execution": "paused" if self.paused else "running"}
        elif name == "vice_registers_get":
            out = {"PC": 0xFF00}
        else:
            raise AssertionError(name)
        return {"result": {"content": [{"text": json.dumps(out)}]}}


class WaitText(unittest.TestCase):
    def test_returns_the_match_once_it_appears(self):
        fake = Fake(Memory().blank(0x0400))
        fake.later = (3, 0x0400 + 23 * 40, codes("INSERT SIDE 2"))
        m = wait_text(fake.rpc, r"INSERT SIDE (\d)", timeout=5, every=0)
        self.assertEqual(m.group(1), "2")
        self.assertEqual(fake.reads, 3)
        self.assertEqual(text(fake.rpc)[23], "INSERT SIDE 2")

    def test_times_out_with_the_screen(self):
        fake = Fake(Memory())
        fake.mem.put(0x0400 + 2 * 40, codes("LOADING"))
        with self.assertRaises(TimeoutError) as e:
            wait_text(fake.rpc, "READY", timeout=0.05, every=0.01)
        self.assertIn("LOADING", str(e.exception))

    def test_a_stopped_machine_fails_at_once(self):
        fake = Fake(Memory(), paused=True)
        with self.assertRaisesRegex(ViceError, r"stopped at \$FF00"):
            wait_text(fake.rpc, "READY", timeout=60)
        self.assertEqual(fake.reads, 1)

    def test_a_stopped_machine_still_answers_what_is_there(self):
        fake = Fake(Memory(), paused=True)
        fake.mem.put(0x0400, codes("READY."))
        self.assertEqual(wait_text(fake.rpc, r"READY\.").group(0), "READY.")


class Tables(unittest.TestCase):
    def test_rom_sets(self):
        self.assertEqual((len(ROM_UPPER), len(ROM_LOWER)), (128, 128))
        self.assertEqual(ROM_UPPER[0x01] + ROM_UPPER[0x1A] + ROM_UPPER[0x30] + ROM_UPPER[0x3F], "AZ0?")
        self.assertEqual(ROM_LOWER[0x01] + ROM_LOWER[0x41] + ROM_LOWER[0x5A], "aAZ")
        self.assertEqual(ROM_UPPER[0x1C] + ROM_UPPER[0x20] + ROM_UPPER[0x60] + ROM_LOWER[0x60], "£   ")


if __name__ == "__main__":
    unittest.main()
