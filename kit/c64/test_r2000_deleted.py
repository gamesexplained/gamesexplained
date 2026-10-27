#!/usr/bin/env python3
"""A disassembler started on a project rebuilt from symbols.json deletes again the automatic
symbols that were deleted before the last export, at the addresses the folder owns, and says
which deletions did not hold (#578)."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent / 'scripts')]
spec = importlib.util.spec_from_file_location('c64_tools', HERE / 'tools.py')
tools = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tools)
import parts  # noqa: E402  (the module deleted_again reads game.json through)


class Session:
    """The disassembler's symbols, as r2000_get_symbols lists them; clearing a name deletes the
    symbol unless the session is told it will not."""
    def __init__(self, symbols, clears=True):
        self.symbols, self.clears, self.calls = symbols, clears, []

    def module(self):
        m = types.ModuleType('r2000')
        m.make_client = lambda gdir=None: 'rpc'
        m.call = self.call
        return m

    def call(self, rpc, name, arguments):
        self.calls.append((name, arguments))
        if name == 'r2000_get_symbols':
            return json.dumps(self.symbols)
        if name == 'r2000_set_label_name' and arguments['name'] == '' and self.clears:
            self.symbols = [s for s in self.symbols if s['address'] != arguments['address']]
        return '{}'


def game(d, symbols):
    with open(os.path.join(d, 'game.json'), 'w') as f:
        json.dump({'platform': 'c64', 'slug': 'fixture'}, f)
    if symbols is not None:
        with open(os.path.join(d, 'symbols.json'), 'w') as f:
            json.dump({'schema': 1, 'blocks': [], 'comments': [], 'symbols': symbols}, f)


EXPORTED = [{'address': 0x1000, 'name': 'main', 'type': 'Subroutine', 'kind': 'user'},
            {'address': 0x1010, 'name': 's_1010', 'type': 'Subroutine', 'kind': 'auto'}]
LIVE = [{'address': 0x1000, 'name': 'main', 'kind': 'User'},
        {'address': 0x1010, 'name': 'r_1010', 'kind': 'Auto'},
        {'address': 0xDA7C, 'name': 'f_DA7C', 'kind': 'Auto'}]


class DeletedAgain(unittest.TestCase):
    def run_on(self, session, symbols=EXPORTED, away=None):
        keep_mod, keep_sleep, keep_load = sys.modules.get('r2000'), tools.time.sleep, parts.load_game
        sys.modules['r2000'] = session.module()
        tools.time.sleep = lambda s: None
        if away is not None:
            parts.load_game = lambda gdir: {'elsewhere': away}
        try:
            with tempfile.TemporaryDirectory() as d:
                game(d, symbols)
                return tools.deleted_again(d)
        finally:
            tools.time.sleep, parts.load_game = keep_sleep, keep_load
            if keep_mod is None:
                sys.modules.pop('r2000', None)
            else:
                sys.modules['r2000'] = keep_mod

    def test_an_automatic_symbol_the_export_lacks_is_deleted_again(self):
        s = Session([dict(x) for x in LIVE])
        self.assertEqual(self.run_on(s), [(0xDA7C, 'f_DA7C', True)])
        sets = [a for n, a in s.calls if n == 'r2000_set_label_name']
        self.assertEqual(sets, [{'address': 0xDA7C, 'name': 'deleted_DA7C'}, {'address': 0xDA7C, 'name': ''}])
        self.assertEqual({x['address'] for x in s.symbols}, {0x1000, 0x1010})

    def test_a_label_of_the_users_is_never_deleted(self):
        s = Session([dict(x) for x in LIVE] + [{'address': 0x2000, 'name': 'new_label', 'kind': 'User'}])
        self.assertEqual(self.run_on(s), [(0xDA7C, 'f_DA7C', True)])
        self.assertIn(0x2000, {x['address'] for x in s.symbols})

    def test_an_address_another_part_owns_is_left_alone(self):
        s = Session([dict(x) for x in LIVE])
        self.assertEqual(self.run_on(s, away=[(0xD000, 0xDFFF, 'io')]), [])
        self.assertFalse([n for n, _ in s.calls if n == 'r2000_set_label_name'])

    def test_a_deletion_that_does_not_hold_is_reported(self):
        s = Session([dict(x) for x in LIVE], clears=False)
        self.assertEqual(self.run_on(s), [(0xDA7C, 'f_DA7C', False)])

    def test_a_folder_never_exported_asks_nothing(self):
        s = Session([dict(x) for x in LIVE])
        self.assertEqual(self.run_on(s, symbols=None), [])
        self.assertEqual(s.calls, [])


if __name__ == '__main__':
    unittest.main()
