# Delta — verified technical facts

Current truth for this game. How the understanding developed is in
`agent-history.md`. Every fact names the routine or table it comes from
(names as in `symbols.json`). Unless marked *live*, a fact comes from
reading the code in `work/entry.vsf`, the hand-over snapshot that
`orientation.md` describes. *Live* facts were checked in VICE x64sc
(v3.13.1 release, PAL) on 1 October 2026; the tests are listed at the end.

## Build

- The image is a crack by the Reflex Cracking Squad with its own packer
  and intro (`orientation.md`); the game's entry is `game_entry` `$1770`.
- No version string. The title texts the game stores say
  "(c)MCMLXXXVI" and "(c)1986 THALAMUS" (`title_texts` `$F7B0`); the
  title screen the player sees is a picture that says MCMLXXXVII and
  (c)1987.
- `$9FF4` holds the PETSCII text `S:DEMO DELTA`, a disk-drive command to
  scratch a file called DEMO DELTA, left in memory by the developer's
  tools; nothing reads it (`leftover_9ff2`).

## Memory layout

All of RAM is used. VIC bank 1 (`$DD00` = `$96`), screen `$4400`,
character set `$4800`; `$01` = `$35` during play (`bank_io_only`).

| Range | What |
|---|---|
| `$0400`-`$07C9` | sound-effect player and its 21 effects (`sfx_play_frame`, `sfx_rec_a`, `sfx_rec_b`) |
| `$0808`-`$0FFF` | icons, title keys, controls, high-score table code; game state `$0F00`-`$0FFF` |
| `$1000`-`$12FF` | variables: band chain, stars, per-slot enemy tables, scores, purchase state |
| `$1300`-`$13FF` | sprite animation lists (`anim_lists`) |
| `$1400`-`$3FFF` | game code: start-up, raster bands, multiplexer, hazard rows, character-drawn fire, ship, weapons, banner, deaths |
| `$4000`-`$43FF` | sprite shapes 0-15 (title text, interlude pictures); variables `$43C0`-`$43F7` |
| `$4400`-`$47FF` | the screen (sprite pointers at `$47F8`) |
| `$4800`-`$49FF` | the character set, 64 glyphs (extended-colour mode) |
| `$4A00`-`$7FFF` | sprite shapes `$28`-`$FF`: banner, logo/rocks, hazards, scenery, icons, panel, explosion, ship, enemies |
| `$8000`-`$9FFF` | attack waves, enemy movers, enemy fire, pause, stage changes, sound queue, difficulty tables |
| `$A000`-`$BBFF` | wave data: hit points, paths, colours, segments, wave records, velocity lists, stage wave lists |
| `$BC00`-`$CFFF` | Rob Hubbard's music: player `$BDE4`-`$C38D`, instruments, 13 tunes, patterns |
| `$D000`-`$DEFF` | under the I/O area, read with `$01` = `$34`: hazard animation tables and spawn lists (*live*: `$01` = `$34` at `$20C5`) |
| `$E000`-`$EB7F` | the second set of hazard shapes, exchanged with `$4C00`-`$577F` |
| `$EB80`-`$FFFF` | stage words, title pictures, high-score table, stage tables, font, masks, vectors |

## The frame

- The main loop (`main_loop` `$17C9`) only waits for raster line `$E4`
  and runs the sound (`sfx_queue_service` `$9D60`). Everything else runs
  in a chain of raster interrupts.
- `irq_handler` `$1800` (hardware vector `$FFFE`) saves the registers
  and jumps through `$1000/$1001`; each band handler sets the next
  band's line and handler (page `$18`) and ends at `irq_exit` `$1768`.
- Play frame, from `$1888` (line `$2E`): 38 columns, then
  `irq_band_top` (screen on, extended colour), the multiplexer, the
  hazard-row bands, `irq_band_bottom` (line `$F3`, the icon row) and
  `irq_band_frame_top` (line `$F9`: `enemy_fire_setup`, pause, stars,
  panel). *Live*: in play the handlers `$1888`, `$180E`, `$18A0`, `$18D0`
  each ran 50 times in 50 frames; on the title `$180E`, `$1864`, `$18A3`,
  `$18A6`, `$18A9`, `$18AC` every frame and `$185E`, `$1861`, `$18C5`
  on alternate ones.
- NMI points at an RTI (`nmi_rti` `$FFF8`): RESTORE does nothing
  (*live*: pressing it in play changed nothing).

## Text

The game's alphabet (found by letter differences in one pass, `30-text`):

| Code | Character |
|---|---|
| `$00`-`$19` | A-Z |
| `$1A` | . |
| `$1B` | (c) |
| `$1C` | space |
| `$1D`-`$26` | 0-9 |

Glyphs: `banner_font` `$FC60`, 20 bytes each (39 glyphs), drawn at half
width into sprites by `banner_draw_step` `$3B80`; the panel's score
digits are separate 8-byte glyphs at `score_digits` `$FB20`.

Strings: `title_texts` (BY / STAVROS / FASOULAS / (c)MCMLXXXVI /
(c)1986 THALAMUS), the high-score table (STAVROS, ANDREW, GARY,
THALAMUS), TOP SCORES, DEMO, SHOOT ALIENS AND COLLECT WEAPONRY, GAME
OVER (`title_texts_b`); DELTA MISSION COMPLETE, PLAYER n, FASTEN YOUR
SEATBELT, GAME OVER (`messages` `$FB70`); the stage words (`stage_words`
`$EB80`).

## Stages

32 stages (`stage_advance` `$91EF`; after stage 32, `game_completed`
plays tune 12, shows DELTA MISSION COMPLETE and starts again at stage
1 with the next difficulty). Each banner is three words from
`stage_words`, chosen by `stage_banner_table` `$F880`; *live*: poking the
stage-clear state in stage 1 brought up "ENTERING ROCKS OF DEATH /
STAGE 02".

| Stage | Banner | Stage | Banner |
|---|---|---|---|
| 1 | WELCOME 10 YEARS LATER | 17 | LEAVING CITY OF SECRETS |
| 2 | ENTERING ROCKS OF DEATH | 18 | ENTERING ROCKS OF DUST |
| 3 | LEAVING ROCKS OF DEATH | 19 | LEAVING ROCKS OF DUST |
| 4 | ENTERING CAVES OF ILLUSION | 20 | ENTERING SUN OF DREAMS |
| 5 | LEAVING CAVES OF ILLUSION | 21 | LEAVING SUN OF DREAMS |
| 6 | ENTERING FURTHER SPACE | 22 | ENTERING STORM CLOUDS |
| 7 | ENTERING ANCIENT TEMPLE | 23 | LEAVING STORM CLOUDS |
| 8 | LEAVING ANCIENT TEMPLE | 24 | ENTERING ANCIENT CITY |
| 9 | ENTERING SEA OF DREAMS | 25 | LEAVING ANCIENT CITY |
| 10 | LEAVING SEA OF DREAMS | 26 | ENTERING ROCKS OF DEATH |
| 11 | ENTERING ASTEROID STORM | 27 | LEAVING ROCKS OF DEATH |
| 12 | LEAVING ASTEROID STORM | 28 | ENTERING FURTHER SPACE |
| 13 | ENTERING JELLY OF DREAMS | 29 | ENTERING HIDDEN TEMPLE |
| 14 | LEAVING JELLY OF DREAMS | 30 | LEAVING HIDDEN TEMPLE |
| 15 | ENTERING FURTHER SPACE | 31 | ENTERING FURTHER SPACE |
| 16 | ENTERING CITY OF SECRETS | 32 | ENTERING FINAL CITY |

The words LOST and DRAGONS are in the table but no stage uses them.

The ENTERING stages (except FURTHER SPACE) have hazard rows: one or two
rows of large two-sprite shapes that scroll in along the top and bottom
of the play area (`stage_hazard_table` `$F900`: row count, colours,
spawn-list page). The rows come from spawn lists under the I/O area
(`hz_spawn_lists` `$D300`), a new hazard every eighth frame
(`hazard_rows_step` `$2080`), animated from `hz_anim_lists` `$D200`
(`hazard_frames_step` `$9480`), moving 3 pixels a frame. The LEAVING
stages, FURTHER SPACE and stage 1 have none. Between stages the
hazard shapes in the VIC bank are exchanged with the second set at
`$E000` (`stage_gfx_sequence` `$9580`), 128 bytes a frame.

## Attack waves

- Each stage is a list of groups (`stage_waves_a` `$B800` for stages
  1-21, `stage_waves_b` `$B900` from stage 22), each an index into the
  8-byte `wave_records` `$AB00` (`enemy_spawn` `$811F` decodes them: hit
  points, animation, colour, side, points, path, start Y, delay).
- Up to seven enemies at once (sprites 1-7). Each follows a path
  (`path_lists` `$B500`) of segments (`path_segments` `$A880`) that run
  velocity lists (`velocity_lists` `$B000`) of (dx, dy) steps, mirrored
  as the record says (`enemy_move_1` `$82CC` and six copies).
- Hit points: `wave_hits_table` `$A100` → `$1241`-`$1247`; 0 or 1 dies at
  the first hit, `$FF` cannot be destroyed. An enemy can change into a
  new form instead of dying (bit 7 of its segment's byte 3).
- When slot 1 holds an indestructible enemy and slot 7's enemy is
  destroyed, the whole wave explodes (`enemies_wave_timers` `$9024`):
  shooting the leader destroys the escort.
- Credits: when a group ends and none of its enemies escaped, a group
  marked to carry a credit (most are) adds one (`wave_spawn_step`
  `$8010`, `$80B5`); a group marked with bit 6 takes one away.

- *Recorded* (the game's code run in the kit's machine with nobody
  playing, `waves.html`; stages 1-20 compared with VICE frame by frame; stages 14, 15, 19 and 20
  differ in places, `TODO.md`):
  - stage 1 ends with a boss, record `$0D`: slot 7 has 8 hit points and
    parks at X `$CF`, Y `$8C` while six indestructible escorts circle it.
    The group waits for all seven (`$1298`) and the escorts never leave, so
    the stage ends only when the boss is destroyed; destroying slot 7 while
    the wave timer `$129E` runs and a weapon has hit (`$129D`) explodes the
    escort (`enemies_wave_timers`, `$904D`);
  - across the 32 stages, 36 of the 424 groups stay on screen until shot;
    the rest fly off on their own;
  - the shop is one of records `$45`-`$4D`, 30 shops in the 32 stages;
  - an enemy shows the empty sprite `$9B` for its first one to three frames
    and at the end of its explosion, and at no other time.

## The shop

- The shop is a group like the others (`$1288`, bit 4 of the record's
  byte 2): its sprites are the weapon icons, flying through the play area.
  In stage 1 it is the second group (`stage_waves_a` entry 1, record
  `$45`). *Live*: it arrived about 150 frames into stage 1.
- An icon's price is its number, 1-7 credits (`shop_try_buy` `$2261`).
  Icons the player can afford are light blue, the rest grey
  (`icons_update` `$0808`).
- Touching an icon that costs more than the credits, or a second icon in
  the same shop, counts as being hit (`$1087`): the grey icons are
  deadly, and one purchase per shop. *Live*: touching icon 5 with 2
  credits set the hit flag.
- Buying spends all the credits: the price, and the rest is paid out as
  100 points each (`shop_spend_step` `$2298`). *Live*: icon 4 bought
  with 7 credits left a score of 300, credits 0.
- The bought icon blinks 14 times (8 frames each) in the bottom row and
  then takes effect (`icons_update`). *Live*: icon 4's frame alternated
  `$87`/`$8D` and `$0F03` became 1 after the blink.

## Weapons

| Icon | Price | Variable | Effect |
|---|---|---|---|
| 1 speed | 1 | `$0F00` 0-3 | ship speed 1, 2, 4, 8 pixels; buying at 3 wraps to 0 (`icons_update`, `ship_speed_set`) |
| 2 fire rate | 2 | `$0F01` 0-2 | laser bolts allowed on screen: 1, 2, 3 (`ship_fire` `$349A`) |
| 3 extra weapon | 3 | `$0F02` | each shot also fires one up, one down and one backwards (`ship_fire_extra` `$3502`, `extra_shots_move`) |
| 4 double laser | 4 | `$0F03` | two more beams, level with the ship and two rows below (`double_laser_fire` `$3E88`) |
| 5 orbiter | 5 | `$0F04` | a satellite that circles the ship through 16 positions (`orbiter_step` `$3E5E`, `orbiter_draw` `$2C51`) |
| 6 slow-down | 6 | `$0F05` | the attack wave moves and spawns only every second frame (`wave_step` `$2C22`) |
| 7 shield | 7 | `$0F06` | absorbs three hits, with 16 frames of safety after each (`shield_step` `$3880`) |

Icon 0 shows the credits (`$107C`). The owned weapons also change the
enemies' fire: the shield brings bombs, and the double laser and
slow-down change the aiming (`enemy_fire_setup` `$9100`). All weapons
are lost when the ship dies (`ship_death_weapons` `$397E`). *Live*: with
all seven poked on, one press fired the laser, the three-way burst, both
beams and the orbiter (`reference/weapons-poked.png`).

The laser: up to three bolts, each a pair of characters moving one cell
a frame (`lasers_move` `$356F`), fire delay 8 frames, one press per
shot (`ship_fire`).

## The character set and its colours

The character set at `$4800` is inverted and the screen runs in
extended-colour mode (`$D011` = `$5C`). Colour RAM is black everywhere
(`clear_screen` `$0DDD`), so every set bit is black; a clear bit shows one
of the four background colours `$D021`-`$D024`, picked by the top two bits
of the character code, and those four colours cycle every fourth frame
(`colour_cycle_step` `$1DDD`, `play_colours_set` `$363B`). The blank
character `$2E` is solid; each star glyph has a single clear bit and the
three layers use codes `$30`, `$6F` and `$B1` to take three different
colours; the enemy fire and the player's weapons use the codes with both
top bits set (`$C0`-`$FF`) or clear (`$32`-`$34`). Every enemy shot and
bomb is a four-pixel ball cut out of the glyphs beneath it with one mask
table (`shot_masks` `$FF70`, eight positions across two cells).

## Hits

Every shot in the game, the player's and the enemies', is drawn with
characters, and every hit between a sprite and a shot is found by
reading the screen under the sprite, not by the video chip:

- an enemy is hit when one of the four cells under its sprite holds a
  glyph of `$32`-`$3F`, the player's weapons; the glyph's low nibble
  says which weapon, and that one is used up (`enemies_hit_by_weapons`
  `$2B0A`, `weapon_hit_handlers` `$2B7C`); the orbiter (glyph `$35`) is
  not used up;
- the ship is hit when the cell under its middle holds a glyph below
  `$2E`, the enemy fire's glyphs (`ship_hit_by_fire` `$2BBC`);
- sprite against sprite (the ship and the enemies, the hazard rows, the
  shop's icons) uses the video chip's collision register `$D01E`, read
  in the bands (`wave_step` `$2C22`, `ship_touch_icons` `$2BD2`).

## Enemy fire

Three kinds, all drawn with characters (`enemy_fire_decide` `$9208`):

- aimed shots, six at most, travelling along a row at a speed set by the
  angle to the ship (`move_enemy_shot_0`-`5`, glyphs rebuilt each frame
  by `draw_enemy_shot_n` with masks, so the stars show through);
- bombs, two at most, 2x2 characters that home on the ship
  (`move_enemy_bomb_0`/`1`, `bombs_home_step` `$98C0`);
- bullets, seven at most, the character `$ED` moving in one of eight
  directions (`bullet_move_0`-`6`).

New fire must keep the total in flight (shot 5, bomb 10, bullet 1)
under the stage's budget (`fire_budget_levels` `$9F08` 11-36 by
`fire_budget_by_stage`); each enemy fires when its counter reaches the
fire rate (`difficulty_fire_rate` `$9F00`). The pseudo-random numbers
for the boss and the fire come from walking the game's own code at
`$3000` as a table (`enemy_ai_step` `$99AC`).

## Scoring and lives

- Points per enemy: 5, 7, 10, 15, 20, 25, 50 or 100 (`$11D8`), shown ten
  times larger: the panel prints a 0 after the five digits. *Live*:
  each enemy shot added 5 internally and 50 on screen.
- An extra life each time the score's ten-thousands digit goes up
  (`extra_life_check` `$9CD6`), at most 9 lives. *Live*: poking that
  digit from 0 to 1 raised the lives from 3 to 4.
- Three lives each (`game_start_scores` `$1600`).

## Difficulty

`difficulty_set` `$9D35` loads one of three 32-byte tables
(`difficulty_by_loop` `$FA20`) by the number of completed passes
through the game, capped at two: the enemies fire sooner and more fire is
allowed on screen on later passes.

## Controls

- Joystick in either port: both are read and ORed (`read_joysticks`
  `$3375`).
- Keyboard control (F3 on the title): W up, X down, A left, D right,
  RETURN fire (`read_keys` `$0C40`).
- Title: F1 one or two players, F3 joystick or keys, F5 sound effects or
  music in play, SPACE shows the options, fire starts (`irq_title_keys`
  `$0C90`). *Live*: F1, F3 and F5 toggled `$12CA`, `$0FFC` and `$0FFD`
  and the three option sprites appeared (`reference/title-options.png`).
- RUN/STOP pauses; fire resumes; T during the pause quits to game over
  (`pause_check` `$9A30`). *Live*: RUN/STOP set the pause flag and the
  sprites stayed put for 25 frames; fire cleared it.
- Two players take turns, the turn passing at each death
  (`swap_players` `$1650`). *Live*: turns alternated and each player's
  lives were kept.
- The attack-mode demo plays recorded input: 63 joystick bytes
  (`demo_input` `$9F40`), one every eight frames, read by pointing the
  joystick read at `$0F90` (`demo_joystick_patch`). *Live*: at the read,
  the operand was `$0F90` and the first byte `$17`.

## Sound

- Two players share the SID. `sfx_play_frame` `$0406` runs 21 effects of
  two 8-byte records each (pitch scripts, sweeps, alternating
  waveforms). `music_play` `$BDE4` is a Hubbard-style driver: 13 tunes
  (`music_tune_table` `$C4F4`), 109 patterns, 22 instruments with
  vibrato, pulse sweeps, drums and filter sweeps.
- In play the default is the effects (`$0FFD` = 1); F5 on the title
  switches to the in-game music. Tunes are requested through `$117D`,
  which holds the tune's number plus one (`sfx_queue_service`, `DEY`
  before `set_tune` `$C357`): tune 0 when play starts and at each
  player's turn (request 1 at `$16FA` and `next_player_tune`; with the
  effects on, that request only gives the voices back to the effects),
  tune 11 on the title (called directly at `$17C3`) and at game over and
  name entry (request `$0C`), tune 12 when the game is completed
  (request `$0D`, `game_completed`). Tunes 1-10 are in the driver and
  nothing requests them.
- Register census: the game writes `$D400`-`$D406` (indexed, all three
  voices), `$D416`, `$D417`, `$D418`; it never writes the filter
  cutoff's low bits (`$D415`).

## Video register census

| Register | Use |
|---|---|
| `$D000`-`$D010` | sprite positions, rewritten in every band (multiplexer, panel, icons, title rows) |
| `$D011` | `$5C` in play: extended-colour mode, 25 rows, scroll 4; `$40` (blank) in the bands that rebuild the screen |
| `$D012` | the raster chain (23 writes) |
| `$D015`, `$D01C` | all sprites on and multicolour, once at start-up |
| `$D016` | 38 columns / scroll 7 at the top, `$17` for the icon row |
| `$D018` | `$12`, once |
| `$D019`, `$D01A` | raster interrupt only |
| `$D01E` | sprite-sprite collisions, read in three bands |
| `$D020`-`$D024` | border black; background and the three extended-colour backgrounds from the colour cycle (`colour_cycle_step`) |
| `$D025`-`$D02E` | sprite multicolours and colours per band |

Never written: `$D017`, `$D01B`, `$D01D` (no expansion, no priority
changes) and `$D01F` (background collisions): hits between sprites and
characters are found by reading the screen under each sprite (see Hits).

## Corner cases

- `enemies_wave_timers` writes `STY $029E` at `$9057`, one page below the
  wave timer `$129E` that the neighbouring code uses; nothing reads
  `$029E`. Probably a slip; the effect is that the timer is not cleared
  there.
- `$129F` is written (`$905C`) and never read.
- Buying the speed icon at its top level sets it back to the slowest
  (`icons_update`, `$08CE`); the code that might have done something else
  there is two NOPs.
- `$12D5` is read, its value written back unchanged (`$08D6`), and
  copied into the code at `$34B7`; nothing changes it.
- `unreached_cheat` `$BA00`: a routine nothing calls that would refill
  the lives on F3 and switch off the enemy fire's hits on F5; a trainer left in the
  code.
- Code no instruction reaches: `$175E` (bank the ROMs in and warm-start
  the KERNAL), `$3D13`, `$9D77`; tables nothing reads: `$A000`-`$A07F`.

## Live tests

| Test | Result |
|---|---|
| Hand-over and play snapshots compared byte for byte (`orientation.md`) | graphics swapped between `$4C00` and `$F0E0`; sprite shapes changed at `$4000`, `$4A00` |
| Raster handlers counted over 50 frames, title and play | listed under The frame |
| Lives at `$12CB`: memory diffed across a death | 3 → 2 |
| RUN/STOP in play, then fire | pause flag 1, sprites still for 25 frames, flag 0 after fire |
| RESTORE in play | no change |
| Score digit 2 poked 0 → 1 | lives 3 → 4, threshold 1 → 2 |
| Seven weapons poked on, one fire press | icon frames `8D 82 85 86 87 88 89 8A`, burst, beams and laser on screen |
| Stage-clear state poked in stage 1 | banner ENTERING ROCKS OF DEATH / STAGE 02, rock rows |
| F1, F3, F5 on the title | `$12CA`, `$0FFC`, `$0FFD` toggled; option sprites shown |
| Stopping checkpoint at `$20C5` in stage 2 | `$01` = `$34`, spawn page `$DD` |
| Stopping checkpoint at `$9960` in the demo | joystick operand `$0F90`, input `$17` |
| Ship placed on shop icon 4 with 7 credits | blink, `$0F03` = 1, credits 0, score 300 |
| Ship placed on shop icon 5 with 2 credits | hit flag set |
| Enemies shot in stage 1 | score up 5 per enemy (50 shown) |
| Two-player game, deaths | turns alternated, lives kept per player |
