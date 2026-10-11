# 29 — Going Down?

## Loaded program

`PLF29` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$31EF](source-plf29.html#31EF) moves the elevator down one pixel and maps entryY226 to0, for a227-update cycle. A colliding rider receives support and two Y increments even on the wrap call. [$308F](source-plf29.html#308F) exempts player collision whenever the elevator shadow is nonzero.

## Checks and remaining limits

CPU checks cover the full cycle,225/226/227 boundaries, carry on wrap and all death-filter masks. A legal ride through wrapping and natural hazard exemptions remain open.

The game's shared verification scope and cross-level comparisons are included below.
