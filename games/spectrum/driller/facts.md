# Driller — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Incentive Software's original 48K tape (`orientation.md`): a BASIC
  loader, a 448-byte loader at `$FE40` that decrypts itself with the
  refresh register, then three turbo blocks: the loading screen, the game
  (`$6B12`-`$FDE7`, 37,590 bytes) and the game's own screen (`$4000`-`$5AFF`).
  The loader hands over at `$97A4` (`start`).
- 48K only: no paging, nothing loaded after the start but a saved position.
- The machine's ROM is used for the tape (SA-BYTES and LD-BYTES, from
  `info_screen`) and for one byte, FRAMES (`$5C78`), which
  `install_interrupt` reads once. The page carries the ROM's bytes the
  game reads (`rom-excerpt.json`).
- A trap: the first two bytes of `draw_view` (`$6B12`) are `JR $6B12`, a
  jump to itself, on the tape. `security` writes `$DD $E5` (`PUSH IX`)
  over them when the word is right; a game started past the question
  hangs on its first picture.

## Memory layout

| Thing | Where |
|---|---|
| the screen, loaded: the cockpit and console | `$4000`-`$5AFF` |
| the ROM's system variables (FRAMES read once) | `$5C00`-`$5CBB` |
| the view buffer, 104 rows of 26 bytes, top row first; the multiply routines are written at its start too | `$5CBC` (`$8A95`, `$8A97`) |
| matrices, vertices and clip work | `$5E4C`-`$5EE2` |
| the object buffer, the draw list, the face list | `$5F4D`, `$6766`, `$6856` (`$8A9B`, `$8A9D`, `$8A99`) |
| code: the 3D renderer | `$6B12`-`$8761` |
| variables, tables and texts | `$8762`-`$910D` |
| code: arithmetic, keys, sound, main loop, movement, aiming, panel, interrupt, menus, tape, security | `$910E`-`$CDDB` (with tables between) |
| the font, 59 characters of 6 bytes | `$CDDC`-`$CF3D` |
| the data header: counts, starting values, fill patterns, text places | `$CF3E`-`$D005` |
| the area offsets, the shared scripts | `$D006`, `$D04C` |
| 29 area records, the demonstration inside the first gap | `$D0B2`-`$FCC1` |
| the interrupt's table and jump, the stack | `$FE00`-`$FF00` (`$FD`), `$FDFD`, below `$FFF8` |

## Timing

- A 48K Spectrum: 224 T-states a line, 312 lines, 69,888 T-states a
  frame, 50 frames a second.
- The interrupt is IM 2 (`install_interrupt`): the table at `$FE00`-`$FF00`
  is filled with `$FD`, so every vector reads `$FDFD`, where a jump to
  `interrupt` (`$BAE6`) is put. Each frame it counts `$8A1D` up and
  `$8FC2` down; while the game is on (`$8BF2` = 0) it counts 50 frames at
  `$88A3` and takes a second off the clock (`$88A4`-`$88AB`); each minute
  costs a unit of energy, and moves the scripts' variables `$889C` and
  `$889D` on; it draws and times the sensors' beams.
- The main loop (`main_loop`, `$9807`) is one pass for each command:
  the view drawn when anything moved, the sensors checked, the console,
  then `take_commands` and `run_scripts`. With no key held a pass still
  comes once a minute of the clock. A pass that redraws the view takes
  several frames: 150 passes of random play took 8,700 to 11,500 frames
  in the lockstep runs (*live*, `port/test/lockstep.js`).
- Every sound effect plays with the interrupts off (`play_sound`), so the
  frames it lasts are lost to the clock and to `$8FC2`'s waits.
- Held keys in play repeat at once: the repeat's delay and rate
  (`$8FC3`, `$8FC4`) come from `$D002` and `$D003`, both 0. Typing a file
  name repeats after 35 frames and then every 5 (`filename`).

## Controls

The keys, from the tables at `$8FC8` (direction keys, three bytes each:
the key, its command moving the probe, its command moving the crosshair)
and `$8FEC` (two bytes each). `take_commands` looks a key up in both.

| Key | Moving the probe | Moving the crosshair |
|---|---|---|
| 7, O, stick up | forward (3) | up (`$1A`) |
| 6, K, stick down | back (4) | down (`$19`) |
| 5, Q, stick left | turn left (5) | left (`$18`) |
| 8, W, stick right | turn right (6) | right (`$17`) |
| 0, fire | fire (`$16`) | fire (`$16`) |
| SPACE | the keys to the crosshair and back (`$1E`) | |
| B | the crosshair shown or hidden (`$15`) | |
| P, L | look up, down (7, 8) | |
| N, M | roll left, right (9, `$0A`) | |
| R, F | rise, fall (1, 2) | |
| A, Z | the turn step, from the table at `$88CA` (`$0B`, `$0C`) | |
| S, X | the walking step, from the table at `$88BF` (`$11`, `$12`) | |
| U | turn round (`$0D`) | |
| D, C | drill, collect the rig (`$28`, `$2A`), only pressed alone | |
| I | the information screen (`$29`), only pressed alone | |

- Y and T are in the table as `$5E` and `$5B`, commands `take_commands`
  does not carry out. The table's count (`$8FC7`) is 24 for 20 entries:
  the search runs on into the probe's picture, whose bytes match no key.
- `read_keys` (`$943C`) scans the eight half-rows; with the Kempston
  interface chosen (`$8FC5` = 2) it reads port `$1F` and adds `$91`-`$95`
  for up, down, left, right and fire. The Sinclair stick and the cursor
  keys are the keyboard's own keys (6 to 0, and 5 to 8 with 0).
- The control options (`control_options`, `$C9C6`): 1 keyboard, 2
  Sinclair, 3 Kempston, 4 cursor, ENTER to begin.

## Graphics

- The view is 26 bytes (208 pixels) wide from column 3, its top at
  character row 2 (`$CF8F`, `$4043`), 105 rows in its tables
  (`$88DB`); `draw_view`'s copy puts 104 of them on the screen through
  the row table at `$8D0E`, bottom row first.
- A picture (`draw_view`, `$6B12`): `bound_view_box` keeps only the part
  of the area that can be in view; `make_view_matrix` builds the view
  matrix from the heading (`$876D`), the pitch (`$876C`) and the roll
  (`$876E`), each in 72nds of a turn, from the sine table at `$8E78`
  (`$40` = 1.0); `make_multipliers` writes nine unrolled multiply
  routines, one for each entry of the matrix, so a vertex turns with no
  multiply loop; each object is drawn by its type (cuboid, sensor,
  rectangle, pyramid or prism, line or flat polygon), its corners turned,
  clipped against the view's planes (Sutherland and Hodgman's way) and
  projected (x' = cx + x·cx/z, cy the same); the faces are queued, sorted
  farthest first (`sort_faces`), and filled into the buffer with a
  pattern of four rows for each colour (`$CF48`, 15 colours: 1 empty, 2
  solid, the rest dithers and stripes).
- A new area's first view dissolves in (`dissolve`, `$AB25`: four passes,
  each copying every fourth byte of every row, from offsets that step
  through the pattern at `dissolve_pattern`, `$AB13`); otherwise the
  buffer is copied (`copy_view`, `$9BF7`).
- The area's own colours (four bytes of its record) set the border, the
  flash of sound 2 and the view's paper and ink (`set_area_colours`); a
  paper of 8 makes the view bright.
- **The pass lamps.** Five attribute cells of the console, `$5A7A`-`$5A7E`
  (`$8BF3`, from `$CFA4`), each a little box: `take_commands` makes all
  five dark (`$8A66`, `$05`) as a pass begins, and they light (`$8A65`,
  `$45`, bright) one at a time as the pass goes on: when the pass's command
  is taken (`$9A64`), when the picture is begun, when its objects are
  queued, when they are sorted (`draw_view`) and when the view is on the
  screen (`$9818`).

## Mechanics

- **Drilling** (`drill`, `$BEFA`). Only in sectors 1 to 18 (the area's
  number below `$13`), only in the probe, and only with energy of 5 or
  more (`$8875`), which drilling and collecting each cost. The rig stands
  in front of the probe by its heading, on the floor or on top of a cuboid
  whose top is the floor, clear of every object and the area's walls. Its
  strike is 100 - (|dx| + |dz|) × 100 / the field's size, from the rig's
  centre to the area's gas field (`$87A0`-`$87A2`); 0 or less strikes
  nothing. 50 % or more makes the sector safe (`$877B` = 3), and the 18th
  safe sector wins (`$8BF2` = 5). The score goes up by the percentage ×
  the sector's gas × 10, and collecting the rig takes it back.
- **The gas.** The table at `$88EB` holds 18 amounts twice over; the
  first strike of a game points `$87A3` 0 to 15 bytes into it by the
  clock's frame count (`$88A3`), so each game rotates the amounts among
  the sectors.
- **The end.** `$8BF2`: 1 the shield gone, 2 the time, 3 the energy, 4 a
  fall of more than `$8777` cells, 5 every sector safe, 6 abandoned at the
  information screen. `game_over` shows the reason, then the view of area
  127, whose name gets the count of safe sectors ("18 CLEARED"), held 13
  times 75 frames; a key in the last twelve starts a new game, or the
  demonstration follows.
- **The clock** starts at 04:00:00 (`$CFF2`) and counts down a second
  each 50 frames; each minute costs a unit of energy.
- **Energy and shield**, at most 63 each, are kept for the probe and the
  jet apart (`$8876`-`$887A`); they start at 48 and 50 for the probe and
  29 and 34 for the jet (`$CF44`-`$CF47`).
- **The jet** (`$877A` set) flies: up and down move it by the step, and
  forward follows the pitch too. It cannot drill ("NOT IN PROBE").
- **Moving** (`move_to`, `$9F42`): a cell at a time towards the target,
  stopping at walls with a margin of 10 fine units (`$88D0`). Walking, a
  step up of no more than `$8778` cells is climbed if the probe's height
  of cells above it is free; a fall of more than `$8777` cells ends the
  game.
- **Sensors** (`draw_sensor`, `check_sensors`): each sensor of the area
  gets a record; one in reach (|x| + |y| + |z| against its range) fires at
  the probe every so many frames (its own period), when it is on the
  screen only while `pick_object` finds it at its place there, and when it
  is off the screen only while `move_to` gets from the probe to it, so a
  wall between them stops it. The interrupt draws the beam of one on the
  screen and takes the shield.
- **Scripts** (`run_script`, `$B320`): bytecode run when the probe walks
  into or shoots an object (the object's own), and after every pass that
  moved anything (the five shared scripts at `$D04C`, then the area's).
  34 opcodes (lengths at `$8939`): the score, the energy and the shield,
  objects shown, hidden, toggled and destroyed in this area or another,
  tests on them, 32 variables and 32 flags, sounds, going to another
  area, swapping the probe and the jet, the area's colours, a redraw, a
  pause. An opcode with bit 7 set runs only when a shot started the
  script.
- **The information screen** (`info_screen`, `$C3DC`): the sector, its
  rig, the gas found and tapped, the safe sectors; L and S load and save
  a position, 1 abandons, any other key returns.
- **A saved position** is the 333 bytes from `$8762` and each object's
  type byte, after a header (a `$1B`, the name, the length, the game's
  number `$2D84` from `$CF3F`, and a checksum, `checksum`), each through
  the ROM's SA-BYTES. A load takes headers until one matches and then asks
  the security question again.
- **The security question** (`security`, `$CB7A`): one of 128 words of
  the manual (`$ABC1`), picked by the frame counter. Three wrong answers
  (`$CAA6`) clear the memory and jump to `$0000`. *Live*: page 17, line
  4, word 1 was IMPROVE, as the manual has it.

## Data tables

- **An area record** (`load_area`, `$BE18`; offsets from `$CF3E` in the
  table at `$D006`): +0 a byte that clears the view before each picture
  when not 0; +1 the count of objects; +2 the area's number; +3 the
  offset of its scripts from the record; +5 its scale; +6 to +9 its
  colours (border, the flash, paper, ink); +10 to +12 the gas field (x, z,
  size; 0 outside the 18 sectors); +13 its name, 12 characters; +25 its
  objects; then its scripts, a count and each script's length and bytes.
- **An object**: +0 its type in the low nibble (0 never drawn, 1 cuboid,
  2 sensor, 3 rectangle, 4 to 9 pyramids and prisms by axis and
  direction, 10 a line, 11 to 14 flat polygons of 3 to 6 corners), bit 6
  hidden, bit 7 hidden at the start; +1 to +3 its position and +4 to +6 its
  size, in grid units; +7 its number; +8 the record's length; +9 on its
  colours, a nibble a face, and its shape's own bytes; its script after
  the type's fixed part (`$8929`).
- 29 areas: the 18 sectors (Amethyst to Diamond), Mitral, the two Stores,
  the K1 to K4 complexes, the Linker, the Ketar hangar, an "UNKNOWN AREA"
  (31) and the game over's area (127).
- **The demonstration** (`$D2B1`, from `$CF84`): commands, a byte with
  bit 7 set repeating the next one; 0 ends it. It walks, drills, looks
  round and shoots with the crosshair.

## Text

The game's text is ASCII. The font (`$CDDC`, 59 characters from space
to Z, six rows each) is drawn by `print_text` from records of a screen
address and a count. No private alphabet. The security words are
stored as each letter's code shifted left a bit, with bits 7, 6 and 0 left to
vary (the check clears bit 6, sets bit 7 and shifts right), so a letter is
one of four bytes.
`INCENTIVE SOFTWARE LTD COPYRIGHT 1987` is stored backwards at `$D388`,
which no instruction reads, and `TAPE OR DISC ?` at `$C838`, which no
instruction prints.

## Sound

The beeper alone, bit 4 of port `$FE` with the border colour in bits 0
to 2. 21 effects (`sound_table`, `$954A`), played by `play_sound` with
the interrupts off; 16 and 18 are silent. Effect 2, a sweep in the
area's flash colour, is the one the interrupt plays when a sensor hits.
The rest are sweeps, notes of `tone` (`$9768`) and falling or rising
runs of pulses.

## Ports

| Port | Instructions | What |
|---|---|---|
| `$FE` out | `OUT ($FE),A`, 23 of them | the border (bits 0-2) and the beeper (bit 4), in every sound effect, `tone`, `set_area_colours`, the interrupt's beam and the tape's return |
| `$xxFE` in | `IN A,(C)` at `$9447` | the keyboard's eight half-rows (`read_keys`) |
| `$1F` in | `IN A,(C)` at `$94AA` | the Kempston interface (`read_keys`) |
| `$7FFE` in | `IN A,($FE)` at `$C6BE`, `$C74E` | SPACE after a save or a load, which tells a break from an error |

No other port is touched: no AY, no paging.

## The listing's error rate

A sample of 75 of the listing's 262 comments, drawn with seed 20261102
(`kit/scripts/sample.py`): 15 of the 29 comments generated for the area
records and 60 of the 233 written by hand, marked by a checker on
claude-opus-5-5 that wrote none of them. 14 were wrong in a detail and
none in what a routine or table is for, all of them hand-written: 18.7 %
(95 % interval 11.5 % to 28.9 %), 20.8 % weighted by the two groups'
sizes. The details: the sensor record's +10 is the period of its shots,
not a range; the sensor list holds every sensor of the area, not only
those in view, and its state +3 says whether the sensor is on the screen,
not how it fires (one off the screen fires only while nothing stands
between it and the probe); `$8918` counts objects on the draw list, not
faces; the keyboard rows are cleared as they are decoded; a sound
effect plays two cycles a step, not one; `tone`'s waits are a turn
longer; `$886C` is the paper and `$886D` the ink; `aim_command`'s `$15`
and `$1E` act only in one of the two modes; the dial's edge table has 19
angles to 90 degrees; `init_game_data` sets the pass lamps' colours and
address, not interrupt counters and the message line; the checksum's
last shifts lose a bit; `$9DCA` is where `collide` writes, not the
probe's cell; and a division comment sat after the bit it described.
All 14 were corrected, with every other comment that made the same
claims (`copy_view`'s row order, `draw_view`'s lamps, `div_32_16`'s
rounding, `sensor_keep`, and sound effects 7 and 21). The listing has not had
a full audit.

## Live tests

- The port runs in lockstep with the game (`port/test/lockstep.js`, on
  `kit/spectrum/lockstep.js`): memory identical at every pass from the
  hand-over (100 passes, through the security question and the control
  options) and from every moment of play saved by the sessions, and
  through every way out of play forced from them: the clock run out, the
  energy, the shield, the information screen, abandoning from it.
- The page's machine on the published memory, with the code blanked,
  against the same machine on the whole memory (`port/test/t-page.js`).
- The page as published (`test_play.js`).
