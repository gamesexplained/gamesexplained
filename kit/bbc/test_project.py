#!/usr/bin/env python3
"""kit/bbc/project.py builds a regenerator2000 project for the BBC Micro and reads it back.

The project names its machine, so the disassembler comments the MOS and the chips as the BBC's;
the BBC's text, ASCII in symbols.json, travels as regenerator2000's PETSCII text and comes back
as ASCII; and a BASIC program travels as its screencode text, the C64's screen codes having no
meaning on the BBC, and comes back as BASIC. Made in a temporary folder
from a snapshot written here: no emulator and no disassembler.
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
import project                                                            # noqa: E402


class Project(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.game = os.path.join(tmp.name, "g")
        os.makedirs(os.path.join(self.game, "work"))
        with open(os.path.join(self.game, "game.json"), "w") as f:
            json.dump({"slug": "demo", "platform": "bbc"}, f)
        with open(os.path.join(self.game, "symbols.json"), "w") as f:
            json.dump({"blocks": [{"start": 0x2000, "end": 0x2001, "type": "Code"},
                                  {"start": 0x2002, "end": 0x2009, "type": "ASCII"},
                                  {"start": 0x200A, "end": 0x200F, "type": "BASIC"}],
                       "symbols": [{"address": 0x2000, "name": "start", "type": "Subroutine", "kind": "user"}],
                       "comments": [{"address": 0x2000, "type": "line", "text": "hi"}]}, f)
        ram = bytearray(0x20000)
        ram[0x2000:0x2010] = b"\x60\xeaHELLO\r\x00\x00\x0d\x00\x0a\x05\xe0\x0d"
        typed = {"__typedArray": True, "type": "Uint8Array", "encoding": "deflate",
                 "data": base64.b64encode(zlib.compress(bytes(ram))).decode()}
        self.snap = os.path.join(self.game, "work", "s.json.gz")
        with open(self.snap, "wb") as f:
            f.write(gzip.compress(json.dumps(
                {"format": "jsbeeb-snapshot", "version": 4, "model": "BBC B with 8271 (DFS 1.2)",
                 "state": {"ram": typed, "romsel": 15, "pc": 0x2000}}).encode()))

    def test_round_trip(self):
        out = project.write(self.game, self.snap)
        with open(out) as f:
            body = json.load(f)
        self.assertEqual(body["settings"], {"system": project.SYSTEM})
        image = gzip.decompress(base64.b64decode(body["raw_data_base64"]))
        self.assertEqual(len(image), 0x10000)
        self.assertEqual(image[0x2002:0x2007], b"HELLO", "the image is the snapshot's")
        kinds = {b["start"]: b["type_"] for b in body["blocks"]}
        self.assertEqual((kinds[0x2002], kinds[0x200A]), ("PetsciiText", "ScreencodeText"))
        blocks, syms, comments = project.read_file(out)
        back = {b["start"]: b["type"] for b in blocks}
        self.assertEqual((back[0x2002], back[0x200A], back[0x2000], back[0]), ("ASCII", "BASIC", "Code", "Undefined"))
        self.assertEqual((syms[0]["name"], comments[0]["text"]), ("start", "hi"))

    def test_screencodes_come_back_as_basic(self):
        b = project.from_project({"start": 1, "end": 2, "type": "Screencode Text"}, "test")
        self.assertEqual(b["type"], "BASIC")


if __name__ == "__main__":
    unittest.main()
