#!/usr/bin/env python3
"""Refuse a listing.json that does not match its symbols.json or its own bytes.

Two parts. Every user label and every comment in symbols.json appears in the listing
unchanged, and the listing records the hash of the symbols.json it was built from.
And every code record re-decodes, from the memory image the listing's own bytes
describe, to the same length, mnemonic, bytes and operand (listing.decode_problems):
the permanent guard against a decoder that drifts under a listing, and against an
off-by-one record (#142). Then the whole listing builds again from those bytes, with
the current kit, to the same file (listing.py --rebuild): a decoder, ledger or record
format that moved under a listing fails here until the listing is rebuilt (#210), and
bytes the ledger counts that the listing has no snapshot for are named. It needs no
snapshot. The empty symbols.json that new_game.py writes needs no listing yet.

Where a game commits a code map (codemap.json, from kit/<platform>/codemap.py),
every byte of it that ran, outside the ledger's exclusions, is typed Code in symbols.json: code typed as data
has no cross-references and still reads as explained (#184). Code only the
map's trace reached, typed as data, is listed to be read, since a trace can
walk into data.

A game of several parts (kit/scripts/parts.py) is checked part by part,
and so is the layout itself: every folder under parts/ is a part, each
has a place of its own in the order, a part that lies over another says
which addresses it owns, game.json keeps no settings a part should have,
no listing holds a row at an address another part owns, and an operand
that points at a part beneath reads as that part names it now.

Usage: check_listing.py [game dir ...]      default: every game, and every part of one
"""
import concurrent.futures
import glob, hashlib, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parts import ID, EMPTY, LEDGER_KEYS, parts, under, ranges, started, load_game, owned   # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LISTING = os.path.join(os.path.dirname(os.path.abspath(__file__)), "listing.py")


def untyped_code(gdir, S):
    """(ran, traced): the addresses gdir's codemap.json has as code that symbols.json S types as
    nothing or as data, those that ran and those only its trace reached; ([], []) with no map."""
    f = os.path.join(gdir, "codemap.json")
    if not os.path.isfile(f):
        return [], []
    cm = json.load(open(f))
    span = lambda key: {a for s, e in cm.get(key, []) for a in range(s, e + 1)}
    # what the ledger excludes is declared not the game's, with a reason: the boot's own code
    # in RAM (BASIC's CHRGET at $0073 runs during RUN) is the machine's, not untyped game code
    out = {a for lo, hi, *_ in (S.get("regions") or {}).get("exclude", []) for a in range(lo, hi + 1)}
    loose = span("code") - out - {a for b in S["blocks"] if b["type"] == "Code" for a in range(b["start"], b["end"] + 1)}
    ran = loose & span("ran")
    return sorted(ran), sorted(loose - ran)


def check(gdir):
    """(errors, notes) for one listing: errors fail the check, notes are printed as warnings."""
    lp, sp = os.path.join(gdir, "listing.json"), os.path.join(gdir, "symbols.json")
    S = json.load(open(sp))
    if not os.path.exists(lp):
        if not (S["blocks"] or S["symbols"] or S["comments"]):
            return [], []   # a new game's empty map: nothing to list yet
        return [f"{gdir}: no listing.json (run kit/scripts/listing.py)"], []
    L = json.load(open(lp))
    errs, notes = [], []
    sha = hashlib.sha256(open(sp, "rb").read()).hexdigest()
    if L.get("symbols_sha256") != sha:
        errs.append("listing.json was built from a different symbols.json; rebuild it")
    else:
        # every code record must re-decode, from the listing's own bytes, unchanged (#142)
        from listing import decode_problems
        bad = decode_problems(gdir)
        if bad:
            a, why = bad[0]
            errs.append(f"listing.json no longer agrees with the decoder at ${a:04X}: {why}"
                        + (f" (and {len(bad) - 1} more)" if len(bad) > 1 else ""))
        else:
            # the whole listing, built again from its own bytes with the current kit (#210)
            r = subprocess.run([sys.executable, LISTING, gdir, "--rebuild"], capture_output=True, text=True)
            if r.returncode:
                said = (r.stdout.strip() or r.stderr.strip() or "no output").splitlines()[0].replace("FAILED - ", "")
                errs.append(f"listing.json no longer rebuilds from its own bytes ({said}); "
                            f"rebuild it: listing.py {gdir} --rebuild --write")
            from listing import LOST
            lost = [x for x in L["records"] if x.get("note") == LOST]
            if lost:
                notes.append(f"{gdir}: {sum(x['n'] for x in lost)} byte(s) the ledger counts are not in the listing "
                             f"(the first at ${lost[0]['a']:04X}); a build from the snapshot fills them")
    labels = {r["a"]: r.get("l") for r in L["records"] if "l" in r}
    comments = {r["a"]: r.get("c") for r in L["records"] if "c" in r}
    for s in S["symbols"]:
        if s.get("kind") == "user" and labels.get(s["address"]) != s["name"]:
            errs.append(f"label {s['name']} at ${s['address']:04X} missing or different in listing")
    for c in S["comments"]:
        if c["type"] == "line" and c["text"].strip() and comments.get(c["address"]) != c["text"]:
            errs.append(f"line comment at ${c['address']:04X} missing or different in listing")
    ran, traced = untyped_code(gdir, S)
    if ran:
        errs.append(f"{len(ran)} byte(s) that codemap.json records running as code are not typed Code in "
                    f"symbols.json (the first at ${ran[0]:04X}); type them as code")
    if traced:
        notes.append(f"{gdir}: codemap.json's trace reaches {len(traced)} byte(s) not typed Code (the first at "
                     f"${traced[0]:04X}): code the play never ran, or data the trace walked into; read them")
    if os.path.isfile(os.path.join(gdir, "part.json")):
        game = load_game(gdir)
        away = game.get("elsewhere") or []
        stray = [r["a"] for r in L["records"] if r.get("b") and not owned(r["a"], away)]
        if stray:
            errs.append(f"listing.json has {len(stray)} row(s) at addresses another part owns (the first at "
                        f"${stray[0]:04X}); export the part again and rebuild its listing")
        if game["part"]["over"] and L.get("symbols_sha256") == sha:
            from listing import relabel
            n = relabel(gdir, write=False)
            if n:
                errs.append(f"{n} operand(s) point at a part beneath this one whose names have changed since the "
                            "listing was built; name them again: listing.py <part> --relabel")
    return [f"{gdir}: {e}" for e in errs[:20]], notes


def check_parts(gdir):
    """The layout of a game of several parts: the folders under parts/, each saying what it is."""
    errs = []
    have = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(gdir, "parts", "*", "")))
    try:
        game = json.load(open(os.path.join(gdir, "game.json")))
        P = parts(gdir)
    except Exception as e:
        return [f"{gdir}: game.json or a part.json cannot be read ({e})"]
    ids = [p["id"] for p in P]
    for d in have:
        if d not in ids:
            errs.append(f"parts/{d} has no part.json, so it is no part (parts.py add makes one)")
    if game.get("parts"):
        errs.append('game.json has a "parts" list: the parts are their folders. Put each entry\'s title, its place in '
                    'the order ("order") and what it lies over in parts/<id>/part.json, and take the list out')
    if not have:
        return [f"{gdir}: {e}" for e in errs]
    for p in P:
        if not ID.fullmatch(p["id"]):
            errs.append(f"part id {p['id']!r} is not lowercase letters, digits and hyphens")
        same = [q["id"] for q in P if q["order"] == p["order"]]
        if same[0] == p["id"] and len(same) > 1:
            errs.append(f'parts {" and ".join(same)} have the same "order" ({p["order"]}): give each its place')
        if p["over"] and p["over"] not in ids:
            errs.append(f"part {p['id']} lies over {p['over']!r}, and the game has no part of that name")
        elif p["over"] and started(p) and not ranges(p):   # a part not analysed need not know them
            errs.append(f'part {p["id"]} lies over {p["over"]} but its part.json has no "ranges": '
                        "say which addresses its load owns")
        elif not p["over"] and ranges(p):
            errs.append(f'part {p["id"]} has "ranges" but lies over no part: name the part beneath it as "over", '
                        "or drop the ranges")
    if not errs:
        try:
            for p in P:
                under(P, p)
        except SystemExit as e:
            errs.append(str(e))
    stale = [k for k in LEDGER_KEYS if game.get(k) not in (None, EMPTY[k])]
    if stale and P:
        errs.append(f"game.json has {', '.join(stale)}, which nothing reads in a game with parts: "
                    "each part's are in its own part.json")
    S = os.path.join(gdir, "symbols.json")
    if os.path.isfile(S):
        s_ = json.load(open(S))
        if s_.get("blocks") or s_.get("symbols") or s_.get("comments") or os.path.isfile(os.path.join(gdir, "listing.json")):
            errs.append("the game folder has a symbol map of its own beside its parts; it belongs to one of them "
                        "(parts.py add <game> <id> --adopt)")
    return [f"{gdir}: {e}" for e in errs]


def main():
    argv = sys.argv[1:]
    if argv and argv[0] in ("-h", "--help"):
        print(__doc__); return
    games = argv or [os.path.dirname(p) for p in sorted(glob.glob(os.path.join(ROOT, "games", "*", "*", "game.json")))]
    errs, dirs = [], []
    for g in games:
        if os.path.isfile(os.path.join(g, "part.json")):     # a part, given by its own folder
            dirs.append(g); continue
        layout = check_parts(g)
        errs += layout
        if os.path.isfile(os.path.join(g, "symbols.json")):
            dirs.append(g)
        if not layout:
            dirs += [p["dir"] for p in parts(g) if os.path.isfile(os.path.join(p["dir"], "symbols.json"))]
    # one listing never touches another: the rebuild of each runs on its own,
    # so they are checked side by side and the report still comes out in folder order.
    # processes, not threads: check() re-decodes every record in Python, and the
    # GIL would serialize that; each worker is handed one listing folder
    workers = min(8, os.cpu_count() or 2)
    with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as ex:
        fut = {ex.submit(check, d): d for d in dirs}
        got = {}
        for f in concurrent.futures.as_completed(fut):
            got[fut[f]] = f.result()
    for d in dirs:
        dir_errs, notes = got[d]
        for n in notes:
            print(f"  !  {n}")
        errs += dir_errs
    for e in errs:
        print("  x ", e)
    if errs:
        print(f"\nFAILED - {len(errs)} mismatch(es)"); sys.exit(1)
    print(f"OK - {len(dirs)} listing(s) match their symbols")


if __name__ == "__main__":
    main()
