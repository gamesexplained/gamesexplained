#!/usr/bin/env python3
"""File a merged pull request's "Maintainer asks" as kit-ask issues.

A run that cannot file its asks itself (no yes from the contributor, or a
session whose GitHub access stops at the contributor's fork) writes them
into the pull request's description instead (kit/skills/core/80-retro):

  ## Maintainer asks

  - **The ask, in one line.** The problem and what it cost the run; what
    to change, and where in the kit.
  - **The next ask.** ...

When the pull request merges, .github/workflows/maintainer-asks.yml runs
`file` and each bullet becomes an issue labelled kit-ask, so nobody files
them by hand. The bold opening is the title; without one, the first
sentence is. A bullet that opens with an issue number (`#143`) was filed
already and is skipped, as is an ask whose title matches an existing
kit-ask issue, and the whole pull request when an issue carries its
marker <!-- from-pr: N --> (a maintainer filed its asks by hand).

Usage: maintainer_asks.py parse FILE    print the issues FILE's section would
                                        file, as JSON (FILE - reads stdin);
                                        an agent checks its description here
       maintainer_asks.py file          file them, in the workflow: reads
                                        PR_NUMBER, PR_BODY, PR_AUTHOR,
                                        PR_BRANCH, GH_REPO; needs gh
       maintainer_asks.py --test        self-test
"""
import json, os, re, subprocess, sys

HEADING = re.compile(r"^#{1,4}\s*\**\s*maintainer asks\s*\**\s*:?\s*$", re.I)
ANY_HEADING = re.compile(r"^#{1,6}\s")
BULLET = re.compile(r"^[-*]\s+(.*)$")
BOLD_OPENING = re.compile(r"^\*\*(.+?)\*\*\s*(.*)$", re.S)
ALREADY_FILED = re.compile(r"^(\*\*)?(#\d+|https://github\.com/\S+/issues/\d+)\b")
TITLE_MAX = 120


def asks(body):
    """The bullets under the Maintainer asks heading, each as one string."""
    items, cur, inside, blank = [], None, False, False
    for line in (body or "").replace("\r\n", "\n").split("\n"):
        if HEADING.match(line.strip()):
            inside, cur, blank = True, None, False
            continue
        if not inside:
            continue
        if ANY_HEADING.match(line):
            break
        m = BULLET.match(line)
        if m:
            cur = [m.group(1).strip()]
            items.append(cur)
        elif not line.strip():
            blank = True
            continue
        elif cur is not None and (line[:1].isspace() or not blank):
            cur.append(line.strip())
        else:
            cur = None                        # a paragraph that is not an ask: the footer, a note
        blank = False
    return [" ".join(i) for i in items if i and i[0]]


def title_of(text):
    m = BOLD_OPENING.match(text)
    t = m.group(1) if m else re.split(r"(?<=[.!?])\s", text, 1)[0]
    t = t.strip().rstrip(".:").strip()
    return t if len(t) <= TITLE_MAX else t[:TITLE_MAX - 1].rstrip() + "…"


def issues(body, pr=None, author=None, branch=None, repo=None):
    out = []
    for text in asks(body):
        if ALREADY_FILED.match(text):
            continue
        where = f"#{pr}" if pr else "the pull request"
        source = (f"From the \"Maintainer asks\" in {where}"
                  + (f" (`{branch}`" + (f", by @{author}" if author else "") + ")" if branch else "")
                  + ", filed by the repository when it merged.")
        out.append({"title": title_of(text),
                    "body": f"{text}\n\n{source}\n\n<!-- kit-ask -->\n<!-- from-pr: {pr} -->\n"})
    return out


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def file_from_env():
    pr, body = os.environ["PR_NUMBER"], os.environ.get("PR_BODY", "")
    todo = issues(body, pr, os.environ.get("PR_AUTHOR"), os.environ.get("PR_BRANCH"))
    if not todo:
        print(f"#{pr} has no maintainer asks to file.")
        return 0
    existing = json.loads(gh("issue", "list", "--state", "all", "--limit", "2000",
                             "--json", "number,title,body"))
    marker = f"<!-- from-pr: {pr} -->"
    done = [e["number"] for e in existing if marker in (e.get("body") or "")]
    if done:
        print(f"#{pr}'s asks were filed already: " + ", ".join(f"#{n}" for n in sorted(set(done))))
        return 0
    titles = {e["title"].strip().lower(): e["number"] for e in existing}
    filed, skipped = [], []
    for i in todo:
        if i["title"].lower() in titles:
            skipped.append((i["title"], titles[i["title"].lower()]))
            continue
        url = gh("issue", "create", "--title", i["title"], "--body", i["body"],
                 "--label", "kit-ask").strip()
        filed.append((i["title"], url.rsplit("/", 1)[-1]))
        print(f"filed #{filed[-1][1]}: {i['title']}")
    lines = [f"- #{n}: {t}" for t, n in filed] + [f"- #{n} (already open): {t}" for t, n in skipped]
    gh("pr", "comment", pr, "--body",
       "The maintainer asks in this pull request's description are filed as `kit-ask` issues:\n\n"
       + "\n".join(lines))
    return 0


def test():
    pr136 = ("Delta, a run.\r\n\r\n## What is in it\r\n- not an ask\r\n\r\n## Maintainer asks\r\n"
             "- **Prefix the classes in `site/lib/site.css`.** Delta's page had its own `.strip`\r\n"
             "  class, which collapsed.\r\n"
             "- **`pause-at-instruction` fails in `check-emulator`.** Every stop fell back.\r\n\r\n"
             "🤖 Generated with [Claude Code](https://claude.com/claude-code)\r\n\r\n"
             "https://claude.ai/code/session_x")
    got = issues(pr136, 136, "someone", "game/c64/delta")
    assert [i["title"] for i in got] == ["Prefix the classes in `site/lib/site.css`",
                                        "`pause-at-instruction` fails in `check-emulator`"], got
    assert "collapsed." in got[0]["body"] and "Generated" not in got[1]["body"], got
    assert "<!-- kit-ask -->" in got[0]["body"] and "<!-- from-pr: 136 -->" in got[0]["body"]
    assert "@someone" in got[0]["body"] and "`game/c64/delta`" in got[0]["body"]
    plain = "### Maintainer asks\n\n* A sentence title. And more.\n* #12: filed already\n\n## Next\n- no"
    assert [i["title"] for i in issues(plain, 1)] == ["A sentence title"]
    assert issues("## Maintainer asks\n\nNone.\n", 1) == []
    assert issues("no section at all\n- **x** y", 1) == []
    long = "## Maintainer asks\n- " + "word " * 60
    assert len(issues(long, 1)[0]["title"]) == TITLE_MAX
    print("maintainer_asks: ok")
    return 0


def main(argv):
    if argv[:1] == ["--test"]:
        return test()
    if argv[:1] == ["file"]:
        return file_from_env()
    if argv[:1] == ["parse"] and len(argv) == 2:
        text = sys.stdin.read() if argv[1] == "-" else open(argv[1], encoding="utf-8").read()
        print(json.dumps(issues(text, "N"), indent=2, ensure_ascii=False))
        return 0
    print(__doc__)
    return 0 if argv[:1] in (["-h"], ["--help"]) else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
