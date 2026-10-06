#!/usr/bin/env python3
"""A supported undocumented instruction must not split its operands into code."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))
import listing
import symbols_export
import ledger


def run(*args):
    return subprocess.run([sys.executable, *map(str, args)], check=True, capture_output=True, text=True)


def fixture(p):
    """A game folder with LAX absolute,Y and a return at $8000, and its listing built."""
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
    magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
    image.write_bytes(magic + bytes(209 - len(magic)) + ram)
    run(KIT / 'scripts' / 'listing.py', p, image)


def rows(p):
    return [r for r in json.loads((p / 'listing.json').read_text())['records'] if 0x8000 <= r['a'] <= 0x8003]


class ListingAlignment(unittest.TestCase):
    def test_described_authored_data_counts_as_explained_but_generic_charset_does_not(self):
        game = {
            'platform': 'c64',
            'video': {'charset': '$C000'},
            'coverage': {
                'extra': [['$D000', '$D7FF', 'HUD character bitmaps, glyphs 0–255']],
                'include': [['$D000', '$D7FF', 'RAM beneath I/O read by the VIC-II']],
            },
        }
        result = ledger.compute([], [], [], symbols_export.regions(game))
        self.assertEqual(result['state'][0xD000], 2)
        self.assertEqual(result['state'][0xD7FF], 2)
        self.assertEqual(result['state'][0xC000], 1)

    def test_authored_data_declaration_does_not_explain_code(self):
        game = {'platform': 'c64', 'coverage': {'extra': [['$8000', '$8003', 'program area']]}}
        blocks = [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}]
        result = ledger.compute(blocks, [], [], symbols_export.regions(game))
        self.assertEqual([result['state'][a] for a in range(0x8000, 0x8004)], [1] * 4)

    def test_declared_extra_data_is_not_reported_as_unknown_hidden_ram(self):
        game = {'platform': 'c64', 'coverage': {'extra': [['$D000', '$D7FF', 'second charset']]}}
        ram = bytes([0x55]) * 0x10000
        ledger = {'state': bytearray(0x10000), 'owner': {}}
        lines = listing.uncounted(game, symbols_export.regions(game), ledger, ram)
        hidden = [line for line in lines if '$D' in line]
        self.assertTrue(any('$D800-$DFFF' in line for line in hidden), hidden)
        self.assertFalse(any('$D000-$DFFF' in line for line in hidden), hidden)

    def test_lax_absolute_y_followed_by_return(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p)
            self.assertEqual([(r['a'], r['m'], r['b']) for r in rows(p)], [
                (0x8000, 'lax', [0xBF, 0x36, 0xDC]), (0x8003, 'rts', [0x60])])
            self.assertTrue(rows(p)[0]['o'].endswith(',y'))

    def test_relabel_keeps_the_instruction(self):
        # --relabel decodes every code record again: a table without LAX raised KeyError here
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p)
            before = rows(p)
            run(KIT / 'scripts' / 'listing.py', p, '--relabel')
            self.assertEqual(rows(p), before)

    def test_opcode_tool_reads_the_game(self):
        # kit/c64/opcodes.py imports symbols_export only when it runs, so importing it proves nothing
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            fixture(p)
            self.assertIn('lax $DC36,y', run(KIT / 'c64' / 'opcodes.py', p).stdout)
            self.assertIn('$8000', run(KIT / 'c64' / 'opcodes.py', p, '--refs', '$DC36').stdout)


if __name__ == '__main__':
    unittest.main()
