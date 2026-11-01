#!/usr/bin/env python3
"""The home page's New and updated cards say what each change did: the title of the change that
added a game contributed that day, else of the day's newest change to it, with the area and the
pull request's number dropped, a merge commit read for its pull request's title, and the old
"updated by" line kept for a title that is only a branch name."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ADA = ("Ada", "ada@users.noreply.github.com")
BEA = ("Bea", "1234+bea@users.noreply.github.com")
DAY = 86400


class Recent(unittest.TestCase):
    """A repository with four days of changes to one game, a day apart."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        cls.t = 1790000000
        cls.git("init", "-q", "-b", "main")
        # day 1: the game arrives, and a tidy-up lands after it
        cls.commit(ADA, "Pong (C64): Add the game at Silver (#3)", {"games/c64/pong/game.json": "{}"})
        cls.commit(ADA, "Pong (C64): Move sound effects up (#4)", {"games/c64/pong/index.html": "a"})
        # day 2: two updates
        cls.t += DAY
        cls.commit(ADA, "Pong (C64): Say how it scores (#5)", {"games/c64/pong/index.html": "b"})
        cls.commit(ADA, "Pong (C64): Draw the bats (#6)", {"games/c64/pong/index.html": "c"})
        # day 3: a pull request merged with a merge commit
        cls.t += DAY
        cls.git("checkout", "-q", "-b", "bea/pong")
        cls.commit(BEA, "Write the serve section", {"games/c64/pong/index.html": "d"})
        cls.git("checkout", "-q", "main")
        cls.t += 60
        cls.git("merge", "-q", "--no-ff", "bea/pong", "-m", "Merge pull request #7 from bea/pong\n\nPong (C64): Explain the serve",
                env=cls.env(ADA))
        # day 4: a pull request titled with its branch's name
        cls.t += DAY
        cls.commit(ADA, "Game/c64/pong (#8)", {"games/c64/pong/index.html": "e"})

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    @classmethod
    def env(cls, who):
        stamp = f"@{cls.t} +0000"
        return {**os.environ, "GIT_AUTHOR_NAME": who[0], "GIT_AUTHOR_EMAIL": who[1], "GIT_AUTHOR_DATE": stamp,
                "GIT_COMMITTER_NAME": who[0], "GIT_COMMITTER_EMAIL": who[1], "GIT_COMMITTER_DATE": stamp}

    @classmethod
    def git(cls, *args, env=None):
        subprocess.run(["git", "-c", "commit.gpgsign=false", *args], cwd=cls.root, env=env or os.environ,
                       check=True, capture_output=True)

    @classmethod
    def commit(cls, who, message, files):
        cls.t += 60
        for path, text in files.items():
            p = cls.root / path
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text)
        cls.git("add", "-A")
        cls.git("commit", "-q", "-m", message, env=cls.env(who))

    def setUp(self):
        for cm in (mock.patch.object(build, "ROOT", str(self.root)),
                   mock.patch.object(build, "shot_html", lambda *a, **k: "")):   # the fixture has no title screen
            cm.__enter__()
            self.addCleanup(cm.__exit__, None, None, None)
        self.games = [{"platform": "c64", "slug": "pong", "title": "Pong", "tier": "silver"}]
        self.rows = build.recent_changes(self.games)

    def test_one_row_a_day_saying_what_the_change_did(self):
        self.assertEqual([(r["kind"], r["what"]) for r in self.rows],
                         [("updated", ""),                           # day 4: a branch name says nothing
                          ("updated", "Explain the serve"),          # day 3: the merge's pull request title
                          ("updated", "Draw the bats"),              # day 2: the newest of two
                          ("contributed", "Add the game at Silver")])   # day 1: the arrival, not the tidy-up after it

    def test_the_card_leads_with_what_changed_then_who_and_when(self):
        cards = build.recent_html(self.rows)
        self.assertIn('<span class="v"><span class="what">Draw the bats</span></span>', cards)
        self.assertRegex(cards, r'<span class="what">Add the game at Silver</span></span><span class="m">New · '
                                r'<a href="https://github.com/ada">ada</a> · <time datetime="\d{4}-\d\d-\d\d"')
        self.assertIn('<span class="v">updated by <a href="https://github.com/ada">ada</a></span><time ', cards)   # day 4

    def test_a_title_keeps_what_it_did(self):
        for subject, what in (("Gunship (C64): Add the game at Silver (#665)", "Add the game at Silver"),
                              ("c64: Add Time Tunnel, explained to Silver (#660)", "Add Time Tunnel, explained to Silver"),
                              ("Fix the thing: the second half", "Fix the thing: the second half"),
                              ("Game/c64/north and south (#666)", ""),
                              ("site/home-page", "")):
            self.assertEqual(build.change_title(subject), what, subject)


if __name__ == "__main__":
    unittest.main()
