#!/usr/bin/env python3
"""What a pull request is, and what it is made of, read from git alone.

  kind     new-game     adds a game folder main does not have (a new games/<p>/<slug>/game.json)
           game-update  changes exactly one game folder main already has
           other        anything else: the kit, the site, a sweep across games
  areas    lines added and removed, by what the files are (symbols, pages, kit code, ...)
  outside  every file outside the game folder, by area: what a reviewer reads line by line
  layout   files and folders in the game folder that the template does not have

Fetch the pull request first:
  git fetch -q origin main +pull/<n>/head:refs/remotes/pr/<n>

Usage: pr_shape.py <head ref> [<base ref>] [--json]      base defaults to origin/main
No dependencies.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME = re.compile(r"^games/([^/]+)/([^/]+)/")
TEMPLATE_MD = {"TODO.md", "agent-history.md", "cheats.md", "facts.md", "features.md",
               "kit-feedback.md", "orientation.md"}
GAME_TOP = TEMPLATE_MD | {"game.json", "symbols.json", "listing.json"}
GAME_DIRS = {"reference", "parts", "work"}


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], check=True, capture_output=True,
                          text=True).stdout


def area(path):
    """What a changed file is, for the size breakdown."""
    m = GAME.match(path)
    if m:
        rest = path[m.end():]
        name = rest.rsplit("/", 1)[-1]
        if name == "symbols.json":
            return "symbols.json"
        if name == "listing.json":
            return "listing.json"
        if name in ("game.json", "part.json"):
            return "game.json / part.json"
        if rest.startswith("reference/"):
            return "reference/"
        if "/" not in rest and name.endswith(".html"):
            return "pages (.html)"
        if ("/" not in rest and name in TEMPLATE_MD or rest.startswith("parts/") and name.endswith(".md")
                or rest == "work/README.md"):
            return "notes (.md)"
        return "other in the game folder"
    if path.startswith("kit/lessons/"):
        return "kit/lessons"
    if path.startswith("kit/skills/core/"):
        return "core skills"
    if path.startswith("kit/skills/"):
        return "platform skills"
    if path.endswith("INSTALL.md") or path == "site/status.json":
        return "install notes"
    if path.startswith("kit/"):
        return "kit (code and docs)"
    if path.startswith("site/"):
        return "site"
    return "other"


def shape(head, base):
    mb = git("merge-base", base, head).strip()
    stats = []
    for line in git("diff", "--numstat", "-M", mb, head).splitlines():
        add, rem, path = line.split("\t", 2)
        if " => " in path:   # a rename: keep the new name
            path = re.sub(r"\{[^{}]* => ([^{}]*)\}", r"\1", path)
            path = path.split(" => ")[-1].replace("//", "/")
        stats.append((path, None if add == "-" else int(add), None if rem == "-" else int(rem)))

    base_games = {m.group(0).rstrip("/") for m in map(GAME.match, git("ls-tree", "-r", "--name-only", mb, "games").splitlines()) if m}
    touched = sorted({GAME.match(p).group(0).rstrip("/") for p, _, _ in stats if GAME.match(p)})
    new = [g for g in touched if g not in base_games]
    old = [g for g in touched if g in base_games]
    if new:
        kind = "new-game"
    elif len(old) == 1:
        kind = "game-update"
    else:
        kind = "other"

    # Bytes on the head, by area: a one-line listing.json says nothing in lines.
    head_bytes = {}
    paths = [p for p, _, _ in stats]
    for i in range(0, len(paths), 200):
        for line in git("ls-tree", "-l", head, "--", *paths[i:i + 200]).splitlines():
            meta, path = line.split("\t", 1)
            size = meta.split()[3]
            head_bytes[path] = int(size) if size.isdigit() else 0

    areas = {}
    for p, a, r in stats:
        k = area(p)
        t = areas.setdefault(k, [0, 0, 0, 0])
        t[0] += a or 0
        t[1] += r or 0
        t[2] += 1
        t[3] += head_bytes.get(p, 0)
    outside = {}
    for p, a, r in stats:
        if not GAME.match(p):
            outside.setdefault(area(p), []).append((p, a, r))

    layout, sizes = [], {}
    head_files = git("ls-tree", "-r", "-l", head, "--", *touched).splitlines() if touched else []
    for line in head_files:
        meta, path = line.split("\t", 1)
        size = meta.split()[3]
        g = GAME.match(path).group(0).rstrip("/")
        sizes.setdefault(g, [0, 0])
        sizes[g][0] += int(size) if size.isdigit() else 0
        sizes[g][1] += 1
        rest = path[len(g) + 1:]
        top = rest.split("/", 1)[0]
        if "/" in rest:
            if top not in GAME_DIRS:
                layout.append(f"{g}/{top}/")
        elif top not in GAME_TOP and not top.endswith(".html"):
            layout.append(path)
        elif top.endswith(".md") and top not in TEMPLATE_MD:
            layout.append(path)
    layout = sorted(set(layout))

    return {"kind": kind, "base": mb[:10], "head": git("rev-parse", head).strip()[:10],
            "new_games": new, "updated_games": old,
            "areas": {k: {"added": v[0], "removed": v[1], "files": v[2], "bytes": v[3]} for k, v in
                      sorted(areas.items(), key=lambda kv: -kv[1][0])},
            "outside": {k: [{"path": p, "added": a, "removed": r} for p, a, r in v]
                        for k, v in sorted(outside.items())},
            "folder_bytes": {g: {"bytes": s, "files": n} for g, (s, n) in sizes.items()},
            "layout": layout}


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if not args or "-h" in argv or "--help" in argv:
        print(__doc__)
        return 0 if args or "-h" in argv or "--help" in argv else 2
    s = shape(args[0], args[1] if len(args) > 1 else "origin/main")
    if "--json" in argv:
        print(json.dumps(s, indent=1))
        return 0
    total = sum(v["added"] for v in s["areas"].values())
    print(f"kind: {s['kind']}   (merge base {s['base']}, head {s['head']})")
    for g in s["new_games"]:
        print(f"new game:     {g}")
    for g in s["updated_games"]:
        print(f"updated game: {g}")
    for g, v in s["folder_bytes"].items():
        print(f"  {g} on head: {v['bytes'] / 1e6:.1f} MB in {v['files']} files")
    print(f"\nlines by area (+{total} in all), and the changed files' size on the head:")
    for k, v in s["areas"].items():
        share = f"{100 * v['added'] / total:3.0f} %" if total else "    "
        print(f"  {k:26} +{v['added']:<7} -{v['removed']:<7} {share}  {v['files']:>4} file(s) {v['bytes'] / 1e3:8.0f} KB")
    if s["outside"]:
        print("\noutside the game folder:")
        for k, files in s["outside"].items():
            print(f"  {k}:")
            for f in files:
                n = "binary" if f["added"] is None else f"+{f['added']} -{f['removed']}"
                print(f"    {f['path']}  ({n})")
    if s["layout"]:
        print("\nnot in the template's layout (a page must depend on it, or it goes):")
        for p in s["layout"]:
            print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
