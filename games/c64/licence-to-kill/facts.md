# Licence To Kill — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- The analysed image is `licence.g64`, a Trilogic Expert freezer backup
  made in the first second after the game started (`orientation.md`).
  The listing is built from `work/entry.vsf`, PC `$07F8`.
- The second disk, `license.g64`, holds another build: the same program
  with 16 bytes added at `$0800`, so code in `$0800`-`$3FFF` sits 16
  higher and code from `$8000` 1 higher; the graphics are identical.
- The reset header at `$8000` (`reset_header`) holds the cartridge
  signature `CBM80` with `$C0` in place of `$C3` in this image, so the
  KERNAL never takes it and the "BOND WILL RETURN" reset screen
  (`reset_bond_will_return`, `$8009`; text at `$803E`) never shows. The
  other build has `$C3`. The handler starts with `TSX` where resetting
  the stack needs `TXS`.

## Memory layout

| Thing | Where |
|---|---|
| Program start | `$07F8` (`program_start`): `CLI`, `JSR $14C6`, `JMP $14DE` |
| Code | `$07F8`-`$3FFF`, `$8000`-`$91E5`, `$F5E9`-`$FFFF` (level 5) |
| Tables | `$91E6`-`$9C1A` (enemy types, shots, level records `$9A63`) |
| Level data: character heights, tiles, maps | `$9C1B`-`$BFFF`, `$EC68`-`$F3FA` (level 5) |
| Music driver, effects and tunes | `$C000`-`$CFFF` (`play_tune` `$C000`, `sound_frame` `$C127`, `tunes` `$CADB`) |
| Character sets (under the I/O) | `$D000` level 1, `$D600` level 2, `$DC00` levels 3 and 4, `$E200` title, `$E800` level 5 |
| High scores and text | `$F3FB`-`$F5E8` |
| Sprites | `$5000`-`$7FFF`, frames `$40`-`$FF` |
| Screens | `$4000` and `$4400` (VIC bank 1), character set copied to `$4800`, panel characters `$4E00`-`$4FFF` |
| Variables | zero page `$A3`-`$FF`, `$033C`-`$03AF`, and many instruction operands (self-modifying code) |
| Level number | `$0398`, 0 to 4 |
| Lives | the operand at `$108E` |
| Damage count (energy) | `$039E` |
| Countdown | `$03AC`-`$03AF`, four decimal digits, least significant first |

The five level numbers hold the six sections of the reviews: level 4
(number 3) is the diving and then the water-ski, switched by `$8E6D`
(`level4_start`, `diving_loop`).

## Timing

- The flying levels run from a raster interrupt at line `$F8`
  (`irq_play`, `$15C8`) that sets the frame flag `$0358`; the main loop
  (`level_main_loop`, `$14EA`) waits on it. Each level has its own
  interrupt and loop: level 2 `$3925`/`$397E`, level 3 `$3A00`/`$3AA6`,
  level 4 `$807B`/`$80F9`, level 5 `$F5E9`/`$F690`.
- Colour splits: a change of colour scheme in the map starts a raster
  line at the top of the playfield (`map_row_tiles`) that moves down
  with the scroll (`move_colour_splits`); `irq_colour_split` (`$1663`)
  changes the colours there.
- The countdown loses one unit every other frame (`count_down_timer`,
  `$8EC8`, step `countdown_step` `$91FA`): 25 a second on a PAL machine.
  *Live*: from `play-l1.vsf`, 200 frames took it from 1920 to 1820, with
  the routine and `irq_play` each run 200 times. It starts at 2,000 on
  levels 1 and 3 (80 seconds), 5,000 on levels 2 and 5 (200 seconds),
  and 3,000 on level 4 (120 seconds) (`start_timer`, `$8F01`). At 0 it
  stays at 0000; what is left at the end of a level is added to the
  score (`level_complete`, `$157A`).

## Controls

- Joystick in port 1, read from `$DC01` (`LDA $DC00,Y` with Y = 1 at `$8206`); fire is a new
  press (`$0343`). The title starts the game on fire in port 1 only.
- RUN/STOP pauses (`pause_keys`, `$8F15`, keyboard column 7 at `$DC01`
  with `$DC00` selecting it); while paused, any joystick movement or fire
  carries on, and Q ends the game. *Live*: RUN/STOP set `$03A5` and the
  countdown stood at 1820 for 100 frames; Q set `$03A6`, and the game
  went to the high-score page of the title.
- Flying (levels 1, 3, 4, 5, `steer_player` `$1124`): left and right set
  the horizontal speed (up to 3), up and down the throttle `$0392`
  (1 to 47), which picks one of six scroll speeds and the vertical speed.
  Fire shoots, except on level 3.
- Level 2: the aim turns while fire is held and the stick pushed left or
  right; releasing fire shoots in the aimed direction (`fire_aimed_shot`,
  `$1BDE`, offsets `$92E0`/`$92F0`).
- Level 4 (`diving_controls`, `$84D9`): up dives, using the air bar
  `$0392` on alternate frames; fire grabs a harpoon from a diver or throws
  one.

## Graphics

- No register for sprite-to-background collisions is read ($D01F does
  not appear in the census). Crashes into scenery are found from the
  characters under the player: each level has a table of character
  heights, one nibble a character (`height_table_ptr` `$C7`). On level 1
  (`player_hits_scenery`, `$32CB`, called only from `level_main_loop`) a
  character whose height times 4 reaches the throttle `$0392` sets the
  damage count to `$FF` and loses a life: the throttle is the
  helicopter's height as well as its speed. On the simulator, from
  `play-l1.vsf`, with the helicopter put at 530 positions over the screen,
  throttle 1 crashed at 100 of them, 8 at 55, 16 at 5, and 24 or more at
  none in that frame. Level 1's heights run up to 12, which times 4 is
  48, beyond the throttle's 47, so two characters can never be cleared. Level 2 uses the same routine from `$32D1` to stop Bond walking
  into walls. Shots read the same table (`move_shots`, `$1D52`). On level 5
  Bond's tanker loses energy when the road under it is not clear
  (`road_under_sprite`, from `drive_tanker` `$FAA7`).
- Sprite-to-sprite collisions are read from `$D01E` on level 2 (`$3925`) and level 4 (`$8088`, `$8166`) only; the other levels compare positions.
- The playfield scrolls down a pixel at a time with the fine scroll; at
  each whole character, the copy is split over four frames
  (`scroll_copy_rows_a` to `_d`, `scroll_copy_back_a` to `_d`) and the
  display flips between `$4000` and `$4400` (`set_scroll_regs`, `$1785`).
- Maps are rows of four tiles; a tile is 8 by 4 characters, its number
  times 32 plus the level's tile base (`map_row_tiles`, `$0A1E`). A map is
  read from its end backwards; its last seven rows are also the level's
  opening picture (`draw_picture_tiles`, `$0B5D`).
- Character sets are copied into `$4800` with the ROM and I/O switched
  out (`copy_charset`, `$2051`, `$01` = `$34`).

## Mechanics

- Lives start at 3 (`$19F6`) and the game ends only when the count goes
  negative (`$14FB`, `$3997`, `$F6A9`, and the loops of levels 3 and 4),
  so the panel's 03 means four attempts: play goes on at 00. A life is
  lost when the damage count `$039E` goes negative (`player_anim` `$20E6`
  on level 1, the loops of the other levels). Every level's start sets
  the count to 47 (`start_timer`), and levels 1 and 3 then set it to 6
  (`$2871`, `$28D8`, `$2AEA`). An enemy shot takes 1 on level 1 and 8
  on the other levels that call `enemy_shots_hit_player` (`$2CE8`), so a
  life lasts seven shots on level 1 and six on level 2. On level 4 a
  diver's touch takes 1 (`diving_collisions`); on level 5 the tanker has
  its own energy, `$F6BC`, and the Stinger takes 3 of it. The energy bar draws the count
  times 8, up to 47 (`draw_energy_bar`, `$304F`).
- Enemy shots cost 1 point of damage on level 1 and 8 elsewhere
  (`enemy_shots_hit_player`, `$2CE8`). The code at `$2D37` that would take
  a life for a level 1 hit is jumped over and never runs.
- Touching an enemy on level 2 costs a life (`touch_enemies`, `$8746`);
  the ammunition crate (sprite `$DB`) gives 66 automatic shots, a
  magazine (`$DC`) adds one, up to 3.
- Level 1's jeep (sprite 7) follows a course (`jeep_course`, `$BDF3`) and
  takes hits (`$03A3`); enemies come from a launch list keyed to the
  scroll position (`launch_from_map`, `$2547`).
- Level 3's rope lengthens while the plane is on screen and shortens
  otherwise (`rope_length_step`, `$3D33`); it swings with the
  helicopter's speed (`rope_swing`, `$3DF4`). The level is lost when the
  fuel runs out (`fuel_out` `$036C`).
- Level 4: harpooned divers give harpoons and 100 points; boats at the
  surface wreck the diver (`diving_collisions`, `$89BC`); bags (character
  `$72`) are placed at random columns while the diving lasts
  (`copy_tile_row`). Reaching the top of the screen completes the level.
- Level 5: Bond follows a tanker in the plane, jumps on fire when hanging
  over its cab (`jump_to_tanker`, `$F81A`), then rams the other vehicles
  off the road (`trucks_collide`, `$3EAA`); the Stinger missile costs 3
  energy (`move_stinger`, `$FF79`).
- After level 5 the level number wraps to 0 (`level_complete`).
- The random-number generator is a 32-bit shift register at `$CB`-`$CE`
  with feedback `$76B553` (`random`, `$33F9`); a restart reseeds it with
  `$DC275C0D` (`restart_level`, `$8AB7`).
- `$0393` is set to 1 and never cleared, so `draw_explosions` (`$181F`)
  always takes its explosion branch.

## Data tables

| Table | Where | Layout |
|---|---|---|
| Level records | `$9A63` | 25 bytes a level (`start_level`, `$0C47`) |
| Level main routines | `$97D5` | a word a level |
| Countdown positions | `$91E6` | 4 bytes a level |
| Enemy types | `$94F3`-`$9769` | 45 types, one table per field |
| Character sets | word table `$991E` | 0 level 1, 1 level 2, 2 levels 3 and 4, 3 level 5, 4 title |
| High scores | `$F401` scores, `$F42B` names, `$F440` ranks | seven places, 100,000 down to 500, MAR BIT QED ANT BOZ PAU PAM |
| Tunes | `$CADB` | 5 tunes, 7 bytes each |
| Sound effects | `$C692` addresses, `$C6C2` data | 24 effects, 20 bytes each |

## Sound

- David Whittaker's driver: `play_tune` (`$C000`, A = tune), called
  once a frame through `sound_frame` (`$C127`). Three voices; a sound
  effect takes voices 1 and 3, the engine noise voice 2. No filter
  registers (`$D415`-`$D417`) are written.
- Tune 0 is the title's; 1 starts with the water-ski on level 4; 2 plays
  at the end of the game; 3 opens levels 1, 4 and 5; nothing starts tune
  4 (`tunes`, `$CADB`, and every call of `$C000`).
- Pattern commands are bytes `$81`-`$98`, through the word table at
  `$C214`.

## Registers (census)

| Chip | Registers used |
|---|---|
| VIC-II | sprite positions and colours, `$D010`-`$D012`, `$D015`-`$D01E`, `$D020`-`$D023`, `$D025`-`$D02E`; not `$D01F` or `$D024` |
| SID | all three voices, `$D418`; not the filter `$D415`-`$D417` |
| CIA 1 | `$DC00`-`$DC03`; `$DC0E` only to stop timer A |
| CIA 2 | `$DD00`, `$DD02` (VIC bank) |

## Text

- The title's character set (`$E200`) has letters at codes 1-26 and
  digits at `$40`-`$49`; strings at `$F455`-`$F5CC` are in those codes.
- The closing text adds `$A0` to each code, using letters copied from
  `$E200` to `$4D00` (`end_message`, `$FF35`).
- The tagline "His bad side is a dangerous place to be." is part of the
  logo picture, not a string.
- The credits in the game's text read "ATARI PAUL MARGRAVE"; "BY QUIXEL"
  is also in the title text.

## The listing's error rate

Sample seed 2616: 60 of the listing's 1,314 comments, drawn at random
and checked by a checker agent on claude-fable-5-2 that wrote none of
them. 11 were wrong (18.3 %, 95 % interval 10.6 % to 29.9 %), well over
the mark of 2. Two named the wrong field of an enemy type table: the
type tables' labels at `$94F3`-`$9769` were shifted against the slot
tables `spawn_enemy` copies them into, and all eight were relabelled.
The other nine were details: off by one (`$304F`'s first cell, `$833F`'s
period, `$F81A`'s window), a value the code changes before play
(`$FBA6`), the shot slots on level 4 (`$99A3`), the title dot's wrap
(`$8D70`), the rope's expansion (`$9953`), a working byte (`$F8`) and a
history's length (`$939A`). All 11 were corrected, with the
same-meaning comments at `$C116` and `$BF8F`. The listing has had no
full audit; one, then a second sample, is recommended.

## Live tests

- Sample seed 2616: see the listing's error rate, above.
- Crash heights: the simulator test above, `player_hits_scenery` run from `play-l1.vsf`.
- Countdown rate: 200 frames from `play-l1.vsf` took it from 1920 to
  1820, with `count_down_timer` and `irq_play` each hit 200 times.
- Pause: RUN/STOP set `$03A5`; the countdown stood still for 100 frames.
- Quit: Q while paused set `$03A6` and led to the high-score page.
- Lives: from `play-l1.vsf` with `$108E` = 1 and the damage count set
  to `$FF`, the game restarted the level (`restart_level` hit once) and
  went on with LIVES 00 in the panel; with `$108E` = 0 it went to
  `game_over` instead.
- Fire on port 1 starts the game; port 2 does not (`orientation.md`).
