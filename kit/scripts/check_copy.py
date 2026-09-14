#!/usr/bin/env python3
"""Flag the mechanical tells of agent-written copy in a game's article.

A floor, not a judge: it catches the patterns kit/style.md bans. Scans the
text of index.html (tags stripped) and the markdown files that readers see.

Usage: check_copy.py <game dir> [--strict]
Exit 1 when a banned title pattern or more than the allowed number of
tells is found (--strict: any tell).
"""
import html, os, re, sys

PHRASES = [
    r"\bdelve\b", r"\btapestry\b", r"\btestament to\b", r"\bnuanced\b", r"\blandscape\b",
    r"\bjourney\b", r"\bunpack\b", r"\bat its core\b", r"\bcrucially\b", r"\bseamless(ly)?\b",
    r"\brobust\b", r"\bmasterclass\b", r"\bmasterful\b", r"\bingenious\b", r"\belegant(ly)?\b",
    r"\bremarkabl[ey]\b", r"\bfascinating(ly)?\b", r"\bbrilliant(ly)?\b", r"\bgame-?changer\b",
    r"\blet'?s dive\b", r"\bdive in(to)?\b", r"\bhere'?s the thing\b", r"\bbuckle up\b",
    r"\bspoiler alert\b", r"\bin other words\b", r"\bput simply\b", r"\bsimply put\b",
    r"\bit'?s not (just )?[^.]{1,40}, it'?s\b", r"\bnot just [^.]{1,40} but\b", r"\bmore than just\b",
    r"\bisn'?t just\b", r"\bthe result\?", r"\bthe answer\?", r"\bwhy\? because\b",
    r"\bthat'?s where [^.]{1,30} comes in\b", r"\bin the world of\b", r"\bwhether you'?re\b",
    r"\bit'?s worth noting\b", r"\bnotably\b", r"\bimportantly\b", r"\bessentially\b",
]
TITLE_BAD = re.compile(r"^\s*(the\s+)?[\w' ]+\s+(is|are)\s+(a|an|the)?\s*[\w' ]+\s*$", re.I)


def text_of(path):
    s = open(path, encoding="utf-8", errors="replace").read()
    if path.endswith(".html"):
        s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
        s = re.sub(r"<[^>]+>", " ", s)
        s = html.unescape(s)
    return s


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    gdir = argv[0]
    strict = "--strict" in argv
    files = [os.path.join(gdir, f) for f in ("index.html", "facts.md", "features.md", "cheats.md")
             if os.path.exists(os.path.join(gdir, f))]
    hits, fatal = 0, 0
    for path in files:
        s = text_of(path)
        words = max(len(s.split()), 1)
        if path.endswith("index.html"):
            m = re.search(r"<title>(.*?)</title>", open(path, encoding="utf-8", errors="replace").read(), re.S | re.I)
            if m and TITLE_BAD.match(m.group(1)) and not re.search(r"\d", m.group(1)):
                print(f"  x  {path}: title reads as a claim: {m.group(1).strip()!r}. Use the game's name."); fatal += 1
        dashes = s.count("—")
        if dashes / words > 1 / 150:
            print(f"  !  {path}: {dashes} em-dashes in {words} words (more than 1 per 150)"); hits += 1
        for p in PHRASES:
            for m in re.finditer(p, s, re.I):
                ctx = s[max(0, m.start() - 40): m.end() + 40].replace("\n", " ")
                print(f"  !  {os.path.basename(path)}: {m.group(0)!r}  …{ctx.strip()}…"); hits += 1
        qs = len(re.findall(r"\?\s+[A-Z][^.?!]{0,25}[.!]", s))
        if qs > 2:
            print(f"  !  {path}: {qs} rhetorical question-then-short-answer patterns"); hits += 1
    allowed = 0 if strict else 5
    if fatal or hits > allowed:
        print(f"\nFAILED - {fatal} fatal, {hits} tells (allowed {allowed}). See kit/style.md.")
        sys.exit(1)
    print(f"OK - {hits} tell(s), within the allowance of {allowed}")


if __name__ == "__main__":
    main()
