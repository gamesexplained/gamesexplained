#!/usr/bin/env python3
"""The "Maintainer asks" in a game's kit-feedback.md: check them, file them.

A run files each ask as a kit-ask issue itself when it can, and lists it
by number. When it cannot (a cloud session on the contributor's fork never
can), it writes the ask in full, and the repository files it once the
file reaches main (.github/workflows/maintainer-asks.yml). Each bullet in
the section takes one of two forms:

  - #123: the ask in one line                      filed
  - **The ask, in one line.** The problem and      not filed yet: the bold
    what it cost the run; what to change, and      opening is the issue's
    where in the kit.                              title, the rest its body

Prose around the bullets is free. `check` fails a bullet in neither form,
so a run learns of a malformed ask in the pull request's checks, not after
the merge. `file` files the bold asks that a push to main added (an ask
already on main, or whose title an issue already has, is left alone) and
comments their numbers on the pull request that brought them.

Usage: maintainer_asks.py check [FILE...]   check the section (default:
                                            every game's kit-feedback.md)
       maintainer_asks.py file BEFORE AFTER file the asks added between two
                                            commits; needs gh, GH_REPO
       maintainer_asks.py --test            self-test
"""
import glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HEADING = re.compile(r"^##\s+Maintainer asks\s*$", re.I)
BULLET = re.compile(r"^[-*]\s+(.*)$")
FILED = re.compile(r"^#\d+\b")
ASK = re.compile(r"^\*\*(.+?)\*\*\s*(.*)$", re.S)


def bullets(text):
    """(line number, text) of each top-level bullet under the heading, continuation lines joined."""
    out, cur, inside = [], None, False
    for n, line in enumerate(text.split("\n"), 1):
        if HEADING.match(line):
            inside, cur = True, None
            continue
        if not inside:
            continue
        if line.startswith("#"):
            break
        m = BULLET.match(line)
        if m:
            cur = [n, m.group(1).strip()]
            out.append(cur)
        elif not line.strip():
            continue
        elif cur and line[:1].isspace():
            cur[1] += " " + line.strip()
        else:
            cur = None                       # prose after the bullets
    return [tuple(b) for b in out]


def asks(text):
    """The asks not filed yet: [{title, body}], body being the whole bullet."""
    out = []
    for _, b in bullets(text):
        m = ASK.match(b)
        if m and not FILED.match(b):
            out.append({"title": m.group(1).strip().rstrip(".:").strip(), "body": b})
    return out


def problems(text):
    return [(n, b) for n, b in bullets(text) if not (FILED.match(b) or ASK.match(b))]


def check(files):
    bad = 0
    for f in files:
        for n, b in problems(open(f, encoding="utf-8").read()):
            print(f"  x  {os.path.relpath(f, ROOT)}:{n}  a maintainer ask in neither form: "
                  f"'- #123: ...' once filed, '- **The ask.** ...' to be filed on merge")
            print(f"        - {b[:84]}")
            bad += 1
    return bad


def git_show(rev, path):
    r = subprocess.run(["git", "show", f"{rev}:{path}"], cwd=ROOT, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ""


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def file_between(before, after):
    repo = os.environ["GH_REPO"]
    changed = subprocess.run(["git", "diff", "--name-only", before, after, "--", "games/*/*/kit-feedback.md"],
                             cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    todo = []
    for path in changed:
        old = {a["title"].lower() for a in asks(git_show(before, path))}
        todo += [(path, a) for a in asks(git_show(after, path)) if a["title"].lower() not in old]
    if not todo:
        print("No new maintainer asks.")
        return 0
    titles = {i["title"].strip().lower(): i["number"] for i in
              json.loads(gh("issue", "list", "--state", "all", "--limit", "5000", "--json", "number,title"))}
    pulls = json.loads(gh("api", f"repos/{repo}/commits/{after}/pulls"))
    pr = pulls[0] if pulls else None
    filed = []
    for path, a in todo:
        if a["title"].lower() in titles:
            print(f"skipped, #{titles[a['title'].lower()]} has this title: {a['title']}")
            continue
        source = (f"From [`{path}`](https://github.com/{repo}/blob/main/{path})"
                  + (f", in #{pr['number']} by @{pr['user']['login']}" if pr else "")
                  + ". Filed by the repository because the run could not file it.")
        url = gh("issue", "create", "--title", a["title"], "--label", "kit-ask",
                 "--body", f"{a['body']}\n\n{source}\n\n<!-- kit-ask -->\n").strip()
        titles[a["title"].lower()] = url.rsplit("/", 1)[-1]
        filed.append(f"- #{titles[a['title'].lower()]}: {a['title']}")
        print(f"filed {url}")
    if pr and filed:
        gh("pr", "comment", str(pr["number"]), "--body",
           "The maintainer asks in this pull request are filed as `kit-ask` issues:\n\n" + "\n".join(filed)
           + "\n\nA later edit to `kit-feedback.md` can list them by number.")
    return 0


def test():
    text = """# X — kit feedback

## Maintainer asks

Filed where the session could; the rest below.

- #82: check-emulator: say "start the emulator first"
- #44, a comment with this run's case
- **Prefix the classes in `site.css`.** A page's own `.strip` collided
  with the site's, and the picker collapsed.
- **Say how to load a bare .prg**. Nothing in the kit does.

1. a numbered detail, not an ask
   that runs on

## What cost the most time

- **Not an ask.** Another section.
"""
    got = asks(text)
    assert [a["title"] for a in got] == ["Prefix the classes in `site.css`", "Say how to load a bare .prg"], got
    assert got[0]["body"].endswith("the picker collapsed."), got[0]
    assert problems(text) == []
    bad = "## Maintainer asks\n\n- `models.py` rejects the id\n- #12: fine\n"
    assert [n for n, _ in problems(bad)] == [3], problems(bad)
    assert asks("## Maintainer asks\n\nNone.\n") == [] and asks("no section\n- **x** y\n") == []
    print("maintainer_asks: ok")
    return 0


def main(argv):
    if argv[:1] == ["--test"]:
        return test()
    if argv[:1] == ["check"]:
        files = argv[1:] or sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "kit-feedback.md")))
        bad = check(files)
        print("FAILED" if bad else "OK - maintainer asks are in a form the repository can file")
        return 1 if bad else 0
    if argv[:1] == ["file"] and len(argv) == 3:
        return file_between(argv[1], argv[2])
    print(__doc__)
    return 0 if argv[:1] in (["-h"], ["--help"]) else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
