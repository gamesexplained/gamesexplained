# 14 — Dragon Slayer

## Loaded program

`PLF14` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$339A/$342B](source-plf14.html#339A) reserve horizontal fire for a22-step arcing shot; vertical fire remains available to jump. Each hit awards50. Every fourth hit schedules one of twelve stairs, drawn by [$34EA](source-plf14.html#34EA). After48 hits, the stair counter stops, but later hits still score. The goal bomb has zero initial bonus.

## Checks and remaining limits

Live joystick replay builds all12 stairs through48 hits in one life, scoring2400. Hit49 scores2450 with unchanged stairs. All13 distinct bitmap states match the original routines; no-fire control scores0. A replayed continuation reaches the final bomb alive with six reserves:54 hits and2800 points. Full campaign entry remains open.


## Native shooting hits and Dragon Slayer stairs

Private comparison records retain VICE 3.13.2 PAL joystick inputs, native hit checkpoints, score/life reads and screenshot hashes. Each level was selected through the original loader and initialized before a220-frame neutral spawn. Subsequent routes change only port2 joystick input, with no RAM, register or collision edits. This establishes within-level input routes; earlier campaign progression and complete level finishes remain separate.

**Dragon Slayer:** move LEFT80 frames from(320,56) to(240,56), then use the recorded timed LEFT+FIRE4 / RIGHT4 / neutral intervals. Native checkpoints count49 calls to the hit award and12 calls to stair drawing. All49 hits retain life state0 and six reserves. Hit48 completes the12 stairs and scores2400 at recorded frame40148 after the foreground draw; hit49 scores2450 at41700 without another draw or bitmap change. The initial layout and all12 milestones match all8192 bitmap bytes against separate execution of the original hit and foreground routines. The same movement and first-shot timing without fire scores0 and builds no stairs. The [stair viewer](index.html#dragon-stairs) uses these actual screenshots. A separately replayed continuation crosses all four lower floors using timed shots and vertical jumps. At original completion [$5B00](source-resident.html#5B00), it has54 hits, score2800 including the100-point goal bomb, zero targets, life state0 and six reserves. The continuation uses2252 fixed frames plus LEFT until completion, without game-state edits; prior campaign entry remains outside the check. See route evidence and [completion](reference/dragon-slayer-complete.png).
