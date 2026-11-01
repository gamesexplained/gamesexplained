# Lethal Weapon — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

A G64 image of a PAL disk, 101 files. The boot file `LETHAL WEAPON` loads
over `$0316` and loads `F` at `$4000`, which loads `LOADER` at `$C000`, the
title program. The title loads the game, `GAM0` (`$03C0`-`$378F`) and
`GAM1` (`$E000`-`$FCFF`), and jumps to `$03C0`. The game-over code asks
for a file `TITLE` (`$0761`), which this disk does not hold.

## Memory layout

| Thing | Where |
|---|---|
| Game code and tables | `$03C0`-`$378F`, `$E000`-`$FCFF` |
| Stage overlay (exits, file names, sprite list, walkers, animation table, enemy records) | `$3790`-`$3FFF` |
| Two screens (double buffer) | `$4000`, `$4400` |
| Stage character set | `$4800`-`$4FFF` |
| Panel character set (PAN0) | `$5000`-`$534F` |
| Sprites | `$5380`-`$7E3F` (frames `$4E`-`$F8`) |
| Level character map, 288 × 70 | `$7D80`-`$CC3F` |
| Character properties (from COL0) | `$FC95`-`$FD94` |
| Stage colours (.ATT) | `$FD96`-`$FE9C` |
| Respawn list | `$FE9D` on |

The processor port is `$35` in play; VIC bank 1 (`$DD00`).

## Timing

The main loop (`$E983`) waits for the raster between lines `$A4` and
`$B1` (`$F274`) each pass. The clock counts 60 passes to a second
(`$F424`). Raster interrupts: `$136F` at line 0, the sprite multiplexer
from `$E1AC`, the panel at `$1281` (line `$BF`), `$12F4` (`$C6`) and
`$132B` (`$CA`, which runs the sound effects, `$F88F`).

## Controls

Both joystick ports are read together (`$F314`): either port plays. Fire
shoots one round a press (`$1DB3`). Up jumps (`$20EF`) or climbs a ladder;
up at a door goes through it (`$21A1`). P pauses (`$E12F`, matrix `$29`).
RESTORE goes to an `RTI` (`$EC65`). At the select screen, fire held with
right picks Riggs and with left Murtaugh (`$C34C`): *live*.

## Graphics

An eight-way scroll over two screens (`$14E1`): one routine a frame from
`$178F` copies a slice of the shown screen into the hidden one, a
character over; at the flip (`$28ED`) a job from `$188F` shifts colour RAM
and draws the new edge. Sixteen objects (`$AF`/`$BF`/`$CF`/`$DF`/`$EF` +
n), sorted by line (`$F2B3`) and multiplexed onto eight sprites (`$E1AC`).

## Mechanics

- Lives 3 (`$373C`), energy `$40` (`$F373`), 25 magazines (`$F359`) of 6
  rounds (`$E914`), clock 5:00 (`$F421`-`$F423`).
- A magazine every time the clock's seconds digit reaches 0 or 5 (`$F47A`).
- At 0:00 a life is lost and the clock is set to 9:00 (`$F491`).
- Damage by weapon level (`$285C`): 1, 2, 3. Weapon level 0, 3, 6 (`$1193`).
- Points (`$F202`): hit 300, kill 400, boss 1000, points pickup 400.
- Two continues (`$2865`).
- Jumps: Murtaugh 32 steps, Riggs 40, both 40 lines high (`$36A0`, `$36E2`).
- Stage `$14` (L4AX) is named at `$1AD1` but no exit leads to it and the
  disk has no such file. Five overlays name a sprite file SP03 that the
  disk does not hold.

## Data tables

Stage files are packed; `$F5D5` unpacks them (Huffman-coded literal
lengths, offsets and lengths, three tables a block). A stage map is 144
tile columns × 64 rows; an A stage builds rows 29-63 and its X stage rows
0-34 (`$3824` in each overlay: `$441D` or `$4400`).

## Sound

Game: an effects engine (`$F889` init, `$F88C` start, `$F88F` update), 18
effects (`$FA71`). Title and ending: Mark Cooksey's music driver (`MUSI`,
`$E000` init, `$E003` play), three tunes; the title plays tune 0 and tune
2, the ending tune 0.

## The listing's error rate

Not measured. A sample of 60 comments was drawn (seed 20261101, over the
999 line comments the three parts own: 36 from the game, 17 from the
title, 7 from the ending) and its brief written, but it has not been
checked: the contributor asked for no subagents, and the checker must be
an agent that wrote none of the comments. Until it is checked the game
stays at Bronze.

## Live tests

- The select screen takes fire with a direction, and no other input: *live*.
- Game over on this disk: the load of `TITLE` fails and the jump to `$C000`
  crashes with the program counter at `$C011`, in two separate games: *live*.
- The ending (entered by calling `$375C`) loads MEL, ME0, ME1 and MUSI and
  shows WELL DONE! THE MAGIC CONTINUES: *live* (`reference/ending.png`).
- The level map built from stage 1A's files by the run's own script
  matches `$7E40`-`$CC3F` of the play snapshot byte for byte.
- The page's music player writes the same SID registers as the driver
  run on the title's listing, for 3000 frames of each tune (`test_music.js`).
