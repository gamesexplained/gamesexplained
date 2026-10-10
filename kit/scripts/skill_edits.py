#!/usr/bin/env python3
"""A game's branch adds to a core skill only for a lesson another game shares.

The retrospective (kit/skills/core/80-retro, step 3) edits a skill for a silent failure
only when another game folder can be named where it would have mattered; a lesson only
this game shows goes under "Candidates" until a second game meets it. Step 4 has the
game's kit-feedback.md, under "What was changed in the kit", name both for each core
skill it adds to:

  - `kit/skills/core/50-coverage`: resolve pointer tables before excluding a region;
    the same miss is in `games/c64/wizard`'s agent-history.md

A branch is a game's when it changes the game's kit-feedback.md, as a retrospective
does. Other branches (the kit's, or a sweep across games), and edits that only cut
text, are not checked. The branch is compared with its merge base with
$GITHUB_BASE_REF (set by CI on a pull request), else with whichever of origin/main,
another remote's main (a fork's upstream) and the local main it was cut from last;
with no git or no such ref there is nothing to compare, and nothing fails.

Usage: skill_edits.py [<base ref>]    exit 1 on a problem
No dependencies.
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HEADING = "## What was changed in the kit"
GAME = re.compile(r"games/([\w.-]+)/([\w.-]+)")
SKILL = re.compile(r"^kit/skills/core/([^/]+)/")


def git(*args, root=ROOT):
    return subprocess.run(["git", "-C", root, *args], capture_output=True, text=True)


def changed(base, root=ROOT):
    """{path: lines added} on this branch since its merge base with base, or None."""
    mb = git("merge-base", base, "HEAD", root=root)
    if mb.returncode:
        return None
    out = git("diff", "--numstat", mb.stdout.strip(), "--", root=root).stdout
    files = {}
    for ln in out.splitlines():
        added, _, path = ln.split("\t", 2)
        files[path] = int(added) if added.isdigit() else 0
    return files


def section(path):
    """The lines under "What was changed in the kit", continuations joined."""
    if not os.path.exists(path):
        return []
    lines, out, inside = open(path, encoding="utf-8").read().splitlines(), [], False
    for ln in lines:
        if ln.startswith("#"):
            inside = ln.strip().lower() == HEADING.lower()
            continue
        if inside and ln.strip():
            if out and ln[:1].isspace() and not re.match(r"\s*[-*]\s", ln):
                out[-1] += " " + ln.strip()
            else:
                out.append(ln.strip())
    return out


def problems(files, root=ROOT):
    """(skill folder, message) for each core skill added to with no other game named."""
    games = sorted({m.group(0) for p in files for m in [GAME.match(p)]
                    if m and p == m.group(0) + "/kit-feedback.md"})
    skills = sorted({"kit/skills/core/" + m.group(1) for p, n in files.items()
                     for m in [SKILL.match(p)] if m and n and p.endswith(".md")})
    if not games or not skills:
        return []
    out = []
    for skill in skills:
        named = []
        for g in games:
            for ln in section(os.path.join(root, g, "kit-feedback.md")):
                if skill in ln:
                    named += [m.group(0) for m in GAME.finditer(ln)
                              if m.group(0) != g and os.path.isdir(os.path.join(root, m.group(0)))]
        if not named:
            out.append((skill, f"adds to {skill} with no other game named: a line under "
                        f"\"What was changed in the kit\" in kit-feedback.md names {skill} and the games/<platform>/<slug> folder where it would also "
                        f"have mattered, or the lesson goes under \"Candidates\" (kit/skills/core/80-retro, step 3)"))
    return out


def base_ref(root=ROOT):
    """The ref this branch is compared with: origin/$GITHUB_BASE_REF on a pull request. Else,
    of origin/main, each other remote's main and the local main, the one whose merge base with
    HEAD is the newest, the commit the branch was cut from. A fork's origin/main can lag the
    main a branch was cut from, and upstream's changes since then then read as the branch's
    own: Qix's fork was at kit 0.0.115 with the branch cut from 0.0.124, and check_docs.py
    failed it for three core skills it had not touched (#308). The local main is left out
    while it is the branch itself."""
    if os.environ.get("GITHUB_BASE_REF"):
        return "origin/" + os.environ["GITHUB_BASE_REF"]
    remotes = git("remote", root=root).stdout.split()
    refs = ["origin/main"] + [f"{r}/main" for r in remotes if r != "origin"]
    if git("symbolic-ref", "--quiet", "--short", "HEAD", root=root).stdout.strip() != "main":
        refs.append("main")
    best, newest = "origin/main", None
    for ref in refs:
        mb = git("merge-base", ref, "HEAD", root=root)
        if mb.returncode:
            continue
        mb = mb.stdout.strip()
        if newest is None or (mb != newest and not git("merge-base", "--is-ancestor", newest, mb, root=root).returncode):
            best, newest = ref, mb
    return best


def check(base=None, root=ROOT):
    """Print each problem; return how many."""
    files = changed(base or base_ref(root), root)
    found = problems(files, root) if files else []
    for skill, msg in found:
        print(f"  x  {skill}  {msg}")
    return len(found)


if __name__ == "__main__":
    sys.exit(1 if check(sys.argv[1] if len(sys.argv) > 1 else None) else 0)
