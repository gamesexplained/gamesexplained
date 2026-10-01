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
| 2 | an exit of room 52 (`$34`), taken with the stick | `$36DE`-`$373C` |
| 3 | leaving area 7 (room 76, on the way to the volcano) alive: without it energy is set to 0 | `$0649`-`$0660` |
| 4 | barriers of type 7 (rooms 79, 81) can be broken | `$0A44`-`$0A55` |
| 5 | the chain of opponents at an encounter ends early | `$27AD` |
| 6 | the exits of area 13 (room 79) | `$064C`-`$0677` |
| 7 | the colour scheme of one zone changes | `$10E5` |
| 8 | area 5 (rooms 64-67) stops draining the hero | `$2CE4` |

**The map.** Each of the 123 rooms has an exit list at `$4AEC`: type,
column, destination room, arrival column (read with `find_room_exits`
`$1A06`; tested against the hero's column `$E5` by `scan_room_exits`
`$0576`). Walls are the 2-byte records of the room's item list (`$501E`);
the hero stops at a wall's column plus `$0AC7`[type] from the left and
minus `$0ABD`[type] from the right (`$087A`-`$08DF`; *live*: stopped at
column 75 by the wall at 77 in room 101). Barriers are the 3-byte records
with bit 7 set: type 1 breaks to any attack at its striking frame while
the hero is against it (`$0A2E`; *live*: room 104), types 3 and 7 only
once scroll 1 or 4 has been delivered.

**Exit types**, by what `scan_room_exits` does with them:

| Types | Taken by | Stick (*live*, facing right) |
|---|---|---|
| 9, 1, 15 | the stick within 2 columns of the exit | down |
| 10, 2, 4, 14, 20 | the stick within 2 columns | up |
| 3, 5 | the stick within 2 columns | up and right |
| 18, 19, 12 | walking off the room's edge | right, left |
| 11 | a hole: within 2 columns of it | falls |
| 16 | a drop 7 columns wide (column to column + 6) | falls |
| 17 | a drop 11 columns wide | falls |
| 21 | every column left of the exit | falls |

A drop takes the hero only while he is walking with his feet on the
floor: `$92` is his height on the screen, `$4E` (78) when standing, and
`$371D` tests it. A forward somersault (stick up and back) lifts him
off the floor for about ten columns, and so carries him over a hole or
a 7-column drop (*live*: from column 48 over the hole at 52 in room 103;
from column 112 over the drop at 115-121 in room 85, landing at 122).
No tested move crosses an 11-column drop.

**Picking up a scroll.** The encounter scan (`$27F5`) shows a room's
scroll when the screen's map position `$72` plus 0 (walking left) or 41
(walking right, `$2961`) equals the scroll's map position; the hero
picks it up by touching it (sprite collision, `$2C25`), which sets its
flag to 1. Delivering it to its chamber sets `$80` and adds a life.

**Tested in the emulator.** A breadth-first search over the exit lists,
walls, barriers, drops and the gates above, with a script that drives
the joystick along its route. For route testing the script marks every
encounter except the scrolls as done and holds the hero's energy, so
fights were not played. On 1 October 2026 it collected and delivered
five scrolls in this order, ending with scrolls 1, 2, 4, 6 and 8 flagged
`$80` and 6 lives:

| Scroll | Rooms, from the previous chamber |
|---|---|
| 1 | 94, 100, 101, 102 (scroll), 103 (somersault the hole), 104 (break the barrier), back through 103-100, 94, 5, 3, chamber 68 |
| 8 | 3, 90, 106, 17, 53-55, 22, 57-59, 91, 11, 29, 92, 93, 89, 86, 83, 19, 45, 44 (scroll); 45, 19, 83, 12, 4, 84 (carried on to 87), chamber 75 |
| 2 | 87, 105, 15, 7, 56, 54, 55, 22, 57-59, 91 (scroll); 11, 29, 92, 93, 89, 86, 83, 19, 45, 46, 48, 64, 38, chamber 69 |
| 4 | 38, 64, 49-52, 80, 78, 77, 0-2, 14, 112, 84 (scroll, from the right); 112, 14, 2-0, 77, 78, 80, 83, 19, 45, 10, chamber 71 |
| 3 | not collected: the hero reached room 114 east of the wall at 117 and went on to chamber 70 without it |
| 6 | 70, 21, 108, 20, 108, 109, 110 (scroll); 109, 108, 26-28, 53-55, 22, 57-59, 91, 11, 29, 92, 93, 89, 86, 83, 19, 45, 46, 48, 64, 49-52, 80, 78, 77, 0-2, 65, 2, 39, 40, 82, 85 (somersault the drop), 121, 9, chamber 73 |

Two traps decide the route. Arriving in room 84 from room 4 carries the
hero on to room 87, so scroll 4 (at 124, beside the drop at 112-122) is
reached only from room 112. In room 85 the drop at 115-121 takes the
hero to room 111 unless he somersaults it.

**What is not solved.** Scroll 3 (room 114, at 110) lies between the
walls at 77 and 117, reached by the stairs from room 113 that arrive at
column 92; the search finds that route, and it was not driven. Scrolls
5 and 7, chambers 72 and 74, the volcano rooms 60-63 and the ending,
room 122 (`$2DB5`), lie in a region (rooms 8, 16, 18, 30-36, 60-63, 72,
74, 76, 88, 95-99, 107, 117-120, 122) whose only way in, by the exit
tables, is room 79's right-hand exit to room 117. That part of room 79
is reached only from room 117. The way in from the rest of the world is
a chute: in room 77 the type-20 exit at 222 slides the hero right
whatever the stick says, into the 11-column drop at 233, and he lands in
room 79 at column 21. That is inside room 79's own drop at 18, so he
falls on through to room 82 (*live*, walking, standing, ducking, every
stick direction). Room 77 refuses jumps and attacks (*live*). How a
player gets into the region is not known. The rules not yet read include
how the arrival column is set after a fall, and what `$0491`/`$0492`
(set by room 79's drop when scroll 6 is held) start.

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
