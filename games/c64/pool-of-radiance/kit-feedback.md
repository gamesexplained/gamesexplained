# Pool of Radiance — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": the sample's three wrong comments led to a search for what they believed, and 15 more comments in the title and tables parts said the sound driver's fields all belong to the streams; all 18 were corrected together.
- `70-minisite`: "takes the port from the page itself, so the two cannot drift apart": the script decoder was held to the game's own `get_operand` over New Phlan's whole script, which showed the operand-count table's comment missing ADD NPC.
- `70-minisite`: "each verified live, with the evidence beside it": six traced findings stayed off the Discoveries page and went to `TODO.md` until a live test settles what a player sees.
- `70-minisite`: "One frame, rebuilt from memory": the play screen was recorded with `frame.py` and drawn on the How it works page, all 104,448 pixels matching.

## What was changed in the kit

- `kit/skills/c64/c64-reference`, "Banking via `$01`": the table has rows for `$32`, `$31` and `$30`, measured with the game stopped in play (`kit/lessons/2026-10-25-pool-of-radiance.md`). A value the game writes (`$30`) was missing from the table.
- `kit/skills/c64/c64-reference`, "The tick is not the frame": a game that keeps the KERNAL's interrupt ticks 60 times a second on PAL and NTSC alike (latch `$4025` or `$4295`, set at `$FDDD`), so count the handler's calls live before writing a rate. It would have mattered in games/c64/castle-master too, whose timer A keeps the same latch; `kit/lessons/2026-10-25-pool-of-radiance.md`.
- `kit/lessons/2026-10-25-pool-of-radiance.md`: this run's lessons.

## Candidates

- **A chance roll's comment can be off by one.** The camp's interruption
  roll calls `roll_die` for 1 to 100, then takes one off (`DEX`) before it
  compares with the chance, so the chance is that many in 100. The
  comment and the camp's facts said "a roll of 1 to 100 under the
  chance", which is one in 100 too few. It was caught only by reading the
  code again to write a Discoveries section. A rule in `50-coverage`
  would say: when a comment gives a chance or a range, follow the roll to
  the comparison, through any adjustment between them, and write the
  range the comparison sees.

## Maintainer asks

- #562: symbols_export.py: warn when an export holds less than the symbols.json it replaces

## What cost the most time

`symbols_export.py` refusing an export with fewer symbols, comments or
covered bytes than the file it replaces (#562) would have saved the
restore and the redone annotation after the disassembler was restarted
on another snapshot.

## Operating system and tools

Ubuntu 24.04.5 on x86_64, in a cloud container. VICE x64sc release
v3.13.2 with its MCP server, regenerator2000 0.9.20, kit 0.0.236. The
pages were checked in the pre-installed Chromium through Playwright.
