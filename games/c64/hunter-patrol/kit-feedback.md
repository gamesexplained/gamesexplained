# Hunter Patrol: kit feedback

Written in the retrospective of a run on claude-sonnet-5-5 (13 November 2026, cloud container, Linux x86_64, no display, vice-mcp v3.14.0 release, regenerator2000 0.9.20).

## Skill text that changed what I did

- `10-orient`: "Take the snapshot at a moment you have *looked at*": I saved the first play snapshot without looking and it held the plane exploding, so every control test on it gave nothing until I took a second one with the crash variable at 0.
- `10-orient`: "Save the hand-over too": the hand-over could not be the first instruction of the game, because the cracker's menu runs after the game is unpacked, so `entry.vsf` is the machine waiting at the menu's last question.
- `tool-vice-mcp`: "`vice_keyboard_matrix` (row and column, or a key name)": the key for RUN/STOP is named `STOP`; `RUN/STOP` is refused with "Unknown key name".

## What was changed in the kit

Nothing.

## Candidates

None.

## Maintainer asks

- **Say in `kit/skills/c64/tool-vice-mcp` which key names `vice_keyboard_matrix` takes.** `RUN/STOP` failed with "Unknown key name" and `STOP` worked. A game that starts on RUN/STOP, as this disk's documents do, loses a minute to it. Add the list of names, or the one for RUN/STOP, to the "Keys" paragraph.

## What cost the most time

Reaching the game from a crack that has a scrolling intro, text pages, a loading picture and two menus in a row took six separate steps with waits between them, and the kit has no helper that records such a route once and replays it.
