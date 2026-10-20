#!/usr/bin/env python3
"""kit/c16/snapshot.py reads the kit's Commodore 16 and Plus/4 snapshot into the flat 64 KB image
the listing is built from.

The files here are made in the test, in the shape kit/c16/snapshot.py describes: plus4emu's own
file (its magic, then chunks of a type, a length, the data and a checksum) with the kit server's
notes in a chunk of their own. So it needs no emulator: the RAM of a C16 and of a Plus/4, never
the ROMs, the bytes the instruction before the stop had still to write, the header with and
without the kit's notes, and the files it refuses, each with a message. That the shape is
plus4emu's is checked against the machine by `check-emulator` (`snapshot-python`), by hand.
"""
import json
import os
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import snapshot                                                           # noqa: E402

TED_REGS = bytes(range(0x40, 0x60))           # $FF00-$FF1F, each a value of its own


def ram(kb):
    """RAM whose every 16 KB segment is told apart from the others and from the ROMs ($EE)."""
    return bytes(((i * 7) ^ (i >> 14) * 0x55) & 0x7F for i in range(kb * 1024))


def chunk(kind, data):
    return struct.pack(">II", kind, len(data)) + data + b"\0\0\0\0"


def p4emu(path, kb=16, notes=None, pc=0x1234, roms=2, ted=True):
    """A snapshot as the kit's server writes one: the TED chunk (a version, the ROMs present as a
    bit mask, the number of 16 KB RAM segments, the RAM, the ROMs, the CPU's port and TED's
    registers), the CPU chunk (a version, then PC, P, A, X, Y and S), the kit's notes, the end."""
    body = (b"\x01\0\0\x05" + bytes([(1 << roms) - 1, kb // 16]) + ram(kb) + b"\xee" * (0x4000 * roms)
            + b"\x0f\x08" + TED_REGS + b"\0" * 64)
    cpu = b"\x01\0\0\x02" + struct.pack("<H", pc) + bytes([0x33, 0x11, 0x22, 0x33, 0xF2]) + b"\0" * 18
    blob = snapshot.MAGIC + (chunk(snapshot.TED_STATE, body) if ted else b"") + chunk(snapshot.CPU_STATE, cpu)
    if notes is not None:
        blob += chunk(snapshot.KIT_NOTES, json.dumps(notes).encode())
    with open(path, "wb") as f:
        f.write(blob + chunk(0, b""))
    return path


def refused(path):
    """The message snapshot.read() exits with."""
    try:
        snapshot.read(path)
    except SystemExit as e:
        return str(e.code)
    raise AssertionError(f"{path}: read, not refused")


class Snapshot(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name

    def path(self, name):
        return os.path.join(self.dir, name)

    def test_c16_ram_once_at_the_bottom(self):
        image = snapshot.read(p4emu(self.path("c16.p4emu"), kb=16))
        self.assertEqual(len(image), 0x10000)
        self.assertEqual(image[:0x4000], ram(16))
        self.assertEqual(image[0x4000:], bytes(0xC000), "a C16's 16 KB is held once, the rest zero")

    def test_plus4_ram_whole_and_never_the_roms(self):
        image = snapshot.read(p4emu(self.path("plus4.p4emu"), kb=64, roms=4))
        self.assertEqual(image, ram(64), "all 64 KB of RAM, under the ROMs and the I/O area too")
        self.assertNotIn(b"\xee" * 16, image)

    def test_the_writes_still_to_make_at_the_stop(self):
        notes = {"format": "plus4emu-kit-snapshot", "version": 1, "model": "c16pal", "ram_kb": 16,
                 "exact": True, "stamp": 1000, "frames": 3, "ram_at_stop": [[0x1000, 0xAB], [0x3FFF, 0xCD], [0x4000, 1]]}
        image = snapshot.read(p4emu(self.path("stop.p4emu"), notes=notes))
        self.assertEqual((image[0x1000], image[0x3FFF]), (0xAB, 0xCD))
        self.assertEqual(image[0x4000], 0, "a write outside the machine's RAM is not applied")

    def test_header_from_the_kits_notes(self):
        notes = {"model": "plus4pal", "plus4emu": "1.2.11 (git 939e652)", "exact": True, "stamp": 500, "frames": 9,
                 "media": {"tape": None, "disk": "work/game.d64"}, "resume": {"pc": 0x2048, "stamp": 777},
                 "regs": {"pc": 0x2048, "a": 1, "x": 2, "y": 3, "s": 0xF0, "p": 0x30}}
        h = snapshot.header(p4emu(self.path("h.p4emu"), kb=64, roms=4, notes=notes))
        self.assertEqual((h["model"], h["ram_kb"], h["kit"], h["exact"]), ("plus4pal", 64, True, True))
        self.assertEqual((h["pc"], h["cycles"], h["frames"]), (0x2048, 777, 9))
        self.assertEqual((h["a"], h["x"], h["y"], h["s"], h["p"]), (1, 2, 3, 0xF0, 0x30))
        self.assertEqual((h["ted"], h["cpu_port"]), (TED_REGS, [0x0F, 0x08]))
        self.assertEqual(h["media"]["disk"], "work/game.d64")

    def test_header_of_a_file_plus4emus_own_program_saved(self):
        h = snapshot.header(p4emu(self.path("own.p4emu")))
        self.assertEqual((h["kit"], h["exact"], h["model"], h["ram_kb"]), (False, None, None, 16))
        self.assertEqual((h["pc"], h["p"], h["a"], h["x"], h["y"], h["s"]), (0x1234, 0x33, 0x11, 0x22, 0x33, 0xF2))
        self.assertEqual(snapshot.read(self.path("own.p4emu"))[:0x4000], ram(16), "its RAM is read as it is")

    def test_refuses_what_is_not_the_kits_snapshot(self):
        files = {"vice.vsf": b"VICE Snapshot File\x1a" + bytes(64), "mame.sta": b"MAMESAVE" + bytes(64),
                 "game.tap": b"C16-TAPE-RAW\x01\x02" + bytes(64), "game.d64": bytes(174848),
                 "game.crt": b"PLUS4 CARTRIDGE " + bytes(64), "packed.p4emu": b"\x78\x9c" + bytes(64),
                 "game.prg": b"\x01\x10" + bytes(200)}
        words = {"vice.vsf": "VICE", "mame.sta": "MAME", "game.tap": "tape", "game.d64": "disk",
                 "game.crt": "cartridge", "packed.p4emu": "compressed", "game.prg": "program file"}
        for name, blob in files.items():
            with open(self.path(name), "wb") as f:
                f.write(blob)
            self.assertIn(words[name], refused(self.path(name)), name)
        self.assertIn("no machine", refused(p4emu(self.path("empty.p4emu"), ted=False)))
        self.assertIn("no such snapshot", refused(self.path("absent.p4emu")))

    def test_no_banks(self):
        path = p4emu(self.path("c16.p4emu"))
        with self.assertRaises(SystemExit):
            snapshot.read(path, bank=1)


if __name__ == "__main__":
    unittest.main()
