#!/usr/bin/env python3
"""The Discoveries sections not yet searched for, or the possible firsts among those that were.

Each section is named by the link a reader would follow to it,
https://<domain>/<platform>/<slug>/discoveries.html#<id>, with the id build.py
gives it. A section has been searched for when that link is in the "## Known
before" section of the game's facts.md.

Usage: todo.py [--firsts] [games/<platform>/<slug> ...]     every game when none is given
  --firsts   print the None found and Partly known entries instead, game by game
No dependencies beyond kit/scripts.
"""
import glob, html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
from build import pagenav   # noqa: E402  the ids the published page carries

ITEM = re.compile(r'<li><a href="#([^"]+)"><span class="n">[^<]*</span><span class="h">'
                  r'(?:<span class="k (\w+)">\w+</span> )?(.*?)</span></a></li>')
LINK = re.compile(r"https://[^\s)\]>]+?/discoveries\.html#[\w-]+")


def sections(game):
    """(link, heading) for each section of a game's Discoveries tab, in page order."""
    page = os.path.join(game, "discoveries.html")
    if not os.path.exists(page):
        return []
    domain = json.load(open(os.path.join(ROOT, "site", "config.json")))["domain"]
    platform, slug = os.path.normpath(game).split(os.sep)[-2:]
    nav = pagenav(open(page, encoding="utf-8").read())
    return [(f"https://{domain}/{platform}/{slug}/discoveries.html#{html.unescape(sid)}",
             (tag.capitalize() + ": " if tag else "") + html.unescape(text))
            for sid, tag, text in ITEM.findall(nav)]


def known_before(game):
    """The bullets of the "## Known before" section of the game's facts.md."""
    path = os.path.join(game, "facts.md")
    text = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    m = re.search(r"^## Known before\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    return re.findall(r"^- .*(?:\n  .*)*", m.group(1), re.M) if m else []


def main():
    args = sys.argv[1:]
    firsts = "--firsts" in args
    games = [a for a in args if a != "--firsts"] or sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "")))
    count = 0
    for g in games:
        entries = known_before(g)
        if firsts:
            new = [e for e in entries if e.startswith(("- **None found.**", "- **Partly known.**"))]
            if new:
                title = json.load(open(os.path.join(g, "game.json"))).get("title", g)
                print(f"{title} ({os.path.normpath(g).split(os.sep)[-2]})\n" + "\n".join(new) + "\n")
            count += len(new)
            continue
        done = {link for e in entries for link in LINK.findall(e)}
        for link, heading in sections(g):
            if link not in done:
                print(f"{link}\n    {heading}")
                count += 1
    print(f"{count} {'possible firsts' if firsts else 'to look up'}", file=sys.stderr)


if __name__ == "__main__":
    main()
