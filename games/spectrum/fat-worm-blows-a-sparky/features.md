# Fat Worm Blows a Sparky — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

"Simulated" in the last column means the routine was run in a Z80
simulator on the game's own memory; `facts.md` has the detail and the
list of live tests.

Sources:

- Inlay text and instructions, transcribed by David Corbett for World of
  Spectrum, `https://worldofspectrum.net/pub/sinclair/games-info/f/FatWormBlowsASparky.txt`, read 29 September 2026. Dated 1985 on the inlay,
  released 20 October 1986.
- CRASH issue 34, November 1986, review at `http://www.crashonline.org.uk/34/fatworm.htm`, read 29 September 2026.
- Wikipedia, `https://en.wikipedia.org/wiki/Fat_Worm_Blows_a_Sparky`, read
  29 September 2026.
- Julian Todd's own page (archived), `https://web.archive.org/web/20070928094115/http://www.goatchurch.org.uk/progs/fatworm/fatworm.html`, read 29 September 2026.
- Spectrum Computing entry 1736, `https://spectrumcomputing.co.uk/entry/1736/ZX-Spectrum/Fat_Worm_Blows_a_Sparky`, read 29 September 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Collect 50 spindles, then find the disk drive and clone the worm to finish | differs | The board has 58 spindles (type `$F7` items with y size `$0C`). Taking one is live. The disk (type `$F6`, cell `$6FD6`) ends the game whatever the count (`$9E66`; live, with none taken). The 50 is tested only at `$BED8`, where it raises a block that bridges the way to the disk (simulated). The ending shows a hand lifting the disk out (`$78C9`, `$BB06`; live); nothing is cloned |
| Four bugs on the worm is a fatal error (death) | live | `$77A0`: one count for each of the worm's four sections, death when all four hold a bug |
| Blaster sparkies: horizontal shots from the nose | live | `$76FA`; the object's handler is `$D9A9` |
| Burper sparkies: mines laid with `1`, rise to a Sputnik overhead | confirmed | Laying is live (the record's wait byte starts at `$A0`). A Sputnik passing over a waiting burper sets it rising (`$DDDC-$DDF1`), and it rises anyway after 160 passes (`$D9A9`) (simulated) |
| A very high Sputnik passes above a burper and survives | open | Not found. The Sputnik's handler tests only whether the two outlines overlap before it sets a burper rising; the burper rises 7 units a pass and bursts on a collision or at height `$FA`, and Sputniks are created at `$CF` to `$D9`. No test of a Sputnik's height against a burper was found in `$D9A9-$DAF0` or `$DC69-$DDF7`. Not exercised live |
| Burpers also destroy Crawlies that touch them, and change the worm's direction | confirmed | Any sparky kills a Crawly that moves into it (`$D845-$D8A1`, simulated). Laying a burper reverses the worm's heading (`$7771`; live) |
| A misfired burper on the PCB can be eaten and fired again | traced | `$9BE1-$9BF0` lets the worm take a sparky once its byte 16 has counted down from `$37`; `$9E21` and `$A62B` add it back (simulated on the game's memory: 19 to 20) |
| Extra sparkies are awarded for spindles, and picked up on the data buses | live | 5 for a spindle (`$A5BD`; live). Trains of sparkies ride the type `$E2` items (`$D534`, `$DB0C`, simulated); six more objects arrive every 512 passes (`$7925`; live) |
| Ramps let the worm climb onto the data buses | confirmed | 34 ramp items (type classes `$80` and `$40`); the head follows their surface (`$9BFF`, `$9C66`, simulated). In `work/play-1.sna` the worm is on the ramp of cell `$7346` |
| De-bugger: a black-and-white striped block; crawl under it to shed all bugs | live | Four striped blocks (type `$E3`, `$8833`), each over a pad of type `$F5` that clears the bug count of each section that touches it (`$A5DD`; live with a pad written into the worm's path) |
| Sputniks: creeper bugs that fly low over the board | confirmed | Type `$E5` (`$D494`, `$DC69`, simulated): made high over a neighbouring cell, homes on the worm, comes down on it and becomes a Crawly. One is in the object list within eight passes of every game started in the live tests |
| Crawlies: erupt from the board surface and chase, or attach | traced | Type `$F3`: released by the seven type `$F4` pads (`$BE07`) and by eruption points at the worm (`$D442`, `$DE41`); chases within `$200` units (`$D7E4`); counted onto the worm on contact (`$9E81`, `$A5FB`) (simulated). The attach rule is live with counts written by hand |
| Insert map, bottom left: nearby spindles (white dots) and rough position | confirmed | `$CE0A-$D045` (simulated); the map shows in every play screenshot. It is the 5 by 5 cells round the worm, with untaken spindles in white |
| Solid 3D perspective: flat at the centre, sides visible at the edge | live | `$80EB`, `$811E`, `$81DB` (simulated); a box is its outline at two heights, each magnified about the middle of the view |
| Filled, dither-shaded faces drawn in software | live | rectangle `$8E13`, trapezoid `$90F9`, quadrilaterals `$9590` and `$9819` (simulated against a model) |
| `Q` faster, `A` slower, `O` rotate left, `P` rotate right | live | `$7C13`, `$76AE` on |
| Redefinable keys; Kempston, Protek, Interface 2 and others | differs | The redefiner (`$E544`) and Kempston (`$7C32`, live) are there. There is no code for any other joystick: the only joystick port read in the image is `$1F`. Interfaces that press keys are covered by the redefiner |
| `H` halts play and runs a "bouncing ball routine" | live | `$D05E`; any key resumes |
| `G` ends the game | live | bit 7 of the control byte; the menu returns |
| Score for killing bugs and collecting spindles; separate hi-score | live | The n-th spindle scores n (`$A5CC`; live); a Crawly 20 (`$D84D`), a Sputnik 35 (`$DD5A`) (traced). The hi-score is kept (`$788F`; live) and drawn wrong above 999 |
| HUD shows sparkies left, spindles still to collect, score, hi-score | differs | SPINDLES is the number taken, counting up from 0 (`$7A98`; live) |
| Title-screen tune | confirmed | `$E69F`: ten scripts, 55.4 seconds a pass (simulated); the menu waits inside the player (live) |
| "£100 REWARD" anti-piracy forgery warning before the menu | live | `$7C92`, text at `$7CE0` |
| Opening menu: `1` redefine keys, `2` Kempston joystick, `0` start | live | `$E508` |
| The whole world is a circuit board seen from above | confirmed | 129 cells of 256 by 256 units linked into a board 16 cells by 22, with two joins between far-apart parts (`$6464-$757B`) |

## Beyond the documentation

Found in the code, not in the manual.

- The loader is the ROM's own loading routine with faster timing, and a
  load that fails starts the game anyway.
- The tape carries the routine that made it and the tape utility that
  saved it, signed "© 1983 NMS".
- A three-digit seven-segment counter on six blocks of the board counts
  the sparkies that trains deliver to four terminals (type `$ED` items).
- Blocks that rise and fall on their own and rows of blocks that ripple
  (the handlers `$BD6F`, `$BD90`, `$BDD1`).
- The disk drive has a moving arm (`$BED1`).
- In play, sound is made by the loops that clear and copy the picture.
- The tune player has a noise voice that no script uses.
- The hi-score is drawn wrong above 999, and the worm cannot fire with
  more than 128 sparkies.

## Open questions

- **Does the difficulty rise?** In one respect, traced: from pass 4,352
  one Crawly in eight released by a pad is larger and takes two sparkies
  (`$BE6C`, `$D857`). No table of difficulty was found: the object
  handlers' constants are fixed.
- **Is there a height or level system?** None was found. The head falls
  to whatever surface is under it, down to the board, and no variable
  remembers a height reached (every store in `$9A89-$A8C0` was listed).
- **Can the disk be reached with fewer than 50 spindles?** Not
  established. The block the count raises looks like the only bridge, but
  no route was tried.
