# The Spy Who Loved Me — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/15-parts`: "The part beneath keeps its own ranges then": made the 2 KB swapped in at `$4000` a part over `main`, which showed that the bottom part had no way to keep its own sprites there.
- `kit/skills/core/60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": each finding of the sample was settled against the bytes before it was counted.
- `kit/skills/core/12-media`: "every file, every run of sectors the disk's map marks as used that no file holds": the 256-byte `S2` file turned out to be the last page of the packed game, read by the freezer's restart routine.

## What was changed in the kit

- `kit/scripts/parts.py`: `elsewhere()` lets the part at the bottom keep the addresses it lists in its own `"ranges"`, so a load swapped over it for a while (here the shop's code over sprite shapes) no longer takes those bytes from it; `kit/scripts/test_parts.py` tests it.
- `kit/scripts/check_listing.py`: the error for `"ranges"` without `"over"` now applies only when no part lies over the one that has them.
- `kit/c64/snapshot.py`, `kit/c64/check_emulator.py`: RAM in a `.vsf` is found by walking the modules to C64MEM, because vice-mcp v4.0.0 puts a C64MEMHACKS module first and the fixed offset 209 read the wrong bytes.
- `kit/c64/r2000.py`: a `--game` that names no folder with a `game.json` or `part.json` stops with an error instead of falling back to the current directory, where it reached the wrong part's session.

## Candidates

The bottom part's `"ranges"`. A game whose main part lends some addresses to an overlay for a while (sprite shapes under the shop's code) lost those bytes from every part: the overlay's snapshot held its code, the main part's range was given away, and the listing left the sprites out without a warning until `symbols_export.py` reported main's comments at `$4000` as lost. The skill `15-parts` would say, beside "The part beneath keeps its own ranges then", that the bottom part lists such addresses in `"ranges"` of its own. The next game that meets it makes the edit.

## Maintainer asks

None.

## What cost the most time

A splitter rule in `tool-regen2000` saying that a label placed inside a lo/hi address table can merge it with the next table would have saved an hour of removing 35 junk labels.
