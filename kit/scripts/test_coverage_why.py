#!/usr/bin/env python3
"""coverage.py's work queue says why each run is still bare (#322): no comment on the symbol
that owns it or the label it starts at, a comment that repeats another's, past its symbol's
reach, stopped where its block ends or at a fixed edge of the memory map, or no symbol at all.
A run ends where its reason changes, so each row is one fix."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]


def code(lo, hi):
    return {'start': lo, 'end': hi, 'type': 'Code'}


def sym(addr, name, typ='Subroutine', kind='user'):
    return {'address': addr, 'name': name, 'type': typ, 'kind': kind}


def note(addr, text):
    return {'address': addr, 'type': 'line', 'text': text}


BLOCKS = [code(0x8000, 0x800F), code(0x8100, 0x810F), code(0x8200, 0x820F),
          code(0x8300, 0x87FF),
          {'start': 0x9000, 'end': 0x900F, 'type': 'Byte'}, code(0x9010, 0x901F),
          code(0x9100, 0x910F), code(0x9200, 0x920F), code(0x9300, 0x931F)]
SYMBOLS = [sym(0x8000, 'plain'),
           sym(0x8100, 'first'), sym(0x8200, 'second'),
           sym(0x8300, 'long'),
           sym(0x8800, 'tbl', 'AbsoluteAddress', 'auto'),
           sym(0x3FF0, 'edge_tbl', 'Field', 'auto'),
           sym(0x9000, 'blk', 'Field', 'auto'),
           sym(0x9100, 'b_9100', 'Branch', 'auto'),
           sym(0x9300, 'one'), sym(0x9310, 'two')]
COMMENTS = [note(0x8100, 'Same words.'), note(0x8200, 'same  words.'),
            note(0x8300, 'A long routine.'), note(0x8800, 'A table.'),
            note(0x3FF0, 'A table across $4000.'), note(0x9000, 'A short table.')]
EXTRA = [['$8800', '$887F', 'a table past its reach'], ['$3FF0', '$400F', 'a table across an edge']]


def queue(*extra_args):
    """The work queue's rows for the fixture, as {address: (bytes, kind, reason)}."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d)
        (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture',
                                                 'coverage': {'extra': EXTRA}}))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': BLOCKS, 'symbols': SYMBOLS, 'comments': COMMENTS}))
        out = subprocess.run([sys.executable, str(KIT / 'scripts' / 'coverage.py'), str(p),
                              '--top', '50', *extra_args],
                             check=True, capture_output=True, text=True).stdout
    rows = out.split('WHY IT IS BARE\n', 1)[1].splitlines()
    return {int(r.split()[0].lstrip('$'), 16): (int(r.split()[1]), r.split()[2], r.split(None, 3)[3])
            for r in rows if r.strip()}


class WorkQueueReasons(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = queue()

    def test_symbol_without_a_comment(self):
        self.assertEqual(self.rows[0x8000], (16, 'code', 'no comment on plain'))

    def test_repeated_comment(self):
        self.assertEqual(self.rows[0x8200], (16, 'code', "second's comment repeats $8100's"))

    def test_past_a_routines_reach(self):
        self.assertEqual(self.rows[0x8700], (256, 'code', "past long's 1024-byte reach"))

    def test_past_a_data_symbols_reach(self):
        self.assertEqual(self.rows[0x8840], (64, 'data', "past tbl's 64-byte reach"))

    def test_stopped_at_a_memory_map_edge(self):
        self.assertEqual(self.rows[0x4000], (16, 'data', 'edge_tbl stops at the memory-map edge $4000'))

    def test_stopped_where_its_block_ends(self):
        self.assertEqual(self.rows[0x9010], (16, 'code', 'blk stops where its block ends'))

    def test_label_at_the_start_without_a_comment(self):
        self.assertEqual(self.rows[0x9100], (16, 'code', 'no comment on b_9100'))

    def test_no_symbol(self):
        self.assertEqual(self.rows[0x9200], (16, 'code', 'no symbol owns it'))

    def test_a_row_for_each_symbol(self):
        self.assertEqual(self.rows[0x9300], (16, 'code', 'no comment on one'))
        self.assertEqual(self.rows[0x9310], (16, 'code', 'no comment on two'))

    def test_range_starting_inside_a_run(self):
        self.assertEqual(queue('--range', '$8780', '$87FF'),
                         {0x8780: (128, 'code', "past long's 1024-byte reach")})


if __name__ == '__main__':
    unittest.main()
