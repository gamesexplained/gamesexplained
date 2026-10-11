# 05 — Vampire

## Loaded program

`PLF05` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Every third collected bomb activates another hunter, capped at three ([$3317](source-plf05.html#3317), counters [$3454/$3455](source-plf05.html#3454)). The hunter update [$3368](source-plf05.html#3368) moves and wraps them, while [$33E0](source-plf05.html#33E0) turns toward the player only on exact row or half-X alignment.

## Checks and remaining limits

Controlled native calls verify activation on bombs 3, 6 and 9, the three-hunter cap and six pursuit cases. Steering compares post-move Y but pre-move half-X; a legal pursuit/collection sequence remains unverified.

The game's shared verification scope and cross-level comparisons are included below.
