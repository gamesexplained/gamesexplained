#!/usr/bin/env python3
"""listing.json names the snapshot it was built from, and a build from another says so (#214)."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
LISTING = KIT / 'scripts' / 'listing.py'


def run(*args):
    return subprocess.run([sys.executable, LISTING, *map(str, args)], check=True, capture_output=True, text=True).stdout


def snapshot(path, score):
    """A play snapshot: the same code at $8000, and a score the game changes as it runs."""
    ram = bytearray(65536)
    ram[1] = 0x35
    ram[0x8000:0x8004] = bytes([0xA9, 0x00, 0xEA, 0x60])
    ram[0xC000] = score
    magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
    path.write_bytes(magic + bytes(209 - len(magic)) + ram)
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Snapshot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = p = Path(self.tmp.name)
        (p / 'work').mkdir()
        (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}, {'start': 0xC000, 'end': 0xC000, 'type': 'Byte'}],
            'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'},
                        {'address': 0xC000, 'name': 'score', 'kind': 'user', 'type': 'Byte'}],
            'comments': []}))
        self.first = snapshot(p / 'work' / 'play.vsf', 1)
        self.second = snapshot(p / 'work' / 'later.vsf', 2)

    def tearDown(self):
        self.tmp.cleanup()

    def listing(self):
        return json.loads((self.p / 'listing.json').read_text())

    def test_the_listing_names_its_snapshot(self):
        run(self.p, self.p / 'work' / 'play.vsf')
        self.assertEqual(self.listing()['snapshot'], {'file': 'work/play.vsf', 'sha256': self.first})

    def test_a_build_from_another_snapshot_names_the_old_one(self):
        run(self.p, self.p / 'work' / 'play.vsf')
        self.assertNotIn('note:', run(self.p, self.p / 'work' / 'play.vsf'))
        out = run(self.p, self.p / 'work' / 'later.vsf')
        self.assertIn(f"built from work/play.vsf ({self.first[:12]}), and this one from work/later.vsf", out)
        self.assertEqual(self.listing()['snapshot']['sha256'], self.second)

    def test_rebuild_and_relabel_keep_it(self):
        run(self.p, self.p / 'work' / 'play.vsf')
        self.assertIn('OK - the listing rebuilds', run(self.p, '--rebuild'))
        run(self.p, '--relabel')
        self.assertEqual(self.listing()['snapshot']['file'], 'work/play.vsf')

    def test_explicit_entry_can_be_the_listing_snapshot(self):
        capture = self.p / 'work' / 'play.vsf'
        run(self.p, capture)
        expected = self.listing()
        run(self.p, capture, '--entry', capture)
        self.assertEqual(self.listing(), expected)

    def test_missing_explicit_entry_is_refused(self):
        with self.assertRaises(subprocess.CalledProcessError) as raised:
            run(self.p, self.p / 'work' / 'play.vsf', '--entry', self.p / 'work' / 'missing.vsf')
        self.assertIn('no hand-over snapshot', raised.exception.stderr)
        self.assertFalse((self.p / 'listing.json').exists())


if __name__ == '__main__':
    unittest.main()
