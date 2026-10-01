#!/usr/bin/env python3
"""The parts of a game that is several programs.

Some games are not one program in memory but several, loaded one after another
over the same RAM: an intro, then each level, then an ending. Each is a whole
64 KB image of its own, so it gets its own symbol map and listing. The game
folder lists them in game.json:

  "parts": [{"id": "intro", "title": "Intro"},
            {"id": "paris", "title": "Paris chase"}, ...]

and each part is a folder, games/<platform>/<slug>/parts/<id>/, laid out as a
small game folder of its own: a game.json with the fields the scripts read for
one image ("video", "coverage", "io", "regions"), symbols.json, listing.json,
facts.md for what is true of that program alone, and a gitignored work/ with
its snapshots (work/entry.vsf is the hand-over, as for any game). Every script
that takes a <game dir> takes a part's folder in its place: symbols_export.py,
listing.py, coverage.py, check_listing.py, r2000.py --game. The game folder
keeps everything about the game as a whole (index.html, features.md,
orientation.md, the top-level facts.md, timings.json); build.py gives each
part its own Source page and footprint, and the game's coverage is the sum of
its parts'.

Usage:
  parts.py <game dir>        list the parts, with each one's coverage
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def parts(gdir, game=None):
    """[{id, title, dir, ...}] for a game made of parts, in game.json's order; [] otherwise."""
    if game is None:
        p = os.path.join(gdir, "game.json")
        game = json.load(open(p)) if os.path.isfile(p) else {}
    out = []
    for p in game.get("parts") or []:
        d = dict(p)
        d["dir"] = os.path.join(gdir, "parts", p["id"])
        d.setdefault("title", p["id"])
        out.append(d)
    return out


def part_game(part):
    """A part's own game.json."""
    return json.load(open(os.path.join(part["dir"], "game.json")))


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    sys.path.insert(0, HERE)
    from coverage import tracked_count
    P = parts(argv[0])
    if not P:
        print(f"{argv[0]}: one program, no parts"); return
    T = E = 0
    for p in P:
        try:
            t, e = tracked_count(p["dir"])
        except FileNotFoundError:
            print(f"  {p['id']:<12} no symbols.json yet"); continue
        T += t; E += e
        print(f"  {p['id']:<12} {e:>6} of {t:>6} bytes explained  {100 * e / t if t else 0:5.1f} %")
    print(f"  {'all':<12} {E:>6} of {T:>6} bytes explained  {100 * E / T if T else 0:5.1f} %")


if __name__ == "__main__":
    main()
