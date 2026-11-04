# Stunt Car Racer — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The MicroProse release of 1989 for PAL machines, one G64 (SHA-1
  `0540264fca9bd8583c4bfcc9a6f422b2ac25f5c9`, `orientation.md`). The game
  is one load: the loader `*` reads 330 sectors no directory entry names
  and jumps to STARTUP at `$3FFB`. Nothing is loaded per track.
- The start-up (`$3FFB`-`$42C6`) runs once and is then drawn over by the
  bitmap at `$4000`. It sums the game's bytes in seven ranges
  (CHECKSUM `$425D`, `checksum_ranges` `$42A9`): when the sum is not
  `$9DFA` the border turns yellow and the game stops for good.
- The NMI handler (`$9A32`) only clears CIA 2's flags, so RESTORE does
  nothing.
- Two things in the file no code reads. At `$AFE0`, after the physics
  tables, 29 bytes each flipped with `$AA` read "COPYRIGHT GEOFF CRAMMOND
  1988". At `$7F40`-`$7F9A` the file as loaded holds the end of an Atari
  ST (GEM) alert: "ifferent from|the palette that is in use.|Re-color
  image with current|palette?][ Yes | No ]". STARTUP copies 64 bytes from
  `$6B60` over its first 64 before anything is shown (in a race that is
  sprite `$FD`, a frame of the boost's flame). Both lie inside the
  checksum's ranges, so they were on the disk when the sum was made.

## Memory layout

| Thing | Where |
|---|---|
| The car's state: its position, three bytes an axis (`$0100`-`$0108`), velocities, angles and the springs | `$0100`-`$018F` (cleared by CLEAR_RACE `$3DF9`) |
| The track built for the race: each piece's kind, square, shapes, ends and distance round the track | `$0400`-`$0773` (BUILD_TRACK `$EA34`) |
| The rotation matrix, and the opponent's wheels from `$07C4` | `$0774`-`$07FF` |
| The bitmap the menus and every other frame of the view are drawn in; the clocks' sprites at `$4000`-`$40FF` in a race | `$4000`-`$5F3F` |
| The race's screen and sprite pointers | `$5C00`-`$5FFF` |
| The race picture: the view, the windscreen's frame, the bonnet and the dashboard | `$6000`-`$7F3F` |
| The menus' screen | `$7C00`-`$7FE7` |
| The league, saved and loaded with a game | `$8000`-`$80BF` and `$C700`-`$C77F` |
| The points of the piece being drawn and other work tables | `$A200`-`$A37F` |
| The quarter-wave table every sine and cosine is read from | `$A700`-`$A7FF` (`quarter_wave`) |
| The twelve drivers' names and ways of driving | `$AE00` (`driver_names`), kept under the chips at `$DC00` |
| The eight tracks' names and descriptions | `$AF00`, `$BA62`-`$BF41` (pointers at `$B220`) |
| A race's state | `$C300`-`$C3FF` |
| RAM under the I/O area: the dashboard's copies (`$D000`-`$D3FF`, `$DD00`), the drivers' pool (`$DC00`) and the tracks' records (laps at `$DE00`, races at `$DF00`) | `$D000`-`$DFFF` |

## Timing

- The race runs a pass of RACE_LOOP (`$3D05`) at a time: the controls, a
  step of the world, the view drawn into the bitmap that is not on show,
  and then the flip. *Live*: a pass took 7.1 to 7.25 frames on Little Ramp (42
  passes in 300 frames from `work/play-practice.vsf`, 69 in 500 from
  `work/play.vsf`), so the view moves about seven times a second.
- The race's clocks are counted in passes, not in time: TICK_CLOCK
  (`$109C`) adds 0.14 seconds, seven frames' worth, for every pass. *Live*:
  69 passes in 500 frames are 9.66 seconds on the clock in 10 seconds of
  play, so the clock runs about three per cent slow on Little Ramp, more
  where the view takes longer to draw.
- The raster interrupt (`$CDAA`) splits the race's screen into bands. At
  line 62 it shows the bitmap just drawn (`$D018` `$70` or `$78`), and at
  line 197 it puts the bitmap at `$6000` back for the dashboard. It also
  moves the engine's note on every frame (`$CF0F`).

## Controls

- The joystick in port 2, read by READ_CONTROLS (`$F79E`) into `$66` (bit 0
  forward, 1 back, 2 left, 3 right, 4 fire). Left and right steer only
  while a spring is pressed (CONTROLS `$1C64`). Forward drives, and the
  drive goes on after it is let go; back brakes and stops the drive.
- Fire with forward or back is the boost (BOOST `$F60F`), while the car is
  on the road and some is left: a unit every 17 passes in the league
  (`$C388`), every 13 in the Super League, and the engine's push doubled.
- Five keys stand in for the stick, kept at `$F807` and changed by the
  keys menu: `=` back, SPACE back with fire, S left, D right and RETURN
  forward with fire.
- P pauses, O goes on, F1 held in the pause defines the five keys again
  (PAUSE `$3EE0`, REDEFINE_KEYS `$97AF`). C= ends the race only while the
  car is off the road or the race is lost (RACE_OFF_ROAD `$3D95`). F1 held
  at the panel before a league race skips it (SKIP_RACE_KEY `$3B5F`).

## Graphics

- Multicolour bitmap mode in bank 1. The view is drawn into the bitmap
  that is not on show and the interrupt swaps them (REQUEST_FLIP,
  FLIP_DONE `$3F70`). The bitmap at `$6000` holds the dashboard, which the
  view at `$4000` lacks, so the interrupt shows `$6000` below line 197.
- DRAW_VIEW (`$167A`) draws the track piece by piece from the car
  forwards: four pieces a pass, seven while the car hangs from the crane,
  up to six on Draw Bridge. Each piece's points are turned into the eye's
  frame and projected (DRAW_PIECE `$177D`), joined by lines
  (POINTS_TO_LINES `$1A3B`) and filled.
- The front wheels are sprites that move with the springs
  (WHEEL_SPRITES `$14D0`); a wheel that would sit too low is drawn into the
  bitmap instead. The clocks are digits drawn into sprites (DIGIT `$142E`).
- The crack across the top of the windscreen is cut into the bitmap a
  pixel pair at a time (CRACK `$1B88`).

## Mechanics

- The car rests on three points, each with a spring (WHEELS_ON_ROAD
  `$0A97`). A spring pressed past the track's damage line (`$C38B` plus 7)
  adds to that point's damage, but only for a few presses in a row: the
  count `$E1` must be below a number each track sets, from 3 on Roller
  Coaster to 10 on Big Ramp (`$209B`, from the track's description).
- CRACK grows the crack to match the damage. When the crack reaches the
  far side, or the damage reaches `$80`, the car is wrecked. A bump of 20
  or more also takes one of the car's ten whole parts (`$C719`), drawn as
  holes in the damage bar (DAMAGE_BAR `$F6A6`); a crack that steps into a
  hole adds damage instead of length.
- The holes stay from race to race in the league and into the next
  season, unless the player ends the season in the bottom division or wins
  the top one (CHANGES `$375D`). A practice race puts the parts back as
  they were (RACE_END `$3DAB`).
- A race is four crossings of the start line (`$C354`, CLEAR_RACE), counted
  only after the car has passed the piece half way round (LAP_CHECK
  `$0FAD`). The car starts on the piece before the line, so the first
  crossing comes at once (*live*: 3.5 seconds after the drop on Little
  Ramp) and the race is three laps.
- In a league race the computer's car drives the track's line
  (OPPONENT_LINE `$1D25`), passes or blocks the player when they are close
  (LINE_PASS `$1E3C`, LINE_HOLD) and bumps them (OPP_BUMP `$209C`). Its top
  speed and limits are drawn at random for each race from ranges for the
  track (OPP_PICK `$1F06`).
- The races the player does not drive are worked out (RACE_RESULT
  `$E92C`): each driver's rating is a base by its place in the league's
  order, 120 for the first down to 10 for the twelfth (`driver_base`
  `$E8B6`), plus 0 to 63 at random. The higher rating wins, a tie goes to
  a coin, and the winner takes the fastest lap 160 times in 256. So a
  driver 70 or more below another never beats it, and one 60 below (Dare
  Devil against Hot Rod) wins 8 of the 4,096 pairs of draws, one race in
  512.
- Two points a win and one a fastest lap; a tie on points goes to more
  wins, then to a coin (SORT_DIVISION `$E9A3`). A season is six races.
- At the season's end the winner of each division goes up and its last
  goes down. Out of the top division only the player goes up, into the
  Super League (CHANGES).
- The Super League's race settings are a second set of eleven bytes,
  read from `$BFF5` in place of `$BFEA` because the flag `$C71A` that
  selects them holds the player's driver number, 11 (CLEAR_RACE,
  `race_start_bytes`). The car's drive is `$0140` against `$00F0`, the
  opponent's engine `$013A` against `$00EC`, and the damage line one
  higher. The opponents' limits come from a second set too (OPP_PICK).

## Data tables

| Table | Where | What |
|---|---|---|
| Tracks in the league's order | `track_order` `$3728` | Little Ramp and Hump Back (Division 4), Stepping Stones and Big Ramp (3), High Jump and Roller Coaster (2), Ski Jump and Draw Bridge (1) |
| Track descriptions | `$BA62`-`$BF41` | Little Ramp 44 pieces, Stepping Stones 56, Hump Back 53, Big Ramp 44, Ski Jump 40, Draw Bridge 78, High Jump 52, Roller Coaster 78 |
| Each track's boost | its description, `$C776`/`$C777` | 34 to 80 units in the league, 40 to 89 in the Super League |
| Race settings | `race_start_bytes` `$BFEA`, `$BFF5` | the league's and the Super League's |
| Drivers | `driver_names` `$AE00` | Hot Rod, Whizz Kid, Bad Guy, The Dodger, Big Ed, Max Boost, Dare Devil, High Flyer, Bully Boy, Jumping Jack, Road Hog, and the player |
| Ratings | `driver_base` `$E8B6` | 120 down to 10 by place |
| Sines | `quarter_wave` `$A700` | a quarter turn in 256 steps |
| Font | `$7FC0` | eight bytes a character |

## Sound

- No music. The SID is written by the start-up, START_SOUNDS (`$3F27`),
  the interrupt's engine note (`$CF0F`) and the sound effects (START_EFFECT
  `$8655`, EFFECT_TICK `$86EF`, CUT_EFFECT `$8716`), and by no other code.
- The engine is voices 1 and 3, an octave apart, on the pulse wave. Its
  note follows the speed along the road (ENGINE_SOUND `$E104`), an eighth
  of the way each pass, and the filter's cut-off follows it too.
- A sound effect is seven bytes: the voice, the waveform, the envelope,
  the pitch, the pulse width and how many frames the gate is held.

## The listing's error rate

A sample of 60 comments drawn with seed 1104 from the 996 in the listing
was checked by a separate agent on claude-opus-5-5 that wrote none of them.
It marked 12 with a wrong detail (20 %, a 95 % interval of 11.8 % to 31.8 %),
and every one held when read again against the code: a variable taken for
the car's height that is how far a wrecked car sinks (`$0A97`), the side the
opponent picks to pass (`$1E3C`), which way the race's screen is copied and
where the opponent is placed (`$3C99`), a round of races called a pair
(`$91B4`), two axes of the car's position called two of its points
(`$ED39`), when a season's end gives the car its parts back (`$375D`), and
smaller details of the bump (`$209C`), the view's first piece (`$167A`), a
digit's lost pixel (`$1426`), the track title's column (`$301B`, `$3460`)
and a flag set beside the menus' bitmap (`$3F84`). All 12 were corrected,
with 18 more comments that shared their mistakes. Two more, on the Super
League's settings (`$BFEA`, `$BFF6`), were found wrong and corrected while
this file was written. A checker misses some, so 20 % is a lower bound
until an audit reads the whole listing.

## Live tests

- The port beside the game, from the loader's hand-over through the menus
  and the races, every byte of memory, colour RAM and the chips compared at
  each pass (`port/test/lockstep.js`): a practice session for 4,000 passes
  (seed 1) and 3,000 each (seeds 2 and 3), and a season for 3,000 passes,
  all identical.
- Each ported routine against the game's own code on random states
  (`port/test/t-*.js`).
- Laps: from `work/play-practice.vsf` with the stick held forward, `$C378`
  went to 1 at frame 176, the first crossing of the start line.
- The pass's length: 7.1 frames on Little Ramp, 42 passes in 300 frames.
- The drawing distance: `$173E` poked to 6 drew 8.2 pieces a pass against
  4.0, and a pass took 8.8 frames against 7.1.
- A save and a load to a blank disk in VICE (`orientation.md`).
- The port beside the game on the code as published, every session (practice,
  the pause, a season, multiplayer) for 1,000 passes from the hand-over:
  all identical. A season with seed 2 for 1,500 passes and the pause
  session for 1,500 passes (17 pauses): identical.
- The checksum: one bit of the byte at `$9000` flipped in the loaded game
  (`work/entry.vsf`), and after 300 frames the border was yellow (`$D020`
  = 7) and the processor in the loop at `$42A6`.
- The pages' tests, on a clean checkout: `test_play.js` (the Play tab
  beside the game on the kit's C64: a practice race 289 passes against
  291, a season race 260 against 261, the pause, each change of the
  screen's mode within two frames, and the page's memory against the
  whole memory over 4,748 frames); `test_levels.js` (the eight tracks'
  32 pictures, pixel for pixel against the Play tab's machine);
  `test_graphics.js` (the cockpit's frames and the wheels' steps against
  the port's WHEELS_TURN); `test_index.js` (the view's frames, and the
  odds of every pair of drivers against the port's RACE_RESULT);
  `test_discoveries.js` (every byte the page shows against the listing).
