#!/usr/bin/env python3
"""Run every kit self-test, wherever it lives.

The convention (`AGENTS.md`, "Working on the kit or the site"): a kit test is
a file matching `kit/**/test_*.py` or `kit/**/test_*.js`, or `test_*.py` in a
game's folder beside the page it checks. Run as a script it exercises its own
subject and exits non-zero on failure. A Python test that
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
  test_kit.py [--require-tools] [--list] [--until PATH] [--changed [REF]] [substring ...]
  test_kit.py -h                    this

  --require-tools   export KIT_REQUIRE_TOOLS=1 to every test (CI), so a
                    missing tool fails rather than skips, and count any
                    skip as a failure
  --list            print what would run, and where it lives, without running
  --until PATH      run in discovery order and stop after this one (debugging)
  substring ...     run only the tests whose path contains one of these
  --changed [REF]   run only the tests this branch can affect, and say how many it
                    left out: the check before a commit, since CI runs every test on
                    the pull request (#833). The branch's files are those changed since
                    it left REF (default: the main it was cut from, as check_docs.py
                    finds it), with work not yet committed. A test runs when it is one
                    of them, when it is in a game's folder the branch changes, or when
                    it loads one of them, or loads a file that does, and so on. What a
                    file loads is read from the names in it (Loads, below): paths, file
                    names, imports, a page's scripts. A change to this script runs them
                    all. A test that reaches a changed file by a name it builds as it
                    runs is left out here and runs in CI

Exit status is 1 if any test failed, 0 otherwise. A test that exits 0 but
says it skipped is reported as SKIP, which is not a failure without
`--require-tools` - locally it is the reason to install the tool.
"""
import concurrent.futures
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
    # A game's own test sits beside the page it checks, and the parts of a game that is
    # several loads each get one: both run here, so a page's port cannot quietly drift
    # from the game. Neither pattern reaches the gitignored work/ folder.
    for pat, runner in ((os.path.join("kit", "**", "test_*.py"), [sys.executable]),
                        (os.path.join("games", "*", "*", "test_*.py"), [sys.executable]),
                        (os.path.join("games", "*", "*", "parts", "*", "test_*.py"), [sys.executable]),
                        (os.path.join("kit", "**", "test_*.js"), ["node"]),
                        (os.path.join("games", "*", "*", "test_*.js"), ["node"]),
                        (os.path.join("games", "*", "*", "parts", "*", "test_*.js"), ["node"])):
        for path in sorted(glob.glob(os.path.join(ROOT, pat), recursive=True)):
            if "__pycache__" in path or os.path.basename(path) == "test_kit.py":
                continue        # itself: running it would recurse
            rel = os.path.relpath(path, ROOT)
            out.append((rel, runner + [rel]))
    out.sort()
    return out


# --- the tests a branch can affect (--changed) --------------------------------
SOURCES = (".py", ".js", ".mjs", ".html", ".sh")     # files read for what they load
LITERAL = re.compile(r"""(['"])([^'"\n\\]{1,120})\1""")
RUN = re.compile(r"""(?:['"][^'"\n\\]{1,80}['"]\s*,\s*)+['"][^'"\n\\]{1,80}['"]""")   # the parts of a join
IMPORT = re.compile(r"^\s*(?:from\s+([\w.]+)\s+import\b|import\s+([\w., ]+))", re.M)
DYNAMIC = re.compile(r"\b(?:platform_fn|import_module|__import__)\s*\(([^\n]*)")
SRC = re.compile(r"""\b(?:src|href)\s*=\s*["']([^"'#?]+)""")
MODULE = re.compile(r"[A-Za-z_]\w*$")
GAME_DIR = re.compile(r"^(games/[^/]+/[^/]+)/")
PATTERN = re.compile(r"(?:kit|site|games)/[\w./*-]+$")       # a glob of the repository's files
DATA_DIRS = ("kit/template", "kit/lessons", "kit/skills", "site/icons")


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)


def branch_files(ref=None):
    """(the ref compared with, the files this branch changes since it left it, work not yet
    committed and new files included), or (None, None) with no git or no such ref."""
    if ref is None:
        from skill_edits import base_ref
        ref = base_ref(ROOT)
    mb = git("merge-base", ref, "HEAD")
    if mb.returncode:
        return None, None
    names = git("diff", "--name-only", mb.stdout.strip()).stdout.splitlines()
    names += git("ls-files", "--others", "--exclude-standard").stdout.splitlines()
    return ref, sorted(set(n for n in names if n))


class Loads:
    """What each file loads, read from the names in it: a path in quotes, from the file's own
    folder or the repository's; the parts of a path given to a join; a file name alone, which
    is the one beside the file, or in its game's folder, or else every file of that name in
    kit/ and site/; the end of a path, which is every file of kit/ and site/ that ends so; a
    Python import, and a module's name in quotes where one is loaded by name; a page's
    script, with ../../lib/ read as site/lib/. A folder, or a pattern with * in it, stands
    for every file in it, and what those files load in their turn is not followed. Data
    files are loaded and not read."""

    def __init__(self, files, root=ROOT):
        self.root = root
        self.files = set(files)
        self.dirs = set()
        for f in self.files:
            parts = f.split("/")
            for i in range(1, len(parts)):
                self.dirs.add("/".join(parts[:i]))
        self.named = {}                       # a file name -> the files of kit/ and site/ called it
        for f in self.files:
            if f.split("/")[0] in ("kit", "site"):
                self.named.setdefault(os.path.basename(f), []).append(f)
        self.memo = {}

    def place(self, here, s):
        """The file, folder or pattern a path names from the folder here, or None."""
        if "\0" in s or len(s) > 200:
            return None
        for base in ("",) if s.startswith(("kit/", "site/", "games/")) else (here, ""):
            p = os.path.normpath(os.path.join(base, s)).replace(os.sep, "/")
            if p.startswith("games/lib/"):
                p = "site/" + p[6:]           # a page's ../../lib/, as build.py lays the site out
            if p in self.files:
                return p
            if "*" in p:
                # from the file's own folder only when it names a folder first: a bare "*.json" is any text
                if PATTERN.match(p) and (not base or re.match(r"[\w.-]+/[\w./*-]+$", s)):
                    return p
                continue
            # a folder of data, or deep enough to be one thing's (a game's, a skill's, a
            # platform's fixtures): a folder of scripts is on the path of every test beside it
            if p in self.dirs and (p in DATA_DIRS or p.count("/") >= 2):
                return p + "/"
        return None

    def of(self, rel):
        """The files, folders (ending /) and patterns (holding *) that rel loads itself."""
        if rel in self.memo:
            return self.memo[rel]
        out = self.memo[rel] = set()
        if not rel.endswith(SOURCES):
            return out
        try:
            with open(os.path.join(self.root, rel), encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            return out
        here = os.path.dirname(rel)
        game = (GAME_DIR.match(rel) or [None, None])[1]
        add = lambda p: out.add(p) if p and p != rel else None
        for m in RUN.finditer(text):
            parts = [q[1] for q in LITERAL.findall(m.group(0))]
            for i in range(len(parts) - 1):                     # the longest tail that is a path
                p = self.place(here, "/".join(parts[i:]))
                if p:
                    add(p)
                    break
        for m in DYNAMIC.finditer(text):                        # modules loaded by name
            for _, lit in LITERAL.findall(m.group(1)):
                if MODULE.match(lit):
                    for f in self.named.get(lit + ".py", ()):
                        add(f)
        for _, lit in LITERAL.findall(text):
            if "/" in lit or "*" in lit:
                p = self.place(here, lit) or (lit.startswith("/") and self.place(here, lit.lstrip("/")))   # __dirname + '/x'
                if not p and not os.path.splitext(lit)[1] and lit.startswith("."):
                    p = self.place(here, lit + ".js") or self.place(here, lit + "/index.js")   # require('./x')
                add(p)
                if not p and os.path.splitext(lit)[1] and "*" not in lit:
                    # the end of a path whose start is a variable: require(kit + 'c64/machine.js')
                    tail = "/" + lit.lstrip("./")
                    for f in self.named.get(os.path.basename(lit), ()):
                        if f.endswith(tail):
                            add(f)
            elif os.path.splitext(lit)[1]:
                p = self.place(here, lit)
                if p and "*" not in p:
                    add(p)
                elif game and any(f.startswith(game + "/") and os.path.basename(f) == lit for f in self.files):
                    for f in self.files:
                        if f.startswith(game + "/") and os.path.basename(f) == lit:
                            add(f)
                else:
                    for f in self.named.get(lit, ()):
                        add(f)
        for m in SRC.finditer(text) if rel.endswith(".html") else ():
            add(self.place(here, m.group(1)))
        if rel.endswith(".py"):
            for m in IMPORT.finditer(text):
                for mod in (m.group(1) or m.group(2)).replace(" ", "").split(","):
                    name = mod.split(".")[0].split("as")[0] + ".py" if mod else ""
                    beside = here + "/" + name
                    for f in ([beside] if beside in self.files else self.named.get(name, ())):
                        add(f)
        return out

    def reach(self, rel):
        """Everything rel loads, and what that loads, and so on."""
        seen, todo = set(), [rel]
        while todo:
            for d in self.of(todo.pop()):
                if d not in seen:
                    seen.add(d)
                    if not d.endswith("/") and "*" not in d:
                        todo.append(d)
        return seen


def affected(changed, labels, files=None, root=ROOT):
    """The labels of the tests the changed files can affect (--changed, above). files are the
    repository's, as git lists them, when none are given."""
    if files is None:
        files = [f for f in git("ls-files").stdout.splitlines()
                 + git("ls-files", "--others", "--exclude-standard").stdout.splitlines()
                 if "/work/" not in f]
    loads = Loads(files, root)
    changed = set(changed)
    games = {m.group(1) for m in map(GAME_DIR.match, changed) if m}
    out = set()
    for label in labels:
        rel = label.split(" ")[0].replace(os.sep, "/")
        m = GAME_DIR.match(rel)
        if rel in changed or (m and m.group(1) in games):
            out.add(label)
            continue
        for d in loads.reach(rel):
            if d in changed or (d.endswith("/") and any(c.startswith(d) for c in changed)) \
                    or ("*" in d and any(_glob(d).match(c) for c in changed)):
                out.add(label)
                break
    return out


_GLOBS = {}


def _glob(pattern):
    if pattern not in _GLOBS:
        _GLOBS[pattern] = re.compile("".join(".*" if t == "**" else "[^/]*" if t == "*" else re.escape(t)
                                             for t in re.split(r"(\*\*|\*)", pattern)) + "$")
    return _GLOBS[pattern]


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
    if "-h" in argv or "--help" in argv:
        print(__doc__)
        return 0
    require_tools = "--require-tools" in argv
    argv = [a for a in argv if a != "--require-tools"]
    listed = "--list" in argv
    argv = [a for a in argv if a != "--list"]
    until = None
    for a in list(argv):
        if a.startswith("--until"):
            until = argv[argv.index(a) + 1]
            argv = [x for x in argv if x not in (a, until)]
    changed_only, ref = "--changed" in argv, None
    if changed_only:
        i = argv.index("--changed")
        if i + 1 < len(argv) and not argv[i + 1].startswith("-") and not git("rev-parse", "--verify", "--quiet", argv[i + 1] + "^{commit}").returncode:
            ref = argv.pop(i + 1)
        argv.remove("--changed")
    wanted = [a for a in argv if not a.startswith("-")]

    tests = discovered() + [(a[0] if len(a) == 1 else a[0] + " " + " ".join(a[1:]),
                             [sys.executable] + a) for a in SELF_TESTS]
    tests.sort()
    if changed_only:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        ref, files = branch_files(ref)
        if files is None:
            print("  --changed: no git here, or no main to compare with: running every test")
        elif "kit/scripts/test_kit.py" in files:
            print("  --changed: this branch changes test_kit.py itself: running every test")
        else:
            keep = affected(files, [t[0] for t in tests])
            print(f"  --changed: {len(files)} file(s) changed since the branch left {ref}; {len(keep)} of {len(tests)} "
                  f"test(s) can be affected by them, and the other {len(tests) - len(keep)} are left to CI")
            tests = [t for t in tests if t[0] in keep]
            if not tests and not wanted:
                print("\n0 test(s): nothing this branch changes is named by a test")
                return 0
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

    def report(verdict, label, took, rc, tail):
        if verdict == "FAIL":
            why = f"exit {rc}" if rc else "it skipped, and --require-tools allows no skips"
            print(f"  FAIL  {label}  ({took:.1f}s, {why})")
            for ln in tail[-25:]:
                print("        " + ln)
        else:
            note = "" if verdict == "PASS" else "  (no tool: it said so)"
            print(f"  {verdict}  {label}  ({took:.1f}s){note}")

    results, failed = [], 0
    if until:
        # --until keeps its serial meaning: run in discovery order, stop after it
        ordered = []
        for label, argv_ in tests:
            ordered.append((label, run(label, argv_, require_tools, capture=True)))
            if label == until:
                print(f"  --until {until}: stopping")
                break
    else:
        # each test is its own process, so they run side by side; the report
        # below still comes out in discovery order, not completion order
        workers = min(8, os.cpu_count() or 2)
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            fut = {ex.submit(run, label, argv_, require_tools, True): label
                   for label, argv_ in tests}
            got = {}
            for f in concurrent.futures.as_completed(fut):
                got[fut[f]] = f.result()
        ordered = [(label, got[label]) for label, _ in tests]
    for label, (verdict, rc, took, tail, out) in ordered:
        results.append((verdict, label, took, tail, out))
        if verdict == "FAIL":
            failed += 1
        report(verdict, label, took, rc, tail)

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
