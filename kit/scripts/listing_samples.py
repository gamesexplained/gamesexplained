#!/usr/bin/env python3
"""Whether each game's last sample of listing comments is within the pass mark.

60-verify draws a sample of the listing's comments, has an agent that wrote
none of them check it, and audits the whole listing when the sample fails.
game.json's `listing_samples` lists every sample in order, each as
{"seed": ..., "size": 60, "wrong": 2, "checker": "<model id>"}. A sample
passes when it holds at least 60 comments and at most one in 30 is wrong
(2 in 60). A game at Silver or above needs its last sample to pass.

Games whose game.json has no `listing_samples` key were made before the rule
and are not checked; the template carries the key, so every game started
since then is.

Usage:
  listing_samples.py         every game's samples, and whether the last passes
  listing_samples.py check   exit 1 if a game fails the rule (check_docs.py runs it)
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SILVER_UP = ("silver", "silver-claimed", "gold", "platinum")
MIN_SIZE = 60


def passes(sample):
    """At least 60 comments, and at most one in 30 of them wrong."""
    return sample["size"] >= MIN_SIZE and sample["wrong"] * 30 <= sample["size"]


def problems(game):
    """What is wrong with one game.json's `listing_samples`, as sentences; empty when nothing is."""
    if "listing_samples" not in game:
        return []
    samples = game["listing_samples"]
    if not isinstance(samples, list):
        return ["listing_samples is a list of samples"]
    out = []
    for n, s in enumerate(samples, 1):
        ok = isinstance(s, dict) and "seed" in s and isinstance(s.get("size"), int) and s["size"] > 0 \
            and isinstance(s.get("wrong"), int) and 0 <= s["wrong"] <= s["size"] \
            and isinstance(s.get("checker"), str) and s["checker"].strip()
        if not ok:
            out.append(f'sample {n} is not {{"seed": ..., "size": <comments>, "wrong": <how many>, '
                       f'"checker": "<model id>"}}')
    if out or game.get("tier") not in SILVER_UP:
        return out
    if not samples:
        return ["Silver or above with no sample of the listing's comments"]
    last = samples[-1]
    if not passes(last):
        return [f"the last sample has {last['wrong']} wrong in {last['size']}: Silver needs at most one in 30, "
                f"in a sample of at least {MIN_SIZE}; audit the listing and draw a new sample"]
    return []


def games(root=None):
    for gj in sorted(glob.glob(os.path.join(root or ROOT, "games", "*", "*", "game.json"))):
        try:
            yield os.path.dirname(gj), json.load(open(gj))
        except (OSError, ValueError):
            continue


def check(root=None):
    fails = 0
    for gdir, g in games(root):
        for why in problems(g):
            print(f"  x  {os.path.relpath(gdir, root or ROOT)}/game.json  {why} (kit/skills/core/60-verify)")
            fails += 1
    return fails


def main(argv):
    if argv[:1] == ["check"]:
        sys.exit(1 if check() else 0)
    if argv:
        print(__doc__)
        sys.exit(2)
    for gdir, g in games():
        if "listing_samples" not in g:
            continue
        samples = g["listing_samples"]
        last = samples[-1] if samples and not problems(dict(g, tier="none")) else None
        verdict = "no sample" if not samples else ("passes" if last and passes(last) else "over the mark")
        line = ", ".join(f"{s.get('wrong')} in {s.get('size')}" for s in samples if isinstance(s, dict))
        print(f"{os.path.relpath(gdir, ROOT):44s} {g.get('tier', ''):15s} {line or '-'}: {verdict}")


if __name__ == "__main__":
    main(sys.argv[1:])
