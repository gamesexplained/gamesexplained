#!/usr/bin/env python3
"""check_binaries.py refuses the BBC Micro's, the Apple II's, the Commodore 16's and the NES's disks, tapes and
snapshots, whatever they are called.

A jsbeeb snapshot is gzipped JSON whose name the kit chooses (`.json.gz`), so it is found by
what it holds, not by its extension; the BBC's disc images by extension and by their sizes;
other emulators' states by their magic. A gzip file that is not a snapshot passes. The Apple II's
snapshots are JSON (the kit's and Apple2TS's) or YAML (AppleWin's), found by what they hold; its
disks by extension, size and magic. A JSON file that is not a snapshot passes. The C16's snapshot
is plus4emu's own file, found by its magic under any name; its tapes and cartridges by their
headers too. The NES's cartridges are found by extension and header, and the kit's NES
snapshot, gzipped JSON like jsbeeb's, by what it holds.

A page that spells out most of its game's code, as base64, hex or a list of numbers, carries the
program and is refused; one that carries the data with the code zeroed, or a share of the code
such as a sound driver, passes, and so do the listing itself and work/.
"""
import base64
import gzip
import json
import os
import random
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_binaries                                                     # noqa: E402


class Files(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name

    def why(self, name, blob):
        p = os.path.join(self.dir, name)
        with open(p, "wb") as f:
            f.write(blob)
        return check_binaries.check(p)


class BBC(Files):
    def test_snapshot_by_content(self):
        body = json.dumps({"format": "jsbeeb-snapshot", "version": 4, "state": {}}).encode()
        self.assertEqual(self.why("play.json.gz", gzip.compress(body)), "jsbeeb snapshot")
        self.assertEqual(self.why("renamed.dat", gzip.compress(body)), "jsbeeb snapshot")
        self.assertEqual(self.why("plain.txt", body), "jsbeeb snapshot")

    def test_disc_images(self):
        self.assertIn(".ssd", self.why("game.ssd", b"\0" * 10))
        self.assertIn(".hfe", self.why("game.hfe", b"\0" * 10))
        self.assertIn("size", self.why("game.img", b"\0" * 204800))
        self.assertEqual(self.why("x.dat", b"HXCPICFE" + bytes(8)), "HFE disc image")

    def test_other_emulators(self):
        self.assertEqual(self.why("state", b"BEMSNAP3" + bytes(8)), "B-em or beebjit snapshot")
        self.assertEqual(self.why("state2", b"UEF File!\0" + bytes(8)), "UEF tape or BeebEm snapshot")

    def test_other_gzip_passes(self):
        self.assertIsNone(self.why("notes.json.gz", gzip.compress(json.dumps({"format": "other"}).encode())))
        self.assertIsNone(self.why("broken.gz", b"\x1f\x8b" + bytes(10)))


class Apple2(Files):
    def test_snapshots_by_content(self):
        kit = json.dumps({"format": "apple2ts-kit-snapshot", "version": 1, "state": {}}).encode()
        own = json.dumps({"emulator": {"name": "Apple2TS"}, "state6502": {"s6502": {}}}).encode()
        self.assertEqual(self.why("entry.json", kit), "Apple II snapshot")
        self.assertEqual(self.why("renamed.txt", kit), "Apple II snapshot")
        self.assertEqual(self.why("save.json", own), "Apple II snapshot")
        self.assertEqual(self.why("state.yaml", b"%YAML 1.2\n---\nTag: AppleWin Save State\n"), "Apple II snapshot")

    def test_disk_images(self):
        for ext in (".woz", ".nib", ".do", ".po", ".2mg", ".a2r", ".a2ts"):
            self.assertIn(ext, self.why("game" + ext, b"\0" * 10))
        self.assertIn("size", self.why("game.img", b"\0" * 143360))
        self.assertIn("size", self.why("game.dat", b"\0" * 232960))
        self.assertEqual(self.why("x.dat", b"WOZ2\xff\n\r\n" + bytes(8)), "WOZ disk image")
        self.assertEqual(self.why("y.dat", b"2IMG" + bytes(8)), "2MG disk image")

    def test_other_json_passes(self):
        self.assertIsNone(self.why("game.json", json.dumps({"platform": "apple2", "slug": "x"}).encode()))

    def test_a_skill_describing_the_format_passes(self):
        # front matter opens with "---", as YAML can, but only AppleWin's "%YAML" is a snapshot
        self.assertIsNone(self.why("SKILL.md", b'---\nname: x\n---\nA save holds "state6502": {...}\n'))


class C16(Files):
    def test_snapshots_by_content(self):
        snap = bytes.fromhex("5D12E4F4C9DAB6420133DE07D234F222") + bytes(32)
        self.assertEqual(self.why("entry.p4emu", snap), "extension .p4emu")
        self.assertEqual(self.why("renamed.dat", snap), "plus4emu snapshot")

    def test_tapes_carts_and_archives(self):
        self.assertEqual(self.why("side-a.dat", b"C16-TAPE-RAW\x01\x02" + bytes(8)), "C16 tape image")
        self.assertEqual(self.why("side-b.dat", b"C64-TAPE-RAW\x01" + bytes(8)), "tape image")
        self.assertEqual(self.why("cart.dat", b"PLUS4 CARTRIDGE " + bytes(8)), "Plus/4 cartridge image")
        for ext in (".yss", ".lnx", ".z64", ".wav"):
            self.assertIn(ext, self.why("game" + ext, b"\0" * 10))

    def test_other_json_passes(self):
        self.assertIsNone(self.why("game.json", json.dumps({"platform": "c16", "slug": "x"}).encode()))


class NES(Files):
    def test_snapshot_by_content(self):
        body = json.dumps({"format": "kit-nes-snapshot", "kit": {}, "state": {}}).encode()
        self.assertEqual(self.why("play.json.gz", gzip.compress(body)), "NES snapshot")
        self.assertEqual(self.why("renamed.dat", gzip.compress(body)), "NES snapshot")
        self.assertEqual(self.why("plain.txt", body), "NES snapshot")

    def test_cartridge(self):
        self.assertIn(".nes", self.why("game.nes", b"\0" * 10))
        self.assertEqual(self.why("game.dat", b"NES\x1a" + bytes(12)), "NES ROM")


class Program(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.game = tmp.name
        rng = random.Random(7)
        self.code = bytes(rng.randrange(256) for _ in range(3000))
        self.data = bytes(rng.randrange(256) for _ in range(1000))
        # records long enough that the listing would be refused if it were read like a page
        records = [{"a": 0xC000 + i, "t": "code", "b": list(self.code[i:i + 100])} for i in range(0, 3000, 100)]
        records.append({"a": 0xCBB8, "t": "byte", "b": list(self.data)})
        self.write("listing.json", json.dumps({"records": records}))

    def write(self, name, text):
        p = os.path.join(self.game, name)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            f.write(text)

    def flagged(self):
        return [os.path.relpath(p, self.game) for p, held, total in check_binaries.programs(self.game)]

    def test_the_whole_image_is_refused_however_it_is_spelt(self):
        image = self.code + self.data
        self.write("levels.html", '<script>{"game_rom":"%s"}</script>' % base64.b64encode(image).decode())
        self.write("reference/rom.js", 'const ROM = "%s";' % image.hex())
        self.write("play.html", "<script>const rom = [%s];</script>" % ", ".join(map(str, image)))
        self.assertEqual(sorted(self.flagged()), ["levels.html", "play.html", os.path.join("reference", "rom.js")])

    def test_the_data_with_the_code_zeroed_passes(self):
        image = bytes(len(self.code)) + self.data
        self.write("levels.html", '<script>{"game_rom":"%s"}</script>' % base64.b64encode(image).decode())
        self.assertEqual(self.flagged(), [])

    def test_a_share_of_the_code_passes(self):
        driver = self.code[:1500] + bytes(1500)
        self.write("index.html", '<script>const tune = "%s";</script>' % base64.b64encode(driver).decode())
        self.assertEqual(self.flagged(), [])

    def test_the_listing_and_work_pass(self):
        self.write("work/image.json", json.dumps({"rom": base64.b64encode(self.code).decode()}))
        self.assertEqual(self.flagged(), [])


if __name__ == "__main__":
    unittest.main()
