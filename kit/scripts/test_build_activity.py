#!/usr/bin/env python3
"""The activity page's history: one change per commit on main's first-parent line, whether a
pull request was squashed, merged or skipped; the kit's version bumps set aside; the areas, games,
people and issues each change carries; the issues GitHub closed as completed, asked only with a
token; and nothing in a title able to end the script element the history sits in."""
import contextlib
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

ADA = ("Ada", "ada@users.noreply.github.com")
BEA = ("Bea", "1234+bea@users.noreply.github.com")
AGENT = ("Claude", "noreply@anthropic.com")
BOT = ("bump-kit-version[bot]", "1+bump-kit-version[bot]@users.noreply.github.com")


class History(unittest.TestCase):
    """A repository whose main has each kind of change on it, oldest first."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        cls.t = 1790000000
        cls.git("init", "-q", "-b", "main")
        cls.commit(ADA, "Pong (C64): Add the game at Silver (#3)\n\nCloses #12\nfixes #13",
                   {"games/c64/pong/game.json": "{}", "kit/lessons/pong.md": "a lesson", "kit/VERSION": "0.0.1"})
        cls.commit(BOT, "kit 0.0.2 [skip ci]", {"kit/VERSION": "0.0.2"})
        cls.commit(ADA, "site: Draw the tiles wider", {"site/lib/site.css": "x"})   # pushed to main
        cls.commit(AGENT, "kit: Fix the census (#5)", {"kit/scripts/census.py": "x", "AGENTS.md": "x"})
        cls.git("checkout", "-q", "-b", "bea/pong")
        cls.commit(BEA, "Say how Pong scores", {"games/c64/pong/index.html": "x"})
        cls.commit(AGENT, "Tidy the scoring section", {"games/c64/pong/index.html": "y"})
        cls.git("checkout", "-q", "main")
        cls.t += 60
        cls.git("merge", "-q", "--no-ff", "bea/pong", "-m", "Merge pull request #7 from bea/pong\n\nPong (C64): Say how it scores",
                env=cls.env(ADA))
        cls.commit(ADA, "ci: Run the checks daily (#8)", {".github/workflows/ci.yml": "x"})
        cls.commit(BEA, "Pong (C64): Retire the page (#9)", {"games/c64/pong/game.json": None})

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
            if text is None:
                p.unlink()
            else:
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(text)
        cls.git("add", "-A")
        cls.git("commit", "-q", "-m", message, env=cls.env(who))

    def setUp(self):
        for state in (build._accounts, build._github_off, build._unasked, build._warned):
            state.clear()
        for cm in (mock.patch.object(build, "ROOT", str(self.root)), mock.patch.dict(os.environ)):
            cm.__enter__()
            self.addCleanup(cm.__exit__, None, None, None)
        os.environ.pop("GITHUB_TOKEN", None)
        os.environ.pop("GH_TOKEN", None)
        self.games = [{"platform": "c64", "slug": "pong", "title": "Pong"}]

    def landed(self):
        changes, bumps = build.landed(self.games)
        return {c["title"]: c for c in changes}, changes, bumps

    def test_one_change_per_commit_on_main_and_the_bump_set_aside(self):
        by, changes, bumps = self.landed()
        self.assertEqual([c["title"] for c in changes],
                         ["Pong (C64): Add the game at Silver", "site: Draw the tiles wider", "kit: Fix the census",
                          "Pong (C64): Say how it scores", "ci: Run the checks daily", "Pong (C64): Retire the page"])
        self.assertEqual([v for _, v in bumps], ["0.0.2"])
        self.assertEqual([c["t"] for c in changes], sorted(c["t"] for c in changes))

    def test_a_pull_request_by_its_number_however_it_was_merged(self):
        by, _, _ = self.landed()
        self.assertEqual(by["Pong (C64): Add the game at Silver"]["pr"], 3)   # squashed
        self.assertEqual(by["Pong (C64): Say how it scores"]["pr"], 7)       # a merge commit, titled from its message
        self.assertNotIn("pr", by["site: Draw the tiles wider"])             # pushed to main

    def test_areas_by_the_folders_touched(self):
        by, _, _ = self.landed()
        self.assertEqual(by["Pong (C64): Add the game at Silver"]["areas"], ["new", "game", "kit"])   # a lesson is the kit's
        self.assertEqual(by["site: Draw the tiles wider"]["areas"], ["site"])
        self.assertEqual(by["kit: Fix the census"]["areas"], ["kit"])
        self.assertEqual(by["ci: Run the checks daily"]["areas"], ["other"])
        self.assertEqual(build.areas(["kit/VERSION"]), ["other"])   # the bump workflow's file is not an improvement

    def test_games_added_and_removed_count_the_total(self):
        by, changes, _ = self.landed()
        self.assertEqual(by["Pong (C64): Add the game at Silver"]["added"], ["c64/pong"])
        self.assertEqual(by["Pong (C64): Retire the page"]["removed"], ["c64/pong"])
        self.assertEqual(by["Pong (C64): Say how it scores"]["games"], ["c64/pong"])
        self.assertEqual(sum(len(c.get("added", [])) - len(c.get("removed", [])) for c in changes), 0)

    def test_the_issues_a_message_closes(self):
        by, _, _ = self.landed()
        self.assertEqual(by["Pong (C64): Add the game at Silver"]["fixes"], [12, 13])
        self.assertNotIn("fixes", by["kit: Fix the census"])

    def test_people_never_agents(self):
        by, _, _ = self.landed()
        self.assertEqual(by["Pong (C64): Add the game at Silver"]["who"], [["Ada", "ada"]])
        self.assertEqual(by["Pong (C64): Say how it scores"]["who"], [["Bea", "bea"]])   # the branch's author, not the merger
        self.assertNotIn("who", by["kit: Fix the census"])

    def test_uncredited_is_left_off(self):
        self.games[0]["uncredited"] = ["bea"]
        by, _, _ = self.landed()
        self.assertNotIn("who", by["Pong (C64): Say how it scores"])
        self.assertEqual(by["Pong (C64): Add the game at Silver"]["who"], [["Ada", "ada"]])

    def test_a_title_cannot_close_the_script_it_sits_in(self):
        with mock.patch.object(build, "landed", lambda games: ([{"t": 1, "sha": "a", "title": "</script><b>", "areas": ["kit"]}], [])):
            page = build.activity_page(self.games)
        self.assertNotIn("</script><b>", page)
        self.assertIn("<\\/script><b>", page)


class Issues(unittest.TestCase):
    PAGES = {
        "first": ([{"number": 1, "title": "Fixed", "state_reason": "completed", "closed_at": "2026-10-02T10:00:00Z"},
                   {"number": 2, "title": "A pull request", "state_reason": "completed", "closed_at": "2026-10-01T10:00:00Z",
                    "pull_request": {}},
                   {"number": 3, "title": "Not planned", "state_reason": "not_planned", "closed_at": "2026-10-01T10:00:00Z"}],
                  "second"),
        "second": ([{"number": 4, "title": "Fixed first", "state_reason": "completed", "closed_at": "2026-10-01T10:00:00Z"}], None),
    }

    def setUp(self):
        self.asked = []
        self.said = io.StringIO()
        for cm in (mock.patch.dict(os.environ), contextlib.redirect_stderr(self.said)):
            cm.__enter__()
            self.addCleanup(cm.__exit__, None, None, None)
        os.environ.pop("GH_TOKEN", None)
        os.environ["GITHUB_TOKEN"] = "a-token"
        build._warned.clear()

    def get(self, url, token):
        self.asked.append(url)
        if url.endswith("per_page=100"):
            url = "first"
        if isinstance(self.PAGES.get(url), Exception):
            raise self.PAGES[url]
        return self.PAGES[url]

    def test_completed_issues_oldest_first_over_every_page(self):
        with mock.patch.object(build, "github_get", self.get):
            issues = build.fixed_issues()
        self.assertEqual([(i["n"], i["title"]) for i in issues], [(4, "Fixed first"), (1, "Fixed")])
        self.assertEqual(issues[1]["t"], 1790935200)   # 2026-10-02 10:00 UTC
        self.assertEqual(len(self.asked), 2)

    def test_without_a_token_nothing_is_asked(self):
        del os.environ["GITHUB_TOKEN"]
        with mock.patch.object(build, "github_get", self.get):
            self.assertIsNone(build.fixed_issues())
        self.assertEqual(self.asked, [])

    def test_a_failed_request_leaves_the_issues_out_and_says_so(self):
        with mock.patch.object(build, "github_get", self.get), \
                mock.patch.dict(self.PAGES, {"second": urllib.error.HTTPError("", 403, "Forbidden", None, None)}):
            self.assertIsNone(build.fixed_issues())
        self.assertIn("leaves the issues out", self.said.getvalue())


if __name__ == "__main__":
    unittest.main()
