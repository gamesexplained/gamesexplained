# The NeverEnding Story — kit feedback

The Silver run of 17 October 2026, for Aaron Bell (air), on top of 64kramsystem's Bronze import.
The Bronze run's own feedback is in this file's history in git.

## Skill text that changed what I did

- `60-verify`: "Correcting only the comments a sample found wrong never brought a listing under the mark": with 4 of 60 wrong, every comment in every part was audited, range by range, before a second sample.
- `50-coverage`: "Before calling 100 %, go through that list and say what each stretch": the stretches `listing.py` named after Parts 1-3 were labelled and described, two room texts and the leftover filler, where the 100 % figure had let them stand.
- `10-orient`: "that is the same at the same address in every part is resident": the engine became a part of its own, with the three story parts listed over it, in place of the Bronze run's one Part 1 image.
- `70-minisite`: "`g.sameBlock(name)` fails when any copy differs": the three pages carry their own copies of the shared ports, and every test checks the copies agree.

## What was changed in the kit

- `kit/skills/c64/c64-reference/SKILL.md`: bits 3-5 of `$01` are the cassette port, bit 5 the motor, which runs while the bit is 0, so `$05` and `$06` bank as `$35` and `$36` with the motor on. This game writes those values.
- `kit/c64/disk.py`: `extract` writes a name holding $00, "/", "*" or another character a host refuses as $ and two hex digits (`file_name`), with a case in `kit/c64/test_disk.py`. It stopped with "embedded null byte" on Datasoft's disk of this game, whose directory names one file $00 and another "*".
- `kit/lessons/2026-10-17-neverending-story.md`: a port tested over the listing cannot see a gap in the listing; and play the restart from a later part, since a loader may not load the part the game asks for.

## Candidates

- **Restart from a later part, live.** The lesson above holds for any game that loads in parts and can go back to its start. Only this game's folder shows it so far; the next multi-load run that meets a loader's order should move it into `10-orient`, "A game of several parts".

## Maintainer asks

- #420: keep `listing.py`'s list of uncounted data in `listing.json`, where `coverage.py`, `check_listing.py` and the Source tab can show it.
- #421: stop `listing.py` telling a part to widen its ranges for code the part beneath rewrote itself after its own snapshot.

## What cost the most time

The audit. Each address range went to one fresh checker at a time, about half an hour for every 400 comments, and the first range found one comment in eight wrong. A script that kept `listing.py`'s list of uncounted data in `listing.json`, where `check_listing.py` and the coverage table could show it, would have saved the most: the gaps it named were found late, by a page.

## Tools

VICE 3.13.2 (vice-mcp) under Xvfb in the cloud container, regenerator2000 0.9.20, and `kit/c64/cpu6502.js` for the decoders' checks and the page tests. Nothing new for the install notes.
