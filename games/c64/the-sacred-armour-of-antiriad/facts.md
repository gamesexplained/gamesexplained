# The Sacred Armour of Antiriad — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Palace Software release of 1986, as a one-file crack on a D64 from
archive.org (`d64_Sacred_Armour_of_Antiriad_The_1986_Palace_Software`,
MD5 `dadadbe50ae657af3f5441497c44d6de`): one 184-block program behind the
BASIC line `1986 SYS2080 SCI 666`, unpacked in five stages
(`orientation.md`). The game starts at `$8009` through a cartridge-style
"CBM80" header at `$8000` (`cart_header`), which the KERNAL's reset finds.
Nothing is loaded after that: the whole game is in memory, from `$0000` to
`$FFFF` with the RAM under the I/O chips, and the KERNAL and BASIC are
switched out for good.

The stub at `$D800`-`$D852`, under colour RAM, is not the game's: it moves
memory with all RAM switched in, then loads a file from device 1 through
the KERNAL and jumps through `$0302`. The game never runs it.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: pointers, the room, energy, the armour, flags and waits | `$02`-`$B4` (`zp_room` `$5B`, `zp_tal_energy` `$51`, `zp_suit_energy` `$4F`, `zp_armour_state` `$7B`) |
| Shadow sprite registers, copied in each frame (`copy_sprite_shadows`) | `$0200`-`$022E` |
| Shadow SID, copied in by the sound update (`copy_sid_shadow`) | `$022F`-`$0247` |
| Eight animated-tile slots | `$0248`-`$025F` |
| Eight sprite slots: animation, script place, hit points, points, dissolve, materialise, path | `$0260`-`$030F` |
| Music driver state, three voices | `$0310`-`$0360` |
| Picture buffers for dissolving sprites, 64 bytes a slot | `$0361`-`$0560` |
| Colour of each playfield character in the room (`char_colour`) | `$0561`-`$0660` |
| Recharge cells taken, one bit a room (`cells_taken`) | `$0661`-`$0669` |
| Message queue (8), add-ons found (4) and fitted (4) | `$066A`-`$0681` |
| Score: counted digits, shown digits, their value, the binary score | `$0682`-`$069A` |
| Small tables and the eleven animated-tile scripts | `$06A0`-`$07F7` |
| Nine dissolve masks, 64 bytes each | `$0800`-`$0A3F` |
| 69 room maps, 32 bytes each (`room_00_map`...) | `$0B00`-`$139F` |
| 256 tiles of 4 × 4 character codes | `$1400`-`$23FF` |
| The shape pool, 748 character shapes, and their colours | `$2400`-`$3B5F`, `$3C00`-`$3EEB` |
| Nine room character lists | `$3F00`-`$3F9A` |
| Screen (`$4000`) and sprite pointers (`$43F8`) | `$4000`-`$43FF` |
| 176 sprite pictures, pointers `$10`-`$BF` | `$4400`-`$6FFF` |
| Status panel character set | `$7000`-`$77FF` (`$7740`-`$77FF` built in play) |
| Playfield character set, built per room | `$7800`-`$7FFF` |
| Code | `$8009`-`$B499` |
| 46 music tracks | `$B49A`-`$C1A9` |
| 22 panel messages and the credits | `$C1AA`-`$C5CA` |
| Creature tables, sound triggers, start places, jump steps | `$C5CB`-`$C682` |
| 50 movement paths | `$C683`-`$CA15` |
| Each room's sprite list | `$CA16`-`$CE11` |
| Colours that make scenery solid or harmful | `$CE12`-`$CE32` |
| Title character set, in the RAM under the I/O chips | `$D000`-`$D7FF` |
| Pictures of the animated tiles (monkey, thorns, dragons, gunner, barrier) | `$E000`-`$F117` |
| Panel map, room links, notes, title picture, room tables, instruments | `$F118`-`$FC4B` |
| Panel lamps and flicker, 95 sprite animations | `$FC4C`-`$FFA8` |

Banking in play is `$01` = `$05`: all RAM, with the I/O chips at `$D000`
(`cold_start`). The only other value is 0, for the 2 KB copy of the title
characters from under the I/O chips (`copy_charset_from_io_ram`, once,
before the title). Video bank 1, `$4000`-`$7FFF` (`cold_start`, `$DD00`).
The IRQ vector is `irq_handler` (`$AE41`) and the NMI vector points at a
lone RTI (`nmi_handler`, `$AFC4`), so RESTORE does nothing.

## Registers

The census (`kit/cpu/census.py`) finds 164 instructions naming 53
registers.

| Register | What the game does with it | Routine |
|---|---|---|
| `$00`/`$01` processor port | `$01` = `$05` in play; 0 for the title-character copy | `cold_start`, `copy_charset_from_io_ram` |
| `$D000`-`$D00F` sprite positions | written from the shadow copy each frame; sprites 0 and 2 read back to find Tal's and the stone's cells; 5, 6 and 7 placed for the panel | `copy_sprite_shadows`, `tal_cell`, `stone_cell`, `panel_sprites` |
| `$D010` X bit 8 | shadowed; read for the cell under Tal | `copy_sprite_shadows`, `tal_cell` |
| `$D011`, `$D012` | raster interrupt lines `$FA`, `$32`, `$B2`; fine scroll flipped in the ending | `raster_bands`, `victory_sequence` |
| `$D015`, `$D017`, `$D01C`, `$D01D` | sprite enable, height, multicolour, width from the shadows | `copy_sprite_shadows`, `panel_sprites` |
| `$D016` | multicolour text on or off per band | `raster_bands`, `title_attract` |
| `$D018` | `$0E` (characters `$7800`) for the playfield, `$0C` (`$7000`) for the panel and the credits | `raster_bands` |
| `$D019`, `$D01A` | raster and sprite-collision interrupts | `irq_handler`, `raster_bands` |
| `$D01B` | sprites behind the scenery in the panel band only | `raster_bands`, `panel_sprites` |
| `$D01E`, `$D01F` | collisions, latched into `zp_sprite_hits` and `zp_bg_hits` | `latch_sprite_hits`, `latch_bg_hits` |
| `$D020`, `$D021` | black; flashed black and white in the ending | `clear_game_state`, `victory_sequence`, `reset_tal_end` |
| `$D022`, `$D023` | the room's two multicolours | `raster_bands` from `colour_room` |
| `$D025`, `$D026` | sprite multicolours; `$D025` cycled while Tal rises | `title_attract`, `tal_lives` |
| `$D027`-`$D02E` | sprite colours from the shadow; panel sprites | `copy_sprite_shadows`, `panel_sprites` |
| `$D400`-`$D418` SID | written only as a whole, from the shadow copy, and cleared | `copy_sid_shadow`, `silence_sid` |
| `$D404`,y | gates closed when a track starts | `start_requests` |
| `$D417` | filter routing cleared when a room is built | `build_room` |
| `$DC00`, `$DC01` | joystick in port 2; keyboard column 7 for Q | `read_fire`, `foot_control`, `check_quit_key` |
| `$DC04`-`$DC07`, `$DC0D`-`$DC0F` | timer A the sound update, timer B the music tempo | `copy_charset_from_io_ram`, `title_tune_part1`-`3`, `title_sequence` |
| `$DD00`, `$DD02` | video bank 1 | `cold_start` |

No instruction names `$D006`-`$D009`, `$D013`/`$D014`, `$D024`,
`$D029`-`$D02B`, or the SID registers one by one: the shadow copies reach
them by index.

## Text

All text is ASCII with eight extra marks (`text_punct`, `$C5CB`): space,
`a`, `o`, `u` for A, O and U with umlauts (panel characters `$C6`-`$C8`),
apostrophe, dash, comma and `@` for the copyright sign. The UK text uses
no umlaut. Letters become panel character codes `$9C`-`$B5`
(`print_text_block`, `scroll_message`).

- 22 panel messages, `$80`-`$95` (`message_ptrs`, `$C1AA`; texts
  `$C1D6`-`$C528`). A message ends with `$` (stop), 0 (start again) or
  `1 n` (go on to message n). Most go on to `$92`, eleven spaces, so the
  strip empties; `$8C` and `$8D` ("YOU HAVE THREE", "YOU HAVE TWO") go on
  to `$94`, " REJUVENATIONS REMAINING"; `$90` (game over) and `$95` (the
  ending) repeat.
- One text block (`text_blocks`, `$C529`): the credits screen at
  `$C52B`-`$C5CA`, "PROGRAMMING STANLEY SCHEMBRI", "PLOT AND GRAPHICS
  DANIEL MALONE", "SOUND DESIGN RICHARD JOSEPH", "PRESS FIRE TO PLAY",
  "© PALACE SOFTWARE MCMLXXXVI".
- The title picture's top row (`title_picture_top`, `$F514`) spells THE
  SACRED ARMOUR OF in large letters, but `draw_title_screen` starts one
  row below it, so the words are never drawn.

## Timing

- The raster interrupt splits the screen in three (`raster_bands`): line
  `$FA` sets up the playfield and runs the frame's tasks, line `$32` the
  message strip and the score, line `$B2` the panel. *Live*:
  `count_timers` and `tal_control` each ran 500 times in 500 frames.
- The frame's tasks, in order: `count_timers`, `tal_control`,
  `run_paths`, `move_sprites`, `animate_sprites`, `sprite_effects`,
  `sprite_hits`, `tal_lives`, `suit_hover`, `power_centre`,
  `check_quit_key`. They are skipped while a room change is pending.
- Each band's handler clears I before its long work (`raster_bands`:
  `$AF3D` before the frame's tasks, `$AEAC` before the message and the
  score, `$AEF2` before the panel's messages), so the music's timers, the
  collision interrupts and the next band are taken inside it; `zpa_AB`
  is set while the frame's tasks run, and a band at line `$FA` that comes
  before they end skips them. `irq_handler` reads `$D01E` and `$D01F`
  before it returns. *Live*: a joystick played a stick read at a time
  matched VICE for 1,380 reads on the kit's machine with interrupts
  taken inside handlers, and for 711 with each handler run whole, where
  the line-`$32` handler's read cleared a scenery collision before
  `latch_bg_hits` had kept it.
- The main loop runs with no wait (`main_loop`): *live*, 16,731 passes in
  500 frames, about 33 a frame. Its routines are timed by waits that
  `count_timers` counts down once a frame.
- CIA 1 timer A, latch `$2710`, runs the sound update (`sound_tick`)
  about 98.5 times a second. Timer B is the music tempo: `$5161` in play
  (about 47.3 ticks a second) and `$5D01`, `$4359` and `$411A` for the
  three parts of the title tune (about 41.4, 57.1 and 59.1).
- Tal's joystick is read every seventh frame (`tal_control`), and not at
  all while he is dissolving, materialising, jumping or falling.
- A sprite dissolves or appears in nine steps, one every four frames
  (`dissolve_step`, `materialise_step`).
- The message strip scrolls two pixels a frame, a new letter every four
  (`scroll_message`). The score's counted digits move one unit every four
  frames (`roll_score`, `score_digits`). *Live*: a binary score of 123 was
  reached by the counted digits in 492 frames, the shown digits one roll
  behind.
- The ending's nine dissolve steps (`victory_sequence`) each AND the 2,048
  bytes of the playfield's characters with a mask, 84,124 processor cycles
  with no interrupt, then wait ten frames (`zp_wait`). *Live*: the border
  flipped 426, 444, 461, 479, 496, 513, 530, 547 and 564 frames after the
  mine went off, 17 or 18 frames apart; message `$93` scrolled for 373
  frames, and `$95` began at frame 574.
- The Geiger clicks come every 800, 400, 200 or 100 frames at radiation
  levels 0 to 3 (`radiation_clicks`, `radiation_click_waits`). When voice
  3 is busy as a wait runs out, there is no click and the next wait is
  the opposite level's: `radiation_clicks` indexes the table with the X
  `panel_sprites` left, 3 minus the level.

## Controls

Joystick in port 2. Fire at the title starts a game (`title_sequence`); Q
alone restarts it (`check_quit_key`). *Live*: Q held for 20 frames
brought the title back with its tune.

On foot (`foot_control`), Tal's picture decides what each direction does:

- Left and right turn him one view at a time, through facing the player,
  and then walk (`foot_left`, `foot_right`).
- Up, standing sideways, jumps straight up: `foot_up` sets his direction
  to up alone. Up is tested first, so fire with it does nothing.
- Fire, walking, jumps that way; standing sideways, throws a stone when
  sprite 2 is free (`foot_fire`). After the fifth death, fire restarts.
- Down, standing sideways, crouches (`foot_down`). Crouching is how he
  picks up an add-on or a recharge cell (`tal_touches`).
- Facing the player, touching the armour climbs into it, and touching the
  teleporter beams him to the armour (`tal_touches`).

In the suit (`suit_control`): up takes off, only with the Gravity
Displacer (`suit_up`); left and right turn the suit and then accelerate it
to 3 pixels a frame sideways (`suit_left`, `suit_speed_left`). Up or
down, when the suit has no vertical speed, sets the way it moves; from
then on, with the Gravity Displacer, any direction held but the opposite
one speeds it up to 2 and the opposite one slows it (`suit_vertical`,
`suit_accel_up`, `suit_accel_down`). With the stick centred it slows
(`suit_coast`); fire, facing sideways, shoots the Pulsar Beam if it is
fitted (`suit_fire`); landed, left or right climbs out (`leave_armour`),
except in rooms `$00`-`$09`.

## Graphics

- The playfield is 16 character rows of 40 columns at the top of the
  screen, in multicolour character mode except in the 19 rooms whose
  `room_mc_colours` byte is 0 (`colour_room`). The panel is rows 17-24
  from column 4 (`draw_panel`).
- A room is 8 × 4 tiles of 4 × 4 characters in columns 4-35, with one
  column of tiles from each neighbouring room in columns 0-3 and 36-39
  (`build_room`, `draw_edge_column`). The map is 32 bytes a room at
  `$0B00`; the tiles are 16 character codes each at `$1400`.
- Each room loads its own playfield characters: `room_charset` picks one
  of nine character lists, whose runs copy shapes from the 748-shape pool
  at `$2400` and their colours from `$3C00` (`load_room_chars`). List 3
  is used by no room.
- Solidity is read from colour RAM, not from the characters: a cell whose
  colour nibble is not in `open_colours_floor` (ten colours) stops a fall
  or a rise, and one not in `open_colours_wall` (twelve) stops a walk
  (`check_floor`, `check_head`, `wall_left`). Four colours hurt
  (`hazard_colours`, `$CE2C`: 3, 4, 6, 15, costing 4, 8, 4 and 8). In the
  character lists those are the colours of the thrusting thorns (4 a
  touch), the monkey and the dragons' fire (8) and most of the machine
  gunner (4 and 8); the dragons' heads are harmless.
- The monkey, the thrusting thorns, the dragons and their fire, the
  machine gunner and the energy barrier are characters redrawn by scripts
  (`animate_tile`): eleven scripts, `$80`-`$8A`, each copying a picture of
  up to 18 characters into the playfield set at a fixed code. A dragon's
  script chains jaws, fire and jaws in a loop.
- Sprites: Tal is 0 and 1 (one above the other, side by side when he lies
  dead); the stone or the shot is 2; the empty armour 3 and 4; the room's
  creatures and items fill 7 down to 3 (`place_room_sprites`). In the
  panel band sprite 5 is the radiation meter and 6 and 7 the picture
  window (`panel_sprites`, `panel_static`, `addon_icon`).
- The two shared sprite multicolours (`$D025`, `$D026`) are 8 and 9
  while Tal is on foot (`start_new_game`, `leave_armour`, `tal_lives`)
  and 14 and 11 once he has dissolved into the armour (`dissolve_step`).
  Every multicolour sprite shows them, so the multicolour creatures
  (`$C7`, `$C8`, `$CE`, `$CF`) and the bomb-thrower change two of their
  colours when he puts it on. *Live*: the frame recorded in room `$2B`
  with the suit worn reads `$D025` = 14 and `$D026` = 11.
- A creature killed or Tal getting into the armour dissolves: its picture
  is ANDed with nine masks in turn (`dissolve_masks`, `$0800`). Creatures
  appear by the reverse (`materialise_step`).
- The panel is drawn in dark grey until the suit is first worn, then
  coloured (`colour_panel`) and flickered between hires and multicolour in
  seven stages (`panel_power_up`, `flicker_waits`, `flicker_counts`).
- The message strip, row 23, columns 15 to 25 (codes `$F5`-`$FF`, shapes
  at `$77A8`-`$77FF`), has colour 11, so once the panel is lit and in
  multicolour (`zp_panel_mc` `$10`, `panel_power_up`) each pair of bits
  of a letter shows dark grey, light blue or cyan (`$D022` 11, `$D023`
  14, colour 3). Two shifts a frame (`scroll_message`) move it one
  multicolour pixel. *Live*: the strip's 88 bytes drawn so matched a
  screenshot of the strip pixel for pixel.

## Mechanics

### Energy and lives

- Tal's energy is 0 to 31 (`zp_tal_energy`). Out of the suit he loses the
  room's radiation level, 0 to 3, every 50 frames (`energy_tick`). *Live*:
  at levels 1, 2 and 3 he lost 1, 2 and 3 points every 50 frames.
- In the suit he gains a point every 100 frames, up to 31, and cannot die
  (`energy_tick`, `check_death`). The suit's own energy does not pay for
  it; it falls only by 2 every 100 frames in room `$00`, by hazards and
  creatures, and to 0 on entering rooms `$00` or `$01` without the
  Particle Negator (`room_change`).
- The suit's energy is charged to 32 at its first activation, one point a
  frame (`panel_power_up`), and set to 31 by a recharge cell
  (`suit_drift`). *Live*: driven into the armour in room `$3F`, Tal
  dissolved into it, the panel came on after 150 frames, flickered, and
  the energy rose from 0 to 32 in about 32 frames. On the way through
  1-7 the panel queued "DANGER SUIT ENERGY LOW" before "ANTI-RAD SUIT
  ACTIVE".
- A suit at 0 energy off the ground sinks (`suit_drift`).
- Tal dies at 0 energy, on foot and on the ground (`check_death`): he
  falls, lies for 200 frames, and unless it was the fifth death his
  energy refills and he rises (`tal_lives`). *Live*: from energy 0 he lay
  for 200 frames, rose with 31, and the panel said "YOU HAVE THREE
  REJUVENATIONS REMAINING"; with four rejuvenations used, the next death
  set `zp_game_over` and queued message `$90`.

### Damage

- A creature that touches Tal takes its `enemy_damage` from his energy,
  or half of it from the suit's, a quarter with the Particle Negator, and
  then dies unless it is in `unkillable_anims` (`tal_touches`). Damage is
  4, 8 or, for the bomb, 32.
- Scenery in a hazard colour costs 4 or 8 a touch, the suit half or a
  quarter, with 25 frames between touches; nothing hurts in room `$00`
  (`scenery_hits`).
- The drops are unkillable, so one touching Tal costs 4 on every frame
  the collision is latched.
- A stone takes one hit point, a shot two; a creature's hit points are a
  quarter of its damage (`sprite_hits`, `set_enemy_stats`). The bomb's
  are never set: `place_bomb` gives it none, `reset_sprite_slots` left 0,
  so the first stone kills it. *Live*, below.

### Scoring

- The points of a creature (`enemy_points`, 10 to 30) are scored once
  when it dies by touching Tal or by a shot, and twice when a stone kills
  it (`score_kill`, which tests sprite 2's animation for the stone, `$BC`).
  An add-on is 50, a recharge cell 25, the bomb 20. *Live*, below.
- `$0697`-`$0699` is the score, in binary. `$0682`-`$0686` are five
  decimal digits, lowest first, counted up a unit at a time until their
  value (`$0694`-`$0696`) equals it (`score_digits`). `$0687`-`$068B` are
  the digits the panel shows, each rolling like an odometer towards the
  counted one (`roll_score`). *Live*, above.

### The armour and the add-ons

- `zp_armour_state` is `$00` before the first activation, `$02` when the
  armour stands empty, `$B2` when it is worn. The armour starts in room
  `$3F` at (128, 64) (`start_new_game`).
- Add-ons and recharge cells can be picked up only after the first
  activation, in the suit or crouching (`tal_touches`). Each add-on
  lights the next of four lamps on the panel, in the order picked up. The add-on's
  message plays the next time the suit is worn (`addon_message`).
- The four add-ons are in rooms `$21` (Pulsar Beam), `$06` (Particle
  Negator), `$2B` (Gravity Displacer) and `$14` (Implosion Mine)
  (`room_sprite_ptrs`).
- 19 rooms hold a recharge cell (`room_sprite_ptrs`); taking one sets the
  room's bit in `cells_taken`, so it never comes back (`tal_touches`,
  `skip_taken_item`).
- The teleporter (room `$27`) works only after the first activation, for
  Tal facing the player on foot (`tal_touches`, `teleport_to_armour`).
- Rooms `$00`-`$09` refuse to let Tal out of the suit (`leave_armour`).
- The energy barrier, character `$FF`, turns the suit back
  (`barrier_left`, `barrier_right`); on foot it is open.

### Rooms

- 69 rooms, `$00`-`$44`, each with four links (`room_links`): right,
  left, below, above, `$FF` for none. The rows of rooms `$06`-`$09`,
  `$0D`-`$12`, `$1A`-`$23` and `$29`-`$37` wrap: walking off the last
  room's right edge comes back into the first.
- Room `$32`'s link below is `$45`, which has no map. *Live*: room `$32`'s
  bottom row is solid in colour RAM from column 0 to 39.
- Radiation is a level 0-3 per room (`room_radiation`): 3 in rooms
  `$00`-`$09`, 2 in `$0A`-`$12`, 1 in `$13`-`$19`, 0 below.
- A game starts in room `$38` or `$44` by bit 0 of `zp_pass_count`,
  which counts main-loop passes from 0 at power-on; the title does not
  run the loop, so the first game always starts in `$38`
  (`start_new_game`, `room_change`). *Live*: the first game began in
  `$38`.
- A room's creatures come from its sprite list (`place_room_sprites`).
  Every drop is its list's first entry, and when its splash ends it
  materialises again where it started and falls again (`spawn_enemy`).
- A list entry after a round striped creature (`$D0`, `$D1`) waits 100
  frames more to appear, and is cancelled if the striped creature is gone
  by then (`hold_back_group`, `materialise_step`). *Live*: in room `$40`
  the recharge cell on slot 6 appeared after about 100 frames; with the
  striped creature on slot 7 killed first, it and the three creatures
  below it never appeared.
- The bomb-thrower drops a bomb only when its left half (`$C9`) is on
  sprite 7 (`place_bomber`). In room `$1E` its halves are listed the
  other way round, so it never throws. *Live*: rooms `$03` and `$3B` gave
  sprite 5 the bomb, room `$1E` only the machine gunner's bullet.

### The ending

- With the Implosion Mine fitted, the suit landing on screen characters
  `$C9`-`$CB` (row 12, columns 18-20 of room `$00`, the top of the lower
  pole) starts message `$93`, the countdown, with a wait of 50 frames
  (`check_detonation`). When the wait is over and no message is
  scrolling, the playfield's characters are dissolved in nine steps with
  the border flashing, and message `$95` plays until fire restarts the
  game (`victory_sequence`). *Live*: the suit placed on the pole in room
  `$00` with all four add-ons set the mine off, and the ending ran.
- The game ends only three ways: the ending, fire after the fifth death,
  and Q (`restart_game`'s callers). No clock limits play.

## Data tables

- **Room sprite list** (`room_sprite_ptrs`, 70 pointers): a count, then
  four bytes a sprite: X, Y, a path byte (bit 7 also X bit 8) and an
  animation. The 70th pointer, for the room `$45` that room `$32`'s link
  names, points at the empty list.
- **Animation** (`anim_ptrs`, 95, `$80`-`$DE`): frames per picture, a
  byte of colour and flags (bit 7 multicolour, 6 wide, 5 tall), then
  picture pointers and commands: 0 loop, 1 end, 2 n jump, any other byte
  a chain (`step_animation`).
- **Path** (`path_ptrs`, 50, `$80`-`$B1`): four-byte steps of direction
  bits, step sizes (high nibble across, low down; 8 or more means one
  pixel every n + 1 frames), a frame count and a command: 0 next step, 1
  chain with a new animation, 2 chain, 3 go back, any other value chase
  Tal (`path_step`, `path_chase`). `throw_stone` and `suit_fire` write the
  direction into paths `$81` and `$82` before each use.
- **Animated-tile script** (`tile_anim_ptrs`, 11): the wait, the number
  of characters, the destination, then two-byte steps; a value below
  `$0300` is a command: 0 restart, 1 n go to step n, 2 n chain to script
  n (`animate_tile`).
- **Creature table** (`enemy_anims`, 25 animations): points
  (`enemy_points`) and damage (`enemy_damage`).

## Sound

- One driver for music and effects (`music_tick`, `sound_tick`), writing
  a shadow SID that is copied to the chip whole (`copy_sid_shadow`).
- 46 tracks, `$80`-`$AD` (`track_ptrs`): notes below `$C0`, commands
  `$C0`-`$CF` duration, `$D0`-`$DF` filter preset, `$F0` hold, `$F1`
  restart, `$F2` stop, `$F3` n instrument, `$F4` a b two durations added
  (`track_command`). Tracks `$95` (the typing click) and `$9B` (the power
  centre's drone) restart; all others stop. Only `$9B` uses a filter.
- The title tune is three parts of three tracks: `$80`-`$82`, `$83`-`$85`,
  `$86`-`$88` (`title_tune_part1`-`3`). The panel's power-up tune is
  `$8F`-`$91`, the ending's `$A8`-`$AA`, the rejuvenation's `$A3`-`$A5`.
- 71 instruments of twelve bytes (`instrument_ptrs`): attack/decay,
  sustain/release, waveform and pulse width, an effect delay, effect
  flags, and three phases of an amount and a length for note steps, pulse
  sweeps or pitch slides (`load_instrument`, `voice_effects`).
- 16 durations, 3 to 768 ticks (`durations`).
- `note_freqs` holds 192 frequencies a quarter tone apart; a note n plays
  entry 2n. Entry 114, the note byte 57, is `$1C31`: 440 Hz on an NTSC
  machine and about 424 Hz on a PAL one, so on a PAL C64 every note sounds
  about two thirds of a semitone flat.
- While the suit is first activated, requests start only when voice 1's
  is one of `activation_tracks` (`$8C`, `$8F`, `$92`), and then the other
  voices' requests start with it; every other sound waits
  (`start_requests`).
- Effects are asked of voice 2 (`play_effect`) unless the power centre's
  drone is playing; voice 1 has Tal's footsteps and the suit's hum, voice 3
  the Geiger clicks and the typing (`anim_sounds`, `suit_sound_fast`,
  `radiation_clicks`, `scroll_message`).

## Quirks

- `scenery_hits` loads 0 at `$A483` and overwrites it with the stone's
  frame wait (0 to 2) before storing it in the stone's path, the scenery
  latch and the throw flag. The path and the flag still read as off, but
  a 1 or 2 left in the latch is taken on the next pass as Tal touching scenery, which
  costs energy only if a hazard is beside him.
- A touch of the scenery can be lost. `scenery_hits` reads `zp_bg_hits`
  at `$A44C` and `$A490` and stores 0 there at `$A4AE`, and a collision
  that `latch_bg_hits` keeps between the read and the store is cleared
  without being looked at, so that touch costs nothing. Whether it happens
  depends on where the main loop, which runs with no wait, is in its pass
  when the collision's interrupt comes. *Live*: on the Maps page's route
  in room `$14`, VICE found sprite 0's touch at `$A44C` on line 136, and
  it cost 4 points; on the kit's machine as it took interrupts before
  #525 and #556, the interrupt for the same touch came at `$A4AC` and the
  touch was cleared. The kit's machine since then takes it as VICE does.
- Instruments 0 and 3, paths `$8F`, `$97`, `$A0` and `$A5`, and character
  list 3 are never used.
- Nothing clears `zp_throw` (`$7C`) when a game starts. `foot_fire`
  sets it when Tal throws (`$931A`, `$932F`), and it is cleared only when
  the stone goes: off the screen in `move_left` and `move_right` (`$992C`,
  `$998C`, `$99F0`), on the scenery in `scenery_hits` (`$A48D`) and at
  `$A62D`. On a machine that has just loaded the game it holds `$C9`, the
  `CMP` of the routine BASIC's start-up copies from `$E3A2` to `$0073`
  (`kit/skills/c64/c64-reference`). Bit 7 set reads as a throw asked
  for, so until Tal's first stone has gone, `throw_stone` copies Tal's X
  high bit into the stone's on every pass of the main loop (`$A3BE`-
  `$A3CD`: `lda spr_xhi`, `and #$FB`, `sta spr_xhi`, `asl`, `asl`,
  `and #$04`, `ora spr_xhi`, `sta spr_xhi`). A room exit at the side,
  which the raster interrupt makes in `move_right` (`$99F9`) or
  `move_left` (`$9995`), sets Tal's X and his two high bits; one taken
  after `$A3BE`, `$A3C1` or `$A3CA` is undone by the store that follows.
  Going right Tal is then at X 306, past the edge, and leaves the new room
  too; going left he is at X 44. *Live*, below.

## The listing's error rate

One sample, seed 20261024, drawn from 869 comments in two strata: 306
written by hand and 563 written by scripts from the records' bytes (the
room lists, animations, tracks, character lists and tables). 80 were
drawn, 60 from the first and 20 from the second, and checked by one
checker on claude-opus-5-5[1m] with `kit/skills/core/60-verify/checker.md`.
Every verdict of wrong was read against the code: all fifteen held, 13
of the 60 written by hand and 2 of the 20 generated. The plain rate is
15 of 80, 18.8 % (95 % interval 11.7 % to 28.7 %); weighted by the
strata's sizes, about 14.1 %. Both are over the mark and are a lower
bound on the true rate. None was wrong outright; each was wrong in a
detail: a variable given one user where it has several (`$0085`); a byte
given the wrong meaning (`$02A8`, the slot's materialise target, taken
for Tal's type in `$8E43`, and `$0215`, the sprite enable, for
multicolour in `$961D`); the activation's hold on the sound taken to stop
the other voices' tracks, which start with voice 1's (`$00A0`, `$C605`,
with `$BF7A`); a test of one direction taken for a test of the other
(`$95B6`, with `$9595`); the Geiger counter's wait when voice 3 is busy
(`$ACA8`, with `$06B4`); the title scene's waits and its fire test
(`$815D`) and where the credits' sprites cross (`$8386`); fire with no
direction left out of the foot controls (`$909C`); character list 3's
runs (`$3F39`); an index register (`$C52A`); a voice's byte offset taken
for its number (`$B24B`); and two generated sentences, that every listed
creature materialises with the room, where those after a striped
creature wait (`$CC15`, in seven room lists), and that a splash ends its
sprite, where the drop falls again (`$FF97`, in all three splashes and in
`$9F0D`). The shared sprite multicolours were called sprite colours in
four comments as well. All fifteen were corrected, with the 14 other
comments that said the same.

Checking the Discoveries page's room `$40` widget against the game
running found one more comment short of a detail, outside the sample:
`hold_back_group` (`$8810`) gave the wait of the creatures held back by a
striped one as 100 steps, without saying what a step is. It now says 100
frames, counted down once a frame by `materialise_step` from
`sprite_effects`, and is recorded as a `port` step in `game.json`.

## Live tests

All on VICE v3.13.2, PAL, from `work/play-start.vsf` (the first screen of
play) with `kit/c64/vice.py`, poking state at the top of the main loop and
running whole frames.

- Non-stopping checkpoints for 500 frames: `count_timers` 500,
  `tal_control` 500, `main_loop` 16,731, `irq_handler` 2,938.
- Radiation: `zp_radiation` set to 1, 2 and 3 with Tal on foot; his
  energy fell by that much every 50 frames for 500 frames.
- Score: panel on, binary score set to 123; `$0682` reached 3, 2, 1 at
  frame 492, `$0687` one roll behind it throughout.
- Radiation meter and lamp: levels 3 to 0 showed meter pictures `$70` to
  `$73` on sprite 5 at (241, 194), green; the lamp at row 22, column 27
  was `$C0` only at level 3.
- Deaths: energy 0 gave the lying picture, 200 frames, a refill and
  message `$8C`; with `zp_rejuv` at 4 the death set `zp_game_over` and
  message `$90`.
- Q: the title and its tune came back; without Q, play went on.
- Bombs: rooms `$03`, `$07` and `$3B` put the bomb on sprite 5; room `$1E`
  never did.
- Room `$32`: colour RAM row 15 solid in all 40 columns.
- The suit's first activation, from Tal placed at the armour facing the
  player in room `$3F`: state `$B2` at once, panel on after 150 frames,
  power-up stages, the suit charged to 32, messages `$8A` then `$84`.
- Room `$40`: the held-back recharge cell appeared about 100 frames in;
  with the striped creature on slot 7 dissolved first, it never did.
- Cheat: `$8ACB`/`$8ACC` patched to `sbc #$00` with `zp_radiation` at 3;
  Tal's energy stayed at 31 for 500 frames, against 31 to 1 without it
  (`cheats.md`).
- The ending: the suit on the pole in room `$00` with the add-ons set,
  countdown, dissolve and message `$95`; read a frame at a time, the
  timings under "Timing". Message `$84` ("ANTI-RAD SUIT ACTIVE"), queued
  by the suit's power-up the test had set going, scrolled during the
  dissolve.
- Room `$03`, Tal on foot: the bomb on slot 5 with 0 hit points and 20
  points. A stone (sprite 2, animation `$BC`) placed on it each frame
  started its dissolve on the first frame of contact, hit points 255, and
  the binary score rose by 40; a Pulsar Beam shot (`$BE`) in the same
  place left 254 and scored 20.

From `work/entry.vsf`, the game's start, on the same VICE, with the
Maps page's route replayed a stick read at a time: stopped at each read
of `$DC00` in play (`foot_control` `$909C`, `suit_control` `$9383`) and
given the stick the kit's machine read there.

- At the start, `$007C`-`$008F` held `$E3AB`-`$E3BE` of the KERNAL ROM
  (901227-03) byte for byte; `$7C` was `$C9`. In the kit's machine's
  first 700 frames from `$8009` the game read nine bytes the listing does
  not carry before writing them: `$32` (`$08` in VICE), `$69` (`$8C`),
  `$7C` (`$C9`), `$7D` (`$3A`), `$87` (`$38`), `$8C` (`$4F`), `$8E`
  (`$52`), `$0358` (`$AD`) and `$035B` (`$90`).
- With no stone thrown, Tal walking right out of room `$3E` at X 292 was
  in room `$40` at X 54 at the next read, seven frames later. With `$7C`
  set to 0 after the snapshot was loaded, the same reads took him into
  `$3F`, and every read matched the kit's machine started with all nine
  at 0 for 528 reads.
- The route as the Maps page draws it, found on the kit's machine with
  interrupts taken inside handlers: of its 1,954 reads, all but 20 were
  the same in VICE as on that machine. The 20 come in a row from the
  1,465th, in rooms `$14` and `$15`, where VICE's Tal had 4 points less
  energy, from the touch of the scenery that machine lost (Quirks). His
  energy ran out on the same read in both, and every read after it was
  the same. The kit's machine since #525 and #556, given the same reads,
  has Tal's energy as VICE had it at those 20; from the 1,187th read to
  the 1,267th, in room `$09`, it has the suit's energy 2 points lower
  than the machine before, from a touch of the scenery that machine did
  not raise, and whether VICE raised it is not known. With the stick
  held as the route holds it after the last read, the mine had gone off
  (`zp_victory` `$80`) five frames later, and the last message (`$95`)
  had come 615 frames after the read, with the score at 1,080 and the
  game not over.

