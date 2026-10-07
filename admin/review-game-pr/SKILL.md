---
name: review-game-pr
description: Review a gamesexplained pull request that adds a game or updates one, against the maintainer's checklist, and recommend the next step. Run by hand on a PR number, or by the hourly routine in routine.md.
---

# Reviewing a game pull request

This is the maintainer's checklist, run by a Claude session working for
him. It lives in `admin/`, not `kit/skills/`, because `.claude/skills`
is the contributor kit and every contributor's agent reads it.

The result is one report the maintainer can act on in a single read: a
recommendation, the findings that need action, and a comment drafted for
the contributor. The session never acts on the pull request itself: no
comment, review, label, push, approval or merge. The maintainer decides,
and may then ask for any of those in the same thread.

## 1. Set up

Fetch the pull request and read its shape:

```
git fetch -q origin main +pull/<n>/head:refs/remotes/pr/<n>
python3 admin/review-game-pr/pr_shape.py pr/<n>
```

`pr_shape.py` gives the kind, and the kind picks the checklist:

| kind | checklist |
|---|---|
| `new-game` | `new-game.md` |
| `game-update` | `game-update.md` |
| `other` | none: say in one line that this skill does not cover it, and stop |

Then read the pull request on GitHub: its description, its author and
whether this is their first pull request here (`search_pull_requests`
with `repo:gamesexplained/gamesexplained author:<login>`), every review
and review comment, and the check runs on its head. Read what the
project already knows: its memory (`MEMORY.md` and the files it links),
and any thread whose title names this pull request or this contributor
(`list_thread_sessions`, then `fetch_thread`). A later round is checked
against what the earlier ones asked.

`<scratch>` below is a folder outside the repository: the session's
scratchpad, or a temporary folder. Merge the pull request into current
`main` in a worktree there, never in the session's own checkout, and
run everything from inside that worktree:

```
git worktree add --detach <scratch>/pr<n> origin/main
cd <scratch>/pr<n> && git merge --no-edit pr/<n>
```

On a conflict, note the files and whether the conflict is mechanical
(both sides added a paragraph) or a real disagreement. To run the
checks, resolve it by keeping `main`'s text and adding what the pull
request adds, so the checks judge the pull request's own additions.
Nothing from the worktree is pushed. Then run every step of the
`check-and-build` job in `.github/workflows/ci.yml` on the merged tree.
At the time of writing that is:

```
python3 kit/scripts/test_kit.py
for f in $(git ls-files 'kit/*.py' 'kit/**/*.py'); do (cd "$(dirname "$f")" && python3 -c "import $(basename "$f" .py)") || echo "IMPORT FAILS: $f"; done
python3 kit/scripts/check_binaries.py
python3 kit/scripts/check_docs.py
python3 kit/scripts/skill_usage.py --game games/<p>/<slug>   # when its kit-feedback.md names skill text
python3 kit/scripts/check_listing.py
python3 kit/scripts/coverage.py games/<p>/<slug>
python3 kit/scripts/build.py --out <scratch>/site-<n>
```

and then open the pages:

```
node admin/review-game-pr/smoke.js <scratch>/site-<n> <scratch>/shots-<n> <p>/<slug>
```

The merged result is what counts. GitHub ran its checks on the merge
with `main` as it was at the contributor's last push, and runs none
while a pull request conflicts. A check that passes on GitHub and fails
here is a rule `main` gained since that push: find the change that added
it (`git log origin/main -S'<text of the message>' -- kit/scripts/`) so
the comment can say why.

## 2. Work the checklist

Go through every item in the kind's checklist. Each one ends as passed,
a finding, not applicable, or not checked, with the reason. A finding
names the file and line, or the output, it rests on. An item is never
reported as passed without having been checked.

A claim about how the game behaves is tested against the game itself.
The emulator and disassembler install in a cloud session as for any run
(`kit/INSTALL.md`). The image is never in the repository. Look for it in
`/mnt/project-files/uploads/`, then in archive.org's C64 Preservation
Project collection, which has clean originals of most C64 games, each a
zip of its own. Start from the item,
<https://archive.org/download/C64_Preservation_Project_10th_Anniversary_Collection>,
and follow "View Contents" on its `G64.zip`: the listing's own address
changes from server to server.
An original can differ from the release the contributor analysed (a
crack's loader, a trainer, moved code), so match it to `game.json`'s
`build` and to `orientation.md` before trusting an address in it, and
say in the report which release was used. The image stays in
`<scratch>`. Without an image, such a claim is not checked, and the
report says so.

## 3. Choose the next step

Recommend one:

- **Merge.** Everything that matters passes. Squash merge
  (`admin/README.md`); say so explicitly when `pr_shape.py` lists files
  in the branch's history that are gone at its head.
- **Merge after we fix it.** What remains is small and mechanical: a
  merge of `main`, link titles, `coverage_percent`, a kit change that
  reverts cleanly. Contributors allow
  maintainer edits, so the fix goes on their branch, pushed from the
  maintainer's own device, because a cloud session cannot push to a
  fork. Name each fix, and offer to do it.
- **Send it back.** Anything that is the contributor's call, or the
  run's own work to redo: content, analysis, a kit change to drop.
- **Needs the maintainer's check first.** It claims Silver on a model
  that is not proven, with no `verification` recorded
  (`kit/CHECKING.md`). The check needs the game's image; the tools
  install in the cloud as for any run.
- **Close or split.** Rare; say why.

Say what would change the recommendation. When it is a choice between
sending it back and fixing it ourselves, say which and why: a first-time
contributor learns the rules from a comment, and a regular one may
prefer the fix.

## 4. Report

First fetch `main` again. If it moved during the review, merge again and
rerun section 1's checks: a pull request merged meanwhile can bring a
conflict or a new rule.

In a project thread, one reply:

1. The recommendation in a sentence or two, and what is needed from the
   maintainer.
2. The findings that need action, most important first, one or two
   sentences each with their evidence. What passed is one line, not a
   list.
3. The comment for the contributor, ready to paste, in a fenced
   `markdown` code block. Address them by `@login` and welcome them if
   this is their first pull request. Number the asks, and give each its
   reason and the rule it rests on (a file, or the pull request that
   made the rule). Say what is good about the run, briefly and
   specifically.

Where `/mnt/project-files/` exists, write the full checklist, item by
item, to `/mnt/project-files/pr-reviews/pr-<n>.md` (`mkdir -p` the
folder), and attach it to the reply. Its first lines are what the
routine and a later round read:

```
PR: #<n>
Head: <full sha reviewed>
Main: <full sha of the main it was merged with>
Kind: new-game | game-update
Thread: <this thread's id>
Reviewed: <YYYY-MM-DD>
Recommendation: <one line>
```

Remove the scratch worktree when done (`git worktree remove --force`).

## A later round

When the pull request has new commits since the head in `pr-<n>.md`,
review the round, not the whole thing again. Take each ask from the last
review and the contributor's replies to it: done, partly done or not
done, with evidence. Then run section 1's checks on the merged tree, and
the checklist items the new commits touch (`pr_shape.py pr/<n> <old
head>` shows them). A check that fails now and passed last time is the
contributor's when `main` has not moved since the `Main:` it was merged
with; otherwise find which side brought it. Lead the reply with whether
the asks are addressed. Update `pr-<n>.md` with the new head and main.

## Changing the checklists

They are the maintainer's and will change. When he adds or drops a check
("from now on, also check X"), edit the checklist file in his words,
with the pull request that taught it, and commit that to `main` once he
says to push. Each item is one check: what to look at, what passes, and
why it matters.
