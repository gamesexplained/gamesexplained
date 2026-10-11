#!/usr/bin/env python3
"""The preview of a pull request: a link to each game page it changes.

Vercel deploys every push to a pull request as a preview of the whole site,
and GitHub records the deployment against the push's commit. This asks
GitHub for the pull request's last commit, the address of that commit's
preview and the game folders the pull request changes, and prints the
preview's page for each game, for the debrief (kit/START.md, step 8). A
pull request that changes no game gets the preview's home page.

The data is public, so no login is needed. GITHUB_TOKEN or GH_TOKEN, when
set, is sent too, which raises GitHub's limit of 60 requests an hour.

Usage:
  preview.py <pull request number>

Exits 1 when the commit has no preview yet: Vercel deploys a minute or two
after a push, and a pull request from a fork waits until a maintainer lets
it deploy.
"""
import json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME = re.compile(r"games/([^/]+)/([^/]+)/")


def repo():
    """owner/name of the site's repository, from site/config.json."""
    cfg = json.load(open(os.path.join(ROOT, "site", "config.json")))
    return cfg["repo"].rstrip("/").split("github.com/")[-1]


def get(path):
    head = {"Accept": "application/vnd.github+json", "User-Agent": "gamesexplained-preview"}
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        head["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"https://api.github.com/repos/{repo()}/{path}", headers=head)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def games(files):
    """The game folders, as platform/slug, that changed files lie in, first seen first."""
    out = []
    for f in files:
        m = GAME.match(f)
        if m and f"{m[1]}/{m[2]}" not in out:
            out.append(f"{m[1]}/{m[2]}")
    return out


def pages(site, folders):
    """The preview's page for each game folder, or its home page when there is none."""
    site = site.rstrip("/")
    return [f"{site}/{g}/" for g in folders] or [site + "/"]


def changed_files(pr):
    files, page = [], 1
    while page <= 30:                    # GitHub lists at most 3,000 files
        batch = get(f"pulls/{pr}/files?per_page=100&page={page}")
        files += [f["filename"] for f in batch]
        if len(batch) < 100:
            break
        page += 1
    return files


def preview(sha):
    """The address of commit sha's deployed preview, or None."""
    for d in get(f"deployments?sha={sha}"):
        for s in get(f"deployments/{d['id']}/statuses"):
            if s.get("state") == "success" and s.get("environment_url"):
                return s["environment_url"]
    return None


def main(argv):
    if len(argv) != 2 or not argv[1].isdigit():
        print(__doc__.strip())
        return 0 if argv[1:] in (["-h"], ["--help"]) else 2
    pr = argv[1]
    sha = get(f"pulls/{pr}")["head"]["sha"]
    site = preview(sha)
    if not site:
        print(f"#{pr} has no preview of {sha[:7]} yet: Vercel deploys a minute or two after a push, "
              "and a pull request from a fork waits until a maintainer lets it deploy", file=sys.stderr)
        return 1
    for p in pages(site, games(changed_files(pr))):
        print(p)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
