#!/usr/bin/env python3
"""Every listing carries the game's build and title from game.json, so one edit there moves
every part's listing at once. check_listing.py says game.json is the cause and names the one
command that rebuilds them all: listing.py on the game's folder rebuilds each part's listing
from its own bytes (Summer Games II, thirteen parts, #984)."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT / 'scripts'))
from test_parts import fixture, run  # noqa: E402

LISTING = KIT / 'scripts' / 'listing.py'
CHECK = KIT / 'scripts' / 'check_listing.py'


class BuildEdit(unittest.TestCase):
    def test_one_edit_to_game_json_one_command(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            self.assertIn('OK - 3 listing', run(CHECK, g).stdout)
            gj = g / 'game.json'
            gj.write_text(json.dumps(dict(json.loads(gj.read_text()), build='two disks, PAL')))
            out = run(CHECK, g, ok=False)
            self.assertNotEqual(out.returncode, 0)
            said = [ln for ln in out.stdout.splitlines() if 'no longer rebuilds' in ln]
            self.assertEqual(len(said), 3, out.stdout)
            for ln in said:
                self.assertIn("game.json's build has changed since the listing was built", ln)
                self.assertIn(f"rebuild every part's: listing.py {g} --rebuild --write", ln)
            self.assertNotEqual(run(LISTING, g, '--rebuild', ok=False).returncode, 0)
            out = run(LISTING, g, '--rebuild', '--write')
            self.assertEqual(out.stdout.count('rebuilt from its own bytes'), 3, out.stdout)
            for pid in ('engine', 'park', 'street'):
                L = json.loads((g / 'parts' / pid / 'listing.json').read_text())
                self.assertEqual(L['build'], 'two disks, PAL')
            self.assertIn('OK - 3 listing', run(CHECK, g).stdout)
            self.assertEqual(run(LISTING, g, '--rebuild').returncode, 0)

    def test_a_game_of_parts_still_lists_each_from_its_own_snapshot(self):
        with tempfile.TemporaryDirectory() as d:
            g = fixture(d)
            out = run(LISTING, g, g / 'park.vsf', ok=False)
            self.assertNotEqual(out.returncode, 0)
            self.assertIn('is a game of several parts', out.stderr)


if __name__ == '__main__':
    unittest.main()
