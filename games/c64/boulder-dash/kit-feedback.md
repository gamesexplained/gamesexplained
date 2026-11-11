# Boulder Dash — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`).

## Skill text that changed what I did

- `kit/skills/core/50-coverage`: "Before calling 100 %, go through that list and say what each stretch": after the ledger said 100 % of 12,047 bytes, the listing still named 37 stretches of 9,049 bytes of tables past their label's 64-byte reach, so I labelled and described each one and excluded the unrelocated copy of the game, and the ledger rose to 17,228 bytes.

## What was changed in the kit

Nothing under `kit/` was changed in this run.

## Candidates

- **A table longer than 64 bytes is only partly counted.** A label counts 64 bytes of the table under it, so a 944-byte character set with one label looked like 64 bytes of data and the ledger reached 100 % with the rest uncounted. The listing's "data the ledger does not count" list caught it, but only after the first 100 %. The coverage skill could say, where it describes the work queue, that a table longer than 64 bytes needs a label for each 64 bytes, and to run `listing.py` with `--entry` before reading the percentage as final.
- **The emulator ignores a short press.** The fire button and the function keys had to be held about half a second before the game saw them, and fire on joystick port 2 was never seen by a game that reads port 1. The first hour went on trying port 2 and taps. `kit/skills/c64/tool-vice-mcp` could say that a game polls its input once a frame or less, so a press must outlast several frames, and name the port a C64 game reads by default.

## Maintainer asks

- **Decide whether the kit should record `claude-sonnet-5-5` as proven or unproven.** This run used it and `models.py is-proven` says it is not proven, so the game is bronze until a maintainer samples its listing on a proven model. A sample of 60 comments was checked on a proven model during the run and its result is on `game.json` `accuracy`.

## What cost the most time

A script that read the memory at a label and decoded a cave record would have saved the hour spent on the cave format: the kit has none for the C64, so I wrote one for this game's map and had to check it against the emulator by hand.
