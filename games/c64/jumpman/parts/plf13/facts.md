# 13 — Hailstones

## Loaded program

`PLF13` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$3149](source-plf13.html#3149) creates falling objects at current player X; [$3178](source-plf13.html#3178) makes them fall, bounce along one of three ten-step arcs, and disappear below Y=225. Arc tables are [$322C-$3285](source-plf13.html#322C).

## Checks and remaining limits

Missing FF is confirmed, but all262,144 normal-position sampler cases produce intended keys or no collection. Ordinary erasures preserve this property; no legal failure route is established.

The game's shared verification scope and cross-level comparisons are included below.
