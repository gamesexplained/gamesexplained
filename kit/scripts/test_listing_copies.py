#!/usr/bin/env python3
"""listing.py lists data copied after the hand-over, which sits at another address in each image (#146)."""
import json
from pathlib import Path
import random
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def vsf(path, ram):
    magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
    path.write_bytes(magic + bytes(209 - len(magic)) + ram)


def report():
    """listing.py's output for a game whose start-up copies a table to $C000 and a shape under
    the I/O area to $D200, beside a fill pattern and a buffer it did not copy."""
    rnd = random.Random(146)
    table, shape, buffer = rnd.randbytes(256), rnd.randbytes(64), rnd.randbytes(64)
    fill = bytes([0xAA, 0x55]) * 32
    play, entry = bytearray(65536), bytearray(65536)
    for ram in (play, entry):
        ram[1] = 0x35
        ram[0x8000:0x8004] = bytes([0xA9, 0x00, 0xEA, 0x60])
    entry[0x3000:0x3100], entry[0x4000:0x4040], entry[0x2000:0x2040] = table, shape, fill
    play[0xC000:0xC100], play[0xD200:0xD240], play[0xC800:0xC840], play[0xC900:0xC940] = table, shape, fill, buffer
    play[0xC080] ^= 0xFF                  # the game has since changed a byte of the table
    with tempfile.TemporaryDirectory() as d:
        p = Path(d)
        (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}],
            'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}],
            'comments': []}))
        vsf(p / 'play.vsf', play)
        vsf(p / 'entry.vsf', entry)
        return subprocess.run([sys.executable, KIT / 'scripts' / 'listing.py', p, p / 'play.vsf', '--entry', p / 'entry.vsf'],
                              check=True, capture_output=True, text=True).stdout


class Copies(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = report()

    def test_a_copied_table_is_listed_with_both_addresses(self):
        self.assertIn("$C000-$C0FF    256 bytes  copied here after the hand-over, which holds it at $3000-$30FF", self.out)

    def test_a_copy_under_the_io_area_names_its_source(self):
        line = next(ln for ln in self.out.splitlines() if ln.strip().startswith("$D200"))
        self.assertIn("$D200-$D23F is copied there after the hand-over, which holds it at $4000", line)

    def test_a_fill_and_a_runtime_buffer_are_not_copies(self):
        for at in ("$C800", "$C900"):
            self.assertNotIn(at, self.out)


if __name__ == '__main__':
    unittest.main()
