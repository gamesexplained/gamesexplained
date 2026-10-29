#!/usr/bin/env python3
"""The Discoveries sections that ledger.md has no entry for yet.

Each section is named by the link a reader would follow to it,
https://<domain>/<platform>/<slug>/discoveries.html#<id>, with the id build.py
gives it. An entry in ledger.md is that link anywhere in the file.

Usage: todo.py [games/<platform>/<slug> ...]     every game when none is given
No dependencies beyond kit/scripts.
"""
import glob, html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
from build import pagenav   # noqa: E402  the ids the published page carries

ITEM = re.compile(r'<li><a href="#([^"]+)"><span class="n">[^<]*</span><span class="h">'
                  r'(?:<span class="k (\w+)">\w+</span> )?(.*?)</span></a></li>')


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


def main():
    games = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "")))
    done = set(re.findall(r"https://[^\s)\]>]+?/discoveries\.html#[\w-]+",
                          open(os.path.join(HERE, "ledger.md"), encoding="utf-8").read()))
    left = [(link, h) for g in games for link, h in sections(g) if link not in done]
    for link, heading in left:
        print(f"{link}\n    {heading}")
    print(f"{len(left)} to look up", file=sys.stderr)


if __name__ == "__main__":
    main()
