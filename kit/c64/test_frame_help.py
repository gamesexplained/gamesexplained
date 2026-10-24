#!/usr/bin/env python3
"""frame.py prints its usage for -h after a subcommand and writes nothing: "capture -h" once
captured the emulator's frame into files named -h and -h.png. Needs no emulator."""
import os, subprocess, sys, tempfile, unittest

FRAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frame.py")


class SubcommandHelp(unittest.TestCase):
    def test_help_after_each_subcommand(self):
        for sub in ("capture", "compare", "trim"):
            for flag in ("-h", "--help"):
                with tempfile.TemporaryDirectory() as d:
                    r = subprocess.run([sys.executable, FRAME, sub, flag], cwd=d, capture_output=True,
                                       text=True, timeout=60)
                    self.assertEqual(r.returncode, 0, (sub, flag, r.stderr))
                    self.assertIn("Usage:", r.stdout, (sub, flag))
                    self.assertEqual(os.listdir(d), [], (sub, flag))


if __name__ == "__main__":
    unittest.main()
