# 2A — Mystery Maze, variant A

## Loaded program

`PLF2A` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Initialization [$317A](source-plf2a.html#317A) hides 1000 matrix and colour cells without erasing the bitmap; [$319C](source-plf2a.html#319C) permanently reveals a 4x3 area around the player, reduced to 4x2 near the top. Jungle selects this layout with reserves 0-2.

## Checks and remaining limits

All131,072 coordinate pairs are CPU checked, including inherited carry and bounds; no display overrun. Full legal maze routes remain open.

The game's shared verification scope and cross-level comparisons are included below.
