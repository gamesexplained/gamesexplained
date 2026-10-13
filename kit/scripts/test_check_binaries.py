#!/usr/bin/env python3
"""check_binaries.py refuses the BBC Micro's discs, tapes and snapshots, whatever they are called.

A jsbeeb snapshot is gzipped JSON whose name the kit chooses (`.json.gz`), so it is found by
what it holds, not by its extension; the BBC's disc images by extension and by their sizes;
other emulators' states by their magic. A gzip file that is not a snapshot passes.
"""
import gzip
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_binaries                                                     # noqa: E402


class BBC(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name

    def why(self, name, blob):
        p = os.path.join(self.dir, name)
        with open(p, "wb") as f:
            f.write(blob)
        return check_binaries.check(p)

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


if __name__ == "__main__":
    unittest.main()
