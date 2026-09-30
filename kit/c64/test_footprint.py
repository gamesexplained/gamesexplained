#!/usr/bin/env python3
"""The bounded footprint scan must compare changes, not absolute timestamps."""
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import tools


class FootprintTests(unittest.TestCase):
    def test_old_and_future_files_are_not_new_writes(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            inside = base / 'repo'; inside.mkdir()
            future = base / 'service-cache'; future.write_text('unrelated')
            os.utime(future, (2200000000, 2200000000))
            hidden = inside / 'vice.log'; hidden.write_text('local')
            with patch.object(tools, 'ROOT', str(inside)), patch.object(tools, 'home_candidates', return_value=[str(base)]):
                before = tools.footprint_candidates()
                self.assertNotIn(str(hidden), before)
                self.assertEqual(before, tools.footprint_candidates())
                new = base / 'regenerator-settings'; new.write_text('new')
                after = tools.footprint_candidates()
                self.assertEqual([p for p in after if before.get(p) != after[p]], [str(new)])


if __name__ == '__main__':
    unittest.main()
