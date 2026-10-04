#!/usr/bin/env python3
"""Keep knowledge in its place.

  AGENTS.md          agent rules only: no platform or game subject matter
  kit/skills/core/       workflow only: no game names
  kit/skills/<platform>/ platform facts only: no game names
  games/*/*/facts.md, features.md   current truth, no narration of past mistakes
  games/*/*/kit-feedback.md   the skill text that changed what the run did, named in the
                     form skill_usage.py counts, or "None." (kit/skills/core/80-retro, step 1)
  kit/lessons/       one entry a file, under one heading that names the game that taught it
  games/, kit/, site/, AGENTS.md, README.md   no path on the contributor's computer:
                     a home folder usually names a person, and helps nobody else
  games/*/*/game.json   Silver or above only on proven models, or checked (models.py)
  games/*/*/kit-feedback.md   each maintainer ask filed (#123) or fileable (maintainer_asks.py)

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
HOME = [r"(?<![\w.-])/(Users|home)/[^/\s\"'<>`]+", r"\b[A-Z]:[\\/]Users[\\/]"]   # macOS, Linux, Windows


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
        for f in sorted(glob.glob(os.path.join(ROOT, "kit", "lessons", "*.md"))):
            if os.path.basename(f) == "README.md":
                continue
            rel = os.path.relpath(f, ROOT)
            lines = open(f, encoding="utf-8").read().splitlines()
            heads = [ln for ln in lines if ln.startswith("## ")]
            if len(heads) != 1 or not re.match(r"## (next|\d+\.\d+\.\d+) · ", lines[0] if lines else ""):
                print(f"  x  {rel}  a lesson file is one entry: its first line, and its only '## ' line, is")
                print(f"        ## next · <date> · <game> · <who>   (the kit-version workflow numbers 'next')")
                fails += 1
            elif not any(re.search(t, heads[0]) for t in titles):
                print(f"  x  {rel}  a lesson that names no game: every lesson comes from one")
                print(f"        {heads[0].strip()[:88]}")
                fails += 1
    if os.path.exists(os.path.join(ROOT, "kit", "CHANGELOG.md")):
        print("  x  kit/CHANGELOG.md  lessons are one file each in kit/lessons/, so pull requests never")
        print("        conflict over them: python3 kit/scripts/changelog_to_lessons.py moves this branch's")
        fails += 1
    for f in glob.glob(os.path.join(ROOT, "games", "*", "*", "facts.md")) + \
             glob.glob(os.path.join(ROOT, "games", "*", "*", "features.md")):
        fails += scan(f, NARRATION, "narrating a past mistake (belongs in agent-history.md)")
    published = [os.path.join(ROOT, f) for f in ("AGENTS.md", "README.md")]
    for top in ("games", "kit", "site"):
        for d, dirs, files in os.walk(os.path.join(ROOT, top)):
            dirs[:] = [x for x in dirs if x != "work"]   # gitignored, but for its README
            published += [os.path.join(d, f) for f in files if f.endswith((".md", ".json", ".html", ".js", ".css"))]
        published += glob.glob(os.path.join(ROOT, top, "*", "*", "work", "README.md"))
    for f in sorted(set(published)):
        fails += scan(f, HOME, "a path on the contributor's computer (name where it can be had instead)")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from skill_usage import parse as named_skill_text
    for f in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "kit-feedback.md"))):
        for n, msg in named_skill_text(f)["problems"]:   # the words themselves: skill_usage.py --game
            print(f"  x  {os.path.relpath(f, ROOT)}:{n}  skill text that changed what I did: {msg}")
            fails += 1
    from models import check as models_check
    fails += models_check()
    from maintainer_asks import check as asks_check
    fails += asks_check(sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "kit-feedback.md"))))
    if fails:
        print(f"\nFAILED - {fails} issue(s). Rules in AGENTS.md; workflow in kit/skills/core; platform in kit/skills/<platform>; game facts in games/.")
        sys.exit(1)
    print("OK - knowledge is where it belongs")


if __name__ == "__main__":
    main()
