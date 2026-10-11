# 23 — Follow the Leader

## Loaded program

`PLF23` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Bomb callback [$31A2](source-plf23.html#31A2) creates at most seven followers. It starts a follower at absolute history cursor200 if the next-write cursor is below8, otherwise0. Replay [$31DF](source-plf23.html#31DF) precedes recording [$3218](source-plf23.html#3218). Each follower keeps its own creation-dependent delay. Death state2 [$324B](source-plf23.html#324B) disables followers and resets count/write cursor while retaining history.

## Checks and remaining limits

CPU checks cover all256 creation cursors and1,100 updates with seven followers across wraps. After replay/record, sample age is(cursor gap−1) once history is populated. A native input route creates two followers, then reaches death and clears their active state/count/write cursor. An early controlled read of unfilled history does not establish a legal early pickup. A seven-follower route and full completion remain open.


## Followers through ordinary input

From initialized PLF23,50 neutral PAL frames, LEFT168, DOWN64 and LEFT12 reach the first bomb alive at X140/Y216: score100, targets12, one follower at historical X320/Y212. Continuing LEFT reaches a second collection and death. At [$3263](source-plf23.html#3263), both followers are disabled, count2 and write cursor95; stepping to [$3269](source-plf23.html#3269) clears count/write cursor, retains read cursors33/6, and preserves all1,024 history bytes across that counter-clear segment. This is a selected-level input route, not campaign entry or a seven-follower completion. [Creation](reference/deeper-follower-created.png), [cleanup](reference/deeper-follower-cleanup.png), states and inputs.

## History cursor timing

Follower delay uses the modular gap L=(next-write cursor−read cursor)&255 at creation. Replay increments its cursor before reading, then recording writes the next sample. After both callbacks, sample age is L−1 once that slot contains history: creation write cursors0,7,8,63,255 give ages55,62,7,62,254 respectively. This is a separately fixed delay for each follower, not a common delay. Deliberately early creation can read retained overlay bytes; legal reachability of that early pickup remains unknown.
