# 15 — Grand Puzzle II

## Loaded program

`PLF15` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Bomb callbacks [$31C6-$31FC](source-plf15.html#31C6) change player visibility and schedule wall erasure/regrowth; [$34FC](source-plf15.html#34FC) animates the middle wall and [$36B2](source-plf15.html#36B2) changes the lower wall according to player position. Four special records reach [$3667](source-plf15.html#3667), adding 400 before the resident 100 for 500 total.

## Checks and remaining limits

Initial count10 and14 stored records are distinct. Runtime installation and five wall tasks are checked: four take nine eligible calls from fresh counters, $35F9 takes ten. Each first update matches native VICE. The full legal visibility/wall/collection sequence remains open.


## Runtime callback installation

Resident [$428D](source-resident.html#428D) copies pending callback pairs into the four active slots before calling them. A request made by a running callback is therefore installed on the next dispatcher service. Grand Puzzle II's four bomb requests install [$3593](source-plf15.html#3593), [$35BC](source-plf15.html#35BC), [$35E0](source-plf15.html#35E0) or [$35F9](source-plf15.html#35F9); the opening task is [$3567](source-plf15.html#3567). From fresh loaded counters, the four tasks other than [$35F9](source-plf15.html#35F9) take nine eligible calls, while [$35F9](source-plf15.html#35F9) takes ten. Each queues no-op [$301F](source-plf15.html#301F) afterward; no hazard pulse leaves the sprite bytes unchanged. Original-code tests verify requests, installation, drawing changes and completion; native comparisons check each first eligible update. Full legal collection order remains open.
