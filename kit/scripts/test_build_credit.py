#!/usr/bin/env python3
"""Who the build credits: a login read from a noreply address or named by GitHub, never an
agent's, and no request to GitHub from a build that was given no token."""
import contextlib
import io
import os
from pathlib import Path
import re
import sys
import unittest
import urllib.error
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

# What the stand-in for GitHub says of each commit's author: (login, type), None for an
# address it links to no account, or the error the request ends in.
GITHUB = {
    "squash": ("ada", "User"),       # a squash merge, authored under ada's primary address
    "agent": ("claude", "User"),     # the account GitHub names for an agent's own address
    "agent-alias": ("claude", "User"),   # the same agent under another address of its account
    "bot": ("Copilot", "Bot"),
    "stranger": None,
    "unpushed": urllib.error.HTTPError("", 404, "Not Found", None, None),
    "down": urllib.error.URLError("no route to host"),
}
ADA = "ada@example.org"   # an address only GitHub can link to ada


class Credit(unittest.TestCase):
    def setUp(self):
        for state in (build._accounts, build._github_off, build._unasked, build._warned):
            state.clear()
        self.asked = []
        self.said = io.StringIO()

        def ask(sha, token):
            self.asked.append(sha)
            if isinstance(GITHUB[sha], Exception):
                raise GITHUB[sha]
            return GITHUB[sha]

        for cm in (mock.patch.object(build, "ask_github", ask), mock.patch.dict(os.environ),
                   contextlib.redirect_stderr(self.said)):
            cm.__enter__()
            self.addCleanup(cm.__exit__, None, None, None)
        os.environ.pop("GH_TOKEN", None)
        os.environ["GITHUB_TOKEN"] = "a-token"

    def test_a_noreply_address_is_read_not_asked_about(self):
        for email in ("ada@users.noreply.github.com", "1234+ada@users.noreply.github.com"):
            self.assertEqual(build.github_login(email, "squash"), "ada")
        self.assertEqual(self.asked, [])

    def test_any_other_address_is_githubs_to_name_once(self):
        self.assertEqual(build.github_login(ADA, "squash"), "ada")
        self.assertEqual(build.github_login(ADA, "another-of-hers"), "ada")
        self.assertEqual(self.asked, ["squash"])

    def test_without_a_token_nothing_is_asked(self):
        del os.environ["GITHUB_TOKEN"]
        self.assertIsNone(build.github_login(ADA, "squash"))
        self.assertFalse(build.is_agent(ADA, "squash"))
        self.assertEqual(self.asked, [])

    def test_gh_token_serves_as_well(self):
        del os.environ["GITHUB_TOKEN"]
        os.environ["GH_TOKEN"] = "a-token"
        self.assertEqual(build.github_login(ADA, "squash"), "ada")

    def test_an_agents_address_is_never_put_to_github(self):
        # GitHub would name an account for it, a user called claude, and that is the trap
        for suffix in build.BOT_EMAILS:
            email = suffix if suffix[0].isalpha() else "1" + suffix
            self.assertTrue(build.is_agent(email, "agent"), email)
            self.assertIsNone(build.github_login(email, "agent"), email)
        self.assertEqual(self.asked, [])

    def test_an_agents_account_is_an_agent_under_any_address(self):
        self.assertTrue(build.is_agent("claude@example.org", "agent-alias"))
        self.assertIsNone(build.github_login("claude@example.org", "agent-alias"))
        self.assertTrue(build.is_agent("99+Claude@users.noreply.github.com"))
        self.assertIsNone(build.github_login("99+Claude@users.noreply.github.com"))

    def test_an_account_that_is_not_a_users_is_an_agent(self):
        self.assertTrue(build.is_agent("helper@example.org", "bot"))
        self.assertIsNone(build.github_login("helper@example.org", "bot"))

    def test_github_login_alone_never_credits_an_agent(self):
        # a caller that forgot is_agent still gets no login to link
        for email, sha in (("noreply@anthropic.com", "agent"), ("claude@example.org", "agent-alias"),
                           ("helper@example.org", "bot")):
            self.assertIsNone(build.github_login(email, sha), email)

    def authors(self):
        """A game folder's git log, newest first: (name, address, commit)."""
        return [("Ada Lovelace", ADA, "squash"), ("Ada Lovelace", ADA, "squash-2"), ("Ada Lovelace", ADA, "squash-3"),
                ("ada", "ada@users.noreply.github.com", "c1"), ("ada", "77+ada@users.noreply.github.com", "c2"),
                ("Claude", "noreply@anthropic.com", "agent"), ("Claude", "claude@example.org", "agent-alias"),
                ("Bob", "bob@example.org", "stranger")]

    def test_credit_is_one_row_a_person_and_none_for_an_agent(self):
        self.assertEqual(build.credit(self.authors()), [(5, "Ada Lovelace", "ada"), (1, "Bob", None)])
        self.assertEqual(sorted(self.asked), ["agent-alias", "squash", "stranger"])

    def test_an_author_github_cannot_name_is_reported_without_their_address(self):
        build.credit(self.authors())
        said = self.said.getvalue()
        self.assertEqual(said.count("has no GitHub login"), 1, said)
        self.assertIn("contributor Bob (commit strange)", said)
        self.assertIn(".mailmap", said)
        self.assertNotIn("bob@example.org", said)
        self.assertEqual(build._unasked, set())

    def test_credit_without_a_token_is_unlinked_and_counted_not_warned(self):
        del os.environ["GITHUB_TOKEN"]
        rows = build.credit(a for a in self.authors() if a[2] != "agent-alias")
        self.assertEqual(rows, [(3, "Ada Lovelace", None), (2, "ada", "ada"), (1, "Bob", None)])
        self.assertEqual((self.asked, self.said.getvalue()), ([], ""))
        self.assertEqual(build._unasked, {"Ada Lovelace", "Bob"})

    def test_a_commit_github_does_not_have_is_an_author_it_cannot_name(self):
        self.assertIsNone(build.github_login("local@example.org", "unpushed"))
        self.assertEqual(build.github_login(ADA, "squash"), "ada")   # and GitHub is still asked
        self.assertEqual(self.asked, ["unpushed", "squash"])

    def test_a_request_that_fails_is_the_last_and_is_said_once(self):
        self.assertIsNone(build.github_login("eve@example.org", "down"))
        self.assertEqual(build.credit(self.authors()),
                         [(3, "Ada Lovelace", None), (2, "ada", "ada"), (1, "Claude", None), (1, "Bob", None)])
        self.assertEqual(self.asked, ["down"])
        said = self.said.getvalue()
        self.assertEqual(said.count("GitHub could not be asked"), 1, said)
        self.assertIn("no route to host", said)
        self.assertNotIn("has no GitHub login", said)   # it was not asked, so it did not say no
        self.assertEqual(build._unasked, set())

    def test_the_repository_asked_about(self):
        os.environ["GITHUB_REPOSITORY"] = "someone/a-fork"
        self.assertEqual(build.github_repo(), "someone/a-fork")
        del os.environ["GITHUB_REPOSITORY"]
        self.assertTrue(re.fullmatch(r"[\w.-]+/[\w.-]+", build.github_repo()), build.github_repo())


if __name__ == "__main__":
    unittest.main()
