# Mayhem in Monsterland — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/60-verify`: "If the first sample is bad, audit the whole listing before the page is published": 12 of 80 sampled comments were wrong, so every comment was audited, and 1,101 of 5,540 changed; without it the page would have gone out on that listing.
- `kit/skills/core/60-verify`: "Give them a stratum of their own": the land files' script-written comments were sampled apart, and auditing them by template found 40 sentences wrong in every land that used them.
- `kit/skills/core/10-orient`: "Map the disk's files onto memory.": the 16-byte piece search found that `game`'s top 20 KB is copied to `$B100`-`$FFFF` and that each land loads at `$5A00`, which made the parts before any code was read.
- `kit/skills/core/50-coverage`: "Annotate first yourself, then split": the lead described the raster chain, the VSP scroll and the play loop before the fan-out, and the brief gave the agents those names; one agent's corrections to them came back in its report.
- `kit/skills/core/70-minisite`: "If the renderer lacks something the game does, extend it in `site/lib/c64.js`": the frame's 14 % pixel mismatch was traced to VSP's late bad line instead of being captioned away, and the renderer now matches VICE.

## What was changed in the kit

- `site/lib/c64.js`: a bad line that starts after cycle 14 (a write to `$D011` that makes the Y scroll match late, as VSP does) turns the display on there, and the next row starts from the line's real count of character fetches. Why: VSP-scrolled games were drawn one character to the left of VICE's picture; this game's frame went from 14,505 differing pixels to 0, and `frame.py test` and the frame unit tests still pass.
- `kit/c64/INSTALL.md`: a row for the v3.13.2 source build on Linux x86_64 (57 of 57, 9 October 2026); the Linux section says Ubuntu 26.04 lacks the release zip's `libFLAC.so.12`, so the source build is the way there, and a new paragraph, "Under WSL2 on Windows", says to clone inside the WSL file system, how `wsl.exe` mangles command lines, and that sound off (`Sound=0` in the contained `vicerc`) cured the emulator's slowdowns. Why: each cost this run between twenty minutes and an hour, and the next Windows contributor will meet all three.
- `site/status.json`: the Linux x86_64 cell for the C64 names the Ubuntu 26.04 run under WSL2.
- `kit/lessons/2026-10-09-mayhem-in-monsterland.md`: the run's lessons.

## Candidates

- **Generated per-cell comments miss indexed accesses.** The comments on
  colour memory and the two screens (one per cell, named by row and
  column) were written by a script from the instructions whose operand
  names the cell. Every loop that reaches a cell through an index was
  missing: `fill_screens`, the level reveal's clear, the colour shift's
  second loop, a stripe loop of the stage-complete screen. The second
  sample caught it (3 of its 9 engine errors), and the regenerated
  comments, written from every instruction that can reach each cell with
  the index's range worked out from its loop, came out right. The skill
  would say, in `50-coverage` beside "A comment a program writes", that a
  generated list of a cell's readers and writers starts from
  `opcodes.py --refs`, which counts indexed reach, not from direct
  operands. No other game folder was found with per-cell comments of this
  kind.

## Maintainer asks

- **Make `codemap.py` usable after a snapshot load or an MCP pause.** On
  the v3.13.2 source build under WSL2 (9 October 2026), any connection to
  VICE's remote monitor made after `vice_snapshot_load` or after `pause()`
  left VICE writing its prompt into the closed socket ("Broken pipe",
  thousands of lines in `tools/logs/vice.log`) and refusing later
  connections, so `codemap.py dump` read nothing and this game has no
  code map. Sending `x` before closing fixed it only on a machine never
  loaded or paused; after a load, `x` was answered with a fresh prompt.
  Suggest testing `zap`/`dump` across a snapshot load in
  `check_emulator.py`, and finding in vice-mcp why the monitor re-enters.
- **Add a VSP case to `frame.py test`.** The renderer now models a bad
  line that starts late (`site/lib/c64.js`), checked only against this
  game's recorded frame; the kit's own test program has no such split, so
  a later change could break it unnoticed. Suggest a band in
  `kit/c64/frame.py`'s test program that writes `$D011` mid-line to start
  a bad line after cycle 14.
- **Ship a batch annotation helper with `r2000.py`.** Every agent in this
  run used `work/ann.py`, a small script that turns a text file of
  `$ADDR name : comment` and `$ADDR-$END type` lines into one logged
  `r2000_batch_execute` call; without it each agent writes its own, and
  some write calls one at a time. Suggest a `r2000.py --apply <file>`
  with that format.
- **Let `check_docs.py` accept a sample's account of what changed.**
  `60-verify` asks `facts.md` for "how many comments were wrong ... and
  what was changed", and `check_docs.py` refuses the word "corrected"
  there as narrating a past mistake. Suggest allowing it inside the
  paragraph that reports a verify sample, or naming the expected wording
  in the skill.

## What cost the most time

A tested note in `kit/c64/INSTALL.md` for Windows contributors on WSL2 (clone inside WSL, script files for `wsl.exe`, sound off) would have saved the most, about two hours of set-up and of chasing the emulator's slowdowns.
