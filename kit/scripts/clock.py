#!/usr/bin/env python3
"""Wall-clock per workflow step, so runs can be compared and the next one made shorter.

A kit run takes hours. Every skill starts the clock for its step, the retro
stops it, and the figures go into the game's timings.json (committed) and
the runs table on the site's kit page. The agent never computes a time.

Usage:
  clock.py start <step> --model <id> [<game dir>] start a step; any open step is stopped first
  clock.py stop [--note "..."] [--agents N] [<game dir>]
                                                  stop the open step; say what dominated it
  clock.py report [<game dir>]                    the table for kit-feedback.md, and the portable figures

<step> is the skill folder name: 10-orient, 20-features, ... 80-retro. A step
may be started more than once (a second session); the report sums them.
--model is the id of the model doing the step, as your system prompt names
it (claude-opus-5, claude-fable-5-1, ...). It is required: a run can change
model between steps, and a time means nothing without the model that took it.
Record it even where the environment keeps model ids out of commits
(AGENTS.md, "Record what you used").
The game dir is the argument, else GAME_DIR, else the current directory when
it holds a game.json.

Portable figures, comparable across games and machines:
  minutes to play      the orient step: boot to steady-state play
  min per KB           the coverage step, per kilobyte the ledger tracks
  hours                everything, first start to last stop
--note on the coverage stop should say how many agents ran in parallel
(--agents N does it structurally) and what any long wait was for.
"""
import datetime, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)


def iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def parse(s):
    return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)


def game_dir(argv):
    for a in argv:
        if not a.startswith("--") and os.path.isfile(os.path.join(a, "game.json")):
            return os.path.abspath(a)
    if os.environ.get("GAME_DIR"):
        return os.path.abspath(os.environ["GAME_DIR"])
    if os.path.isfile("game.json"):
        return os.getcwd()
    sys.exit("no game dir: pass games/<platform>/<slug>, set GAME_DIR, or run inside the game folder")


def load(gdir):
    p = os.path.join(gdir, "timings.json")
    if os.path.isfile(p):
        return json.load(open(p))
    return {"schema": 1, "entries": []}


def save(gdir, T):
    with open(os.path.join(gdir, "timings.json"), "w") as f:
        json.dump(T, f, indent=1)


def close_open(T, t, note="", agents=None):
    for e in T["entries"]:
        if e.get("end") is None:
            e["end"] = iso(t)
            mins = (t - parse(e["start"])).total_seconds() / 60
            if mins < 0:
                print(f"warning: {e['step']} started after it stopped (clock skew?); recording 0 min", file=sys.stderr); mins = 0
            e["minutes"] = round(mins, 1)
            if note: e["note"] = note
            if agents is not None: e["agents"] = agents
            return e
    return None


def start(step, model, gdir):
    T = load(gdir); t = now()
    closed = close_open(T, t)
    if closed:
        print(f"stopped {closed['step']} after {closed['minutes']} min")
    T["entries"].append({"step": step, "model": model, "start": iso(t), "end": None, "minutes": None, "note": ""})
    save(gdir, T)
    print(f"started {step} at {iso(t)}  ({os.path.relpath(os.path.join(gdir, 'timings.json'), os.getcwd())})")


def stop(gdir, note, agents):
    T = load(gdir); t = now()
    closed = close_open(T, t, note, agents)
    if not closed:
        sys.exit("no open step to stop")
    save(gdir, T)
    print(f"stopped {closed['step']} after {closed['minutes']} min" + (f": {note}" if note else ""))


def tracked_bytes(gdir):
    """Bytes the ledger tracks for this game, from symbols.json; None when there is none yet."""
    try:
        sys.path.insert(0, HERE)
        from coverage import tracked_count
        return tracked_count(gdir)[0]
    except Exception:
        return None


def summarize(gdir):
    """Per-step totals and the portable figures. Used by report and by build.py."""
    T = load(gdir)
    steps, first, last, agents, models = {}, None, None, 0, []
    for e in T["entries"]:
        s = steps.setdefault(e["step"], {"minutes": 0.0, "sessions": 0, "notes": [], "open": False, "models": []})
        s["sessions"] += 1
        m = e.get("model") or "unknown"
        if m not in s["models"]: s["models"].append(m)
        if m not in models: models.append(m)
        if e.get("end") is None:
            s["open"] = True; continue
        s["minutes"] += e["minutes"]
        if e.get("note"): s["notes"].append(e["note"])
        if e.get("agents"): agents = max(agents, e["agents"])
        a, b = parse(e["start"]), parse(e["end"])
        first = a if first is None or a < first else first
        last = b if last is None or b > last else last
    total_min = sum(s["minutes"] for s in steps.values())
    tracked = tracked_bytes(gdir)
    cov = steps.get("50-coverage", {}).get("minutes", 0.0)
    return {
        "steps": steps,
        "hours": round(total_min / 60, 1),
        "span_hours": round(max(0, (last - first).total_seconds()) / 3600, 1) if first and last else None,
        "minutes_to_play": round(steps.get("10-orient", {}).get("minutes", 0.0), 1) or None,
        "coverage_minutes": round(cov, 1) or None,
        "tracked_bytes": tracked,
        "min_per_kb": round(cov / (tracked / 1024), 1) if cov and tracked else None,
        "agents": agents or None,
        "models": models,
    }


def report(gdir):
    S = summarize(gdir)
    if not S["steps"]:
        print("no timings yet"); return
    print("| Step | Minutes | Model | Sessions | What dominated |")
    print("|---|---:|---|---:|---|")
    for step in sorted(S["steps"]):
        s = S["steps"][step]
        print(f"| {step} | {s['minutes']:.0f}{' (open)' if s['open'] else ''} | {', '.join(s['models'])} | {s['sessions']} | {'; '.join(s['notes'])} |")
    print(f"| total | {S['hours'] * 60:.0f} | {', '.join(S['models'])} | | {S['hours']} h of work"
          + (f", over {S['span_hours']} h" if S['span_hours'] and S['span_hours'] != S['hours'] else "") + " |")
    print()
    print("Portable figures:")
    print(f"  minutes to play : {S['minutes_to_play'] if S['minutes_to_play'] is not None else 'n/a'}")
    if S["min_per_kb"] is not None:
        print(f"  min per KB      : {S['min_per_kb']}  ({S['coverage_minutes']} min for {S['tracked_bytes']:,} tracked bytes"
              + (f", {S['agents']} agents" if S['agents'] else "") + ")")
    else:
        print("  min per KB      : n/a (needs a coverage step and a symbols.json)")
    print(f"  hours           : {S['hours']}")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    cmd, rest = a[0], a[1:]
    if cmd == "start":
        if not rest or rest[0].startswith("--"): sys.exit("usage: clock.py start <step> --model <id> [<game dir>]")
        if "--model" not in rest or rest.index("--model") + 1 >= len(rest):
            sys.exit("clock.py start needs --model <id>: the model id your system prompt names, e.g. claude-opus-5.\n"
                     "A time is only comparable with the model that took it recorded beside it.")
        model = rest[rest.index("--model") + 1]
        start(rest[0], model, game_dir([r for r in rest[1:] if r != model]))
    elif cmd == "stop":
        note = rest[rest.index("--note") + 1] if "--note" in rest else ""
        agents = int(rest[rest.index("--agents") + 1]) if "--agents" in rest else None
        stop(game_dir([r for r in rest if r not in (note, str(agents))]), note, agents)
    elif cmd == "report":
        report(game_dir(rest))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
