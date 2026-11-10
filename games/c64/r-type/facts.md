# R-Type — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is ten parts (`orientation.md`, "The parts"). This file holds
what spans them, and names the part beside every address. What is true of
one stage is in that part's `parts/<id>/facts.md`.

## Build

The tape version 1, cracked to disk by Oneway: the collision check the
C64-Wiki gives for tape v1 is at `$319C` (game, `kill_ship`), and GAME
OVER asks the player to rewind the tape (game, `game_over`, `$5E47`). The
crackers replaced the tape loader with a KERNAL loader at `$6200` (game,
`crack_loader`), which loads the depacker `+` to `$CD00` and then a
stage's three files by letter (`crack_letters`, `$6300`), and added a
level-skip key (`crack_skip_key`, `$6290`): `←` wins the stage at once.

## Memory layout

| Thing | Where |
|---|---|
| Resident code and tables (game) | `$0800-$62FF` |
| Crackers' loader, skip key and letter table (game) | `$6200-$6321` |
| Stage file 1: music driver (`$6370-$6D3F`), music data (`$6D40-$7ABF`), boss record (`$7AC0`), enemy types (`$7AD6-$7E39`), attack script and boss code (each level part) | `$6370` up to `$86A0` |
| Stage file 2: the stage's characters (`$86AC`), colours (`$8CAC`), background flags (`$8D6C`), block tables (`$8E6C`/`$8ECF`), blocks, block list, frame hook (each level part) | `$86AC` up to `$99FE` |
| The stage map, built by `build_map` (game, `$162F`), rows `$200` bytes apart | `$9A00-$BFFF` |
| Play character set (game) | `$C000-$C7FF` |
| Panel font (game) | `$C800-$CBFF` |
| Screen | `$CC00` |
| Ship, Force, pickup and explosion shapes (game) | `$D000-$DFFF` (sprite pointers `$40-$7F`) |
| Stage file 3: enemy and boss shapes, and stage 1's second character set (each level part) | `$E000` up to `$FD3F` (sprite pointers `$80` and up) |
| The ending's one file, Y (ending) | `$6800-$8701` |

Video bank 3 throughout play (`$C000-$FFFF`); `$D018` is `$30` for the
play area (`$38`, the set at `$E000`, on stage 1 and part of stage 2),
`$32` for the panel (game, `irq_top` `$0D04`, `irq_panel` `$0DE6`,
`irq_band2_y` `$1066`).

## How one part leads to the next

- `stage_won` (game, `$5E17`) raises the stage number `$0200` and sets
  `$0310`; after the eighth stage the number becomes `$D3`.
- `load_next` (game, `$0A4E`) stops the stage, swaps the KERNAL's zero
  page back in (`swap_zero_page`, `$0AC9`) and calls the loader for the
  next three files; at `$D3` it jumps to `$5FB1` instead, which loads Y
  and runs it at `$8000` (ending, `ending_start`).
- Each stage's file 1 starts with the same five-entry table at `$6370`
  (play a frame, stop, sound effect, tune, music data); the resident code
  calls only these and the stage's frame hook. The ending's copy of the
  driver is the same code moved up by `$490` (ending, `$6800`): of its
  2,512 bytes, 1,534 equal stage 1's as they stand, 832 are addresses
  inside the driver moved up by `$490`, and the other 146 are the
  driver's working variables (stage 1's `$637F-$6475` and `$6D31-$6D3F`),
  compared between the two parts' snapshots.
- What the resident code reads from each stage, by table: the set-up
  routine (`stage_setups`, `$139A`), the block list (`stage_block_lists`,
  `$13AA`), the frame hook (`stage_frame_hooks`, `$13BA`, written into the
  JSR at `$0E82`), two colours (`$13CA`, `$13D2`) and the column where the
  scroll stops (`$13DA`/`$13E2`), copied in by `stage_pointers` (`$15F0`).

| Stage | Files | Frame hook (each level part) | Boss |
|---|---|---|---|
| 1 | A B C | `$940A` | yes |
| 2 | D E F | `$943B` | yes, an eye in the background (`$95DA`, 8 hits) |
| 3 | G H I | `$9586` | none: the battleship is the stage, won when its waves are gone |
| 4 | J K L | `$918D` | yes, three parts (game, `boss3_parts` `$5BA0`) |
| 5 | M N O | `$17FA` (game, an RTS) | yes, twenty blobs |
| 6 | P Q R | `$9286` | none: won when the waves end |
| 7 | S T U | `$93B6` | none: won when the waves end |
| 8 | V W X | `$17FA` (game, an RTS) | yes |

## Timing

The raster chain runs once a frame (PAL, 50 Hz): `irq_top` (`$0D04`, line
`$30`), the band handlers (`$0F6C`, `$0FB7`, `$1066`, `$10B6`, at lines the
stage sets), `irq_panel` (`$0DE6`, line `$CA`), `irq_panel_sprites`
(`$0EC5`, line `$D6`) and `irq_bottom` (`$0F4D`, line `$FF`), all in the
game part. The stage's music driver runs once a frame from `irq_panel`
(`JSR $6370`). The side scroll (`scroll_side`, `$34FB`) moves one pixel
every second frame, so a character column every 16 frames.

## Controls

Joystick in port 2. Fire: a tap fires, holding charges the beam
(`charge_beam` `$40D1`, `release_beam` `$40EC`). Space launches or recalls
the Force (`force_control`, `$2A12`, bit 4 of `$DC01`). F1 on the title
screen starts a one-player game (`game_over`, `$5E47`, key code 4 in
`$CB`). `←` (added by the crackers) wins the stage.

## Graphics

- Sprites are multiplexed: fifteen enemy slots in three bands of five
  (flags `$044C`, the band limits `$023C` and `$023F`), plus the ship
  (sprites 1 and 2) and the Force (sprite 0) (game, `attack_script`
  `$4FA8`, `irq_band1_y` `$0F6C`).
- A boss replaces the bands with its own multiplexer: up to seven rows
  of five sprites (game, `start_boss` `$56CF`, `boss_irq_row` `$57AF`).
- The player's shots, the beam, the crawling and reflecting lasers and the
  red wave are characters (`$CC-$ED`), not sprites (game, `check_hits`
  `$17FB`, `move_beam` `$416C`, `move_crawlers` `$4848`).
- Stage 3 is a window on a map 130 bytes wide that moves in all four
  directions (game, `scroll_battleship` `$3702`); stage 3 alone turns on
  extended colour mode for the panel's line (`irq_panel`).

## Mechanics

- Lives: 3 at the start (game, `$5EE5`), lowered at each death, an extra
  life every 100,000 points (`add_score`, `$32CD`).
- Pickups (game, `collect` `$1B61`): a bit (`$4A`), a laser crystal
  (`$5B`), speed (`$5C`, up to 5) and missiles (`$5D`). The crystal's
  colour picks the Force's weapon (`weapon_lo`/`weapon_hi`, `$1BFC`).
- The Force: launched forwards or backwards eight pixels a frame,
  recalled three pixels a frame, docks at the front or back
  (`force_control` `$2A12`, `force_dock` `$2953`).
- The beam: six to eleven cells charged give a beam one character wide,
  twelve to nineteen two, twenty to twenty-two three; it costs a target
  its width less one times four, plus two: 2, 6 or 10 hit points, where a
  plain shot costs 1 (`release_beam` `$40EC`, `check_hits` `$17FB`,
  `boss_hits` `$5902`). Stage 4's boss parts lose 10 to any beam
  (`boss3_parts`, `$5BA0`).
- Enemies are spawned by the stage's attack script, two bytes an entry
  (map column, what), and run three programs each: across, down and
  animation (game, `attack_script` `$4FA8`, `move_enemies` `$518D`).
- Enemy bullets: ten slots at `$02E5`, aimed at the ship or straight
  (game, `enemy_fire` `$2498`).
- Two-player code is present but unreachable: the title accepts F1 only
  and the two extra lines of the prompt are loaded where they should be
  stored (game, `game_over` `$5E47`, `two_players` `$2820`).
- The crystal's colour picks what a docked Force fires with each press:
  red the wave (`weapon_red`, `$4CB3`), blue the two reflecting lasers
  (`launch_diagonals`, `$42FA`, moved by `move_reflect` `$43E1`), yellow
  the crawling lasers (`weapon_yellow`, `$47A1`). The table is split in
  two halves (`weapon_lo` `$1BFC`, `weapon_hi` `$1C04`), and `collect`
  copies the chosen address into the `JSR` at `$3B98`; the five colours no
  crystal has point at the KERNAL's reset, `$FCE2`.

## Data tables

- Boss record (each level part, `$7AC0`): positions `$7AC0`, Y `$7AC2`,
  outline rows `$7AC3`, sprite rows `$7AC4`, the addresses of the outline
  `$7AC5`, widths `$7AC7`, shapes `$7AC9` and colours `$7ACB`, the boss's
  routine `$7ACD`, weak row `$7ACF`, hit points `$7AD0`, script start
  `$7AD2` and restart `$7AD4`. `start_boss` (game, `$56CF`) adds the boss
  number to each field's address, so each stage's boss is number 0.
- Enemy types (each level part, `$7AD6-$7E39`): fourteen tables of 62
  bytes, read by `attack_script` (game).
- Block lists (each level part, end of file 2): three or five bytes an
  entry, `$FF` at the end (game, `build_map` `$162F`).

## Text

Three alphabets:

- The panel font at `$C800` (game): screen code 0 blank, 1-10 the score
  digits 0-9, `$0B-$0F` the 1UP and 2UP labels, `$1A-$1C` the BEAM bar,
  `$57-$70` the letters A-Z and `$71` up the digits. The GAME OVER prompt
  (`$5F0D`) is in these codes.
- The big message letters (READY, GAME OVER, PLAYER ONE/TWO) are two
  characters wide and two high in the play set, top and bottom rows
  stored apart, with `$00` as a space (game, `msg_ready` `$0C5B`).
- The ending's font (ending, `$8502`): 1-26 the letters A-Z; the ending
  text is stored as ASCII and has `$40` taken off as it is laid out
  (ending, `ending_layout` `$80D6`).

Four copies of the credits sit in the resident code in plain PETSCII and
are never shown (game, `$36AB`, `$3CFE`, `$429E`, `$5A86`).

## Sound

Each stage carries its own copy of the music driver (`$6370-$6D3F`) and
its own music data (`$6D40-$7ABF`): a header of 22 offsets, twelve
track columns (patterns, transposes and instrument offsets, four for each
voice), a tune table of 32 columns, a pattern table, a duration table,
the patterns, a sequence table and sequences, and an instrument table and
instruments of 12 or 16 bytes. A new life starts the stage's music
through the driver's tune entry (game, `new_life` `$088A`); sound effects go through the same driver (game,
`play_sound` `$33FB`).

## The listing's error rate

Sample, seed 1110: 80 comments drawn from the 4,655 in all ten parts'
listings, 20 of them from the 2,076 that templates wrote (labels inside
tables and code, "an entry into", "inside", "byte n of sprite shape") and
60 from the 2,579 written one by one. One checker on claude-opus-5-5, which
wrote none of them, found 9 wrong: 2 of the 20 template comments and 7 of
the 60 others, 11.2 % (95 % interval 6.0 % to 20.0 %), 10.9 % weighted by
the strata's sizes, over the mark of 2 in 60. Every finding held when read
against the code. What was wrong: two formulas in `place_ship` (game,
`$2E9C`); front and behind swapped in the Force's docking offsets (game,
`$2FB3`); the crawling laser's frames called unread (game, `$4C91`); two
of the music driver's variables misread (`$642B`, the last instrument, and
`$6430`, the sequence number), a belief copied into all nine copies of the
driver; a sprite shape called a character set (level-8, `$E5CB`), copied
into six stages; and template comments that said other code names or
jumps to an address nothing names (level-1 `$733F`, level-5 `$6A72` and
`$EAAE`). All nine were corrected, with every comment that said the same
thing: the driver's variables in all nine parts, the "character" comments
in stages 3 to 8, and 43 labels and comments in the stages that claimed a
reference no instruction, address table or index reaches. The rate is a
lower bound, and a full audit is recommended.

## Live tests

- The route through all eight stages and the ending, with the crackers'
  `←` key, stopped at the loader's entry to each stage (`$6276`) and at
  the ending (`$8000`), on 10 November 2026: the stage number at `$0200`
  read 0 to 8 in order, and the loader's file letter at `$6321` named the
  next stage's first file each time (*live*).
- The ending's text and credits scrolled on screen after stage 8, with
  the music playing (*live*, `reference/` and the ending part's
  snapshot).
