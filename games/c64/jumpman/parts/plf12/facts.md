# 12 — Robots II

## Loaded program

`PLF12` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Four robots interpret [$32B3-$33D2](source-plf12.html#32B3). Conditional commands `$10-$13` follow the player quadrant at [$3508](source-plf12.html#3508): hardwareX184 andY144 are the boundaries. [$3402](source-plf12.html#3402) advances every fourth eligible callback independently of the hazard pulse. A new segment moves immediately.

## Checks and remaining limits

CPU checks cover all131,072 X/Y inputs, all96 triples and both outcomes of all12 conditional commands over16,384 callbacks. Legal approaches through each branch remain open.

The game's shared verification scope and cross-level comparisons are included below.
