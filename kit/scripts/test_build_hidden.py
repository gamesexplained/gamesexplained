#!/usr/bin/env python3
"""The kill switch: a game with "hidden": true in game.json is left off the site. The build
writes no page of it, the home, platform and status pages do not list it, a link to it from
another game's page becomes plain text, and the build still passes its own link check."""
from pathlib import Path
import json
import shutil
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
from test_build_no_listing import TEMPLATE  # noqa: E402


def game(root, slug, hidden=False, body=""):
    g = Path(root) / "games" / "c64" / slug
    shutil.copytree(TEMPLATE, g)
    j = json.loads((g / "game.json").read_text())
    j.update(platform="c64", slug=slug, title=slug.title(), tier="none")
    if hidden:
        j["hidden"] = True
    (g / "game.json").write_text(json.dumps(j))
    (g / "symbols.json").write_text(json.dumps({"schema": 1, "blocks": [], "symbols": [], "comments": []}))
    with open(g / "index.html", "a") as f:
        f.write(body)
    return g


class Hidden(unittest.TestCase):
    def build(self, d, hide):
        shutil.copytree(Path(build.ROOT) / "site", Path(d) / "site")
        for f in list(build.KIT_LIB.values()) + ["kit/models.json", "kit/contributors.json", "kit/VERSION"]:
            (Path(d) / f).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(Path(build.ROOT) / f, Path(d) / f)
        check = build.broken_links   # the site's own pages link real games, which this fixture has not got
        game(d, "kept", body='\n<p>See <a href="../gone/index.html#x">the <b>other</b> game</a> and '
                             '<a href="../../status.html">the status page</a>.</p>\n')
        game(d, "gone", hidden=hide)
        with mock.patch.object(build, "ROOT", d), mock.patch.object(build, "SITE", str(Path(d) / "site")), \
                mock.patch.object(build, "shot_html", lambda *a, **k: ""), mock.patch.object(build, "_hidden", set()), \
                mock.patch.object(build, "_game_folders", {}), mock.patch.object(sys, "argv", ["build.py"]), \
                mock.patch.object(build, "broken_links", lambda o: [b for b in check(o) if b[0].startswith("c64")]), \
                mock.patch.object(sys, "stdout"):
            build.main()
        return Path(d) / "_site"

    def test_a_hidden_game_is_left_off_the_site(self):
        with tempfile.TemporaryDirectory() as d:
            out = self.build(d, True)
            self.assertTrue((out / "c64" / "kept" / "index.html").exists())
            self.assertFalse((out / "c64" / "gone").exists())
            for page in out.rglob("*.html"):
                text = page.read_text()
                self.assertNotIn("c64/gone", text, page)
                self.assertNotIn("../gone", text, page)
                self.assertNotIn(">Gone<", text, page)
            kept = (out / "c64" / "kept" / "index.html").read_text()
            self.assertIn("See the <b>other</b> game and", kept)       # the link is its text
            self.assertIn('href="../../status.html"', kept)             # and no other link is touched

    def test_without_the_line_it_is_back(self):
        with tempfile.TemporaryDirectory() as d:
            out = self.build(d, False)
            self.assertTrue((out / "c64" / "gone" / "index.html").exists())
            self.assertIn('href="../gone/index.html#x"', (out / "c64" / "kept" / "index.html").read_text())
            self.assertIn("c64/gone", (out / "index.html").read_text())


if __name__ == "__main__":
    unittest.main()
