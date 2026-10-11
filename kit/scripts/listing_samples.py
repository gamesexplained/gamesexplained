#!/usr/bin/env python3
"""Each game's samples of listing comments: whether game.json records them, and what its page says.

60-verify draws a sample of the listing's comments, has an agent that wrote
none of them check it, and audits the whole listing when the sample has too
many wrong. game.json's `listing_samples` lists every sample in order, each as
{"seed": ..., "size": 60, "wrong": 2, "audits": 1, "checker": "<model id>"},
where `audits` is how many full audits the listing had had when the sample was
drawn. A sample is within the mark when it holds at least 60 comments and at
most one in 30 of them is wrong (2 in 60).

A game at Silver or above needs at least one sample: Silver asks that the
listing be measured, not that it be within the mark. Its page says what the
last sample found, and calls the listing checked only when that sample was
drawn after a full audit and is within the mark; when it is not, the banner
under the game's title says so on every tab (build.py).

Games whose game.json has no `listing_samples` key were made before the rule
and are not checked; the template carries the key, so every game started
since then is.

Usage:
  listing_samples.py         every game's samples, and whether its listing is checked
  listing_samples.py check   exit 1 if a game fails the rule (check_docs.py runs it)
"""
import glob, json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SILVER_UP = ("silver", "silver-claimed", "gold", "platinum")
MIN_SIZE = 60


def within_mark(sample):
    """At least 60 comments, and at most one in 30 of them wrong."""
    return sample["size"] >= MIN_SIZE and sample["wrong"] * 30 <= sample["size"]


def wilson(wrong, size, z=1.96):
    """The 95 % range for the share of all comments wrong, from wrong of size sampled (Wilson score)."""
    p, d = wrong / size, 1 + z * z / size
    mid = (p + z * z / (2 * size)) / d
    half = z * math.sqrt(p * (1 - p) / size + z * z / (4 * size * size)) / d
    return max(0.0, mid - half), min(1.0, mid + half)


def problems(game):
    """What is wrong with one game.json's `listing_samples`, as sentences; empty when nothing is."""
    if "listing_samples" not in game:
        return []
    samples = game["listing_samples"]
    if not isinstance(samples, list):
        return ["listing_samples is a list of samples"]
    out, before = [], 0
    for n, s in enumerate(samples, 1):
        ok = isinstance(s, dict) and "seed" in s and isinstance(s.get("size"), int) and s["size"] > 0 \
            and isinstance(s.get("wrong"), int) and 0 <= s["wrong"] <= s["size"] \
            and isinstance(s.get("audits"), int) and s["audits"] >= 0 \
            and isinstance(s.get("checker"), str) and s["checker"].strip()
        if not ok:
            out.append(f'sample {n} is not {{"seed": ..., "size": <comments>, "wrong": <how many>, '
                       f'"audits": <full audits before it>, "checker": "<model id>"}}')
        elif s["audits"] < before:
            out.append(f"sample {n} counts fewer audits than the sample before it")
        else:
            before = s["audits"]
    if out or game.get("tier") not in SILVER_UP:
        return out
    if not samples:
        return ["Silver or above with no sample of the listing's comments: draw one and have it checked"]
    return []


def status(game):
    """What a game's page says about its listing's comments, or None for a game made before
    game.json recorded its samples (or whose record is malformed: check_docs.py says why).

    A dict: `checked`, True when the last sample was drawn after a full audit and is within
    the mark; `row`, the About tab's sentence; `flag`, the banner's sentence when not checked."""
    if "listing_samples" not in game or problems(dict(game, tier="none")):
        return None
    samples = game["listing_samples"]
    if not samples:
        return {"checked": False, "row": "Not measured: no sample of the listing’s comments has been checked.",
                "flag": "Nobody has measured how many of its listing’s comments are wrong."}
    s = samples[-1]
    k, n, a = s["wrong"], s["size"], s["audits"]
    lo, hi = wilson(k, n)
    rng = f"{100 * lo:.0f}" if round(100 * lo) == round(100 * hi) else f"{100 * lo:.0f} and {100 * hi:.0f}"
    had = f"a sample of {n} comments had {k} wrong"
    rate = f"so between {rng} % of the listing\u2019s comments are likely wrong"
    by = f" The sample was checked by {s['checker']}."
    times = {1: "once", 2: "twice"}.get(a, f"{a} times")
    one_in = f", about one in {round(n / k)}" if k else ""
    if a == 0:
        return {"checked": False,
                "row": f"Not audited. Nobody has checked every comment, and {had}, {rate}." + by,
                "flag": f"Its listing has not been audited: a sample of {n} of its comments found "
                        f"{k or 'none'} wrong{one_in}."}
    if within_mark(s):
        return {"checked": True, "flag": None, "row": f"Checked. Every comment was audited {times}, then {had}, {rate}." + by}
    if n < MIN_SIZE:
        return {"checked": False,
                "row": f"Not checked. Every comment was audited {times}, but the sample since then is too small "
                       f"to say: {had}, {rate}." + by,
                "flag": f"Its listing has been audited, but the sample since then, {n} comments, is too small to say "
                        f"how many are wrong."}
    return {"checked": False,
            "row": f"Not checked. Every comment was audited {times}, but a later sample of {n} comments still had "
                   f"{k} wrong, more than one in 30, {rate}." + by,
            "flag": f"Its listing has been audited, but a later sample of {n} of its comments still found {k} wrong{one_in}."}


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
        st = status(g)
        if st is None:
            continue
        line = ", ".join(f"{s.get('wrong')} in {s.get('size')} after {s.get('audits')}" for s in g["listing_samples"])
        print(f"{os.path.relpath(gdir, ROOT):44s} {g.get('tier', ''):15s} {line or '-'}: "
              f"{'checked' if st['checked'] else 'not checked'}")


if __name__ == "__main__":
    main(sys.argv[1:])
