# Explorer — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Electric Dreams release of 1987, as a Dolphin DOS freezer backup of
the running game (`orientation.md`). Triad's crack of the same release
agrees with it on every byte of the program and its pictures but one, at
`$9712` inside a picture of the ground view. The code carries no version
string. The title says "Designed By The Ramjam Corporation, a Software
Studio Production, © 1987 Electric Dreams Software"; X in the menu shows
"graphics: Simon Dunstan" and "program: Graham Relf" (`show_credits`
`$1D4D`).

The program is a conversion of the ZX Spectrum game: every picture and
window keeps Spectrum attribute bytes, which the C64 code turns into its
own colours as it draws (`attr_to_colour` `$2EFE`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page, copied at start-up from `zp_image` | `$0000`-`$00FF` (image at `$0C92`) |
| The program and its tables | `$0803`-`$3EAD` |
| Bank 1 screen (the bitmap's colours) | `$4000`-`$43E7` |
| Masks for drawing over the ground, bit-reversed bytes | `$4400`-`$46FF` (`mask_keep_right`, `mask_keep_left`, `bit_reverse`) |
| The terrain profile, 256 heights | `$4700`-`$47FF` (`terrain_profile`) |
| The map's character set, 48 characters | `$4800`-`$497F` (`map_charset`), copied to `$C800` |
| The five bug pictures and the gun sight | `$4980`-`$4AB5` |
| Bank 1 bitmap | `$6000`-`$7F3F` |
| The pictures of the ground view: 43 objects, 9 fragments, the doorway, the beacon, the hills | `$8000`-`$BCBD` |
| The font, 96 characters from the space | `$BD00`-`$BFFF` |
| Bank 3 screen; at load, the title picture's colours | `$C000`-`$C3E7` |
| The release's loader, not used in play | `$C400`-`$C45C` |
| Bank 3 bitmap; at load, the title picture's bitmap | `$E000`-`$FF3F` |
| Interrupt vectors in RAM | `$FFFA` (an `RTI` at `$0B24`), `$FFFE` (`irq` `$0B11`) |

The processor port is `$35` throughout: RAM everywhere but the I/O area.
`$4AB6`-`$5FFF` holds bytes nothing reads, the video chip included.

## Timing

- The interrupt comes from CIA 1's timer A, which the game never sets: it
  runs at the rate the KERNAL left, 16,421 cycles on a PAL machine, about
  60 a second (*live*: the highest count read from `$DC04` in 200 reads
  was 16,252). Each interrupt counts a tone down (`tone_tick` `$0986`)
  and scans the keyboard and the joystick (`scan_keys` `$0B25`).
- Nothing else is timed. The game draws as fast as it can, and
  `swap_buffers` `$31A4` waits for raster line 250 before showing a new
  screen.
- A held key repeats after 16 interrupts, then every fourth, each time
  only if the key buffer is empty (`scan_keys`).

## Controls

| Key or stick | On the ground | In the air |
|---|---|---|
| 7 or stick up | walk along the heading (`walk_loop` `$152B`) | scroll the map north |
| 6 or stick down | turn about (`turn_about` `$1590`) | south |
| 5 or stick left | turn left two steps of 64 (`turn_left` `$1584`) | west |
| 8 or stick right | turn right two steps (`turn_right` `$1578`) | east |
| U | take off (`take_off` `$1728`) | up from height 8 to 9 (`go_up` `$2879`) |
| D | opens the menu | down from 9 to 8, or land from 8 (`go_down` `$28A4`) |
| any other key, fire | opens the menu (`menu` `$1899`) | nothing |

The stick reaches the game as key codes (`joy_codes` `$0BE5`): fire is
F, and the diagonals take up or down. In the menu O opens the objects
menu (E echo, S send), B the beacons (D drop, P pick up, F fix 3
nearest), W the weapons (5, 8, 7, 6 move the sight, F fires) and X the
credits. A doorway asks for E. RESTORE does nothing.

## Graphics

- The view from above is extended-colour text, 20 × 12 map cells of
  2 × 2 characters (`draw_map` `$2B25`, `draw_map_tile` `$2E39`); the
  four background colours are green, yellow, cyan and red (`init_machine`
  `$0A8E`), and a dropped beacon colours its cell red. Scrolling moves the
  picture two characters into the other screen and draws only the new
  row or column (`shift_up` and the rest, `$2D01`-`$2DC7`).
- The ground view is a hires bitmap: 17 rows of sky, the distant hills,
  and the scenery of the 24 cells round the explorer, the 16 two cells
  away first and the 8 next to it over them (`draw_ground_view` `$1258`).
  Each cell is placed at its compass column round a 64-column horizon
  turned by the heading, of which 40 columns show.
- A picture is a run of cells, each a Spectrum attribute and eight bytes,
  joined by step bytes (`draw_image` `$2F99`). Attributes `$80` and up
  draw over the ground behind a mask, so trees stand in front of what is
  behind them; `$28` keeps the colour already there. Any picture can be
  drawn mirrored (`draw_object_mirrored` `$309C`).
- The scenery is a chain of objects per cell: the cell's kind of ground,
  two bits of its last layer's sum (`$29` and 6) and the ring pick a list (`scenery_list_for`
  `$3443`), one object is taken from it by the random bytes, and each
  object drawn names the list the next comes from (`draw_object` `$3591`,
  `object_records` `$363F`). The random bytes are seeded with the
  ground's height before each cell (`draw_scenery_at` `$10FF`), so a
  place shows the same objects at every visit and in every game.
- Landing turns the map into a bitmap (`map_to_bitmap` `$2E6D`) and
  zooms into its middle by doubling pixels (`zoom_in` `$3A3D`); each step
  on the ground zooms once more (`walk_zoom` `$3A5D`).
- No sprite is used: the game writes none of the sprite registers. The
  bug, the sight, the windows and the compass are drawn into the bitmap,
  and what was under them is copied back from the other screen
  (`restore_cell` `$2536`, `restore_view` `$22AD`).
- Windows get a frame cut from nine random bytes of the pictures at
  `$8000` up, in one of 73 colours (`draw_frame` `$3CE3`), so every frame
  looks different.

## Mechanics

- **The planet** is 65,536 × 65,536 positions, wrapping at the edges.
  The ground at a point is computed, never stored (`terrain_at` `$32D6`):
  four layers, each the sum of five heights looked up in the 256-byte
  profile at the low byte of a·east + b·north, the forty coefficients in
  `terrain_layers` `$341B`. The first layer at 204 or less is water; the
  second at 150 or less gives kind 8; otherwise the third and the fourth,
  each over 255 or not, give kinds 0, 2, 4 and 6. Over 400,000 grid cells
  drawn at random: kind 0 37.9 %, 2 18.1 %, 4 18.0 %, 6 8.6 %, 8 3.3 %,
  water 14.3 %. The map shows kinds 0 and 2 as jungle and 4, 6 and 8 as
  open ground (`map_tiles` `$27F4`).
- **Landing** is safe on kinds 4, 6 and 8, about 30 % of cells; on jungle
  or water it is a crash (`land` `$28DE`, `crash` `$2C03`).
- **Walking**: a step is 16 units along the heading, 64 headings to the
  circle (`heading_step` `$15AD`, `sine_table` `$159C`). A step is
  refused, with a bump, when the cell at row 3, column 19 of the view on
  show has the colour of black on yellow, the trunks of the nearest trees
  (`step_forward` `$162D`).
- **Energy** starts at 40,000 (`zp_image`). A ground view costs 15,
  taking off 100, going up 50, a laser shot 500, a crash 500 when there
  is that much, sending a fragment 1,000 (`energy_spend` `$22F7` and its
  callers). Walking, turning, flying and doorways cost nothing beyond the
  views they draw. When a cost would take it below zero, "Energy gone",
  the energy becomes 2,000 and the destination prompt follows
  (`energy_gone` `$231A`). Nothing adds energy: the doorway's
  computation of a change is never stored (`$0F3D`-`$0F4A`).
- **Fragments**: nine records at `fragments` `$2213`, numbered 1 to 9.
  Fragment 1 is put 160 east and 144 north of the start; the others lie at
  (12352, 56784), (33328, 55552), (784, 30304), (27824, 31408),
  (5008, 30128), (46208, 19568), (60336, 23408) and (57920, 7088) in every
  game. One within 8 units of the explorer's cell is drawn there, and the
  first sight of each adds one to the score and its digit to the Found
  list (`$1420`).
- **The sonar** echoes the nearest fragment by the sum of the distances
  east and north (`nearest_fragment` `$20EF`); under 1,280 the echo
  sounds after a quarter of the distance in interrupts, otherwise "Out of
  range" (`echo_nearest` `$19A8`).
- **Beacons**: nine records at `beacons` `$21DD`, numbered 0 to 8,
  carried at the start. A dropped beacon takes the explorer's grid cell
  (`place_beacon` `$1EBE`); pick-up works within 32 units
  (`take_beacon` `$1EEC`); "Fix 3 nearest" gives the three nearest
  dropped beacons with distance and bearing (`fix_beacons` `$1BFD`).
- **Sending**: a fragment in the explorer's cell can be sent to a beacon
  less than 16,384 away, and takes its position (`send_to_beacon`
  `$1A53`).
- **Bearings** (`bearing_of` `$383F`) come from a table of tangents
  searched in five halving steps; in the south-west quarter the code reads
  270 less the angle where 180 plus it is meant, so a bearing there comes
  out reflected about 225°. The compass on the ground view reads about
  1 % short (`draw_compass` `$0FF8`): 88 for east, 178 for south, 267 for
  west.
- **Bugs**: one at most. A view that is not a landing makes one when the
  raster line's low byte is below the score plus one, a chance of
  about (score + 1) in 256 (`maybe_new_bug` `$1436`). A bug starts the weapons
  mode, which will not let go until the bug is hit; it moves at random
  while the game waits for a key (`bug_move` `$09D1`). A hit needs the
  sight on the bug's column or the one right of it, and on its row or up
  to two above (`fire_laser` `$2437`).
- **Doorways** are the cells whose last layer sum has the low byte 12,
  about one cell in 260 (1,506 of 400,000 drawn at random), two in three
  of them jungle of kind 0 and the rest open ground of kind 4. A doorway
  within two cells is drawn in front of the explorer, at column 17, row
  20; the next step
  asks to enter if the cell at row 19, column 19 of the view still shows
  its colour (`after_step` `$16B6`). No picture of the scenery carries the
  doorway's two attributes, `$72` and `$F2`.
- **Destinations**: a name becomes a position the same in every game
  (`name_destination` `$0E23`): east from its letters forwards, north
  from them backwards, each letter added and the sum rotated five places.
- **The end**: after every step, if the nine fragments' positions all
  equal the explorer's grid cell, "WOW, YOU DID IT!" and a jump to itself
  (`check_win` `$0DBA`). There is no game over and no restart: running out
  of energy and crashing both lead on to a doorway's prompt.
- **Random numbers** come from two bytes stepped by about three times
  themselves, folded below 256 (`rnd_next` `$3C65`, `rnd_step` `$3C77`),
  and from the raster line: the start position, where a bug appears and
  how it moves.

## Data tables

| Table | Address | Contents |
|---|---|---|
| `zp_image` | `$0C92` | the 256 bytes of zero page at start-up |
| `joy_codes` | `$0BE5` | key code for each of the stick's 32 states |
| `keymap`, `keymap_shifted` | `$0C05`, `$0C46` | key codes for the 64 keys, plain and shifted |
| `fragment_offsets` | `$1201` | where each fragment sits in a pile |
| `sine_table` | `$159C` | 17 values of 16 × sine, 0° to 90° |
| `beacons` | `$21DD` | nine records of six bytes |
| `fragments` | `$2213` | nine records of four bytes |
| `map_tiles`, `map_tile_chars` | `$27F4`, `$2E09` | the map's tile for each kind and height |
| `attr_colours` | `$2F09` | C64 colour byte for each Spectrum attribute |
| `terrain_layers` | `$341B` | 40 coefficients: the planet's shape |
| `scenery_lists`, `object_lists` | `$347B`, `$34DB` | which objects stand on which ground |
| `object_records` | `$363F` | 43 objects of nine bytes |
| `tangent_table` | `$39B3` | 64 tangents and the 64 angles they stand for |
| `zoom_order` | `$3B95` | the rows of the zoom's strips |
| `terrain_profile` | `$4700` | 256 heights, 2 to 138 |

## Sound

Sound effects only, no music. The SID's voice 3 plays the sonar's pings
and echoes (`tone_wait` `$0952`); voices 1 and 3 ring-modulated make the
landing, the drone, a fragment in view and the take-off; voice 1 through
the filter is the crash's noise; voice 2 makes the key click and the
doorway's falling pulse (`$25B7`-`$27DE`). `tone_wait` silences the chip first
(`sid_reset` `$0AFD`).

## Register census

| Register | What the game does with it | Where |
|---|---|---|
| `$D011`, `$D016` | fine scroll set and cleared for the shake and the crash; bitmap or extended-colour text | `fine_y_0` `$0940` and the rest, `swap_buffers` |
| `$D012` | waits for line 250; read as a random number | `swap_buffers`, `start_game`, `maybe_new_bug`, `bug_move` |
| `$D018` | screen and character set or bitmap for the bank | `swap_buffers`, `init_machine` |
| `$D01A` | raster interrupts off | `init_machine` |
| `$D020`-`$D024` | black border; the four extended-colour backgrounds | `init_machine` |
| `$D400`-`$D418` | the sound effects | `$0952`, `$25B7`-`$27DE` |
| `$DC00`-`$DC03` | keyboard and joystick port 2 | `scan_keys`, `init_machine` |
| `$DC0D` | the interrupt acknowledged | `irq` |
| `$DD00`, `$DD02` | VIC bank 1 or 3 | `swap_buffers`, `init_machine` |

No instruction names a sprite register, CIA 1's timers, or anything of
CIA 2 but port A and its direction register.

## The listing's error rate

One sample, seed 20261031: 60 of the 494 comments written by hand and
15 of the 43 a script wrote from the object lists. A checker on
claude-opus-5-5 that wrote none of them marked 6 of the 75 wrong, each
read again against the code and upheld. Two more of the 60 had been
corrected between the draw and the check: `$2213` and `$22C9` numbered
the fragments from 0 where the game and the rest of the listing number
them from 1, so they are counted wrong too. That makes 8 of the 60
hand-written wrong (13 %, Wilson 95 % interval 7-24 %) and none of the
15 generated (0-20 %); weighted by the two populations, about 12 % of
the comments. All eight were wrong in a detail. `$08B2` had the shake's
vertical scroll going to 7 and back to 0, when it goes to 0 and back to
7. `$0BE5` said B and F fill the rest of the stick table, when entry 3
is `7`. `$152B` said only a key stops the walk, when a blocked step
stops it too. `$231A` named the doorway's prompt as where running out
of energy goes, when it goes to the destination prompt. `$4400` gave the
mask table one use, when mirrored drawing swaps the two masks. `$83E8`
described white stones the picture does not have: its `$28` cells keep
the colour already on the screen. All eight were corrected, and so were
the same misreadings in seven more picture descriptions, the other mask
table's comment and every other comment that numbered the fragments.
Eight of 60 is over the mark of two, so an audit of the whole listing
is recommended. The rate is what the checker found, a lower bound on
the true one.

## Live tests

All on VICE 3.14.0 from the snapshots in `orientation.md`.

- Menus: Space on the ground showed Objects, Beacons, Weapons, the energy
  (39985) and the score; O, B, W and X opened their menus and the credits.
- Sonar: E gave "178 degrees / Out of range" for fragment 1 at 48 east and
  1,296 south, 1,344 by the game's measure.
- Beacons: D dropped beacon 0 and drew it. With beacons poked down at
  (0, +1000), (−200, −640) and (+480, +320) from the explorer, "Fix 3
  nearest" printed 1000m. 1 degrees, 840m. 252 degrees and 800m. 56
  degrees; the second is the south-west error (197° true).
- Sending: fragment 2 poked onto the explorer's cell and sent to beacon 0
  took the beacon's position, and the energy fell by 1,015 (1,000 and a
  view).
- Doorway: standing one cell east of a doorway, it was drawn; a step
  asked to enter; E and the name HOME arrived at 48,356 east and 48,609
  north, the energy down 15, the cost of the view alone.
- Bug: the score poked to 250 made a bug on the next view and started the
  weapons mode; one shot with the sight on it ended the mode, and cost
  500.
- Crash: the game's own landing after the opening pass came down on
  water, the screen went black on white and shook, the energy fell by
  500 and the destination prompt came up.
- The end: the nine fragments poked onto the explorer's cell, one step
  gave "WOW, YOU DID IT!".
- Compass: turning right from north (heading 16 to 14) changed the
  compass from 0 to 10, as the routine computes.
