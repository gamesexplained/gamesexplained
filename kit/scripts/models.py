#!/usr/bin/env python3
"""Which models are proven, and which games still need a maintainer's check.

A model is proven when it has run both 50-coverage and 60-verify on a
trusted game at Silver or above, going by that game's timings.json. A game
is trusted when it was made under kit 0.0.32 or earlier (merged after a
maintainer's review, the only check there was), when every model that ran
its coverage and verify steps was already proven, or when a maintainer has
checked it (kit/CHECKING.md) and recorded the check as `verification` in
its game.json. The models kit/models.json declares are proven from the start. Any model may run the kit (AGENTS.md, "Model"); a game that
is not trusted cannot be Silver.

Usage:
  models.py                  the proven models, each with the games that proved it
  models.py is-proven <id>   exit 0 if proven, 1 if not
  models.py check            exit 1 if a Silver-or-above game needs a check it lacks
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SILVER_UP = ("silver", "silver-claimed", "gold", "platinum")
PROVING_STEPS = ("50-coverage", "60-verify")
RULE_FROM = (0, 0, 33)


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
    return {e.get("model") or "unknown" for e in entries if e.get("step") == step}


def declared():
    """The models kit/models.json declares good enough without a check, by exact id."""
    try:
        return dict(json.load(open(os.path.join(ROOT, "kit", "models.json"))).get("declared") or {})
    except (OSError, ValueError):
        return {}


def before_rule(g):
    """Made under kit 0.0.32 or earlier, when a maintainer's review of the pull request was the only check."""
    try:
        return tuple(int(x) for x in str(g.get("kit_version", "")).split(".")) < RULE_FROM
    except ValueError:
        return False


def verification_problem(v, P):
    """Why a game.json `verification` record does not pass, or '' when it does."""
    if not isinstance(v, dict):
        return "no `verification` in game.json"
    for k in ("by", "model", "date", "checked", "wrong"):
        if v.get(k) in (None, ""):
            return f"`verification` has no `{k}`"
    if v["model"] not in P:
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
            used = set().union(*(step_models(t, s) for s in PROVING_STEPS))
            pending.append((gdir, g, t, used))
    changed = True
    while changed:
        changed, left = False, []
        for gdir, g, t, used in pending:
            ok = before_rule(g) or (used and used <= set(P)) or not verification_problem(g.get("verification"), P)
            if not ok:
                left.append((gdir, g, t, used)); continue
            changed = True
            for m in (step_models(t, PROVING_STEPS[0]) & step_models(t, PROVING_STEPS[1])) - {"unknown"}:
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
    return model in proven()


def check():
    _, untrusted = settle()
    for gdir, need, why in untrusted:
        rel = os.path.relpath(gdir, ROOT)
        print(f"  x  {rel} is Silver or above but ran on a model that is not proven ({', '.join(need) or 'none recorded'}): {why}")
        print(f"        a maintainer's check makes it Silver (kit/CHECKING.md); until then its tier is bronze")
    return len(untrusted)


def main():
    a = sys.argv[1:]
    if a and a[0] in ("-h", "--help"):
        print(__doc__); return
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
