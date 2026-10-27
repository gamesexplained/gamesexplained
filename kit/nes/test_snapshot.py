#!/usr/bin/env python3
"""kit/nes/snapshot.py reads the kit's NES snapshot into the flat 64 KB image the listing is built from.

The files here are made in the test, in the format kit/nes/snapshot.py describes, so it needs no
emulator: the CPU's image with RAM's mirrors and the chips' range blanked, the PPU's
memory through its mirror table, the sprite table, the header, and the files it refuses, each
with a message.
"""
import gzip
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import snapshot                                                           # noqa: E402

MEM = [(i * 31 + 7) & 0xFF for i in range(0x10000)]
VRAM = [(i * 13 + 5) & 0xFF for i in range(0x8000)]
TABLE = [i if i < 0x2800 else i - 0x800 for i in range(0x8000)]          # $2800 is $2000, as vertical mirroring has it
CPU = {"mem": MEM, "REG_PC": 0xC09B, "REG_ACC": 1, "REG_X": 2, "REG_Y": 3, "REG_SP": 0x1FD, "_cpuCycleBase": 99,
       "F_CARRY": 1, "F_ZERO": 0, "F_INTERRUPT": 1, "F_DECIMAL": 0, "F_BRK": 0, "F_NOTUSED": 1, "F_OVERFLOW": 0,
       "F_SIGN": 1}
KIT = {"cartridge": {"name": "test.nes", "mapper": 0, "prg_kb": 16, "chr_kb": 8, "mirroring": "vertical"},
       "frames": 12, "jsnes": "2.1.0"}


def snap(**over):
    s = {"format": snapshot.FORMAT, "kit": KIT,
         "state": {"cpu": CPU, "ppu": {"vramMem": VRAM, "vramMirrorTable": TABLE, "spriteMem": list(range(256))}}}
    s.update(over)
    return s


class Snapshot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def file(self, name, blob):
        p = os.path.join(self.tmp.name, name)
        with open(p, "wb") as f:
            f.write(blob)
        return p

    def good(self):
        return self.file("s.json.gz", gzip.compress(json.dumps(snap()).encode()))

    def test_image(self):
        img = snapshot.read(self.good())
        self.assertEqual(len(img), 0x10000)
        self.assertEqual(img[:0x800], bytes(MEM[:0x800]))
        self.assertEqual(img[0x800:0x2000], bytes(0x1800), "the RAM's mirrors hold nothing of their own")
        self.assertEqual(img[0x2000:0x6000], bytes(0x4000))
        self.assertEqual(img[0x6000:], bytes(MEM[0x6000:]))

    def test_ppu_and_oam(self):
        p = self.good()
        ppu = snapshot.ppu(p)
        self.assertEqual(len(ppu), 0x4000)
        self.assertEqual(ppu[0x2800:0x2810], ppu[0x2000:0x2010])
        self.assertEqual(ppu[0x10], VRAM[0x10])
        self.assertEqual(snapshot.oam(p), bytes(range(256)))

    def test_header(self):
        h = snapshot.header(self.good())
        self.assertEqual((h["pc"], h["a"], h["x"], h["y"], h["s"], h["cycles"]), (0xC09C, 1, 2, 3, 0xFD, 99))
        self.assertEqual(h["p"], 0x01 | 0x02 | 0x04 | 0x20 | 0x80)
        self.assertEqual(h["kit"]["frames"], 12)

    def test_plain_json_reads_too(self):
        self.assertEqual(snapshot.read(self.file("s.json", json.dumps(snap()).encode()))[:4], bytes(MEM[:4]))

    def refused(self, path, words):
        with self.assertRaises(SystemExit) as e:
            snapshot.read(path)
        self.assertIn(words, str(e.exception))

    def test_refuses(self):
        self.refused(self.file("g.nes", b"NES\x1a" + bytes(32)), "iNES cartridge image")
        self.refused(self.file("x.bin", b"\x00\x01\x02"), "not gzipped JSON")
        self.refused(self.file("o.json", json.dumps({"format": "jsbeeb-snapshot"}).encode()), "not a kit NES snapshot")
        with self.assertRaises(SystemExit) as e:
            snapshot.read(self.good(), bank=1)
        self.assertIn("not in an NES snapshot", str(e.exception))

    def test_registers(self):
        flags = {"f_nmiOnVblank": 1, "f_spriteSize": 1, "f_bgPatternTable": 1, "f_spPatternTable": 0, "f_addrInc": 0,
                 "f_color": 0, "f_spVisibility": 1, "f_bgVisibility": 1, "f_spClipping": 0, "f_bgClipping": 1,
                 "f_dispType": 0, "regV": 1, "regH": 0, "regHT": 4, "regFH": 5, "regVT": 29, "regFV": 7}
        s = snap()
        s["state"]["ppu"].update(flags)
        p = self.file("r.json.gz", gzip.compress(json.dumps(s).encode()))
        self.assertEqual(snapshot.registers(p), {"ctrl": 0xB2, "mask": 0x1A, "scrollX": 37, "scrollY": 239})


if __name__ == "__main__":
    unittest.main()
