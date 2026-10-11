# 06 — Invasion

## Loaded program

`PLF06` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$33B0](source-plf06.html#33B0) fires up to three directional shots. After launch, eight callback calls are blocked; another launch is possible on call9. Fire is consumed even for neutral direction or full slots. Hits at [$3373](source-plf06.html#3373) add25 and make a target fall before respawning. The exit bomb awards100; initial bonus is zero.

## Checks and remaining limits

Live UP+RIGHT+FIRE produces three 25-point hits. Its first hit knocks down alien6 when shot3 touches alien4 and aliens5/6 touch separately; native states and original sprite-pixel overlaps confirm the shared-mask error. No-fire control scores0. CPU checks cover directions, cooldown, bounds and respawn. Full completion remains open.


## Native wrong-target hit

Private comparison records retain VICE 3.13.2 PAL joystick inputs, native hit checkpoints, score/life reads and screenshot hashes. Each level was selected through the original loader and initialized before a220-frame neutral spawn. Subsequent routes change only port2 joystick input, with no RAM, register or collision edits. This establishes within-level input routes; earlier campaign progression and complete level finishes remain separate.

**Invasion:** holding UP+RIGHT+FIRE for240 frames after spawn scores75 and ends in death state1. The first hit occurs while the player is alive. At [$3394](source-plf06.html#3394), the chosen target is sprite6. Shot3 at(88,38) overlaps alien4 at(90,38), while aliens5/6 at(184,38)/(198,38) overlap separately. Reads confirm the VIC bank, positions, sprite pointers, enables, multicolour and expansion modes. Comparing all28 pairs of original sprite shapes finds exactly those two opaque-pixel intersections, of6 and16 pixels. No shot overlaps alien6.

The shared collision mask is$78 on sprites3/4/5/6. The descending target scan accepts alien6 because that mask includes a projectile bit; it does not identify which pair touched. Continuing the pristine native stop to [$33AF](source-plf06.html#33AF) changes only alien6 from flying state1 to falling state2 and awards25, with player life state0. The same240-frame movement without fire scores0 and leaves all four aliens flying. This is a naturally generated wrong-target hit after selected-level setup, rather than a claim based on injected collision masks. The pair diagram shows the captured geometry, including contacts hidden by the screen border; it is not a game screenshot.
