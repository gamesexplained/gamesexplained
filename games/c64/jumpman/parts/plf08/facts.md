# 08 — Builder

## Loaded program

`PLF08` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

This overlay installs the standard collision callback [$308F](source-plf08.html#308F) and no private moving-hazard routine. Bomb-linked streams [$31B8-$323B](source-plf08.html#31B8) change girders, ladders, ropes and collectible graphics through the resident renderer.

## Checks and remaining limits

The order and accessibility of successive geometry changes remain live unverified.

The game's shared verification scope and cross-level comparisons are included below.
