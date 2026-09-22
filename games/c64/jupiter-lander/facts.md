# Jupiter Lander — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/play-inflight.vsf`, the snapshot named in
`orientation.md`.

Every routine and table named here carries a full description in
`symbols.json`; this file is the overview.

## Build

The engine identifies itself only on its instruction screen, at `$E9C5`
and `$E9E0`: **`COPYRIGHT 1982 BY COMMODORE AND HAL LABORATORY`**. There is
no version string anywhere in the image. The analysed copy is the Remember
crack of the cartridge, release #213; the crack's own documentation screen
dates the game 1981, the game itself says 1982.

## Memory layout

| Thing | Where |
|---|---|
| 64 KB RAM image in a ROM-free snapshot | file offset **209**, verbatim except `$0000`/`$0001` |
| Variables | `$0002`–`$0032`, 49 bytes, all of them |
| Screen | `$0400`–`$07E7`, sprite pointers `$07F8`–`$07FB` |
| Character set, 128 glyphs | `$3800`–`$3BFF` |
| Sprite shapes, 16 slots | `$3C00`–`$3FFF`, the upper half of the same 2 KB block |
| Engine code and data | `$E000`–`$F450` |
| Unused | `$F451`–`$FFF9`, all zero |
| CPU vectors | `$FFFA`: NMI `$E037`, RESET `$E037`, IRQ `$EB39` |

Processor port `$01` is `$05` (`reset_entry`, `$E065`): RAM under BASIC and
under the KERNAL, I/O visible. The KERNAL is switched out during reset and
never switched back, so the game's own code lives where the KERNAL was.

`$D018` is `$1E` and CIA2 port A selects VIC bank 0, so the screen is at
`$0400` and the character base at `$3800`. The character set and the sprite
shapes share one 2 KB block: glyphs `$00`–`$7F` fill `$3800`–`$3BFF` and
sprite slots `$F0`–`$FF` fill `$3C00`–`$3FFF`. Nothing on any screen selects
a glyph above `$7F`.

## Timing

**There is no frame sync and no interrupt during play.** No raster interrupt
is enabled (`$D01A` is zero in `vic_init_table`). The single `cli` in the
whole game is in `attract_entry` (`$E7A9`) and `start_game` (`$E093`) begins
with `sei`, so CIA1 timer A drives `irq_tick` only while the attract
sequence is running. During a game the machine runs with interrupts masked.

The clock is a counting loop. `delay_one_unit` (`$EE45`) is ten passes of a
200-step countdown, about 10,100 cycles or **10.3 ms on a PAL machine**.
`main_loop` waits three of them per pass.

| Thing | Delay units | PAL seconds |
|---|---|---|
| One flight update | 3 | 0.031 |
| One point of the landing bonus | 2 | 0.021 |
| Pause after an explosion | 200 | 2.1 |
| Pause after the bonus is counted | 150 | 1.5 |
| GAME OVER on screen | 256 | 2.6 |
| One note of the opening tune | from `tune_intro` | |

*Live:* checkpoint counts over a 1.2 s window of flight gave 35 `main_loop`
passes and 106 `delay_one_unit` calls, **3.03 units per pass**, 29 passes a
second with the emulator running slightly under 1x.

Because the clock is a cycle count and not the raster, the game runs about
four per cent faster on NTSC.

## Controls

`read_controls` (`$EB6F`) is the whole input system. It reads joystick
port 1 first with every keyboard row driven high, debouncing by reading
`$DC01` twice until two reads agree. Only if the stick is completely idle
does it scan the keyboard, and then only three keys.

| Input | CIA1 | Sets | Effect |
|---|---|---|---|
| Joystick 1 left | `$DC01` bit 2 | `thrust_side` = 1 | X velocity **+6** |
| Joystick 1 right | `$DC01` bit 3 | `thrust_side` = 2 | X velocity **−6** |
| Joystick 1 fire | `$DC01` bit 4 | `thrust_up` = 1 | Y velocity **−12** |
| **A** | row 1 (`$DC00`=`$FD`), bit 2 | `thrust_side` = 1 | X velocity **+6** |
| **D** | row 2 (`$DC00`=`$FB`), bit 2 | `thrust_side` = 2 | X velocity **−6** |
| **F1** | row 0 (`$DC00`=`$FE`), bit 4 | `thrust_up` = 1 | Y velocity **−12** |

F1 and the port 1 fire button are the same bit of the same register, which
is why the instruction screen prints `F1-FIRE` as one label and why either
one starts a game from the attract screen.

**A moves the ship right and D moves it left.** The labels name the
thruster that fires, not the direction of travel. *Live:* with A held for
25 passes the world X went 336 → 340; with D held it went 336 → 333.

D is tested after A, so holding both thrusts right-to-left.

## Physics

All of `move_ship` (`$E2CB`). Positions are 24-bit (a fraction byte plus
16 bits of world units), velocities are signed 16-bit in 1/256 world units
per pass.

| Quantity | Value | Fuel cost per pass |
|---|---|---|
| Gravity | `grav`, 4 to 9 | none |
| Main thruster | Y velocity −12 | 111 |
| Side thruster | X velocity ±6 | 30 |

Gravity is added every pass whether or not the thruster is firing, so the
main thruster nets −8 per pass on the first landing and −3 on the hardest.
Nothing damps either velocity: sideways speed has to be cancelled by the
opposite thruster.

*Live:* over 10 passes with the first lander's gravity of 4, the Y velocity
changed by +40 with no thrust, −80 with F1 held, and the fuel fell by
exactly 1110 with F1 held and 300 with A or D held.

`gravity_table` (`$E0DE`), indexed by the landing number and capped at 16:

| Landing | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gravity | 4 | 5 | 4 | 5 | 6 | 5 | 6 | 6 | 6 | 7 | 8 | 7 | 7 | 8 | 9 | 9 |

*Live:* read back from `$E0DE` and confirmed against the per-pass change in
Y velocity for each value.

## The world and the four views

The world is about 530 units wide. `zone_for_position` (`$E1C4`) decides
which of four pictures is on screen, testing in this order:

| View | Condition | Shows |
|---|---|---|
| 1 | Y ≥ `$0114` and X < `$0140` | close-up of the x5 pad |
| 2 | `$0110` ≤ X < `$01D8` and Y ≥ `$0074` | close-up of the x2 plateau |
| 3 | X ≥ `$0140` and Y ≥ `$0114` | close-up of the x10 pad |
| 0 | anything else | the pulled-back view of the whole canyon |

**The zoom is not a scale factor on the terrain.** Each view has its own
picture. In the wide view the ship's world coordinates are simply halved
(`update_view_and_sprites`, `$E18C`) and the sprite is drawn at its normal
24×21 pixels. In a close-up the view's origin is subtracted at full scale
(`view_origin_x_lo`/`_hi`/`view_origin_y`, `$E1BB`) and `$D017` and `$D01D`
are set to `$0E`, doubling sprites 1, 2 and 3 in both directions. The same
sprite data serves both.

## The landing pads

`check_on_pad` (`$E3B5`) against the tables at `$E3E7`–`$E3F8`:

| Pad | World Y | World X range | Multiplier |
|---|---|---|---|
| x5 (left) | `$016A` | `$00B0`–`$00E0` | 5 |
| x2 (middle plateau) | `$009A` | `$0160`–`$0190` | 2 |
| x10 (right) | `$017A` | `$01E0`–`$0200` | 10 |

**The Y test is an exact match, not a range.** A pad is one line in the
world. A ship whose Y velocity exceeds 256 (one world unit per pass) can
step straight over that line; it then has its legs inside rock and the VIC's
sprite-to-background collision destroys it instead.

## Landing and scoring

`touchdown` (`$E55C`):

- Climbing (Y velocity high byte negative) is **always** accepted.
- Descending is accepted only while the Y velocity is below `$0048` (72).
- Anything faster prints SORRY NO BONUS and destroys the ship.

The bonus is `80 − (Y velocity low byte)`, then `×2` for the x2 and x10
pads and `×5` again for the x5 and x10 pads, so the multipliers are 5, 2
and 10 exactly as painted beside the pads. A perfect stop on the x10 pad is
800 points.

Everything the player sees is ten times the number the game counts. The
status line prints four BCD digits followed by a fixed `0` from
`hud_text_template`, and `draw_bonus_line` appends a `0` to both numbers in
the sum. 800 points displays as 8000.

*Live, by breaking at `touchdown` and setting the velocity:*

| Y velocity | Result |
|---|---|
| 0 | lands, `800 X 10= 8000` on the x10 pad, `800 X  5= 4000` on x5, `800 X  2= 1600` on x2 |
| 32 | lands, `480 X 10= 4800` |
| 71 | lands, ` 90 X 10=  900` |
| **72** | **SORRY NO BONUS** |
| −16 (climbing) | lands, `960 X 10= 9600` |

**A ship that arrives climbing would score more than a perfect stop, but
only when poked.** The subtraction is an ordinary 8-bit one, so a velocity
of −16 leaves `$F0` in the low byte and `$50 − $F0` is 96, not 80. The
doubling for the x2 and x10 pads is 8-bit as well: `asl` at `$E58C` drops
its carry before the ×5, so the routine's ceiling is 1275 on the x5 pad
(velocity low byte `$51`), 1270 on x10 and 254 on x2. None of that is
reachable in play. `main_loop` runs `check_on_pad` before `move_ship`, so
the velocity `touchdown` sees is the one that just carried the ship onto the
pad's line; arriving there from above means it was positive. Arriving with a
negative velocity means the ship was below the line, which on the x5 and x10
pads is inside rock, and the collision test runs first. The one geometric
loophole is the x2 plateau, which has open air beside it at its own height:
a ship hovering on exactly world Y `$009A` at `$0110` ≤ X < `$0160`, drifting
right while its velocity high byte is negative, would meet the test on the
pass its X reaches `$0160`. *Traced, not observed live;* it is a
pixel-perfect hover, and even the routine's x2 ceiling of 254 is below a
perfect stop on x10.

Each point counted out adds 70 to the fuel as well as 1 to the score, and
the addition stops rather than wrapping when it would pass `$FFFF`.

## Fuel

16-bit at `fuel_lo`/`fuel_hi`, full at `$FFFF`. The bar on the status line
is drawn from the high byte alone by `draw_fuel_bar` (`$EBD6`): the top five
bits give whole solid cells and the bottom three pick one of the eight
part-width glyphs `$10`–`$17`, so the bar moves in eighths of a character.

**The last 255 units can never be spent.** `move_ship` clears both thrust
flags when the fuel high byte is zero, which is the same test that puts
OUT OF FUEL on screen. *Live:* with fuel `$01FF` and F1 held the Y velocity
fell and the tank dropped to `$00B2`; with fuel `$00FF` and F1 held the ship
accelerated downward at the gravity rate and the tank did not move at all.

Running out of fuel does not end the game. Control is gone, but the game
ends only when the ship hits something with an empty tank (`explode`,
`$E4C7`).

A crash costs fuel as well as a lander: the impact speed shifted right by
four is taken off the fuel **high** byte, which is up to 7936 units.
*Live:* impact at `$0100` cost `$1000`, at `$0080` cost `$0800`, and both
`$0200` and `$0300` cost `$1F00` because the penalty is clamped at 31 high
bytes.

## The velocity gauge

`draw_velocity_gauge` (`$EC01`) and `draw_hud` (`$ED7C`). Screen column 39,
green from row 2 to row 20, labelled `10` at row 4, `±0` straddling rows 11
and 12 and `-10` at row 19, with `m/s` above it.

The marker position is `((Y velocity >> 2) + 128) >> 1`, a number from 0 to
127. The top four bits pick one of sixteen rows from `gauge_row_addr`, rows
4 to 19; the bottom three pick one of eight marker glyphs `$18`–`$1F`, so
the needle has 128 positions. If the Y velocity leaves the range −512 to
+511 no marker is drawn at all. The routine writes screen memory only, never
colour memory, so the marker cell keeps its row's colour: the needle is a
one-pixel black line across a green cell, or across the yellow one.

**There is exactly one yellow cell, at screen row 12.** It covers Y velocities 0
to 63. The landing test accepts everything up to 71.

| Y velocity | Gauge value | Marker |
|---|---|---|
| −256 | 32 | row 8 |
| −8 | 63 | row 11, position 7 |
| 0 to 7 | 64 | row 12, position 0, the yellow cell |
| 56 to 63 | 71 | row 12, position 7, still the yellow cell |
| **64 to 71 (lands)** | **72** | **row 13, position 0** |
| **72 to 79 (rejected)** | **73** | **row 13, position 1** |
| 128 | 80 | row 14, position 0 |

The needle moves in steps of 8 velocity units, so the last speed that lands and
the first that does not are one step apart: one eighth of a character, a single
pixel. Both sit below the yellow cell.

The instructions say the velocity must be inside the yellow area. The code
accepts 8 units more than the yellow cell covers, and accepts every upward
velocity, which is the whole green band above it.

*Live:* the marker row and position were read out of screen column 39 for 13
velocities poked into `ship_vy_lo`/`_hi`. The measurement is taken one gravity
tick after the poke, because the gauge is drawn in the pass that follows; with
that tick subtracted, all 13 reproduce the arithmetic above exactly.

## Graphics

Nothing moves except sprites. The terrain is characters and is redrawn
only when the view changes.

| Sprite | Shape | Colour | When |
|---|---|---|---|
| 1 | `$F0` lander, `$F1`–`$F7` explosion frames | cyan | always |
| 2 | `$F8`/`$F9` main thruster flame, alternating every pass | red | main thruster held |
| 3 | `$FA` left jet / `$FB` right jet | orange | side thruster held |

`place_sprites` (`$E3F9`) counts 1, 3, 5 or 7 into X and doubles it into
`$D015`, giving masks `$02`, `$06`, `$0A` and `$0E`. All three sprites share
one position, so the flames are stacked on the hull rather than placed.

The explosion is the lander itself: `explode` (`$E44B`) increments the
sprite 1 pointer seven times from `$F0`, and `flash_explosion_colour` steps
the sprite colour by 2 modulo 16 four times between frames.

## Level data

Each of the four views is a run-length stream of (count, character) pairs,
laid out 38 cells per row for 23 rows by `draw_terrain` (`$EC72`).

| View | Stream | Bytes | Runs |
|---|---|---|---|
| 0, wide | `$EEB8`–`$F00C` | 341 | 170 |
| 1, x5 close-up | `$F00D`–`$F0D1` | 197 | 98 |
| 2, x2 close-up | `$F0D2`–`$F17A` | 169 | 84 |
| 3, x10 close-up | `$F17B`–`$F253` | 217 | 108 |

924 bytes for 3496 cells. Columns 38 and 39 are never written by the
terrain painter; they belong to the velocity gauge. Colour is decided by
the character alone: every non-blank cell is red.

All four streams decode to exactly 23 rows and each one ends exactly where
the next begins, which is what confirms the format.

**A Commodore badge is cut into the rock in all four views**, drawn from
glyphs `$0C`–`$0F`. It is part of the terrain data, not an overlay.

## Sound

Three voices, set up once by `sid_init_table` (`$E01E`) and never
reconfigured except for the thruster and explosion.

| Voice | Waveform | Used for |
|---|---|---|
| 1 | pulse, sustain 13 | the three tunes, and the tick of the bonus count |
| 2 | noise, fast attack | side thrusters, gated on and off by `move_ship` |
| 3 | noise, long release | main thruster (`$0900`) and the explosion (`$0700`) |

The tunes are stored as raw SID frequency words:

| Tune | Where | Format | Played by |
|---|---|---|---|
| Opening | `$E216` | 44 × (delay, frequency low, frequency high) | `play_intro_tune`, once per game |
| Landing | `$E6BE` | 31 × (low, high), 14 delay units apart | `touchdown` |
| Crash | `$E658` | 44 × (low, high), 8 delay units apart | `landing_too_fast` |

The gate is opened once at the start of a tune and closed at the end, so a
repeated pitch runs into the one before it instead of being re-struck.

## Text

The character set is laid out as **ASCII**, not as C64 screen codes: space
is `$00`, digits are at `$30`–`$39`, capitals at `$41`–`$5A`. There are no
lower-case letters. Where ASCII has brackets, the set has the five marks the
game needs:

| Code | `$5B` | `$5C` | `$5D` | `$5E` | `$5F` |
|---|---|---|---|---|---|
| Glyph | `<` | `,` | `>` | `.` | `-` |

Everything else is a picture. The multiplier labels beside the pads are
dedicated small glyphs `$02`–`$06` rather than letters, and the Commodore
wordmark under the title is 21 one-off glyphs `$64`–`$7E` laid out in three
rows, which is the only lower-case lettering in the game.

The strings, all of them:

| Where | Text |
|---|---|
| `$E528` | `OUT OF SKY` |
| `$E553` | `GAME OVER` |
| `$E6AE` | `SORRY NO BONUS` |
| `$E874`–`$E9F1` | the whole instruction screen, 382 characters in 15 pieces |
| `$ED2C` | the two status rows |
| `$EEAD` | `OUT OF FUEL` |

## Flight-ending conditions

| Condition | Where | What happens |
|---|---|---|
| Sprite 1 touches rock | `main_loop`, `$D01F` bit 1 | explosion, fuel penalty, new lander |
| Lands faster than `$0048` | `touchdown` | SORRY NO BONUS, then explosion |
| Lands within the limit | `touchdown` | bonus counted out, refuel, next landing |
| Climbs above world Y `$003A` | `main_loop`, `$E15E` | OUT OF SKY, no explosion, new lander |
| Fuel high byte hits zero | `check_out_of_fuel` | OUT OF FUEL, engines dead, game ends at the next impact |

## Live tests

| Test | Method | Result |
|---|---|---|
| Main-loop rate | checkpoint hit counts over 1.2 s of flight | 3.03 delay units per pass, 29 passes/s |
| Interrupt during play | checkpoint on `$EB39` over 5 s of play | 0 hits while `main_loop` ran 61 times |
| Gravity | `grav` poked, Y velocity sampled over 8 passes | change per pass equals `grav` for 4 to 9 |
| Thrust and fuel | keys held, state sampled over 10 passes | −8 vy and −111 fuel (F1), ±6 vx and −30 fuel (A/D) |
| Direction of A and D | world X over 25 passes | A moves right, D moves left |
| Landing limit | break at `touchdown`, poke Y velocity | 71 lands, 72 prints SORRY NO BONUS |
| Multipliers | ship placed in each zone, `touchdown` entered | 5, 2 and 10 as painted |
| Climbing landing | Y velocity −16 at `touchdown` | `960 X 10= 9600`, higher than a perfect stop |
| Crash fuel penalty | break at `explode`, poke Y velocity | speed >> 4 off the high byte, clamped at 31 |
| Empty-tank cut-off | fuel `$00FF` vs `$01FF`, F1 held | no thrust and no spend below a high byte of 1 |
| Gauge mapping | poke Y velocity, read the marker out of screen column 39 | one yellow cell at row 12, covering 0 to 63; 13 points reproduce the arithmetic |
| Terrain format | all four streams decoded offline and rendered | 23 rows each, boundaries meet exactly |

Not tested live: the joystick path. `vice_joystick_set` and
`vice_joystick_tap` change nothing at `$DC00`/`$DC01` in this build, so the
joystick reading in `read_controls` is traced in the code but has not been
observed working. See `kit-feedback.md`.
