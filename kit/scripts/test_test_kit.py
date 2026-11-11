#!/usr/bin/env python3
"""The test convention itself: `test_kit.py` runs the tests that are there.

`kit/scripts/test_kit.py` is how CI runs the kit's tests (#159), so its
discovery is the one thing every other test in the tree depends on: a test
file it fails to find is a test that never runs. This checks that it finds
the tests that exist, that it does not try to run itself, that every
`SELF_TESTS` entry names a file that is really there and no script with a
`--test` flag is missing from it, that a skip fails under `--require-tools`,
that the declaration a tool-dependent test reads is the one the runner
exports, that `--changed` picks the tests a changed file can reach and
no others (#833), that the shares `--shard` splits a run into hold every test
once, and that `--times` changes the order the tests start in and nothing else.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
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
                      "kit/cpu/test_cpu6502.js",          # node
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

    def test_a_game_s_own_test_is_found(self):
        """A page's port is checked by a test beside it, and that test has to run too."""
        stray = os.path.join(ROOT, "games", "c64", "jupiter-lander", "test_the-convention-works.py")
        open(stray, "w").write("import sys\nprint('ok - a game test runs')\n")
        try:
            self.assertIn("games/c64/jupiter-lander/test_the-convention-works.py", listed(),
                          "a game's own test is in the tree but not discovered")
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


TREE = {
    # a decoder the listing tools use, and a test that imports it
    "kit/cpu/decoder.py": "TABLE = {}\n",
    "kit/cpu/test_decoder.py": "import decoder\n",
    # a script that imports the decoder, and a test that runs the script by its path
    "kit/scripts/lister.py": "import os, sys\nsys.path.insert(0, 'kit/cpu')\nfrom decoder import TABLE\n",
    "kit/scripts/test_lister.py": "import subprocess\nsubprocess.run(['python3', 'kit/scripts/lister.py'])\n",
    "kit/scripts/test_other.py": "import os\nprint('*.json', '**', 'kit/scripts')\n",
    # an emulator core, a machine built on it, and tests in node
    "kit/cpu/core.js": "module.exports = {};\n",
    "kit/box/machine.js": "const core = require('../cpu/core.js');\n",
    "kit/box/test_machine.js": "const M = require('./machine');\n",
    "kit/box/fixtures/bus.json": "{}\n",
    "kit/box/test_bus.js": "const path = require('path');\n"
                           "const f = path.join(__dirname, 'fixtures', 'bus.json');\n",
    # a game: a port, a page that loads it and the site's library, tests beside them
    "site/lib/sound.js": "window.Sound = {};\n",
    "site/lib/keys.js": "window.Keys = {};\n",
    "games/box/alpha/port/game.js": "module.exports = {};\n",
    "games/box/alpha/play.html": '<script src="../../lib/sound.js"></script>\n<script src="port/game.js"></script>\n',
    "games/box/alpha/test_play.js": "const kit = '../../../kit/';\nconst M = require(kit + 'box/machine.js');\n"
                                    "const page = require('fs').readFileSync(__dirname + '/play.html');\n",
    "games/box/alpha/game.json": "{}\n",
    "games/box/beta/test_levels.py": "import json\nopen('levels.json')\n",
    "games/box/beta/levels.json": "{}\n",
    # a test that reads every game's page, and one that reads a folder of data
    "kit/scripts/test_pages.py": "import glob\nglob.glob('games/*/*/play.html')\n",
    "kit/template/index.html": "<html></html>\n",
    "kit/scripts/test_template.py": "import os\nos.listdir(os.path.join('kit', 'template'))\n",
}


class Changed(unittest.TestCase):
    """`--changed` runs a test when the branch changes it, a file it loads (or one that file
    loads), or anything in its game's folder; every other test is left to CI."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        for rel, text in TREE.items():
            path = os.path.join(cls.tmp.name, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as fh:
                fh.write(text)
        cls.runner = runner_module()
        cls.tests = sorted(f for f in TREE if os.path.basename(f).startswith("test_"))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def picked(self, *changed):
        return sorted(self.runner.affected(changed, self.tests, files=list(TREE), root=self.tmp.name))

    def test_a_python_decoder_reaches_its_importers_and_no_node_test(self):
        """The case the option was asked for: two opcodes in the Python decoder."""
        self.assertEqual(self.picked("kit/cpu/decoder.py"),
                         ["kit/cpu/test_decoder.py", "kit/scripts/test_lister.py"])

    def test_a_core_reaches_the_tests_of_what_is_built_on_it(self):
        self.assertEqual(self.picked("kit/cpu/core.js"),
                         ["games/box/alpha/test_play.js", "kit/box/test_machine.js"])

    def test_a_require_without_its_extension_and_a_path_begun_in_a_variable(self):
        self.assertEqual(self.picked("kit/box/machine.js"),
                         ["games/box/alpha/test_play.js", "kit/box/test_machine.js"])

    def test_a_fixture_named_in_the_parts_of_a_join(self):
        self.assertEqual(self.picked("kit/box/fixtures/bus.json"), ["kit/box/test_bus.js"])

    def test_a_page_s_scripts_count_for_the_test_that_reads_the_page(self):
        # test_pages.py names the page by a pattern, and what a pattern's files load is not followed
        self.assertEqual(self.picked("site/lib/sound.js"), ["games/box/alpha/test_play.js"])
        self.assertEqual(self.picked("site/lib/keys.js"), [])

    def test_anything_in_a_game_s_folder_runs_that_game_s_tests(self):
        self.assertEqual(self.picked("games/box/alpha/game.json"), ["games/box/alpha/test_play.js"])
        self.assertEqual(self.picked("games/box/beta/levels.json"), ["games/box/beta/test_levels.py"])

    def test_a_pattern_and_a_folder_stand_for_their_files(self):
        self.assertIn("kit/scripts/test_pages.py", self.picked("games/box/alpha/play.html"))
        self.assertEqual(self.picked("kit/template/index.html"), ["kit/scripts/test_template.py"])

    def test_a_changed_test_runs(self):
        self.assertEqual(self.picked("kit/scripts/test_other.py"), ["kit/scripts/test_other.py"])

    def test_a_folder_of_scripts_or_a_bare_wildcard_is_no_dependency(self):
        """test_other.py names "kit/scripts", "**" and "*.json": none of them is a file it loads."""
        for changed in ("kit/scripts/lister.py", "kit/box/fixtures/bus.json", "games/box/beta/levels.json"):
            self.assertNotIn("kit/scripts/test_other.py", self.picked(changed))

    def test_a_file_no_test_names_runs_nothing(self):
        self.assertEqual(self.picked("README.md"), [])

    def test_the_option_lists_and_says_what_it_left_out(self):
        """On this checkout, whatever it holds: the line that says what was compared and how
        many tests are left to CI, or that every test runs."""
        p = subprocess.run([sys.executable, RUNNER, "--changed", "--list"], cwd=ROOT,
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("--changed:", p.stdout)
        self.assertRegex(p.stdout, r"are left to CI|running every test")


class Shares(unittest.TestCase):
    """`--shard K/N` gives each of N computers a share of one run. A test in no share would
    never run, and nothing would say so: the shares together are the whole list, each test once."""

    def test_the_shares_hold_every_test_once(self):
        m = runner_module()
        tests = m.discovered() + [(" ".join(a), a) for a in m.SELF_TESTS]
        tests.sort()
        self.assertGreater(len(tests), 100)
        for n in range(1, 13):
            shares = [m.share(tests, k, n) for k in range(1, n + 1)]
            self.assertEqual(sorted(t for s in shares for t in s), tests,
                             f"{n} shares do not hold every test once")
            self.assertLessEqual(max(map(len, shares)) - min(map(len, shares)), 1)
        self.assertEqual([m.share(list("abc"), k, 5) for k in range(1, 6)], [["a"], ["b"], ["c"], [], []])

    def test_the_option_runs_its_share(self):
        """Through the command, on tests no other test adds to while this one runs."""
        def labels(*args):
            p = subprocess.run([sys.executable, RUNNER, "--list", *args, "kit/cpu/"], cwd=ROOT,
                               capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
            return [ln.split()[1] for ln in p.stdout.splitlines() if ln.startswith("  discovered")], p.stdout
        whole, _ = labels()
        self.assertGreater(len(whole), 3)
        got = []
        for k in (1, 2, 3):
            mine, out = labels("--shard", f"{k}/3")
            self.assertIn(f"--shard: share {k} of 3, {len(mine)} of {len(whole)} test(s)", out)
            got += mine
        self.assertEqual(sorted(got), sorted(whole))

    def test_a_share_that_is_not_one_of_them_is_refused(self):
        for bad in ("0/4", "5/4", "2", "a/b", ""):
            p = subprocess.run([sys.executable, RUNNER, "--list", "--shard", bad], cwd=ROOT,
                               capture_output=True, text=True)
            self.assertEqual(p.returncode, 1, f"--shard {bad!r}: {p.stdout}")
            self.assertNotIn("discovered", p.stdout)


class Times(unittest.TestCase):
    """`--times FILE` starts the longest tests first. It may only change the order."""

    def test_the_longest_start_first_and_one_not_on_record_before_them(self):
        m = runner_module()
        tests = [(x, []) for x in "abcde"]
        order = [t[0] for t in m.longest_first(tests, {"a": 1.0, "c": 30.0, "d": 2.5, "e": 2.5})]
        self.assertEqual(order, ["b", "c", "d", "e", "a"])
        self.assertEqual(m.longest_first(tests, {}), tests)

    def test_a_file_that_is_not_a_run_s_times_counts_for_nothing(self):
        m = runner_module()
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(m.read_times(os.path.join(d, "none.json")), {})
            for text in ("", "not json", "[1, 2]", '{"a": "long"}', "null"):
                path = os.path.join(d, "times.json")
                with open(path, "w") as fh:
                    fh.write(text)
                self.assertEqual(m.read_times(path), {}, text)

    def test_a_run_reports_as_before_and_leaves_its_times(self):
        ran = ("kit/cpu/test_census.py", "kit/cpu/test_m65c02.py")
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "sub", "times.json")
            os.makedirs(os.path.dirname(path))
            # the second is on record as the longer, another test as it was, and one that has gone
            with open(path, "w") as fh:
                json.dump({ran[0]: 0.1, ran[1]: 500.0, "kit/cpu/test_cpu6502.js": 7.5, "kit/gone/test_gone.py": 9.0}, fh)
            plain = subprocess.run([sys.executable, RUNNER, *ran], cwd=ROOT, capture_output=True, text=True)
            timed = subprocess.run([sys.executable, RUNNER, "--times", path, *ran], cwd=ROOT,
                                   capture_output=True, text=True)
            self.assertEqual((plain.returncode, timed.returncode), (0, 0), plain.stdout + timed.stdout)
            said = lambda p: [ln.split()[:2] for ln in p.stdout.splitlines() if ln.startswith("  PASS")]
            self.assertEqual(said(timed), [["PASS", ran[0]], ["PASS", ran[1]]])
            self.assertEqual(said(timed), said(plain))
            with open(path) as fh:
                left = json.load(fh)
            self.assertEqual(sorted(left), sorted(ran + ("kit/cpu/test_cpu6502.js",)))
            self.assertEqual(left["kit/cpu/test_cpu6502.js"], 7.5)
            self.assertLess(left[ran[1]], 500.0)


if __name__ == "__main__":
    unittest.main()
