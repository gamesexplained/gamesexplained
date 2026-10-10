# Uridium — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

Hewson's disk release, the protected original's GCR image (disk name
`gma240286`). One load: the main file, decoded with the protection's key
`$97`, is `$0900`-`$BEFF` of the hand-over snapshot byte for byte, and
nothing else is read from disk after it (`orientation.md`). No version
string or build number is stored; the title page reads
"© Graftgold Ltd. 1986." (`str_copyright`, `$3597`).

## Memory layout

| Thing | Where |
|---|---|
| Zero-page variables | `$0002`-`$00FF`, every one labelled |
| Generator port lists, players' saved state | `$0200`-`$026F` |
| Random byte table | `$0800`-`$08FF`, a copy of the sound driver's own bytes at `$1000`, stirred with noise (`stir_random`) |
| Code | `$0900`-`$3109`, the raster handlers `$3F00`-`$3FD6`, the library `$B000`-`$B35F` |
| Tables, strings, sound data | `$310A`-`$3E98` |
| Sprite shapes (video bank 1) | `$4000`-`$4FFF` transporter, bullets, mines, explosions; `$5000`-`$5BFF` the Manta's frames `$40`-`$6D`; `$5C00`-`$67FF` their shadows `$70`-`$9D`, built at every restart (`thicken_shapes`); `$6800`-`$6FFF` sixteen fighters and their mirror images |
| Screen | `$4800`, sprite pointers `$4BF8` |
| Status font | `$7000`-`$77FF`, double height: top halves `$00`-`$7F`, bottom halves `$80`-`$FF` |
| Playfield characters | `$7800`-`$7BFF` fixed (`$00`-`$7F`), `$7C00`-`$7FFF` the level's tile set (`$80`-`$FF`) |
| Map | `$8200`-`$A3FF`, 17 rows of 512 columns, row r at `$8200 + $200 × r`, built per level |
| Stars, shots, enemy sprites | `$A400`-`$A55F` |
| Fuel rod chamber screen | `$A600`-`$A9FF` |
| Level map lists | levels 7-8 `$AA00`, 10-14 `$B3D0`-`$BEFF`, 15 `$CE00`, 1-6 and 9 `$F000`-`$FFC1` |
| Waves and paths | `$C100` wave-list pointers, `$C120`/`$C190` path pointers, `$C200` 57 wave records, `$C590` wave lists, `$C648` 40 paths |
| Tile sets (under the I/O) | `$D200` chamber, `$D400`, `$D800`, `$DC00` the three Dreadnought sets |
| Level tables and pieces | `$E010`-`$E06F` per-level tables, `$E100`-`$EF54` 148 map pieces, names at `$E070` and `$EF55` |

The start-up (`game_start`, `$0900`) moves the loaded blocks into this
layout; `orientation.md` lists the moves, each compared byte for byte.

## Timing

- PAL, 50 frames a second. In play the raster interrupt is a chain of
  three handlers: `irq_playfield` at line 82, `irq_frame_start` at line
  97, `irq_bottom` at line 252 (*live*: recorded with `frame.py
  capture`, and each counted 199-200 times in 200 frames).
- The play loop (`play_loop`, `$0CF9`) starts its frame when
  `irq_frame_start` clears the frame flag `$2F`. A pass sometimes takes
  longer than a frame: *live*, 382 passes in 400 frames from
  `play-level1.vsf`.
- Outside play `title_irq` fires twice a frame, at lines 128 and 0; the
  sound driver runs once a frame on every screen (*live*: 400
  interrupts and 200 calls of `sound_frame` in 200 frames of the title,
  200 in 200 frames of play).
- The music steps every fifth call of the sound driver (`music_tick`,
  `$F2`), ten steps a second.
- The play loop's eight rotating calls (`rotating_lo`/`rotating_hi`)
  run one each frame: `status_line`, `wave_control`, `print_score`,
  `pause_check` (twice), an RTS, `spawn_mine`, `port_colour`.
- The fuel rod chamber's countdown steps every 256 - `$AE` frames:
  112 frames at level 1 (`chamber_speeds`), 16 at the fastest.

## Controls

- Either joystick port drives the Manta: `read_stick` ANDs both ports
  unless the F3 option gives each player a port. `$16` vertical, `$17`
  horizontal, `$18` fire (0 when held).
- Up and down change the vertical velocity by one a frame, within -3 to
  +3 (`manta_vertical`, `manta_limits_table`).
- Left and right change the speed by fractions of a pixel a frame, within
  -8 to +8 (`manta_speed`, `manta_limits_table`).
- Fire fires two shots at once (`manta_fire`); holding fire for seven
  frames, then up or down, rolls the Manta between level and edge-on
  (*live*: `$45` from `$01` to `$80` and frames `$41`, `$40`, `$4F`,
  `$4E`, `$4D`; the control run with fire alone stayed level).
- Below speed 2 the Manta half-loops: it climbs over the Dreadnought
  (height `$3D` from `$10` up to `$1E` and back), turns end-on and comes
  out facing the other way with a push of speed (*live*: frames `$60`-`$66`
  then `$51`-`$59`, `$45` from `$01` to `$05`, speed from -6 to +4).
- F1 one player, F2 two players sharing a stick, F3 two players with a
  stick each, F5/F6 music volume, F7/F8 colour or black and white, all on
  the title screens (*live*, `work/sess`); RUN/STOP pauses, fire or
  RUN/STOP resumes, CLR/HOME while paused abandons the game
  (`pause_check`; pause *live*).

## Graphics

- Hardware sprites: the Manta (sprite 6) and its shadow (sprite 7), the
  six enemy slots 0-5 (fighters, bullets, mines, explosions). The shadow
  is drawn from the Manta's frame + `$30` at an offset that grows with
  the height `$3D`.
- Software sprites: the Manta's shots are characters. `draw_bullets`
  copies the character a shot covers into the shot's own character and
  draws two pixel rows of shot over it, alternating between two banks of
  six characters each frame.
- The Dreadnought scrolls by whole characters (`draw_map` copies 17 rows
  of 39 characters every frame) and by pixel through `$D016` (`$2C`).
  The stars stay still because `draw_stars` rewrites the star characters'
  rows with a one-pixel mask chosen by the fine scroll (`star_masks`).
- Collisions are all in software. The game never reads the video chip's
  collision registers `$D01E`/`$D01F` (register census below): the Manta
  against the map characters under it (`manta_collide`), shots against
  the map (`draw_bullets`), enemies against the shots' characters under
  them (`fighter_move`) and against the Manta's box (`hits_manta`).

## Mechanics

- **The map.** Each level's list (`level_map_lo`/`hi`) gives piece
  numbers that fill columns 64-511 from the left, each piece's columns
  built from the bottom row up (`build_map`), then overlay records (row,
  column, piece) that add targets, ports and markings. Columns 0-63 are
  empty space.
- **The pieces.** One store of 148 pieces at `$E100` serves every level
  and the title message: `index_pieces` (`$2C66`) never reads the level,
  which chooses only its lists, its colours and its tile set. Pieces are
  1 to 15 columns wide and up to 17 rows high; piece 1 is one space.
  Pieces 31-80 and 87 are the giant message's letters and digits
  (`giant_letters`). Over the 15 levels and the default message, 129
  pieces are laid; the letters the message does not spell can appear
  once a new high score writes its initials into it, and no level's list
  and no letter names pieces 18 and 27 (the port's placement record,
  checked by `test_ports.py`).
- **Crashing.** Map characters `$80`-`$8F` are walls: the Manta is
  destroyed when one is in the cells it tests (`collide_shapes`). A level
  frame tests three columns on its row and the cells above and below its
  middle; an edge-on frame only the three columns of its row, which is
  how the roll gets through a gap one character high; the end-on frames
  of a half-loop the middle column and the cells above and below it.
- **Targets.** Characters `$90`-`$9F` are targets. A shot that reaches
  one destroys the whole target, every character becoming its wreck
  (code - `$20`), and scores by its size: 1 character 10, 2 × 2 25,
  3 × 3 100 (`feature_score`, `score_hi`/`score_lo`). These are the
  manual's small and large surface features and enemy ships on the
  runway.
- **Waves.** Each level has a list of wave numbers (`wave_lists`); a
  wave is up to six fighters on numbered paths, entering one after
  another (`wave_records`, `new_wave`). The wave's type sets the
  fighters' speed, climb, firing chance, bullet and score, 100 to 1000
  (`type_score`). A wave starts when the last has gone, checked every 64
  frames (`wave_control`). Shooting all of a wave counts a formation for
  the end-of-level bonus (`formations`).
- **After the list.** When the level's wave list is used up, "Land now!"
  flashes in the status line (*live*), and waves keep coming as random
  filler waves `$12`-`$15` whose fighters score nothing and count no
  formation (`filler_wave`, `fighter_move` at `$1E4B`).
- **Homing mines.** While no wave is flying, every eighth frame a mine
  may appear over a generator port that is on screen (`spawn_mine`), with
  a chance of a quarter of the wave's firing chance; it homes on the
  Manta for a while (`home_in`, `mine_move`) and explodes.
- **Danger and height.** Bullets and mines destroy the Manta only while
  its height `$3D` is below `$14` (`bullet_move`, `mine_move`); in a
  half-loop it is above them.
- **Landing.** In the "Land now!" state the Manta lands when the
  character under its middle is the runway's end `$6F` while it flies
  level and facing right (*live*: landed within two frames over column
  408 of level 1; facing left over the same character it did not).
- **The fuel rod chamber** (`fuel_rod_chamber`). Six steps from the
  bottom row of slots up. At each the countdown digit plus the bonus so
  far is offered, flashing against "Quit" on a random side; fire on the
  value takes it, fire on "Quit" ends. The bonus starts at the level
  number, so the first offer is 900 + 100 × level at the countdown's
  start (*live*: 1000 at level 1). Letting the countdown reach 0 costs a
  life (`out_of_time`).
- **End-of-level bonuses.** 100 for each formation destroyed and 100
  for each unit of the chamber's bonus (`count_bonus`; *live*: three
  formations and a chamber bonus of 10 added 1,300). Then the Manta
  takes off and the Dreadnought vaporises column by column behind it
  (`vaporise_column`, *live*).
- **Lives.** Three at the start; an extra life whenever the score passes
  another 10,000 (`add_score`: a carry out of the thousands byte; *live*,
  9,900 + 1,300 took the lives from 3 to 4). The count is BCD and stops
  at 99. Losing a life sends the wave index back four waves.
- **Difficulty.** After level 15 the game goes back to level 1 with the
  difficulty `$28` raised by `$10`, up to `$30`, which adds to the
  fighters' firing chance and speeds up the chamber's countdown.
- **The demo.** One of levels 1-8, picked from the random table, flown
  by `demo_stick`, which changes direction when a random byte is `$B4`
  or more and toggles fire at random.

## Data tables

- **Text.** The game's alphabet: digits `$00`-`$09`; a-z `$0A`-`$23`,
  except that `$16` is the narrow capital I; capitals A-Z `$3A`-`$53`,
  two cells wide (code and code + `$20`), with the wide m at `$42` and w
  at `$54`; `$25` `!`, `$28` `.`, `$2A` `:`, `$2E` `-`, `$2F` `=`, `$30`
  space; bit 7 ends a string. A string record is a row, a column and the
  characters (`print_string`); each is printed two rows tall, the code
  above and the code + `$80` below (`put_char`).
- **Level names.** "01. Zinc." to "15. Uridium." (`level_names_a`,
  `level_names_b`).
- **Scores.** Entries 0-11 of `score_hi`/`score_lo`: 0, 10, 25, 50,
  100, 150, 250, 500, 750, 1000, 2000, 5000.
- **Hall of fame.** Eight entries from 12000 to 5000, all with the
  initials AEB at first (`hall_of_fame`).

## Sound

- One driver for music and effects (`sound_frame`): music notes are
  played as effects, the instrument's effect record getting each note's
  frequency (`music_tick`, `instr_lo`/`instr_hi`, effects `$27`-`$2D`).
- 46 effects of 16 bytes (`effects`): a voice set-up (waveform, envelope,
  gate time), a frequency with a step that reverses or restarts, a pulse
  width that sweeps, a duration and a chained effect.
- Voice 3 is the game's random-number generator: noise at frequency
  `$FFFF` with its output muted by bit 7 of `$D418` while no effect uses
  it (`noise_on`); every random choice reads `$D41B`.
- The title tune is one song of 22 rows over 31 patterns (`song`).

## Register census

Every I/O register the code touches (from the traced code; colour RAM
omitted):

| Register | Use | Routines |
|---|---|---|
| `$D000`-`$D010`, `$D015`, `$D017`, `$D01B`-`$D01D`, `$D027` | sprite position, enable, expansion, priority, multicolour, colour | `sprite_get`, `sprite_put`, `sprite_put_all` |
| `$D011`, `$D012`, `$D019`, `$D01A` | raster interrupt and screen control | the raster handlers, `restart` |
| `$D016`, `$D018` | fine scroll and the two character sets | the raster handlers |
| `$D020`-`$D023`, `$D025`, `$D026`, `$D02E` | border, background and multicolours, sprite multicolours, the shadow's colour | `game_start`, raster handlers, `level_colours`, `start_life`, `fuel_rod_chamber` |
| `$D400`-`$D406`, `$D418` | the three voices and the volume | sound driver |
| `$D40E`-`$D414`, `$D41B` | voice 3 as noise, read for random numbers | `noise_on`, every random choice |
| `$DC00`-`$DC03` | joystick and keyboard | `read_stick`, `read_keys`, `read_pause_keys` |
| `$DC0D`, `$DD0D`, `$DD00`, `$DD02` | CIA interrupts off, video bank 1 | `restart` |

Never touched: the sprite collision registers `$D01E`/`$D01F`, the
light pen, the CIA timers, and voice 3's envelope output `$D41C`.

## Corner cases

- The landing test is an exact match on one character, `$6F`, and on
  `$45` = 1 (level, facing right, no manoeuvre): a Manta rolling or
  facing left passes over the runway without landing.
- Lives stop at 99: `add_score` skips the increment on a BCD carry.
- `landing_check` has four bytes after its RTS (`$16B4`) that nothing
  reaches.
- `init_vars` sets `$B7`, `$B8`, `$BB` and `$BC`, which nothing reads.

## The listing's error rate

A sample of 60 of the listing's 661 comments, drawn with seed 1986 over
the whole address range, was checked against the bytes by an agent that
wrote none of them: 8 were wrong, 13 % (95 % Wilson interval 7 % to
24 %). The errors were details, not what a routine does: the two states
of the fire button swapped (`fire_state`), work credited to the wrong
routine (the scores in `title`, RESTORE in `cbm80_copy`), data read
wrongly (the chamber's `$80` digits, a sprite shape), an off-by-one start or
boundary (the transporter door's first shape, the last map pieces) and a
count (18 bytes, not 20). All eight were rewritten. Because 13 % is
high, every comment was then read again against its neighbours and the
table sizes its labels imply, and each one that disagreed was tested on
the bytes. That turned up 13 more wrong comments, all rewritten: the
collision flags of the Manta's frames (three comments, and the same claim
in this file, `features.md` and the page), a routine that copies the
level's tile set described as copying fighter shapes (renamed
`copy_tile_set`), the facing set by `level_setup`, the record `start_life`
shows, the users of two launch records, the chamber's last digits again
at `$3929`, the note tables (sixteen notes, not twelve), the title
screens' frame flag, two frequency bytes and a duplicated character
comment. The rate after these corrections was not measured with a
second sample.

## Live tests

All on VICE vice-mcp v3.13.2 (Linux), 10 October 2026, from
`work/play-level1.vsf` or `work/title.vsf`, scripts in `work/py/`:

- Raster chain and IRQ vector writes: `frame.py capture`.
- Sound driver and handler rates: non-stopping checkpoints over 200 frames
  (`t_rate.py`); play-loop passes over 400 frames.
- Roll: fire held twelve frames, then fire and up, against fire alone
  (`t_roll.py`).
- Half-loop: right for 60 frames, then left for 70 (`t_loop.py`).
- Landing: `$85` = 1, the Manta placed just before column 408 at row 12,
  facing right and facing left (`t_land.py`).
- "Land now!": the wave index set to the end of level 1's list.
- Chamber and bonuses: `$85` = `$80` and three formations poked, the
  first value taken and "Quit" chosen (`t_chamber2.py`); the same from
  9,900 points for the extra life (`t_life.py`).
- Title keys, pause and a two-player game: the recorded session
  (`session.py`), 32 screenshots.
