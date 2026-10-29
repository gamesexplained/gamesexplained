#!/usr/bin/env python3
"""Each game's record of the work that went into its listing's accuracy, and what its page says.

game.json's `accuracy` lists the steps in the order they happened, one row each:

  {"step": "research", "web": true | false | "unknown", "models": [...]}
      whether the run looked the game up online (manual, reviews, wiki) before reading its code
  {"step": "annotate", "models": [...]}
      the run that wrote the listing's comments; a second model, or a second pass, is a row of its own
  {"step": "sample", "size": 60, "wrong": 2, "fixed": 2, "models": [...], "seed": ...}
      comments drawn at random and checked one by one by an agent that wrote none of them;
      "fixed" is how many of the wrong ones were then corrected, so the row says it without
      another row's help (required when any were wrong, in a game created from FIXED_SINCE)
  {"step": "audit", "checked": 897, "of": 897, "fixed": 137, "models": [...]}
      agents that wrote none of the comments check every one (checked == of), or a stated part;
      when nobody counted what a partial audit checked, it leaves out "checked" (and "of") and
      its note says what it covered
  {"step": "play", "fixed": 16, "models": [...]}
      a port of the whole game for the Play tab, checked against the game's own code; "fixed"
      is how many comments the port showed wrong and the run corrected, left out when not recorded
  {"step": "port", "fixed": 15, "models": [...], "note": "the stage maps"}
      a page's port of some of the game's code, or a widget built from its data, checked against
      the game's code or the game running; "fixed" as for play, and the note names what was checked
  {"step": "check", "by": "air", "checked": 39, "wrong": 0, "models": [...]}
      a maintainer's check as it was made before 12 October 2026, kept for the games that had
      one: claims from facts.md, names from symbols.json and the orientation, tested against
      the game; a check that failed is a row too

Together the rows are a ledger of everything that measured the listing's comments or made
them more accurate. `models` names the model ids that did the step, "unknown" where nobody recorded them, and
any row may carry a short `note`; a sample may carry its `seed`, and an audit leaves out
`fixed` when the number was not recorded. A sample or an audit a maintainer made for a run on an
unproven model (kit/CHECKING.md) carries their GitHub login as `by`, and so does an audit on proven
models made on the run of a contributor kit/contributors.json lists. 60-verify says when to sample and audit, and a run
writes a row for each step it takes, whatever order they come in.

A game at Silver or above needs a research row and an annotate row, and one created from
SAMPLE_SINCE needs at least one sample too: Silver asks that the listing be measured, not
that it be within the mark. An older Silver game with no sample shows "Not measured". A
sample is within the mark when it holds at least 60 comments and at most one in 30 of them is
wrong (2 in 60). The About tab shows the rows as a table, each ending with a bar of the whole
listing as it stood after that step (ribbon()), and its Status table sums them up;
the page calls the listing checked ("Audited & low error rate") only when the last sample came
after a full audit and is within the mark. At Silver and above the Source tab says the same in
a line under its title (build.py); the banner under the game's title leaves it out.

Games whose game.json has no `accuracy` key were made before the rule and are not checked;
the template carries the key, so every game started since then is.

Usage:
  accuracy.py         every game's steps, and whether its listing is checked
  accuracy.py check   exit 1 if a game fails the rule (check_docs.py runs it)
"""
import glob, json, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SILVER_UP = ("silver", "silver-claimed", "gold", "platinum", "diamond")
MIN_SIZE = 60
SAMPLE_SINCE = "2026-10-12"   # games created from this day need a sample for Silver; older ones show "Not measured"
FIXED_SINCE = "2026-10-14"    # games created from this day say on each sample with a wrong comment how many were corrected
KEYS = {"research": {"step", "web", "models", "note"},
        "annotate": {"step", "models", "note"},
        "sample": {"step", "size", "wrong", "fixed", "models", "seed", "by", "note"},
        "audit": {"step", "checked", "of", "fixed", "models", "by", "note"},
        "play": {"step", "fixed", "models", "note"},
        "port": {"step", "fixed", "models", "note"},
        "check": {"step", "by", "checked", "wrong", "models", "note"}}


def within_mark(sample):
    """At least 60 comments, and at most one in 30 of them wrong."""
    return sample["size"] >= MIN_SIZE and sample["wrong"] * 30 <= sample["size"]


def full(audit):
    """An audit that checked every comment; one whose count nobody recorded is not."""
    return "checked" in audit and "of" in audit and audit["checked"] >= audit["of"]


def wilson(wrong, size, z=1.96):
    """The 95 % range for the share of all comments wrong, from wrong of size sampled (Wilson score)."""
    p, d = wrong / size, 1 + z * z / size
    mid = (p + z * z / (2 * size)) / d
    half = z * math.sqrt(p * (1 - p) / size + z * z / (4 * size * size)) / d
    return max(0.0, mid - half), min(1.0, mid + half)


def _count(v, low=0):
    return isinstance(v, int) and not isinstance(v, bool) and v >= low


def _bad(row):
    """Why one row is malformed, or None."""
    if not isinstance(row, dict) or row.get("step") not in KEYS:
        return f"has no step, or one other than {', '.join(KEYS)}"
    step = row["step"]
    extra = set(row) - KEYS[step]
    if extra:
        return f"({step}) has keys a {step} row does not take: {', '.join(sorted(extra))}"
    m = row.get("models")
    if not (isinstance(m, list) and m and all(isinstance(x, str) and x.strip() for x in m)):
        return f'({step}) needs "models", a list of model ids ("unknown" where none was recorded)'
    if "note" in row and not (isinstance(row["note"], str) and row["note"].strip()):
        return f"({step}) has an empty note"
    if step == "research" and row.get("web") not in (True, False, "unknown"):
        return '(research) needs "web": true, false or "unknown"'
    if step == "sample" and not (_count(row.get("size"), 1) and _count(row.get("wrong")) and row["wrong"] <= row["size"]):
        return '(sample) needs "size", the comments drawn, and "wrong", how many of them were wrong'
    if step == "sample" and "fixed" in row and not (_count(row["fixed"]) and row["fixed"] <= row["wrong"]):
        return '(sample) has a "fixed" that is not how many of its wrong comments were then corrected'
    if step == "check" and not (_count(row.get("checked"), 1) and _count(row.get("wrong")) and row["wrong"] <= row["checked"]):
        return '(check) needs "checked", the claims tested, and "wrong", how many of them were wrong'
    if "by" in row and not (isinstance(row["by"], str) and row["by"].strip()):
        return f'({step}) has an empty "by"'
    if step in ("play", "port") and "fixed" in row and not _count(row["fixed"]):
        return f'({step}) has a "fixed" that is not a count of comments'
    if step == "audit":
        for k in ("checked", "of", "fixed"):
            if k in row and not _count(row[k], 0 if k == "fixed" else 1):
                return f'(audit) has a "{k}" that is not a count of comments'
        if "checked" in row and "of" in row and row["checked"] > row["of"]:
            return '(audit) checked more comments than there were ("checked" over "of")'
        if not ("checked" in row and "of" in row) and "note" not in row:
            return '(audit) needs "checked" and "of", or a note saying what it covered when nobody counted'
        if "fixed" in row and "checked" in row and row["fixed"] > row["checked"]:
            return '(audit) corrected more comments than it checked'
    return None


def problems(game):
    """What is wrong with one game.json's `accuracy`, as sentences; empty when nothing is."""
    if "accuracy" not in game:
        return []
    rows = game["accuracy"]
    if not isinstance(rows, list):
        return ["accuracy is a list of steps"]
    out = [f"accuracy row {n} {why}" for n, why in ((n, _bad(r)) for n, r in enumerate(rows, 1)) if why]
    if not out and str(game.get("created") or FIXED_SINCE) >= FIXED_SINCE:
        out = [f'accuracy row {n} (sample) found {r["wrong"]} wrong and needs "fixed", how many of them '
               f'were then corrected (0 when none was)' for n, r in enumerate(rows, 1)
               if r["step"] == "sample" and r["wrong"] and "fixed" not in r]
    if out or game.get("tier") not in SILVER_UP:
        return out
    have = {r["step"] for r in rows}
    if "verification" in game:
        out.append("records a maintainer's check under verification, which nothing reads: record the "
                   'maintainer\'s samples and audit in accuracy, each with "by" (kit/CHECKING.md)')
    need = [s for s in ("research", "annotate", "sample") if s not in have
            and (s != "sample" or str(game.get("created") or SAMPLE_SINCE) >= SAMPLE_SINCE)]
    if need:
        out.append(f"Silver or above with no {' or '.join(need)} row in accuracy: "
                   + ("draw a sample of the listing's comments and have it checked; " if "sample" in need else "")
                   + 'record each step, with "unknown" for what nobody recorded')
    return out


def status(game):
    """What a game's page says about its listing's comments overall, or None for a game made
    before game.json recorded the steps (or whose record is malformed: check_docs.py says why).

    A dict: `checked`, True when the last sample came after a full audit and is within the
    mark, with no audit after it; `lead`, the verdict that opens both sentences ("Audited & low
    error rate."); `row`, the About tab's Status sentence, which starts with the lead; `note`,
    the shorter sentence the Source tab shows after the lead."""
    if "accuracy" not in game or problems(dict(game, tier="none")):
        return None
    rows = game["accuracy"]
    last = max((n for n, r in enumerate(rows) if r["step"] == "sample"), default=None)

    def said(lead, rest, note, checked=False):
        return {"checked": checked, "lead": lead, "row": f"{lead} {rest}", "note": note}
    if last is None:
        return said("Not measured.", "No sample of the listing’s comments has been checked.",
                    "Nobody has measured how many of this listing’s comments are wrong.")
    s = rows[last]
    k, n = s["wrong"], s["size"]
    a = sum(1 for r in rows[:last] if r["step"] == "audit" and full(r))
    since = sum(1 for r in rows[last + 1:] if r["step"] == "audit" and full(r))
    lo, hi = wilson(k, n)
    rng = f"{100 * lo:.0f}" if round(100 * lo) == round(100 * hi) else f"{100 * lo:.0f} and {100 * hi:.0f}"
    had = f"the last sample of {n} comments had {k} wrong"
    rate = f"so between {rng} % of the listing’s comments are likely wrong"
    times = {1: "once", 2: "twice"}.get(a, f"{a} times")
    one_in = f", about one in {round(n / k)}" if k else ""
    if since:
        return said("Not measured since its audit.",
                    f"{had[0].upper() + had[1:]}, {rate}; every comment was then audited"
                    f"{'' if since == 1 else f' {since} times'}, and no sample has measured the listing since.",
                    "This listing was audited after its last sample, and no sample has measured it since.")
    if a == 0:
        return said("Not audited.", f"No audit has checked every comment, and {had}, {rate}.",
                    f"This listing has not had a full audit: a sample of {n} of its comments found "
                    f"{k or 'none'} wrong{one_in}.")
    if within_mark(s):
        return said("Audited & low error rate.", f"Every comment was audited {times}, then {had}, {rate}.",
                    f"This listing has been audited, and a later sample of {n} of its comments found "
                    f"{k or 'none'} wrong{one_in}.", checked=True)
    if k * 30 > n:
        return said("Audited & high error rate.",
                    f"Every comment was audited {times}, but {had}, more than one in 30, {rate}.",
                    f"This listing has been audited, but a later sample of {n} of its comments still found "
                    f"{k} wrong{one_in}.")
    return said("Audited & sample too small.",
                f"Every comment was audited {times}, but the sample since then is too small to say: {had}, {rate}.",
                f"This listing has been audited, but the sample since then, {n} comments, is too small to say "
                f"how many are wrong.")


def comments(gdir):
    """How many comments the game's listings hold, over every part."""
    n = 0
    for lj in [os.path.join(gdir, "listing.json")] + sorted(glob.glob(os.path.join(gdir, "parts", "*", "listing.json"))):
        try:
            with open(lj) as f:
                n += sum(1 for r in json.load(f)["records"] if r.get("c"))
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return n


def corrected(sample):
    """The sentence a sample's row ends with: whether the comments it found wrong were then
    corrected. Empty when none was wrong."""
    k, f = sample["wrong"], sample.get("fixed")
    if not k:
        return ""
    if f is None:
        return f" Whether {'it was' if k == 1 else 'they were'} then corrected was not recorded."
    if f == k:
        return " " + ("It was" if k == 1 else "Both were" if k == 2 else f"All {k} were") + " then corrected."
    return f" {f} of them {'was' if f == 1 else 'were'} then corrected." if f else " None of them was corrected."


ORDER = ("wrong", "maybe", "fixed", "right", "done")   # a bar's segments, left to right


def _bar(*parts):
    """Segments from (kind, share) pairs: one per kind, in ORDER, the empty ones left out."""
    got = {}
    for k, v in parts:
        got[k] = got.get(k, 0) + v
    return [(k, got[k]) for k in ORDER if got.get(k, 0) > 1e-9]


def ribbon(row, before, total):
    """The bar on one ledger row: the whole listing as it stood after the step, so the bars read
    down the table as one story. (segments, sentence), each segment (kind, share of the listing),
    the shares summing to 1; empty for research and an old maintainer's check, which change no
    comment. before is the bar after the previous step (None before any annotation); total is
    how many comments the listing holds, for a step that does not say.

    An annotation leaves every comment written and not yet measured. A sample measures the whole
    listing: red for the share likely wrong, pale red for its range, green for the rest. An audit
    or a port (the Play tab's, or a page's) reaches part of it: what it corrected is blue, what it checked and found
    right green, and the comments it did not reach stay as the bar before showed them, which is
    as the last sample measured them, since nothing has changed them."""
    pc = lambda x: f"{100 * x:.0f} %"
    step = row["step"]
    if step == "annotate":
        return [("done", 1.0)], "Written, not yet measured"
    if step == "sample":
        lo, hi = wilson(row["wrong"], row["size"])
        return (_bar(("wrong", lo), ("maybe", hi - lo), ("right", 1 - hi)),
                f"{100 * lo:.0f} to {pc(hi)} of the listing likely wrong, at least {pc(1 - hi)} likely right")
    if step not in ("audit", "play", "port"):
        return [], ""
    base = before or [("done", 1.0)]
    kinds = {k for k, _ in base}
    was = ("as the last sample measured them" if kinds & {"wrong", "maybe"} else
           "not yet measured" if kinds == {"done"} else "as last checked")
    of = (row.get("of") or total) if step == "audit" else total
    if not of:
        return [], ""
    checked, fixed = (row.get("checked"), row.get("fixed")) if step == "audit" else (None, row.get("fixed"))
    reached = checked if checked is not None else fixed or 0
    right = (checked - (fixed or 0)) if checked is not None else 0
    bar = _bar(("fixed", (fixed or 0) / of), ("right", right / of), *((k, v * (1 - reached / of)) for k, v in base))
    rest = f"; the other {of - reached:,} {was}" if reached < of else ""
    if step in ("play", "port"):
        said = (f"Corrected {fixed:,} of the listing’s {of:,} comments{rest}" if fixed is not None else
                f"How many it corrected is not recorded; the comments {was}")
    elif checked is not None:
        said = (f"Checked {checked:,} of {of:,} comments: {fixed:,} corrected, {right:,} right{rest}" if fixed is not None else
                f"Checked {checked:,} of {of:,} comments, how many it corrected not recorded{rest}")
    elif fixed is not None:
        said = f"Corrected {fixed:,} of {of:,} comments, how many it checked not recorded; the rest {was}"
    else:
        said = f"How many it checked and corrected is not recorded; the comments {was}"
    return bar, said


def table(game, gdir):
    """The About tab's rows, as (step, by, what it found, note, kind, ribbon) strings; empty for a game
    with no record. The last annotate row carries the coverage and how many comments the listing holds.
    kind is the step and how it came out ("sample-good", "audit-part"), a class the page colours;
    ribbon is the bar the row ends with (ribbon())."""
    st = status(game)
    if st is None:
        return []
    rows, out, seen = game["accuracy"], [], {}
    total, state = comments(gdir), None
    checks = sum(1 for r in rows if r["step"] == "check")
    last_annotate = max((n for n, r in enumerate(rows) if r["step"] == "annotate"), default=None)
    for n, r in enumerate(rows):
        step = r["step"]
        seen[step] = seen.get(step, 0) + 1
        by = ", ".join("not recorded" if m == "unknown" else m for m in r["models"])
        if "by" in r:
            by = r["by"] if set(r["models"]) == {"unknown"} else f"{r['by']}, with {by}"
        kind = {"annotate": "annotate-run", "play": "play-port", "port": "port-check",
                "audit": "audit-full"}.get(step, step)
        if step == "research":
            kind += {True: "-yes", False: "-no", "unknown": "-unknown"}[r["web"]]
            label, what = "Research", {True: "Looked the game up online (its manual, reviews or wiki pages) before reading its code.",
                                       False: "Did not look the game up online.",
                                       "unknown": "Not recorded whether the game was looked up online."}[r["web"]]
        elif step == "annotate":
            label, what = "Annotation", "Wrote the listing’s comments."
            if n == last_annotate:
                what += (f" {game.get('coverage_percent') or 0:g} % of the program is described, "
                         f"in {total:,} comments.")
        elif step == "sample":
            lo, hi = wilson(r["wrong"], r["size"])
            label = f"Sample {seen[step]}"
            kind += "-good" if within_mark(r) else "-bad" if r["wrong"] * 30 > r["size"] else "-small"
            what = (f"{r['wrong']} of {r['size']} comments wrong, so between {100 * lo:.0f} and {100 * hi:.0f} % "
                    f"of the listing is likely wrong.{corrected(r)}")
        elif step == "check":
            label = "Maintainer’s check" + (f" {seen[step]}" if checks > 1 else "")
            kind += "-bad" if r["wrong"] else "-good"
            what = (f"Tested {r['checked']} of the run’s claims against the game, picked by the maintainer from "
                    f"its facts, its routine names and its memory map: {r['wrong'] or 'none'} "
                    f"{'was' if r['wrong'] in (0, 1) else 'were'} wrong, so the check "
                    f"{'failed' if r['wrong'] else 'passed'}.")
        elif step == "play":
            label = "Play tab"
            what = ("Ported the whole game to JavaScript for the Play tab and corrected "
                    f"{r['fixed']:,} comment{'' if r['fixed'] == 1 else 's'} it showed wrong." if "fixed" in r else
                    "Ported the whole game to JavaScript for the Play tab; how many comments it corrected "
                    "was not recorded.")
        elif step == "port":
            label = "Port check"
            what = ("Checked a page’s port or widget against the game and corrected "
                    f"{r['fixed']:,} comment{'' if r['fixed'] == 1 else 's'} it showed wrong." if "fixed" in r else
                    "Checked a page’s port or widget against the game; how many comments it corrected "
                    "was not recorded.")
        else:
            label = f"Audit {seen[step]}"
            kind = "audit-full" if full(r) else "audit-part"
            if full(r):
                whole = f"all {r['of']:,} comments"
            elif "checked" in r:
                whole = f"{r['checked']:,} of {r['of']:,} comments" if "of" in r else f"{r['checked']:,} comments"
            else:
                whole = f"part of the {r['of']:,} comments" if "of" in r else "part of the listing"
            fixed = f"corrected {r['fixed']:,}" if "fixed" in r else "corrected a number not recorded"
            what = f"Checked {whole} and {fixed}."
        bar = ribbon(r, state, total)
        state = bar[0] or state
        out.append((label, by, what, r.get("note", ""), kind, bar))
    return out


def games(root=None):
    for gj in sorted(glob.glob(os.path.join(root or ROOT, "games", "*", "*", "game.json"))):
        try:
            with open(gj) as f:
                g = json.load(f)
        except (OSError, ValueError):
            continue
        yield os.path.dirname(gj), g


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
        steps = ", ".join(r["step"] + (f" {r['wrong']}/{r['size']}" + (f" fixed {r['fixed']}" if "fixed" in r else "")
                                       if r["step"] == "sample" else
                                       f" {r.get('checked', '?')}/{r.get('of', '?')}" if r["step"] == "audit" else
                                       f" {r['wrong']}/{r['checked']}" if r["step"] == "check" else
                                       f" {r['fixed']}" if "fixed" in r else "")
                          for r in g["accuracy"])
        print(f"{os.path.relpath(gdir, ROOT):44s} {g.get('tier', ''):15s} {steps or '-'}: "
              f"{'checked' if st['checked'] else 'not checked'}")


if __name__ == "__main__":
    main(sys.argv[1:])
