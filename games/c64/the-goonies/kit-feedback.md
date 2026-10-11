# The Goonies — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Give them a stratum of their own": the 319 comments written from templates were sampled apart from the hand-written ones, and 2 of their 20 were wrong where the hand stratum had 1 of 40; the template was audited and all 58 of its comments rewritten.
- `60-verify`: "Any claim that can be tested in the emulator in under a few minutes gets tested": the ending was run live rather than read, and it starts a second round instead of returning to the title as the draft said.

## What was changed in the kit

Nothing. The one gap that cost time shows itself (a main loop that never
returns) and needs a maintainer's decision about the snapshot reader, so
it is an ask below.

## Candidates

- **A graphics block named by where it is copied, not by what it draws.**
  The shape blocks at `$B797` were commented as "the scene's own sixteen
  shapes" from the code that copies them, which was true and missed the
  point: drawn, they are seven different children, eight frames each, and
  each scene picks two. The same habit produced a wrong claim ("eight
  shapes no scene uses") about pointers that name a figure scene 8 does
  use. Both were caught only by rendering every block while writing the
  Graphics tab. A skill would say, in `50-coverage`: when a table of
  graphics pointers is commented, draw what every entry points at before
  naming the table.
- **A count beside a list that does not add up.** `facts.md` gave "13
  shapes have four copies" with a list of fifteen. Recounted from the
  bytes, three of the figures were wrong. A check in `check_docs.py`
  cannot read prose counts reliably; a line in `60-verify`'s pass over
  `facts.md` would say: where a fact gives a count and names its members,
  count the members.

## Maintainer asks

This session could reach only the contributor's fork, so no issues were
filed.

- **Let `readSnapshot` return the VIC's raster interrupt line and enable so `Machine` starts mid-play with its interrupt.** `kit/c64/cpu6502.js`'s `readSnapshot` returns the RAM, the CPU port and the registers, but not the VIC-II module, so a `Machine` built from a play snapshot has its raster compare at 0 and its interrupt disabled. A game whose main loop waits on a frame counter the interrupt advances then never finishes a pass, and nothing says why. This run lost time to it and set `enable` and `cmp` by hand from the game's own set-up code (`games/c64/the-goonies/agent-history.md`, 8 October 2026). Suggest reading `$D011`, `$D012` and `$D01A` from the snapshot's VIC-II module and passing them to `Machine` when present, with a test in `kit/c64/test_machine.js`.

## What cost the most time

A `Machine` that takes the raster interrupt's line and enable from the
VICE snapshot it starts from would have saved the most: a play snapshot
is the natural starting point for every measurement, and without them the
main loop hangs until the chip is set by hand.

## Operating system and tools

Linux 6.18 x86_64 cloud container with four cores and no display; VICE
release v3.13.1 (`v3.13.1-linux-x86_64-gui.zip`, vice-mcp),
regenerator2000 0.9.20, Python 3.11.15, node 22.22.2, Playwright with
Chromium 1194 for the page checks. Nothing to add to the install notes.
The container was replaced once mid-run; replaying the annotation log
restored the disassembler session exactly.
