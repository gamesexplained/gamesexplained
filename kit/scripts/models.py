#!/usr/bin/env python3
"""Which models are proven, and which games still need a maintainer's check.

A model is proven when it has run both 50-coverage and 60-verify on a
trusted game at Silver or above, going by that game's timings.json. A game
is trusted when it was made under kit 0.0.32 or earlier (merged after a
maintainer's review, the only check there was), when every model that ran
its coverage and verify steps was already proven, or when a maintainer has
checked it (kit/CHECKING.md) and recorded the check as `verification` in
its game.json. A game built on an imported analysis (`imported` in
game.json) also counts the models that wrote it, `unknown` when unsaid,
and proves no model itself. Nor does a game prove a model whose own work
on it failed a check: when a sample was refuted and a proven model then
redid the coverage and verify steps, the passing `verification` keeps the
failed sample under `failed`, and the models named there are left out. The
models kit/models.json declares are proven from the start. Any model may
run the kit (AGENTS.md, "Model"); a game that is not trusted cannot be
Silver.

Ids are recorded exactly as the session names them, and compared without
a context-window suffix: claude-opus-5-5[1m] is the same model as
claude-opus-5-5, run with a larger context, so either proves the other.

Usage:
  models.py                  the proven models, each with the games that proved it
  models.py is-proven <id>   exit 0 if proven, 1 if not
  models.py check            exit 1 if a Silver-or-above game needs a check it lacks
  models.py --test           self-check on made-up games (writes only to a temp dir)
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SILVER_UP = ("silver", "silver-claimed", "gold", "platinum")
PROVING_STEPS = ("50-coverage", "60-verify")
RULE_FROM = (0, 0, 33)
CONTEXT_SUFFIX = re.compile(r"\[\d+(?:\.\d+)?[km]\]$", re.I)   # [1m], [200k]: the context window, not the model


def base(model):
    """The model an id names, without a context-window suffix such as [1m]."""
    return CONTEXT_SUFFIX.sub("", str(model or "").strip()) or "unknown"


def games():
    """(game dir, game.json, timings entries) for every game."""
    out = []
    for gj in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json"))):
        gdir = os.path.dirname(gj)
        try:
            g = json.load(open(gj))
        except (OSError, ValueError):
            continue
        tp = os.path.join(gdir, "timings.json")
        try:
            t = json.load(open(tp)).get("entries", []) if os.path.isfile(tp) else []
        except (OSError, ValueError):
            t = []
        out.append((gdir, g, t))
    return out


def step_models(entries, step):
    return {base(e.get("model")) for e in entries if e.get("step") == step}


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


def failed_models(g):
    """The models whose own work on this game a maintainer's check refuted: `verification.failed`,
    a list of the samples that did not pass, each with the `model` whose claims it tested."""
    v = g.get("verification")
    failed = v.get("failed") if isinstance(v, dict) else None
    return {base(f.get("model")) for f in failed if isinstance(f, dict)} if isinstance(failed, list) else set()


def verification_problem(v, P):
    """Why a game.json `verification` record does not pass, or '' when it does."""
    if not isinstance(v, dict):
        return "no `verification` in game.json"
    for k in ("by", "model", "date", "checked", "wrong"):
        if v.get(k) in (None, ""):
            return f"`verification` has no `{k}`"
    if base(v["model"]) not in P:
        return f"the check ran on {v['model']!r}, which is not a proven model"
    if not isinstance(v["checked"], int) or v["checked"] < 1:
        return "`verification.checked` must count the claims checked"
    if v["wrong"] != 0:
        return f"the check found {v['wrong']} wrong claim(s); fix them and check again"
    return ""


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
            ok = before_rule(g) or (used and used <= set(P)) or not verification_problem(g.get("verification"), P)
            if not ok:
                left.append((gdir, g, t, used)); continue
            changed = True
            if g.get("imported"):
                continue    # finishing another's analysis proves nothing about the model that finished it
            # a model whose claims on this game were refuted, and then replaced by another's, proved nothing here
            for m in (step_models(t, PROVING_STEPS[0]) & step_models(t, PROVING_STEPS[1])) - {"unknown"} - failed_models(g):
                P.setdefault(m, []).append(os.path.relpath(gdir, ROOT))
        pending = left
    untrusted = []
    for gdir, g, t, used in pending:
        if not used:
            why = "timings.json has no 50-coverage or 60-verify step to say which model did them"
        else:
            why = verification_problem(g.get("verification"), P)
        untrusted.append((gdir, sorted(used - set(P)), why))
    return P, untrusted


def proven():
    return settle()[0]


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
        print(f"        a maintainer's check makes it Silver (kit/CHECKING.md); until then its tier is bronze")
    return len(untrusted) + len(bad)


def test():
    """Three made-up games: one a proven model made, one checked, one checked after a failed sample."""
    import tempfile
    global ROOT
    keep = ROOT
    steps = lambda *models: {"entries": [{"step": s, "model": m} for m in models for s in PROVING_STEPS]}
    check_ok = {"by": "someone", "model": "old-hand", "date": "2026-01-01", "checked": 33, "wrong": 0}
    made = {
        "first":  ({"tier": "silver", "kit_version": "0.0.20"}, steps("old-hand")),                # before the rule
        "second": ({"tier": "silver", "kit_version": "0.0.60", "verification": check_ok}, steps("newcomer")),
        "third":  ({"tier": "silver", "kit_version": "0.0.60",
                    "verification": dict(check_ok, failed=[{"model": "guesser[1m]", "date": "2026-01-01",
                                                            "checked": 39, "wrong": 18}])},
                   steps("guesser", "old-hand")),
        "fourth": ({"tier": "silver", "kit_version": "0.0.60"}, steps("guesser")),                  # never checked
    }
    try:
        with tempfile.TemporaryDirectory() as tmp:
            ROOT = tmp
            os.makedirs(os.path.join(tmp, "kit"))
            for slug, (g, t) in made.items():
                d = os.path.join(tmp, "games", "x", slug)
                os.makedirs(d)
                json.dump(g, open(os.path.join(d, "game.json"), "w"))
                json.dump(t, open(os.path.join(d, "timings.json"), "w"))
            P, untrusted = settle()
            assert set(P) == {"old-hand", "newcomer"}, P                  # a passed check proves the run's model
            assert "guesser" not in P                                      # a refuted one's does not
            assert os.path.join("games", "x", "third") in P["old-hand"], P  # the model that redid it is counted
            assert [os.path.relpath(u[0], tmp) for u in untrusted] == [os.path.join("games", "x", "fourth")], untrusted
    finally:
        ROOT = keep
    print("ok - models.py self-check: a passed check proves the run's model, a refuted sample's model stays unproven")


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
        sys.exit(0 if is_proven(a[1]) else 1)
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
