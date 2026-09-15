#!/usr/bin/env python3
"""Refuse a listing.json that does not match its symbols.json.

listing.json is derived from symbols.json plus a private snapshot, so CI
cannot rebuild it; it checks instead that every user label and every
comment in symbols.json appears in the listing unchanged, and that the
listing records the hash of the symbols.json it was built from.

Usage: check_listing.py [game dir ...]      default: every game
"""
import glob, hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def check(gdir):
    lp, sp = os.path.join(gdir, "listing.json"), os.path.join(gdir, "symbols.json")
    if not os.path.exists(lp):
        return [f"{gdir}: no listing.json (run kit/scripts/listing.py)"]
    L, S = json.load(open(lp)), json.load(open(sp))
    errs = []
    sha = hashlib.sha256(open(sp, "rb").read()).hexdigest()
    if L.get("symbols_sha256") != sha:
        errs.append("listing.json was built from a different symbols.json; rebuild it")
    labels = {r["a"]: r.get("l") for r in L["records"] if "l" in r}
    comments = {r["a"]: r.get("c") for r in L["records"] if "c" in r}
    for s in S["symbols"]:
        if s.get("kind") == "user" and labels.get(s["address"]) != s["name"]:
            errs.append(f"label {s['name']} at ${s['address']:04X} missing or different in listing")
    for c in S["comments"]:
        if c["type"] == "line" and c["text"].strip() and comments.get(c["address"]) != c["text"]:
            errs.append(f"line comment at ${c['address']:04X} missing or different in listing")
    return [f"{gdir}: {e}" for e in errs[:20]]


def main():
    dirs = sys.argv[1:] or [os.path.dirname(p) for p in glob.glob(os.path.join(ROOT, "games", "*", "*", "symbols.json"))]
    errs = []
    for d in dirs:
        errs += check(d)
    for e in errs:
        print("  x ", e)
    if errs:
        print(f"\nFAILED - {len(errs)} mismatch(es)"); sys.exit(1)
    print(f"OK - {len(dirs)} listing(s) match their symbols")


if __name__ == "__main__":
    main()
