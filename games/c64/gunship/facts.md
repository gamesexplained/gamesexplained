# Gunship — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The original MicroProse disk, PAL, protected with Rapidlok V6, from the
C64 Preservation Project's two G64 images (MD5s in `orientation.md`). The
game is eight parts, one for each program it loads (`orientation.md`,
"The parts"); every part's listing comes from a snapshot of that part
running, named in the part's `part.json`.

## Memory layout

The flight, from `parts/flight/work/play-flying-we.vsf` (Western
Europe). The engine's code is `M`; the other pieces come from `CP`,
`CH` and `W3.WE` (`orientation.md`, "How the flight is put together").

| Thing | Where |
|---|---|
| `G2`, the BASIC that sets the flight up and takes it down | `$0801`-`$0E74`; its variables from `$0E75` |
| The points' offsets from the eye, in eye space, and the drawing's work tables | `$1400`-`$1A85` (`rotate_points` at `$8DD7`, `rotate_axes` at `$8F93`) |
| The theatre's map, 16 by 16 squares, a terrain number each | `$1A86`-`$1B85` (`theatre_map`, from `W3.<theatre>`) |
| The terrain's points: x values, y values, heights, each point's numbers into them, and the points made as fractions of others | `$1B88`-`$1DD6` |
| Each terrain's objects: fixed ones and switchable ones, counts and addresses | `$1DD7`-`$1E9C` |
| The shapes: points, faces and edges, one record each, then a name byte for those that can be targets | `$1E9F`-`$3053`; targets from `$24E3` |
| The main loop, its start and its end | `$3100`-`$3EFD` (`flight_start`, `main_loop`) |
| The engine's zero page, kept here while BASIC runs | `$3F00`-`$3FFF`, swapped with `$0001`-`$00FF` by `$919B` |
| The window bitmap, buffer 1 | `$4000`-`$503F`, rows 0-12; the rest of its 8 KB holds sprites, the units and code |
| The units: the high bytes of x and y, map squares or headings, alert bytes, types, a fifth byte; 128 each | `$5100`, `$5180`, `$5200`, `$5280`, `$5300`, `$5380`; the fine positions and heights of units 0-5 in the gaps |
| The stores counts | `$53D8`-`$53DD` |
| The ground units' turns, hits and damage | `$5400`-`$5C0F` |
| The window bitmap, buffer 2 | `$6000`-`$703F`, rows 0-12; the rest holds the missions' code, sprites and the messages |
| The messages and their table | `$79B3`-`$7BD4`; addresses at `$7B04` (low) and `$7B26` (high) |
| The window's screen (its colours) | `$7C00`-`$7E07` for rows 0-12 |
| The engine's jump table and most of its code | `$8100`-`$C24F` |
| Reciprocals, sine and arctangent | `$C580`, `$C600`, `$C700` |
| The map's font (the big map and the CRT's map) | `$C800`-`$CFFF` |
| The panel bitmap, buffer B | `$C000`-`$DF3F`: the panel is rows 13-24, from `$D040`; rows 0-12 hold code, tables and the map font |
| The map's unit bits, one byte a square | `$E200`-`$E2FF` |
| The map characters' colours | `$E33C`-`$E3FF` |
| The big map's screen | `$E800`-`$EBE7` |
| Unit records' read and write, and more engine code | `$E40C`-`$E73E` |
| The sound effects | `$EC00`-`$ECFF` |
| The panel's screen (its colours) | `$EC00`-`$EFE7`, rows 13-24 shown (`$EE08` on) |
| The panel bitmap, buffer A | `$E000`-`$FF3F`: rows 13-24 from `$F040`; rows 0-12 hold the unit bits, the map colours, code, the big map's screen, the sound effects and the panel's screen |
| The RAM vectors | `$FFFA`-`$FFFF`: NMI and reset `$91EF`; IRQ `$9206` or `$94B8`, whichever interrupt is next |

The other parts:

| Thing | Where |
|---|---|
| The title's BASIC, `GUNSHIP` | `$0801`-`$10E4` |
| The title sequence's code (`TITLE`) | `$8100`-`$96C3` |
| The library (`TYPE`, `OP`): fonts, pictures, pointer, roster | `$7500`-`$8B4C`; fonts `$C000`-`$C7FF` |
| The front end's BASIC, `BEGIN` | `$0801`-`$6609` |
| The base's BASIC, `E` | `$0801`-`$64F8` |
| The debriefing's BASIC, `B` | `$0801`-`$1831` |
| Side 2's loader BASIC, `6`, and its helpers | `$0801`-`$1013`; `$8000`-`$80E2` |

Conventions the flight's code keeps:

- An angle is a byte, 256 to a turn: the sine table at `$C600` takes it
  whole, and the arctangent at `$C700` gives one.
- A position on the map is a word, 4096 to a square of the 16 by 16
  map: the high byte counts sixteenths of a square, so a square's column
  is the high byte, plus 8, over 16 (the debriefing's line 106). A unit's
  square in `$5200` is the row and the column in a nibble each.
- Units 0-5 are the helicopter, the chaff, the flares, two unused and
  the Hind; the ground units start at 6. A unit's type byte holds its
  kind in bits 0-3, seen in bit 4, friendly in bit 5, and a secondary
  or primary target in bits 6 and 7; 0 once it is destroyed.
- The main loop calls the engine through the jump table at `$8100`,
  three bytes an entry; a comment that names `$81xx` means the routine
  that entry jumps to.
- The window and the panel are double-buffered: the code draws in one
  bitmap while the VIC shows the other, and `$910C` holds the VIC's
  settings for each. A raster interrupt at line `$9A` switches the VIC
  to bank 3 for the panel; one at line `$FB` switches it back.
- The damage word is `zpa_74`-`zpa_75`: bits 0-13, one for each damage
  lamp.
- No routine takes its arguments from the bytes after its call.

## Timing

The flight runs on raster interrupts, PAL, 50 frames a second.
`irq_bottom` (`$9206`) runs once a frame at line `$FB`, below the
picture: it reads the fire button, shows the window's finished buffer,
sets the window's sprites, and steps the sound effects (`sound_step`)
and the keyboard (`keyboard`). `irq_split` (`$94B8`) at line `$9A`
switches the VIC to bank 3 for the panel. On a C128 `engine_on`
(`$9110`) adds `irq_c128` (`$948F`) at line `$32`, and the engine runs
at 2 MHz from line 251 to line 50, outside the picture.

The main loop (`main_loop`, `$3118`) is not tied to the frame: one pass
moves everything and draws one frame of the 3D view into the hidden
buffer. The pass counter `zpa_6A`-`zpa_6B` is the flight's clock, and
timers such as the chaff's and the flares' count passes, not frames.

## Controls

During a flight (`$332E`-`$3500`, `keyboard` at `$A8D8`):

| Key | Effect |
|---|---|
| Joystick, port 2 | the cyclic: up and down in `zpa_7A`, left and right in `zpa_84` (`joystick`, `$E40C`) |
| Fire | the chosen weapon, only with the CRT on the target view (`$3D60`); on the map or a message with a target picked it moves the CRT on |
| F1, F3, F5, F7 | the collective by +4, +1, -1, -4, kept between 0 and 42 |
| 1, 2 | start and stop engines 1 and 2, while there is fuel and the engine is not damaged |
| 3 | engage and free the rotor's clutch |
| 4, 5, 6, 7 | choose the Sidewinders, the FFARs, the Hellfires, the cannon |
| 9, - | chaff, a flare |
| RETURN | stop the turn |
| SPACE | step the CRT on to its next display (`crt_next`, `$9CCD`) |
| Right SHIFT | ask for the next target |
| HOME, £, DEL | look ahead, and to the two sides |
| Z | the big map; ← on it toggles fast motion |
| C=, left SHIFT | the stores and the damage pictures, loaded from side 2 |
| RUN/STOP | pause |
| RUN/STOP with RESTORE | abort the flight (`nmi`, `$91EF`, puts the key in the buffer with bit 7 set) |

The joystick reads nothing unless the high bytes of CIA 2's timers A and
B are `$7D` to `$80` apart (`$E423`), the gap the library set on side 1.

## Graphics

The cockpit is a multicolour bitmap in two halves, each double-buffered.
The window, rows 0-12, is at `$4000` or `$6000` in VIC bank 1 with its
screen at `$7C00`; the panel, rows 13-24, is at `$C000` or `$E000` in
bank 3 with its screen at `$EC00`. `$910C` holds the four `$D018`
values. The 3D view fills the window's rows 1-12, columns 4-35, and is
drawn afresh into the hidden buffer every pass (`draw_view`, `$8451`):
the horizon from the roll and the pitch, the sky filled down to it,
then the objects of the nine squares round the eye, the ground's first
and the units after them, then the Hind and the missiles, as edges
between projected points.

The big map (`draw_map`, `$9685`; `change_view`, `$9614`) is a
character screen at `$E800` with the map font at `$C800`: the middle
12 by 12 of the theatre's 16 by 16 squares (columns and rows 2 to 13),
each three characters by two, filling screen columns 2-37 and rows 0-23,
and a character for each unit the helicopter has seen. Missiles in flight, explosions, launches, the
cannon's tracer, the sight and the target's box are sprites.

## Mechanics

- **Hits on the helicopter** (`hit_helicopter`, `$5AE5`): a random 0-15
  against the attacker's chance at `$5ADD` (by its attributes: 4 in 16,
  8 in 16, always, 8 in 16, then always), then the pass counter's low
  two bits against `zpa_4C`, which `G2` sets from the mission block: 0
  in training, and the style plus 1 on a mission (`BEGIN` line 720). So
  in training nothing ever hits, and of the shots that pass the first
  test a quarter hit on regular missions, a half on volunteer missions
  and three quarters on hazardous duty (in the simulator on the flight's snapshot:
  0, 50, 100 and 150 of 200 calls). A hit sets a random bit of the
  damage word `zpa_74`-`zpa_75`; more than 7 less `zpa_4C` hits stop
  both engines.
- **Damage** is fourteen bits, one for each lamp along the canopy
  (`damage_lamps`, `$5B94`): among them the engines (bits 2 and 3), the
  forward avionics (bit 4, all seven bars read nothing), the nose optics
  (bit 6, the CRT changes display by itself), the flare launcher (bit 7),
  the gun (bit 12) and the chaff launcher (bit 13).
- **Missiles against ground units** (`$B5A4`, `$B2F1`): each unit kind
  falls to one missile kind only, the FFAR, the Hellfire or the
  Sidewinder; a missile of another kind that hits it does nothing. The
  check compares the missile's guidance flags with those `$AE12` gives
  the unit's missile kind. The Hind, unit 5, skips it and falls to any
  missile (`$B309`). Only kinds 14 and 15 are given the Sidewinder, and
  no unit in the five theatres' files is of either.
- **The cannon** (`$3D60`) hits when a random fraction of its range is
  beyond the target's distance; the range shrinks with a worse aim,
  with the style and with the gun damaged.
- **Ground units** take a turn each (`unit_turn`, `$5400`); their
  attributes by type at `$53A8` give the weapon, how far they see, and
  radar.
- **Missions** (`check_missions`, `$7047`): a target is done when as many
  of its listed units as its record's first byte says are destroyed
  (`$53E0` the primary, `$53EC` the secondary). `$7043` keeps the done
  bits. Once in 256 passes with the Hind up and no mission done, the
  primary and secondary targets swap (`$5974`).
- **Fuel** (`$5920`-`$5973`): each pass both tanks, `zpa_70` and
  `zpa_72`, lose the burn in `zpa_A0`, more with a tank hit. With both
  empty both engines stop (`main_loop`).

## Data tables

- `sine` (`$C600`): 256 entries, the size of the sine of each angle of
  256 to a turn.
- `arctangent` (`$C700`): for each n from 0 to 255, the angle whose
  tangent is n/64, in 256ths of a turn; checked against atan(n/64)×128/π.
- `reciprocals` (`$C580`): 32768 divided by each number from 128 to 255,
  less one.
- The shapes (`$1E9F`-`$3053`): one record each, its points, faces and
  edges; a target's shape is followed by a name byte N, and the target
  view prints message N + 11.
- The messages (`$79B3`-`$7BD4`, addresses at `$7B04` and `$7B26`, 33 of
  them): letters in the map font's codes, 1-26 for A-Z, `$1F` a space,
  bit 7 to start a line, `$FF` to end.

## Sound

Ten sound effects (`sound_effects`, `$EC00`), played once a frame by
`sound_step` (`$9A39`): each is a list of three-byte entries, the frame
it is due in, a SID register and the value written there; a frame with
bit 7 set starts a slide, which adds a step to one register each frame.
Effect 0 is never asked for.

Under the effects, the main loop keeps two voices going every pass
(`$3BBD`): voice 2's frequency is the rotor's speed and its pulse width
follows the height; voice 3, the engines' whine, follows the speed while
an engine runs. Apart from the effects and these two voices, the
flight's code writes only the SID's volume. The title plays the opening of Wagner's Ride of the Valkyries
(`tune_play`, `$8E89` in the title part).

## The listing's error rate

One sample, seed 20261031, drawn in two strata from the 2048 line
comments of the eight parts (`work/reports/draw.py`): 60 of the 1777
written by hand and 20 of the 271 written by scripts from the bytes (the
flight's terrain records and shapes, its panel bitmap rows and its CRT
messages). A checker on claude-opus-5-5 that wrote none of them, briefed
with `kit/skills/core/60-verify/checker.md`, marked 14 wrong in a detail
and one unverifiable. All 14 were confirmed against the code, and the
unverifiable one, the C128 interrupt's line `$32`, was confirmed from the
flight engine as it loads, before `engine_on` patches it. One comment it
passed, `$5105`'s "the Hind's x square", was also wrong: its brief gave the
same wrong unit for a unit's position, the high byte of x as a map square
where it is a sixteenth of one. So 15 of the 80 were wrong: 10 of the 60
handwritten and 5 of the 20 generated, 19 % plain and 18 % weighted by the
strata's sizes (95 % interval about 9 % to 26 %). A checker misses some
wrong comments, so the true rate is likely higher. The sample is over the
mark of 2 in 60.

The handwritten ones were wrong in a detail of the code: an instruction
counted from the wrong end (`$CD6D`), the height changing by the whole
vertical speed where it takes a quarter, and the lift named where a part
of it is meant (`$3931`), a copy one byte off (`$78C9`), the eye's square
said to be the view's second square in every direction where that holds for
one eighth of the compass only (`$8270`), a table of signed steps read as a
row and a column in a nibble each (`$82D9`), sixteen directions called
octants (`$AF1A`), a flag that callers also set (`$C3A3`), tables said to
be set at run time that nothing writes (`$76FA` in the library), the other
buffer's page where the code takes this one's (`$8520` in the title), and
the unit of the units' positions. The generated ones came from four
templates: a far view's lines said to run between all its points where
the centre is on none (`$2685`, `$2713`), edges counted without saying they
were dots (`$278D`), a terrain object's point measured from the square's
corner where it is its centre (`$2BD6`), and the map font's `$2E` read as
a full stop where it draws an exclamation mark (`$7AB0`). All 15 were
corrected, with every other comment in the eight parts that said the same:
53 comments in all, counting the 15. The others are the other 17 terrain
objects, two more far views and two more dotted shapes, the other three
messages with a `$2E`, six more comments that gave a unit's x or y as a
square, `$B3BE` and `$B512`'s octants, `$82C9` and `$82D1` beside the view's
squares, the message printer's font address and digit codes (three
comments), and the interrupt line's patch at `$9239`, which had the C64 and
the C128 the wrong way round.

## Live tests

Run in VICE (x64sc, through `kit/c64/tools.py`) on 31 October 2026,
from `parts/flight/work/play-flying-we.vsf` unless named.

| Test | Result |
|---|---|
| Hold the joystick left with CIA 2's timers as the game left them (high bytes `$48` and `$C9`, `$7F` apart) | `zpa_84` reads `$FF`, left |
| The same with CIA 2's timer B stopped (`$DD0F` = 0), so the gap drifts out of `$7D`-`$80` | `zpa_84` stays 0 with the stick held: the gate at `$E423` |
| Fly 6 seconds as the snapshot left the helicopter | the fore and aft tanks (`zpa_70`, `zpa_72`) fall by 126 each |
| The same after `POKE 22840,5:POKE 22885,5` | both tanks unchanged |
| The same after the C64-Wiki's `POKE 22837,5:POKE 22882,5` | the tanks fall by 136 and 339 |
| `use_store` (`$5A25`) called five times with X = 0, in the simulator (`kit/cpu/cpu6502.js`) | the cannon's rounds at `$53D8` go from 60 to 55; with the wiki's `POKE 23082,189` they stay at 60 |
| `G2`'s bytes (`$0801`-`$0E74`) put into a freshly reset C64 and `LIST`ed | nothing of line 0 is left on the screen and the listing stops at once with `?SYNTAX  ERROR`: the five DELs rub out "0 REM" and the shifted L stops it |
| Fire pressed ten times with the CRT on the map, no target picked | no round is used: the cannon fires only with the CRT on the target view (`$3D60`) |
