#!/usr/bin/env python3
"""A supported undocumented instruction must not split its operands into code."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def run(*args):
    return subprocess.run([sys.executable, *map(str, args)], check=True, capture_output=True, text=True)


def fixture(p, code=(0xBF, 0x36, 0xDC, 0x60)):
    """A game folder with code at $8000 (LAX absolute,Y and a return), and its listing built."""
    (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture'}))
    (p / 'symbols.json').write_text(json.dumps({
        'schema': 1, 'platform': 'c64', 'game': 'fixture',
        'blocks': [{'start': 0x8000, 'end': 0x8000 + len(code) - 1, 'type': 'Code'}],
        'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}],
        'comments': [{'address': 0x8000, 'type': 'line', 'text': 'LAX then return'}]
    }))
    ram = bytearray(65536)
    ram[1] = 0x35
    ram[0x8000:0x8000 + len(code)] = bytes(code)
    image = p / 'capture.vsf'
    magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
    image.write_bytes(magic + bytes(209 - len(magic)) + ram)
    run(KIT / 'scripts' / 'listing.py', p, image)


def rows(p, end=0x8003):
    return [r for r in json.loads((p / 'listing.json').read_text())['records'] if 0x8000 <= r['a'] <= end]


class ListingAlignment(unittest.TestCase):
    def test_lax_absolute_y_followed_by_return(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p)
            self.assertEqual([(r['a'], r['m'], r['b']) for r in rows(p)], [
                (0x8000, 'lax', [0xBF, 0x36, 0xDC]), (0x8003, 'rts', [0x60])])
            self.assertTrue(rows(p)[0]['o'].endswith(',y'))

    def test_serial_check_decodes_whole(self):
        # LAX absolute, ASR #imm and SAX absolute, as a start-up copies them to $0100 and runs them
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p, [0xAF, 0x0D, 0xDD, 0x4B, 0x08, 0x8F, 0x0C, 0xDD, 0x60])
            self.assertEqual([(r['a'], r['m'], len(r['b'])) for r in rows(p, 0x8008)], [
                (0x8000, 'lax', 3), (0x8003, 'asr', 2), (0x8005, 'sax', 3), (0x8008, 'rts', 1)])

    def test_relabel_keeps_the_instruction(self):
        # --relabel decodes every code record again: a table without LAX raised KeyError here
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p)
            before = rows(p)
            run(KIT / 'scripts' / 'listing.py', p, '--relabel')
            self.assertEqual(rows(p), before)

    def test_opcode_tool_reads_the_game(self):
        # kit/cpu/opcodes.py imports symbols_export only when it runs, so importing it proves nothing
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p)
            self.assertIn('lax $DC36,y', run(KIT / 'cpu' / 'opcodes.py', p).stdout)
            self.assertIn('$8000', run(KIT / 'cpu' / 'opcodes.py', p, '--refs', '$DC36').stdout)


if __name__ == '__main__':
    unittest.main()
