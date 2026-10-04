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
        rows = self.parse_text("                ; Entry description.\nstart:\n2000 a901 LDA #1\n2002 60 RTS\n2003 ?? ??\nPHASE::2000 a902 LDA #2\n")
        self.assertEqual([r['b'] for r in rows], [[0xa9, 1], [0x60]])
        game = {'platform': 'c64', 'slug': 'fixture', 'build': 'synthetic'}
        sym = json.loads(convert(rows, game, 'synthetic'))
        self.assertEqual(sym['blocks'], [{'start': 0x2000, 'end': 0x2002, 'type': 'Code'}])
        self.assertEqual(sym['comments'][0]['text'], 'Entry description.')
        self.assertNotIn('records', sym)
        self.assertNotIn('spans', sym)
        branch = self.parse_text('target:\n2000 60 RTS\n')
        self.assertEqual(json.loads(convert(branch, game, 'synthetic'))['symbols'][0]['type'], 'Branch')

    def test_offcut_label_keeps_its_actual_address(self):
        rows = self.parse_text('entry:\noperand:  ; offcut at 2001\n2000 a901 LDA #1\n2002 60 RTS\n')
        game = {'platform': 'c64', 'slug': 'fixture', 'build': 'synthetic'}
        sym = json.loads(convert(rows, game, 'synthetic'))
        names = {x['name']:x['address'] for x in sym['symbols']}
        self.assertEqual(names['entry'], 0x2000)
        self.assertEqual(names['operand'], 0x2001)
        self.assertNotIn('operand', rows[0]['names'])

    def test_post_row_description_belongs_to_previous_row(self):
        rows = self.parse_text('table:\n2000 01 byte 1\n                ; First table entry.\n2001 02 byte 2\n')
        self.assertEqual(rows[0]['c'], 'First table entry.')
        self.assertEqual(rows[1]['c'], '')

    def test_header_description_belongs_to_following_row(self):
        rows = self.parse_text('2000 01 byte 1\n                ;************\n                ; Second entry.\n                ;************\nnext:\n2001 02 byte 2\n')
        self.assertEqual(rows[0]['c'], '')
        self.assertEqual(rows[1]['c'], 'Second entry.')

    def test_overlay_is_explicit(self):
        rows = self.parse_text('2000 01 byte 1\nPHASE::2000 02 byte 2\n', 'PHASE')
        self.assertEqual(rows[0]['b'], [2])

    def test_call_target_starts_a_routine(self):
        rows = self.parse_text('2000 201020 JSR sub\nsub:\n2010 60 RTS\n')
        game = {'platform': 'c64', 'slug': 'fixture', 'build': 'synthetic'}
        sym = json.loads(convert(rows, game, 'synthetic'))
        self.assertEqual(sym['symbols'][0]['type'], 'Subroutine')

    def test_overlap_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Overlapping'):
            self.parse_text('2000 a901 LDA #1\n2001 01 byte 1\n')

    def test_actual_custom_exporter_fixture(self):
        # Produced by ExportGhidraListing.java in Ghidra 12.1.4, not hand formatted.
        rows = parse(Path(__file__).with_name('fixtures') / 'ghidra-custom-export.asm')
        game = {'platform': 'c64', 'slug': 'fixture', 'build': 'synthetic'}
        sym = json.loads(convert(rows, game, 'synthetic'))
        self.assertEqual(sym['blocks'], [
            {'start': 0x1000, 'end': 0x100c, 'type': 'Code'},
            {'start': 0x100d, 'end': 0x100d, 'type': 'Undefined'},
            {'start': 0x100e, 'end': 0x100e, 'type': 'Byte'},
            {'start': 0x100f, 'end': 0x1010, 'type': 'Word'},
        ])
        names = {s['name']: s for s in sym['symbols']}
        self.assertEqual(names['load_operand']['address'], 0x1001)
        self.assertEqual(names['SUB_1009']['type'], 'Subroutine')
        comments = {(c['address'], c['type']): c['text'] for c in sym['comments']}
        self.assertEqual(comments, {
            (0x1000, 'line'): 'Load the synthetic counter.',
            (0x1000, 'side'): 'Synthetic side comment.',
            (0x100e, 'line'): 'One-byte synthetic counter.',
            (0x100f, 'line'): 'A two-byte synthetic value.',
        })
        self.assertEqual(bytes(b for r in rows for b in r['b']),
                         bytes.fromhex('ad0e10200910d0f860ee0e106000070123'))

    def test_undefined_bytes_do_not_extend_typed_data_coverage(self):
        import ledger
        rows = self.parse_text('counter:\n2000 01 byte 1\n                ; One named byte.\n' +
                               ''.join(f'{a:04x} 00 ?? undefined\n' for a in range(0x2001, 0x2101)))
        sym = json.loads(convert(rows, {'platform': 'c64', 'slug': 'fixture',
                                       'build': 'synthetic'}, 'synthetic'))
        measured = ledger.compute(*(sym[k] for k in ('blocks', 'symbols', 'comments', 'regions')))
        self.assertEqual(sum(x == 2 for x in measured['state'][0x2000:0x2101]), 1)

    def test_uninitialized_annotations_are_reported(self):
        from contextlib import redirect_stderr
        from io import StringIO
        warning = StringIO()
        with redirect_stderr(warning):
            rows = self.parse_text('                ; Zero-page variable.\nvariable:\n'
                                   '0002 ?? ?? uninitialized\n1000 60 RTS\n')
        self.assertEqual(len(rows), 1)
        self.assertIn('omitted 1 labels and 1 comments', warning.getvalue())

    def test_cli_writes_only_symbols(self):
        import subprocess, sys
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            (base / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture', 'build': 'synthetic'}))
            export = base / 'export.txt'
            export.write_text('start:\n2000 60 RTS\n')
            listing = base / 'listing.json'
            listing.write_text('existing listing')
            script = Path(__file__).with_name('import_ghidra.py')
            subprocess.run([sys.executable, str(script), str(base), str(export)], check=True, capture_output=True)
            self.assertEqual(listing.read_text(), 'existing listing')
            self.assertTrue((base / 'symbols.json').exists())


if __name__ == '__main__':
    unittest.main()
