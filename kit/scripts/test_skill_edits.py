#!/usr/bin/env python3
"""A game's branch that adds to a core skill names another game where the lesson would
have mattered (kit/skills/core/80-retro, step 3), and skill_edits.py fails it otherwise. On a
fork whose origin/main lags the main the branch was cut from, upstream's changes since then are
not read as the branch's own (#308)."""
from pathlib import Path
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import skill_edits  # noqa: E402

FEEDBACK = "# Jumpman — kit feedback\n\n## What was changed in the kit\n\n{}\n\n## Candidates\n\nNone.\n"


class SkillEdits(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        for d in ("games/c64/jumpman", "games/c64/wizard", "kit/skills/core/60-verify"):
            os.makedirs(os.path.join(self.root, d))
        self.write("kit/skills/core/60-verify/SKILL.md", "# Verify\n")
        self.write("games/c64/wizard/facts.md", "x\n")
        self.git("init", "-q", "-b", "main")
        self.git("add", "-A")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base")
        self.git("checkout", "-qb", "game/c64/jumpman")

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, rel, text):
        Path(self.root, rel).write_text(text, encoding="utf-8")

    def git(self, *args):
        subprocess.run(["git", "-C", self.root, *args], check=True)

    def run_check(self, feedback, skill_text="# Verify\nA new rule.\n"):
        self.write("kit/skills/core/60-verify/SKILL.md", skill_text)
        self.write("games/c64/jumpman/kit-feedback.md", FEEDBACK.format(feedback))
        self.git("add", "-A")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "game")
        return skill_edits.problems(skill_edits.changed("main", self.root), self.root)

    def test_another_game_named_passes(self):
        self.assertEqual(self.run_check(
            "- `kit/skills/core/60-verify`: check callback tables;\n  the same miss is in `games/c64/wizard`"), [])

    def test_no_other_game_fails(self):
        found = self.run_check("- `kit/skills/core/60-verify`: check callback tables, as every game with a header table")
        self.assertEqual([s for s, _ in found], ["kit/skills/core/60-verify"])

    def test_naming_only_its_own_game_fails(self):
        found = self.run_check("- `kit/skills/core/60-verify`: as in `games/c64/jumpman`")
        self.assertEqual(len(found), 1)

    def test_a_folder_that_does_not_exist_fails(self):
        found = self.run_check("- `kit/skills/core/60-verify`: as in `games/c64/nosuchgame`")
        self.assertEqual(len(found), 1)

    def test_cutting_text_is_not_checked(self):
        self.assertEqual(self.run_check("None.", skill_text=""), [])

    def test_a_kit_only_branch_is_not_checked(self):
        self.write("kit/skills/core/60-verify/SKILL.md", "# Verify\nA new rule.\n")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "kit")
        self.assertEqual(skill_edits.problems(skill_edits.changed("main", self.root), self.root), [])

    def test_a_sweep_across_games_is_not_checked(self):
        self.write("kit/skills/core/60-verify/SKILL.md", "# Verify\nA new rule.\n")
        self.write("games/c64/wizard/facts.md", "y\n")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "sweep")
        self.assertEqual(skill_edits.problems(skill_edits.changed("main", self.root), self.root), [])

    def test_no_base_compares_nothing(self):
        self.assertIsNone(skill_edits.changed("no-such-ref", self.root))


class BaseRef(unittest.TestCase):
    """main: base, then upstream's skill change (kit 0.0.124); the branch is cut from there.
    origin/main is a fork's, still at base (kit 0.0.115)."""
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        os.makedirs(os.path.join(self.root, "kit/skills/core/60-verify"))
        os.makedirs(os.path.join(self.root, "games/c64/qix"))
        self.write("kit/skills/core/60-verify/SKILL.md", "# Verify\n")
        self.git("init", "-q", "-b", "main")
        self.commit("base")
        self.base = self.head()
        self.git("update-ref", "refs/remotes/origin/main", self.base)
        self.write("kit/skills/core/60-verify/SKILL.md", "# Verify\nUpstream's new rule.\n")
        self.commit("upstream")
        self.upstream = self.head()
        self.git("checkout", "-qb", "game/c64/qix")
        self.write("games/c64/qix/kit-feedback.md", FEEDBACK.format("None."))
        self.commit("game")
        self.env = os.environ.pop("GITHUB_BASE_REF", None)

    def tearDown(self):
        if self.env is not None:
            os.environ["GITHUB_BASE_REF"] = self.env
        self.tmp.cleanup()

    def write(self, rel, text):
        Path(self.root, rel).write_text(text, encoding="utf-8")

    def git(self, *args):
        subprocess.run(["git", "-C", self.root, *args], check=True)

    def commit(self, msg):
        self.git("add", "-A")
        self.git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", msg)

    def head(self, ref="HEAD"):
        return subprocess.run(["git", "-C", self.root, "rev-parse", ref], capture_output=True, text=True).stdout.strip()

    def found(self):
        return skill_edits.problems(skill_edits.changed(skill_edits.base_ref(self.root), self.root), self.root)

    def test_a_fork_behind_compares_with_the_local_main(self):
        self.assertEqual(skill_edits.base_ref(self.root), "main")
        self.assertEqual(self.found(), [])
        # what it said before: upstream's rule read as the game branch's own
        self.assertEqual(len(skill_edits.problems(skill_edits.changed("origin/main", self.root), self.root)), 1)

    def test_an_upstream_remote_ahead_of_the_local_main(self):
        self.git("update-ref", "refs/heads/main", self.base)
        self.git("remote", "add", "upstream", "https://example.invalid/gamesexplained.git")
        self.git("update-ref", "refs/remotes/upstream/main", self.upstream)
        self.assertEqual(skill_edits.base_ref(self.root), "upstream/main")
        self.assertEqual(self.found(), [])

    def test_origin_up_to_date_and_the_local_main_stale(self):
        self.git("update-ref", "refs/remotes/origin/main", self.upstream)
        self.git("update-ref", "refs/heads/main", self.base)
        self.assertEqual(skill_edits.base_ref(self.root), "origin/main")

    def test_work_on_main_itself_compares_with_origin(self):
        self.git("checkout", "-q", "main")
        self.assertEqual(skill_edits.base_ref(self.root), "origin/main")

    def test_a_pull_request_names_its_base(self):
        os.environ["GITHUB_BASE_REF"] = "main"
        try:
            self.assertEqual(skill_edits.base_ref(self.root), "origin/main")
        finally:
            del os.environ["GITHUB_BASE_REF"]


if __name__ == "__main__":
    unittest.main()
