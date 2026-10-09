# IK+ — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/start.vsf`, the hand-over run on to `$0FB8`).

## Build

System 3's original disk, as a G64 bit image (`orientation.md`). The
game is four files that load whole and stay: `p` at `$0840`-`$BEFF`
(code, the arena picture, the fonts, the poses), `x` at `$BF00`-`$D000`
(the shouts), `m` at `$E000`-`$F147` (the music and sound effects) and
`c` at `$F150`-`$FD1F` (reflections, the bonus round, the arena's
colours). Nothing is loaded from disk once the game runs.

No version number was found. The only credit in the program is bubble
message `$0D`: "IK+ / COPYRIGHT 1987 / ARCHER MACLEAN" (`message_ptrs`,
`$3881`), and the top rows' character set has a © at code `$2E`.

## Memory layout

| Thing | Where |
|---|---|
| Jump table: 3-byte `JMP`s other modules call through | `$0843`-`$08B4` (`jp_*`) |
| Main loop, interrupts, start-up | `$08BB`-`$106A` |
| Fight logic, rounds, the computer fighters, hits, scores, messages | `$106D`-`$3AFA` |
| Drawing the fighters (sprites and characters), the tables they use | `$3AFB`-`$4277` |
| Arena picture, multicolour bitmap at `$4000` (rows 0-1 of it hold code) | `$4280`-`$517F` |
| Floor character set (`$5000`; codes `$30`-`$55` loaded, the rest built) | `$5180`-`$57FF` |
| Sprite memory, built as the game runs | `$5800`-`$67FF` |
| Top rows' character set | `$6800`-`$69EF` |
| The two screens (`$6800` floor only, `$6C00`) | `$6A30`-`$6BFF`, `$6C00`-`$6FFF` |
| 5-row font, 49 glyphs of 5 bytes | `$7000`-`$70F4` |
| The shield's three sprite shapes | `$7100`-`$71BF` |
| The "antics" module: sun's reflection, glints, bird, spider, worm, fish | `$71C0`-`$7CFF` |
| Pose tables: graphics pointers, tile counts, layouts, sprite masks | `$7D00`-`$827F` |
| Graphics of 70 poses, in 8-byte tiles | `$8280`-`$BE7F` |
| High-score initials (then the antics' variables) | `$BE80`-`$BEFF` |
| Six digitised shouts, 4 bits a sample, two shouts to a byte | `$BF00`-`$CFFF` |
| Rob Hubbard's music driver, the tune, the sound-effect player | `$E000`-`$F147` |
| Reflections, bonus round, arena colours | `$F150`-`$FCFF` |
| Variables and the high-score table | `$FD50`-`$FE8B` |
| Run-time tables built at start-up (mirror, mask, colour swap) | `$0400`-`$07FF` (`build_tables`, `$41B5`) |

Banking: `$01` = `$35` from `game_init` on (all RAM, I/O in). The video
chip uses bank `$4000`-`$7FFF`. The game owns the hardware vectors: NMI
`$0BE6` (`nmi_frame`), IRQ `$0904` and its successors (`$FFFE` is
rewritten by each raster handler).

## Start-up

`game_init` (`$0F4C`) runs once. It swaps page `$0C00` with page
`$3C00`, because the file holds the two the other way round (the frame
interrupt's code lives at `$0C00`), builds the high-score table from the
initials at `$BE80` and clears them, sets the PAL flag `$FD52` from the
KERNAL's `$02A6`, and copies the stack pointer the loader left into three
places (`protect_stack`, `$1020`; see Protection). The first call of
`game_reset` (`$16E1`, with `$FD50` = `$81`) then starts the music, the
frame interrupt (`nmi_timer_start`, `$1034`) and the one-time decryption
(`decrypt_once`, `$1957`), which:

- moves 86 bytes from `$1A40` to `$1015`, over the start-up code that
  has just run; the frame interrupt calls `$1015` every fourth frame
  from then on (the fist icons beside the scores);
- fills `$1A40`-`$1A95` from wherever the pointer at `$50` points (the
  blank character `$31` in the emulator, *live*: `demo.vsf`), wiping
  the first 25 bytes of `sprite_reset` with it;
- turns its own two calls into harmless stores;
- XORs `$7E0A`-`$7EFF`, part of the pose layouts, with `$1008`-`$10FD`
  as they stand after the move;
- writes RTS over itself from `$1955`.

All of this happens before the attract mode: `demo.vsf` already has the
decrypted layouts and the moved code (*live*).

## Timing

- **The frame.** CIA 2's timer A raises an NMI once a frame
  (`nmi_frame`, `$0BE6`), started at raster line `$F3` with a period of
  19,656 cycles on PAL and 17,095 on NTSC (latch from `$1955`/`$1956`
  and X = `$C6` + PAL flag, `nmi_timer_start`).
- **The raster chain.** Six IRQ handlers, each writing the next one's
  low byte into `$FFFE`: line 65 (the bitmap on, the sky's colour), 121
  (the band between the water's colours), 128 (the water's colour), 134
  (the lower half of the sun's reflection), 161 (text mode for the
  floor, the fighters' first sprite band) and the sprite multiplexer at
  lines `$BA`, `$D0` and `$E5` (`irq_sprite_band`, `$09D7`).
- **The game step.** `next_step` (`$1604`) waits until the frame count
  `$017C` passes the speed's entry in `step_frames` (`$15FE`: 2, 3, 4,
  5, 6, 7, read one place on for NTSC). Keys 1 to 5 set the speed
  `$011E` to 0-4; 3, the normal speed, gives 5 frames a step on PAL
  (*live*) and 6 on NTSC, ten steps a second on both.
- **TIME.** A BCD counter `$011C` set to 30 at each round (`next_round`,
  `$13E5`) and lowered by one every 50 frames in a fight (`nmi_tail`):
  a second on PAL, five sixths of one on NTSC.
- **Music on NTSC.** The frame interrupt skips every sixth music frame
  on NTSC (`$FDB2`), so the tune keeps its PAL tempo.

## Controls

Joystick in port 2 for player 1 (the white fighter), port 1 for player 2
(red). `read_joysticks` (`$1AFE`) turns a stick into one of sixteen
moves through `joy_moves` (`$1BBB`): the eight directions are moves 1-8,
and with fire 9-16; centred is no move. A fighter facing left uses the
mirrored table (`$1BDB`). When an opponent is close, the tables at
`$1BFB` and `$1C1B` replace forward and its diagonals with move `$14`.

The keyboard is read by `read_keys` (`$17AD`, from the frame interrupt)
through `key_pressed` (`$1922`), which drives keyboard rows on `$DC00`
and needs every column bit given to read low on `$DC01`. A key acts once
it has been held for twelve frames (`$4A`).

| Keys | Effect | Where |
|---|---|---|
| F1, or fire in port 2 | one-player game | `$18D2`, `$190E` |
| F3, or fire in port 1 | two-player game | `$18C2`, `$191A` |
| F5 | music off (SID silenced) or on | `$186C` |
| F7 | shouts and bonus-round effects off or on (`$FD51`) | `$18A1` |
| 1-5 | speed (`$011E` = 0-4) | `$17E9`, `speed_key_rows` |
| `*` | the sun's reflection colours, four sets | `$1807`, `reflection_colours` |
| D, O and M together | sky and water colours, eight sets | `$1837`, `sky_water_colours` |
| a key from each of R/I/P, T/O/@ and X/N/, together | the reflection's drift pattern, four sets (`$7665`) | `$1855`, `reflection_drift` |
| RUN/STOP | pause | `runstop_check`, `$116D` |
| S and E together | the trousers fall (first two levels) | `start_move`, `$1C40` |

The two three-key checks read rows 2, 4 and 5 at once, so any key from
each of three columns passes: D, O and M is the documented choice of
the first, and the second has no documented letters.

## The fight

- **Three fighters, two drawn with sprites.** Fighters 0 and 1 are each
  three sprites side by side, 12 pixels apart (`sprite_positions`,
  `$1551`), multiplexed in three bands below line 161. The third is
  drawn in the floor's multicolour characters (`build_char_fighter`,
  `$4042`; `place_char_fighter`, `$3F49`), with the floor's fine scroll
  (`$23`) moving it two pixels at a time. Which fighter is in front is
  `$0172`, set by a frame flag and by scoring a hit.
- **Double buffering.** The floor has two screens (`$6800` and `$6C00`)
  and two sets of sprite blocks; each step draws into the pair not
  shown and `next_step` flips them (`buffer_d018`, `$16CD`).
- **Poses.** 76 poses (`pose_width`, `$1CB0`), 70 with graphics. A pose
  is up to twelve rows of 8-byte tiles: the layout at `$7E00` + 12 ×
  pose gives each row's tile count and starting column. Facing left is
  drawn by mirroring every byte through `$0400` (`build_mirror`,
  `$41CF`).
- **Moves.** A move is a run of the frame script (`move_frames`,
  `$1F41`; 217 entries of `frame_pose` `$1F6B`, `frame_step` `$2044`,
  `frame_flags` `$211D`). Flag bits (`fighter_anim`, `$1D06`): 3 holds
  the frame while the same move is still requested (a move carries on
  while the stick is held), 4 lets a new request break in, 1 turns the
  fighter, 0 makes it the front fighter, 5 starts a fall, 6 marks a
  frame that can hit, 2 plays the script backwards.
- **Hits.** `check_hits` (`$2EBE`) tests six attacker-target pairs a
  step. An attack is one of ten poses (`hit_poses`, `$2D0A`: `$0E`,
  `$10`, `$12`, `$14`, `$15`, `$1B`, `$20`, `$43`, `$45`, `$44`); it
  lands when its blow, a set distance in front of the attacker
  (`attack_reach`, `$2D15`), comes close enough (`attack_width`) to one
  of up to six test points the target's pose presents (`pose_hit_class`
  `$2D9D`, `hit_points` `$2DE6`).
- **Points.** A hit scores a full point (two dots) or a half point (one
  dot) by the facing relation of the two fighters (`half_point_facing`,
  `$2B6C`), and hundreds of points by attack: full 200, 800, 400, 800,
  400, 1,000, 400, 1,000, 800, 1,000; half 100, 400, 200, 400, 200, 500,
  200, 1,000, 400, 1,000 (`$2D33`, `$2D3D`, BCD hundreds).
- **The points painted on a fallen fighter.** While a felled fighter
  lies on the floor, `knock_marks` (`$3BA3`) paints the points of the
  hit into its pose in six multicolour digits (`mark_bytes`, `$3C11`:
  1, 2, 4, 5, 8, 0), the first digit chosen per attack by
  `attack_knock_full` and `attack_knock_half` (`$2D47`, `$2D51`). For
  eight attacks the painted number is the number scored. For attack 3
  (pose `$14`, the punch on joystick up and forward) it is half: 400
  painted for 800 scored, 200 for 400. For attack 6 (pose `$20`, the low
  kick from a crouch on joystick down) it is half too: 200 for 400, 100
  for 200 (live, "Live tests").
- **The round.** `round_over` (`$13CB`) ends it when TIME runs out or a
  fighter has six dots. `round_end` (`$11E3`) ranks the three by dots,
  then by the points of the round (`compare_fighters`, `$13B4`), and
  looks the result up in `round_result` (`$11AC`) by the tie case and
  which places are human: a human last alone drops out, a tie for last
  drops nobody, a three-way tie lets everyone play on. TIME left is
  added to the winner's score, a second at a time.
- **Levels and difficulty.** `LV` (`$010C`, BCD) goes up each round.
  Every third round is the bonus round, and the difficulty step `$018B`
  rises then, to at most 5. The step picks how long a fallen fighter
  stays down (`down_time`, `$2F37`: 255 down to 50 frames), when a
  computer fighter gets up (`getup_delay`, `$1D00`), and the computer's
  defence and attack chances (`$2B4C`, `$2B52`, `$2B58`) and spread
  (`$2B5E`); the level (`LV` AND 7) can override them (`level_defend`
  `$2980`, `level_attack` `$2988`).
- **The computer fighters** (`computer_fighter`, `$2A1A`) choose a
  target (`choose_target`, `$29BE`: with one human, from the tables at
  `$2A08` by level; otherwise the leader of the other two), defend
  against a close attack they have an answer for (`defend_moves`,
  `$2BD1`), and otherwise attack from a band of moves set by distance
  (`attack_bands`, `$2C7D`; `attack_moves`, `$2C11`).
- **Belts.** `belt` (`$263E`) shows the leading human's belt from the
  score: white, then yellow at 8,000, green 16,000, purple 25,000,
  brown 35,000, black 50,000 (`belt_scores`, `$262F`).
- **The pause** (`pause`, `$10BB`) lines the three fighters up and
  recolours the floor so that copies of the character-drawn fighter
  appear beside them in green and yellow: five fighters stand in a row.
  It clears each fighter's move and does not restore it, so a fighter
  who was on the floor comes back standing: the RUN/STOP cheat.
- **The trousers.** For any fighter with no move requested,
  `start_move` (`$1C40`) starts move `$20` for a random 1 to 64 steps
  after 128 idle steps with a 1 in 32 chance each step, or at once on
  the first two levels while S and E are held (*live*, on fighter 2).

## The bonus round

`bonus_round` (`$F2AB`, mode 5), after every second fight round, for
each human player in turn (player 2 first):

- 64 balls are thrown (`throw_ball`, `$F63E`), from the left or right,
  from the six slots 0-5 (sprites); the launch rate starts at `$0080`
  and grows by 8 a ball up to `$01xx` with the low byte from `rate_limit`
  (`$F725`, by bonus round); each new ball's weight starts at `$0C` and
  grows by one a ball up to `$38`.
- From the slot `flash_slot` (`$F71D`) gives for the bonus round
  (`$FDA1` AND 7: 6, 6, 5, 6, 4, 6, 2, 6, where 6 means none) up to
  slot 5, balls are thrown flashing (flags `$31`) and bounce low and high
  in turn (`ball_move`, `$F555`): none in the first two bonus rounds,
  slot 5 in the third, slots 4-5 in the fifth, 2-5 in the seventh.
- The joystick moves the shield through seven guards (`shield_moves`,
  `$F8B3`): high, middle and low each way, and the turn.
- A ball that touches the shield while its X is from `$4A` to `$6F` is
  deflected: 100 points, and two sound effects, the second a little
  higher each time (`effect_2_note`, `$F0FF`). A ball that touches the
  player (sprite-to-background collision) knocks them over and throws
  the shield.
- Surviving all 64 balls gives 5,000 points (`$018A` = `$50`) and
  message `$15`, "SURVIVAL BONUS OF 5000 POINTS".

## Graphics

- **The arena picture** is a multicolour bitmap shown from character
  row 2 to 13 (lines 66-161): sky, torii gate, a tree in blossom, the sun
  setting over a bay. Its colours come from file `c` (`arena_colours`,
  `$31CC`). Rows 0 and 1 of the bitmap hold code (`$4000`-`$4277`), and
  the last 384 bytes of the picture double as floor characters
  `$00`-`$2F`.
- **The floor** below line 161 is text mode on character set `$5000`:
  blank `$31`, the judge (`$32`-`$55`), the speech bubble and its
  letters built from the 5-row font (`$BA`-`$EA`), the third fighter's
  tiles, and the reflections.
- **Reflections.** The two sprite fighters' feet are reflected in the
  floor (`sprite_reflections`, `$F150`: rows 3-10 of each lowest sprite
  copied upside down into rows 11-18 through the mask table `$0500`, a
  one-colour silhouette), and so is the third fighter
  (`char_fighter_reflection`, `$F1F9`, into characters `$F0`-`$F8`).
  Bonus-round balls have reflections and a rolling spot (`$F7A5`,
  `$F7DE`).
- **The judge** stands in the widest gap between the fighters
  (`place_judge`, `$324B`), talks while a bubble is up by animating six
  face cells (`judge_talk`, `$0D01`) and taps his foot (`judge_foot`,
  `$0DB4`).
- **The antics** (`$71C0`-`$7CFF`, every other frame): the sun's
  reflection on the water is a sprite whose 21 rows ripple
  independently (`antics_step`, `$7571`); five glints flicker on the
  water; and now and then one of four creatures appears on one of eight
  routes each (`antics_creature`, `$767E`): a bird (sometimes two),
  a spider on its thread, a worm and a leaping fish with a splash.

## Text

Three alphabets:

| Alphabet | Where | Codes |
|---|---|---|
| Top two rows | character set `$6800` | `$00`-`$09` digits, `$0B` +, `$0C`/`$0D` point dots, `$0F` ?, `$11`-`$2A` A-Z, `$2C` -, `$2D` /, `$2E` ©, `$31` space, `$32`-`$35` the fist icon |
| 5-row font | glyphs at `$7000`, built into floor characters `$BA`-`$EA` (`build_font`, `$240A`) | floor code = ASCII + `$8A`, from `0`; `@` is blank, `:` is a comma |
| Message text | `message_text` (`$348A`), printed by `print_message` (`$38BF`) | ASCII with codes: 0-9 that many spaces; `$0A`-`$0C` the name of the fighter placed first, second, third; `$9A`/`$9E` double-width on and off; `$9C` new line; `$9D` the TIME bonus; `$9B` end; `<` prints as !, `=` as + |

Belt and fighter names and the table's headings are ASCII with `@` for a
space (`belt_names` `$25FE`, `fighter_names` `$3473`, `table_header`
`$26BF`). The high-score initials at `$BE80` are ASCII with bit 7 set.

The 29 bubble messages (`message_ptrs`, `$3881`; `@` shown as a space,
`/` a new line, `{1st}` a fighter's name):

| No. | Text | Shown |
|---|---|---|
| `$00`-`$09` | round results, for example "{1st} WINS / {2nd} STAYS IN / {3rd} IS OUT", "YOU ARE ALL OF / EQUAL ABILITY, / SO PLAY ON" | `round_result` |
| `$0A` | {1st} IS BEST / {2nd} IS SECOND / {3rd} IS WORST | demo rounds |
| `$0B` | PRESS F5 FOR MUSIC ON OR OFF / F7 FOR SOUND FX | demo rounds |
| `$0C` | PLAYERS ARE / NEEDED!!!! | demo rounds |
| `$0D` | IK+ / COPYRIGHT 1987 / ARCHER MACLEAN | demo rounds |
| `$0E` | WHERES EVERYBODY / GONE!!!!! | demo rounds |
| `$0F` | USE FIRE BUTTONS / OR F1 AND F3 KEYS / TO START A GAME | demo rounds |
| `$10` | {1st} IS AWARDED / {TIME}00 POINTS / AS A TIME BONUS | `round_end` |
| `$11` | MATCH OVER (double width) | `$13A7` |
| `$12` | {3rd} HAS ACHIEVED / HALL OF FAME / ENTRY STATUS | `game_over` |
| `$13` | {3rd} DID WELL BUT / HAS NOT QUALIFIED / FOR HALL OF FAME | `game_over` |
| `$14` | PRACTICE IS / DEFINITELY / RECOMMENDED | `game_over` |
| `$15` | SURVIVAL BONUS OF / 5000 POINTS | bonus round |
| `$16` | DEFLECT BALLS FOR / 100 POINTS EACH / OR AVOID THEM! | bonus round |
| `$17`, `$18`, `$1C` | SPARE BUBBLE | never: no store of `$81` or `$84` can hold them |
| `$19` | KEYS 1 TO 5 CHANGE / THE GAMES SPEED! / 3 IS NORMAL | demo rounds |
| `$1A` | USE RUN STOP KEY / TO GO INTO / PAUSE MODE | demo rounds |
| `$1B` | DO YOU FEEL LIKE / A LOST NINJA!!!! / TRY IK+ FOR ACTION | demo rounds |

The demo rounds pick at random from `demo_messages` (`$11C8`).

## Sound

- **The tune** is Rob Hubbard's, played by his driver at `$E000`
  (`music_play`, `$E00F`, once a frame): three voices, each a track of
  pattern numbers and transpositions (`track_1`-`track_3`,
  `$EABB`-`$ECE1`), 40 patterns, fifteen instruments of sixteen bytes
  (`instruments` `$E975`, `instruments_2` `$E9ED`) with vibrato, pulse
  sweep, slides, arpeggio chords (`arp_chords`, `$E8F8`), drum tables
  and a filter sweep (`note_flags`, `$E326`). A tick is three frames
  (`tempo`, `$E695`), and one tick in every 113 frames takes four
  (`tempo_nudge`, counting down from `$70`): 3.027 frames a tick on
  average, measured on the port over 33,900 frames.
  The three tracks end together after 23,054 frames (7 minutes 40
  seconds on PAL) and start again. No instrument sets flag bit 6, the
  fixed note for the first frames, so that code never runs with this
  tune, and instrument 14 is never played (measured on the port).
  Instruments 1, 7 and 8 sweep the filter on voice 3 alone (`$D417` =
  `$F4`, resonance 15; the cutoff from `$40` down by 12 a frame,
  wrapping round) and with flag bit 7 put a one-frame noise burst on
  voice 3 about every sixth frame (3,741 in one pass of the tune),
  switching `$D418` from low-pass (`$14`) to band-pass (`$24`) for that
  frame, at volume 4.
- **The port.** The page's player runs a JavaScript port of the driver
  and the effect player. It matched the game's own code, run in the
  kit's 6502 simulator from `work/start.vsf`, write for write over 82,400
  frames: the tune from its start for 40,000 frames with effect pairs
  started over it at 119 random moments, the tune alone for 20,000, each
  effect button for 600, and 20,000 frames with changed instruments and
  effects that reach the paths this tune never takes. Every instruction
  of the driver and the effect player ran except those of `effect_stop`
  (`$EF88`), which nothing calls (`work/music/test_driver.js`).
- **Sound effects.** A small player (`effects_play`, `$EE45`) runs after
  the tune on voices 1 and 2: six effects, each a frequency script with
  a step and an acceleration. Only the bonus round's bounce (effects 0
  and 1) and deflection (2 and 3, also at a game's start) are used;
  effects 4 and 5 are never started.
- **The shouts.** Six digitised shouts, 4-bit samples written to the
  volume register `$D418` from CIA 1's timer interrupt (`sample_play`,
  `$0934`) at 224-255 cycles a sample on PAL (about 3.9-4.4 kHz at
  985,248 Hz) and 272-303 on NTSC (about 3.4-3.8 kHz); each shout plays at a randomly chosen rate in that
  range (`sample_start`, `$0EE3`). They share their bytes: three in the
  high nibbles of `$BF00`-`$CFFF`, three in the low. A fighter's new pose
  picks the shout (`shout_for_move`, `$0E86`): an attack, a scoring hit
  (sometimes with a second shout a few frames later) or a fall.

## Hardware registers

| Register | What the game does with it | Routine |
|---|---|---|
| `$D000`-`$D010` sprite positions | the fighters per band, the antics' sprites at the top, the bonus balls | `fighter_sprites`, `irq_sprite_band`, `antics_sprites`, `bonus_sprites` |
| `$D011` control | multicolour bitmap at line 66, text from line 161 | `irq_picture_on`, `irq_line161` |
| `$D012` raster | the next interrupt's line; read for waits and as randomness | every raster handler, `random` |
| `$D015`, `$D017`, `$D01B`-`$D01D` | sprites on, expansion, priority, multicolour | `fighter_sprites`, `antics_sprites`, `sprite_reset` |
| `$D016` | multicolour on; the floor's fine scroll for the third fighter | `irq_picture_on`, `irq_line161` |
| `$D018` | screen and character set per region: `$BA` top rows, `$B0` bitmap, `$A4`/`$B4` floor | `nmi_frame`, `irq_picture_on`, `irq_line161` |
| `$D019`, `$D01A` | raster interrupt acknowledged and enabled | raster handlers, `game_init` |
| `$D01E`, `$D01F` | collisions latched each frame into `$01A6`, `$01A5`; the bonus round reads the latches | `nmi_frame`, `bonus_step` |
| `$D020` | border: black, 9 (brown) when a game starts | `game_reset`, `$18F7` |
| `$D021`-`$D023` | sky, purple band, water; dark grey floor with multicolours `$0A`, `$00` | raster handlers |
| `$D025`-`$D02E` | sprite multicolours and colours; the reflection's two sprites recoloured at line 134 | `fighter_sprites`, `irq_reflection` |
| `$D400`-`$D416` | the tune's registers copied from `$E5E3`; effects; F5 silences all | `effects_play`, `effect_start`, `read_keys` |
| `$D417`, `$D418` | filter routing and volume; the shouts' samples go into `$D418` | `note_flags`, `sample_play` |
| `$D800`-`$DBE7` | colour RAM: the top rows, the arena, the floor | `top_line`, `arena_colours`, `floor_colour_cols` and others |
| `$DC00`, `$DC01` | joysticks and keyboard | `read_joysticks`, `key_pressed`, `shield_stick` |
| `$DC04`-`$DC0E` | CIA 1 timer A: the shouts' sample rate and interrupt | `sample_start`, `sample_play` |
| `$DD00` | video bank `$4000` | `nmi_frame` |
| `$DD04`-`$DD0E` | CIA 2 timer A: the frame NMI | `nmi_timer_start` |

Not touched: the light pen (`$D013`, `$D014`), the SID's read-only
registers (`$D419`-`$D41C`: paddles, voice 3's oscillator and envelope),
the CIAs' time-of-day clocks and serial ports, CIA 2's timer B and port
B (`$DD01`). CIA 1's timer B has its latch zeroed once
(`nmi_timer_start`) and is never started.

## Protection

Besides the loader's track-41 check (`orientation.md`), the game
checks that the genuine loader ran:

1. **The stack pointer.** The last loader stage leaves the stack pointer
   at `$0A`. `protect_stack` (`$1020`) stores it with `STA $08B8,X` and
   `STA $18F3,X`, which land on the main loop's `LDX` operand (`$08C2`)
   and on `$18FD` only when X is `$0A`, and stores X + 1 into `$1712`.
   Starting a game puts `$18FD` back into `$08C2`, so a game runs with
   the stack at `$010A`.
2. **The return address on the stack.** In a fight, when the frame
   counter `$44` AND `$FE` is `$A0`, `fight_step` (`$106D`) checks that
   `$0109` holds `$CF`, the low byte of the main loop's `JSR $106D` at
   `$08CD` as it lies on that stack. If not, it calls the frame
   interrupt's tail `$0CBA` as a subroutine; its `RTI` returns through a
   stack that holds no interrupt, and the `JSR $16E1` after it is never
   reached. *Live*: with `$0109` poked to 0 at the check, the CPU ran
   into the stack page and stopped on a `$02` (JAM) byte at `$01C5`; the
   frame interrupt never came again and the screen fell apart.
3. **The loader's byte at `$010B`.** `char_fighter_reflection` checks
   that it is `$A2` or `$A3` (`LSR`, `EOR #$51`) and jumps away through
   `JMP ($00A9)` if not (`$F1F7`). `pose_layout` (`$401D`) writes it plus
   `$64` into the pose layouts at `$7EEE` before every use: `$06` with
   the genuine loader.
4. **The decryption key.** `decrypt_once` XORs `$7E00`+X with
   `$0FFE`+X for X from the value at `$18FD` up to `$FF`: with the
   genuine `$0A`, `$7E0A`-`$7EFF` with `$1008`-`$10FD`. Any other stack
   pointer decodes another stretch with another key.
5. **The reset's clearing loop.** `game_reset` clears 221 bytes with
   `STA $FF00,Y`, whose operand the start-up and the game start point at
   `$010B` (the loader's stack pointer plus one, into `$1712`): it clears
   `$010C`-`$01E8`, the game's variables, and leaves the loader's bytes
   below. `sprite_reset` writes `$FF` into the operand's high byte during
   the first reset, but no reset runs before a game start puts 1 back,
   and the decryption then wipes that store.
6. **`build_mirror`'s return.** `build_mirror` (`$41CF`) returns
   through a pushed address to an RTS byte inside the shouts (`$C3C0`);
   `build_mask` then breaks that trick (`$41D2` = `$FF`), so a second
   call would crash.

## Data tables

| Table | Where | Contents |
|---|---|---|
| `joy_moves` and three variants | `$1BBB`-`$1C3A` | move for each stick and fire state |
| `move_frames`, frame script | `$1F41`, `$1F6B`-`$21F5` | each move's frames: pose, step, flags |
| `hit_poses` … `hit_points` | `$2D0A`-`$2EBD` | attacks, reach, points, knock-back, reactions, test points |
| `down_time`, `getup_delay` | `$2F37`, `$1D00` | time on the floor by difficulty |
| computer fighters' tables | `$2980`-`$2C87` | skills by level, chances, replies, attacks by distance |
| `round_result` | `$11AC` | who stays in and which message, by ranking and ties |
| `belt_scores`, `belt_names` | `$262F`, `$25FE` | belts |
| `message_ptrs`, `message_text` | `$3881`, `$348A` | 29 bubble messages |
| pose tables | `$7D00`-`$827F` | graphics pointers, tile counts, layouts, sprite masks |
| bonus round | `$F51E`-`$F91B` | collision bits, ball shape, heights, rates, shield moves |
| music | `$E47A`-`$ECE1` | frequencies, instruments, drum tables, tracks, patterns |
| effects | `$F07E`-`$F147` | scripts and two 8-byte records per effect |

## Listing accuracy

A sample of 80 of the listing's 1,113 comments (seed 20261009; 60 of the
986 written by hand, 20 of the 127 written from templates) was checked
against the bytes by an agent that wrote none of them: 7 were wrong, 8.8 %
(95 % interval 4.3 % to 17 %), 9.4 % weighted by the two strata's sizes
(hand 6 of 60, templates 1 of 20). The wrong ones had a detail wrong,
none what the routine does: an end address eight bytes long, a font said
to be built once at start-up that is built each time the high-score
table is shown, a sprite pointer said to be cleared that gets the
shield's shape, a carry read from the wrong byte, a flag's condition too
narrow, a fish row said to be read that is not, and the digits painted on
a fallen fighter described as generic marks. The listing's comments for
all seven, and for twelve others that shared their errors, match the
bytes. The rest of the listing has had no check beyond this sample.

## Live tests

All on VICE 3.13.2, PAL, from `work/play-round1.vsf` (a one-player game,
round 1) unless named; scripts `work/scripts/live1.py` to `live8.py`.

- **Frames per step**, non-stopping checkpoints on `$161C` (once a step,
  after the waits) and on `nmi_frame` (the control), 300 frames per
  speed from a fresh load: speed 0 (key 1) 82 steps, speed 1 73, speed 2
  60, speed 3 50, speed 4 43. Speeds 2-4 are 5, 6 and 7 frames a step as
  `step_frames` says; at speeds 0 and 1 the step's own work runs past
  its 3 or 4 frames now and then (3.7 and 4.1 frames a step measured).
- **TIME**: 500 frames took it from 22 to 12, one every 50 frames.
- **The protection check** ran once in those 500 frames (`$1084`) and
  its failure path (`$108B`) never; with `$0109` poked, see Protection.
- **Keys**: `*` stepped `$FD53` and the reflection colours `$FD54`-`$FD57`;
  D, O and M stepped `$F5` and the sky colour `$F3`; P, O and N stepped
  `$7665` by 4, and so did R, T and X (any key from each column). A key
  held repeats every 12 frames.
- **The bonus round**: with fighter 0's dots poked to 6 in each round,
  rounds 1 and 2 were fights and round 3 (`LV 03`) the bonus round, with
  message `$16` in the judge's bubble (`work/live-bonus.png`).
- **S and E** with fighter 2 idle started its move `$20`, the trousers
  (`$013D`+2 = `$20`).
- **The RUN/STOP cheat**: fighter 0 knocked down (`$014C` = 2, pose
  `$2B`); RUN/STOP twice; fighter 0 standing in pose 0 with no move.
- **The five fighters of the pause**: green, white, yellow, red and blue
  in a row (`work/sess-pause.png`).
- **No reset in the attract mode**: 15,000 frames from `work/demo.vsf`
  ran no `game_reset` and left `$FF40` unchanged.
- **The decryption before the attract mode**: `work/demo.vsf` holds the
  decrypted layouts at `$7E0A`, the moved code at `$1015` and `$31` at
  `$1A40`.
- **Painted points**, checkpoint on `$307B` (a hit scored) with the
  computer fighters fighting, `work/scripts/live7.py`: attack 3 added 800
  to the hitter's score twice with `$FD8A` = 2 (400 painted); attack 6
  added 200 with `$FD8A` = 0 (100) and 400 with 1 (200); attacks 1, 2,
  4, 5 and 8 added what they painted. `work/live-points-6-04-25.png` shows
  200 over the fallen fighter as the score reads 400.
