# 16 — Ride Around

## Loaded program

`PLF16` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$3266](source-plf16.html#3266) moves two expanded platforms around264-update rectangles. Support [$32C7](source-plf16.html#32C7) runs first, using the saved previous-leg direction at corners. It adds support and two to playerY when the selected platform delta is+1. Slot6 has priority if both platform shadows contain the player.

## Checks and remaining limits

Live LEFT reaches a descending platform and verifies playerY174→176 before the platform advances fromY169. CPU checks cover two full cycles, corner order, slot priority and all death-filter masks. Transfers and full rides remain open.

The game's shared verification scope and cross-level comparisons are included below.
