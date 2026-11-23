# Chuckie Egg 2 — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

A one-file memory image, `$0314`-`$FFFF`, started through the IRQ vector
by `start_after_load` (`$033C`). The game was written in BBC BASIC's
assembler: `source_fragment` (`$8F00`) holds lines 2420 to about 2470 of
the tokenised source, the source of `setfull` (`$7755`) and the start of
`carb` (`$7770`) and `setf` (`$7776`). The names `setfull`, `carb`,
`setf`, `spebas`, `upscr`, `tib1`, `tcar` (`$E3`), `lives` (`$D7`),
`work1`/`work2` (`$F8`/`$F9`) are the authors'.

## Memory layout

| Thing | Where |
|---|---|
| Start-up of the one-file version | `$033C`-`$0382` |
| Screen (bank 0) | `$0400` |
| Character set | `$0800` (`$D018` = `$13` in play); the front end uses the ROM's at `$1000` |
| Interrupt and the tune | `$1100`-`$11F7`; `note_table` `$C780` |
| Shadow copy of the screen | `$1200`-`$15E7` |
| Property map, one byte per screen cell | `$1700`-`$1AE7` |
| First-visit bonuses and visited flags, per room | `rooms_visited` `$1B10` |
| Harry's movement and the restart point | `$1C00`-`$1C0F` |
| Creature records (26 bytes each) and their list | `$1D00`, `$1E00` |
| Sprites `$80`-`$FF` | `$2000`-`$3FFF` |
| The game's code | `$4000`-`$7BA6` |
| Creature list (room, y, column, type; 256 each) | `$7C00`-`$7FFF` |
| Creature types (4 bytes each) | `$8000` |
| Object table (room, row, column, shape; 256 each) | `$8200`-`$85FF` |
| Shapes (colour, graphic, value) | `$8600`-`$86C8` |
| Input; the eight keys | `$8750`; `key_table` `$8890` |
| Pick-ups' pictures | `$8A00`-`$8EFF` |
| Source fragment | `$8F00`-`$8FFF` |
| Room table and the 120 room records | `$9000`; `$90F2`-`$C630` |
| Footstep sound | `$C900` |
| Tape loader (load a saved game) | `$CC00`-`$CE05` |
| Front end: title, high scores, keys, instructions | `$E000`-`$EEBA`; table `$EF00`/`$EF64` |
| Tape saver | `$F100`-`$F4B1`; buffer `$F800` |

## Conventions the code keeps

- `print_inline` (`$ED40`) takes the zero-ended text after the `JSR` and
  returns past it: 55 calls in the front end, each followed by its text.
- `plot_cell` (`$4620`): character A at column X, row Y, colour `$C7`,
  property bits `$C8` ORed into the property map.
- Property bits (`$1700`): `$01` platform, `$02` ladder, `$04` rising slope,
  `$08` falling slope, `$10` chain, `$20` slippery pipe, `$40` something to
  pick up, `$80` deadly. Counted from the room records: `$01` on platform
  characters, `$02` on `$33`/`$34`, `$10` on `$35`, `$20` on pipes.
- Harry's states (`$B8`, `player_states` `$5590`): 0 falling, 1 walking,
  2 on a slippery pipe, 3 on a ladder, 4 on a chain, 5 on a slope,
  6 turning on a slope, 7 jumping, 8 riding the lift.
- Carried (`$B2`): `$FF` nothing; 0-7 toy parts, 8-`$F` milk, `$10`-`$17`
  cocoa, `$18`-`$1F` sugar, `$20`-`$23` baskets, `$24` bone, `$25` girder,
  `$26` ladder, `$27` toy, `$28` egg: the object table's entry numbers.
- Colours in the room records, shapes and creatures are ZX Spectrum colour
  numbers, mapped through a table of 0, 6, 2, 4, 5, 3, 7, 1
  (`spectrum_colour` `$4088`, and copies at `$57B6` and `$68AD`).
- Several routines use the skip trick, a `BIT` opcode hiding the next
  two-byte instruction (`$40CB`, `$4142`, `$4C08`, `$4C3B`, `$56A1`,
  `$5823`, `$58DA`, `$5929`, `$7B4E`).

## Timing

The main loop (`main_loop` `$4A87`) is not tied to the frame: Harry's move
ends with a delay of 30 times 255 loop turns (`player_move` `$4BFF`), and
the creatures move twice for each of his moves (`creatures_move` called
twice). The raster interrupt only changes the background colour.

## Controls

Joystick in control port 2 (`read_input` `$8750` reads `$DC00`), or eight
keys (`key_table`), by default A, Z, comma, full stop, SPACE, CTRL, F1, F7
(*live*, read from the play snapshot). Down and fire together are take/drop.

## Graphics

Rooms are characters drawn by a small interpreter (`draw_room` `$4000`,
`room_cmd_table` `$4072`); pick-ups are characters too, their pictures
copied into the character set from `$0AE8` as each room is drawn
(`draw_pickup` `$5664`). Harry, the creatures, the train, the lifts and the
van are sprites, each creature as several sprites (`creature_sprites`
`$65B9`).

## Mechanics

- Map: 120 rooms, 10 to a row. Left and right add or take 1, up and down
  10 (`exit_right` `$4CDA` and the rest). From room 80 going right leads
  to room 71 and back.
- A fall of 15 steps or more kills (`land_check` `$5111`).
- More creatures on later eggs: the first 155, 180, 205, 230, 255 entries
  of the creature list, then all (`creature_counts` `$5D58`).
- Random numbers: a 32-bit shift register at `$1E`-`$21`, seeded 1, 2, 3,
  4 by `player_init` (`rnd` `$64D2`).
- The power switch is in room 115 (`power_switch` `$6C64`); the train and
  the lifts move only with the power on (`$B0`).
- Vats take ingredients that come before their own (`drop_vat_check`
  `$746B`).
- A toy part dropped into the milk, cocoa or sugar vat is marked gone and
  counted nowhere (`ingredient_in` `$76FF` skips kind 0). Only
  `game_state_init` (`$49CA`), run for a new game and after each egg,
  brings it back, so that egg cannot be made. Observed in VICE, 23 November
  2026: a part dropped into the milk vat in room 33 left `$0F`-`$12` at 8.

## Data tables

`room_table` `$9000`, `shape_table` `$8600`, `pickup_bitmaps` `$576C`,
`toy_sets` `$7BA7`, `creature_counts` `$5D58`, `anim_table` `$5D5D` (and a
copy, `anim_table2` `$67BC`), `jump_profile` `$55AE`, `player_frames`
`$55A2`, `default_keys` `$ECB6`, `save_blocks` `$F2FE`.

## Sound

Only voice 1 of the SID is used (the census finds no access to `$D407`-
`$D416`). `sfx_step` (`$C92D`) toggles a noise gate every pass for
Harry's steps; `play_tune` (`$1140`) plays the one tune, a sawtooth,
note by note with busy waits, while the game stands still (on a death).

## Register census

| Register | Use | Routine |
|---|---|---|
| `$D000`-`$D010` | sprite positions | `player_move`, `creature_sprites`, `van_show`, `train_draw`, `lift_setup` |
| `$D011`, `$D012`, `$D019`, `$D01A` | raster interrupt at lines `$20`/`$41`; screen off for tape | `irq_raster_split`, `irq_on`, `tape_write` |
| `$D015`, `$D017`, `$D01B`, `$D01C`, `$D01D` | sprite enable, stretch, priority | `creature_stretch`, `van_stretch`, `train_draw` |
| `$D018` | character set | `start_room`, `screen_clear` |
| `$D01E` | sprite collisions | `collide_check` |
| `$D020`, `$D021` | border, background | `irq_raster_split`, tape routines |
| `$D027`-`$D02E` | sprite colours | `creature_sprites`, `van_show`, `lift_setup` |
| `$D400`-`$D406`, `$D417`, `$D418` | voice 1, volume | `sid_init`, `tune_play`, `sfx_init`, `sfx_step` |
| `$DC00`-`$DC02` | joystick and keyboard | `read_input`, `key_check`, `key_scan` |
| `$DC04`-`$DC0F`, `$DD0D` | tape timing and interrupts | `tape_load_init`, `tape_irq`, `tape_write`, `irq_on` |

Never named: voices 2 and 3, the paddles, CIA 2's ports (the video bank
stays where the KERNAL leaves it), the sprite-background collision
register.

## The listing's error rate

Sample, seed 20261122, 22 November 2026: 70 of the listing's 858 comments
(60 drawn from the 683 written by hand, and five each from the 120 room
records' and the 55 strings' generated comments), checked by a separate
agent on claude-opus-5-5 that wrote none of them. 18 were wrong in a
detail, none wrong outright; all 18 were hand-written, and both generated
families were right. The estimate is 25.7 % (95 % interval 16.9 % to
37.0 %, Wilson), 23.9 % weighted by the strata; at least 18 of 858 (2.1 %)
are wrong, and the checker may have missed some. What was wrong: three
flags read backwards in the creature code (the floor test, the direction
of a pounce, the random wait), the lifts' upper and lower stops swapped,
the pick-up pictures' height and width swapped in four comments, the
animation header misdescribed, the after-string comments naming the
routine before the right one, two delay counts (255*19 for 255*20), and
smaller details (which SID byte is cleared, which vector points where, a
value byte, the big creature's frames, what reads the creature list). All
18 were corrected, with five more of the same kinds the checker noticed
outside the sample and every after-string comment. An audit of every
comment is recommended.

## Live tests

- 22 November 2026: the ladder taken in room 109 and dropped in rooms 1,
  109 and 118 (`features.md`, Open questions); stands with its bottom row
  on the row of Harry's feet each time.
- 22 November 2026: the stick in control port 1 opened "SAVING GAME"
  (right, the F7 line) and returned to the title (fire, the F1 line).
