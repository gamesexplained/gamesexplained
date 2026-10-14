#!/usr/bin/env python3
"""An Ultimax cartridge in kit/c64/frame.py and site/lib/c64.js: the raster line read from the chip
when the emulator's state call gives the RAM instead, the cartridge told from RAM under a banked-out
KERNAL, and the cartridge ROM the video chip sees at $3000-$3FFF (F.ultimax). No emulator; the drawing needs node or JavaScriptCore, and fails
rather than skips without one when KIT_REQUIRE_TOOLS is set."""
import base64, json, os, shutil, sys, tempfile, unittest

import frame


class FakeMachine(frame.Machine):
    """vice_vicii_get_state as vice-mcp v3.13.2 answered it with an Ultimax cartridge attached:
    the RAM's power-on pattern and line 256; the io bank holds the chip."""
    def __init__(self, line, state_line=256):
        self.line, self.state_line = line, state_line

    def j(self, tool, args=None):
        assert tool == "vice_vicii_get_state"
        return {"raster_line": self.state_line, "registers": [255, 255, 0, 0] * 12}

    def read(self, a, n, bank="ram"):
        assert (a, bank) == (0xD000, "io")
        regs = bytearray(47)
        regs[0x11] = 0x1B | (0x80 if self.line > 255 else 0)
        regs[0x12] = self.line & 0xFF
        regs[0x20] = 3
        return bytes(regs)


class RasterTests(unittest.TestCase):
    def test_state_that_disagrees_gives_way_to_the_chip(self):
        line, regs = FakeMachine(0x102).vic()
        self.assertEqual(line, 0x102)
        self.assertEqual(regs[0x20], 3)

    def test_state_that_agrees_is_kept(self):
        line, regs = FakeMachine(256, 256).vic()
        self.assertEqual((line, regs[0]), (256, 255))


class Banks(frame.Machine):
    """$F000-$FFFF as the processor, the cartridge port, the KERNAL ROM and the RAM read it."""
    def __init__(self, cpu, cart, rom, ram):
        self.banks = {"cpu": cpu, "cart": cart, "rom": rom, "ram": ram}

    def read(self, a, n, bank="ram"):
        assert (a, n) == (0xF000, 0x1000)
        return bytes([self.banks[bank]]) * n


class DetectTests(unittest.TestCase):
    def test_cartridge(self):
        self.assertIsNotNone(Banks(cpu=7, cart=7, rom=1, ram=2).ultimax())

    def test_kernal_in(self):
        self.assertIsNone(Banks(cpu=1, cart=1, rom=1, ram=2).ultimax())

    def test_kernal_banked_out(self):
        # no cartridge, $01 = $35: VICE's cart bank reads what the processor sees, the RAM
        self.assertIsNone(Banks(cpu=2, cart=2, rom=1, ram=2).ultimax())


def runtime():
    return shutil.which("node") or os.path.exists(frame.JSC)


def frame_with(ultimax):
    """Text mode, screen at $0400, characters at $3800 (as Clowns sets them): character 1 in the
    top-left cell, white on black, its glyph solid in the ROM and empty in RAM."""
    ram = bytearray(0x10000)
    ram[0x0400] = 1
    vic = [0] * 47
    vic[0x11], vic[0x16], vic[0x18], vic[0x20], vic[0x21] = 0x1B, 0x08, 0x1E, 0, 0
    F = {"schema": 1, "standard": "PAL", "lines": 312, "cycles": 63, "vic": vic, "cia2": [0x3F, 0x3F],
         "cpu": [0x2F, 0xE5], "writes": [], "colour": base64.b64encode(bytes([1] * 1024)).decode(),
         "ram": [{"a": 0, "b": base64.b64encode(bytes(ram)).decode()}]}
    if ultimax:
        rom = bytearray(0x1000)
        rom[0x808:0x810] = b"\xff" * 8                   # character 1 at $3800 + 8
        F["ultimax"] = base64.b64encode(bytes(rom)).decode()
    return F


@unittest.skipUnless(runtime() or os.environ.get("KIT_REQUIRE_TOOLS"), "no JavaScript runtime")
class DrawTests(unittest.TestCase):
    def draw(self, F):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(F, f)
        try:
            meta, px, _ = frame.render(f.name)
        finally:
            os.unlink(f.name)
        # the first cell of the display: PAL line 51, 24 pixels into the picture's border
        y, x = 51 - meta["line0"], 24 - (-8) + 2
        return px[y * meta["w"] + x]

    def test_glyph_from_the_cartridge(self):
        self.assertEqual(self.draw(frame_with(True)), 1)

    def test_glyph_from_ram_without_it(self):
        self.assertEqual(self.draw(frame_with(False)), 0)


if __name__ == "__main__":
    unittest.main()
