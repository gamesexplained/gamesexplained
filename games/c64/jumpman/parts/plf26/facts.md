# 26 — Gunfighter

## Loaded program

`PLF26` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$345A](source-plf26.html#345A) consumes fire on every call and permits one player shot at a time. Enemy vertical shots use equal half-X, so hardwareX160 and161 align. Hits [$3505](source-plf26.html#3505) add100, respawn either enemy at (8,152) and advance the counter selecting pursuit thresholds. Initialization [$314D](source-plf26.html#314D) starts enemy6 at (8,152) but enemy7 at (8,216).

## Checks and remaining limits

Live DOWN+FIRE confirms launch without jumping. A separate ordinary-input route hits enemy7 for100; pixel overlap, respawn, counter0→1 and no-fire control are verified. CPU checks cover all eight directions, bounds, masks, scoring and all four quadrant-threshold pairs. A resulting change in enemy route choice and full completion remain open.


## Native hit and no-fire comparison

Private comparison records retain VICE 3.13.2 PAL joystick inputs, native hit checkpoints, score/life reads and screenshot hashes. Each level was selected through the original loader and initialized before a220-frame neutral spawn. Subsequent routes change only port2 joystick input, with no RAM, register or collision edits. This establishes within-level input routes; earlier campaign progression and complete level finishes remain separate.

**Gunfighter:** from the initialized ready-26 stop, neutral754, LEFT+FIRE4, RIGHT4 and neutral32 PAL frames produce a100-point hit. At [$351E](source-plf26.html#351E), accepted enemy7 and player shot1 are both at(240,56); only those two enabled sprites have opaque-pixel overlap, eight pixels. Collision shadows are `$82` for both and zero for Jumpman. At [$356C](source-plf26.html#356C), score is100, kill counter1, enemy7 has reset to(8,152), and Jumpman remains alive with six reserves. The same794-frame movement without fire scores0 and never enters the hit-award path. The counter changes the threshold pair from half-X52/Y78 to92/100; at player(288,56), both pairs still choose route condition `$11`. A resulting change in enemy route choice, mixed-contact behavior and full completion remain open. See route evidence and [first hit](reference/gunfighter-first-hit.png).
