#!/usr/bin/env python3
"""A supported undocumented instruction must not split its operands into code."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class ListingAlignment(unittest.TestCase):
    def test_lax_absolute_y_followed_by_return(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
            (p / 'symbols.json').write_text(json.dumps({
                'schema': 1, 'platform': 'c64', 'game': 'fixture',
                'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}],
                'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}],
                'comments': [{'address': 0x8000, 'type': 'line', 'text': 'LAX then return'}]
            }))
            ram = bytearray(65536)
            ram[1] = 0x35
            ram[0x8000:0x8004] = bytes([0xBF, 0x36, 0xDC, 0x60])
            image = p / 'capture.vsf'
            image.write_bytes(bytes(209) + ram)
            subprocess.run([sys.executable, str(Path(__file__).with_name('listing.py')), str(p), str(image)], check=True, capture_output=True)
            rows = [r for r in json.loads((p / 'listing.json').read_text())['records'] if 0x8000 <= r['a'] <= 0x8003]
            self.assertEqual([(r['a'], r['m'], r['b']) for r in rows], [
                (0x8000, 'lax', [0xBF, 0x36, 0xDC]), (0x8003, 'rts', [0x60])])
            self.assertTrue(rows[0]['o'].endswith(',y'))


if __name__ == '__main__':
    unittest.main()
