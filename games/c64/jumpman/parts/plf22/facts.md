# 22 — Freeze

## Loaded program

`PLF22` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

[$328B](source-plf22.html#328B) moves creatures every third eligible callback. Its erratic state samples eight entries with duplicated upward diagonals. Contact [$33DC](source-plf22.html#33DC) reloads an80-count input lock. [$340C](source-plf22.html#340C) decrements to zero while retaining overrides, then clears them on its following call. Existing jump/fall physics can continue.

## Checks and remaining limits

Live input/no-input replays verify repeated refresh, blocked new input and bullet death during the freeze. This capture dies before release. CPU checks verify release ordering, continuing jump/fall, all contact/death masks and all eight velocity entries; an alive recovery route remains open.


## Recorded freeze countdown

Freeze's capture starts just before contact stores80. Contact reloads80 on frames1–3; the timer falls to59 at24, then renewed contact restores80 on frames25–42. At frame80 the timer is42 and Jumpman is alive; life state changes to1 at frame87 after a bullet mask`$05`. The timer is1 at frame121 and0 at122 while overrides remain`$88/$11`. At123 the zero-entry callback clears them to`$08/$10`; the next poll samples the held direction. This distinguishes countdown zero, clearing force flags and reading controls. The player dies before release in both replays, so this live series does not prove an alive recovery. Controlled original `$4900` cases establish that an existing jump and unsupported fall continue under input suppression.
