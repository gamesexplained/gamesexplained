---
name: review-game-pr
description: Review a gamesexplained pull request that adds or updates a game against the maintainer's checklist, and recommend the next step. Run by hand on a PR number, or by the hourly routine below.
---

# Reviewing a game pull request

The maintainer's checklist, kept short on purpose: checks are added one at
a time, when he asks. It lives in `admin/` because `.claude/skills` is the
contributor kit.

Report only. Never comment on, push to, approve or merge the pull request;
the maintainer decides.

## Setup

```
git fetch -q origin main +pull/<n>/head:refs/remotes/pr/<n>
python3 admin/review-game-pr/pr_shape.py pr/<n>
```

`pr_shape.py` says whether it adds a game, updates one, or is something
else (not this skill's), and breaks its lines down by area.

## The maintainer checks

1. **The site looks reasonable in the Vercel preview.** Give him the link:
   the `Vercel` status on the head commit (`pull_request_read`,
   `get_status`).

## The agent checks

1. **The tier claimed makes sense.** Hold `tier` in `game.json` against
   AGENTS.md's "Definition of done". Bronze is below 100 % coverage. Silver
   needs 100 % (`python3 kit/scripts/coverage.py games/<p>/<slug>`),
   `facts.md`, and coverage and verify on proven models (`python3
   kit/scripts/models.py is-proven <id>` for each in `step_models`) or a
   recorded `verification`.
2. **The size fits the game.** Compare the lines and bytes by area with
   the game's size and complexity, and with games on `main`.
   `symbols.json` is usually most of a new game's lines; a large share
   anywhere else needs a reason. Wizard (#193) once had 98 % of its 25.7k
   lines in audit ledgers and reports, which belong in `work/`.
3. **Kit changes are justified.** Read every change outside the game
   folder line by line, and ask whether this run needed it and what it
   does to other games. #227 changed how coverage counts, which moved its
   own figure from 32.8 to 52.8 % and no other game's.
4. **Skill changes are reusable.** Each addition to `kit/skills/` must
   help at least one other game, named in `kit-feedback.md`
   (`kit/skills/core/80-retro`, step 3). `check_docs.py` checks that a
   game is named, not that the lesson fits it: read it. One game's
   debugging with its nouns swapped (#196) belongs in that game's
   `kit/lessons/` file.
5. **Urgent kit asks.** Read the run's asks (`kit-feedback.md`,
   "Maintainer asks", and any `kit-ask` issue it filed) and flag any that
   is urgent: broken for every run, or wrong on the live site.

For an update to a game, the same checks apply where the pull request
touches what they look at.

## Report

One reply in the pull request's thread: the next step you recommend
(merge, fix it ourselves, or send it back), one line per check (fine, or
what is wrong and the evidence), and the Vercel link. If anything goes
back to the contributor, draft the comment in a `markdown` code block.

Save it as `/mnt/project-files/pr-reviews/pr-<n>.md` (`mkdir -p`),
starting with `PR: #<n>`, `Head: <sha reviewed>` and `Thread: <this
thread's id>`.

## The routine

Every hour a routine fires into the project thread "Automatic new-game PR
review". It lists the open pull requests, leaving out drafts and this
repository's `claude/` branches, and runs `pr_shape.py` on each one it has
not seen. For each new game or update it asks the channel session
(`get_channel_session_id`, then `send_message`) to start a thread that
runs this skill. When a reviewed pull request gets commits from someone
other than the maintainer, it asks for another look in the same thread
(`Thread:` in `pr-<n>.md`). It keeps what it has seen in
`/mnt/project-files/pr-reviews/ledger.json` and posts nothing unless
something is broken.
