# 07 — Grand Puzzle I

## Loaded program

`PLF07` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Eight bomb callbacks can enable a player-following marker ([$3245](source-plf07.html#3245), [$31D9](source-plf07.html#31D9)); exact alignment at X=176 and the current target Y triggers another drawing step at [$31EC](source-plf07.html#31EC). Four special records call [$3282](source-plf07.html#3282) for an extra 400 before the resident 100, totaling 500.

## Checks and remaining limits

Initial remaining count is 12 but the table stores 16 records through [$31A2](source-plf07.html#31A2); the complete collection/appearance sequence has not been verified live.

The game's shared verification scope and cross-level comparisons are included below.
