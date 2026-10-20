#!/usr/bin/env python3
"""kit/apple2/snapshot.py reads the kit's Apple II snapshot into the flat 64 KB image the listing is
built from.

The files here are made in the test, in the shape the kit's server saves (Apple2TS's own save state
inside the kit's wrapper, as kit/apple2/snapshot.py describes it), so it needs no emulator: main
memory with the language card's bank that was switched in, aux memory, one bank of the language
card on its own, the pages Apple2TS leaves out, the header, and the files it refuses, each with a
message.
"""
import base64
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import snapshot                                                           # noqa: E402

# Apple2TS's memory: main 64K, then aux 64K. In each, $C000-$CFFF holds the language card's bank 1
# of $D000-$DFFF, and $D000-$DFFF bank 2.
MAIN = bytearray((i * 31 + 7) & 0xFF for i in range(0x10000))
AUX = bytearray((i * 7 + 1) & 0xFF for i in range(0x10000))
for page in (0x02, 0x95):                       # pages that are all $FF, which Apple2TS leaves out
    MAIN[page * 256:(page + 1) * 256] = b"\xff" * 256
for page in range(0xC0, 0x100):                 # each byte of $C000-$FFFF must differ from $FF
    for i in range(256):
        if MAIN[page * 256 + i] == 0xFF:
            MAIN[page * 256 + i] = 0x00
        if AUX[page * 256 + i] == 0xFF:
            AUX[page * 256 + i] = 0x00
REGS = {"cycleCount": 99, "PStatus": 0x24, "PC": 0x6000, "Accum": 1, "XReg": 2, "YReg": 3, "StackPtr": 0xFD}


def state(bank2=True, aux=True):
    pages = [bytes(MAIN[p * 256:(p + 1) * 256]) for p in range(256)]
    if aux:
        pages += [bytes(AUX[p * 256:(p + 1) * 256]) for p in range(256)]
    valid = ["0" if pg == b"\xff" * 256 else "1" for pg in pages]
    last = max(i for i, v in enumerate(valid) if v == "1")
    held = b"".join(pg for pg, v in zip(pages, valid) if v == "1")
    return {"state6502": {"s6502": REGS, "softSwitches": {"BSRBANK2": bank2, "TEXT": True},
                          "memvalid": "".join(valid[:last + 1]),
                          "memory": base64.b64encode(held).decode()},
            "driveState": {"driveState": [{"drive": 1, "filename": "disk1.woz", "hardDrive": False}]}}


class Snapshot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def file(self, name, blob):
        p = os.path.join(self.tmp.name, name)
        with open(p, "wb") as f:
            f.write(blob)
        return p

    def snap(self, name, st, fmt=snapshot.FORMAT, model="APPLE2EE"):
        return self.file(name, json.dumps({"format": fmt, "version": 1, "model": model,
                                           "apple2ts": "3.7.0", "state": st}).encode())

    def refused(self, path, words):
        with self.assertRaises(SystemExit) as e, contextlib.redirect_stderr(io.StringIO()):
            snapshot.read(path)
        self.assertIn(words, str(e.exception))

    def test_main_memory(self):
        img = snapshot.read(self.snap("s.json", state()))
        self.assertEqual(len(img), 0x10000)
        self.assertEqual(img[:0xC000], bytes(MAIN[:0xC000]))
        self.assertEqual(img[0xC000:0xD000], bytes(0x1000), "the I/O page and the cards' ROM read as zero")
        self.assertEqual(img[0xD000:0xE000], bytes(MAIN[0xD000:0xE000]), "bank 2 of $D000, the one switched in")
        self.assertEqual(img[0xE000:], bytes(MAIN[0xE000:]))

    def test_pages_left_out_are_ff(self):
        img = snapshot.read(self.snap("s.json", state()))
        self.assertEqual(img[0x0200:0x0300], b"\xff" * 256)
        self.assertEqual(img[0x9500:0x9600], b"\xff" * 256)

    def test_bank_1_switched_in(self):
        img = snapshot.read(self.snap("s.json", state(bank2=False)))
        self.assertEqual(img[0xD000:0xE000], bytes(MAIN[0xC000:0xD000]), "Apple2TS keeps bank 1 at $C000")
        self.assertEqual(img[0xE000:], bytes(MAIN[0xE000:]))

    def test_aux(self):
        img = snapshot.read(self.snap("s.json", state()), bank="aux")
        self.assertEqual(img[:0xC000], bytes(AUX[:0xC000]))
        self.assertEqual(img[0xD000:0xE000], bytes(AUX[0xD000:0xE000]))

    def test_aux_never_written_is_ff(self):
        img = snapshot.read(self.snap("s.json", state(aux=False)), bank="aux")
        self.assertEqual(img[:0xC000], b"\xff" * 0xC000)

    def test_one_language_card_bank(self):
        path = self.snap("s.json", state())
        for bank, low, mem in (("mainlc1", 0xC000, MAIN), ("mainlc2", 0xD000, MAIN),
                               ("auxlc1", 0xC000, AUX), ("auxlc2", 0xD000, AUX)):
            img = snapshot.read(path, bank=bank)
            self.assertEqual(img[:0xD000], bytes(0xD000), bank)
            self.assertEqual(img[0xD000:0xE000], bytes(mem[low:low + 0x1000]), bank)
            self.assertEqual(img[0xE000:], bytes(mem[0xE000:]), bank)

    def test_spaces(self):
        sp = snapshot.spaces(self.snap("s.json", state()))
        self.assertEqual(sorted(sp), ["aux", "auxlc1", "auxlc2", "main", "mainlc1", "mainlc2"])
        self.assertEqual((len(sp["main"]), len(sp["auxlc1"])), (0xC000, 0x3000))

    def test_ii_plus(self):
        """A snapshot of the server's II Plus (`--model iiplus`) has main memory and its language
        card, and no aux memory to read."""
        path = self.snap("p.json", state(aux=False), model="APPLE2P")
        self.assertEqual(snapshot.model(snapshot.load(path)), "iiplus")
        self.assertEqual(sorted(snapshot.spaces(path)), ["main", "mainlc1", "mainlc2"])
        self.assertEqual(snapshot.read(path)[:0xC000], bytes(MAIN[:0xC000]))
        for bank in ("aux", "auxlc2"):
            with self.assertRaises(SystemExit) as e:
                snapshot.read(path, bank=bank)
            self.assertIn("II Plus", str(e.exception))

    def test_header(self):
        h = snapshot.header(self.snap("s.json", state()))
        self.assertEqual((h["pc"], h["a"], h["x"], h["y"], h["s"], h["cycles"]), (0x6000, 1, 2, 3, 0xFD, 99))
        self.assertEqual(h["disks"], {1: "disk1.woz"})
        self.assertEqual(h["switches"], {"BSRBANK2": True, "TEXT": True})

    def test_a_bank_that_is_not_one(self):
        with self.assertRaises(SystemExit) as e:
            snapshot.read(self.snap("s.json", state()), bank=3)
        self.assertIn("mainlc1", str(e.exception))

    def test_refused(self):
        self.refused(self.file("d.woz", b"WOZ2\xff\n\r\n" + bytes(100)), "a disk image")
        self.refused(self.file("d.dsk", bytes(143360)), "a disk image")
        self.refused(self.file("m.sta", b"MAMESAVE" + bytes(100)), "MAME")
        self.refused(self.file("a.aws.yaml", b"# AppleWin save state\n" + bytes(100)), "AppleWin")
        self.refused(self.file("w.json", json.dumps({"state6502": {}}).encode()), "Apple2TS's web page")
        self.refused(self.snap("o.json", state(), fmt="something-else"), "its format is 'something-else'")
        self.refused(self.file("n.bin", b"\x00\x01garbage"), "not JSON")


if __name__ == "__main__":
    unittest.main()
