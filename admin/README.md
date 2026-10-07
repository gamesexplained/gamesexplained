# Reviewing a pull request

CI runs the three checks, reproduces coverage figures and builds the site.

Claude reviews each pull request that adds or updates a game against the
checklists in `review-game-pr/`: `SKILL.md` says how, `new-game.md` and
`game-update.md` are the checklists, and `routine.md` is the hourly
routine that starts a review for each new one. Edit the checklists to
change what gets checked.

## Preview the site

```
gh pr checkout <n> --worktree /tmp/pr-preview
python3 /tmp/pr-preview/kit/scripts/build.py --out /tmp/pr-preview/_site
python3 -m http.server -d /tmp/pr-preview/_site 8001
```

`--worktree` leaves your own checkout on `main`. Open <http://localhost:8001> and review.

## Check by hand

```
gh pr view <n> --files                 # what arrived: one game, plus the retro's kit fixes
gh pr checks <n>                       # red here means stop
python3 /tmp/pr-preview/kit/scripts/coverage.py /tmp/pr-preview/games/<platform>/<slug>
```

## Merge and clean up

```
gh pr merge <n> --squash --delete-branch
gh run watch $(gh run list -w ci -b main -L 1 --json databaseId -q '.[0].databaseId')
curl -sI https://gamesexplained.com | head -1
git worktree remove /tmp/pr-preview
```
