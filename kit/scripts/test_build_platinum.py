#!/usr/bin/env python3
"""Platinum and Diamond (AGENTS.md, "Definition of done"). Platinum is a Silver whose Play tab
is the whole game, so the build stops on one with no play.html, or no test_play.js beside it to
hold the published page. Its copy is still the agent's: the banner asks for an editor, or names
the steward once one has claimed it, and its tier then reads platinum (claimed). Diamond, Gold
and Platinum both, is curated, as Gold is, and leads the home page."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
from test_build_no_listing import site  # noqa: E402
from test_build_withheld import listed_game  # noqa: E402

PLAY = '<h1>{{title}}</h1>\n<p>The whole game.</p>\n'


def at(g, tier, **more):
    """The fixture game at tier, with game.json's other fields in more."""
    game = json.loads((g / "game.json").read_text())
    game.update(tier=tier, **more)
    (g / "game.json").write_text(json.dumps(game))
    return game


class Platinum(unittest.TestCase):
    def setUp(self):
        self.shot, build.shot_html = build.shot_html, lambda *a, **k: ""   # the fixture has no title screen

    def tearDown(self):
        build.shot_html = self.shot

    def test_the_build_stops_without_a_play_tab_and_its_test(self):
        for tier in build.PLAYABLE:
            with tempfile.TemporaryDirectory() as d:
                g, out = listed_game(d, publish=True), site(d)
                at(g, tier)
                with self.assertRaises(SystemExit) as no_page:
                    build.build_game(str(g), str(out))
                self.assertIn("needs a Play tab", str(no_page.exception))
                (g / "play.html").write_text(PLAY)
                with self.assertRaises(SystemExit) as no_test:
                    build.build_game(str(g), str(out))
                self.assertIn("test_play.js", str(no_test.exception))
                (g / "test_play.js").write_text("// the lockstep\n")
                build.build_game(str(g), str(out))
                self.assertTrue((out / "c64" / "fixture" / "play.html").exists())

    def test_a_silver_needs_no_play_tab(self):
        with tempfile.TemporaryDirectory() as d:
            g, out = listed_game(d, publish=True), site(d)
            at(g, "silver")
            build.build_game(str(g), str(out))

    def test_the_banner_asks_for_an_editor_until_platinum_is_curated(self):
        game = dict(platform="c64", slug="fixture", tier="platinum")
        self.assertIn("needs a human editor", build.banner(game, []))
        self.assertIn("claimed by", build.banner(dict(game, steward="someone"), []))
        for tier in build.CURATED:
            self.assertIn("curated by hand", build.banner(dict(game, tier=tier), []))

    def test_a_claimed_platinum_reads_platinum_claimed(self):
        self.assertEqual(build.tier_name("platinum"), "platinum")
        self.assertEqual(build.tier_name("platinum", "someone"), "platinum (claimed)")
        self.assertEqual(build.tier_name("silver-claimed", "someone"), "silver (claimed)")
        with tempfile.TemporaryDirectory() as d:
            g, out = listed_game(d, publish=True), site(d)
            game = at(g, "platinum", steward="someone")
            (g / "play.html").write_text(PLAY)
            (g / "test_play.js").write_text("// the lockstep\n")
            build.build_game(str(g), str(out))
            page = out / "c64" / "fixture"
            self.assertIn("tier <b>platinum (claimed)</b>", (page / "play.html").read_text())
            self.assertIn("<td>platinum (claimed)</td>", (page / "about.html").read_text())
            self.assertIn('aria-label="Tier: platinum (claimed)">Platinum<', build.tier_edge(game))

    def test_the_home_page_puts_diamond_first_then_gold_then_platinum(self):
        games = [{"tier": t} for t in ("silver", "platinum", "gold", "diamond")]
        self.assertEqual([g["tier"] for g in build.by_tier(games)], ["diamond", "gold", "platinum", "silver"])
        self.assertEqual([build.tier_group(g) for g in games], ["silver", "platinum", "gold", "diamond"])
        self.assertIn(">Diamond<", build.tier_edge({"tier": "diamond"}))
        self.assertEqual(build.featured_game([{"tier": "platinum"}, {"tier": "diamond"}])["tier"], "diamond")


if __name__ == "__main__":
    unittest.main()
