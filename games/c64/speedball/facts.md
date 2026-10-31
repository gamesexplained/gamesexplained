# Speedball — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live* (seen in VICE)
or *simulated* (the game's own code run on the kit's simulator from the
play snapshot), a fact comes from reading the code in the snapshot named
in `orientation.md`.

## Build

- Mirrorsoft's PAL release (Image Works label), from the C64
  Preservation Project's G64 of the original disk; SHA-256 in
  `orientation.md`.
- The loader files `LOADER`, the unnamed stage at `$F000` and `2` load
  `FILE0`-`FILE8` with the KERNAL and jump to `game_entry` (`$2000`),
  which jumps to the start-up `game_start` (`$201A`). The game then runs
  with every ROM banked out (`$01` = `$30`) and the chips banked in only
  inside the interrupt (`$0D`).
- The disk also holds two saved games, the files `0` and `1`, 1,024
  bytes each at `$1C00`, the size and place `game_save` writes. `0` is a
  league (`$1EAF` = `$FF`) of ONE HUNDRED WEEKS (`$1EB0` = 10) at week 1
  with no match played; `1` is a knockout (`$1EAF` = 1) at round 0. So
  LOAD LEAGUE and LOAD KNOCKOUT find a file on the master disk.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: the game's variables (positions in work, the controlled players, power-ups, the clock) | `$02`-`$FF`, cleared by `game_start` |
| The SELECT GAME menu's picture, moved from `$6000` by `file7_move` | `$0200`-`$06B1` |
| The music driver, its seven tunes and 26 sound effects (`FILE0`) | `$0810`-`$1B8F` |
| The game's state, saved and loaded whole: team records, players, scores, league and knockout progress | `$1C00`-`$1FFF` |
| Code and tables (`FILE2`): the interrupt chain's table, the strings, the block tables, the fixtures | `$2000`-`$3FFF` |
| Sprites, video bank 1 (`FILE4`): menu sprites, countdown digits, running, jumping, throwing, sliding, the ball | `$4000`-`$5BFF` |
| The play sprites in a match (from `$F300`, `play_sprites_in`); the menus' colour screen otherwise | `$5C00`-`$67FF` |
| Built at run time: the two pitch screens (`$6C00`, `$7400`), the panel's screen (`$7000`), the play character set (`$7800`); the menus' bitmap at `$6000` | `$6800`-`$7FFF` |
| Code (`FILE3`): play, the computer's players, the shop, the screens; the pitch's blocks `$B351`-`$B79C`, the team templates `$B9D6`-`$BA2B`, save and load `$BD50`-`$BEFF` | `$8000`-`$BFFF` |
| Data (`FILE1`, copied up by the loader): the computer's tables, team pictures and faces, fonts, charsets, the pair tables | `$C000`-`$F2FF` |
| In play the pitch map, 40 columns by 74 rows (`pitch_map_build`); between matches the play sprites | `$F300`-`$FEFF` |
| The game's own interrupt vectors: IRQ `$86D3`, NMI and reset `$8703` (an RTI) | `$FFFA`-`$FFFF` |

## Timing

- One raster interrupt handler (`irq_handler`, `$86D3`) steps through a
  chain of slots (`irq_slot_run`, table `$2C3A`-`$2C9F`), each setting
  the next line, the video registers and a routine. `music_play`
  (`$0947`) runs from it once a frame.
- The match loop (`match_loop`, `$325C`) waits a frame (`wait_frame`)
  and runs one pass. A pass of play takes two frames (*simulated*: 112
  passes in 224 frames, twice over).
- The match clock (`clock_step`, `$3393`) has 40 bars; one goes every
  112 passes (`$74`), 224 frames, about 4.5 seconds at PAL's 50.12
  frames a second. A match is 4,480 passes, about 179 seconds of play;
  the clock stands still during the 160-pass pauses after a goal
  (`goal_scored`, `$32EE`). Extra time, bought in the shop, is 13 bars
  (`match_over`, `$3320`).
- After kick-off the first tile comes after 50 passes (`kickoff`,
  `$31F8`), and 50 after each is taken (`tile_check`, `$99FA`).
- A power-up lasts 120 passes (`$1EC7`), ten more for each bribe of the
  timer; its countdown has ten stages, one every 12 passes (`$1EC9`), one
  more for each bribe (`shop_bribe_timer`, `$AE81`).
- Friction takes one off each of the ball's speeds every 14 passes, 12
  after a keeper's throw (`ball_move`, `$380E`; `$1EDF`). A ball left
  still for 120 passes is shot off in a random direction.

## Controls

- Port 2 controls side 0 (green, up the pitch); port 1 side 1 in a two
  player game (`sticks_read`, `$886E`). Fire with the ball throws at
  once, and held for 5 more passes sends the ball high (`player_move`,
  `$9E45`; `$5C`). Without the ball fire jumps for a ball in the air
  nearby, or else slides.
- Keys (`keys_read`, `$8891`): RUN/STOP pauses until fire; F3 quits the
  match, or leaves a prematch screen for the menu. F5 is read every frame
  into `$57` and nothing uses it. RESTORE does nothing (the NMI vector
  points at an RTI).
- The controlled player of each side is its outfield player nearest the
  ball, or the one holding it (`players_update`, `$9B6E`;
  `nearest_player`); the keepers (roles 0 and 5) are never controlled.
  The camera follows the ball, or the holder's side's controlled player
  (`camera_follow`, `$8A74`).

## Graphics

- In play the pitch is a multicolour character screen, double-buffered
  at `$6C00` and `$7400`, scrolled vertically over the 74-row map
  (`scroll_update`, `$9292`); the panel below is a split at line 221.
- Ten players, the four launcher parts and the ball share the eight
  sprites through a multiplexer: the objects sorted by height each pass
  (`sprites_sort`, `$8ADD`, a bubble sort) and placed by the raster
  slots.
- The menus are a bitmap screen at `$6000` with a colour screen at
  `$5C00`; the team pictures are drawn from `$C360` on, the faces from
  `$CD00` with a layer for each team.

## Mechanics

- **Teams.** The three human teams' figures are at `$B9D6`, `$B9D9` and
  `$B9DC` (`side0_attributes_set`, `$3ECD`): Verna stamina 45, power 1,
  tackle figure 61; Lacata 35, 2, 61; Draco 35, 1, 31. The cards show
  255 less the tackle figure as SKILL: 194, 194, 224. The eleven
  computer teams come from templates (`team_record_init`, `$3F32`):
  templates 1 to 10 rise from stamina 26 to 44, power 1 to 2, and fall
  in tackle figure from 207 to 1, in the computer's aiming delay from 20
  to 1, its keeper's delay from 30 to 1 and its throwing delay from 32
  to 5. Template 10 is the strongest.
- **Tackles.** `pair_distances` (`$B038`) measures the 45 pairs of
  players, from pair 44 down to 0, into a 10 by 10 table at `$1E49`,
  each distance written twice: at the cell found through `$F290` and at
  the mirror cell from `$F2CA`. `tackles_check` (`$8DD6`) reads each
  pair back through `$F290`. The right cell list starts 13 bytes later,
  at `$F29D`, and nothing reads it. Pairs 13 to 44 write and read the
  cell of the pair 13 before, which no other pair uses, so they work.
  Pairs 0 to 12 take their cells from the last 13 bytes of
  `pair_second` (players 6 to 9), four cells of row 0 that pairs 18 to
  21 use as well, and the last pair written to each, one of pairs 0 to
  3, wins. So 13 pairs are never seen to touch: 4 to 12 and 18 to 21,
  9 of them opponents (side 0's keeper with every side 1 player, player
  1 with 5, player 2 with 5, 6 and 7). A touch between side 0's keeper
  and one of players 1 to 4 also sends those pairs to the tackle and
  bump routines wherever they are: players 0 and 1 touching act on
  pairs 0, 4, 7 and 19 (*simulated*, Live tests).
- **Who wins a tackle** (`tackle_resolve`, `$8EF5`). A sliding player
  brings the other down when a random byte is at least the victim's
  side's tackle figure, unless that side has power-up P. Its only other
  reader in play is the computer's aiming (`ai_side1_target`, `$A898`,
  which tests its sign), so SKILL (255 less it) decides how easily a
  team's own players are brought down by a slide, and a higher SKILL
  makes it easier: a slide into a SKILL 224 side succeeds for 225 of
  the 256 random bytes (88 %) and into a SKILL 48 side for 49 (19 %),
  whatever the slider's own (*simulated*). The shop's extra skill (`shop_extra_skill`, `$AE59`,
  the figure down 10) and reduce skill (`shop_reduce_skill`, `$AE6F`, the
  computer's figure up 26) therefore work against the buyer. Otherwise the two
  players' facings decide, through `$B996`; a human player wins only
  with fire held. The loser goes down and loses stamina by the winner's
  power (`stamina_drain`, `$908A`), and the winner takes the ball if the
  loser had it.
- **Stamina.** Below 12 a player runs a step slower (`player_dir_step`,
  `$9F98`), and below 6 his throws are a step weaker (`player_move`,
  `$9E45`). Tile S adds 10 to each of the side's players, up to the
  team's figure; tile D takes 2 from each opponent.
- **The ball** (`ball_move`, `$380E`). Side walls at x `$1C` and `$108`
  bounce it, except on the ground in front of a warp tunnel (y `$108` to
  `$127`, `tunnel_check`), which sends it out of the other side. On the
  ground between x `$64` and `$C7` at either end it is a goal. Domes
  bounce it only on the ground (`dome_bounce`).
- **Tiles** (`tile_choose`, `$A994`). The type comes from `$BB21`,
  `00 01 02 03 04 05 06 08 08 08 0A`: a token, then F, R, P, S, D, G,
  W three times, and J only in a two player game. The electron bolt (E,
  type 7) and the burst (M, type 9) are never chosen, and their entries
  in the effect table (`$BBBF`) point at W's routine. The computer
  collects only tokens from tiles (`tile_check`, `$99FA`).
- **Shop** (`token_shop`, `$80A3`; prices `$2C23`): exit 0; bribe
  official 2, extra stamina 3, bribe timer 3, bribe trainer 4, extra
  skill 4, reduce stamina 4, extra power 6, reduce skill 6, bribe ref 6,
  reduce power 7 tokens. The computer's side collects tokens too
  (`$1EB2`) and never spends them.
- **League.** 11 teams; 100 points a win, 20 a draw, 5 a goal
  (`league_record`, `$994A`). The other fixtures of each week are
  decided at random (`league_week_end`, `$8519`). The human's team plays
  weeks 1 to 10 of every eleven and rests in week 11. A league lasts one
  run of eleven weeks more than the menu says: `league_init` (`$3EEF`)
  sets the run counter `$1EDB` to 2, so TEN WEEKS is 22 weeks and ONE
  HUNDRED WEEKS 121 (*simulated*: `match_over` run once a week ended
  TEN WEEKS after 22 weeks, TWENTY after 33, ONE HUNDRED after 121).
- **Knockout.** Ten rounds of up to three legs: 2 points a win, 1 a
  draw, 3 to go through (`knockout_round_end`, `$8195`). `knockout_init`
  (`$3F05`) puts templates 1 to 10 into the records in a shuffled order,
  and the prematch screen names the opponent by record round + 1. But
  `match_restart` (`$31C2`) uses that record's template number as a
  record number, so the computer plays with another team's figures in
  eight or ten rounds of ten, and the card shows those figures under the
  named team's face. The shuffle has ten outcomes: the named templates
  fall three a round (7, 4, 1, 8, 5, 2, 9, 6, 3, 10 and its rotations).
  The figures it plays with fall one template a round from template 9,
  7, 5, 3 or 1, wrapping from 1 to 10 once (*simulated*: every seed gave
  one of the ten orders, five of them with two rounds right).
- **Two player game.** A league of the two teams, ten weeks to a run;
  the length chosen is the number of runs (`twoplayer_week_end`,
  `$81E4`).
- **Saving** (`game_save`, `$BD50`; `game_load`, `$BD70`). The KERNAL is
  banked in for the transfer (`kernal_enter`, `$BE00`) and its own
  `SAVE` and `LOAD` write and read `$1C00`-`$1FFF` as file `0` (league),
  `1` (knockout) or `2` (two player game), named `@:` and the digit on
  saving so that it replaces the old one (`save_name_set`, `$BDC0`; the
  digit by game type from `$2293`).
- **Unused.** `wait_256_frames` (`$200F`), 41 bytes at `$3AB6`, and the
  jumps at `$2003`/`$2006` are reached by no code. The flag `$53` would
  play a tune over a match (`kickoff`, `sound_play`), but only the
  start-up's clearing of zero page writes it.

## Copy protection

- `game_start` (`$201A`) starts CIA 2's timers A and B with the same
  period, `$231F`, four cycles apart; `kernal_leave` (`$BEA0`) does the
  same after every save or load.
- `irq_handler` reads CIA 2's control register B on every interrupt
  (undocumented `LAX`/`ANC`); with timer B stopped the clock target `$76`
  becomes `$FF` and a match never ends. `keys_read` makes the same test
  and sends the interrupt chain to a slot that does not exist.
- `irq_slot_play_top` (`$8745`) adds timer A's low byte EOR timer B's,
  read four cycles apart, to `$2DD0` each frame: zero while the timers
  run in step. `$2DD0` is ORed into port 2's stick, used as the frame
  flag, as the play interrupt chain's first slot and as LOAD LEAGUE's
  file. It also counts in `$2468` the frames when two reads of timer A
  agree, which happens only when the timer has stopped; that is EORed
  into port 1's stick and picks the prematch message. The operands of
  these reads are moved to random mirrors of the timer registers each
  frame (`irq_slot_shop_row`, `$881D`). Both bytes are 0 in both
  snapshots, and stayed 0 over 3,000 frames on the kit's machine with
  the timers started as the game starts them (*simulated*).
- What the check is for is not stated anywhere in the game. A copy of
  the files started the usual way runs `game_start` and passes; a
  freezer cartridge's copy resumes without it and has to restart the
  timers itself, without a way to read back their period. That is the
  page's reading of its purpose, marked as one (not tested).

## Data tables

- Team templates: `$B9DF`-`$BA2B`, eleven bytes a field.
- Pairs of players: `$F243` (first), `$F270` (second), and the table
  cells `$F29D` and `$F2CA`.
- Fixtures: `$2F9E`, eight bytes a week, weeks 1-10 with four matches
  and week 11 with five.
- Dome layouts: ten, from `$2E73`, `$2E9B` and `$2EC3`; the layout
  `$1ED0` moves on after every match.
- Strings: `$261F`-`$2A03`, packed a nybble a character for the seven
  commonest (space, A, E, O, R, S, T) through the alphabet at `$BA36`.

## Sound

- The driver (`music_init`, `$0810`; `music_play`, `$0947`) plays seven
  tunes from `tune_table` (`$131E`): 0 the menu, 1 the prematch screens,
  2 the league table after a win or draw, 3 after a loss, 4 the team
  choice, 5 a goal for side 0 and the end of a match, 6 a goal for side
  1.
- 26 sound effects, 20 bytes each, at `$0F4A`-`$1151` (`effect_table`,
  `$0F16`); the launcher's hum takes voice 2 from the music (`hum_start`,
  `$1155`).

## The listing's error rate

- Sample, seed 20261030: 60 of the 1,273 line comments, drawn at random
  over the whole listing (`work/reports/sample-1/`). The checker, a fresh
  agent on claude-opus-5-5 that wrote none of them, found 11 wrong, one
  wholly and ten in a detail: `face_colour_lo/hi` (`$23F6`, `$2414`)
  called mask-list pointers colour sources, and are renamed
  `face_mask_ptr_lo/hi`; `mask_ptr_hi` missed its second use as a bitmap
  address; `fire_count` said it counts passes of fire held, where it
  counts only after a throw has started (and `player_move` said the throw
  leaves when fire is released, where it leaves at the press);
  `v1_slide_delay` and `file7_move` were each one out at an end;
  `thrower_block` counted passes where it falls twice a pass;
  `box_bitmap_lo` gave the box's address where it is the byte before;
  `timer_check_sum` left two readers out of its list; `dist_row_lo` said
  every reader takes entries 0-4; `irq_slot_shop_sprites` put slot 8 on
  the shop, which uses slot 3; and `ai_keeper_bottom` had the keeper's
  limit on the stick upside down and his jump tied to a centred stick.
  All eleven were corrected, with `player_move`, `side0_step` and
  `player_stamina`, which said the same things. The rate is 11 in 60,
  18 % (95 % interval 10.6 % to 29.9 %); a checker misses some, so it is
  a lower bound. The listing has not had a full audit.

## Live tests

- *Simulated*, `pair_distances` and `tackles_check` on the listing's
  memory with each of the 45 pairs placed touching and the other players
  40 pixels apart, in a one player game, noting each pair handed to
  `tackle_resolve`, `player_bump` or `player_pos_undo`: pairs 13 to 17
  and 22 to 44 alone for themselves; pairs 0 to 3 for themselves and
  pairs 4, 7, 19 (pair 0), 5, 8, 10, 20 (pair 1), 6, 9, 11, 12, 21
  (pair 2) and 18 (pair 3); nothing for pairs 4 to 12 and 18 to 21. The
  Discoveries grid runs the same test, and `test_rules.js` holds it.
- *Simulated*, the same test with the only four reads of `$F290` in
  memory (`ldx $F290,y` at `$8DE6`, `$8DFF`, `$8E44` in `tackles_check`
  and `$B05E` in `pair_distances`) pointed at `$F29D`: every one of the
  45 pairs is seen when it touches and acts on nothing else.
  `test_rules.js` holds it.
- *Simulated*, `tackle_resolve` with side 0's player 1 sliding into
  side 1's player 6 from 384 random states for each pair of figures: the
  victim's figure alone set the rate (88 % at 31, 20 % at 207, 50 % at
  128, 100 % at 1). Then with `random_next` (`$949E`) made to give each
  byte in turn, both ways round (`test_rules.js`): the victim went down
  exactly when the byte was at least the victim's figure, for figures 1,
  31, 128, 207 and 255 and either figure for the slider.
- *Simulated*, the end of `match_over` once a week from `league_init`'s
  state: a league ends after 22, 33 and 121 weeks for the first, second
  and last menu choices.
- *Simulated*, `knockout_init` and `match_restart`'s knockout path for
  1,772 seeds over the whole range: the named opponent and the figures
  loaded agree in no round of ten for half the seeds and in two rounds
  for the other half. `test_rules.js` holds 200 more.
- *Simulated*, the kit's machine (`kit/c64/machine.js`) from
  `play-match1.vsf` with CIA 2 running as `game_start` starts it, 3,000
  frames: 1,141 passes, a bar every 224 frames, `$2DD0` and `$2468` 0
  throughout.
- *Live*, VICE: the SELECT GAME menu, PLAYER 1 SELECT's three teams and
  figures, the KNOCKOUT ROUND screen and a match, as `orientation.md`
  describes.
- Read from `work/files`, the disk's files `0` and `1`: the game state
  bytes listed under Build.
