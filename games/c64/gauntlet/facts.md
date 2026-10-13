# Gauntlet — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/play-level1.vsf`, the snapshot named in
`orientation.md`.

## Build

U.S. Gold's Gauntlet for the C64, 1986, programmed by Gremlin Graphics
(the credits screen: Bob Armour, Kevin Bulmer, Bill Allen and Dave
Partington, Stu Gregg and Jason Perkins, music by Ben Daglish). The image
is a GCR image of one disk side with 144 files in a plain directory
(`orientation.md`). The play program, `GAUNTPROG $8000`, loads seven more
files itself (load_files, file_names): PINN232 5000, PLYRS.SPR, OBJDIS,
DITTIDATA 146, DATATREASURE 446, PLAYER-$E000 and GAUNT CHR $4800; and one
level file per level (load_level_file). All loads go through the KERNAL
(irq_kernal hands the interrupts back first, irq_install takes them
again).

The disk holds 128 level files, `LEVEL 001` to `LEVEL 128`, each loaded
to `$0A00`. Every one of them carries `$1E00` as its own load address; the
game loads with secondary address 0 to the address in file_loads
(`$9939`), so the files' own address is never used. "INSERT SIDE 2 OF DISK / THEN PRESS SPACE BAR / TO CONTINUE
GAME" is in the program at `$A693` (unused_side2), with code that would
wait for it, but nothing in the traced code reaches it (`opcodes.py
--refs`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page, stack, KERNAL vectors | `$0000`-`$03FF` (runtime) |
| Monster table: X, Y, kind/strength, flags, Death's drain | `$0400`, `$04C0`, `$0580`, `$0640`, `$0700` (up to 192 entries) |
| The level file as loaded | `$0A00`-`$0BFF` |
| Tile grid, 32 x 32 (a tile is 2 x 2 characters) | `$0C00`-`$0FFF` |
| DATATITLE, the title music, left by the selection program | `$1000`-`$11FB` |
| PINN232: the developers' cable link, never called | `$1388`-`$1572` |
| Copies of the heroes' shot shapes | `$1800`-`$1FFF` |
| Colour map and character map, 64 x 64 each | `$2000`, `$3000` |
| Two screens (double-buffered) | `$4000`, `$4400` |
| Three maze fonts (multicolour) | `$4800`, `$5000`, `$5800` |
| Panel and message font (hires) | `$6000`-`$67FF` |
| Sprite shapes `$A0`-`$BF` (masks, digits, rock, clouds, fireball) | `$6800`-`$6FFF` |
| Each player's hero shapes `$C0`-`$DF` and `$E0`-`$FF` | `$7000`, `$7800` |
| The game program | `$8000`-`$CFFC` |
| Music player (PAL-tuned) and its state | `$E000`-`$E6E0` |
| Treasure-room tune (for the tune player) | `$E800`-`$E9BD` |
| Level jingle (for the music player) | `$EA00`-`$EA98` |
| Sound effects: table and streams | `$F000`-`$F3EA` |
| Tile characters and tile colours | `$F400`-`$F5FF`, `$F600`-`$F7FF` |
| Hardware vectors (NMI `$827F`, IRQ `$8268`) | `$FFFA`-`$FFFF` |

The machine runs with `$01` = `$35` (RAM at `$A000` and `$E000`, I/O at
`$D000`), video bank 1 (`$4000`-`$7FFF`).

## Timing

- The raster interrupt runs a chain each frame (PAL, 50 Hz): four bands
  that move the two side-mask sprites down the screen (raster_masks, at
  lines `$2A`, `$54`, `$7E`, `$A0`), then raster_frame, entered twice a
  frame: once for the frame's work, once for the status panel's split at
  line `$CF`. *Live*: 3,002 entries to raster_frame and 6,004 to
  raster_masks in 1,501 frames.
- The main loop (play_loop) waits each pass for the raster interrupt's
  go-ahead (main_go) and line `$40`. *Live*: with the screen still, it
  ran 1,562 passes in 6,250 frames: one pass every four frames.
- Health falls by 1 every 64 frames (health_tick, from raster_frame):
  *live*, 23 calls and 23 health in 1,501 frames, 24 in 1,500 on level 2.
- A game second is 12 main-loop passes (idle_timer, treasure_clock), 48
  frames with the screen still: 0.96 s on PAL.

## Controls

- Player one: joystick 1 and SPACE for magic. Player two: joystick 2 and
  any of F1, F3, F5, F7 (magic_keys). Joystick 1 shows on the keyboard
  matrix in every row, so the game tells SPACE from the fire button by
  checking a second row (row 6 for SPACE, row 1 for the function keys).
- Holding fire stops the player and shoots (scroll_decide sets the
  direction to none while fire is held; shot_fire).
- A player not in the game joins by pressing fire (players_join), beside
  the other player (join_beside); the first player of a game seeds the
  random generator from the raster line (wait_first_player).

## Graphics

- The maze is characters, not sprites: the tile grid (`$0C00`) is drawn
  into a 64 x 64 character map (`$3000`) and colour map (`$2000`), and
  maze_draw copies a 33 x 20 window of it into the screen behind the one
  on show, then swaps them. The scroll moves 2 pixels a step with the
  video chip's fine scroll (scroll_step) and redraws on each whole
  character.
- Monsters are characters too, four to a monster, drawn into the maps
  (monster_draw). The three maze fonts hold different frames of every
  monster, and panel_flash cycles them (font selects 2 4 2 6), so all the
  monsters on screen animate at once.
- Sprites: 0 and 1 are black masks at the play area's left and right
  edges (sprites_init_masks), re-used four times down the screen,
  covering the columns the scroll brings in. 2-5 are the shots (two for
  monsters, one per player) and the level digits; 6 and 7 are the players.
- The character map doubles as the collision map: a player's four cells
  hold `$5B` (cell_mark), which the fonts draw as floor; anything above
  `$5A` blocks (cells_free).

## Mechanics

### Levels

- Levels 1-7 load files 1-7. From level 8 on, level_pick chooses a file
  at random from 8 to 117 (level 8 uses one chosen at start-up), and
  every four to seven levels a treasure room, files 118-128, which does
  not count as a level. There are 128 files; the levels are endless
  random picks from them.
- After level 1, an exit at grid address `$0C3F` leads to level 8 and one
  at `$0FFF` to level 4; after level 4, one at `$0E3F` leads to level 8
  (exit_targets). When both players leave by different exits, the
  higher level wins.
- From level 8 on (not in treasure rooms), extras_place scatters up to 4,
  8, 12 or 16 extra objects as the level number grows (tiles `$14`,
  `$15`, and the poison jug `$31` about one time in ten).
- From level 8 on, hidden_potion_roll picks a random 0-15: below 6, the
  level hides a special potion of that kind and prints "FIND THE HIDDEN
  POTION". hidden_potion_place skips kind 4 (the shot-speed potion), but
  the message has already been printed: *live*, with the roll forced to
  4 on level 8, the message showed and no special potion was put in the
  grid.
- A level header (`$0A01`) can make the maze wrap left-right (bit 7) or
  top-bottom (bit 6), make shots hurt (bit 0) or stun (bit 1) the other
  player (level_messages), and leave only one exit, chosen at random
  (bit 2, exits_pick_one).

### The idle timer

idle_timer counts game seconds while nobody fires (each shot reloads it,
shot_fire): after 30 (idle_reload) every door and key turns to floor
(idle_doors_open, sound `$0E`), and after 150 more (idle_second) every
wall, crumbling wall and key becomes an exit (idle_walls_exit, sound
`$10`). *Live*: from 129 seconds left, the walls became exits within
6,250 frames (129 x 48 = 6,192).

### Players

- Health is four decimal digits (health_hi/lo), 2000 at the start. Food
  adds 100 (food_eat). Every pickup (door opened, chest, food, potion,
  key, amulet) scores 100 (score_100); a shot that hits a monster scores
  5 (shot_score), a hand-to-hand blow 25 (fight_score), a hit on a
  generator 10 (score_generator).
- Keys and potions share a carrying limit, 10, or 15 with the carrying
  potion (carry_limit); a player at the limit cannot pick up another
  (tile_blocks treats keys and potions as walls then).
- Each hero's armour does nothing. The game keeps six damage values per
  player for armour (damage_taken), copied from the hero's table at the
  start and from a lower table by the armour potion (power_apply), but
  nothing reads them: monster blows take 5, 8 or 10 health by the
  monster's level (monster_damage), ghosts 10, 20 or 30 (ghost_damage),
  fireballs 10, rocks 3, Death 4 a touch (monster_attack), for every
  hero alike. *Live*: a level-three grunt attacked a standing player 187
  times, monster_damage was read 93 times (on alternate attacks, as
  monster_hits does) and damage_taken not once; health fell by 961, 93
  blows of 10 and 31 ticks.
- Hand-to-hand damage is `$40` per blow for every player (fight_damage):
  the fight-power potion writes a stronger value at `$ACCC` that nothing
  reads. *Live*: stopped at the blow (`$C541`), X was 0, player one, so
  the read is `$ACCA`. The potion's other half, power against generators
  (fight_power), does work.
- Poison (`$31`, poison_eaten) takes one special power at random from a
  player who has any, and nothing else. A player with none loses a potion
  if it carries one (potion_drop) and 100 health, but poison_health
  subtracts 1 from the hundreds byte without decimal mode and without a
  test for a borrow. *Live*: with health 2000 the byte became `$1F` (not
  `$19`), the decimal countdown carried on from `$1F00` ($1E99, $1E98
  ...) and the panel showed a glyph from the SCORE word in the hundreds
  digit; counted down in decimal, the `F` stands for 15 hundreds, so
  poison at an even thousand leaves the player 600 health better off
  than it should. With under 100 health the byte goes from `$00` to `$FF`:
  *live*, a Warrior poisoned with 50 health had `$FF47` after the message
  (two stray glyphs on the panel) and `$FF07` 40 ticks later, still in the
  game. Counted with health_tick's own code in the kit's 6502 simulator,
  `$FF50` lasts 16,550 ticks, about 5.9 hours of play, against the 50 it
  should; `$1F00` lasts 2,500 against 1,900.
- The amulet (`$18`) makes the player invisible to the monsters for 255
  passes: its sprite flickers (amulet_flash) and monster_aim ignores a
  player in state 3.
- Going into an exit (`$36`): the player spins through eight facings
  and, for the last part, is drawn with its smaller shot shapes, then
  leaves the level (exit_spin). The level ends when every player in it has
  left (play_loop).

### Shots and magic

- One shot per player at a time (shot slots 2 and 3); monsters share
  slots 0 and 1. Shots fly in eight directions; the Warrior's turns as
  it flies (axe_spin). A shot destroys cider (`$14`), the blue potion
  (`$16`), the special potions and the jug `$31`; it is stopped by walls,
  doors, chests, food `$15`, potion `$17`; it flies over keys, the trap,
  transporters and exits (shot_tile).
- Walls `$33`-`$35` crumble one stage per hit and vanish after the third
  (shot_tile).
- Generators (`$20`-`$2E`, three levels of five kinds) lose the shot's
  power per hit; below their kind's threshold they are destroyed, so a
  strong generator is knocked down to a weaker one first (gen_thresholds).
- Magic: SPACE (or an F key) uses a potion (magic_use): the blast hits
  every monster on screen by the player's magic (blast_monster), kills
  Death outright, and hits every generator on screen (magic_generator); a
  shot potion sets off a weaker blast (potion_shot, blast_owner 1).

### Monsters

- A monster's byte (`$0580`) holds its facing (bits 0-2), kind (bits
  3-5: 0 ghost, 1 grunt, 2 demon, 3 lobber, 4 sorcerer, 5 Death) and
  level (bits 6-7); it is also its strength: a blow or shot subtracts
  from it ($40 a hand-to-hand blow), so a level-one monster dies in one
  hit and a level-three in three. *Live*: a level-one grunt died from one
  blow.
- Generators release monsters every eighth pass, up to 192 in the table
  (generators_run, monster_spawn).
- Monsters go for the nearer player (monster_target); a lobber nearer
  than `$18` turns away (monster_aim). Ghosts hit once and vanish, and do
  not attack from a diagonal (monster_attack). Demons fire on a straight
  line or a diagonal once in four moves; lobbers throw a rock on an arc
  (rock_path, rock_fly). Sorcerers turn invisible and cannot be shot then
  (bit 3 of `$0640`, shot_hits_monster). Death drains 4 health a touch for
  50 touches, 200 in all, and only magic kills it (deaths_first,
  blast_monster).

### Treasure rooms

A random time of 20 to 30 game seconds (treasure_clock_set) shown in two
sprite digits; each chest is counted; a player who escapes by the exit
before the time runs out scores 100 a chest (treasure_result: "TREASURES
nn / BONUS nn00"); one who does not gets "NO BONUS / LOOKS LIKE YOU
LOSE!".

## Data tables

### The level file

At `$0A00`: a header of four bytes, the length less 2 (with bit 7 of
`$0A02` as its ninth bit), the flags (`$0A01`, above), the wall colour
(`$0A02` bits 3-5) and the number of wall-command bytes (`$0A03`); then the
wall commands (level_build): a pair of bytes starts a line at a tile (its
kind in the first byte's top three bits: an exit, a vertical or
horizontal door, a wall a trap removes, a plain wall; column and row in
the low five bits), and each byte after it draws a run of that many + 1
tiles in one of eight directions; then the objects, run-length coded
from the grid's top-left (objects_place): a byte from `$80` skips that
many - `$7F` tiles, a smaller byte is a tile, repeated n + 2 times when
the next byte n is below `$13`. Tiles from `$40` are monsters (added to
the monster table), `$3F` the players' start.

### Tiles

| Tile | What |
|---|---|
| `$00` | floor |
| `$01`-`$10` | wall pieces (joins in bits 0-3), `$10` alone |
| `$11`, `$12` | doors |
| `$13` | treasure chest |
| `$14`, `$15` | food (cider, which a shot destroys, and a plate) |
| `$16`, `$17` | potions |
| `$18` | amulet |
| `$19`-`$1E` | special potions: armour, carrying, magic, shot power, shot speed, fight power |
| `$1F` | key |
| `$20`-`$2E` | generators, three levels each: ghosts, grunts, demons, lobbers, sorcerers |
| `$2F` | trap |
| `$30` | transporter |
| `$31` | poison |
| `$33`-`$35` | crumbling wall |
| `$36` | exit |
| `$40`-`$6F` | monsters as they are drawn: six kinds, eight facings |

### The two alphabets

The panel font (`$6000`) draws ASCII less `$20`: text is stored as ASCII
capitals and print_centred subtracts `$20` from each character. Its own
glyphs: inventory icons `$01`-`$0F` (key 3, potion 4, the six powers),
SCORE `$1A`-`$1F`, ELF `$3B`-`$3E`, the GAUNTLET logo `$40`-`$6F`, WARRIOR
`$70`-`$77`, big title letters from `$C1` (top halves) and `$E1` (bottom
halves). A string is a length, a colour and the characters
(print_centred).

### Strings

"SHOTS NOW HURT OTHER PLAYERS", "SHOTS NOW STUN OTHER PLAYERS",
"FIND THE HIDDEN POTION", the six "EXTRA ..." power names and "NOW
HAS", "HAS JUST EATEN SOME / POISONED FOOD!", "YOU HAVE FOUND A /
TREASURE ROOM", "TREASURES", "BONUS", "NO BONUS", "LOOKS LIKE YOU LOSE!",
"INSERT SIDE 2 OF DISK / THEN PRESS SPACE BAR / TO CONTINUE GAME"
(unused), the file names, and "BOB " written to `$033C` by unused code
at `$99AC`.

## Sound

- Two music players. PLAYER-$E000 (music_play, music_frame), a full
  driver with 33 commands (music_commands), plays the level jingle
  (DITTIDATA, level_intro), 196 frames, and runs the title music
  (DATATITLE) for 900 frames, 18 seconds, when started at `$1000`, in the
  kit's 6502 simulator. Its note table is tuned for PAL: all twelve
  notes of its top octave fall within 10 cents of equal temperament at
  the PAL clock (`$8368` is B6, 1975.5 Hz).
- The tune player at `$A036` (tune_play, tune_command), simpler, plays the
  treasure-room tune (DATATREASURE). Its 96-note table (note_freqs) is
  tuned for NTSC (the tune runs 1,296 frames): 95 of its notes are within 10 cents at the NTSC clock;
  on a PAL machine the tune plays about 65 cents flat.
- Sound effects: 18 (sfx_table at `$F000`), streams of two-byte steps
  (sfx_play, sfx_note) on whichever voice is free, voice 1 alone while a
  tune plays (sfx_start). When an effect on voice 3 ends, the zeroing
  meant for its frequency goes to `$D414`/`$D415` (its sustain/release and
  the filter cutoff's low bits); *live*, 76 such ends in 800 frames of
  shooting. The voice falls silent anyway, its sustain level now 0.

### Hardware register census

| Register | Use | Routines |
|---|---|---|
| `$D000`-`$D010` | sprite positions: masks (0, 1), shots and digits (2-5), players (6, 7) | sprites_init_masks, raster_masks, sprites_place |
| `$D011`, `$D012`, `$D016`, `$D018` | scroll, raster splits, screen and font selects | raster_arm, raster_frame, wait_raster, vic_screen, vic_font |
| `$D015`, `$D017`, `$D01C`, `$D01D` | sprite enables, Y-expansion (masks), multicolour, X-expansion off | sprites_place, sprites_init_masks |
| `$D019`, `$D01A` | raster interrupt | irq_install, the raster handlers |
| `$D020` | border: flashed while random_place looks for room | random_place |
| `$D021`-`$D023`, `$D025`-`$D02E` | background and sprite colours | panel_colours, raster_frame, sprites_place |
| `$D400`-`$D418` | the SID: effects on single registers, the music player all 25 | sfx_play, sfx_note, music_play, tune_command |
| `$D800`-`$DBFF` | colour RAM | maze_colours, panel routines |
| `$DC00`-`$DC03` | keyboard matrix and joysticks | keys_scan, scroll_decide |
| `$DC04`-`$DC07` | timers read as random numbers | generators_run, rock_throw, monster_from_level, exits_pick_one, treasure_clock_set |
| `$DC0D`-`$DC0F`, `$DD0D`-`$DD0F` | timer set-up and interrupt masks | irq_install, irq_kernal, cia_timers_start |
| `$DD00`, `$DD02` | video bank | vic_bank |

Never written: `$D01B` (sprite priority), `$D017`'s other bits, `$D024`.

## Questions still open

- Whether the monster colour routines' missing bottom-edge test
  (monster_colour, monster_colour_wrapped compare cell_pos_x twice) shows
  as a wrong colour at a vertically wrapping maze's bottom edge: not
  tried.
- What the clouds `$B0`-`$B5` and the bars `$B6`-`$B7` are for: no traced
  code names those shapes.
- How the Wizard's and Elf's shots look, and whether the heroes differ in
  anything but their shapes, colour, shot power and magic: only the
  Warrior and Valkyrie were played.

## The listing's error rate

Seed 20261011, population 1,064 comments, a sample of 60 checked against
the bytes by an agent that wrote none of them (`work/reports/checker.md`):
8 were wrong, 13 % (Wilson 95 % interval 7 % to 24 %), a lower bound on
the true rate, since a checker misses some. What was wrong: three
comments misdescribed what the code does (treasure_end said it started
the treasure tune, which it rewinds and leaves off; monster_attack read
monster_hits' carry as a missed attack, where it means the player's
counter-blow killed the monster; music_voice_freq_hi said the voice state
was laid out like the SID's registers), two swapped or misread a table
(shots_move paired `$BE70` with X and `$BE80` with Y, the other way round;
facing_hold called a direction code a facing), one put the panel font's
setting in the start-up where the raster interrupt makes it, one named
the column after the potion icons where it is the first icon's, and one
said nothing read DATATITLE where two BIT instructions do. All eight were
corrected, with the comments that shared their beliefs: tune_init, which
was also said to set tune_on and clears it. Then the whole listing was
audited by the kinds of claim that had gone wrong: every caller or
jump a comment cites was checked against the instruction there (13
citations, none wrong), and every comment saying nothing reads, calls
or reaches something (16) against every instruction that can touch it
through an index of up to 16. That audit corrected unused_97DE, whose
last six bytes are the power bits poison reads (`$97EE`, power_bits),
and poison, which left out the potion a player without powers loses.
No second sample was drawn after the corrections.

## Live tests

- Health tick: non-stopping checkpoints on health_tick and the raster
  handlers over 1,501 frames: 23 calls, health down 23.
- Armour: a level-three grunt poked next to a standing player on level 2;
  load checkpoints on damage_taken (0 reads) and monster_damage (93), 187
  attacks.
- Hand-to-hand: a level-one grunt poked beside player one, the player
  pushing into it; stopped at `$C541`: X = 0; the grunt died in one blow.
- Idle timer: from the level 1 snapshot, the walls became exits within
  6,250 frames; 1,562 main-loop passes and 1,562 idle_timer calls in that
  time.
- Poison: a poison tile poked beside the Warrior with health 2000; health
  byte `$1F` after, the panel's hundreds digit a stray glyph. Again with
  health 50: `$FF47` after the message, `$FF07` 2,560 frames later.
- Hidden potion: on level 8 the roll forced to 4 at `$A468`: the message
  printed, hidden_potion_place stopped at its checks, no special potion
  in the grid.
- Voice 3: store checkpoints on `$D414`/`$D415` and `$D40E`/`$D40F` while both
  players fired for 800 frames: 76 effect ends on voice 3.
- The page's ports, against the game's code in the kit's 6502 simulator on
  the committed listing: `test_music.js` (all three tunes, every SID write
  of every frame), `test_poison.js` (poison_health for 256 values, one
  health_tick from 65,536), `test_levels.js` (level_build, grid_draw and
  the monsters for all 128 files, 4,341 monsters).
- The rebuilt frame: one frame of level 2 recorded with `frame.py
  capture`, drawn by `site/lib/c64.js`: 104,448 of 104,448 pixels match.
