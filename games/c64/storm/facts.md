# Storm — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The disk (`orientation.md`) holds four programs: the boot file
  `storm` ($0300-$0429), the loader `storm-a` ($C000-$C0FE), the game
  `storm-b` ($0800-$897F) and David Whittaker's music and sound driver
  `storm-c` ($9000-$99C7). Nothing names a version.
- The title's scroller (`msg_credits`, $83DA) reads `..STORM.. (C)
  MASTERTRONIC LTD. 1986 WRITTEN BY THE FIRM CONVERTED BY J.BAGULEY.
  MUSIC AND SOUND FX BY DAVID WHITTAKER.`
- `storm-c` is the file HVSC and CSDb list as `Storm` by David Whittaker
  (init $9000, play $911B): `music_init` and `music_play` are those
  addresses.
- The game is one load: nothing is read from the disk after the loader
  jumps to `entry` ($75AC). `entry` jumps to `title`.
- The game keeps the ROMs in: `$01` is `$37` throughout play, and the
  raster interrupt comes through the KERNAL's IRQ handler and `$0314`
  (`game_init`). `game_over` banks the character ROM in briefly, with
  interrupts off, to copy letters from it.

## Memory layout

| Thing | Where |
|---|---|
| Play area character set (256 characters, multicolour) | `$0800-$0FFF` (`charset`) |
| Wall, floor and shot patterns | characters 0-`$11` and `$12-$31` (`charset`, `chars_floor`) |
| The players, built over the background as they move | `$32-$39` Storm, `$3A-$41` Agravain (`chars_b`, `chars_a`) |
| The room's objects, generators and monsters | `$42-$81`, `$82-$9F`, `$A0-$EF` (`chars_objects`, `chars_generators`, `chars_monsters`) |
| The two shots | `$FE` (Agravain's) and `$FF` (Storm's) |
| Room tables: walls, exits, objects, generators, floor, descriptions | `$1000-$471B` (`wall_ptrs`, `exit_bits`, `obj_ptrs`, `gen_ptrs`, `floor_ptrs`, `room_msgs`) |
| The map, 16 by 12 places | `$471C-$47DB` (`room_map`) |
| Object pictures and pointers | `$47DC-$4E63` (`obj_shapes`, `shape_00`-`shape_1b`) |
| Players', monsters' and generators' pictures | `$4E82-$5631` (`shape_storm` ... `shape_kind5`) |
| Sound effects | `$5632-$591A` (`sfx_start`, `sfx_records`) |
| Game code | `$591B-$80F5` |
| Variables, messages, title text, screen rows, colours | `$8106-$860B` |
| Player records, generator and monster tables, save buffers | `$860C-$87CD` |
| Floor masks | `$87CE-$88D5` (`floor_masks`) |
| Unreferenced to the file's end | `$88D6-$897F` (`unused_88d6`) |
| Music driver, tune and data | `$9000-$99C1` |
| Screen | `$0400` (rows 0-4 the panel, row 5 the message line, rows 6-23 the play area) |

## Timing

- **The raster interrupt.** `irq` ($7D80) runs four routines a frame
  from `irq_list`: `message_band` at line `$58` (the message line's
  background and fine scroll), `play_band` at `$60` (the play area's
  character set and colours, and `sfx_update`), `frame_mark` at `$E8`
  (sets `frame_flag`) and `panel_band` at `$FF` (the panel's ROM font,
  the music on the title, and the message scroller).
- **A pass of play** (`main_loop`, $78D7) waits for the frame twice
  (`wait_frame`), so it takes at least two frames; in room 0 with six
  monsters out it took 2.6 (*live*: 384 passes in 1,000 frames, with a
  checkpoint on `panel_band` as the control).
- Players' controls run every other pass (`pass_count` bit 0); one
  monster moves each pass, in turn (`move_monster`), so each of ten
  slots moves once in ten passes; an empty slot costs a busy wait
  (`delay`) so a pass takes about as long with fewer monsters.
- **Spawning**: one try every 50 passes (`spawn_period`), from each
  generator in turn (`spawn`).
- **Hunger**: every 25 passes (`phase` counts 1-5, `hunger_timer` 0-5),
  2 from Agravain's energy and 1 from Storm's (`main_loop`). Measured
  *live* at about every 1.3 seconds with six monsters out.
- Turning is limited to once every two passes (`turn_delay`, `joystick`).
- The tune: one tick every 5 frames (`music_play`, operand `$9147`); the
  whole tune is 640 ticks, so it loops every 3,200 frames (64 seconds at
  50 frames a second).
- Game over waits 150 frames or for fire (`game_over`); a dying player's
  border flash lasts 80 frames (`player_dies`); finding Corrine holds
  the screen for 1,280 frames, five waits of 256 (`enter_room`).

## Controls

- Agravain (player A) is joystick port 1, read from `$DC01` (`load_a`);
  Storm (player B) is port 2, read from `$DC00` (`load_b`). A one-player
  game is Agravain (`game_init`: player B's energy is 0).
- Left and right turn a quarter turn; up walks one cell forward
  (`joystick`, `walk`). Fire without down shoots when the player's shot
  is not in flight (`control`).
- Down and fire: Agravain casts a scroll, Storm an amulet. Down alone:
  Agravain casts a mask; Storm's down alone does nothing (`joystick`).
- On the title, fire on either port starts; left on either port picks
  one player, right two; up asks for the instructions, down skips them
  (`title`).
- **Reset and RESTORE**: a CBM80 cartridge signature at `$8000`
  (`cbm80`) sends a reset that keeps the RAM to `restart`, which goes
  back to the title (*live*: a soft reset from play reached `restart`
  and `title`). RESTORE goes to `nmi` ($80DE), which only acknowledges
  CIA 2 (*live*: one `nmi` entry, and play went on).

## Graphics

- No sprite is ever enabled (`game_init` writes 0 to `$D015`): every
  figure is built from characters. `compose` builds each actor's
  characters from its picture, ANDed with the floor's mask
  (`floor_masks`) and ORed with the background character, so floor
  decorations stay in front; `put_actor` and `put_block` place them.
- The screen is three bands (`orientation.md`): the panel in the ROM
  font on red, the message line on blue scrolled by `msg_scroll`, and
  the play area in the game's character set on black, multicolour, with
  colours 8 and 7 shared (`game_init`).
- The play area is 18 by 18 cells, a cell being two columns by one row
  (`cell_address`, `row_addr`). Walls are one cell, floor pieces 2 cells
  by 2 rows, objects 2 to 4 characters by 2 rows (`draw_object`), players
  4 characters by 2 rows, monsters 3 or 4 characters by 2 rows
  (`draw_kind1`-`draw_kind6`).
- `compose` finds a background character's mask at (character - `$11`)
  x 8 in eight bits, so character `$31`, the corner of the floor piece
  `$2A` that 32 floor records in 23 rooms place, wraps to the first
  mask, all `$FF`: an actor over it is not masked, and where its pixels
  meet the decoration's the colours mix. Character `$12`'s mask has its
  rows 3 and 4 swapped (`floor_masks`).
- The title and the instruction pages draw over the first room; the
  instruction pages use a copy of the ROM's capitals in characters
  `$A0-$D9` (`copy_rom_font`, 458 bytes: characters 0-`$38` and the top
  two rows of `$39`).
- `game_over` writes GAME  OVER (two spaces) from the character ROM into
  characters `$32-$3B`, the players' own, and prints them in white.

## Mechanics

**Energy and death.** Agravain starts with 2000 energy, Storm with 2500
(`game_init`), four decimal digits. `lose_energy` takes the drain
(monsters' touches, and the hunger toll) from the player in the work
copy: armour first (below), then the energy; below zero the player dies
(`player_dies`). Under 1000 the first warning, under 500 a second
(`AGRAVAIN IS ABOUT TO DIE..` or `STORM NEEDS FOOD BADLY`, sound 14),
each once until the energy is back at 1000. The game ends when every
player is dead (`main_loop`).

**Armour.** Each piece adds 2 to Agravain's armour or 3 to Storm's while
the armour is 9 or less (`obj_effect` compares it with `$0D`, which in
decimal lies between 9 and 10), so Agravain's stops at 10 or 11 and
Storm's at 10, 11 or 12, depending on where wear has left it. When the
armour is greater than a drain, nothing is lost and the armour stays;
otherwise the armour falls by one and the drain less the new armour is
taken (`lose_energy`). So Storm's first piece, and Agravain's second,
make them immune to hunger, which drains 1 and 2 (*live*: armour 4 held
Agravain's energy at 1968 for 500 frames; armour 2 fell to 0 within
them).

**Monsters' touches.** A monster stepping into a player charges four
times its kind, added in decimal mode (`mon_damage`, `touch_damage`). The
kind byte also holds the animation of kinds 2, 4 and 5, so the damage
depends on the frame (*live*, the routine run in the emulator on each
value):

| Kind | Damage per touch |
|---|---|
| 1 | 4 |
| 2 | 8, or 30 on alternate steps |
| 3 | 12 |
| 4 | 16, or 38 on alternate steps |
| 5 | 20, 60, 1 or 41, by frame |
| 6 | 24 |

**Monsters and generators.** A room has up to five generators
(`draw_generators`), each with five hits (`gen_hits`). Every 50 passes
the next standing generator puts a monster of its kind into the first
free slot of ten, in the first free space above, right of, below or left
of it (`spawn`), while fewer than ten are counted out (`mon_count`).
Hit points: kinds 1-3 have their kind, kinds 4-6 their kind less two
(`spawn`). A monster walks one cell toward Agravain, or toward Storm in a
two-player game when he is nearer, up or down first (`move_monster`,
`step_monster`). A shot takes a hit point from a monster (1 point when
it dies, sound 7) or a hit from a generator (`shot_hit`); a destroyed
generator comes back when the room is entered again (the room tables do
not record it).

**Magic.** A scroll (Agravain) or an amulet (Storm) clears the monster
slots from slot 0 up to `mon_count` and sets `mon_count` to 0; a mask
(Agravain) removes every generator in the room (`joystick`). The item is
used up even when there is nothing to destroy, and the counters of
scrolls, amulets and masks are shared by the two players.

**Objects.** Each room has up to eight (`draw_objects`). Class 1 is
taken or opened when walked into, class 2 is solid, and any other class
is a cabbala symbol that springs a trap (`touch_object`). Taking: food
adds 200 energy, restorative fluid 500, a chest 1000 points, armour as
above; scrolls, amulets, masks, keys, special keys and snake brooches
are counted (`obj_effect`). Other class-1 objects vanish to no effect.
Doors: type `$0D` takes a key (used up); `$0F` needs special key 7 and
`$1A` special key 8 (neither is used up); `$1B`, the laboratory door in
room 3, needs three brooches (`touch_object`). A refused door plays sound
0 and its message.

| Object | In the rooms |
|---|---|
| Keys / doors that take one | 10 / 10 |
| Special keys 7 and 8 / their doors | room 92 and room 11 / rooms 77 and 46 |
| Snake brooches to take | 3 (rooms 11, 44 and 63); room 32's is solid |
| Chests | 8 |
| Food / restorative fluid / armour | 42 / 7 / 20 to take |
| Scrolls / amulets / masks | 19 / 6 / 11 |
| Cabbala traps | 47, in 44 rooms (4 of them fake food in room 97) |

**Traps.** `trap_fire` erases every wall of the room whose kind has bit
2 set and every object flagged the same way, and marks them in the room
tables, so they stay gone until the next game (`reset_walls`,
`reset_objects` in `game_init`). The walls such a wall covered are put
back from `door_cells`.

**Rooms.** 100 rooms on a 16-by-12 map (`room_map`, BCD numbers). The
game starts in room 0 (place `$46`). Leaving by a side moves one place
on the map, by the top or bottom sixteen (`edge_check`, `room_exits`).
In a two-player game the room changes when every living player has
left; the first to leave closes every other doorway of the room behind
him (`edge_check`, `THE FIRST PLAYER TO LEAVE CLOSES ALL OTHER DOORS`).
Each room's description scrolls on the message line on entry, up to 80
characters, and again whenever another message ends (`panel_band`).

**The end.** Room 99 is Corrine's, reached only through the laboratory
door at room 3's left doorway. Entering it shows `!!!! YOU HAVE FOUND
CORRINE SHE IS GLAD TO SEE YOU WELL DONE !!!!`, plays sound 14 six
times, and goes back to the title (`enter_room`). No score or bonus is
added (*live*: room 99 entered from play, the message, six starts of
sound 14, and `title` 1,280 frames later).

**Between games.** `game_init` puts back every room's walls and objects
and resets energies, scores, armour and warnings, but not the counters
of keys, special keys, brooches, amulets, masks and scrolls: they carry
over from one game to the next (*live*: counters poked to 7 keys, 2
brooches, 5 scrolls before a game over were the same in the next game).
The file was saved with 3 keys and 2 scrolls in them, so the first game
after loading starts with those.

## Bugs and oddities

- **Magic misses monsters.** A scroll or amulet clears slots 0 up to
  `mon_count` only, so after a monster in a low slot dies, a monster in
  a higher slot survives the spell, while `mon_count` is set to 0
  (`joystick`). *Live*: with slot 0 shot, a scroll left slot 5's monster
  walking and `mon_count` 0.
- **The count goes below zero.** Shooting a survivor before another
  monster appears takes `mon_count` from 0 to 255 (`shot_hit`), and
  `spawn` then makes no more monsters in that room until it is entered
  again (*live*: no monster for 1,500 frames with the generator
  standing). A scroll or amulet cast then loops over 255 slots, erasing
  "monsters" from bytes past the tables, at addresses computed from them
  (`erase_monster`): *live*, it wrote over the panel and the play area,
  and the game froze, the main loop never running again and the raster
  interrupt firing about a hundred times a frame.
- **Brooches carried over can lock the laboratory.** The laboratory
  door opens only when `brooches` is exactly 3 (`touch_object`, `CMP
  #$03` at `$6B41`), and the counter carries into the next game (above).
  A game that starts with brooches from the last one and picks up enough
  to pass 3 can never open the door, and nothing but loading the game
  again resets the counter. *Live*: in room 3 with `brooches` 4, walking
  into the door showed `THREE SNAKE BROACHES ARE NEEDED TO OPEN THIS
  DOOR` and the player stopped; with 3, the door opened and he walked
  through.
- **A spawn records direction for the wrong slot.** `spawn` clears
  `mon_dir` at the generator's index, not the new monster's ($5E97).
- **Room 69's description** is 60 characters with no zero after it, so
  the message line runs on into room 70's: `...BECOMES CLOYINGDRIED BLOOD
  CLINGS T` (*live*). Nine more descriptions (rooms 14, 30, 46, 48, 54,
  63, 92, 96 and 98) are exactly 80 characters with no zero, which the
  80-character limit hides.
- **The border takes the last wall's style.** `draw_border` draws with
  the character and colour `draw_walls` left behind, those of the room's
  last wall record; rooms 37 and 81 mix two styles, and their border
  takes the second.
- **The title tune can drop a block's colours.** The tune's driver runs
  in `panel_band` while `title_mode` is set and keeps its pointers in
  `$02-$05`; `$03`/`$04` is also where `cell_address` leaves the colour
  RAM address of the block `put_block` is drawing. When the interrupt
  falls in the middle of a block, the rest of the block's colours go
  through the tune's pointer, to RAM the game does not use, and those
  cells keep the colours they had. *Traced*: `test_play.js` hooks the
  two colour stores (`$6481`, `$7C76`) and counted 8 such stores in
  40,000 passes, every one with `title_mode` set.
- **Unused**: sound effect 5; the flags `sfx_unused_1` and
  `sfx_unused_2`; `gen_phase`, `mon_phase` and `$812C-$812E` (written,
  never read); arpeggios `$C2`-`$C4`, `$C6` and `$C9`-`$CD`; the tune's
  slide and stop commands; three pictures nothing points at
  (`shape_spare_1` to `shape_spare_3`); characters 8-`$10` and
  `$F0-$FD`.
- **The file was saved after play**: room 0's walls are marked removed
  and its key and trap taken, `door_cells` holds four entries and
  character `$FE` holds a bullet. `game_init` puts the rooms back.

## Data tables

- **Walls** (`wall_ptrs`, lists from `$10C8`): up to ten 3-byte records a
  room, ended early by a zero: x and y (nibbles), length and direction
  (nibbles: 1 right, 2 down in the data), and the style and kind (bits
  4-6 the style, first character style x 2 + 1; bits 0-3 the kind, 4 for
  a wall a trap removes; bit 7 removed).
- **Exits** (`exit_bits`): a nibble a room, bit 3 top, 2 bottom, 1 left,
  0 right.
- **Objects** (`obj_ptrs`, from `$1895`): up to eight records: x and y;
  type (bit 7 taken); class (high nibble) and flag (bit 2: a trap
  removes it).
- **Generators** (`gen_ptrs`, from `$1F56`): up to five records: x and y;
  look (high nibble, 1 or 2) and monster kind (low nibble); a zero byte.
- **Floor** (`floor_ptrs`, from `$2517`): up to five records: x and y;
  piece (`$27`-`$2A`); count and direction.
- **Descriptions** (`room_msgs`, from `$2A16`): ASCII capitals ended by a
  zero.
- Every list lies one after another in room order, as `reset_walls` and
  `reset_objects` assume (checked for all 100 rooms).

## Sound

- **Music** (`storm-c`): a three-voice driver with patterns of notes and
  commands (`voice_tick`): bytes below `$80` are notes from `freq_table`
  (95 semitones), `$80-$93` commands through `cmd_table`, `$B8-$BF` the
  tempo, `$C0-$CF` arpeggios (`arp_table`), `$D0-$DF` an envelope and
  `$E0-$FF` note lengths. Each voice has an order list of pattern
  addresses (`tune_orders`), ended by a zero word that loops it.
- The tune: an intro of 128 ticks (`bass_intro`, `chime_intro`,
  `pad_intro`), then eight times a four-bar cycle of A minor, F, C and G
  (`bass_a`-`bass_g` under `chord_a`-`chord_g`, the chords as
  arpeggios), with a melody in four-bar phrases on voice 3 (`tune_1`,
  `tune_2`, `tune_3`). It plays only on the title (`panel_band`, while
  `title_mode` is set) and stops when play begins (`music_stop`).
- **Sound effects** (`sfx_start`, `sfx_update`): fifteen 20-byte records
  on voices 1 and 3, stepped from `play_band` once a frame. Effects:
  0 a locked door, 1 leaving a room, 2 armour or a chest, 3 food,
  4 an amulet or a scroll, 6 a shot, 7 a monster or generator destroyed
  or magic cast, 8 a mask, 9 a brooch, 10 a death, 11 a trap, 12 a key,
  13 fluid, 14 the warnings and Corrine; 5 is never started.

## Hardware register census

| Register | What the game does with it |
|---|---|
| `$D011` | blanks the screen while a room is drawn and turns it on at the top of the next frame (`enter_room`); waits for a frame by its bit 7 (`$788E`); raster compare's high bit |
| `$D012` | raster lines of the four interrupts (`irq`, `game_init`); read as a random seed and frame wait (`clear_screen`, `restore_bg`, `title`) |
| `$D015` | 0: no sprites (`game_init`) |
| `$D016` | multicolour text; the message line's fine scroll (`message_band`, `play_band`) |
| `$D018` | `$15` the ROM font for the panel, `$13` the game's set at `$0800` for the play area (`panel_band`, `play_band`) |
| `$D019`, `$D01A` | raster interrupt on and acknowledged (`game_init`, `irq`) |
| `$D020` | border: black in play; flashed by `player_dies` |
| `$D021` | background per band: red panel, blue message line, black play area |
| `$D022`, `$D023` | the shared multicolours 8 and 7 (`game_init`) |
| `$D000-$D1FF` (character ROM) | read with the ROM banked in: GAME OVER's letters (`game_over`), the font for the instructions (`copy_rom_font`) |
| `$D400-$D418` | the music driver (all three voices) and the sound effects (voices 1 and 3, `sfx_start`, `sfx_update`, `sfx_stop`) |
| `$D800-$DBE7` | colour RAM, written by `put_block` and the text routines |
| `$DC00`, `$DC01` | joysticks: port 2 (Storm) and port 1 (Agravain) |
| `$DC0D`, `$DC0E`, `$DD0D`, `$DD0E` | timers stopped and interrupts acknowledged (`game_init`, `setup_vectors`, `restart`, `nmi`) |

## Strings

All text is ASCII capitals, turned into screen codes as it is printed.

| Where | What |
|---|---|
| `$8155-$8493` | the 18 messages of play and the title's credits (`msg_food` ... `msg_corrine`), each ended by a zero |
| `$8494-$856F` | the title's and the menus' lines and the panel's labels (`txt_title` ... `txt_player`) |
| `$6EF7-$7481` | the twelve instruction pages (`ins_text`), `$0D` a new line, `$00` a page end, `$FF` a picture |
| `$2A16-$471B` | the 100 room descriptions (`desc_00` ... `desc_99`) |

## The listing's error rate

Seed 20261014, population 1,109 comments: 581 written by hand and 528
generated from the room tables (each room's walls, objects, generators,
floor pieces and description). A sample of 60 hand-written and 20
generated comments was checked against the bytes by an agent that wrote
none of them, on claude-opus-5-5 (`work/reports/`): 8 were wrong in a
detail, 10.0 % (Wilson 95 % interval 5.2 % to 18.5 %; 7.0 % weighted by
the strata's sizes, the hand-written 8 in 60 and the generated none in
20), a lower bound on the true rate, since a checker misses some. What
was wrong: compose's mask was described as (character - `$11`) x 8 where
the product wraps in eight bits, so character `$31` takes the first mask
(in `compose` and `floor_masks`, which also undercounted the pixels
character `$12`'s swapped rows disturb); the random byte of a sound
effect was said to be added to voice 1's start frequency, where it goes
to the high byte; `spawn_down` was said always to leave the row below
plus two; compose's count across was given in cells, where it is
characters; `drain_a` was called the energy lost, where it is the damage
before armour; `mon_dir` was said to hold only steps, where `spawn`
stores 0 at the generator's index; and the vibrato's scaling was given
per 24 notes below `$60`, where it is per 12 notes below `$30`. All 8
were corrected, with the comments that said the same: `drain_b`,
`drain`, `armour_a` and `obj_effect` (armour stops at 10 or 11 for
Agravain, as the test against `$0D` is a decimal one), and `sfx_reset`
and `sid_clear` (24 registers, not 25), which the checker noted outside
the sample.

## Live tests

All in VICE x64sc (vice-mcp v3.13.2) from `work/play-1p.vsf`.

- Armour: `armour_a` poked to 4, then 2, then 0, 500 frames each:
  energy 1968 unchanged at 4; armour down to 0 and energy 1955 at 2; 1939
  at 0.
- Pass rate: checkpoints on `main_loop` and `panel_band`, 1,000 frames:
  384 passes, 1,000 frames.
- Carry-over: keys 7, special keys 1 and 1, brooches 2, amulets 1, masks
  1, scrolls 5 poked, energy 1, run to `game_over` and `title`, a new
  one-player game started with the joystick: all the counters unchanged.
- Magic: a shot started beside monster slot 0 killed it through
  `shot_hit`; a scroll cast with the joystick then left slot 5 alive and
  `mon_count` 0; the survivor kept moving.
- Count below zero: the survivor shot the same way before another
  appeared: `mon_count` 255, no spawn in 1,500 frames. A second scroll:
  screen garbage, `main_loop` never reached in 1,000 frames, `irq` 105,131
  times.
- Room 69's description: `msg_ptr` pointed at `desc_69`: the message
  line showed `CKLY BECOMES CLOYINGDRIED BLOOD CLINGS T` and stopped at
  80 characters.
- Damage: `mon_damage` run at `$C000` with `mon_kind` 1, 2, `$82`, 3, 4,
  `$84`, 5, `$15`, `$25`, `$35`, 6: 4, 8, 30, 12, 16, 38, 20, 60, 1, 41, 24.
- Corrine: stopped at `main_loop`, `map_index` set to `$55` and the
  program counter to `enter_room`: room 99 drawn, `HAVE FOUND CORRINE SHE
  IS GLAD TO SEE` on the message line, `sfx_start` six times and `title`
  once in the next 1,300 frames, `main_loop` never.
- RESTORE (VICE's RESTORE key): one `nmi` entry, 38 passes in the
  next 100 frames. Soft reset: `restart` and `title` once each, the
  title on screen.
