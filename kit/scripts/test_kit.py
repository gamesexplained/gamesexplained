#!/usr/bin/env python3
"""Run every kit self-test, wherever it lives.

The convention (`AGENTS.md`, "Working on the kit or the site"): a kit test is
a file matching `kit/**/test_*.py` or `kit/**/test_*.js`. Run as a script it
exercises its own subject and exits non-zero on failure. A Python test that
needs an installed tool reads `KIT_REQUIRE_TOOLS` from the environment and,
when it is set, FAILS with a clear message instead of skipping when the tool
is missing - so CI cannot pass because an oracle was absent. Under
`--require-tools` a test that skips anyway is a failure too, so a test that
does not read the variable cannot pass CI by skipping. Adding a test needs no
edit here and no edit to `.github/workflows/ci.yml`: it is found.

The older self-tests are `--test` flags on the tools themselves. They stay
where they are and are listed in `SELF_TESTS` below. An entry naming a
script that is not there is a failure here, and so is a kit script that
handles `--test` with no entry, so a renamed tool and a new flag are both
caught. New tests belong in a `test_*.py` file rather than a new flag, so
that this list does not grow.

Usage:
  test_kit.py [--require-tools] [--list] [--until PATH] [substring ...]

  --require-tools   export KIT_REQUIRE_TOOLS=1 to every test (CI), so a
                    missing tool fails rather than skips, and count any
                    skip as a failure
  --list            print what would run, and where it lives, without running
  --until PATH      run in discovery order and stop after this one (debugging)
  substring ...     run only the tests whose path contains one of these

Exit status is 1 if any test failed, 0 otherwise. A test that exits 0 but
says it skipped is reported as SKIP, which is not a failure without
`--require-tools` - locally it is the reason to install the tool.
"""
import glob
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Self-tests that predate the test_*.py convention, in a script they belong to.
SELF_TESTS = [
    ["kit/scripts/edit.py", "--test"],
    ["kit/scripts/skill_usage.py", "--test"],
    ["kit/scripts/maintainer_asks.py", "--test"],
    ["kit/scripts/models.py", "--test"],
    ["kit/c64/snapshot.py", "--test"],
    ["kit/c64/project.py", "--roundtrip"],
    ["kit/spectrum/snapshot.py", "--test"],
    ["kit/spectrum/skoolkit.py", "--test"],
    ["kit/spectrum/codemap.py", "--test"],
    ["kit/spectrum/simulate.py", "--test"],    # needs SkoolKit
    ["kit/spectrum/romcopy.py", "--test"],
    ["kit/spectrum/z80.py"],          # its self-check is what it does with no arguments
]

SKIPPED = re.compile(r"\bskip(ped|ping)?\b", re.I)
HAS_TEST_FLAG = re.compile(r"""["']--test["']""")


def discovered():
    """(label, argv) for every test file, in a stable order."""
    out = []
    for pat, runner in ((os.path.join("kit", "**", "test_*.py"), [sys.executable]),
                        (os.path.join("kit", "**", "test_*.js"), ["node"])):
        for path in sorted(glob.glob(os.path.join(ROOT, pat), recursive=True)):
            if "__pycache__" in path or os.path.basename(path) == "test_kit.py":
                continue        # itself: running it would recurse
            rel = os.path.relpath(path, ROOT)
            out.append((rel, runner + [rel]))
    out.sort()
    return out


def unlisted_self_tests():
    """Kit scripts that handle `--test` but have no SELF_TESTS entry."""
    listed = {a[0] for a in SELF_TESTS}
    out = []
    for path in sorted(glob.glob(os.path.join(ROOT, "kit", "**", "*.py"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        if os.path.basename(path).startswith("test_") or rel in listed:
            continue        # a test_*.py file is discovered, not listed
        with open(path, encoding="utf-8") as fh:
            if HAS_TEST_FLAG.search(fh.read()):
                out.append(rel)
    return out


def check_self_tests():
    ok = True
    missing = [a[0] for a in SELF_TESTS if not os.path.exists(os.path.join(ROOT, a[0]))]
    if missing:
        print("  x  SELF_TESTS names a script that is not there: " + ", ".join(missing))
        print("     fix SELF_TESTS in kit/scripts/test_kit.py")
        ok = False
    unlisted = unlisted_self_tests()
    if unlisted:
        print("  x  these handle --test but SELF_TESTS does not list them: " + ", ".join(unlisted))
        print("     add them to SELF_TESTS in kit/scripts/test_kit.py, or move the test into a test_*.py file")
        ok = False
    return ok


def run(label, argv, require_tools, capture=False):
    env = dict(os.environ)
    env["KIT_REQUIRE_TOOLS"] = "1" if require_tools else ""
    env.pop("KIT_PLATFORM", None)      # a dispatcher test sets this for its own children
    started = time.time()
    p = subprocess.run(argv, cwd=ROOT, env=env, capture_output=True, text=True)
    took = time.time() - started
    out = (p.stdout or "") + (p.stderr or "")
    tail = [ln for ln in out.strip().splitlines() if ln.strip()]
    verdict = "PASS"
    if p.returncode != 0:
        verdict = "FAIL"
    elif tail and SKIPPED.search(tail[-1]):
        # under --require-tools a skip fails, whether or not the test read
        # KIT_REQUIRE_TOOLS itself: CI cannot pass because a tool was absent
        verdict = "FAIL" if require_tools else "SKIP"
    return verdict, p.returncode, took, tail, out if capture else ""


def main(argv):
    require_tools = "--require-tools" in argv
    argv = [a for a in argv if a != "--require-tools"]
    listed = "--list" in argv
    argv = [a for a in argv if a != "--list"]
    until = None
    for a in list(argv):
        if a.startswith("--until"):
            until = argv[argv.index(a) + 1]
            argv = [x for x in argv if x not in (a, until)]
    wanted = [a for a in argv if not a.startswith("-")]

    tests = discovered() + [(a[0] if len(a) == 1 else a[0] + " " + " ".join(a[1:]),
                             [sys.executable] + a) for a in SELF_TESTS]
    tests.sort()
    if wanted:
        tests = [t for t in tests if any(w in t[0] for w in wanted)]

    if listed:
        for label, argv_ in tests:
            kind = "self-test" if argv_[1:] in SELF_TESTS else "discovered"
            print(f"  {kind:10} {label}")
        print(f"\n{len(tests)} test(s)")
        return 0

    if not check_self_tests():
        return 1
    if not tests:
        print(f"  x  nothing matched {wanted!r}")
        return 1

    results, failed = [], 0
    for label, argv_ in tests:
        verdict, rc, took, tail, out = run(label, argv_, require_tools, capture=True)
        results.append((verdict, label, took, tail, out))
        if verdict == "FAIL":
            failed += 1
            why = f"exit {rc}" if rc else "it skipped, and --require-tools allows no skips"
            print(f"  FAIL  {label}  ({took:.1f}s, {why})")
            for ln in tail[-25:]:
                print("        " + ln)
        else:
            note = "" if verdict == "PASS" else "  (no tool: it said so)"
            print(f"  {verdict}  {label}  ({took:.1f}s){note}")
        if until and label == until:
            print(f"  --until {until}: stopping")
            break

    slow = [r for r in results if r[2] > 60]
    if slow:
        print("\n  over 60 seconds:")
        for v, label, took, _, _ in slow:
            print(f"    {label}  {took:.0f}s")
    skipped = [r for r in results if r[0] == "SKIP"]
    if skipped:
        print("\n  skipped (install the tool to run the whole check):")
        for _, label, _, tail, _ in skipped:
            print(f"    {label}: {tail[-1][:100] if tail else ''}")

    print(f"\n{len(results)} test(s): "
          f"{sum(1 for r in results if r[0] == 'PASS')} passed, "
          f"{len(skipped)} skipped, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
