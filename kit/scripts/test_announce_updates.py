#!/usr/bin/env python3
"""announce_updates.py takes its summary from the pull request's title.

The title is the announcement, so the prefix has to come off cleanly for
each platform's label, a title that never names the game has to stay
silent, and a push that adds a game (or only touches its process files)
is not an update.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import announce_updates as au  # noqa: E402


class Title(unittest.TestCase):
    def test_strips_the_game_prefix(self):
        self.assertEqual(
            au.summary_from_title(
                "Storm (C64): Add a Play tab with a live map",
                "Storm", "c64", "storm"),
            "Add a Play tab with a live map")

    def test_platform_labels(self):
        self.assertEqual(
            au.summary_from_title(
                "Granny's Garden (BBC Micro): Add a Discoveries tab",
                "Granny's Garden", "bbc", "grannys-garden"),
            "Add a Discoveries tab")
        self.assertEqual(
            au.summary_from_title(
                "Valhalla (Spectrum): Add the hall of heroes",
                "Valhalla", "spectrum", "valhalla"),
            "Add the hall of heroes")

    def test_no_platform_in_title(self):
        self.assertEqual(
            au.summary_from_title("Storm: Add a Play tab", "Storm", "c64", "storm"),
            "Add a Play tab")

    def test_platform_slug_prefix(self):
        self.assertEqual(
            au.summary_from_title(
                "c64/platoon: Take Platoon to Silver with maps and music",
                "Platoon", "c64", "platoon"),
            "Take Platoon to Silver with maps and music")

    def test_platform_slug_prefix_for_another_game_is_silent(self):
        self.assertIsNone(
            au.summary_from_title(
                "c64/platoon: Take Platoon to Silver with maps and music",
                "Storm", "c64", "storm"))

    def test_title_that_names_no_game_is_silent(self):
        self.assertIsNone(
            au.summary_from_title(
                "site: Embed the listing pieces each game page draws from",
                "Storm", "c64", "storm"))

    def test_title_for_another_game_is_silent(self):
        self.assertIsNone(
            au.summary_from_title(
                "Mercenary (C64): Add a Skip intro button",
                "Storm", "c64", "storm"))


class ChangedGames(unittest.TestCase):
    def test_groups_changes_by_game(self):
        games = au.changed_game_dirs(
            ["games/c64/storm/index.html",
             "games/c64/storm/parts/part-1/listing.json",
             "games/c64/mercenary/index.html",
             "kit/scripts/build.py",
             "site/lib/site.js"],
            set())
        self.assertEqual(sorted(games), ["games/c64/mercenary",
                                         "games/c64/storm"])
        self.assertEqual(games["games/c64/storm"],
                         ["index.html", "parts/part-1/listing.json"])

    def test_a_game_the_push_added_is_not_an_update(self):
        games = au.changed_game_dirs(
            ["games/c64/storm/game.json", "games/c64/storm/index.html"],
            {"games/c64/storm/game.json"})
        self.assertEqual(games, {})

    def test_process_files_alone_are_not_an_update(self):
        games = au.changed_game_dirs(
            ["games/c64/storm/kit-feedback.md",
             "games/c64/storm/agent-history.md",
             "games/c64/storm/TODO.md"],
            set())
        self.assertEqual(games, {})

    def test_process_files_do_not_hide_a_real_change(self):
        games = au.changed_game_dirs(
            ["games/c64/storm/kit-feedback.md",
             "games/c64/storm/discoveries.html"],
            set())
        self.assertEqual(games, {"games/c64/storm": ["discoveries.html"]})


class PullRequest(unittest.TestCase):
    def test_picks_the_merged_pr_to_main(self):
        pulls = [
            {"number": 1, "merged_at": None, "base": {"ref": "main"}},
            {"number": 2, "merged_at": "2026-10-15T02:24:01Z",
             "base": {"ref": "main"}},
            {"number": 3, "merged_at": "2026-10-15T03:00:00Z",
             "base": {"ref": "some-branch"}},
        ]
        self.assertEqual(au.merged_pr(pulls)["number"], 2)

    def test_no_merged_pr(self):
        self.assertIsNone(au.merged_pr([]))
        self.assertIsNone(au.merged_pr(
            [{"merged_at": None, "base": {"ref": "main"}}]))


class Payload(unittest.TestCase):
    def test_format(self):
        payload = au.build_payload(
            {"title": "Storm", "platform": "c64", "slug": "storm"},
            "Add a Play tab with a live map")
        self.assertEqual(
            payload["content"],
            "Updated on Games Explained: **Storm** (c64) — "
            "Add a Play tab with a live map "
            "https://gamesexplained.com/c64/storm/")
        self.assertEqual(payload["allowed_mentions"], {"parse": []})


if __name__ == "__main__":
    unittest.main()
