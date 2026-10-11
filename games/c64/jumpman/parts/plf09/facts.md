# 09 — Look Out Below

## Loaded program

`PLF09` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Bomb callbacks [$3295-$3323](source-plf09.html#3295) launch or replace one falling object at distinct coordinates. Its IRQ [$31FC](source-plf09.html#31FC) advances Y by three and periodically queues erase/girder edits in stream [$3288](source-plf09.html#3288); main loop [$3050](source-plf09.html#3050) renders those edits outside the interrupt.

## Checks and remaining limits

Controlled native calls verify queuing without bitmap changes, followed by foreground drawing. The complete visible floor-contact sequence remains unverified.

The game's shared verification scope and cross-level comparisons are included below.
