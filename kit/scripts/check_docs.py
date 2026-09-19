#!/usr/bin/env python3
"""Keep knowledge in its place.

  AGENTS.md          agent rules only: no platform or game subject matter
  kit/skills/core/       workflow only: no game names
  kit/skills/<platform>/ platform facts only: no game names
  games/*/*/facts.md, features.md   current truth, no narration of past mistakes

Usage: check_docs.py      exit 1 on failure
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SUBJECT = [r"\$[0-9A-Fa-f]{4}\b", r"\bSID\b", r"\bVIC-?II\b", r"\b6502\b", r"\bcharset\b",
           r"\bsprites?\b", r"\bscreen RAM\b", r"\bzero page\b"]
NARRATION = [r"\bcorrect(ed|ion)\b", r"\bretract", r"\bmislabell?ed\b", r"\bmisread\b",
             r"\bwe (previously|originally|earlier|first)\b",
             r"\b(earlier|previous|first) (guess|assumption|annotation|reading)\b",
             r"\bturned out to be wrong\b", r"\bwas wrong\b", r"\bwritten off as\b",
             r"\bfound and fixed\b", r"\bused to (say|be labelled)\b"]
EXEMPT = re.compile(r"^\s*\|.*(kit/|skills/|games/)")


def scan(path, patterns, label, exempt=None):
    bad = 0
    for n, line in enumerate(open(path, encoding="utf-8", errors="replace"), 1):
        if exempt and exempt.match(line):
            continue
        for p in patterns:
            m = re.search(p, line, re.I)
            if m:
                print(f"  x  {os.path.relpath(path, ROOT)}:{n}  {label}: {m.group(0)!r}")
                print(f"        {line.strip()[:88]}")
                bad += 1
                break
    return bad


def main():
    fails = 0
    fails += scan(os.path.join(ROOT, "AGENTS.md"), SUBJECT, "subject matter in the rules file", EXEMPT)
    titles = []
    for gj in glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json")):
        try:
            t = json.load(open(gj)).get("title")
            if t and len(t) > 3:
                titles.append(r"\b" + re.escape(t) + r"\b")
        except Exception:
            pass
    if titles:
        for sk in glob.glob(os.path.join(ROOT, "kit", "skills", "*", "*", "*.md")):
            fails += scan(sk, titles, "a specific game named in a reusable skill")
    for f in glob.glob(os.path.join(ROOT, "games", "*", "*", "facts.md")) + \
             glob.glob(os.path.join(ROOT, "games", "*", "*", "features.md")):
        fails += scan(f, NARRATION, "narrating a past mistake (belongs in agent-history.md)")
    if fails:
        print(f"\nFAILED - {fails} issue(s). Rules in AGENTS.md; workflow in kit/skills/core; platform in kit/skills/<platform>; game facts in games/.")
        sys.exit(1)
    print("OK - knowledge is where it belongs")


if __name__ == "__main__":
    main()
