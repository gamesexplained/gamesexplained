# 24 — Jungle

## Loaded program

`PLF24` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Cleanup [$3214](source-plf24.html#3214) chooses the next filename letter from [$322A](source-plf24.html#322A): reserves 0-2 select A, 3-4 select B, and at least 5 select C. With displayed lives equal to reserves+1, these are 1-3, 4-5 and at least 6 lives for PLF2A/2B/2C.

## Checks and remaining limits

All256 bucket values are CPU checked; controlled native completions at reserves2/4/5 load exact2A/2B/2C files. Full legal Jungle completion remains open; terminal-death cleanup does not advance.

The game's shared verification scope and cross-level comparisons are included below.
