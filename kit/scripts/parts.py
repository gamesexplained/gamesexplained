#!/usr/bin/env python3
"""The parts of a game that is more than one load.

A part is one of the things the same addresses hold at different times.
What makes one is the machine's: where a game loads from disk or tape, a
part is a load as the player meets it, the program as it stands when the
loading is over and something happens. However many files arrive behind
one loading screen, they are one part; an intro, each level that is loaded
on its own and an ending are a part each.

Each part is a folder, games/<platform>/<slug>/parts/<id>/, laid out as a
small game folder, and the folder says everything about the part. No file
lists the parts: a game has the parts it has folders for, so two people
adding two parts never write the same file.

  part.json      what the part is: "title", as the page names it; "order",
                 a number, its place among the parts as they are played;
                 "over", the id of the part it lies over, when it does, and
                 then "ranges"; and what the scripts read for one image:
                 "video", "coverage", "io", "regions"
  symbols.json, listing.json, facts.md, and a gitignored work/ with the
  part's snapshots (work/entry.<ext> is the hand-over, as for any game)

Every script that takes a <game dir> takes a part's folder in its place:
symbols_export.py, symbols_import.py, listing.py, coverage.py,
check_listing.py. The game folder keeps what is about the game as a whole
(game.json, index.html, features.md, orientation.md, its own facts.md),
and its game.json says nothing of the parts.

Every byte has one owner. A part owns every address its ledger tracks,
unless it names the part it lies "over": then it owns only its "ranges"
(the addresses its load writes, as [["$4000", "$8FFF"], ...] in part.json)
and the rest of memory is the other part's, which in turn does not own
them. So a game's coverage, the sum over its parts, counts each byte once:
a resident engine once, however many levels are loaded over it. Parts
that name no other share nothing, whatever their addresses: each is an
address space of its own.

Usage:
  parts.py <game dir>                  list the parts, with each one's coverage
  parts.py add <game dir> <id> [--title "..."] [--over <id>] [--adopt]
                                       add a part, after the ones there are: its folder.
                                       To move it, change "order" in its part.json.
                                       --adopt makes the game folder's own symbols.json,
                                       listing.json, facts.md and ledger settings this
                                       part's, for a game that turned out to have more
                                       loads after its first was analysed
"""
import glob, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ID = re.compile(r"[a-z0-9]+(-[a-z0-9]+)*")
LEDGER_KEYS = ("video", "coverage", "io", "regions")   # one image's ledger settings: a part's are in part.json
EMPTY = {"video": {"screen": "", "charset": ""}, "coverage": {"exclude": [], "extra": [], "include": []},
         "io": [], "regions": []}


def hexint(s):
    return int(s[1:], 16) if isinstance(s, str) and s.startswith("$") else int(s)


def home(gdir):
    """(game folder, part id) for a game folder or the folder of one of its parts; the id
    is None for the game's own."""
    gdir = os.path.abspath(gdir)
    if os.path.isfile(os.path.join(gdir, "part.json")):
        return os.path.dirname(os.path.dirname(gdir)), os.path.basename(gdir)
    return gdir, None


def parts(gdir):
    """[{id, title, order, over, dir}] for the folders under parts/ that hold a part.json, in
    the order they are played; [] for a game that is one load."""
    out = []
    for f in glob.glob(os.path.join(gdir, "parts", "*", "part.json")):
        own, d = json.load(open(f)), os.path.dirname(f)
        pid = os.path.basename(d)
        out.append({"id": pid, "title": own.get("title") or pid, "order": own.get("order", 0),
                    "over": own.get("over") or None, "dir": d})
    return sorted(out, key=lambda p: (p["order"], p["id"]))


def under(P, p):
    """The parts p lies over, nearest first."""
    by, out = {q["id"]: q for q in P}, []
    while p.get("over"):
        q = by.get(p["over"])
        if q is None:
            sys.exit(f'part {p["id"]} lies over {p["over"]!r}, and the game has no part of that name')
        if q in out or q["id"] == p["id"]:
            sys.exit(f'part {p["id"]}: "over" goes round in a circle')
        out.append(q); p = q
    return out


def above(P, p):
    """The parts that lie over p, directly or through another."""
    return [q for q in P if any(u["id"] == p["id"] for u in under(P, q))]


def settings(p):
    """A part's part.json; {} when it has none yet."""
    f = os.path.join(p["dir"], "part.json")
    return json.load(open(f)) if os.path.isfile(f) else {}


def ranges(p):
    """The addresses a part's load owns, as (first, last) pairs; [] when it owns its whole image."""
    return sorted((hexint(a), hexint(b)) for a, b in settings(p).get("ranges") or [])


def started(p):
    """True once the part has a symbol map with something in it."""
    f = os.path.join(p["dir"], "symbols.json")
    if not os.path.isfile(f):
        return False
    S = json.load(open(f))
    return bool(S.get("blocks") or S.get("symbols") or S.get("comments"))


def elsewhere(P, p):
    """[[first, last, whose]] for every address p does not own: all but its own ranges when it
    lies over another part, and the ranges of the parts that lie over it."""
    out, lower = [], under(P, p)
    if lower:
        own = ranges(p)
        if not own:
            sys.exit(f'part {p["id"]} lies over {lower[0]["id"]} but its part.json has no "ranges": say which '
                     "addresses its load owns, or every byte of the part beneath is counted twice")
        a = 0
        for lo, hi in own:
            if lo > a:
                out.append([a, lo - 1, lower[0]["title"]])
            a = max(a, hi + 1)
        if a < 0x10000:
            out.append([a, 0xFFFF, lower[0]["title"]])
    lent = sorted((lo, hi, q["title"]) for q in above(P, p) for lo, hi in ranges(q))
    merged = []
    for lo, hi, who in lent:    # several parts at the same addresses (one level after another) are one range
        if merged and lo <= merged[-1][1] + 1:
            merged[-1][1] = max(merged[-1][1], hi)
            if who not in merged[-1][2]:
                merged[-1][2].append(who)
        else:
            merged.append([lo, hi, [who]])
    for lo, hi, who in merged:
        out.append([lo, hi, who[0] if len(who) == 1 else f"{len(who)} parts: {', '.join(who[:3])}"
                    + (" and others" if len(who) > 3 else "")])
    return out


def load_game(gdir):
    """A game folder's game.json. For a part's folder: the game's, with the part's own ledger
    settings in place of the game's, "part" ({id, title, over}) and "elsewhere", the addresses
    another part owns (symbols_export.regions leaves them out of this part's ledger)."""
    top, pid = home(gdir)
    game = json.load(open(os.path.join(top, "game.json")))
    if pid is None:
        return game
    P = parts(top)
    me = next(p for p in P if p["id"] == pid)
    own = settings(me)
    out = {k: v for k, v in game.items() if k not in LEDGER_KEYS}
    out.update({k: own.get(k, EMPTY[k]) for k in LEDGER_KEYS})
    out["part"] = {"id": pid, "title": me["title"], "over": [q["id"] for q in under(P, me)]}
    out["elsewhere"] = elsewhere(P, me)
    return out


def owned(a, away):
    return not any(lo <= a <= hi for lo, hi, _ in away)


def clip(blocks, syms, comments, away):
    """(blocks, symbols, comments, left out): what lies at addresses this part owns, and the
    user's labels and comments that do not. A block that straddles an edge is cut at it."""
    kept = []
    for b in sorted(blocks, key=lambda b: b["start"]):
        a = b["start"]
        while a <= b["end"]:
            if not owned(a, away):
                a = min(hi for lo, hi, _ in away if lo <= a <= hi) + 1
                continue
            e = min([b["end"]] + [lo - 1 for lo, hi, _ in away if lo > a])
            kept.append(dict(b, start=a, end=e))
            a = e + 1
    left = [s for s in syms if not owned(s["address"], away) and s.get("kind", "user") == "user"] + \
           [c for c in comments if not owned(c["address"], away)]
    return (kept, [s for s in syms if owned(s["address"], away)],
            [c for c in comments if owned(c["address"], away)], left)


def seed(gdir):
    """(game, symbol map) to start a disassembler on a part's snapshot: its own symbols.json
    and, where it lies over other parts, theirs for the addresses it does not own, so that the
    code it calls and the variables it shares are named."""
    game = load_game(gdir)
    sym = json.load(open(os.path.join(gdir, "symbols.json")))
    top, pid = home(gdir)
    if pid is None:
        return game, sym
    P = parts(top)
    me = next(p for p in P if p["id"] == pid)
    taken = [[lo, hi, ""] for lo, hi in ranges(me)]      # every address an entry has come from already
    sym = dict(sym, blocks=list(sym["blocks"]), symbols=list(sym["symbols"]), comments=list(sym["comments"]))
    for q in under(P, me):
        f = os.path.join(q["dir"], "symbols.json")
        if not os.path.isfile(f):
            continue
        other = json.load(open(f))
        b, s, c, _ = clip(other["blocks"], other["symbols"], other["comments"], taken)
        sym["blocks"] += b; sym["symbols"] += s; sym["comments"] += c
        taken += [[x["start"], x["end"], ""] for x in b]
    return game, sym


def names_under(gdir, game=None):
    """{address: name} from the parts gdir's part lies over, nearest first, for the addresses
    it does not own: how an operand that points out of the part is named. {} for a game
    folder, or a part that lies over none."""
    top, pid = home(gdir)
    out = {}
    if pid is None:
        return out
    away = (game or load_game(gdir)).get("elsewhere") or []
    P = parts(top)
    for q in under(P, next(p for p in P if p["id"] == pid)):
        f = os.path.join(q["dir"], "symbols.json")
        if os.path.isfile(f):
            for s in json.load(open(f))["symbols"]:
                if not owned(s["address"], away):
                    out.setdefault(s["address"], s["name"])
    return out


def table(gdir):
    """The parts with each one's coverage, as lines; and (tracked, explained, started, listed)."""
    sys.path.insert(0, HERE)
    from coverage import tracked_count
    P = parts(gdir)
    T = E = n = 0
    w = max([len(p["id"]) for p in P] + [3])
    lines = []
    for p in P:
        if not started(p):
            lines.append(f"  {p['id']:<{w}}  not started"); continue
        t, e = tracked_count(p["dir"])
        T += t; E += e; n += 1
        lines.append(f"  {p['id']:<{w}}  {e:>6} of {t:>6} bytes explained  {100 * e / t if t else 0:5.1f} %")
    lines.append(f"  {'all':<{w}}  {E:>6} of {T:>6} bytes explained  {100 * E / T if T else 0:5.1f} %"
                 f"  in {n} of {len(P)} parts")
    return lines, (T, E, n, len(P))


def add(gdir, pid, title=None, over=None, adopt=False):
    gj = os.path.join(gdir, "game.json")
    if not os.path.isfile(gj):
        sys.exit(f"{gdir} has no game.json: give the game's folder")
    if not ID.fullmatch(pid):
        sys.exit("a part's id is lowercase letters, digits and hyphens: it becomes a folder and a URL")
    raw = open(gj, encoding="utf-8").read()
    game, P = json.loads(raw), parts(gdir)
    if pid in [p["id"] for p in P]:
        sys.exit(f"{pid} is already one of this game's parts")
    if over and over not in [p["id"] for p in P]:
        sys.exit(f"--over {over}: no such part; add the part beneath first")
    d = os.path.join(gdir, "parts", pid)
    if os.path.exists(d):
        sys.exit(f"{d} already exists")
    own = [f for f in ("symbols.json", "listing.json") if os.path.isfile(os.path.join(gdir, f))]
    has = "listing.json" in own
    if "symbols.json" in own:
        S = json.load(open(os.path.join(gdir, "symbols.json")))
        has = has or bool(S.get("blocks") or S.get("symbols") or S.get("comments"))
    if has and not adopt:
        sys.exit(f"{gdir} has a symbol map of its own: a game with parts keeps every one in a part.\n"
                 "Make it this part's with --adopt, or add the part it describes first, with --adopt.")
    if adopt and not has:
        sys.exit(f"--adopt: {gdir} has no symbol map of its own to adopt")
    os.makedirs(os.path.join(d, "work"))
    name = title or pid.replace("-", " ").capitalize()
    part = {"title": name, "order": max([p["order"] for p in P] + [0]) + 1}
    if over:
        part.update({"over": over, "ranges": []})
    part.update(json.loads(json.dumps(EMPTY)))
    stale = [k for k in LEDGER_KEYS if game.get(k) not in (None, EMPTY[k])]   # game.json's own, read by nothing now
    if adopt:
        part.update({k: game[k] for k in LEDGER_KEYS if k in game})
        for f in own + ["facts.md"]:
            if os.path.isfile(os.path.join(gdir, f)):
                shutil.move(os.path.join(gdir, f), os.path.join(d, f))
        with open(os.path.join(gdir, "facts.md"), "w") as f:
            f.write(f"# {game.get('title') or game.get('slug')} — verified technical facts\n\n"
                    "What is true of the game as a whole: how its parts follow one another, and what they share.\n"
                    "Each part's own facts are in `parts/<id>/facts.md`.\n")
        # game.json is rewritten only when that changes nothing but the settings that moved: a file
        # laid out by hand is its author's, and they take the four keys out themselves
        rest = {k: v for k, v in game.items() if k not in LEDGER_KEYS}
        if json.dumps(game, indent=2) == raw.rstrip("\n"):
            with open(gj, "w", encoding="utf-8") as f:
                f.write(json.dumps(rest, indent=2) + raw[len(raw.rstrip("\n")):])
            stale = []
    else:
        if "symbols.json" in own:   # the empty symbol map new_game.py wrote: the parts hold them
            os.remove(os.path.join(gdir, "symbols.json"))
        with open(os.path.join(d, "symbols.json"), "w") as f:
            json.dump({"schema": 1, "platform": game.get("platform"), "game": game.get("slug"), "part": pid,
                       "build": game.get("build"), "source": "parts.py", "blocks": [], "symbols": [], "comments": []},
                      f, indent=1)
        with open(os.path.join(d, "facts.md"), "w") as f:
            f.write(f"# {game.get('title') or game.get('slug')}: {name} — verified technical facts\n\n"
                    "What is true of this part alone. An address here is an address in this part.\n")
    with open(os.path.join(d, "part.json"), "w") as f:
        json.dump(part, f, indent=2)
    with open(os.path.join(d, "work", "README.md"), "w") as f:
        f.write("# work/\n\nGitignored, like the game's own `work/`: this part's snapshots, its disassembler\n"
                "project and its annotation log. Nothing in this folder is ever committed or uploaded.\n\n"
                "To rebuild it from your own copy of the game, follow the route to this part in the\n"
                "game's `orientation.md`, then\n"
                "`python3 kit/scripts/symbols_import.py <this part's folder> <your snapshot>`.\n")
    print(f"added {os.path.relpath(d)}" + (f", over {over}" if over else "")
          + (": the game's own symbol map, listing, facts and ledger settings are this part's now" if adopt else ""))
    if stale:
        print(f"next: take {', '.join(stale)} out of {os.path.relpath(gj)}: "
              + ("they are in this part's part.json now" if adopt else "a part's are in its own part.json")
              + ", and a game with parts reads none from game.json (check_listing.py says so while they stay)")
    if over:
        print(f'next: put the addresses its load writes in {os.path.relpath(os.path.join(d, "part.json"))} '
              'as "ranges", e.g. [["$4000", "$8FFF"]]')


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    if argv[0] == "add":
        rest, opt, i = [], {}, 1
        while i < len(argv):
            if argv[i] in ("--title", "--over"):
                if i + 1 >= len(argv):
                    sys.exit(f"{argv[i]} needs a value")
                opt[argv[i][2:]] = argv[i + 1]; i += 2
            elif argv[i] == "--adopt":
                opt["adopt"] = True; i += 1
            else:
                rest.append(argv[i]); i += 1
        if len(rest) != 2:
            sys.exit('usage: parts.py add <game dir> <id> [--title "..."] [--over <id>] [--adopt]')
        add(rest[0], rest[1], **opt); return
    if not parts(argv[0]):
        print(f"{argv[0]}: one load, no parts"); return
    print("\n".join(table(argv[0])[0]))


if __name__ == "__main__":
    main()
