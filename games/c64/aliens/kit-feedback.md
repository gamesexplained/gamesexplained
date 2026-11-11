# Aliens — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A shape the game animates plays at the game's rate, from its own animation tables": I decoded the object tables at the start of level 2's file into its thirty animations and played them at their speeds, instead of drawing a sheet of 112 stills.
- `70-minisite`: "A run that describes the shapes in a table, or leaves the pictures to `TODO.md`, has not built the page": I built the sprite viewer for every stage before writing the Graphics prose.

## What was changed in the kit

Nothing changed in the kit.

## Candidates

- A handler can be reached through one byte of its address. The engine points the NMI vector at one of three handlers on one page by loading the low byte as a number (`LDX #$56`) and storing it into `$FFFA`; the references search found no jump to `nmi_abort`, and the listing called it unused. A rule for `50-coverage`: before calling a routine unreached, search for its low byte as an immediate operand near any store to a vector. No other game is known to need it yet.
- Check the manual's claims against the code as part of `60-verify`. A verified fact had the level skip backwards until the manual's sentence about it was traced.

## Maintainer asks

None.

## What cost the most time

- Finding the parts: the loader does not use the KERNAL LOAD, so `loads.py` saw nothing, and the stage files were found by reading the trainer's loader.
- The 40-byte header of every stage file was typed as a split low/high table in every part; correcting it lost bytes in level 2's export until it was redone with `--force`.

## Tools

Linux x86_64 cloud container (Ubuntu 24.04); VICE v3.14.0 (tools/vice-mcp); regenerator2000 0.9.20; Python 3; Chromium through Playwright.
