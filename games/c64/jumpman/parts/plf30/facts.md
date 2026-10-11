# 30 — Grand Puzzle III

## Loaded program

`PLF30` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

At fewer than five bombs, trigger contact requests transformation [$3393](source-plf30.html#3393), installing layout [$31AA](source-plf30.html#31AA), bomb table [$3226](source-plf30.html#3226) and new callbacks without resetting remaining count. Special callback [$347C](source-plf30.html#347C) adds 400 before the resident 100, while the main loop's [$3078](source-plf30.html#3078) test sends stage-two death directly to completion when [$3014=5](source-plf30.html#3014). In stage one, post-death reserves $FF branch to exhaustion; other reserve values respawn. The stage-two check precedes that reserve test.

## Checks and remaining limits

Controlled live: bombs4 and request1 invoke the native transformation; subsequent held LEFT causes a normal death and reaches $5B00 with four bombs remaining. Stage-one control respawns while lives remain. Runtime callback installation, frame sequence and all eight replacement-table entries are checked. A joystick-only route from the initialized level collects nine bombs, loses one life, then touches trigger7 alive at(260,216) with three targets left. The original transformation retains three targets and installs bullet limit5. Continuing LEFT collects a500-point second-stage bomb and dies; the original death exit reaches completion at score1400 with two targets and four reserves. Earlier campaign entry remains outside this check. See route evidence.


## Transformation callbacks

Grand Puzzle III's [$3393](source-plf30.html#3393) installs collision task [$34C7](source-plf30.html#34C7) and frame task [$3418](source-plf30.html#3418), whose frames repeat49/50/51/52. After its asynchronous wait, [$33CE](source-plf30.html#33CE) installs drawing stream [$31AA](source-plf30.html#31AA), ladder/rope fields, eight-record bomb table [$3226](source-plf30.html#3226), bullet limit5 and marker task [$3499](source-plf30.html#3499), preserving the remaining count. The CPU check splits before and after the wait; the earlier controlled native transformation covers the asynchronous sequence. All nine checked runtime task targets and eight replacement bomb callbacks land on named code-record boundaries.
