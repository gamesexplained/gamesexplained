#!/usr/bin/env python3
"""kit/c16/project.py builds a regenerator2000 project for the Commodore 16 and Plus/4, reads it
back, and puts the kit's system file where the disassembler reads it.

The project names its machine, regenerator2000's Plus/4, so the session names the KERNAL's
entry points and comments TED's registers; its image is the snapshot's RAM, a C16's 16 KB once at
$0000-$3FFF; the text types are the C64's and travel unchanged. Made in a temporary folder from a
snapshot written as kit/c16/test_snapshot.py writes one: no emulator and no disassembler. Whether
a running session reads the system file is checked by hand (kit/skills/c16/tool-regen2000, "The
system file").
"""
import base64
import contextlib
import filecmp
import gzip
import io
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import project                                                            # noqa: E402
from test_snapshot import p4emu, ram                                      # noqa: E402


class Project(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = tmp.name
        config = project.CONFIG
        self.addCleanup(setattr, project, "CONFIG", config)
        project.CONFIG = os.path.join(self.root, "r2000-config")       # never the clone's own tools/
        self.game = os.path.join(self.root, "g")
        os.makedirs(os.path.join(self.game, "work"))
        with open(os.path.join(self.game, "game.json"), "w") as f:
            json.dump({"slug": "demo", "platform": "c16"}, f)
        with open(os.path.join(self.game, "symbols.json"), "w") as f:
            json.dump({"blocks": [{"start": 0x1010, "end": 0x1012, "type": "Code"},
                                  {"start": 0x1013, "end": 0x1017, "type": "PETSCII"},
                                  {"start": 0x1018, "end": 0x1019, "type": "Screencode"}],
                       "symbols": [{"address": 0x1010, "name": "start", "type": "Subroutine", "kind": "user"},
                                   {"address": 0xFFD2, "name": "KERNAL_BSOUT", "type": "Predefined", "kind": "system"}],
                       "comments": [{"address": 0x1010, "type": "line", "text": "hi"}]}, f)
        self.snap = p4emu(os.path.join(self.game, "work", "s.p4emu"), kb=16)

    def build(self):
        with contextlib.redirect_stdout(io.StringIO()):
            out = project.write(self.game, self.snap)
        with open(out) as f:
            body = json.load(f)
        return out, body, gzip.decompress(base64.b64decode(body["raw_data_base64"]))

    def test_round_trip(self):
        out, body, image = self.build()
        self.assertEqual(body["settings"], {"system": "Commodore Plus4"})
        self.assertEqual(image, ram(16) + bytes(0xC000), "the C16's RAM once, at $0000-$3FFF")
        self.assertEqual(list(body["labels"]), [str(0x1010)], "only your own labels: the session names the KERNAL's")
        blocks, syms, comments = project.read_file(out)
        back = {b["start"]: b["type"] for b in blocks}
        self.assertEqual((back[0x1010], back[0x1013], back[0x1018], back[0]), ("Code", "PETSCII", "Screencode", "Undefined"))
        self.assertEqual((syms[0]["name"], comments[0]["text"]), ("start", "hi"))

    def test_the_system_file_goes_where_the_session_reads_it(self):
        self.build()
        copy = os.path.join(project.CONFIG, "system-commodore_plus4.toml")
        self.assertTrue(filecmp.cmp(copy, project.SYSTEM_FILE, shallow=False))
        with open(copy, "a") as f:
            f.write("# an older copy\n")
        self.assertEqual(project.install_system_file(), copy)
        self.assertTrue(filecmp.cmp(copy, project.SYSTEM_FILE, shallow=False), "an older copy is replaced")

    def test_another_machines_project_is_named(self):
        out, body, _ = self.build()
        body["settings"] = {"system": "Commodore 64"}
        with open(out, "w") as f:
            json.dump(body, f)
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            project.read_file(out)
        self.assertIn("'Commodore 64'", err.getvalue())


if __name__ == "__main__":
    unittest.main()
