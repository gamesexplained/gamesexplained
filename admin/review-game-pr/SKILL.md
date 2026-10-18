---
name: review-game-pr
description: Review a gamesexplained pull request that adds or updates a game against the maintainer's checklist, and recommend the next step. Run by hand on a PR number, e.g. /review-game-pr 385.
argument-hint: <pr-number>
disable-model-invocation: true
---

# Reviewing a game pull request

This lives in `admin/` because `.claude/skills` is the
contributor kit.

Report only. Never comment on, push to, approve or merge the pull request;
the maintainer decides.

## Setup

The pull request is `$ARGUMENTS`. If no number was given, run `gh pr list`
and ask which one.

```
git fetch -q origin main +pull/<n>/head:refs/remotes/pr/<n>
gh pr view <n> --json title,url,isDraft,headRefName,headRefOid,author
python3 admin/review-game-pr/pr_shape.py pr/<n>
```

`pr_shape.py` says whether it adds a game, updates one, or is something
else (not this skill's), and breaks its lines down by area. If it is
something else, a draft, or one of this repository's `claude/` branches,
say so in one line and stop.

## The agent checks

1. **The tier claimed makes sense.** Hold `tier` in `game.json` against
   AGENTS.md's "Definition of done". Bronze is below 100 % coverage. Silver
   needs 100 % (`python3 kit/scripts/coverage.py games/<p>/<slug>`),
   `facts.md`, and coverage and verify on proven models (`python3
   kit/scripts/models.py is-proven <id>` for each in `step_models`) or a
   recorded `verification`.
2. **The model used.** Say which model the run recorded (`model` and
   `step_models` in `game.json`), and call out any that is not on the
   approved list (`python3 kit/scripts/models.py`).
3. **The size fits the game.** Compare the lines and bytes by area with
   the game's size and complexity, and with games on `main`.
   `symbols.json` is usually most of a new game's lines; a large share
   anywhere else needs a reason. Wizard (#193) once had 98 % of its 25.7k
   lines in audit ledgers and reports, which belong in `work/`.
4. **Kit changes are justified.** Read every change outside the game
   folder line by line, and ask whether this run needed it and what it
   does to other games. #227 changed how coverage counts, which moved its
   own figure from 32.8 to 52.8 % and no other game's.
5. **Skill changes are reusable.** Each addition to `kit/skills/` must
   help at least one game other than the pull request's own, named by
   its `games/<platform>/<slug>` folder in `kit-feedback.md`
   (`kit/skills/core/80-retro`, step 3). The pull request's own game
   folder and its own `kit/lessons/` file do not count: #325 named only
   its lesson file, which is not a second game. `check_docs.py` checks
   that another game is named, not that the lesson fits it: read it. CI
   waits for a maintainer's approval on a first-time contributor's fork
   (#325's did), so check `kit-feedback.md` yourself rather than trusting
   a check that may not have run. One game's debugging with its nouns
   swapped (#196) belongs in that game's `kit/lessons/` file.
6. **Urgent kit asks.** Read the run's asks (`kit-feedback.md`,
   "Maintainer asks", and any `kit-ask` issue it filed) and flag any that
   is urgent – measured by things that are broken, or where subsequent runs
   could be saved significant time by shipping the improvement.
7. **A Play tab is a port.** A `play.html` must run the game's logic
   ported to JavaScript, never the game's own code on a model of the
   machine (`kit/skills/core/70-minisite`, "Play"). A Play tab that loads a
   6502 or Z80 core for anything but a music driver goes back.

For an update to a game, the same checks apply where the pull request
touches what they look at.

## Report

Reply in this session: the pull request's number, title and link, the head
SHA reviewed, the next step you recommend (merge, fix it ourselves, or send
it back), and one line per check (fine, or what is wrong and the evidence).
A check that is fine gets at most one line; don't add noise. If anything
goes back to the contributor, draft the comment in a `markdown` code block.
