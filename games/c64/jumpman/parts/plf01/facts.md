# 01 — Easy Does It

## Loaded program

`PLF01` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

The ordinary life loop is at [$3050](source-plf01.html#3050), with sprite-collision death at [$31C7](source-plf01.html#31C7). Bomb-linked streams [$3199/$31A6/$31B3/$31BD](source-plf01.html#3199) change girders and ladders; the first selects girder eraser `$7E2B`.

## Checks and remaining limits

Interaction sequence has not been live checked.

The game's shared verification scope and cross-level comparisons are included below.
