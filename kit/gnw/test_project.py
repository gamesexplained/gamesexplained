#!/usr/bin/env python3
"""kit/gnw/project.py: a control file read into symbols.json's vocabulary, and written back from
it, with nothing lost; a line it cannot read stops it with the line's number.

    python3 kit/gnw/test_project.py
"""
import json, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import project   # noqa: E402

CTL = """; a remark
c $0000 page 0, the wake-up
b $0030 a run of LAX, jumped into
c $0040
i $0080
c $03C0 the reset
@ $0000 label=wake
@ $03C0 label=reset
@ $1023 label=lives
N $0010 a line comment
C $0011 a side comment
"""


class Project(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name

    def write(self, text):
        p = os.path.join(self.dir, "g.ctl")
        with open(p, "w") as f:
            f.write(text)
        return p

    def test_read(self):
        blocks, syms, comments = project.read_file(self.write(CTL))
        self.assertEqual(blocks, [{"start": 0, "end": 0x2F, "type": "Code"}, {"start": 0x30, "end": 0x3F, "type": "Byte"},
                                  {"start": 0x40, "end": 0x7F, "type": "Code"}, {"start": 0x3C0, "end": 0x73F, "type": "Code"}])
        self.assertEqual([(s["address"], s["name"]) for s in syms], [(0, "wake"), (0x3C0, "reset"), (0x1023, "lives")])
        self.assertIn({"address": 0x11, "type": "side", "text": "a side comment"}, comments)
        self.assertIn({"address": 0x30, "type": "line", "text": "a run of LAX, jumped into"}, comments)

    def test_round_trip(self):
        blocks, syms, comments = project.read_file(self.write(CTL))
        game = os.path.join(self.dir, "game")
        os.makedirs(os.path.join(game, "work"))
        json.dump({"platform": "gnw", "slug": "t", "title": "T"}, open(os.path.join(game, "game.json"), "w"))
        json.dump({"blocks": blocks, "symbols": syms, "comments": comments}, open(os.path.join(game, "symbols.json"), "w"))
        out = project.write(game, None)
        self.assertEqual(project.read_file(out), (blocks, syms, comments))

    def test_errors_name_the_line(self):
        for text in ("c $0000\n@ $0010 wake\n", "x $0000\n", "c $2000\n"):
            with self.assertRaises(SystemExit) as e:
                project.read_file(self.write(text))
            self.assertIn("g.ctl:", str(e.exception))


if __name__ == "__main__":
    unittest.main()
