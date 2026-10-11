# 02 — Robots I

## Loaded program

`PLF02` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Two robots interpret route triples at [$32AB](source-plf02.html#32AB), with `$FF` jumps and `$FE` waits. A bomb event at [$3336](source-plf02.html#3336) releases both waiting robots before [$3263](source-plf02.html#3263) clears it. Events received while both move are discarded, not queued.

## Checks and remaining limits

Live input: the first bomb awards100, reduces targets12→11 and releases both robots in the same update. CPU checks cover all53 triples over2,400 updates. Later legal collection order remains open.

The game's shared verification scope and cross-level comparisons are included below.
