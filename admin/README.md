# Reviewing a pull request

CI runs the three checks, reproduces coverage figures and builds the site.

To have Claude review a pull request that adds or updates a game, run
`/review-game-pr <n>` in a session in this repo. The checklist is
`review-game-pr/SKILL.md`; edit it to change what gets checked. The skill is
not in `.claude/skills` (that is the contributor kit), so link it into your
own skills once:

```
ln -s "$PWD/admin/review-game-pr" ~/.claude/skills/review-game-pr
```

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

## Fix open issues

To have Claude work through the open issues, oldest first, run
`/fix-issues` in a session in this repo. The rules are
`fix-issues/SKILL.md`; edit it to change how issues are taken. Link it
into your own skills once, as above:

```
ln -s "$PWD/admin/fix-issues" ~/.claude/skills/fix-issues
```
