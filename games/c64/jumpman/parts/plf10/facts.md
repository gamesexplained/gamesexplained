# 10 — Hot Foot

## Loaded program

`PLF10` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

At the first jump step, callback [$3214](source-plf10.html#3214) places a sprite effect and erases scenery with private shape [$32BB](source-plf10.html#32BB), saving renderer state around the draw. Its eight records contain 20 pixel bytes, all zero; the nonzero fields are lengths and offsets. Animation [$33C8](source-plf10.html#33C8) advances on three of four raster services.

## Checks and remaining limits

A native RIGHT+FIRE jump erases 16 occupied bitmap pixels (10 solid, 6 climbable); four other stamp pixels were already empty. CPU/native calls erase all 20 on a filled-bitmap control. Animation phases are also checked. A separate vertical jump lands alive two pixels lower than its restored-scenery control. Full legal completion remains open.


## Ordinary-input erasure and landing

**Live input:** from native initialized PLF10, 50 neutral PAL frames followed by RIGHT+FIRE reaches the first accepted jump stamp at [$3225](source-plf10.html#3225), X180/Y62, jump step1, life0. Release input and stop at [$32B3](source-plf10.html#32B3): the stamp origin is bitmap X78/Y22; 10 solid and six climbable pixels become background. Score and bombs remain0/14. Shape [$32BB](source-plf10.html#32BB) has eight records, 20 zero pixel values and terminator [$32E7](source-plf10.html#32E7). The shape writes background, never collectible material. Controlled CPU/native calls on a filled bitmap erase exactly20 pixels; calling the preceding [$3213](source-plf10.html#3213) RTS changes nothing. A separate UP+FIRE jump followed by100 neutral frames lands alive at X176/Y64. Replaying from after that stamp with only the pre-stamp bitmap restored lands at X176/Y62. This controlled comparison isolates a two-pixel landing-height effect; it does not establish a fatal hole or full level completion. Replay states.
