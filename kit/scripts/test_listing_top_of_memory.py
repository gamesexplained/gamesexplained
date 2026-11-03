#!/usr/bin/env python3
"""An instruction at the top of memory whose operand is at $0000 is listed, not a crash.

A Spectrum game that puts its IM 2 vector at $FFFF leaves a JR there, whose offset is the
ROM's first byte. The snapshot zeroes the ROM, so the listing keeps the byte it has and
says what the instruction is."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
LISTING = KIT / 'scripts' / 'listing.py'


class TopOfMemory(unittest.TestCase):
    def test_jr_at_ffff(self):
        with tempfile.TemporaryDirectory() as t:
            p = Path(t)
            (p / 'work').mkdir()
            (p / 'game.json').write_text(json.dumps({'platform': 'spectrum', 'slug': 'fixture'}))
            (p / 'symbols.json').write_text(json.dumps({
                'schema': 1, 'platform': 'spectrum', 'game': 'fixture',
                'blocks': [{'start': 0xFFF4, 'end': 0xFFF6, 'type': 'Code'},
                           {'start': 0xFFFF, 'end': 0xFFFF, 'type': 'Code'}],
                'symbols': [{'address': 0xFFF4, 'name': 'jump', 'kind': 'user', 'type': 'Subroutine'},
                            {'address': 0xFFFF, 'name': 'vector', 'kind': 'user', 'type': 'Subroutine'}],
                'comments': []}))
            ram = bytearray(49152)
            ram[0xFFF4 - 0x4000:0xFFF7 - 0x4000] = bytes([0xC3, 0x00, 0x80])
            ram[0xFFFF - 0x4000] = 0x18
            (p / 'work' / 'entry.sna').write_bytes(bytes(27) + ram)
            subprocess.run([sys.executable, LISTING, p, p / 'work' / 'entry.sna'],
                           check=True, capture_output=True, text=True)
            recs = {r['a']: r for r in json.loads((p / 'listing.json').read_text())['records']}
            self.assertEqual(recs[0xFFF4]['t'], 'code')
            last = recs[0xFFFF]
            self.assertEqual(last['b'], [0x18])
            self.assertIn('$0000', last['note'])
            self.assertTrue(last['note'].startswith('jr'))


if __name__ == '__main__':
    unittest.main()
