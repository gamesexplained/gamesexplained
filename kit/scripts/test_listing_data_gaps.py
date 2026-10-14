#!/usr/bin/env python3
"""A short run of untracked bytes between two data records is named at build time: it is
usually the last byte of a script or table, which no label's span reached, and uncounted()
names only stretches of eight bytes or more (Creatures, three scripts' last bytes)."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def build(exclude=()):
    """A game whose table at $9FF0 runs to $A001, past the $A000 edge where a data label's
    span stops, with the next table at $A002: $A000-$A001 are left to no label."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d)
        game = {'platform': 'c64', 'slug': 'fixture'}
        if exclude:
            game['coverage'] = {'exclude': [list(exclude)]}
        (p / 'game.json').write_text(json.dumps(game))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'},
                       {'start': 0x9FF0, 'end': 0xA00F, 'type': 'Byte'}],
            'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'},
                        {'address': 0x9FF0, 'name': 'table_a', 'kind': 'user', 'type': 'UserDefined'},
                        {'address': 0xA002, 'name': 'table_b', 'kind': 'user', 'type': 'UserDefined'}],
            'comments': []}))
        ram = bytearray(65536)
        ram[1] = 0x35
        ram[0x8000:0x8004] = bytes([0xA9, 0x01, 0xEA, 0x60])
        ram[0x9FF0:0xA010] = bytes(range(1, 33))
        image = p / 'capture.vsf'
        magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
        image.write_bytes(magic + bytes(209 - len(magic)) + ram)
        return subprocess.run([sys.executable, KIT / 'scripts' / 'listing.py', p, image],
                              check=True, capture_output=True, text=True).stdout


class DataGaps(unittest.TestCase):
    def test_a_short_hole_between_tables_is_named(self):
        out = build()
        line = next((ln for ln in out.splitlines() if ln.strip().startswith('$A000-$A001')), '')
        self.assertIn('between data records that no label reaches (after table_a)', line, out)

    def test_an_excluded_hole_is_not(self):
        self.assertNotIn('$A000-$A001', build(exclude=('$A000', '$A001', 'not the game\'s')))


if __name__ == '__main__':
    unittest.main()
