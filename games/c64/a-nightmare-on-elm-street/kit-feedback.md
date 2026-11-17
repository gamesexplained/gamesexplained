# A Nightmare on Elm Street — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A negative result is a claim about your search": before writing that the MAGIC SHIELD does nothing, the level scripts and maps were searched for the item's code, which found one lying on level 8 and no script that tests for it.
- `70-minisite`: "The site links a bare `<code>$1234</code>` to `source.html`": the pages of this three-part game put `data-part=""` on their main element, after the build counted bare addresses landing on no record.
- `12-media`: "is listed in a part": files whose bytes fall in a gap of the listing (SMALL, D0, DEATH, D2, SC2.DAT) were re-answered as data instead of part.

## What was changed in the kit

- `kit/c64/r2000.py`: `--game` naming a folder with no `game.json` or `part.json` now stops with a message, instead of falling back to the current directory. Why: in this run `r2000.py --game street` and `--game resident`, given from the game folder rather than `parts/`, twice sent comments to whichever session answered on the default port, with no error.

- `kit/c64/snapshot.py`: finds the C64's RAM by walking the snapshot's modules to `C64MEM`, instead of reading at a fixed offset. Why: VICE v4.0.0 (the vice-mcp build) writes a `C64MEMHACKS` module first, which moved RAM from offset 209 to 232, so every byte read from a snapshot was off by 23.
- `kit/c64/check_emulator.py`: `snapshot-ram-offset` and `saved_word` read RAM through `snapshot.py`, for the same reason.

## Candidates

- A codemap recorded during the boot counts as code the loader stages that a later file overwrites. Here the street part's codemap held MAIN.OBJ's boot code at `$1400`-`$1506`, which INIT's title tune is loaded over, so the street's snapshot has no code there. It was caught because the walk from those addresses disassembled tune data. A skill line in `50-coverage` would say: when a codemap was recorded from power-on, check each ran stretch against the snapshot's bytes before seeding from it, since a later load may have replaced it.

## Maintainer asks

None.

## What cost the most time

`r2000.py --game` refusing a folder that is not a game's, as it now does, would have saved re-applying two batches of comments that had gone to the wrong part's session.

## Tools and versions

- Linux x86_64 cloud container; VICE release v4.0.0 (`v4.0.0-linux-x86_64-gui.zip`); regenerator2000 0.9.20; Node with the preinstalled Playwright for screenshots and page checks.
