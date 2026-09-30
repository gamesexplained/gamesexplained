# Fist II: The Legend Continues — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/f2-entry.vsf`, the Adventure hand-over.

## Build

The Mindscape disk (`orientation.md`). The Adventure load fills memory
from `$0400` to `$FFF8`, the RAM under the I/O chips and the KERNAL
included. The game never switches the I/O out: `$01` is written only by
the loader and the start-up (`$C459`, `$C469`), and stays `$15` in play
(*live*). So only the video chip reads the RAM at `$D000`-`$DFFF`.

## Memory layout

| Thing | Where |
|---|---|
| Timer periods for the sample player | `$0200`-`$03FF`, copied from `$C700`/`$C800` (1 to 60,000) |
| Main entry | `$0402` `JMP $2101` |
| Game variables | `$0405`-`$0492`: scroll flags `$0405`-`$040C`, energy `$0412`/`$0413`, pause `$0416`, area `$046A`, screen `$046B`, maximum energy `$0485` |
| Rooms, exits, scenery drawing, move scripts, pose builder | `$055B`-`$20E0` |
| Game flow, fights, opponent, encounters, raster handlers, sample player | `$2101`-`$3F62` |
| Sprite multiplex planner | `$3F67`-`$4801` |
| Screen-to-area table, exits, item lists, scenery sets 0 and 1 | `$4A71`-`$63AB` |
| Scenery set 2, strike-reach tables | `$6DEE`-`$7FFF` |
| 229 packed fighter sprite frames | `$8000`-`$AF0F` |
| Move scripts, pose tables, frame addresses, mirror table | `$AF46`-`$BFFF` |
| Leftover loader, start-up, sprites | `$C000`-`$CBFF` |
| Play screen 2 and status band | `$CC00` |
| Play-area character sets A and B | `$D000`, `$D800` (RAM under I/O) |
| Character set, status-band font, sprites | `$E000`-`$EFFF` |
| Play screen 1 | `$F000` |
| Music driver and tunes | `$F400`-`$FFC9` |

## Timing and structure

- The game runs two tasks, each on its own stack: the main loop
  (`play_loop` `$21E2`) and a background task at `$12CA`-`$1540` that
  shifts the hidden screen one column at a time between coarse scroll
  steps. `$14E8`/`$1503` switch between them; the status-band interrupt
  reaches `$1503` when `$12CA` has overwritten its `RTI` at `$3D86` with
  a `NOP` (`$12E0` puts it back).
- The screen is double-buffered: `$74` holds `$CC` or `$F0` (*live*: both
  seen), and `$D018` is built from `$C0` OR `$1536` at `$3BFD`.
- Raster interrupts chain by rewriting `$FFFE`/`$FFFF`. `$3BD4` starts the
  play area and `$3D21` the status band; about thirteen more handlers are
  templates that move sprites 1-3 and 5-7 down the screen, their
  operands rewritten each frame by `$4049`-`$4877` (*live*: five handlers
  in one frame capture, which the page redraws pixel for pixel).
- RESTORE pauses: the NMI `$3C23` toggles `$0416` and `play_loop` waits at
  `$2201` (*live*).

## Controls

- Joystick port 2 (`$3396`); the move map at `$33C3` turns a joystick
  position, with and without fire, into a move, and `$33E3` says which
  moves are allowed from which.
- F5 restarts the game (`$2444`, keyboard row 0 reading `$BF`).
- RESTORE pauses (*live*).
- `read_joystick` also reads port 1 for fighter 1 when `$0455` is 0; no
  path to that was found.

## Fighters

- A fighter is nine hardware sprites. 44 move scripts (`$AF46`) are lists
  of 4-byte steps (time, pose, dx, dy); 73 poses (`$B210`) name a sprite
  frame for each of the nine slots.
- The 229 frames at `$8000`-`$AF0F` are zero-run packed: a non-zero byte is
  copied, `$00 n` writes n zeros, 63 bytes out. Frame *i* starts at `$8000`
  + `$B661`[*i*] × 256 + `$B57C`[*i*] (checked: frames 1, 2, 143 and 228).
- Frames are stored facing one way. The other way is drawn by reversing
  each row's three bytes and passing each through `$BF00`, which reverses
  the four pixel pairs of a byte (checked, all 256 entries).
- The fighters are drawn with up to seven screen-split layouts, chosen by
  the vertical gap between them (`$40F6`).
- Hits: `$379C` reads the strike reach for the move and animation frame
  from `$7CA6` (facing each other) or `$7E53` (same way); `$80` means no
  strike; otherwise the reach is compared with the fighters' separation.
  Collisions between sprites come from `$D01E` (`$3328`, `$3F99`).
- A hit landed by the hero scores 100 × the move's value in `$051D`.

## Energy, lives and scrolls

- The hero starts with 47 energy and maximum 47 (*live*); it comes back one
  point every 128 frames (`$2D14`). Meditating sets the maximum to 47 + 4 ×
  the opponents beaten (rounded down to even), at most 127 (`$396F`).
- An opponent starts with 31-63 energy, 64 more after 16 defeats
  (`$274E`; *live*: 63).
- Lives start at 1 (*live*), gain one for each scroll delivered to its
  chamber (`$2CCD`) and lose one per death (`$353E`). The hero restarts in
  the last meditation chamber visited (`$2D33`).
- Meditation chambers are rooms `$44`-`$4B`, one per scroll. Scroll flags
  `$0405`-`$040C`: 1 found, `$80` delivered.
- In area 5 the screen flashes and the hero loses energy every 10 frames
  until he dies, unless scroll 8 has been delivered (`$2CE4`).
- Hazards cost 2 or 10 energy; an attack at its striking frame knocks one
  away (`$2A57`, `$2BB4`, `$2A87`).
- Encounters: 54 three-byte records at `$E609` (flags, room, position):
  opponents, hazards and scrolls lying in rooms.

## The world

- 123 screens, each in one of 48 areas (`$4A71`). Areas 0-7 use scenery
  set 0, 8-29 set 1, 30-47 set 2 (`$196F`, thresholds `$0E44` = 8,
  `$0E45` = 30; *live*: screen 94 area 28 at the start, screen 100 area 30
  at the first opponent). Each set has shapes of screen codes, composite
  objects, and per-area lists of objects (X, Y, type).
- Per-screen exit lists at `$4AEC`: type, trigger column, destination
  screen and column.
- A zone sets the tune, the border colour, sprite priority and scenery.

## Sound

- Music: a three-voice driver at `$F400`, called once a frame from
  `$3D21`. Three tunes, chosen by `$FF` (*live*: 3 in the jungle); tempo
  from `$F42F`; sequences of patterns; 17 instruments of 21 bytes with
  pulse-width sweeps, glide, vibrato and a filter sweep. The note table at
  `$F4C9` is one equal-tempered octave (*live* check of the ratios), doubled
  per octave; note lengths at `$F4D5`.
- Sampled sounds: a CIA 1 timer B interrupt (`$3D8B`) flips the SID
  volume between two levels, each sample byte choosing the time to the
  next flip through the period table at `$0200`/`$0300`. `play_sample`
  `$3DB8` starts one, with a rise, hold and fall.

## Hardware register census

| Register | Where |
|---|---|
| `$D000`-`$D010` | sprite positions, the multiplex planner `$4000`-`$47E2`, handlers |
| `$D011`, `$D012` | start-up, raster handlers |
| `$D015`-`$D01D` | start-up, fighters (`$2118`, `$2DB7`), zone priority `$D01B` |
| `$D018`, `$D016` | start-up; `$3BF2`-`$3C02`, `$3D4C` |
| `$D01E` | sprite-sprite collisions, read at `$3328`, `$3F99` |
| `$D020`-`$D026` | colours: start-up, `$1209`, `$3C1B`, `$3D41` |
| `$D400`-`$D417` | music driver `$F4F5`-`$F90x`, filter included |
| `$D418` | volume: music, and the sample player's flips at `$3D93` |
| `$D41B`, `$D41C` | voice 3 oscillator and envelope, read for pulse modulation |
| `$DC00`-`$DC03` | joystick and keyboard `$2446`-`$2453`, `$3393` |
| `$DC0D`, `$DC0F` | CIA 1 interrupts; timer B for samples |
| `$DD00`, `$DD0D` | VIC bank 3 at start-up; NMI source test |

## Towards a solution

Read from the game's tables, with the live tests named.

**Where the scrolls lie** (encounter records with flags `$60`-`$67` at
`$E609`; flags AND 7 is the scroll number, byte 2 the map position):

| Scroll | Room | Map position | Its chamber |
|---|---|---|---|
| 1 | 102 | 180 | room 68 (`$44`) |
| 2 | 91 | 152 | 69 |
| 3 | 114 | 110 | 70 |
| 4 | 84 | 124 | 71 |
| 5 | 107 | 143 | 72 |
| 6 | 110 | 140 | 73 |
| 7 | 118 | 212 | 74 |
| 8 | 44 | 175 | 75 |

**What each delivered scroll opens** (the code that tests `$0405`+n):

| Scroll | Opens | Where |
|---|---|---|
| 1 | barriers of type 3 (rooms 4, 21, 37, 39, 40, 53) can be broken | `$0A59`-`$0A6A` |
| 2 | a location action in room `$34` | `$372F`-`$373C` |
| 3 | leaving area 7 (room 76, on the way to the volcano) alive: without it energy is set to 0 | `$0649`-`$0660` |
| 4 | barriers of type 7 (rooms 79, 81) can be broken | `$0A44`-`$0A55` |
| 5 | the chain of opponents at an encounter ends early | `$27AD` |
| 6 | the exits of area 13 (room 79) | `$064C`-`$0677` |
| 7 | the colour scheme of one zone changes | `$10E5` |
| 8 | area 5 (rooms 64-67) stops draining the hero | `$2CE4` |

**The map.** Each of the 123 rooms has an exit list at `$4AEC`: type,
column, destination room, arrival column (read with `find_room_exits`
`$1A06`). Exits of types 9 and 10 are stairs down and up, taken with the
stick on the exit's column (*live*: rooms 100 → 101 → 102 → 103, each
arriving at the recorded column). Walls are the 2-byte records of the
room's item list (`$501E`); the hero stops at a wall's column plus
`$0AC7`[type] from the left and minus `$0ABD`[type] from the right
(`$087A`-`$08DF`; *live*: stopped at column 75 by the wall at 77 in room
101). Type-11 exits are holes: crossing one while walking centred on the
screen (`$92` = `$4E`, `$371D`) drops the hero to the room below
(*live*: room 103 column 52 falls through 102 into 101).

**The order.** A search over the exit lists, the walls and the gates
above finds that the scrolls can be delivered in the order 1, 4, 8, 2, 3,
6, 7, 5, and that room 122, the ending (`$2DB5`), is then reachable
through the volcano rooms 60-63, if the hole in room 103 can be crossed.
Every route from the start to scroll 1 in this model crosses that hole,
and every other part of the world is behind a type-3 barrier that needs
scroll 1. In testing, walking, jumping and kicking at the hole all fell
through it; how a player crosses it is not yet known. The order is
therefore not a verified solution.

## Open questions

- Two AI combinations: `$31F2` stores into `$B4` without `,X`, so
  combination 8 sets up combination 5 in the hero's slot.
- `$4A39` makes a negative step positive in place.
- Only voice 1 restarts its vibrato on a new note (`$F6F0`).
- 29 uncompressed head sprites at `$B746`-`$BEBF`, a character set at
  `$E000`-`$E607` and 1,200 bytes at `$E910` have no reader found.
- An older build's start-up at `$C280`-`$C3BA` is never reached.
- How the port-1 second fighter would be switched on.

## Live tests

| Test | Result |
|---|---|
| Frame capture rebuilt | 104,448 of 104,448 pixels |
| `$01` in play | `$15` |
| RESTORE | `$0416` 0 → 1, main loop waits at `$2201`; again → 0 |
| Energy, maximum, lives at the start | 47, 47, 1 |
| First opponent's energy | 63 |
| `$74` sampled over time | `$CC` and `$F0` |
| Screen and area at the start and at the first opponent | 94/28, 100/30 |
| Tune number in the jungle | 3 |
| Sprite frame table, mirror table, note table, period table | checked in the snapshot |
