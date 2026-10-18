#!/usr/bin/env python3
"""kit/nes/project.py builds a regenerator2000 project for the NES and reads it back.

The project names its machine, so the disassembler names the PPU's and the APU's registers as
the NES's; text in ASCII travels as regenerator2000's PETSCII text and comes back as ASCII; a
block typed screencode, the C64's character order, is refused on the way out. Made in a
temporary folder from a snapshot written here: no emulator and no disassembler.
"""
import base64
import gzip
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import project                                                            # noqa: E402
import snapshot                                                           # noqa: E402


class Project(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.game = os.path.join(tmp.name, "g")
        os.makedirs(os.path.join(self.game, "work"))
        with open(os.path.join(self.game, "game.json"), "w") as f:
            json.dump({"slug": "demo", "platform": "nes"}, f)
        with open(os.path.join(self.game, "symbols.json"), "w") as f:
            json.dump({"blocks": [{"start": 0xC000, "end": 0xC001, "type": "Code"},
                                  {"start": 0xC002, "end": 0xC006, "type": "ASCII"}],
                       "symbols": [{"address": 0xC000, "name": "reset", "type": "Subroutine", "kind": "user"}],
                       "comments": [{"address": 0xC000, "type": "line", "text": "hi"}]}, f)
        mem = [0] * 0x10000
        mem[0xC000:0xC007] = list(b"\x78\xd8HELLO")
        mem[0x0010] = 0x42
        self.snap = os.path.join(self.game, "work", "s.json.gz")
        with open(self.snap, "wb") as f:
            f.write(gzip.compress(json.dumps(
                {"format": snapshot.FORMAT, "kit": {}, "state": {"cpu": {"mem": mem, "REG_PC": 0xBFFF}}}).encode()))

    def test_round_trip(self):
        out = project.write(self.game, self.snap)
        with open(out) as f:
            body = json.load(f)
        self.assertEqual(body["settings"], {"system": "NES"})
        image = gzip.decompress(base64.b64decode(body["raw_data_base64"]))
        self.assertEqual(len(image), 0x10000)
        self.assertEqual(image[0xC002:0xC007], b"HELLO", "the image is the snapshot's")
        self.assertEqual((image[0x0010], image[0x0810]), (0x42, 0), "RAM is in the image, its mirrors blank")
        kinds = {b["start"]: b["type_"] for b in body["blocks"]}
        self.assertEqual(kinds[0xC002], "PetsciiText")
        blocks, syms, comments = project.read_file(out)
        back = {b["start"]: b["type"] for b in blocks}
        self.assertEqual((back[0xC002], back[0xC000]), ("ASCII", "Code"))
        self.assertEqual((syms[0]["name"], comments[0]["text"]), ("reset", "hi"))

    def test_screencode_is_refused(self):
        with self.assertRaises(SystemExit) as e:
            project.from_project({"start": 0xC000, "end": 0xC003, "type": "Screencode Text"}, "test")
        self.assertIn("screencode", str(e.exception))


if __name__ == "__main__":
    unittest.main()
