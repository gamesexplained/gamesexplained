#!/usr/bin/env python3
"""Warn about a listing padded with the same open question, or the run's own tests, note after note.

  listing_shape.py [game dir ...]      default: every game

For each game, over its listing.json and every part's, it prints the notes, the bytes per note,
and two shares of the notes: those that leave a use open ("other uses remain open", "not
established") and those that tell how the run checked ("a controlled resource load", "a 200-frame
capture"). A note says what its bytes are. An open question goes once, on the structure it belongs
to, and how a fact was checked goes in agent-history.md (kit/skills/core/50-coverage, "A comment
says what the bytes are"): on every record either one is filler, which reads as an explanation and
tells the reader nothing. A game is named when a share passes its line (OPEN_SHARE, RUN_SHARE)
over at least MIN_NOTES notes. On 18 November 2026 one game of 128 passed either line, at 71 % and
51 %, and the next was at 5.7 % and 0.2 %. check_listing.py prints the same warnings; nothing fails.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OPEN = re.compile(r"\b(?:remains?|stays?|left|kept)\s+(?:open|unresolved|undetermined|unattributed|unestablished)\b"
                  r"|\bnot (?:yet )?(?:established|determined|attributed|resolved)\b"
                  r"|\bcannot be (?:ruled out|established|excluded)\b|\bother possible\b", re.I)
RUN = re.compile(r"\b(?:controlled|forced) (?:\w+ ){0,2}(?:load|run|capture|test|probe|session)\b"
                 r"|\bbounded (?:\w+ )?(?:capture|probe|run)\b"
                 r"|\b\d+[- ](?:frame|pass) (?:capture|trace|run)\b|\bin (?:this|the) run\b"
                 r"|\bduring (?:the|this|our) (?:run|capture|test|session)\b"
                 r"|\bwe (?:ran|traced|watched|checked|captured|tested)\b", re.I)
OPEN_SHARE, RUN_SHARE, MIN_NOTES = 0.20, 0.10, 50


def listings(gdir):
    return sorted(glob.glob(os.path.join(gdir, "listing.json")) + glob.glob(os.path.join(gdir, "parts", "*", "listing.json")))


def shape(gdir):
    """{notes, bytes, open, run, open_at, run_at} over the game's listings; open_at and run_at are
    the first note of each, (folder, address, the words around the match), or None."""
    s = {"notes": 0, "bytes": 0, "open": 0, "run": 0, "open_at": None, "run_at": None}
    for path in listings(gdir):
        folder = os.path.relpath(os.path.dirname(path), gdir)
        with open(path) as f:
            records = json.load(f).get("records", [])
        for r in records:
            if r.get("t") == "gap":
                continue
            s["bytes"] += len(r.get("b") or [])
            t = r.get("c")
            if not isinstance(t, str) or not t.strip():
                continue
            s["notes"] += 1
            for k, pat in (("open", OPEN), ("run", RUN)):
                m = pat.search(t)
                if m:
                    s[k] += 1
                    if not s[k + "_at"]:
                        lo, hi = max(0, m.start() - 70), min(len(t), m.end() + 30)
                        s[k + "_at"] = (folder, r["a"], ("..." if lo else "") + t[lo:hi] + ("..." if hi < len(t) else ""))
    return s


def at(ex):
    folder, a, text = ex
    return (f"{folder} " if folder != "." else "") + f"${a:04X}, \"{text}\""


def warnings(gdir, s=None):
    """The lines check_listing.py prints for the game, one for each share over its line."""
    s = s or shape(gdir)
    out, n = [], s["notes"]
    name = os.path.relpath(gdir, ROOT) if os.path.abspath(gdir).startswith(ROOT + os.sep) else gdir
    if s["open"] >= MIN_NOTES and s["open"] > OPEN_SHARE * n:
        out.append(f"{name}: {s['open']} of {n} notes ({100 * s['open'] / n:.0f} %) leave a use open, such as "
                   f"{at(s['open_at'])}. Say an open question once, on the structure it belongs to "
                   "(kit/skills/core/50-coverage, \"A comment says what the bytes are\")")
    if s["run"] >= MIN_NOTES and s["run"] > RUN_SHARE * n:
        out.append(f"{name}: {s['run']} of {n} notes ({100 * s['run'] / n:.0f} %) tell how the run checked, such as "
                   f"{at(s['run_at'])}. That goes in agent-history.md; the note says what the bytes are "
                   "(kit/skills/core/50-coverage, \"A comment says what the bytes are\")")
    return out


def annotate(line):
    """A warning as GitHub shows it on a pull request's checks, when run there."""
    if os.environ.get("GITHUB_ACTIONS") == "true":
        esc = line.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::warning title=Listing notes::{esc}")


def main(argv):
    if argv and argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    games = argv or [os.path.dirname(p) for p in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json")))]
    print(f"{'game':48} {'notes':>7} {'bytes/note':>10} {'open':>6} {'run':>6}")
    named = []
    for g in games:
        s = shape(g)
        if not s["notes"]:
            continue
        n = s["notes"]
        print(f"{os.path.relpath(g, os.path.join(ROOT, 'games')) if g.startswith(ROOT) else g:48} {n:7} "
              f"{s['bytes'] / n:10.1f} {100 * s['open'] / n:5.1f}% {100 * s['run'] / n:5.1f}%")
        named += warnings(g, s)
    for w in named:
        print(f"  !  {w}")
        annotate(w)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
