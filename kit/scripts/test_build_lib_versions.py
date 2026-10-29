#!/usr/bin/env python3
"""A lib script that loads another from beside itself names it by its hash, so a change to the
one it loads reaches a phone with the next deploy (build.version_lib)."""
from pathlib import Path
import hashlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build


def sha(p):
    return hashlib.sha1(p.read_bytes()).hexdigest()[:8]


class LibVersions(unittest.TestCase):
    def test_chain_of_loads_is_versioned_deepest_first(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d); lib = out / 'lib'; lib.mkdir()
            (lib / 'tune.js').write_text('var T = 1;\n')
            (lib / 'ball.js').write_text("var s = new URL('tune.js', HERE).href;\n")
            (lib / 'player.js').write_text("var s = new URL( \"ball.js\", HERE).href; var n = 'ball.js';\n")
            (out / 'page.html').write_text('<script src="lib/player.js"></script>\n')
            build.version_lib(str(out))
            build.version_lib(str(out))            # a second pass changes nothing
            self.assertIn(f"new URL('tune.js?v={sha(lib / 'tune.js')}'", (lib / 'ball.js').read_text())
            player = (lib / 'player.js').read_text()
            self.assertIn(f'new URL( "ball.js?v={sha(lib / "ball.js")}"', player)
            self.assertIn("var n = 'ball.js';", player)   # only what new URL loads
            self.assertIn(f'lib/player.js?v={sha(lib / "player.js")}"', (out / 'page.html').read_text())


if __name__ == '__main__':
    unittest.main()
