# 2B — Mystery Maze, variant B

## Loaded program

`PLF2B` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

The shifted hide/reveal routines are [$3179/$319B](source-plf2b.html#3179), with the same persistent colour reveal and a different geometry/bomb layout. Jungle selects this file with reserves 3-4.

## Checks and remaining limits

All131,072 coordinate pairs are CPU checked; the controlled native selection transition passes. Full legal maze routes remain open.

The game's shared verification scope and cross-level comparisons are included below.
