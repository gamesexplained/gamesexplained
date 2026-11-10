# Fire Trap — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, the hand-over at `$0900` with the trainer off).

## Build

- The image is a Triad crack of the Electric Dreams release (1987, by Source Software House). The program loads at `$0801`, runs the crackers' intro and trainer, unpacks the game with a routine at `$0816` and ends with `JMP $0900`. The game is one load with no overlays and no disk access in play (`orientation.md`).
- The trainer has two options, infinite lives and infinite time, both on when the menu opens. With both on, the trainer replaces two bytes of the game: `$1CEF` (`DEC $63` becomes `BIT $63`, so a hit costs no life) and `$2CE8` (`SBC #$01` becomes `SBC #$00`, so the timer does not run down). With both off the hand-over holds the original bytes (*live*, compared on 10 November 2026).
- The machine runs with `$01` = `$35`: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O visible. The hardware interrupt vector at `$FFFE` points to `$2936`, the NMI vector at `$FFFA` to `$2927`.

## Memory layout

| Thing | Where |
|---|---|
| Zero-page variables (player, timer, score, joystick, music) | `$0002`-`$00FF` |
| Raster lists (two buffers of 128 bytes; the list not in use is rewritten) | `$0200`-`$02FF` |
| Colour buffer for the building drawing, then the screen at `$0400` left by the intro | `$0300`-`$08FF` |
| Sprite list, 4 bytes (x, y, colour, pointer) per sprite, counted in `$4D` | `$0900`-`$0963` |
| Object tables: fires, debris, pickups, people, window creatures, birds, spray shots, hazards | `$0964`-`$0AFF` |
| Stage map, 10 columns by 80 rows | `$0B00`-`$0E1F` |
| Four bands of sprite records for the raster handlers | `$0F00`-`$0FBF` |
| Main program, game logic, raster handlers, screen drawing | `$1000`-`$3FFF` |
| Building tile characters, built each stage from `$A6E0`-`$B6DF` | `$4000`-`$47FF` (VIC bank 1) |
| Text font, 256 characters of 8 bytes | `$4800`-`$4BFF` |
| Sprite shapes for the rescue scene, copied here from `$A0E0` | `$4AC0`-`$4E80`, `$54C0`-`$5680` |
| Screens: the building double buffer, and the text screen | `$5000`, `$5800`, `$5C00` |
| Sprite shapes, blocks `$80`-`$FF` | `$6000`-`$7FFF` |
| Music driver and its data | `$8000`-`$8DFE` |
| Four stage maps, 800 bytes each | `$8E00`-`$9A7F` |
| Picture data for the stage-end and rescue sequences | `$9A80`-`$A0DF` |
| Rescue-scene sprite shapes | `$A0E0`-`$A6DF` |
| Two character sets for the building, 2 KB each | `$A6E0`-`$AEDF`, `$AEE0`-`$B6DF` |
| Title and high-score text, colour data | `$BE00`-`$BFFF` |
| Game tables and routines (scoring, pickups, tile copy, sprite queue) | `$C000`-`$CFFF` |
| Tile block definitions, 32 bytes per cell type, two sets | `$E000`-`$F95F` |
| Presents screen, high-score and name-entry code, keyboard, pause | `$F960`-`$FFFF` |

## Timing

- The raster interrupt engine at `$2936`-`$29BE` walks a list of four-byte entries (handler low and high, raster line, spare). The title list at `$10C3` has entries at lines 2 and 49. The play list at `$2A88` has handlers at lines 20, 92, 124, 155, 212 and 230 (`init_raster_engine`, `raster_list_next`).
- Each handler ends in the common tail at `$2944`, which advances the list, flips the double buffer, counts the frame in `$10`/`$11`, reads both joysticks into `$13` (port 2) and `$12` (port 1) and the keyboard matrix into `$06`-`$0D`, and calls `$FFAA`.
- The game logic runs one tick every four video frames: the stage loop at `$13AB` waits for the frame counter to reach 4. That is about 12.5 ticks a second on a PAL machine.
- The music player is called from the handler at line 230. The counter `$C0` adds `$33` each frame, and every fifth frame the carry makes the player run a second time, so it is called 60 times in 50 frames (`play_music`). Each call plays two ticks.
- The stage timer's prescaler `$60` counts down from `$12` once per frame, and each time it runs out the timer drops by one unit, so a unit lasts 13 frames (*live*: 999 became 984 in 200 frames). From 999 the timer lasts about 260 seconds on a PAL machine.

## Controls

- The game reads joystick port 2. Left, right, up, down and fire were each held in the emulator: left lowered the firefighter's x (`$43`) and right raised it, up lowered his vertical position (`$44`/`$45`) and down raised it, and fire started a spray shot in the table at `$0A78` (*live*, 10 November 2026).
- When the joystick is idle the keyboard stands in for it (`read_keyboard_joystick` at `$FFAA`, table at `$CFC6`): Q is up, Z is down, comma is left, full stop is right and space is fire. Each was held in the emulator and produced the movement above (*live*).
- RUN/STOP pauses the game: `pause_check` at `$FFCC` stops the timer and waits for the key to be released, pressed and released again.
- The firefighter's vertical position `$44`/`$45` is measured down from the top of the building: climbing makes it smaller, falling makes it larger. The stage start is near 2464 and the warp subtracts eight a tick until it reaches zero.

## Graphics

- The picture is built in VIC bank 1 (`$4000`-`$7FFF`). The building is drawn into one of two screens at `$5000` and `$5800`, swapped every tick, with the tile characters at `$4000` and colour RAM written alongside. The status panel and the title, high-score and name-entry screens use the text screen at `$5C00` with the font at `$4800` (`$D018` is `$72` at line 212).
- The firefighter and every creature are multicolour sprites. The game queues sprite records at `$0900`, `sort_sprites` (`$326F`) sorts them by y into four bands at `$0F00`, and the five raster handlers at lines 20, 92, 124 and 155 reposition the eight hardware sprites for each band, so more than eight can appear on the screen.
- Sprite shapes are 63 bytes in 64-byte blocks. Blocks `$80`-`$FF` at `$6000`-`$7FFF` hold the firefighter's poses, the flames, creatures, pickups, window frames and the FINISH sign (rendered and read on 10 November 2026). The rescue scene's shapes are held at `$A0E0` and copied to `$4AC0` and `$54C0`.
- `set_tile_source` (`$CE3A`) copies one of two 2 KB character sets from `$A6E0` or `$AEE0` into `$4000` at each stage, according to the stage's colour scheme, and `cycle_palette` (`$CF13`) rotates the four colours of the flame tiles every tick.

## Mechanics

- The map has 10 columns and 80 rows at `$0B00`. `load_stage_map` (`$15FB`) fills it from one of four 800-byte stage maps at `$8E00`, `$9120`, `$9440` and `$9760` (table at `$CF40`). `map_address` (`$2408`) turns a column and row into a map address. Cell values from `$13` upward carry an occupant (a window fire, a person or a creature).
- The player state `$42` is dispatched through the table at `$1A2D` by its low four bits: 0 is normal play, 1 is hit and falling, 2 is falling, 4 is the top of the building, 6 is the descent, 7 is the weapon pickup, 8 is the countdown pickup, 9 and 10 are the warp, 11 and 12 are the rescue pictures, 15 clears the stage and `$FF` ends the game.
- The firefighter has `$63` lives, 4 at the start (*live*), and `firefighter_hit` (`$1CD4`) takes one. When he has been hit he falls until he is off the bottom; if lives and time remain the stage restarts, otherwise the game ends (`state_1_hit` at `$1D19`).
- The score is six BCD digits at `$54`-`$59` and the high score six at `$5A`-`$5F`. `add_score_digit` (`$C0C4`) adds a digit and carries to the left.
- The firefighter's spray: up to six shots at once in the table at `$0A78`, five bytes each, and `fire_spray` (`$2048`) refuses a third shot in one direction.
- Window fires start in random windows every few frames (`start_window_fire`) and grow, spawning falling debris (`grow_window_fires`, `spawn_debris`). There are 16 fire records of 4 bytes at `$0964` and three debris pieces at `$09A4`.
- Pickups: eight records of four bytes at `$09B8`, placed by `queue_pickup` within a per-kind budget copied by `load_pickup_budget` to `$0A38`. The pickup states show a weapon pickup that makes the spray fire three ways (flag `$78`), a second pickup state that starts a countdown in `$74` from 59 (BCD), which the timer routine at line 212 counts down and which may be the protective suit named by the retro blog (not confirmed), and a warp pickup (`$1A75`, `$1A93`, `$1AAA`).
- People at windows: ten records of four bytes at `$09D8`; pressing fire at their window sets them free and they float down on a parachute (`update_window_people` at `$36DC`).
- Window creatures: six records of five bytes at `$0A10`, each taking three hits (`place_one_threat`, `spray_hits_threats`).
- Birds or flying objects: four records of four bytes at `$0A68` (`update_birds`).
- One large actor held in `$7A`-`$89` is started at random while the firefighter is in the middle of the building, from the table at `$3C5B`, and moves by one of the routines in the table at `$3EDA`.
- At the top of each building a special object held in `$E2`-`$E8` is drawn as four sprites and moves by the four behaviours in the table at `$27E7` (`update_top_object`).
- The stage number in `$4C` runs 1 to 16 and wraps with AND `$0F` after the last (`$10B8`-`$10C0`).

## Data tables

- Note frequencies: low bytes at `$843C`, high bytes at `$8486`.
- Instrument table at `$84CE`, tune and pattern data from `$8530` to `$8CF8`, the tune follow-on table at `$8D6C`.
- Stage maps at `$8E00`, `$9120`, `$9440`, `$9760`; the table of their addresses and of the two character sets at `$CF40`; the tile block sets at `$E000` and `$E920` selected through `$CF50`.
- High-score table: five names, scores and stages, read by `check_high_score` (`$FC5A`) and drawn by `build_hiscore_screen` (`$1D75`).

## Sound

- The driver is at `$8000`-`$843B` (`music_entry`, `music_play`, `music_init`, `music_tick`). It keeps seven bytes of state for each of the three voices, decodes pattern entries (`music_next_note`), and handles slides, vibrato and pulse-width sweeps, filter setup (`music_filter_setup`) and the follow-on of one tune to the next (`music_end_of_tune`).
- The game asks for a tune with `$B4` and a sound effect with `$B5`; the player takes tunes at the next pattern end and plays an effect on the second voice and then returns.

## The listing's error rate

(Sample not drawn yet.)

## Live tests

- Joystick and keyboard control: see Controls above (10 November 2026).
- Timer: 999 became 995, 992, 988 and 984 at 50-frame steps; lives were 4 and the score digits showed 50 (`$54`-`$59` = 00 00 00 00 05 00) at the play snapshot.
- Trainer: both options on replace `$1CEF` and `$2CE8`; both off leave the original bytes (hand-over snapshots compared).
