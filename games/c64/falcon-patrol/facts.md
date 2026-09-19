# Falcon Patrol — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The analysed image is the Remember crack, "Falcon Patrol +5 and
Highscoresaver 100%", booted with the high-score saver and **no**
trainers. The original game is Virgin Games, 1983, written by Steve Lee.
Everything below is true of this build; where the crack may have changed
the original it is said so.

Machine: C64 (`C64SC` in VICE), **PAL**. Processor port `$01` stays at
`$37` throughout: BASIC ROM, I/O and KERNAL ROM are all banked in and the
game plays no banking tricks. *(live)*

## Memory layout

| Thing | Where |
|---|---|
| Screen RAM | `$0400`–`$07E7`, VIC bank 0 (`$DD00` = `$C7`, `$D018` = `$1D`) |
| Sprite pointers | `$07F8`–`$07FF` |
| Stored copy of the title screen | `$0843`, 1000 bytes, stamped onto `$0400` when the title is shown |
| High-score name buffer | `$0AB4`, up to 12 characters |
| Player sprite frames | `$20C0` upwards (sprite block `$83`+) |
| Character generator | `$3000`–`$37FF`, 256 glyphs |
| Main loop and frame pace | `$41C0` |
| Raster interrupt and its installer | `$4AC0` and `$4B20` |
| High-score name entry | `$4CE2` |
| In-game input read | `$5700`, called from `$419A` |

The game's whole footprint is about 12.5 KB of tracked bytes spread over
`$0000`–`$6FFF`, with a little under the KERNAL.

## Timing

**The tick is CIA2 Timer B, not the raster and not the frame.** The main
loop at `$41C0` spins on `lda $DD07 / cmp #$7F` until the timer's high
byte matches. The raster interrupt does nothing but repaint the colour
split. Any rate derived from "one frame" would be wrong. *(live: sampled
the program counter repeatedly and found it parked at `$41C5`)*

The raster interrupt at `$4AC0` fires **three times per frame**, measured
live at 151 Hz on PAL by a non-stopping checkpoint (302 hits in 2 s, 604
in 4 s). It sets up bands at raster lines `$01`, `$8A` and `$D2`, chained
through the state byte `$B0`.

Every CIA1 interrupt source is disabled at `$4B32` (`$DC0D` = `$7F`), so
the KERNAL's own timer interrupt does not run while the game does. A
consequence that misleads: `$00A0`–`$00A2`, the KERNAL jiffy clock, is
repurposed by the game and **counts down**, about one per second. *(live)*

## Controls

The game reads **control port 1** at `$DC01`. Port 1 shares that port with
the keyboard columns, so the game parks `$DC00` at `$7F` — permanently
selecting keyboard row 7 — and takes both the joystick and its keyboard
controls from a single read. Every key the wiki documents (`←`, `1`,
`CTRL`, `2`, space) lies in that one row. *(live)*

Bits in the read, active low: 0 up, 1 down, 2 left, 3 right, 4 fire.

The byte is stored at `$0C` and then **forged**. `$0C` is not the
joystick; it is what the game has decided the pilot did:

| At | Condition | What is written into `$0C` |
|---|---|---|
| `$5705` | sprite 0 Y < `$30` | up bit **set**: climb reads as released. A ceiling |
| `$5718` | sprite 0 Y ≥ `$BF` | down bit set: dive reads as released. A floor |
| `$5724` | sprite 0 Y ≥ `$7C` | fire bit set: **firing is disabled at low altitude** |
| `$5731` | `flight_flags` bit 1 | `$FE` — up held, nothing else. Automatic take-off |
| `$573D` | `flight_flags` bit 3 or 7 | `$FD` — down held. Automatic descent |
| `$5754` | bit 3 **and** `$07F8` ≥ `$88` | `$FF`, and both velocities zeroed. Touchdown |

Turning: `$54A8` steps the horizontal velocity `$2A` by one per press,
clamped to `$FD`…`$03` (−3…+3), and only on one pass in eight of the
counter at `$2D`.

Zero-page variables named so far:

| Address | Name | Meaning |
|---|---|---|
| `$0C` | `input_byte` | the forged input byte |
| `$22` | `flight_flags` | bit 1 take-off, bit 3 landing, bit 7 ground contact |
| `$2A` | `vel_x` | horizontal velocity, −3…+3 |
| `$2B` | `vel_y` | vertical velocity |
| `$2D` | `tick_counter` | free-running; low bits select which update runs |
| `$B0` | `raster_band` | which raster band comes next |

## Graphics

**Screen RAM does not change during play.** Over a second and a half of
gameplay the only bytes that moved were in zero page, the stack, two bytes
of the status line and **inside the character generator**. Moving objects —
enemy aircraft, radar blips — are drawn by rewriting glyph bitmaps at
`$3000`, not by writing screen codes. *(live)*

Only **one hardware sprite** is normally on: `$D015` reads `$01` during
ordinary flight, briefly `$07`. The player's aircraft is sprite 0, fixed
at screen X = 172; the world moves around it. The sprite 0 pointer at
`$07F8` selects the aircraft's attitude frame and is itself read as state
by the touchdown test. *(live)*

Screen layout, decoded from the snapshot: rows 0–10 sky, rows 11–20
landscape, rows 21–24 the status panel — `SCORE` and `HI` on the left, the
radar in the centre, `GAS` and `AAM` on the right.

### The alphabet

The character set is in the game's own order, so a byte search in screen
codes or PETSCII finds nothing:

| Codes | Glyphs |
|---|---|
| `$00`–`$09` | digits `0`–`9`, index equal to the digit |
| `$20` | space |
| `$80` | `.` |
| `$81`–`$9A` | `A`–`Z` |
| `$9B` | `_` |
| `$9D` | `©` |

In other words a letter's code is its C64 screen code **plus `$80`**. The
remaining glyphs are landscape tiles, status-panel furniture and the
aircraft shapes drawn as characters.

Strings recovered with this table include `SCORE`, `GAS`, `AAM`, `HI`,
`PRESS FIRE TO START` (`$53D0`), the alphabet strip
`.ABCDEFGHIJKLMNOPQRSTUVWXYZ_` used by name entry, and
`©VIRGIN GAMES 1983  WRITTEN BY STEVE LEE`.

## Mechanics

The flight envelope is enforced entirely by rewriting the input byte, so
there is no separate "am I allowed to climb" test anywhere downstream.
Take-off, landing and the altitude limits are all the same mechanism.

## Data tables

Not yet surveyed. The largest undescribed run is `$3150`, 1776 bytes,
inside the character generator.

## Sound

SID voice control registers are written at `$4BD3`–`$4BE1` in the title
loop, and a filter sweep runs at `$4D4B` during name entry. Not yet
analysed further.

## Live tests

- Checkpoint hit count on `$4AC0`: 302 hits in 2 s, 604 in 4 s — three per
  PAL frame, so the raster split is real and running.
- Program counter sampled twelve times: always `$41C5`, the CIA2 Timer B
  spin — which is how the tick was identified.
- Load watchpoint on `$DC01` stopped at `$5703`, with a backtrace showing
  the call came from `$419A`. That is how the in-game input reader was
  found, after a byte search for `lda $DC01` had produced twelve
  candidates and checkpoints on all of them had reported nothing.
- Holding each input bit in turn and watching sprite 0's position: bit 0
  climbs. Horizontal control could not be exercised, because every state
  reached so far has the input overridden.
- `$00A0`–`$00A2` watched over 3 s: `$0010` → `$000D`, counting **down**,
  proving it is not the KERNAL clock.
- A snapshot restored into VICE comes back with CIA2 Timer B frozen
  (`$DD06/$DD07` stuck at `$31C4`), so the main loop never passes `$41C0`
  and the game appears to run — the raster interrupt still fires — while
  nothing at all advances. Live tests must boot from the disk.
