# 18 — Roll Me Over

## Loaded program

`PLF18` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$331E](source-plf18.html#331E) interprets the two looping ball routes at [$326D/$3291](source-plf18.html#326D). Their periods are252 and232 eligible hazard updates. New segments move immediately, use colour2 and request sound; later moves use colour8. The sprite frame follows the shared player animation phase.

## Checks and remaining limits

CPU trajectory/model comparison covers1,200 updates, signed X-byte crossings and both complete loops. Natural collision timing remains open.

The game's shared verification scope and cross-level comparisons are included below.
