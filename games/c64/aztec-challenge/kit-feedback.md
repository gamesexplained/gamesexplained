# Aztec Challenge — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/c64/tool-regen2000`: "add the opcode to `UNDOCUMENTED` with a case in `kit/scripts/test_listing_undocumented.py` instead": the two no-ops at `$7887` ran in play, so I added `$1A` and `$04` to the decoder instead of typing them as bytes.
- `kit/skills/core/50-coverage`: "Before calling 100 %, go through that list and say what each stretch is": the build listed 1.1 KB outside the count; one of them, `$5D00`, turned out to be an unused row of Hopaztec's tiles, now described.
- `kit/skills/core/10-orient`: "Map the disk's files onto memory.": the kit has no tool for a tape's files, so I decoded the TAP's KERNAL blocks with a script and found both files whole in memory.

## What was changed in the kit

- `kit/cpu/m6502.py`: `UNDOCUMENTED` now decodes `$1A` (NOOP, one byte) and `$04` (NOOP zero page, two bytes), which this game runs at `$7887`; `kit/scripts/test_listing_undocumented.py` has a case for them. The Goonies' listing was rebuilt with `listing.py --rebuild --write`: `$04` bytes in its stretch of zeros typed as code at `$2150` now decode as no-ops, which changed one cross-reference list there.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

Waiting for the tape: a standard KERNAL load of 28 KB takes about ten minutes even in warp, twice (the first look and the hand-over).
