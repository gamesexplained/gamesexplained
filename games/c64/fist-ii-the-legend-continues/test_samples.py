#!/usr/bin/env python3
"""Hold the Music page's sample player (reference/fist-samples.js) against the game's own routines:
runs tests/samples.js, which plays all ten samples through the port and through the game's code in
the kit's 6502 simulator, and fails when any write to the volume register differs."""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
node = shutil.which('node')
if not node:
    msg = 'test_samples.py: node is not installed'
    if os.environ.get('KIT_REQUIRE_TOOLS'):
        sys.exit(msg)
    print(msg + '; skipped')
    sys.exit(0)
sys.exit(subprocess.call([node, os.path.join(HERE, 'tests', 'samples.js')]))
