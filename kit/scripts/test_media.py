#!/usr/bin/env python3
"""The media ledger (kit/scripts/media.py) on a made-up disk and cartridge.

The disk holds an engine whose bytes the game's listing holds, two levels with the same bytes
under two names, a boot program, and a sector the disk's map marks as used that no file holds.
The scan must list each once, answer the engine as the part, keep every answer on a second scan,
and the rules must hold a new Silver game to an answer for every item while an older one only
shows what is open. The cartridge's blank bank answers itself; a T64 is listed as unread.
"""
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))
sys.path.append(str(KIT / 'c64'))       # after the kit's scripts: both have a media.py
import media as M  # noqa: E402
import disk  # noqa: E402

ENGINE = bytes((i * 37 + 11) & 255 for i in range(600))
LEVEL = bytes((i * 91 + 5) & 255 for i in range(300))
BOOT = b"\x01\x08\x0b\x08\x0a\x00\x9e\x32\x30\x36\x31\x00\x00\x00"
STRAY = bytes((i * 13) & 255 for i in range(256))


def write_d64(path, files, stray):
    """files: [(name, load, data)] on tracks 17 down, one entry each; stray: (track, sector, bytes)."""
    S = {(t, s): bytearray(256) for t in range(1, 36) for s in range(disk.SPT[t])}
    bam = S[(18, 0)]
    bam[0:4] = bytes([18, 1, 0x41, 0])
    for t in range(1, 36):
        n = disk.SPT[t]
        bits = (1 << n) - 1
        bam[4 * t:4 * t + 4] = bytes([n, bits & 255, bits >> 8 & 255, bits >> 16 & 255])

    def use(t, s):
        bam[4 * t] -= 1
        bam[4 * t + 1 + s // 8] &= ~(1 << (s % 8)) & 255
    use(18, 0); use(18, 1)
    bam[0x90:0xA0] = b"TEST".ljust(16, b"\xa0")
    S[(18, 1)][0:2] = bytes([0, 255])
    track = 17
    for i, (name, load, data) in enumerate(files):
        blob = bytes([load & 255, load >> 8]) + data
        chunks = [blob[p:p + 254] for p in range(0, len(blob), 254)]
        for s, c in enumerate(chunks):
            use(track, s)
            last = s == len(chunks) - 1
            S[(track, s)][0:2] = bytes([0, len(c) + 1]) if last else bytes([track, s + 1])
            S[(track, s)][2:2 + len(c)] = c
        e = bytearray(32)
        e[2], e[3], e[4] = 0x82, track, 0
        e[5:21] = name.ljust(16, b"\xa0")
        e[30] = len(chunks)
        S[(18, 1)][i * 32:i * 32 + 32] = e
        track -= 1
    t, s, b = stray
    use(t, s)
    S[(t, s)][:] = b
    with open(path, "wb") as f:
        for t in range(1, 36):
            for s in range(disk.SPT[t]):
                f.write(S[(t, s)])


def write_crt(path, banks):
    head = bytearray(b"C64 CARTRIDGE   " + struct.pack(">IHHBB", 0x40, 0x0100, 19, 0, 0) + bytes(6))
    head += b"TEST".ljust(32, b"\0")
    body = b"".join(b"CHIP" + struct.pack(">IHHHH", 16 + len(d), 0, n, 0x8000, len(d)) + d
                    for n, d in banks)
    Path(path).write_bytes(bytes(head) + body)


def run(*args, ok=True):
    r = subprocess.run([sys.executable, str(KIT / 'scripts' / 'media.py'), *map(str, args)],
                       capture_output=True, text=True)
    if ok and r.returncode:
        raise AssertionError(f"media.py {' '.join(map(str, args))}\n{r.stdout}{r.stderr}")
    return r


class Ledger(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.g = self.tmp / 'game'
        self.g.mkdir()
        self.game = {"platform": "c64", "tier": "silver", "created": "2099-01-01"}
        (self.g / 'game.json').write_text(json.dumps(self.game))
        (self.g / 'listing.json').write_text(json.dumps({"records": [{"a": 0x1000, "b": list(ENGINE)}]}))
        self.d64 = self.tmp / 'side one.d64'
        write_d64(self.d64, [(b"BOOT", 0x0801, BOOT), (b"ENGINE", 0x1000, ENGINE),
                             (b"LEVEL01", 0x4000, LEVEL), (b"LEVEL02", 0x4000, LEVEL)], (20, 5, STRAY))

    def items(self):
        return {i["label"]: i for i in json.loads((self.g / 'media.json').read_text())["items"]}

    def test_scan_answer_and_rules(self):
        run('scan', self.g, f'side1={self.d64}')
        led = json.loads((self.g / 'media.json').read_text())
        self.assertEqual(led["images"][0]["name"], "side1")
        self.assertEqual(led["images"][0]["file"], "side one.d64")        # the name, never a path
        it = self.items()
        self.assertEqual(sorted(it), ["BOOT", "ENGINE", "LEVEL01", "track 20, sector 5"])
        self.assertEqual((it["ENGINE"]["answer"], it["ENGINE"]["at"], it["ENGINE"]["matched"]),
                         ("part", "$1000", len(ENGINE)))
        self.assertNotIn("part", it["ENGINE"])                             # a game of one load
        self.assertEqual(it["LEVEL01"]["also"], ["side1: LEVEL02"])
        self.assertEqual((it["LEVEL01"]["load"], it["LEVEL01"]["bytes"]), ("$4000", len(LEVEL)))
        self.assertEqual(it["track 20, sector 5"]["answer"], "open")
        self.assertTrue(any("open item" in p for p in M.problems(str(self.g), self.game)))
        old = dict(self.game, created="2026-01-01")
        self.assertEqual(M.problems(str(self.g), old), [])                # an older game shows them only

        run('answer', self.g, 'LEVEL*', 'data', '--why', 'a level the engine loads at $4000')
        run('answer', self.g, 'BOOT', 'loader')
        self.assertTrue(any("loader with no why" in p for p in M.problems(str(self.g), self.game)))
        run('answer', self.g, 'BOOT', 'loader', '--why', 'the BASIC line that starts the engine')
        run('answer', self.g, 'track *', 'unused', '--why', 'the game loads every file by name')
        self.assertEqual(M.problems(str(self.g), self.game), [])
        self.assertNotEqual(run('answer', self.g, 'NOTHING*', 'data', ok=False).returncode, 0)
        self.assertNotEqual(run('answer', self.g, 'BOOT', 'part', '--part', 'x', ok=False).returncode, 0)

        before = (self.g / 'media.json').read_text()
        run('scan', self.g, f'side1={self.d64}')
        self.assertEqual((self.g / 'media.json').read_text(), before)      # every answer kept

        s = M.summary(str(self.g))
        self.assertEqual((s["files"], s["runs"], s["count"]["part"], s["count"]["open"]), (3, 1, 1, 0))
        import build
        row = build.media_row(str(self.g))
        self.assertIn("Counting each copy once, the disk side holds 3 files and 1 run of sectors", row)
        self.assertIn("1 is in the listings", row)

        led = json.loads(before)
        led["items"][0]["answer"] = "maybe"
        led["images"][0]["file"] = "/home/someone/side one.d64"
        (self.g / 'media.json').write_text(json.dumps(led))
        found = " ".join(M.problems(str(self.g), self.game))
        self.assertIn("not one of", found)
        self.assertIn("keep the file's name only", found)

    def test_silver_needs_a_ledger(self):
        self.assertTrue(M.problems(str(self.g), self.game))
        self.assertEqual(M.problems(str(self.g), dict(self.game, tier="bronze")), [])
        self.assertEqual(M.problems(str(self.g), dict(self.game, platform="zx")), [])   # no reader

    def test_cartridge_and_tape(self):
        crt = self.tmp / 'game.crt'
        write_crt(crt, [(0, ENGINE[:512]), (1, b"\xff" * 512)])
        tap = self.tmp / 'game.t64'                 # a container of tape files, which the C64 has no reader for
        tap.write_bytes(b"C64S tape image file" + bytes(44))
        r = run('scan', self.g, crt, tap)
        it = self.items()
        self.assertEqual(it["bank 0"]["answer"], "part")
        self.assertEqual((it["bank 1"]["answer"], it["bank 1"]["why"]), ("unused", "every byte holds $FF"))
        img = json.loads((self.g / 'media.json').read_text())["images"]
        self.assertEqual([i["name"] for i in img], ["game", "game-2"])
        self.assertIn("unread", img[1])
        self.assertIn("not listed", r.stdout)


if __name__ == '__main__':
    unittest.main()
