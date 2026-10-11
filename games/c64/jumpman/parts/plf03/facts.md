# 03 — Bombs Away

## Loaded program

`PLF03` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Falling hazards spawn through [$32EC](source-plf03.html#32EC), fall three pixels per update at [$3336](source-plf03.html#3336), and expand into impact animation at [$3385](source-plf03.html#3385). Bomb-linked streams [$3153-$318E](source-plf03.html#3153) erase six-cell girder spans at three heights.

## Checks and remaining limits

Controlled native calls verify three-pixel falling and the impact boundary at Y216. Full impact timing and a legal scenery-change sequence remain unverified.

The game's shared verification scope and cross-level comparisons are included below.
