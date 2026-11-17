# Summer Games — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. Addresses
are given with the part that holds them (`parts/<id>/`).

## Build

The PAL G64 of Epyx's disk, directory name "SUMMER GAMES", ID "XX". The
boot file SUMMER GAMES (`$02A7`) loads SGLOAD, which loads the engine (file
B) and the opening ceremony (file A). Every later load is one letter's file
through the KERNAL. The disk holds A, B, D, E, F, H, I, K, L and M, the
records WR and DEFAULT, and a decoy LOADER entry; every item is answered in
`media.json`. Two other G64s were supplied: a second PAL image with the
same files, and an NTSC image that boots through LOADER (`orientation.md`).

The title screen reads "DESIGNED BY: Scott Nelson, Erin Murphy, Stephen
Mudry, Brian McGhie, Stephen Landrum, Jon Leupp, Randy Glover" and "(C)
COPYRIGHT 1984 EPYX INC." (*live*, `reference/title.png`).

## Memory layout

| Thing | Where |
|---|---|
| Player records, 8 x 32 bytes: name 0-10, tag 11-15, result 16-21, score 22-24, medals 25-27, country 28 | resident `players` `$0800` |
| Globals in the records' spare bytes: practice `$081D`, players `$081E`, event `$081F`, resume address `$085D`, loading flag `$085F`, joysticks `$087D`, module letter `$087E`, random state `$08FD` | resident |
| Module loader, unpacker and tables | resident `load_module` `$0934`, `mod_src_lo` `$0A8D`-`$0AE2`, `module_letters` `$0AF3` |
| World records, 8 x 20 bytes | resident `world_records` `$0B00` |
| Engine code, tunes and flag chart | resident `$0C00`-`$3EFF`; charset `$2000`; screen `$0400` |
| Each event | `$4000` upward (diving from `$5800`, swimming from `$1000` over the engine); see `orientation.md` |

## The engine

- Module numbers: 0 ceremony, 1 engine, 3 pole vault, 4 diving, 5 relay, 6 dash, 7 gymnastics, 8 freestyle relay, 9 100 m freestyle, 10 skeet (resident `run_module` `$0903`). An event's module is its event number plus 3 (`run_event` `$0F07`).
- The engine leaves for a module by storing its own return address at `$085D`; every module ends with `jmp $0900`, which restarts the engine, and `engine_start` (`$0C00`) jumps to the stored address (resident `call_registration` `$0EDD`, `engine_start` `$0C00`).
- Swimming unpacks over the engine; bit 7 of `$083D` makes the restart load the engine again (`restart_game` `$09DC`).
- Copy protection before each event: "U1: 5 0 35 1", error 29 expected, six tries; failure jumps to `$0F01`, a `$02` opcode that halts the processor (`protection_check` `$3AEA`, `run_event`).
- Points: gold 5, silver 3, bronze 1 (`count_points` `$10D8`). Tied scores share a place (`event_results` `$130D`, `tie_test` `$13D2`).
- A time is stored as its three BCD bytes inverted, so a faster time is a higher score (running `write_time` `$5775`; swimming `results` `$F31E`).
- World records: a new record is copied in and saved as WR2, then WR scratched and WR2 renamed (`check_record` `$1403`, `save_records` `$1563`). At boot SGLOAD tries WR twice and falls back to DEFAULT (`$C0EB` in the loader's memory).
- Random numbers: a 16-bit shift register with a counter stirred in, stepped every frame by `read_stick` (`random` `$1661`). Player order is shuffled before each event (`shuffle_players` `$1619`).
- Registration: eight players, names up to ten characters, duplicates refused; the flag chart is 18 countries in three bands of six, 78 columns wide, scrolled one flag at a time (`type_name` `$347F`, `choose_flag` `$35BF`, `draw_chart` `$3672`). Country numbers are band x 8 + column; 6, 7, 14, 15, 22 and 23 are unused ("XXX" in `country_codes` `$3577`).
- The registration line is stored as "B.B.MCGHIE PICK YOUR COUNTRY"; the player's name is written over the first ten characters before it shows (`country_prompt` `$354F`, `country_line` `$3521`).

## Music

- The engine's player: three voices, voices 1 and 2 pulse, voice 3 sawtooth; a tune is four-byte lines (three note numbers, a length index), `$FF` ends it; the gates lift for the last four steps of each note (`music_step` `$1E70`, `freq_lo` `$1D92`, `note_lengths` `$1DEA`).
- 20 tunes: 18 anthems by country number, tune 6 the final standings, tune 7 the world records (`tune_offsets` `$1E58`, `tune_table` `$1771`).
- A tune with a lower place in the table is not interrupted by a higher one (`start_tune` `$1E3F`).
- Steps per frame: two wherever the engine plays music: at the medal ceremony, at raster lines `$4D` and `$8D` (`flash_band` `$13A3`), over the final standings (`music_pause` `$0E4C`), on the world records screen (`world_records_show` `$0E67`), and on the registration screen, from the interrupt handlers for lines `$FB` and `$78` (`$334A`, `$3397`). The ceremony's own player is stepped twice a frame too (front `$7625`, `$77E6`).
- The ceremony has its own copy of the player with a fanfare (front `cer_music_step` `$7A8D`, `tune_fanfare` `$7B1A`) and a second tune it never starts, the same notes as the engine's world-records tune (front `tune_unused` `$7C6F`, resident `tune_records` `$3928`).

## Events

### Pole vault (`parts/pole-vault`)

- Heights 4.0, 4.5, 4.8, then 5.0 to 6.2 m by tenths (`height_m` `$C91C`, `height_dm` `$C92D`); three tries a height (`pv_tries` `$C9A2`); below 5.00 m the vaulter may pass (`pv_state1` `$C0E9`).
- Grip sets the starting speed: high `$60`, medium `$64`, low `$68` (`grip_speed` `$C952`) and the trajectory tables (`traj_x_high` `$C3E2` onward).
- The run: stick down lowers the pole; the plant at position 31; up swings; fire lets go; flight speed half the speed plus `$47` forward, an eighth up (`pv_vault` `$B7F7`, `pv_swing` `$B95E`, `pv_release` `$B9CD`).
- A sprite collision between the bar and the vaulter or pole knocks the bar off (`bar_step` `$BF01`).
- The whole event runs in the raster interrupt as an eight-state machine (`pv_irq` `$B7B4`, `state_lo` `$C903`).

### Platform diving (`parts/diving`)

- Dives: forward, backward, reverse, inward; flags bit 0 spins backward, bit 1 faces the board (`dive_flags` `$BA40`). A dive facing the other way from the last mirrors every shape (`mirror_shapes` `$AF7C`).
- Position by stick: right tuck, left half-pike, down pike, up layout (`read_position` `$ABA6`); spin rates per dive and position (`spin_rate` `$B902`).
- Difficulty in tenths: the dive's start (`start_diff` `$BA44`: 0, 1, 3, 2), +0.1 for each of the first three frames in each new position, +0.4 per half-turn (`half_turn_bonus` `$ABF7`).
- Entry: only layout poses score, 100 at frames 5 and 11, 80 one off, 32 two off, 0 flat; bent poses 0 (`entry_base` `$B82A`, `judge_entry` `$B261`).
- Judges: the score is split into five middle judges, a high and a low judge are made from them, and the seven are shuffled (`split_judges` `$B293`, `high_low` `$B2D9`, `shuffle_scores` `$B2FC`); total = five middle judges x difficulty (`mult_difficulty` `$B381`). *Live*: cards 7.5 8.0 9.0 7.0 8.0 8.5 8.0, sum 40.0, difficulty 1.1, total 44.00 (`reference/diving-score.png`).
- Four dives per player, totals summed (`add_total` `$B221`).

### 4 x 400 m relay and 100 m dash (`parts/running`)

- One module, two entries: relay `$5700`, dash `$6D75`; `$25` holds the clock step (`relay_start`, `dash_start`).
- Clock: 0.01 s a frame in the dash, 0.11 s every second frame in the relay (`race_clock` `$5ED1`).
- Relay: stick right sprints, centre runs, left coasts; energy drains by distance and setting and recovers while coasting, at rates per leg (`drain_energy` `$5925`, `regain_energy` `$5961`, `run_speed` `$59CF`).
- Dash: the gaps between stick changes over the last 32 changes set the runner's place (`dash_move` `$63E6`, `waggle_ring` `$63C3`).
- False start: any stick movement before the gun; the second disqualifies (`countdown` `$5CE9`, `false_start` `$5D41`).
- The computer pacer runs when there is no second player: sprints when well behind, coasts when well ahead, otherwise at random (`pacer` `$657C`).
- The main loop calls an `rts` (`$6755`) where a debug display of `$14`-`$17` in hex once ran (`rn_debug_hex` `$6756`).

### Gymnastics (`parts/gymnastics`)

- The KERNAL is switched out; the interrupt is at `$FFFE` (`gym_start` `$4000`, `gym_irq` `$4EFA`).
- 206 packed shapes, each a count of trailing zero bytes then the rest, unpacked from the end; frames of six shapes with X/Y offsets and mirror or upside-down flags (`packed_shapes` `$6800`, `frame_table` `$5499`, `draw_frame` `$4D52`).
- The vault: springboard met between X `$3C` and `$5F` for a good take-off; spring height `$99` plus a quarter of the shortfall; push-off distance by how soon fire is pressed on the horse (`board_jump` `$436C`, `on_board` `$43E6`, `push_off` `$452C`).
- Flight: rise and fall by DEC instructions rewritten as INC at the apex (`flight` `$457C`, `rise_fall_op` `$48A4`).
- Score: from 6.9 (`$45`) less the frames spent in the landing pose, plus 0.8 per half turn and twist, less twice the height shortfall, at least 0; two vaults summed (`final_score` `$4BB2`, `save_score` `$4C1B`). Two misses of the board end the turn with no score (`miss_count` `$4974`).

### Freestyle relay and 100 m freestyle (`parts/swimming`)

- Unpacks to `$1000`-`$BEFF`, copies its code from `$6000`-`$7E9A` to `$E000`, switches the KERNAL out and saves the engine's state to `$C000`-`$C545` (`sw_relocate` `$17ED`, `sw_init` `$E000`, `copy_table` `$FE44`).
- The pool is a map of 100 x 20 cells (`pool_map` `$1000`) with a picture of 8 bytes per cell (`pool_gfx` `$8000`), scrolled through two screen buffers and two character sets (`scroll_left0` `$E787`, `irq_switch` `$F165`).
- Stroke: when an arm enters the water the last three fire presses choose the speed change (`stroke` `$FB99`, `stroke_bonus` `$FC82`); the turn's glide depends on how close to the wall it was made (`turn_glide_len` `$FC4C`).
- Clock: 0.1 s every six frames, to 9:59.9 (`sw_clock` `$EF46`).
- False starts: two restart, the third disqualifies (`check_false` `$E646`).
- A timing probe at `$BFFE`/`$BFFF` records the latest raster line reached; nothing reads it.

### Skeet shooting (`parts/skeet`)

- 25 targets from eight stations: 4 left house, 2 right, 6 a double (`sk_station_list` `$7A64`).
- Left alone, the sight droops: a counter runs 0-3 on every other frame and each wrap moves the sight a step lower, a step every eight frames (`move_sight` `$72F2`).
- The shot is a filled disc shown for one frame; a sprite collision with a clay is a hit (`sk_fire` `$71AA`, `sk_flash_end` `$716F`).
- Clay flights are fixed tables (`sk_left_x` `$76CE` onward).
- Shooting order shuffled with the CIA timer (`sk_shuffle` `$73E7`).

### Opening ceremony (`parts/front`)

- Multicolour bitmap in bank 1, the torch-bearer as three sprites a step, the bowl's flare in five frames, eight doves with their own speeds and climbs (`cer_screen_setup` `$78FC`, `cer_torch_frames` `$7E91`, `cer_flare_tab` `$7F0F`, `cer_doves` `$773B`).
- The torch flame flickers because random bytes are written into its shape each frame (`fr_torch_flame` `$7080`).
- "COPYRIGHT (C) 1983 EPYX" at `$7E61` is never printed.

## Unknown

- The title screen and the "Bummer Games II" keys are in the boot loader, which no part covers.
- What file L's screen (`$C400`-`$CC07`) was for.
