#!/usr/bin/env python3
"""kit/gnw/snapshot.py: the ROM in the order the chip runs it at $0000-$073F, the data cells at
$1000-$107F with their mirrors resolved, and anything that is not the kit's snapshot refused.
The snapshot is made here from the kit's own test program (kit/gnw/check_emulator.py), not a game.

    python3 kit/gnw/test_snapshot.py
"""
import gzip, json, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "cpu"))
import snapshot                                   # noqa: E402
from asm import assemble                          # noqa: E402
from check_emulator import PROGRAM                # noqa: E402
from sm5a import physical                         # noqa: E402


class Snapshot(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name
        self.rom = assemble(PROGRAM)
        ram = [0] * 0x80
        ram[0x23] = 7          # row 2, column 3
        ram[0x0C] = 9          # column 12: columns 13-15 read it
        ram[0x41] = 5          # row 4: rows 5-7 read it
        state = {"pc": 0x3C0, "acc": 1, "bl": 2, "bm": 3, "c": 0, "cb": 0, "stack": 0x3C0, "div": 0, "cycles": 0, "ram": ram}
        self.path = os.path.join(self.dir, "t.gnw.json.gz")
        with open(self.path, "wb") as f:
            f.write(gzip.compress(json.dumps({"format": "kit-gnw-snapshot", "chip": "SM5A", "rom": {"hex": self.rom.hex()}, "state": state}).encode()))

    def test_rom_in_running_order(self):
        img = snapshot.read(self.path)
        self.assertEqual(len(img), 0x10000)
        self.assertTrue(all(img[a] == self.rom[physical(a)] for a in range(0x740)))
        self.assertEqual(snapshot.rom(self.path), self.rom)

    def test_cells_and_mirrors(self):
        img = snapshot.read(self.path)
        self.assertEqual(img[0x1023], 7)
        self.assertEqual([img[0x100D], img[0x100E], img[0x100F]], [9, 9, 9])
        self.assertEqual([img[0x1051], img[0x1061], img[0x1071]], [5, 5, 5])
        self.assertEqual(sum(img[0x1080:]), 0)
        self.assertEqual(sum(img[0x740:0x1000]), 0)

    def test_refuses_another_file(self):
        bad = os.path.join(self.dir, "x.json.gz")
        with open(bad, "wb") as f:
            f.write(gzip.compress(b'{"format": "kit-nes-snapshot"}'))
        with self.assertRaises(SystemExit):
            snapshot.read(bad)
        with self.assertRaises(SystemExit):
            snapshot.read(self.path, bank=1)


if __name__ == "__main__":
    unittest.main()
