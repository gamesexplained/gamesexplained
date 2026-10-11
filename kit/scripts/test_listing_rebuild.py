#!/usr/bin/env python3
"""check_listing.py fails a listing the kit has moved under, and listing.py --rebuild --write
replaces it with what its snapshot would build now, from the listing's own bytes. A byte the
ledger counts that the listing does not hold becomes a gap that says so (#210)."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
LISTING = KIT / 'scripts' / 'listing.py'
CHECK = KIT / 'scripts' / 'check_listing.py'


def run(*args, script=LISTING):
    return subprocess.run([sys.executable, script, *map(str, args)], capture_output=True, text=True)


class Rebuild(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = p = Path(self.tmp.name)
        (p / 'work').mkdir()
        (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture', 'build': 'disk'}))
        (p / 'symbols.json').write_text(json.dumps({
            'schema': 1, 'platform': 'c64', 'game': 'fixture',
            'blocks': [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}, {'start': 0xC000, 'end': 0xC003, 'type': 'Byte'}],
            'symbols': [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'},
                        {'address': 0xC000, 'name': 'table', 'kind': 'user', 'type': 'UserDefined'}],
            'comments': []}))
        ram = bytearray(65536)
        ram[1] = 0x35
        ram[0x8000:0x8004] = bytes([0xAD, 0x00, 0xC0, 0x60])     # LDA table, RTS
        ram[0xC000:0xC004] = bytes([1, 2, 3, 4])
        magic = b'VICE Snapshot File'
        (p / 'work' / 'play.vsf').write_bytes(magic + bytes(209 - len(magic)) + ram)
        self.assertEqual(run(p, p / 'work' / 'play.vsf').returncode, 0)
        self.built = (p / 'listing.json').read_text()

    def tearDown(self):
        self.tmp.cleanup()

    def tamper(self, change):
        L = json.loads(self.built)
        change(L)
        (self.p / 'listing.json').write_text(json.dumps(L, separators=(',', ':')))

    def test_a_listing_the_kit_moved_under_is_written_as_the_snapshot_builds_it(self):
        def stale(L):                     # built before the kit derived the reference, and the build line
            for r in L['records']:
                r.pop('x', None)
            L['build'] = None
        self.tamper(stale)
        self.assertNotEqual(run(self.p, '--rebuild').returncode, 0)
        self.assertIn('no longer rebuilds from its own bytes (record 4 at $C000 differs in x)',
                      run(self.p, script=CHECK).stdout)                       # the CI gate
        out = run(self.p, '--rebuild', '--write')
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn('rebuilt from its own bytes', out.stdout)
        self.assertEqual(json.loads((self.p / 'listing.json').read_text()), json.loads(self.built))
        self.assertEqual(json.loads(self.built)['snapshot']['file'], 'work/play.vsf')
        self.assertIn('OK - the listing rebuilds', run(self.p, '--rebuild').stdout)
        self.assertIn('OK - 1 listing', run(self.p, script=CHECK).stdout)

    def test_bytes_only_the_snapshot_holds_show_as_missing(self):
        def short(L):                     # built when the ledger counted the table's first two bytes
            recs = [r for r in L['records'] if r['a'] != 0xC000]
            recs.append({'a': 0xC000, 't': 'byte', 'b': [1, 2], 'l': 'table'})
            recs.append({'a': 0xC002, 't': 'gap', 'n': 2})
            L['records'] = sorted(recs, key=lambda r: r['a'])
        self.tamper(short)
        out = run(self.p, '--rebuild', '--write')
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn('2 byte(s) the ledger counts are not in the listing, the first at $C002', out.stdout)
        recs = {r['a']: r for r in json.loads((self.p / 'listing.json').read_text())['records']}
        self.assertEqual(recs[0xC000]['b'], [1, 2])
        self.assertEqual((recs[0xC002]['t'], recs[0xC002]['n'], recs[0xC002]['note']),
                         ('gap', 2, 'the game uses, missing from this listing'))
        self.assertIn('OK - the listing rebuilds', run(self.p, '--rebuild').stdout)   # and it stays so
        check = run(self.p, script=CHECK).stdout
        self.assertIn('2 byte(s) the ledger counts are not in the listing (the first at $C002)', check)
        self.assertIn('OK - 1 listing', check)
        run(self.p, self.p / 'work' / 'play.vsf')                                    # the snapshot fills them
        self.assertEqual(json.loads((self.p / 'listing.json').read_text()), json.loads(self.built))

    def test_a_listing_from_other_symbols_is_refused(self):
        s = json.loads((self.p / 'symbols.json').read_text())
        s['blocks'][1]['end'] = 0xC001
        (self.p / 'symbols.json').write_text(json.dumps(s))
        out = run(self.p, '--rebuild', '--write')
        self.assertNotEqual(out.returncode, 0)
        self.assertIn('built from a different symbols.json', out.stderr)
        self.assertEqual((self.p / 'listing.json').read_text(), self.built)


if __name__ == '__main__':
    unittest.main()
