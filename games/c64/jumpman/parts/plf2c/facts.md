# 2C — Mystery Maze, variant C

## Loaded program

`PLF2C` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

The shifted hide/reveal routines are [$3192/$31B4](source-plf2c.html#3192), again preserving bitmap geometry and revealing colour cells permanently. Jungle selects this file with at least 5 reserves.

## Checks and remaining limits

All131,072 reveal-coordinate pairs are CPU checked; the controlled native selection transition passes. Paired terrain-sampler checks identify90 combined-flag differences, but two ordinary-input climbing routes succeed with either lookup value. Full legal maze routes and natural lookup-failure effects remain open.

The game's shared verification scope and cross-level comparisons are included below.
