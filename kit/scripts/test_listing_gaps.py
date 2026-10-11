#!/usr/bin/env python3
"""A short run of untyped bytes between two code records warns at build time (#229):
usually a missed instruction, and the page's interpreter reads its code from the listing."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def run(*args):
    return subprocess.run([sys.executable, *map(str, args)], check=True, capture_output=True, text=True)


def fixture(p, blocks):
    """A game folder with lda #$01, an untyped byte, and rts; the listing is built."""
    (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
    (p / 'symbols.json').write_text(json.dumps({
        'schema': 1, 'platform': 'c64', 'game': 'fixture',
        'blocks': blocks,
        'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}],
        'comments': []}))
    ram = bytearray(65536)
    ram[0x8000:0x8004] = bytes([0xA9, 0x01, 0xEA, 0x60])   # lda #$01, (nop), rts
    image = p / 'capture.vsf'
    magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
    image.write_bytes(magic + bytes(209 - len(magic)) + ram)
    return run(KIT / 'scripts' / 'listing.py', p, image).stdout


class ListingGaps(unittest.TestCase):
    def test_untyped_byte_between_code_warns(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            out = fixture(p, [{'start': 0x8000, 'end': 0x8001, 'type': 'Code'},
                              {'start': 0x8003, 'end': 0x8003, 'type': 'Code'}])
            self.assertIn('$8002', out)
            self.assertIn('no type between code', out)

    def test_no_gap_no_warning(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            out = fixture(p, [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}])
            self.assertNotIn('no type between code', out)


if __name__ == '__main__':
    unittest.main()
