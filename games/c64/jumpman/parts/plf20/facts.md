# 20 — Figurit

## Loaded program

`PLF20` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Standard movement/collision code uses bomb-linked geometry edits at [$3183-$3223](source-plf20.html#3183) to replace or remove girders. No private moving-hazard callback is installed.

## Checks and remaining limits

The complete geometry-edit sequence remains live unverified.

The game's shared verification scope and cross-level comparisons are included below.
