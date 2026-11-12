# Fire Trap — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`
(`work/entry.vsf`, the hand-over at `$0900` with the trainer off).

## Build

- The image is a Triad crack of the Electric Dreams release (1987, by Source Software House). The program loads at `$0801`; its BASIC line (`SYS 2070`) starts the crackers' intro at `$0816`, and the intro, the trainer and an unpacker run in turn before the game is entered with `JMP $0900`. The game is one load with no overlays and no disk access in play (`orientation.md`).
- The trainer has two options, infinite lives and infinite time, both on when the menu opens (*live*). With both on, the trainer replaces two bytes of the game: `$1CEF` (`DEC $63` becomes `BIT $63`, so a hit costs no life) and `$2CE8` (`SBC #$01` becomes `SBC #$00`, so the timer does not run down). With both off the hand-over holds the original bytes (*live*, compared on 10 November 2026).
- The game sets `$00` to `$2A` and writes `$30` to `$01` (`$28C0`-`$28C9`); bits 0 and 2 are then inputs that read high, so the banking is that of `$35`: RAM at `$A000`-`$BFFF` and `$E000`-`$FFFF`, I/O visible. The hardware interrupt vector at `$FFFE` points to `$2936`, the NMI vector at `$FFFA` to `$2927`.

## Memory layout

| Thing | Where |
|---|---|
| Zero-page variables (player, timer, score, joystick, music) | `$0002`-`$00FF` |
| Raster lists (two buffers of 128 bytes; the list not in use is rewritten) | `$0200`-`$02FF` |
| Colour buffer for the building drawing (it overwrites the screen at `$0400` that the intro left); `$07F0`-`$08FF` not identified | `$0300`-`$07EF` |
| Sprite list, 20 records of 4 bytes (x in two-pixel units, y, colour, pointer), counted in `$4D`; then `sort_sprites`' index list at `$0950`-`$0963` | `$0900`-`$0963` |
| Object tables: fires, debris, pickups, people, window creatures, birds, spray shots, hazards | `$0964`-`$0AFF` |
| Stage map, 10 columns by 80 rows | `$0B00`-`$0E1F` |
| Five band tables of sprite records (`$13` bytes each) for the raster handlers, staged at `$0F5F`-`$0FBD` and copied to `$0F00` by `draw_screen` | `$0F00`-`$0FBD` |
| Main program, game logic, raster handlers, screen drawing | `$1000`-`$3FFF` |
| Building tile characters, built each stage from `$A6E0`-`$B6DF` | `$4000`-`$47FF` (VIC bank 1) |
| Text font, 64 characters of 8 bytes | `$4800`-`$49FF` |
| Sprite shapes for the big actor, copied here from `$A0E0`; the Get Ready sprites are built in the same area | `$4AC0`-`$4EBF`, `$54C0`-`$56BF` |
| Screens: the building double buffer, and the text screen | `$5000`, `$5800`, `$5C00` |
| Sprite shapes, blocks `$80`-`$FF` | `$6000`-`$7FFF` |
| Music driver and its data | `$8000`-`$8DFE` |
| Four stage maps, 800 bytes each | `$8E00`-`$9A7F` |
| Two scene maps in the stage-map format (`$9A80`, `$9AD0`); picture data for the top-of-building and rescue sequences (`$9B20`-`$9F1F`) and for the end of a warp that runs past the top (`$9F20`-`$A0DF`) | `$9A80`-`$A0DF` |
| The big actor's sprite shapes (frame table at `$CA3E`) | `$A0E0`-`$A6DF` |
| Three character sets, 2 KB each: two for the building, one for `clear_world`'s full-screen scenes | `$A6E0`-`$AEDF`, `$AEE0`-`$B6DF`, `$B6E0`-`$BEDF` |
| Title and high-score text lines, screen codes only (the colours are constants in the code) | `$BEE0`-`$BFFF` |
| Game tables and routines (scoring, pickups, tile copy, sprite queue) | `$C000`-`$CFFF` |
| Tile block definitions, 32 bytes per cell type (16 character codes, then 16 colours), three sets at `$E000`, `$E920` and `$F280` | `$E000`-`$F95F` |
| Presents screen, high-score and name-entry code, keyboard, pause | `$F960`-`$FFFF` |

## Timing

- The raster interrupt engine at `$2936`-`$29BD` walks a list of four-byte entries (handler low and high, raster line, spare). The title list at `$10C3` has entries at lines 2 and 49. The play list at `$2A88` has handlers at lines 20, 92, 124, 155, 212 and 230 (`init_raster_engine`, `raster_list_next`).
- The last handler of each frame ends in the common tail at `$2944`, which counts the frame in `$10`/`$11`, reads both joysticks into `$13` (port 2) and `$12` (port 1) and the keyboard matrix into `$06`-`$0D`, and calls `read_keyboard_joystick` (`$FFAA`). The other handlers enter the tail later, at `$2995`, where it advances the list.
- The game logic runs one tick every four video frames: the stage loop at `$13AB` waits for the frame counter to reach 4. That is about 12.5 ticks a second on a PAL machine.
- The music player is called from the last handler of each frame: line 230 in play, line 49 on the title list (`title_raster_scroll`, `$1140`). The counter `$C0` adds `$33` each frame, and on every sixth frame the carry makes the player run a second time and clears `$C0`, so it is called 7 times in 6 frames (`play_music`). Each call plays two ticks.
- The stage timer's prescaler `$60` counts down from `$12` once per frame, and each time it runs out the timer drops by one unit, so a unit lasts 13 frames (*live*: 999 became 984 in 200 frames). From 999 the timer lasts about 260 seconds on a PAL machine.

## Controls

- The game reads joystick port 2. Left, right, up, down and fire were each held in the emulator: left lowered the firefighter's x (`$43`, in units of two pixels) and right raised it, up lowered his vertical position (`$44`/`$45`) and down raised it, and fire started a spray shot in the table at `$0A78` (*live*, 10 November 2026).
- When the joystick is idle the keyboard stands in for it (`read_keyboard_joystick` at `$FFAA`, table at `$CFC6`): Q is up, Z is down, comma is left, full stop is right and space is fire. Each was held in the emulator and produced the movement above (*live*).
- RUN/STOP pauses the game: `pause_check` at `$FFCC` stops the timer and waits for the key to be released, pressed and released again.
- The firefighter's vertical position `$44`/`$45` is measured down from the top of the building: climbing makes it smaller, falling makes it larger. The stage start is near 2464. The warp subtracts eight a tick for a 40-tick countdown (320 units); if that takes it past the top, it stops at 1 and state 15 follows.

## Graphics

- The picture is built in VIC bank 1 (`$4000`-`$7FFF`). The building is drawn into one of two screens at `$5000` and `$5800`, swapped every tick, with the tile characters at `$4000`; the colours go to a buffer from `$0300`, which `draw_screen` copies into colour RAM after the flip. The status panel uses the text screen at `$5C00` with the font at `$4800` (`$D018` is `$72` at line 212). The title, high-score and name-entry screens use the same screen with `$D018` = `$70` (`title_raster_top`), so their characters come from `$4000`, where `double_height_font` builds a double-height copy of the font.
- The firefighter and every creature are multicolour sprites. The game queues sprite records at `$0900`, `sort_sprites` (`$326F`) sorts them by y into five band tables (three for sprites 4-7, two for sprites 0-3), and the raster handlers at lines 20, 92, 124 and 155 reposition the hardware sprites for each band, so more than eight can appear on the screen.
- Sprite shapes are 63 bytes in 64-byte blocks. Blocks `$80`-`$FE` at `$6000`-`$7FBF` hold the firefighter's poses (he is two sprites, a top and a bottom), the flames, creatures, birds, pickups, window frames and the FINISH sign in blocks `$FD`-`$FE`; block `$FF` is blank, zeroed at every stage. The big actor's shapes are held at `$A0E0` and copied to `$4AC0` and `$54C0`; the rescue pictures are loaded from `$9B20`-`$9F1F` (eight 128-byte blocks) by `state_4_top_of_building` and `state_11_rescue_pictures`.
- `set_tile_source` (`$CE3A`) copies a 2 KB character set into `$4000`: `$A6E0` or `$AEE0` at each stage, `$B6E0` when `clear_world` calls it. `cycle_palette` (`$CF13`) rotates colours every tick by rewriting the colour half of tile blocks (cell type `$2D` in sets 1 and 2, cell `$10` in set 1), not colour RAM; what those cells show on screen was not checked.

## Mechanics

- The map has 10 columns and 80 rows at `$0B00`. `load_stage_map` (`$15FB`) fills it from one of four 800-byte stage maps at `$8E00`, `$9120`, `$9440` and `$9760` (table at `$CF40`). `map_address` (`$2408`) turns a column and row into a map address. Window cells are 0 and 1. Adding `$13` (giving `$13` or `$14`) marks a window taken by a person, a window creature or a fire that has been put out (where a pickup then shows); a burning window holds a flame tile, `$17`-`$19` or `$1A`-`$1C`. Other cell values, up to `$4A`, are parts of the building, and the stage maps also hold `$13` and `$14` as loaded.
- The player state `$42` is dispatched through the table at `$1A2D` by its low four bits: 0 is normal play, 1 is hit and falling, 2 is falling, 4 is the top of the building, 6 is the descent, 7 is the weapon pickup, 8 is the countdown pickup, 9 and 10 are the warp, 11 and 12 are the rescue pictures, 15 follows a warp that runs past the top of the building (a picture for 50 ticks, then the same stage set up again from its start), and a negative value ends the game; 3, 5, 13 and 14 do nothing.
- The firefighter has `$63` lives, 4 at the start (*live*), and `firefighter_hit` (`$1CD4`) takes one. When he has been hit he falls 8 units a tick until a 20-tick countdown ends or his y reaches `$09DC`. Then, if lives and time remain (and it is not the demonstration), the stage is set up again: the map is reloaded, the timer goes back to 999, and he starts at a restart height (`$2F` × `$140` − `$60`, where `firefighter_hit` set `$2F` from his height, at most the stage start). Otherwise the game ends (`state_1_hit` at `$1D19`).
- The score is six BCD digits at `$54`-`$59` and the high score six at `$5A`-`$5F`. `add_score_digit` (`$C0C4`) adds a digit and carries to the left.
- The firefighter's spray: up to six shots at once in the table at `$0A78`, five bytes each, and `fire_spray` (`$2048`) refuses a third shot in one direction.
- `start_window_fire` tries to start a fire every 17 minus the stage number game ticks (16 ticks, 64 frames, on stage 1; 2 ticks on stage 15; every tick during the descent; run in the simulator), in a random row within 32 rows from 8 rows above the scroll position. `grow_window_fires` flickers each fire through tiles `$17`, `$18`, `$17` and `$19` (on a window of cell 1: `$1A`, `$1B`, `$1A`, `$1C`), and `spawn_debris` drops debris. There are 16 fire records of 4 bytes at `$0964`. The debris table at `$09A4` is walked as 3 records by `spawn_debris` and `update_debris`, 4 by `clear_hazards` and 5 by `spray_hits_debris`, whose fifth record is pickup record 0 at `$09B8`.
- Pickups: eight records of four bytes at `$09B8`. `queue_pickup` places one at a new fire's window, within a budget per band of ten map rows that `load_pickup_budget` copies to `$0A38` from a fixed table, and `update_pickups` (`$3524`) reveals it when that fire is put out. Kinds 0 and 1 give 1,000 and 2,000 points. Kinds 2, 3 and 4 start states 7, 8 and 9: a weapon that makes the spray fire three ways (flag `$78`), a countdown in `$74` from 59 (BCD), which the handler at line 212 counts down and which may be the protective suit named by the retro blog (not confirmed; while it runs, `$66` is `$FF`, the flag the hit tests skip on, so he cannot be hurt), and a warp. Collecting the weapon when it is already held scores 500 points instead (`state_7_weapon_pickup`, `$1A75`).
- People at windows: ten records of four bytes at `$09D8`. A person is freed, for 300 points, when the firefighter reaches their window while `$75` is 0 (`update_window_people` at `$36DC`); the joystick is not read.
- Window creatures: six records of five bytes at `$0A10`, each taking three hits (`place_one_threat`, `spray_hits_threats`).
- Birds: four records of four bytes at `$0A68`. Each starts 256 units below the firefighter and rises toward his x (`update_birds`). `spray_hits_birds` (`$39E3`) tests the hit the wrong way round: the first live bird a shot misses is removed and scores 30, while a bird the shot overlaps survives (run in the simulator).
- Hazards: the table at `$0A96` is walked as 5 records of 5 bytes by `update_hazards` and `actor_drop_and_scatter`, and as 8 by `spray_hits_hazards`, which scores 100 points a hit.
- One large actor held in `$7A`-`$89` is started at random while the firefighter is in the middle of the building, from the table at `$3C5B`, and moves by one of the routines in the table at `$3EDA`.
- At the top of each building a special object held in `$E2`-`$E8` is drawn as four sprites and moves by the four behaviours in the table at `$27E7` (`update_top_object`).
- The stage number in `$4C` runs 1 to 15 and then 0 in a real game (AND `$0F` at `$13D4`); the attract demonstration counts 1 to 16 (`$10B5`-`$10C0`). The code sets up stage 0 like any other (`$13D8`).

## Data tables

- Note frequencies: low bytes at `$843C`, high bytes at `$8486`.
- Instrument pointer table at `$84CE` (14 entries), order-list pointers at `$8530` (15), pattern data to `$8CF9`; the voice state tables from `$8CFA` (stride 7, one entry per voice); a tempo byte per tune at `$8D5E`; and the order-list start position at `$8D6C` that `music_end_of_tune` always reads.
- Stage maps at `$8E00`, `$9120`, `$9440`, `$9760`; the table of their addresses and of the two character sets at `$CF40`; the tile block sets at `$E000` and `$E920` selected through `$CF50`, and a third at `$F280` set by `clear_world`.
- High-score table: five names, scores and stages, read by `check_high_score` (`$FC5A`) and drawn by `build_hiscore_screen` (`$1D75`).

## Sound

- The driver is at `$8000`-`$843B` (`music_entry`, `music_play`, `music_init`, `music_tick`). It keeps seven bytes of state for each of the three voices, decodes pattern entries (`music_next_note`), and handles slides, vibrato and pulse-width sweeps, and filter setup (`music_filter_setup`). At the end of a tune, `music_end_of_tune` restarts the voices; because `music_reset_voices` has just cleared `$B0`, it always reads the order-list start position at `$8D6C`.
- The game asks for a tune with `$B4` and a sound effect with `$B5`; the player switches tunes at the next note of a voice (`music_next_note`, `$81B2`) and plays an effect, when a tune is playing, as a pattern on the second voice; when the effect's pattern ends the voice goes to pattern `$18` (while a tune plays, the second voice is driven by `$B2`, never by the tune's order list).

## The listing's error rate

- A first sample of 60 comments (seed 2611: 44 hand-written, 16 template), checked on `claude-opus-5-5`, found 21 wrong: 3 wrong and 18 with a wrong detail. All were corrected.
- A full audit on `claude-opus-5-5` then checked all 827 comments in six chunks, one checker at a time, and every claim in this file. 385 comments were wrong, nearly all in a detail: reader and writer lists that missed indexed, pointer and block accesses, sizes taken from the disassembler's spans, and names given from a routine's first lines. 13 labels were renamed. 25 of 108 claims here were corrected. One finding is a bug in the game itself: `spray_hits_birds` tests the hit the wrong way round (run in the simulator).
- Two samples after the audit (seeds 7311 and 9157, fresh checkers) each found 3 of 60 wrong in a detail, one over the mark of 2. Most were label names the audit changed and other comments still used; a sweep then replaced every name in a comment that is not a label.

## Live tests

- Joystick and keyboard control: see Controls above (10 November 2026).
- Timer: 999 became 995, 992, 988 and 984 at 50-frame steps; lives were 4 and the score digits showed 50 (`$54`-`$59` = 00 00 00 00 05 00) at the play snapshot.
- Trainer: both options on replace `$1CEF` and `$2CE8`; both off leave the original bytes (hand-over snapshots compared).
