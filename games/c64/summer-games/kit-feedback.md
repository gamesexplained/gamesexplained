# Summer Games — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Start with the leads, because a run's best findings can sit in its notes and never reach a page": the leads list went to the reader with each outcome, and the reader found two more (the made-up high and low judges, the race clocks), which became Discoveries sections.
- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself, and add to its verdict whether the finding held": all ten held, and reading them found the same mistake in four more gymnastics comments.
- `70-minisite`: "where they are several parts' and should link nowhere": the addresses of file L's screen, which no listing holds, now link nowhere instead of to the engine's listing.

## What was changed in the kit

- `kit/lessons/2026-11-17-summer-games.md`.
- `kit/c64/snapshot.py`: finds the RAM by walking the snapshot's modules to `C64MEM`, because VICE's v4.0.0 build puts a `C64MEMHACKS` module first and moves the RAM from offset 209 to 232; every listing read from such a snapshot was 23 bytes off. Its self-test covers both layouts. The same change is on the Galactic Games branch.
- `kit/c64/check_emulator.py`: reads snapshots through `snapshot.py`, so `snapshot-ram-offset` tests what the kit reads rather than a fixed offset.
- `kit/c64/r2000.py`: `--game` naming a folder with no `game.json` or `part.json` now stops, because it fell back to the current directory and sent annotations to whichever part's disassembler answered there.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

The swimming part, which unpacks over the engine and copies its code under the KERNAL, took longest to list: its listing had to come from a snapshot taken during a race, after the copy. A note in the C64 `steps` skill on parts that relocate themselves would have saved the first wrong snapshot.

## Operating system and tools

Linux x86_64 in a Claude cloud container. VICE release v4.0.0 (the kit's vice-mcp build; `check-emulator` failed `checkpoints-survive-load` and `snapshot-ram-offset` before the `snapshot.py` change), regenerator2000 0.9.20 built with `cargo install --locked`, Python 3, Node with the container's Playwright and Chromium.

Three G64 images were supplied: two PAL images that agree on every file and an NTSC image without `SGLOAD`. The first PAL image was analysed.
