# Doctor Who And The Mines Of Terror — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## Where it ran

A Claude Code cloud session on 30 September 2026: Linux x86_64, Ubuntu
24.04, no display. The vice-mcp v3.13.1 Linux release zip needed the 15
runtime packages `kit/c64/INSTALL.md` lists, installed with apt;
`check-emulator` passed 56 of 57 (`pause-at-instruction`), as that file
records for this build. `cargo install regenerator2000` took four
minutes, not one. The page was checked in headless Chromium through the
preinstalled Playwright.

## What was changed in the kit

- `20-features`: a hosted session's network can refuse every game site
  while web search still works; use the summaries as leads, mark them
  weaker, and read the controls from the input routine, because the key
  lists found were another machine's.
- `50-coverage`: run `listing.py` with both snapshots and read its
  loaded-data report before choosing the agents' ranges. Here 16 KB (the
  map under the KERNAL, every sprite image) came to light only after the
  agents were done.
- `70-minisite`: a renderer fed from the hand-over image draws that
  image's character set; compare it with a play snapshot and embed what
  differs.
- `kit/c64/INSTALL.md`: the cargo build time in a cloud container.
- `kit/CHANGELOG.md`: an entry headed `## next`, which the kit-version
  workflow numbers after the merge (`[kit-bump]` in the pull request).

## Other things that cost time

- The flow tracer decoded the loader's picture at `$0400` and other text
  as code in eleven places. Resetting them to undefined did not hold
  everywhere: agent 1 found six still marked as code later, perhaps
  retraced by another agent's disassemble. One of them, `$2D50`, was real
  code.
- `vice_machine_reset` takes `mode`, not `type`; a wrong name gives a soft
  reset without complaint.
- The branch was merged with `main` from GitHub's web interface partway
  through, which brought the kit from 0.0.31 to 0.0.44 during the run.
  The merge commit carries the contributor's own address, and
  `build.py` warns that it has no GitHub login.

## Maintainer asks

This session could not reach `gamesexplained/gamesexplained` (its
GitHub access covers only the contributor's fork), so it could neither
open the pull request there nor file issues. The asks are here and in the
pull request's description, for whoever merges it to file:

- **Say in `kit/START.md` what a hosted session can and cannot reach.**
  A cloud session attached to a fork can push the branch but may not open
  the pull request upstream or file `kit-ask` issues; the contributor
  should know at the start that they will open it themselves.
- **`build.py`'s contributor warning for GitHub web merges.** A "sync
  fork" merge commit is authored with the contributor's real address; a
  `.mailmap` line fixes the warning, but the kit could say so in
  `AGENTS.md`'s commit rules, or `build.py` could skip merge commits.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 6 | claude-opus-5-5 | 1 | installing the disassembler (cargo build 4 min) and web lookups blocked by the proxy |
| 20-features | 2 | claude-opus-5-5 | 1 |  |
| 30-text | 3 | claude-opus-5-5 | 1 |  |
| 50-coverage | 18 | claude-opus-5-5 | 1 | seven agents on disjoint ranges, about 16 minutes wall clock; lead did live checks meanwhile |
| 60-verify | 4 | claude-opus-5-5 | 1 | merging seven reports into facts.md; live tests of keys, lives, regeneration |
| 70-minisite | 6 | claude-opus-5-5 | 1 | page with frame, map renderer, status font, sprites, death decoder; checked in headless Chromium |
| 80-retro | 1 | claude-opus-5-5 | 1 | kit edits, feedback, asks |
| total | 42 | claude-opus-5-5 | | 0.7 h of work |

40-sweep was never started on the clock; its minutes are in 30-text.

The one change to the kit that would have saved the most minutes: reading
`listing.py`'s loaded-data report before splitting the work, so the map
and the sprite images went to the agents instead of the lead.
