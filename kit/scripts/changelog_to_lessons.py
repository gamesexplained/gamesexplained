#!/usr/bin/env python3
"""Move a branch's kit/CHANGELOG.md entries into kit/lessons/, one file each.

For a branch started before the lessons moved out of kit/CHANGELOG.md.
Merging main into it stops on that file (main deleted it, the branch
changed it); run this from the repository's root, resolve anything else
the merge left, and commit. Entries main already has are dropped. Each
new one becomes kit/lessons/<YYYY-MM-DD>-<slug>.md, its heading's version
set to "next" for the kit-version workflow to number. Then the old file
is removed from the index and the new ones are added, ready to commit.

Usage: changelog_to_lessons.py
"""
import datetime, glob, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OLD = os.path.join(ROOT, "kit", "CHANGELOG.md")
LESSONS = os.path.join(ROOT, "kit", "lessons")


def norm(s):
    return " ".join(s.split())


def main():
    if sys.argv[1:]:
        print(__doc__); return
    if not os.path.exists(OLD):
        print("no kit/CHANGELOG.md here: nothing to move"); return
    known, heads = set(), {}
    for f in glob.glob(os.path.join(LESSONS, "*.md")):
        text = open(f, encoding="utf-8").read()
        if text.startswith("## "):
            head, _, body = text.partition("\n")
            known.add(norm(body))
            heads[head.split(" · ", 1)[-1]] = os.path.relpath(f, ROOT)
    entries = [e for e in re.split(r"(?m)^(?=## )", open(OLD, encoding="utf-8").read()) if e.startswith("## ")]
    added, edited = [], []
    for e in entries:
        head, _, body = e.partition("\n")
        if norm(body) in known:
            continue
        rest = head.split(" · ", 1)[-1]           # date · game · who
        if rest in heads:
            edited.append((head, heads[rest]))
            continue
        date, game = rest.split(" · ")[:2]
        day = datetime.datetime.strptime(date.strip(), "%d %B %Y").strftime("%Y-%m-%d")
        slug = re.sub(r"[^a-z0-9]+", "-", game.lower().replace("'", "")).strip("-")
        name, n = f"{day}-{slug}.md", 2
        while os.path.exists(os.path.join(LESSONS, name)):
            name, n = f"{day}-{slug}-{n}.md", n + 1
        path = os.path.join(LESSONS, name)
        open(path, "w", encoding="utf-8").write(f"## next · {rest}\n\n{body.strip()}\n")
        added.append(os.path.relpath(path, ROOT))
    subprocess.run(["git", "rm", "-q", "-f", "--", os.path.relpath(OLD, ROOT)], cwd=ROOT, check=True)
    if added:
        subprocess.run(["git", "add", "--"] + added, cwd=ROOT, check=True)
    for a in added:
        print(f"  +  {a}")
    print(f"removed kit/CHANGELOG.md; {len(added)} new entr{'y' if len(added) == 1 else 'ies'} moved, "
          f"{len(entries) - len(added) - len(edited)} already in kit/lessons/")
    for head, f in edited:
        print(f"  !  {head[:70]}\n     changes the entry in {f}: make the same change there by hand")
    sys.exit(1 if edited else 0)


if __name__ == "__main__":
    main()
