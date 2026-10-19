#!/usr/bin/env python3
"""The data the ledger does not count reaches the checks, not only the terminal: listing.py
keeps it in listing.json as "uncounted", coverage.py prints it under the figure,
check_listing.py fails a Silver game that has any, and the Source tab says the listing leaves
it out. The NeverEnding Story's parts stood at 100 % with two room descriptions cut short,
and listing.py had named them only in its output (#420)."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))


def run(*args, check=True):
    return subprocess.run([sys.executable, *map(str, args)], check=check, capture_output=True, text=True)


def game(d, tier='bronze', label=False):
    """A game with code at $8000 and 256 bytes of data at $9000, built from its hand-over
    snapshot; the data has a label and a comment of its own when label is set."""
    p = Path(d)
    (p / 'work').mkdir()
    (p / 'game.json').write_text(json.dumps({'platform': 'c64', 'slug': 'fixture', 'tier': tier}))
    syms = [{'address': 0x8000, 'name': 'entry', 'kind': 'user', 'type': 'Subroutine'}]
    blocks = [{'start': 0x8000, 'end': 0x8003, 'type': 'Code'}]
    comments = []
    if label:
        syms.append({'address': 0x9000, 'name': 'table', 'kind': 'user', 'type': 'UserDefined'})
        blocks.append({'start': 0x9000, 'end': 0x90FF, 'type': 'Byte'})
        comments.append({'address': 0x9000, 'type': 'line', 'text': 'the table'})
    (p / 'symbols.json').write_text(json.dumps({'schema': 1, 'platform': 'c64', 'game': 'fixture',
                                                'blocks': blocks, 'symbols': syms, 'comments': comments}))
    ram = bytearray(65536)
    ram[1] = 0x35
    ram[0x8000:0x8004] = bytes([0xA9, 0x01, 0xEA, 0x60])
    ram[0x9000:0x9100] = bytes((i * 7 + 1) & 0xFF or 1 for i in range(256))
    image = p / 'work' / 'entry.vsf'
    magic = b'VICE Snapshot File'         # kit/c64/snapshot.py refuses a file without it
    image.write_bytes(magic + bytes(209 - len(magic)) + ram)
    run(KIT / 'scripts' / 'listing.py', p, image)
    return p


class Uncounted(unittest.TestCase):
    def test_the_listing_keeps_the_list(self):
        with tempfile.TemporaryDirectory() as d:
            p = game(d)
            left = json.loads((p / 'listing.json').read_text()).get('uncounted')
            self.assertEqual([x[:2] for x in left], [[0x9000, 0x90FF]], left)
            self.assertIn('loaded with the game', left[0][2])

    def test_a_rebuild_keeps_it(self):
        with tempfile.TemporaryDirectory() as d:
            p = game(d)
            was = json.loads((p / 'listing.json').read_text())
            self.assertIn('OK', run(KIT / 'scripts' / 'listing.py', p, '--rebuild').stdout)
            run(KIT / 'scripts' / 'listing.py', p, '--rebuild', '--write')
            self.assertEqual(json.loads((p / 'listing.json').read_text()).get('uncounted'), was['uncounted'])

    def test_coverage_prints_it_under_the_figure(self):
        with tempfile.TemporaryDirectory() as d:
            out = run(KIT / 'scripts' / 'coverage.py', game(d)).stdout
            self.assertIn('NOT COUNTED', out, out)
            self.assertIn('$9000-$90FF', out, out)

    def test_check_listing_fails_silver_only(self):
        with tempfile.TemporaryDirectory() as d:
            r = run(KIT / 'scripts' / 'check_listing.py', game(d, tier='silver'), check=False)
            self.assertEqual(r.returncode, 1, r.stdout)
            self.assertIn('data the ledger does not count', r.stdout)
        with tempfile.TemporaryDirectory() as d:
            r = run(KIT / 'scripts' / 'check_listing.py', game(d, tier='bronze'), check=False)
            self.assertEqual(r.returncode, 0, r.stdout)
            self.assertIn('data the ledger does not count', r.stdout)

    def test_the_source_tab_says_so(self):
        import build
        with tempfile.TemporaryDirectory() as d:
            note = build.uncounted_note(str(game(d) / 'listing.json'))
            self.assertIn('256 bytes', note)
            self.assertIn('$9000-$90FF', note)

    def test_described_data_leaves_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            p = game(d, tier='silver', label=True)
            self.assertNotIn('uncounted', json.loads((p / 'listing.json').read_text()))
            self.assertNotIn('NOT COUNTED', run(KIT / 'scripts' / 'coverage.py', p).stdout)
            self.assertEqual(run(KIT / 'scripts' / 'check_listing.py', p, check=False).returncode, 0)
            import build
            self.assertEqual(build.uncounted_note(str(p / 'listing.json')), '')


if __name__ == '__main__':
    unittest.main()
