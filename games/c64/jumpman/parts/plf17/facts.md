# 17 — The Roost

## Loaded program

`PLF17` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Three pursuers update at [$32EB](source-plf17.html#32EB): equal Y causes horizontal pursuit, background contact selects upward motion, and airborne movement steers diagonally toward player X. Crossing the top boundary resets an actor to its starting position.

## Checks and remaining limits

Six controlled native cases verify pursuit priority, movement and all three reset positions. The reset tests prospective unsigned Y below4; a complete legal pursuit sequence remains unverified.

The game's shared verification scope and cross-level comparisons are included below.
