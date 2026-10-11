#!/usr/bin/env python3
"""The listing regression check (#142): a listing that a drifted decoder no longer
reproduces is caught, and a listing just built passes. A check that cannot fail is
worth nothing, so the drift is planted on purpose."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))
from listing import decode_problems   # noqa: E402


def build(p):
    """A c64 game folder with one LAX instruction, its listing built from a fake snapshot."""
    (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
    (p / 'symbols.json').write_text(json.dumps({
        'schema': 1, 'platform': 'c64', 'game': 'fixture',
        'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}],
        'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}],
        'comments': []}))
    ram = bytearray(65536)
    ram[1] = 0x35                              # so LAX absolute,Y reads a real address
    ram[0x8000:0x8004] = bytes([0xBF, 0x36, 0xDC, 0x60])
    magic = b'VICE Snapshot File'              # kit/c64/snapshot.py refuses a file without it
    (p / 'capture.vsf').write_bytes(magic + bytes(209 - len(magic)) + ram)
    subprocess.run([sys.executable, str(KIT / 'scripts' / 'listing.py'), str(p), str(p / 'capture.vsf')],
                   check=True, capture_output=True)


class ListingRegress(unittest.TestCase):
    def test_a_just_built_listing_passes(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            build(p)
            self.assertEqual(decode_problems(p), [])

    def test_a_drifted_decoder_is_caught(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            build(p)
            L = json.loads((p / 'listing.json').read_text())
            r = next(x for x in L['records'] if x['t'] == 'code')
            r['m'] = 'nop'                     # what a decoder that drifted would have written
            (p / 'listing.json').write_text(json.dumps(L, separators=(',', ':')))
            bad = decode_problems(p)
            self.assertEqual(len(bad), 1)
            self.assertEqual(bad[0][0], 0x8000)


if __name__ == '__main__':
    unittest.main()
