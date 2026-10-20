#!/usr/bin/env python3
"""kit/apple2/project.py builds a regenerator2000 project for the Apple II and reads it back.

The project names its machine, so the disassembler comments the Monitor's routines and zero page as
the Apple II's; the Apple II's text, ASCII in symbols.json, travels as regenerator2000's PETSCII
text and comes back as ASCII; and text in the screen's own codes travels as its screencode text and
comes back as Screen. A part with "bank" in its part.json is built from that bank. Made in a
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


def snapshot_file(path, main, aux):
    pages = [bytes(main[p * 256:(p + 1) * 256]) for p in range(256)] + \
            [bytes(aux[p * 256:(p + 1) * 256]) for p in range(256)]
    st = {"state6502": {"s6502": {"PC": 0x2000}, "softSwitches": {"BSRBANK2": True},
                        "memvalid": "1" * 512, "memory": base64.b64encode(b"".join(pages)).decode()}}
    with open(path, "w") as f:
        json.dump({"format": "apple2ts-kit-snapshot", "version": 1, "state": st}, f)


class Project(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = tmp.name
        self.game = os.path.join(self.root, "g")
        os.makedirs(os.path.join(self.game, "work"))
        with open(os.path.join(self.game, "game.json"), "w") as f:
            json.dump({"slug": "demo", "platform": "apple2"}, f)
        with open(os.path.join(self.game, "symbols.json"), "w") as f:
            json.dump({"blocks": [{"start": 0x2000, "end": 0x2001, "type": "Code"},
                                  {"start": 0x2002, "end": 0x2006, "type": "ASCII"},
                                  {"start": 0x2007, "end": 0x2008, "type": "Screen"}],
                       "symbols": [{"address": 0x2000, "name": "start", "type": "Subroutine", "kind": "user"}],
                       "comments": [{"address": 0x2000, "type": "line", "text": "hi"}]}, f)
        main, aux = bytearray(0x10000), bytearray(0x10000)
        main[0x2000:0x2009] = b"\x60\xea" + bytes(c | 0x80 for c in b"HELLO") + b"\x01\x02"
        aux[0x2000:0x2003] = b"AUX"
        self.snap = os.path.join(self.game, "work", "s.json")
        snapshot_file(self.snap, main, aux)

    def image(self, out):
        with open(out) as f:
            body = json.load(f)
        return body, gzip.decompress(base64.b64decode(body["raw_data_base64"]))

    def test_round_trip(self):
        out = project.write(self.game, self.snap)
        body, image = self.image(out)
        self.assertEqual(body["settings"], {"system": project.SYSTEM})
        self.assertEqual(len(image), 0x10000)
        self.assertEqual(image[0x2002:0x2007], bytes(c | 0x80 for c in b"HELLO"), "the image is main memory")
        kinds = {b["start"]: b["type_"] for b in body["blocks"]}
        self.assertEqual((kinds[0x2002], kinds[0x2007]), ("PetsciiText", "ScreencodeText"))
        blocks, syms, comments = project.read_file(out)
        back = {b["start"]: b["type"] for b in blocks}
        self.assertEqual((back[0x2002], back[0x2007], back[0x2000], back[0]), ("ASCII", "Screen", "Code", "Undefined"))
        self.assertEqual((syms[0]["name"], comments[0]["text"]), ("start", "hi"))

    def test_a_bank_part_is_built_from_its_bank(self):
        with open(os.path.join(self.game, "game.json"), "w") as f:
            json.dump({"slug": "demo", "platform": "apple2"}, f)
        os.makedirs(os.path.join(self.game, "parts", "main"))
        with open(os.path.join(self.game, "parts", "main", "part.json"), "w") as f:
            json.dump({"title": "Main memory", "order": 1}, f)
        part = os.path.join(self.game, "parts", "aux")
        os.makedirs(os.path.join(part, "work"))
        with open(os.path.join(part, "part.json"), "w") as f:
            json.dump({"title": "Aux memory", "order": 2, "kind": "bank", "bank": "aux", "seen_by": "main",
                       "window": [["$0000", "$BFFF"]]}, f)
        with open(os.path.join(part, "symbols.json"), "w") as f:
            json.dump({"blocks": [], "symbols": [], "comments": []}, f)
        _, image = self.image(project.write(part, self.snap))
        self.assertEqual(image[0x2000:0x2003], b"AUX")

    def test_another_machine_is_named(self):
        out = project.write(self.game, self.snap)
        with open(out) as f:
            body = json.load(f)
        body["settings"] = {"system": "Commodore 64"}
        with open(out, "w") as f:
            json.dump(body, f)
        import contextlib
        import io
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            project.read_file(out)
        self.assertIn("another machine's", err.getvalue())


if __name__ == "__main__":
    unittest.main()
