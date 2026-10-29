#!/usr/bin/env python3
"""Which models are proven, and which games still need a maintainer's check.

A model is proven when kit/models.json declares it, or when it ran both
50-coverage and 60-verify on a game at Silver or above made under kit 0.0.32
or earlier (merged after a maintainer's review, the only check there was),
going by `step_models` in that game's game.json. A game is trusted when it
was made under that kit, when every model that ran its coverage and verify
steps was already proven, or when a maintainer has measured its listing
on a proven model (kit/CHECKING.md): its `accuracy` ends with a sample
whose `by` names the maintainer, and when that sample is over the mark, a
maintainer's full audit came before it. A known contributor's audit does
the same (kit/contributors.json): a full audit on proven models after the
last annotation, whose `by` names a contributor listed there, with a sample
on proven models after it. A game built on an imported
analysis (`imported` in game.json) also counts the models that wrote it,
`unknown` when unsaid. A game trusted through either check proves
no model: the check measures the listing whatever its result, and the
maintainers declare a model in kit/models.json when its samples earn it.
Any model may run the kit (AGENTS.md, "Model"); a game that is not trusted
cannot be Silver.

Ids are recorded exactly as the session names them, and compared without
a context-window suffix: claude-opus-5-5[1m] is the same model as
claude-opus-5-5, run with a larger context, so either proves the other.

Usage:
  models.py                  the proven models, each with the games that proved it
  models.py is-proven <id>   say whether a model is proven; exit 0 if it is, 1 if not
  models.py check            exit 1 if a Silver-or-above game needs a check it lacks
  models.py --test           self-check on made-up games (writes only to a temp dir)
"""
import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import accuracy  # noqa: E402  the ledger a maintainer's check is recorded in

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SILVER_UP = ("silver", "silver-claimed", "gold", "platinum", "diamond")
PROVING_STEPS = ("50-coverage", "60-verify")
RULE_FROM = (0, 0, 33)
CONTEXT_SUFFIX = re.compile(r"\[\d+(?:\.\d+)?[km]\]$", re.I)   # [1m], [200k]: the context window, not the model


def base(model):
    """The model an id names, without a context-window suffix such as [1m]."""
    return CONTEXT_SUFFIX.sub("", str(model or "").strip()) or "unknown"


def games():
    """(game dir, game.json, its step_models) for every game."""
    out = []
    for gj in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json"))):
        try:
            g = json.load(open(gj))
        except (OSError, ValueError):
            continue
        sm = g.get("step_models")
        out.append((os.path.dirname(gj), g, sm if isinstance(sm, dict) else {}))
    return out


def step_models(sm, step):
    """The models game.json `step_models` names for a step, as {"50-coverage": ["<model id>", ...]}."""
    ms = sm.get(step) or []
    return {base(m) for m in ([ms] if isinstance(ms, str) else ms)}


def declared():
    """The models kit/models.json declares good enough without a check, by id less any context-window suffix."""
    try:
        d = json.load(open(os.path.join(ROOT, "kit", "models.json"))).get("declared") or {}
        return {base(m): why for m, why in d.items()}
    except (OSError, ValueError):
        return {}


def before_rule(g):
    """Made under kit 0.0.32 or earlier, when a maintainer's review of the pull request was the only check."""
    if g.get("imported"):
        return False    # the import rule is newer than any such game
    try:
        return tuple(int(x) for x in str(g.get("kit_version", "")).split(".")) < RULE_FROM
    except ValueError:
        return False


IMPORT_KEYS = ("source", "sha256", "tool", "by", "model", "date")


def known():
    """The GitHub logins kit/contributors.json names, in lower case: contributors the maintainers know."""
    try:
        k = json.load(open(os.path.join(ROOT, "kit", "contributors.json"))).get("known", {})
    except (OSError, ValueError):
        return set()
    return {str(c).strip().lower() for c in k if str(c).strip()}


def import_models(g):
    """The models that wrote an imported analysis, from game.json `imported`; {'unknown'} when unsaid."""
    imp = g.get("imported")
    if not imp:
        return set()
    ms = imp.get("model") if isinstance(imp, dict) else None
    ms = ms if isinstance(ms, list) else [m for m in str(ms or "").split(",")]
    return {base(m) for m in ms if str(m).strip()} or {"unknown"}


def import_problem(g):
    """Why a game.json `imported` record is incomplete, or ''."""
    imp = g.get("imported")
    if imp is None:
        return ""
    if not isinstance(imp, dict):
        return "`imported` must be an object (kit/skills/core/40-sweep)"
    missing = [k for k in IMPORT_KEYS if imp.get(k) in (None, "", [])]
    return f"`imported` has no {', '.join('`' + k + '`' for k in missing)}" if missing else ""


def check_problem(g, P, K=None):
    """Why a game's `accuracy` does not show a maintainer's check (kit/CHECKING.md), or '' when it does:
    its last sample was drawn by a maintainer (`by`) on proven models, after the last annotation, and
    when that sample is over the mark, a maintainer's full audit on proven models came before it. Or a
    known contributor's audit (K, from known()): after the last annotation, a full audit on proven
    models whose `by` is in K, and a sample on proven models after it."""
    rows = g.get("accuracy")
    if not isinstance(rows, list) or not rows:
        return "no `accuracy` in game.json to record the maintainer's sample in"
    if accuracy.problems(dict(g, tier="none")):
        return "its `accuracy` is malformed (accuracy.py check says how)"
    on_proven = lambda r: {base(m) for m in r["models"]} <= set(P)
    theirs = lambda r: "by" in r and on_proven(r)
    K = known() if K is None else K
    start = max((n for n, r in enumerate(rows) if r["step"] == "annotate"), default=-1)
    for n in range(start + 1, len(rows)):
        r = rows[n]
        if r["step"] == "audit" and accuracy.full(r) and theirs(r) and r["by"].strip().lower() in K \
                and any(q["step"] == "sample" and on_proven(q) for q in rows[n + 1:]):
            return ""
    last = max((n for n, r in enumerate(rows) if r["step"] == "sample"), default=None)
    if last is None or not theirs(rows[last]):
        return "its last sample was not drawn by a maintainer (`by`) on a proven model"
    if any(r["step"] == "annotate" for r in rows[last + 1:]):
        return "its comments were written again after the maintainer's last sample"
    s = rows[last]
    if accuracy.within_mark(s):
        return ""
    start = max((n for n, r in enumerate(rows[:last]) if r["step"] == "annotate"), default=-1)
    if any(r["step"] == "audit" and accuracy.full(r) and theirs(r) for r in rows[start + 1:last]):
        return ""
    return (f"the maintainer's sample found {s['wrong']} of {s['size']} wrong, over the mark, "
            "and no maintainer's full audit came before it")


def settle():
    """(proven, untrusted). proven is {model: [games that proved it]}; untrusted is [(game dir, used, why)]
    for every Silver-or-above game that is neither from before the rule, nor made on proven models only,
    nor checked. A trusted game proves the models that ran both its coverage and its verify step."""
    P, pending = {m: ["declared in kit/models.json"] for m in declared()}, []
    for gdir, g, t in games():
        if g.get("tier") in SILVER_UP:
            used = set().union(*(step_models(t, s) for s in PROVING_STEPS)) | import_models(g)
            pending.append((gdir, g, t, used))
    changed = True
    while changed:
        changed, left = False, []
        for gdir, g, t, used in pending:
            ok = before_rule(g) or (used and used <= set(P))
            if not ok and check_problem(g, P):
                left.append((gdir, g, t, used)); continue
            changed = True
            if g.get("imported") or not ok:
                continue    # finishing another's analysis, or a maintainer's check of it, proves no model
            for m in (step_models(t, PROVING_STEPS[0]) & step_models(t, PROVING_STEPS[1])) - {"unknown"}:
                P.setdefault(m, []).append(os.path.relpath(gdir, ROOT))
        pending = left
    untrusted = []
    for gdir, g, t, used in pending:
        if not used:
            why = "game.json has no `step_models` for 50-coverage or 60-verify to say which model did them"
        else:
            why = check_problem(g, P)
        untrusted.append((gdir, sorted(used - set(P)), why))
    return P, untrusted


def proven():
    return settle()[0]


def awaits_check(g, P):
    """The models not yet proven (P, from proven()) that ran a game's coverage or verify step,
    when no maintainer's check vouches for them: the game is Bronze until one does, and its
    page says so (build.py's banner). Empty for a game made on proven models, made before the
    rule, or checked."""
    sm = g.get("step_models") if isinstance(g.get("step_models"), dict) else {}
    need = (set().union(*(step_models(sm, s) for s in PROVING_STEPS)) | import_models(g)) - set(P)
    if not need or before_rule(g) or not check_problem(g, P):
        return []
    return sorted(need)


def is_proven(model):
    return base(model) in proven()


def check():
    _, untrusted = settle()
    bad = [(gdir, import_problem(g)) for gdir, g, _ in games() if import_problem(g)]
    for gdir, why in bad:
        print(f"  x  {os.path.relpath(gdir, ROOT)}: {why}")
    for gdir, need, why in untrusted:
        rel = os.path.relpath(gdir, ROOT)
        print(f"  x  {rel} is Silver or above but ran on a model that is not proven ({', '.join(need) or 'none recorded'}): {why}")
        print(f"        a maintainer's sample, and audit if it is over the mark, or a known contributor's "
              "audit, makes it Silver (kit/CHECKING.md); until then its tier is bronze")
    return len(untrusted) + len(bad)


def test():
    """Made-up games: one from before the rule, one whose maintainer's sample was good enough, one a
    maintainer sampled, audited and sampled again, one sampled only by its own model, one whose
    maintainer's sample was over the mark with no audit after it; and a known contributor's audit
    with a sample after it, the same audit by a contributor nobody listed, one with the comments
    written again after it, and one with no sample after it."""
    import tempfile
    global ROOT
    keep = ROOT
    steps = lambda *models: {s: list(models) for s in PROVING_STEPS}
    mine = lambda m: [{"step": "research", "web": True, "models": [m]}, {"step": "annotate", "models": [m]}]
    theirs = {"by": "someone", "models": ["old-hand"]}
    good = dict(theirs, step="sample", size=60, wrong=1, fixed=1)
    over = dict(theirs, step="sample", size=60, wrong=9, fixed=9)
    audit = dict(theirs, step="audit", checked=500, of=500, fixed=60)
    mark_only = {"step": "sample", "size": 60, "wrong": 4, "fixed": 4, "models": ["old-hand"]}   # the run's own, no `by`
    made = {
        "first":  ({"tier": "silver", "kit_version": "0.0.20"}, steps("old-hand")),                # before the rule
        "second": ({"tier": "silver", "kit_version": "0.0.60", "accuracy": mine("newcomer") + [good]},
                   steps("newcomer")),
        "third":  ({"tier": "silver", "kit_version": "0.0.60", "accuracy": mine("guesser") + [over, audit, over]},
                   steps("guesser")),
        "fourth": ({"tier": "silver", "kit_version": "0.0.60",                                       # its own sample
                    "accuracy": mine("guesser") + [dict(good, models=["guesser"], by="guesser")]}, steps("guesser")),
        "fifth":  ({"tier": "silver", "kit_version": "0.0.60", "accuracy": mine("guesser") + [over]},
                   steps("guesser")),
        "sixth":  ({"tier": "silver", "kit_version": "0.0.60",                                       # a known contributor's
                    "accuracy": mine("guesser") + [dict(audit, by="trusted-hand"), mark_only]},
                   steps("guesser")),
        "seventh": ({"tier": "silver", "kit_version": "0.0.60",                                      # nobody listed them
                     "accuracy": mine("guesser") + [dict(audit, by="stranger"), mark_only]},
                    steps("guesser")),
        "eighth": ({"tier": "silver", "kit_version": "0.0.60",                                       # written again after it
                    "accuracy": mine("guesser") + [dict(audit, by="Trusted-Hand"), {"step": "annotate", "models": ["guesser"]},
                                                   mark_only]}, steps("guesser")),
        "ninth":  ({"tier": "silver", "kit_version": "0.0.60",                                       # never sampled after it
                    "accuracy": mine("guesser") + [over, dict(audit, by="trusted-hand")]}, steps("guesser")),
    }
    try:
        with tempfile.TemporaryDirectory() as tmp:
            ROOT = tmp
            os.makedirs(os.path.join(tmp, "kit"))
            json.dump({"known": {"Trusted-Hand": "a test"}}, open(os.path.join(tmp, "kit", "contributors.json"), "w"))
            for slug, (g, t) in made.items():
                d = os.path.join(tmp, "games", "x", slug)
                os.makedirs(d)
                json.dump(dict(g, step_models=t), open(os.path.join(d, "game.json"), "w"))
            P, untrusted = settle()
            assert set(P) == {"old-hand"}, P                                # a maintainer's check proves no model
            assert sorted(os.path.basename(u[0]) for u in untrusted) == ["eighth", "fifth", "fourth", "ninth", "seventh"], untrusted
            waits = {slug: awaits_check(dict(g, step_models=t), P) for slug, (g, t) in made.items()}
            assert waits == {"first": [], "second": [], "third": [], "fourth": ["guesser"], "fifth": ["guesser"], "sixth": [],
                             "seventh": ["guesser"], "eighth": ["guesser"], "ninth": ["guesser"]}, waits
    finally:
        ROOT = keep
    print("ok - models.py self-check: a maintainer's sample, and audit when it is over the mark, or a known "
          "contributor's audit with a sample after it, lets a game be Silver and proves no model")


def main():
    a = sys.argv[1:]
    if a and a[0] in ("-h", "--help"):
        print(__doc__); return
    if a and a[0] == "--test":
        test(); return
    if not a:
        P = proven()
        if not P:
            print("no proven models yet")
        for m in sorted(P):
            print(f"{m}  ({', '.join(P[m])})")
    elif a[0] == "is-proven" and len(a) == 2:
        if is_proven(a[1]):
            print(f"{a[1]} is a proven model"); return
        print(f"{a[1]} is not a proven model (proven: {', '.join(sorted(proven())) or 'none'}).\n"
              "The run may go on. Tell the contributor now, in plain words: an untested model often produces\n"
              "results that read as right and are wrong, and this game cannot be Silver until a maintainer has\n"
              "measured its listing on a proven model, or, for a contributor kit/contributors.json lists, until\n"
              "the run has audited it on one (kit/CHECKING.md). Until then its tier is bronze (AGENTS.md, \"Model\").")
        sys.exit(1)
    elif a[0] == "check":
        n = check()
        if n:
            print(f"\nFAILED - {n} game(s) need a maintainer's check before Silver")
            sys.exit(1)
        print("OK - every Silver or above ran on proven models or was checked")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
