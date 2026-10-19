#!/usr/bin/env python3
"""Post a Discord announcement when a merged pull request updates a game.

The companion to the `announce` job in `.github/workflows/ci.yml`: that job
announces a game whose `game.json` a push added; this one announces an
update to a game that was already on the site. It runs on a push to `main`,
after the deploy, and works from the push range (`BEFORE`..HEAD):

- the games with changed files in the range, skipping any game the same
  push added and any game whose only changes are process files a reader
  never sees (`kit-feedback.md`, `agent-history.md`, `TODO.md`);
- the pull request the head commit belongs to (GitHub's "list pull
  requests associated with a commit"), which must be merged into `main`
  and must not carry a `no-announce` label;
- the summary, which is the pull request's title with its game prefix
  stripped. The prefix is the game's name (`Storm (C64):`) or its path
  (`c64/storm:`). A title that starts with neither announces nothing, so
  site-wide pull requests that touch game pages stay silent.

Environment (set by the workflow):
  BEFORE            the push's before-sha (may be all zeros)
  GITHUB_SHA        the push's head sha
  GITHUB_REPOSITORY owner/name
  GITHUB_TOKEN      used only to read the associated pull request
  DISCORD_WEBHOOK   where to post (WEBHOOK is accepted too)
  ANNOUNCE_DRY_RUN  when set, print the payloads instead of posting

Usage: announce_updates.py [-h]
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request

PLATFORM_LABELS = {"apple2": "Apple II", "bbc": "BBC Micro", "c64": "C64", "spectrum": "Spectrum"}
PROCESS_FILES = {"agent-history.md", "kit-feedback.md", "TODO.md"}
NO_ANNOUNCE_LABEL = "no-announce"


def _norm(text):
    return text.replace("’", "'").casefold()


def summary_from_title(title, game_title, platform, slug):
    """The PR title minus its game prefix, or None.

    The prefix is `<game> (<platform>):` or the game's path,
    `<platform>/<slug>:`. None when the title opens with neither: the
    title is the summary, so a title that never names the game — by name
    or by path — is not one.
    """
    labels = []
    for label in (PLATFORM_LABELS.get(platform), platform,
                  platform.upper() if platform else None):
        if label and label not in labels:
            labels.append(label)
    prefixes = ["%s (%s):" % (game_title, label) for label in labels]
    prefixes.append("%s:" % game_title)
    if platform and slug:
        prefixes.append("%s/%s:" % (platform, slug))
    norm_title = _norm(title)
    for prefix in prefixes:
        if norm_title.startswith(_norm(prefix)):
            summary = title[len(prefix):].strip()
            if summary.endswith(")") and " (#" in summary:
                summary = summary[:summary.rindex(" (#")].strip()
            return summary or None
    return None


def changed_game_dirs(changed_paths, added_game_json):
    """{game dir: [paths inside it]} for games a push changed.

    A game the same push added is the new-game announcement's business,
    and a change confined to process files is not an update.
    """
    games = {}
    for path in changed_paths:
        parts = path.split("/")
        if len(parts) < 4 or parts[0] != "games":
            continue
        game_dir = "/".join(parts[:3])
        if game_dir + "/game.json" in added_game_json:
            continue
        rel = "/".join(parts[3:])
        if rel in PROCESS_FILES:
            continue
        games.setdefault(game_dir, []).append(rel)
    return games


def merged_pr(pulls):
    """The merged-into-main pull request among those a commit names."""
    merged = [p for p in pulls
              if p.get("merged_at") and p.get("base", {}).get("ref") == "main"]
    if not merged:
        return None
    return max(merged, key=lambda p: p["merged_at"])


def build_payload(game, summary):
    url = "https://gamesexplained.com/%s/%s/" % (game["platform"], game["slug"])
    return {"content": "Updated on Games Explained: **%s** (%s) — %s %s"
                       % (game["title"], game["platform"], summary, url),
            "allowed_mentions": {"parse": []}}


def _git(*args):
    return subprocess.run(["git"] + list(args), capture_output=True, text=True,
                          check=True).stdout.splitlines()


def push_range(before, head):
    """(changed paths, added game.json paths) for a push to main."""
    zero = not before or set(before) == {"0"}
    if not zero and subprocess.run(
            ["git", "cat-file", "-e", before + "^{commit}"]).returncode != 0:
        zero = True
    if zero:
        # A first push has no before-sha; fall back to the head commit alone.
        if subprocess.run(["git", "rev-parse", head + "^"],
                          capture_output=True).returncode != 0:
            return [], set()
        before = head + "^"
    changed = _git("diff", "--name-only", before, head)
    added = _git("diff", "--name-only", "--diff-filter=A", before, head,
                 "--", "games/*/*/game.json")
    return changed, set(added)


def fetch_pulls(repo, sha, token):
    url = "https://api.github.com/repos/%s/commits/%s/pulls" % (repo, sha)
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "ge-announce-updates",
        "X-GitHub-Api-Version": "2022-11-28",
        **({"Authorization": "Bearer " + token} if token else {}),
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except Exception as exc:  # an API hiccup must not fail the announce job
        print("Could not look up the pull request for %s: %s" % (sha, exc))
        return []


def post(webhook, payload):
    req = urllib.request.Request(
        webhook, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json",
                 "User-Agent": "ge-announce-updates"})
    with urllib.request.urlopen(req) as resp:
        resp.read()


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Announce game updates from a merged pull request "
                    "to Discord. See the module docstring for the "
                    "environment it reads.")
    parser.parse_args(argv)

    webhook = os.environ.get("DISCORD_WEBHOOK") or os.environ.get("WEBHOOK")
    dry_run = bool(os.environ.get("ANNOUNCE_DRY_RUN"))
    if not webhook and not dry_run:
        print("No DISCORD_WEBHOOK secret; nothing posted.")
        return 0

    before = os.environ.get("BEFORE", "")
    head = os.environ.get("GITHUB_SHA") or "HEAD"
    changed, added = push_range(before, head)
    games = changed_game_dirs(changed, added)
    if not games:
        print("No updated games in this push.")
        return 0

    repo = os.environ.get("GITHUB_REPOSITORY", "")
    pr = merged_pr(fetch_pulls(repo, head, os.environ.get("GITHUB_TOKEN", "")))
    if pr is None:
        print("No merged pull request for %s; nothing posted." % head)
        return 0
    labels = {label.get("name") for label in pr.get("labels", [])}
    if NO_ANNOUNCE_LABEL in labels:
        print("Pull request #%s is labelled %s; nothing posted."
              % (pr["number"], NO_ANNOUNCE_LABEL))
        return 0

    for game_dir in sorted(games):
        try:
            with open(os.path.join(game_dir, "game.json")) as fh:
                game = json.load(fh)
        except Exception as exc:
            print("Skipping %s: %s" % (game_dir, exc))
            continue
        summary = summary_from_title(pr["title"], game["title"],
                                     game["platform"], game["slug"])
        if summary is None:
            print("Pull request #%s does not name %s; not announcing it."
                  % (pr["number"], game["title"]))
            continue
        payload = build_payload(game, summary)
        if dry_run:
            print(json.dumps(payload))
        else:
            print("Announcing update to %s" % game_dir)
            post(webhook, payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
