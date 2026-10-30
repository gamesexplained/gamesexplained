# Barrel jumping: facts

File `E` of side 1, unpacked at `$1000`; the travelogue sets it in
Germany. Every fact names the routine or table it comes from, in this
part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$2489` | the code: the run, the stride, the interrupts, the falls, the scene |
| `$268A`-`$2869`, `$2992`-`$2BFF` | zeros nothing reads |
| `$286A`-`$2991` | the hidden credits screen and its two names |
| `$4000`-`$47FF` | the upper character set: mountains, stands, flags |
| `$4800`-`$4BE7` | the screen (`bj_screen`) |
| `$5000`-`$57FF` | the lower character set: letters, the meter, the barrels and the ice |
| `$5800`-`$7C7F` | the sprites' shapes, the 64th byte of each its colour and flags |
| `$8000`-`$895F` | the scenery: the top rows and the 120-column band, with their colours |
| `$8B00`-`$924F` | the poses (`bj_pose_data`) |
| `$A000`-`$ABFF` | the music driver and its tracks |

## The run

- The barrels, 3 to 20, are chosen with left and right, tune 11 at each
  step (`$1FDD`). In a competition, three attempts, and a player's next
  choice cannot be below the number last cleared (`bj_score`, `$15C2`).
- The stride (`bj_stride`, `$1A9D`) is a state machine of eight states.
  A step counter gains `$30` a frame and moves the state on each time it
  passes 256, about every 5.3 frames. Left must be held from state 2
  through 3 and right from 6 through 7 (`bj_stride_left`, `$1B56`;
  `bj_stride_right`, `$1B4E`), so the skater pushes off each foot in
  turn. States 0, 1, 3 and 4 push, adding `$30` a frame up to speed
  level 7 and `$28` from level 8 (`bj_push`, `$1B86`).
- Friction is taken every frame by the speed's level, 0 to 15 (the
  speed in halves of a pixel a frame): 5/256 of a pixel at the slowest,
  rising to 69/256 at the fastest, with level 13's 35 lower than level
  12's 45 (`bj_friction`, `$1B66`).
- Fire held at level 2 or more takes off (`bj_takeoff`, `$1105`): the
  jump's poses, and at the `$FE` in the list a vertical speed of `$FE3E`,
  to which the interrupt adds gravity. In the air the speed falls by
  3/256 of a pixel a frame.
- Down in the air prepares the landing (`bj_landing`, `$115D`). Without
  it the skater falls on the ice (`bj_fall_ice`, `$1741`), or on the
  barrels when touching them (`bj_fall_barrels`, `$17D0`). A collision
  of sprite 2 while landing knocks a barrel into the air as a sprite
  (`bj_hit_barrel`, `$18AE`).
- Coming down before the barrels' strip has come 40 columns on scores
  "0 CLEARED!" (`$118D`).
- The score is the number of barrels cleared, 0 to 20 (`bj_points`,
  `$1641`).
- Each player's joystick port is learned from the first fire or move on
  the first attempt; the event rewrites eleven reads of `$DC00` and
  `$DC01` to the port found (`$2334`).

## The scenery

- Three bands scroll at three speeds, split by raster interrupts at
  lines 0, `$61`, `$A2`, `$B0` and `$EF` (`bj_irq`, `$11DB`): the
  mountains a pixel every 15 columns of the far band, 7 pixels in all;
  the far band (stands and flags) at half speed, round a scenery 120
  columns wide; the near band (the barrels and the ice) at full speed.
- The flags flutter: rows 2 and 7 of the flag character, `$1C`, are
  turned over by EOR `$A8` every 11 frames (*live*, 30 October 2026:
  screenshots 11 frames apart differed only at the flags and the prompt).
- The take-off mark, character `$FF`, comes onto the ice row when the
  far band's column reaches 94; the barrels start at 100.

## The hidden credits screen

With the first two players named AUTHOR and OFTHEGAME, in either
order, the event shows a yellow screen, "WRITTEN BY / MATT,JOE, &
DOUG", with the skater striding and a barrel rolling, until the fire
button on port 2; then `practice` (`$081D`) is set to `$FF` and the
shell restarts at `$0900` (the test at `$286A`, the screen at `$289B`).
The names are compared nine characters at a time with the records'
names, which hold the name as typed followed by spaces. *Live*, 30
October 2026, with the names poked into `$0800` and `$0820`.

## Sound

The events' music driver at `$A000`. Tunes 3 and 12 are never started.

## Leftovers

The bit tables at `$1A71` and the pose list at `$19A6` are never read.

## Registers

The VIC-II's bank, two character sets, fine scrolls for each band,
five raster interrupts, sprites, sprite collisions with the scenery and
colours; the SID's voices, filter and volume, and voice 3's
oscillator; CIA 1's ports for both joysticks, rewritten per player;
CIA 2's port A for the VIC bank.

## Strings

In screen codes: "PRESS YOUR BUTTON", "BARRELS:", "FIRST ATTEMPT",
"SECOND ATTEMPT", "THIRD ATTEMPT", "CLEARED!", and the hidden
screen's AUTHOR, OFTHEGAME, "WRITTEN BY" and "MATT,JOE, & DOUG".
