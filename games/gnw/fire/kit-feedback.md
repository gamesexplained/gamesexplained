# Fire — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `steps`: "Drive that run with a player that can score, one that tries each press on copies of the machine": I wrote a look-ahead player before annotating the game's pages, and its coverage run reached the score's carries, 999 and the game over, which random presses never did.
- `50-coverage`: "search for writes to that address, the operand's byte included": before naming flags_0B bit 3 as never set, a test with the R3 keys held found arc4_move setting it.
- `gnw-reference`: "Run each helper once with the bit set and once clear": reading the skip helpers against the rule that TM skips when the bit is set caught that I had read them backwards.

## What was changed in the kit

- `kit/skills/gnw/steps`, the `lockstep` row: a branch that runs only when an input changes between two readings with no checkpoint between them cannot be reached, so the test lists the state the program takes instead. The lesson is `kit/lessons/2026-11-25-fire.md`.
- `kit/lessons/2026-11-25-fire.md`: the port as a second reading of the listing, and the unreachable branch.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

Reading the game's pages by hand: only three of Fire's 29 pages are shared with Parachute, so the listing was written from scratch. The look-ahead player, written before the game's pages were annotated, made the coverage run reach the score's carries, the bonus and the game over, which saved re-reading those paths later. The `gnw-reference` passage on the divider ("a value that steps 16 times a second") would have saved a correction had it been reread before the timing comments were written.

## Versions

macOS 27.0.1 on Apple silicon, Python 3.9.6, Node 24.18.0, the kit at 0.0.362.
