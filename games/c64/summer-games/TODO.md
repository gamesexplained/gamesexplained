# Summer Games — TODO

Tier: silver.

## Missing for Gold

- A human's curation pass, section by section, on every tab (`kit/START.md`). The copy is `agent-draft`.

## Missing for Platinum

- A Play tab that is the whole game: the engine's menus and all eight events ported to JavaScript and run in lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).

## Recommended

- A full audit of the listing's comments by fresh checkers, then a second sample: the first sample (seed 2618) found 10 of 60 wrong (16.7 %), all fixed, with the same mistake corrected elsewhere where it was repeated (`kit/skills/core/60-verify`).

## Open

- The "Bummer Games II" title keys (F3, DEL and cursor down, reported by fans) and how the title screen is drawn: both belong to the boot loader SGLOAD, which no part covers. A part for SGLOAD would settle them.
- What file L's screen (`$C400`-`$CC07`) was for, and why file M repeats it in other colours.
- Linking with Summer Games II for one Olympics: needs the second game's disk.
- Whether a dive's difficulty can reach the manual's 4.1.

## Ideas

- Whole figures on Graphics: the vaulter, diver, gymnast and runners assembled from the events' own frame tables and animated, with the grids of single shapes kept below (reader review).
- File L's unused screen drawn from its bytes on Discoveries, unpacked as `load_module` (`$0934`) would.
- The track's 80-column ring and the pool's 100 x 20 map drawn whole on Venues.
- What a higher pole-vault grip gains: the starting speeds are known (`grip_speed` `$C952`), their effect on the flight is not traced.

- The event jingles (the skeet hit, the relay's gun and baton, the crowd) beside the anthems on Gameplay; only the engine's tunes and the ceremony's are in the players.
- An interactive diving judge: choose a dive, a position and the entry frame, and see the seven cards and the total the code would give.
- The NTSC disk's own boot loader (it has no SGLOAD) as a part of its own.
