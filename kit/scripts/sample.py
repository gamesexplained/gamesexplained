#!/usr/bin/env python3
"""Draw the listing sample a checker marks, and count its verdicts (kit/skills/core/60-verify).

  sample.py draw <game dir> --seed <n> [--size 60] [--stratum <name>=<pattern>[:<size>]]... [--name <s>]
  sample.py count <sample.json> <verdicts.json>

draw takes the comments of the game's listing.json, and of every part's in a game of several
parts, and draws --size of them at random with the seed. A --stratum is the comments whose text
matches the pattern (a Python regular expression, searched), such as the ones a decoder wrote from
templates: --stratum generated='^Record \\d+:' draws 20 of those (or :<size>) apart from the rest,
which are the stratum "written". A comment goes to the first stratum it matches. It writes
<game dir>/work/reports/<name>/sample.json (name sample-<seed> by default): the seed, each
stratum's size and pattern, the SHA-256 of every listing.json it read, and each drawn comment's
folder, address, label and exact text, which is the list the checker is given.

count reads the checker's verdicts, a JSON list with one entry per comment: address, text (the
comment as the checker was given it), verdict, problem, evidence (kit/skills/core/60-verify/
checker.md). It counts nothing while a drawn comment has no verdict, or its verdict's text is not
the text drawn: a comment corrected between the draw and the check would leave the listing looking
better than it was. Every entry marked wrong, wrong-detail or doubtful is read against the code by
the run, which adds "held": true where the finding holds and false where it does not; count asks
for each one missing. It then prints the plain rate, its 95 % interval (Wilson), each stratum's
count, the rate weighted by the strata's sizes, and the sample's row for game.json's accuracy.
In a game of several parts, an entry names its part as the draw does ("folder").
"""
import hashlib, json, os, random, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from accuracy import wilson   # noqa: E402

FINDINGS = ("wrong", "wrong-detail", "doubtful")
VERDICTS = FINDINGS + ("right", "unverifiable")


def listings(gdir):
    """[(folder relative to the game, path)] of the game's listing.json and its parts'."""
    out = []
    if os.path.isfile(os.path.join(gdir, "listing.json")):
        out.append((".", os.path.join(gdir, "listing.json")))
    pdir = os.path.join(gdir, "parts")
    if os.path.isdir(pdir):
        for p in sorted(os.listdir(pdir)):
            f = os.path.join(pdir, p, "listing.json")
            if os.path.isfile(f):
                out.append((f"parts/{p}", f))
    return out


def population(gdir):
    """({folder: sha256}, [comment]) with every record of the game's listings that has a comment."""
    hashes, out = {}, []
    for folder, path in listings(gdir):
        with open(path, "rb") as f:
            raw = f.read()
        hashes[folder] = hashlib.sha256(raw).hexdigest()
        for r in json.loads(raw)["records"]:
            if r.get("c"):
                out.append({"folder": folder, "address": r["a"], "label": r.get("l", ""), "text": r["c"]})
    return hashes, out


def parse_stratum(spec):
    """(name, pattern, size) from name=pattern[:size]."""
    name, _, rest = spec.partition("=")
    m = re.fullmatch(r"(.*?)(?::(\d+))?", rest, re.S)
    if not name or not m.group(1):
        sys.exit(f"--stratum {spec!r}: give it as name=pattern or name=pattern:size")
    re.compile(m.group(1))
    return name, m.group(1), int(m.group(2) or 20)


def draw(gdir, seed, size=60, strata=(), name=None):
    """The sample, as written to sample.json."""
    hashes, comments = population(gdir)
    if not comments:
        sys.exit(f"{gdir}: no listing.json with comments")
    groups = {n: [] for n, _, _ in strata}
    groups["written"] = []
    for c in comments:
        n = next((n for n, p, _ in strata if re.search(p, c["text"])), "written")
        groups[n].append(dict(c, stratum=n))
    rng, drawn, rows = random.Random(seed), [], []
    for n, p, k in list(strata) + [("written", None, size)]:
        pool = groups[n]
        take = rng.sample(pool, min(k, len(pool)))
        drawn += sorted(take, key=lambda c: (c["folder"], c["address"]))
        rows.append({"name": n, "pattern": p, "population": len(pool), "drawn": len(take)})
    return {"seed": seed, "name": name or f"sample-{seed}", "population": len(comments),
            "strata": rows, "listings": hashes, "comments": drawn}


def key(c):
    return (c.get("folder") or ".", c["address"] if isinstance(c["address"], int) else int(str(c["address"]).lstrip("$"), 16))


def count(sample, verdicts):
    """(problems, result): problems are lines to fix before counting; result the figures."""
    got, problems = {}, []
    for v in verdicts:
        got.setdefault(key(v), []).append(v)
    for c in sample["comments"]:
        k, at = key(c), f"{c['folder']} ${c['address']:04X}" if c["folder"] != "." else f"${c['address']:04X}"
        vs = got.pop(k, [])
        if len(vs) != 1:
            problems.append(f"{at}: {len(vs)} verdicts, where one is needed")
            continue
        v = vs[0]
        if (v.get("text") or "").strip() != c["text"].strip():
            problems.append(f"{at}: the checker was given other text than was drawn\n    drawn:   {c['text'][:200]}"
                            f"\n    checked: {(v.get('text') or '(none given)')[:200]}")
        if v.get("verdict") not in VERDICTS:
            problems.append(f"{at}: verdict {v.get('verdict')!r} is none of {', '.join(VERDICTS)}")
        elif v["verdict"] in FINDINGS and not isinstance(v.get("held"), bool):
            problems.append(f"{at}: marked {v['verdict']}: read it against the code and add \"held\": true or false")
        c["wrong"] = v.get("verdict") in FINDINGS and v.get("held") is True
    for k in got:
        problems.append(f"{k[0]} ${k[1]:04X}: a verdict for a comment that was not drawn")
    if problems:
        return problems, None
    size, wrong = len(sample["comments"]), sum(c["wrong"] for c in sample["comments"])
    rows, weighted = [], 0.0
    for s in sample["strata"]:
        mine = [c for c in sample["comments"] if c["stratum"] == s["name"]]
        k = sum(c["wrong"] for c in mine)
        rows.append((s["name"], k, len(mine), s["population"]))
        if mine:
            weighted += s["population"] / sample["population"] * k / len(mine)
    return [], {"size": size, "wrong": wrong, "interval": wilson(wrong, size), "strata": rows,
                "weighted": weighted, "wrong_at": [key(c) for c in sample["comments"] if c["wrong"]]}


def pct(x):
    return f"{100 * x:.1f} %"


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    if argv[0] == "draw" and len(argv) > 1:
        gdir, opts = argv[1], argv[2:]
        def opt(flag, default=None):
            return opts[opts.index(flag) + 1] if flag in opts else default
        if "--seed" not in opts:
            sys.exit("draw needs --seed: the same seed draws the same sample")
        strata = [parse_stratum(opts[i + 1]) for i, o in enumerate(opts) if o == "--stratum"]
        s = draw(gdir, int(opt("--seed")), int(opt("--size", 60)), strata, opt("--name"))
        out = os.path.join(gdir, "work", "reports", s["name"], "sample.json")
        if os.path.exists(out):
            sys.exit(f"{out} exists: a sample is drawn once. Give a new seed, or --name, for another")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        for r in s["strata"]:
            if not r["population"]:
                print(f"stratum {r['name']}: no comment matches {r['pattern']!r}")
        with open(out, "w") as f:
            json.dump(s, f, indent=1)
        print(f"wrote {out}: " + "; ".join(f"{r['name']} {r['drawn']} of {r['population']}" for r in s["strata"])
              + f". Give the checker its comments as they are, and ask for each verdict with its text")
        return 0
    if argv[0] == "count" and len(argv) == 3:
        with open(argv[1]) as f, open(argv[2]) as g:
            sample, verdicts = json.load(f), json.load(g)
        problems, r = count(sample, verdicts)
        if problems:
            print(f"not counted: {len(problems)} to settle first")
            for p in problems:
                print("  " + p)
            return 1
        lo, hi = r["interval"]
        print(f"{sample['name']}: seed {sample['seed']}, {r['size']} of {sample['population']} comments")
        print(f"wrong {r['wrong']} of {r['size']} ({pct(r['wrong'] / r['size'])}), 95 % interval {pct(lo)} to {pct(hi)} (Wilson)")
        if len(r["strata"]) > 1:
            print("by stratum: " + "; ".join(f"{n} {k} of {m} drawn from {p}" for n, k, m, p in r["strata"])
                  + f"; weighted by the strata's sizes {pct(r['weighted'])}")
        if r["wrong_at"]:
            print("wrong: " + " ".join((f"{f} " if f != "." else "") + f"${a:04X}" for f, a in r["wrong_at"]))
        print("accuracy row, with fixed and models to fill in: "
              + json.dumps({"step": "sample", "size": r["size"], "wrong": r["wrong"], "fixed": None,
                            "seed": sample["seed"], "models": []}))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
