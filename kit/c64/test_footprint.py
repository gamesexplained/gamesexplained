#!/usr/bin/env python3
"""The bounded footprint scan must compare changes, not absolute timestamps.

The walk is kit/scripts/launcher.py's, shared by every platform; the C64's launcher
puts kit/scripts on the path, so importing it first makes `launcher` importable here.
"""
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import tools  # noqa: F401  the C64 launcher, which puts kit/scripts on sys.path
import launcher

WORDS = ("vice", "x64", "regenerator", "r2000")   # what kit/c64/tools.py's verify_footprint looks for


class FootprintTests(unittest.TestCase):
    def test_old_and_future_files_are_not_new_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            inside = base / 'repo'; inside.mkdir()
            future = base / 'service-cache'; future.write_text('unrelated')
            os.utime(future, (2200000000, 2200000000))
            hidden = inside / 'vice.log'; hidden.write_text('local')
            with patch.object(launcher, 'ROOT', str(inside)), \
                    patch.object(launcher, 'home_candidates', return_value=[str(base)]):
                before = launcher.footprint_signatures(WORDS)
                self.assertNotIn(str(hidden), before)
                self.assertEqual(before, launcher.footprint_signatures(WORDS))
                self.assertEqual(launcher.written_outside(before, WORDS), [])
                new = base / 'regenerator-settings'; new.write_text('new')
                self.assertEqual(launcher.written_outside(before, WORDS), [str(new)])


if __name__ == '__main__':
    unittest.main()
