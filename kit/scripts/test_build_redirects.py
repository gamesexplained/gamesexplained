#!/usr/bin/env python3
"""Retired page URLs remain reachable without reappearing in navigation."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build


class Redirects(unittest.TestCase):
    def test_browser_keeps_bookmark_query_and_fragment(self):
        page = build.redirect_pages({'redirects': {'old.html': 'index.html#details'}}, {'index.html'})['old.html']
        script = page.split('<script>')[1].split('</script>')[0]
        for suffix, expected in [('', '#details'), ('?scene=scene-11#captured-scene', '#captured-scene')]:
            js = 'let result;const location={href:' + json.dumps('https://example.test/game/old.html' + suffix) + ',search:' + json.dumps('?scene=scene-11' if suffix else '') + ',hash:' + json.dumps('#captured-scene' if suffix else '') + ',replace:x=>result=x};' + script + ';console.log(result);'
            result = subprocess.check_output(['node', '-e', js], text=True).strip()
            self.assertEqual(result, 'https://example.test/game/index.html' + ('?scene=scene-11' if suffix else '') + expected)
        self.assertIn('href="index.html#details"', page)

    def test_rejects_collisions_missing_pages_and_external_paths(self):
        for old, target in [('index.html', 'index.html'), ('../old.html', 'index.html'), ('old.html', 'missing.html'), ('old.html', 'https://example.test/index.html')]:
            with self.assertRaises(ValueError):
                build.redirect_pages({'redirects': {old: target}}, {'index.html'})

    def test_full_build_writes_alias_without_a_tab(self):
        shot = build.shot_html
        build.shot_html = lambda *args, **kwargs: ''
        try:
            with tempfile.TemporaryDirectory() as d:
                g = Path(d) / 'games/c64/fixture'
                shutil.copytree(Path(build.ROOT) / 'kit/template', g)
                game = json.loads((g / 'game.json').read_text())
                game.update(platform='c64', slug='fixture', title='Fixture', tier='none', redirects={'old.html': 'index.html#game'})
                (g / 'game.json').write_text(json.dumps(game))
                out = Path(d) / '_site'
                shutil.copytree(Path(build.SITE) / 'lib', out / 'lib')
                build.build_game(str(g), str(out))
                self.assertTrue((out / 'c64/fixture/old.html').exists())
                self.assertNotIn('href="old.html"', (out / 'c64/fixture/index.html').read_text())
        finally:
            build.shot_html = shot


if __name__ == '__main__':
    unittest.main()
