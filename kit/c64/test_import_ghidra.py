#!/usr/bin/env python3
"""Synthetic importer checks: occupants, gaps, labels and banked references."""
import json
from pathlib import Path
import tempfile
import unittest

from import_ghidra import parse, convert


class ImportTests(unittest.TestCase):
    def parse_text(self, text, space=''):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'export.txt'
            path.write_text(text)
            return parse(path, space)

    def test_selected_occupant_and_unknown_gaps(self):
        rows = self.parse_text('''                ; A real entry description.
game::start:
alias:
2000 a901 LDA #0x1
2002 60 RTS
2003 ?? ??
                ; The overlay has a different occupant.
other::entry:
PHASE::2000 a902 LDA #0x2
KERNAL_ROM::e000 ea NOP
''')
        self.assertEqual([r['b'] for r in rows], [[0xa9, 1], [0x60]])
        self.assertEqual(rows[0]['names'], ['game_start', 'alias'])
        self.assertEqual(rows[0]['c'], 'A real entry description.')
        game = {'platform': 'c64', 'slug': 'fixture', 'title': 'Fixture', 'build': 'synthetic'}
        sym, listing = convert(rows, game, 'synthetic')
        records = listing['records']
        self.assertEqual(records[0], {'a': 0, 't': 'gap', 'n': 0x2000})
        self.assertEqual(records[-1], {'a': 0x2003, 't': 'gap', 'n': 0xdffd})
        self.assertIn('alias', records[1]['s'])
        self.assertEqual(json.loads(sym)['comments'][0]['address'], 0x2000)

    def test_overlay_is_explicit(self):
        rows = self.parse_text('2000 01 byte 1\nPHASE::2000 02 byte 2\n', 'PHASE')
        self.assertEqual(rows[0]['b'], [2])

    def test_uncommented_call_target_still_starts_a_routine(self):
        rows = self.parse_text('2000 201020 JSR sub\nsub:\n2010 60 RTS\n')
        game = {'platform': 'c64', 'slug': 'fixture', 'title': 'Fixture', 'build': 'synthetic'}
        encoded, listing = convert(rows, game, 'synthetic')
        self.assertEqual(json.loads(encoded)['symbols'][0]['type'], 'Subroutine')
        self.assertEqual(listing['index'][0]['k'], 'routine')

    def test_io_and_rom_are_not_links_to_underlying_ram(self):
        rows = self.parse_text('2000 ad20d0 LDA VIC_BORDER\n2003 ad02df LDA buffer\n2006 20d2ff JSR C64::KERNAL::CHROUT\n')
        game = {'platform': 'c64', 'slug': 'fixture', 'title': 'Fixture', 'build': 'synthetic',
                'io': [['$2003', '$2005', 'ram', 'I/O banked out here']]}
        _, listing = convert(rows, game, 'synthetic')
        code = [r for r in listing['records'] if r['t'] == 'code']
        self.assertNotIn('oa', code[0])
        self.assertEqual(code[1]['oa'], 0xdf02)
        self.assertNotIn('oa', code[2])

    def test_overlap_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Overlapping'):
            self.parse_text('2000 a901 LDA #1\n2001 01 byte 1\n')

    def test_array_chunks_preserve_all_bytes(self):
        raw = bytes(range(40))
        rows = self.parse_text('2000 '+raw.hex()+' struct[40]\n')
        game = {'platform': 'c64', 'slug': 'fixture', 'title': 'Fixture', 'build': 'synthetic'}
        _, listing = convert(rows, game, 'synthetic')
        out = bytes(b for r in listing['records'] for b in r.get('b', []))
        self.assertEqual(out, raw)
        self.assertEqual([len(r['b']) for r in listing['records'] if 'b' in r], [16,16,8])


if __name__ == '__main__':
    unittest.main()
