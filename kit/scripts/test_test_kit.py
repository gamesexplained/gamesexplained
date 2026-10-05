#!/usr/bin/env python3
"""The test convention itself: `test_kit.py` runs the tests that are there.

`kit/scripts/test_kit.py` is how CI runs the kit's tests (#159), so its
discovery is the one thing every other test in the tree depends on: a test
file it fails to find is a test that never runs. This checks that it finds
the tests that exist, that it does not try to run itself, that every
`SELF_TESTS` entry names a file that is really there and no script with a
`--test` flag is missing from it, that a skip fails under `--require-tools`,
and that the declaration a tool-dependent test reads is the one the runner
exports.
"""
import importlib.util
import os
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RUNNER = os.path.join(ROOT, "kit", "scripts", "test_kit.py")


def listed():
    p = subprocess.run([sys.executable, RUNNER, "--list"], cwd=ROOT,
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise AssertionError(f"test_kit.py --list failed:\n{p.stdout}\n{p.stderr}")
    return p.stdout


def runner_module():
    spec = importlib.util.spec_from_file_location("test_kit", RUNNER)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


class Discovery(unittest.TestCase):
    def test_it_finds_the_kinds_of_test_that_exist(self):
        out = listed()
        for known in ("kit/c64/test_frame.py",            # unittest, run as a script
                      "kit/c64/test_cpu6502.js",          # node
                      "kit/scripts/test_tools.py",        # script with its own main
                      "kit/spectrum/test_z80.py",         # needs an external oracle
                      "kit/scripts/edit.py --test"):      # a legacy --test self-test
            self.assertIn(known, out, f"{known} is in the tree but not discovered")

    def test_it_does_not_run_itself(self):
        # not "test_kit.py", which this test's own filename also contains
        self.assertNotIn("kit/scripts/test_kit.py", listed(),
                         "the runner must not discover itself: it would recurse")

    def test_every_self_test_entry_exists(self):
        for argv in runner_module().SELF_TESTS:
            self.assertTrue(os.path.exists(os.path.join(ROOT, argv[0])),
                            f"SELF_TESTS names {argv[0]}, which is not there")

    def test_a_script_with_a_test_flag_cannot_go_unlisted(self):
        """A new `--test` flag is noticed, so SELF_TESTS cannot quietly fall behind."""
        self.assertEqual(runner_module().unlisted_self_tests(), [])
        stray = os.path.join(ROOT, "kit", "scripts", "the_flag_is_noticed.py")
        open(stray, "w").write("import sys\nif sys.argv[1:] == ['--test']:\n    print('ok')\n")
        try:
            self.assertIn("kit/scripts/the_flag_is_noticed.py", runner_module().unlisted_self_tests())
        finally:
            os.remove(stray)

    def test_a_skip_fails_under_require_tools(self):
        """A test that skips without reading KIT_REQUIRE_TOOLS still cannot pass CI."""
        stray = os.path.join(ROOT, "kit", "scripts", "test_the-skip-is-noticed.py")
        open(stray, "w").write("print('no tool here: skipped')\n")
        try:
            local = subprocess.run([sys.executable, RUNNER, "the-skip-is-noticed"], cwd=ROOT,
                                   capture_output=True, text=True)
            self.assertEqual(local.returncode, 0, local.stdout)
            self.assertIn("SKIP", local.stdout)
            ci = subprocess.run([sys.executable, RUNNER, "--require-tools", "the-skip-is-noticed"],
                                cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(ci.returncode, 1, ci.stdout)
            self.assertIn("FAIL", ci.stdout)
        finally:
            os.remove(stray)

    def test_a_new_test_file_is_found_without_an_edit(self):
        """The point of the convention: drop a file in and CI runs it."""
        stray = os.path.join(ROOT, "kit", "scripts", "test_the-convention-works.py")
        open(stray, "w").write("import sys\nprint('ok - the convention works')\n")
        try:
            self.assertIn("test_the-convention-works.py", listed())
        finally:
            os.remove(stray)

    def test_the_declaration_the_runner_exports_is_the_one_tests_read(self):
        """A tool-dependent test reads KIT_REQUIRE_TOOLS; the runner sets it."""
        with open(os.path.join(ROOT, "kit", "scripts", "test_kit.py")) as fh:
            src = fh.read()
        self.assertIn('env["KIT_REQUIRE_TOOLS"]', src)
        users = subprocess.run(
            ["git", "grep", "-l", "KIT_REQUIRE_TOOLS", "--", "kit/"],
            cwd=ROOT, capture_output=True, text=True)
        self.assertIn("test_z80.py", users.stdout,
                      "test_z80.py should read the variable the runner exports")


if __name__ == "__main__":
    unittest.main()
