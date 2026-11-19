# Jumpman Junior — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The disk release: a 16 KB cartridge image (`CBM80` at `$8004`, cold and
  warm start `$8009`) loaded to `$8000-$BFFF`, plus a 47-byte copier at
  `$C000` (`loader_copy`) that copies the KERNAL ROM into the RAM under it,
  banks that copy in (`$01` = `$3D`) and patches IOINIT's `$01` value at
  `$FDD6` to `$ED`, so the game's own IOINIT call keeps the RAM KERNAL and
  the game's code at `$A000-$BFFF` visible.
- The whole game is in that image; nothing is loaded after the start.
- The code is not the original Jumpman's: searching the original's
  resident code (`games/c64/jumpman`) for 16-byte windows of this image
  found 51 matches, all in short common sequences.
- *live*: level 10's bomb routine ends with `STA $8004` (`$B754`), which
  writes 0 over the C of `CBM80` once the transporter sound has started.
  On the cartridge that store hit ROM; on this disk it changes RAM. In
  VICE, after a bomb on level 10, `$8004`-`$8008` read `00 C2 CD 38 30`.
  A soft reset then went to BASIC's READY. With the signature intact
  (the play snapshot), a soft reset ran the cartridge's cold start with
  `$01` = `$37`, BASIC's ROM over `$A000-$BFFF`, and the game stalled on a
  black screen with its interrupt at `$863C`.

## Memory layout

| Thing | Where |
|---|---|
| Zero page temporaries, sprite shadows, timers | `$20-$5F`, `$67-$9F`, `$A0-$A4` |
| Levels' own variables, cleared each turn | `$0880-$08FF` (`$99F8`) |
| Task list (16 slots), timers, stick, sound voices, game state | `$0900-$09D3` |
| Player records (4 × 8 bytes), current player | `$0A00-$0A1F`, `$0A28-$0A2F` |
| Bullet steps | `$0A30-$0A47` |
| Level header in use / stored copy | `$0C00-$0C3F` / `$0C40-$0C7F` |
| Bitmap row tables, note table, colour-set table | `$1000-$11FF`, `$1200-$12BF`, `$1400-$14FF` (built at start-up) |
| RAM copy of the character ROM, of the sprites | `$2000-$27FF`, `$2800` |
| Status bar text and its last-drawn copy | `$3E00-$3E4F`, `$3E80-$3ECF` |
| Bitmap, screen, sprite shapes (VIC bank 1) | `$4000-$5FFF`, `$6000-$63FF`, `$6400` on |
| Level 8's letter shape | `$7900` |
| High-score table, 20 × 16 | `$7E00-$7F3F` |
| Engine | `$8009-$A98A` |
| Level data and level code | `$A98A-$BBFF` |
| Level headers, 12 × 64 bytes | `$BC00-$BEFF` |
| Ending screen and its banner | `$BF00-$BFF5` |

## Timing

- One raster interrupt a frame at line `$E8` (`irq`, `$863C`); it runs the
  16-slot task list (`run_tasks`, `$87D3`). A CIA timer interrupt that the
  KERNAL leaves running is only acknowledged.
- Run speed: `$0924` counts frames up to the speed in `$09B6` (1 to 8; 9
  stops everything); when it gets there `$A2` is set for one frame and
  Jumpman moves. The enemies use `$0925` against `$09B7`, which is set to
  the same run speed at each new life (`$9AFC`): the run speed slows the
  enemies as well as Jumpman.
- A level's moving things act only on frames where `$09D3` is set (the
  enemy count came round and Jumpman is not dying).

## Controls

- Joystick in port 2 only (`$86AD`, `$86CF` read `$DC00`).
- Left and right walk 4 pixels a movement tick; up and down climb a
  ladder 2 pixels (`$A33C`).
- Fire with right jumps right, with left jumps left, with up straight up
  (shapes `$98`, `$99`, `$94`); fire alone or with down does nothing
  (`start_jump`, `$A3B8`). A jump is 22 steps (`jump_path`, `$A494`).
- Keys 1 to 9 are read through the KERNAL's keyboard scan with the game's
  own decode hook at `$823E`; the keyboard buffer is never read, so typed
  text does nothing.

## Graphics

- Play is a multicolour bitmap (`$D018` = `$81`, bank 1): colour 1 orange
  (bombs), colour 2 green (girders, slopes, up-ropes), colour 3 blue
  (ladders, down-ropes) (`level_colours`, `$8BD4`). The status bar's two
  rows are hires: the interrupt switches multicolour off near line 233.
- Levels are drawn from draw scripts (`$8A36`): FE sets a shape, FD a
  step, and each run is X, Y and a count. Shapes (`$8A91`) are rows of
  count, X offset, Y offset and one colour per pixel. Eight shapes at
  `$8F3E-$90D7`: girder, girder eraser, ladder, ladder eraser, bomb,
  up-rope, down-rope, rope eraser.
- 45 sprite shapes packed at `$82B8` (8 × 10, two bytes a row), expanded at
  start-up to `$6400` (`$8243`).
- Floor detection reads the bitmap, not a map: `probe_floor` (`$97A8`)
  collects the colours under Jumpman's body and under his feet in `$09A8`
  and `$09A9`.

## Mechanics

- `next_turn` (`$9974`) adds `$B2` and `$B3`, the tape buffer pointer,
  and on `$3F` turns the interrupts off; the KERNAL's own start-up sets
  them to `$033C` (`$FD5F`), after the check for a cartridge
  (`$FCE7`). The disk's loader leaves both at 0. Traced, not tested.
- The score for the next Jumpman (`$0A2B-$0A2D`) is never wrapped when
  the score is (`$9FCD`), so none comes after the score wraps.

- Lives: 4 at the start (`player_init`, `$996C`); the status bar shows
  lives + 1 (`$A069`), counting the Jumpman in play, so it reads
  JUMPMEN = 05. A new Jumpman every 7,500 points (`score_check`, `$9FCD`).
- A bomb is defused when Jumpman's body covers orange and his cell (X and
  Y in 32-pixel steps) is in the level's bomb list (`bomb_check`,
  `$A600`): 100 points (header byte `$11`), and the bomb is wiped. The
  action byte's high nibble draws a change script; its low nibble would
  call a routine from header `$1F`, but no level sets it. That unused path
  also stores the routine list's high byte into `$26` instead of `$25`
  (`$A6AA`), so the high byte used is whatever `$25` holds: header `$1E`
  when the action also draws a change, else header `$1A`.
- Level end bonus: the time bonus left, then 25 × level for each Jumpman
  left (`level_bonus`, `$9EA2`).
- After level 12 the ending (WELL DONE, `$BF00`) plays once; from then on
  levels are drawn at random (`$9B1C`, flag `$09C5`).
- Score wrap at 1,000,000 compares each of its three bytes on its own
  (`$9FCD`).
- Each level's own behaviour (header routines and tasks):
  1 NOTHING TO IT: four bombs erase girders. 2 FIRE! FIRE!: two fires
  move after every bomb. 3 SREDDAL: six moving ladder sprites, climbable
  by touching (`$09D1`), turn round at each bomb. 4 HELLSTONES: four stones
  fall above Jumpman and bounce toward him. 5 FIGURITS REVENGE: 13 bombs
  change girders and ladders. 6 WALLS: each bomb adds a moving wall (up to
  six) that pushes Jumpman; the middle rope swaps between up and down. 7
  ZIG-ZAG: turned bullets weave. 8 SPELLBOUND: bombs carry letters; at the
  end letters in the place they take in EPYX JUMPMAN score 250 each. 9
  BLACKOUT: the level is drawn black and lit cell by cell round Jumpman;
  8 of 16 bombs at random. 10 HERETHEREEVERYWHERE: each bomb moves
  Jumpman to a transporter; at run speed 8 bullets cannot kill him. 11
  HATCHLINGS: each bomb lays an egg that hatches a bird that chases him.
  12 HURRICANE: wind pushes him right and wraps him round; gusts blow
  debris.

## Data tables

- Level headers, 64 bytes each at `$BC00 + 64 × level`: level digits,
  four tasks, bombs, bullets, start X/Y, cell offsets, points, bonus,
  sprite list, draw script, bomb positions, bomb list, change scripts,
  routines (each bomb, start, main, end), border colour, ladder and rope
  positions (`$32-$39`, `$3A-$3F`).

## Sound

- Three voices, a 7-byte record each at `$0940` (`sound_task`, `$88F2`).
  Scripts: a note index into the table at `$1200` and a length; `$FC`
  waveform and release, `$FD` pulse width, `$FE` envelope, `$FF` end.
- Tune list at `$9124`: four end-of-level tunes (one at random), death,
  level start, game over, ending, end of the high-score screen, a
  three-voice title tune, silence.

## The listing's error rate

- Sample of 17 November 2026: seed 1117, 80 comments drawn from 679 (20
  of the 95 generated level-data comments and 60 of the 584 written
  ones), checked by a fresh agent on claude-opus-5-5 that wrote none of
  them. 15 were wrong in a detail and none in its main claim: 18.8 %,
  95 % interval 11.7 % to 28.7 % (Wilson); weighted by the strata,
  20.8 %. Most were lists of a variable's uses with a use missing
  (`$0022`, `$0024`, `$0032`, `$0882`, `$0885`, `$0C39`); the others
  were a column number called an address (`$0053`), a KERNAL variable
  the game never reaches (`$0289`), 200 row-table entries for 256
  (`$8049`), a whole pair cleared where only its high byte is
  (`$87BA`), the title's blip played for every key (`$976B`), play said
  always to begin at `$9BD5` (`$9B1C`), "below line $DE" for "at or
  below" (`$A3FD`), the latent `$A6AA` bug's high byte always from
  header `$1A` (`$A6A0`), and a change script named for one of the two
  actions that share it (`$B8CA`). All 15 were corrected, with the
  comments that said the same: the rest of `$0881-$0885`, `$0054`, and
  the shared change scripts of levels 7 and 11. The sample is over the
  mark; an audit of every comment is recommended.

## Live tests

- All twelve levels reached by patching the level counter's increment at
  `$9B30` before the title, each run for 10 to 25 seconds with random
  input (`reference/level-NN-*.png`).
- Level 10's write to `$8004` and the two resets (Build, above), 17
  November 2026.
- `$D208` is the VIC-II's `$D008` seen again: a byte poked into `$D208`
  in VICE read back from `$D008` (level 11's start routine, `$B931`),
  17 November 2026.
- The run speed and the status bar's RUN SPEED, JUMPMEN = 05 at the
  start: seen on the status bar.
