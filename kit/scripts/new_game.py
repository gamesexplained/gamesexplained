#!/usr/bin/env python3
"""Create a game folder from the template.

Usage: new_game.py <platform> <slug> [--title "Game Title"]
Example: new_game.py c64 jupiter-lander --title "Jupiter Lander"

The slug is lowercase, hyphenated, and becomes the URL. Fills in game.json
with the platform, slug, title, kit version and creation date.
"""
import datetime, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    argv = sys.argv[1:]
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return
    platform, slug = argv[0], argv[1]
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
        sys.exit("slug must be lowercase letters, digits and hyphens")
    title = argv[argv.index("--title") + 1] if "--title" in argv else slug.replace("-", " ").title()
    dest = os.path.join(ROOT, "games", platform, slug)
    if os.path.exists(dest):
        sys.exit(f"{dest} already exists")
    tpl = os.path.join(ROOT, "kit", "template")
    shutil.copytree(tpl, dest)
    gj = os.path.join(dest, "game.json")
    game = json.load(open(gj))
    game.update({"platform": platform, "slug": slug, "title": title,
                 "created": datetime.date.today().isoformat(),
                 "kit_version": open(os.path.join(ROOT, "kit", "VERSION")).read().strip()})
    json.dump(game, open(gj, "w"), indent=2)
    for name in os.listdir(dest):
        p = os.path.join(dest, name)
        if name.endswith(".md"):
            s = open(p).read().replace("{{title}}", title).replace("{{slug}}", slug).replace("{{platform}}", platform)
            open(p, "w").write(s)
    print(f"created {dest}")
    print("next: copy the contributor's image into work/, then follow skills/core/re-orient")


if __name__ == "__main__":
    main()
