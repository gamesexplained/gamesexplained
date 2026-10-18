#!/usr/bin/env python3
"""kit/bbc/snapshot.py reads jsbeeb's snapshot into the flat 64 KB image the listing is built from.

The files here are made in the test, in jsbeeb's format as kit/bbc/snapshot.py describes it,
so it needs no emulator: main RAM, the sideways RAM bank that was paged in, a bank on its own,
the header, and the formats it refuses, each with a message.
"""
import base64
import gzip
import json
import os
import sys
import tempfile
import unittest
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import snapshot                                                           # noqa: E402

RAM = bytes((i * 31 + 7) & 0xFF for i in range(0x20000))       # jsbeeb's RAM area is 128 KB
BANK4 = bytes((i * 7 + 1) & 0xFF for i in range(snapshot.BANK))
REGS = {"pc": 0x2000, "a": 1, "x": 2, "y": 3, "s": 0xFD, "p": 0x24, "currentCycles": 99}


def typed(b, deflate):
    """A jsbeeb typed array; jsbeeb deflates one from 1 KB up."""
    if deflate:
        return {"__typedArray": True, "type": "Uint8Array", "encoding": "deflate",
                "data": base64.b64encode(zlib.compress(b)).decode()}
    return {"__typedArray": True, "type": "Uint8Array", "data": base64.b64encode(b).decode()}


class Snapshot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def file(self, name, blob):
        p = os.path.join(self.tmp.name, name)
        with open(p, "wb") as f:
            f.write(blob)
        return p

    def snap(self, name, state, gz=True, fmt=snapshot.FORMAT):
        body = json.dumps({"format": fmt, "version": 4, "model": "BBC B with 8271 (DFS 1.2)",
                           "state": state}).encode()
        return self.file(name, gzip.compress(body) if gz else body)

    def test_rom_paged_in(self):
        p = self.snap("rom.json.gz", {**REGS, "romsel": 15, "ram": typed(RAM, True),
                                      "swRamBanks": {"4": typed(BANK4, True)}})
        img = snapshot.read(p)
        self.assertEqual(len(img), 0x10000)
        self.assertEqual(img[:0x8000], RAM[:0x8000], "main RAM is the first 32 KB of state.ram")
        self.assertEqual(img[0x8000:], bytes(0x8000), "a ROM bank, the MOS and the I/O pages read as zero")

    def test_one_bank(self):
        p = self.snap("rom.json.gz", {**REGS, "romsel": 15, "ram": typed(RAM, True),
                                      "swRamBanks": {"4": typed(BANK4, True)}})
        img = snapshot.read(p, bank=4)
        self.assertEqual(img[0x8000:0xC000], BANK4)
        self.assertEqual(img[:0x8000] + img[0xC000:], bytes(0xC000), "bank=n is that bank at &8000 alone")
        with self.assertRaises(SystemExit) as e:
            snapshot.read(p, bank=7)
        self.assertIn("bank 7", str(e.exception))

    def test_header(self):
        p = self.snap("rom.json.gz", {**REGS, "romsel": 15, "ram": typed(RAM, True),
                                      "swRamBanks": {"4": typed(BANK4, True)}})
        h = snapshot.header(p)
        self.assertEqual((h["pc"], h["romsel"], h["sideways_ram"], h["cycles"]), (0x2000, 15, [4], 99))

    def test_sideways_ram_paged_in(self):
        # a plain file, neither gzipped nor deflated, reads the same
        p = self.snap("ram.json", {**REGS, "romsel": 4, "ram": typed(RAM, False),
                                   "swRamBanks": {"4": typed(BANK4, False)}}, gz=False)
        self.assertEqual(snapshot.read(p)[0x8000:0xC000], BANK4, "the paged sideways RAM bank is at &8000")

    def test_refused(self):
        short = {"format": snapshot.FORMAT, "state": {"ram": typed(bytes(range(256)) * 64, False)}}
        cases = [("other.json", json.dumps({"format": "something-else"}).encode()),
                 ("bem.snp", b"BEMSNAP1" + bytes(64)),
                 ("beebem.uef", b"UEF File!\0" + bytes(16)),
                 ("short.json.gz", gzip.compress(json.dumps(short).encode())),
                 ("text.json", b"not a snapshot")]
        for name, blob in cases:
            with self.subTest(name), self.assertRaises(SystemExit) as e:
                snapshot.read(self.file(name, blob))
            self.assertTrue(str(e.exception).strip(), f"{name}: refused without a message")


if __name__ == "__main__":
    unittest.main()
