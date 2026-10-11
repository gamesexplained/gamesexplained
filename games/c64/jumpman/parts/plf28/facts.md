# 28 — Now You See It

## Loaded program

`PLF28` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Bomb callback [$322F](source-plf28.html#322F) alternates `$80/$05` across1,016 matrix bytes, preserving bitmap pixels and sprite pointers. Death callback [$328C](source-plf28.html#328C) requests foreground [$3261](source-plf28.html#3261) to fill `$85` and restore visibility. Ordinary bomb erasure happens after the palette callback.

## Checks and remaining limits

Live input collects a100-point bomb, verifies the isolated `$80` fill with unchanged bitmap/pointers, then dies and restores `$85`. CPU checks cover both alternating colours and all restore states. The second colour phase in a legal route remains open.

The game's shared verification scope and cross-level comparisons are included below.
