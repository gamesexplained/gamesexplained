# 04 — Jumping Blocks

## Loaded program

`PLF04` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$31AC](source-plf04.html#31AC) requests forced fire and one of right/up/up/left on accepted block contact. The next input poll samples that request; repeated contact can renew released-fire state before movement. A fresh jump can start after contact clears. Initialization [$31F1](source-plf04.html#31F1) expands sprites1–4 in both directions.

## Checks and remaining limits

Live input: holdingLEFT produced a block contact at(164,136), then an automatic rightward jump to(168,134). CPU checks cover all four choices and repeated contact; full traversal remains open.

The game's shared verification scope and cross-level comparisons are included below.
