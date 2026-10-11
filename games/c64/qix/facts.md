# Qix — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/title.vsf`, the snapshot named in
`orientation.md`.

## Build

Taito America's Qix for the C64, 1989; the loading screen names Alien
Technology Group. The image is the North East Crackers crack distributed
by c64.com: the crackers' intro `QIX/NEC` and a fast loader, which loads
four files (`-`, `TITLE1`, `TITLE2`, `ALIEN`) and jumps to `ALIEN`'s entry
`$8000` (game_entry). The loader works only on an NTSC machine (*live*:
on PAL it stalls in its wait at `$0181` or jams the CPU at `$0154`).

The game itself loads three more files during play, through the KERNAL's
LOAD (load_prepare puts the KERNAL's vectors back first), which the
crack's hook turns into its fast loader:

| File | When | Where it lands | What it is |
|---|---|---|---|
| `ALIEN` | after every game (reload_alien) | `$0800`-`$DFFF` | the whole game again: play has overwritten the title, the menu and the music |
| `SCENE` | after the attract demonstration (attract_demo) | `$6000`-`$7F3F` (*live*: 37 segments) | the title picture's bitmap, which play overwrites |
| `TAITO` | between levels (load_taito) | `$6200`, 134 bytes (*live*) | an older-looking copy of next_level's code; nothing runs it (no execution at `$6000`-`$7FFF` in the code map) |

Three tries, then "DRIVE ERROR / CHECK THE DISK / AND PRESS FIRE"
(msg_drive_error).

## Memory layout

| Thing | Where |
|---|---|
| Sprite shapes (pointers `$20`-`$3F`, VIC bank 0) | `$0800`-`$0FFF` |
| Fill patterns, level tables, plane address tables, variables | `$1000`-`$15D2` |
| Messages, panel, loads, extra lives | `$15D3`-`$1FFF` |
| The visible multicolour bitmap | `$2000`-`$3F3F`, screen matrix `$0400` |
| Music player and tunes, as loaded | `$4000`-`$5F3F` (copied to `$E000` by copy_music_to_E000) |
| Title picture bitmap | `$6000`-`$7F3F` |
| Engine: interrupts, marker, Qix, enemies, fill, sound effects | `$8000`-`$BC37` |
| Font (from `(`) | `$BD00`-`$BFFF` |
| Attract demonstration, title and menu routines | `$C000`-`$C852` |
| Demo Qix path, title and menu colours | `$CA00`-`$CFFF` |
| Menu and title colours, packed menu picture, under the I/O | `$D000`-`$DFFF` |
| Music player and tunes, where they run | `$E000`-`$FF3F` |

During play three 8 KB planes hold the field: the visible bitmap at
`$2000`, and work planes at `$6000` and `$E000` (pixel_addr reads the
`$E000` one, plot_all writes all three). A pixel is a multicolour pixel
(160 across); its colour in the `$E000` plane says what it is
(pixel_masks): 3 the edge the marker walks, 1 the line being drawn, 2 a
burnt line that kills. Because play overwrites `$6000` and `$C000`-`$FFFF`,
the title image (`title.vsf`) is the one state that holds the whole
program.

## Timing

- The play interrupt (irq_play) runs once a frame at raster line 252.
  The main loop (level_loop) waits for its frame_tick; *live*: 23 passes
  in 100 frames during play, about one pass in four frames.
- The music runs from the interrupt (music_frame). On NTSC it skips one
  frame in six, so the tunes step 50 times a second on both systems: the
  start-up patches two bytes of the player (`$410D`, which become `$E10D`)
  to `LDA #$06` on NTSC and `BEQ +5` on PAL. *Live* (NTSC): 600 frames gave
  600 calls of music_frame and 500 voice updates.
- The game reads `$D030` to 0 throughout (wait_bottom_sprites_off, the
  interrupts), keeping a C128 at 1 MHz.

## Controls

- The stick, in either port: read_stick EORs `$DC00` with `$DC01`. Bits
  0-3 directions, bit 4 fire. A diagonal keeps the last straight direction
  (last_dir), so the marker never moves diagonally.
- Fire leaves the edge and draws; with fire held the line advances on
  alternate passes (draw_step), so a slow draw moves at half the speed of a
  fast one; letting go of fire keeps drawing fast. *Live*: 120 frames of
  fire and up drew about 30 pixels; 10 frames of fire then 110 of up drew
  about 58.
- RUN/STOP pauses (pause_check, from the interrupt): sound off, wait for
  RUN/STOP to be let go, then for any stick movement. *Live*: the main loop
  made 0 passes in 150 frames after RUN/STOP, and resumed (23 passes in
  100 frames) after the stick moved.
- RESTORE does nothing: the NMI vector points at an `RTI` (nmi_rti).
- The menu: up and down move the bar, fire chooses (menu_start).

## Graphics

- The play screen is a multicolour bitmap (`$D016` = `$D8`, `$D018` bit 3)
  with a raster interrupt only at line 252: no split.
- The menu's highlight bar is a raster split: three interrupts in a chain
  (irq_title_top, irq_menu_band_top, irq_menu_band_bottom) change the
  background colour between two lines (menu_raster_vars).
- The title picture is a multicolour bitmap shown by show_title_picture:
  bitmap from `$6000`, screen colours from `$D400` (RAM under the I/O),
  colour RAM two nibbles to a byte from `$CE00`. The menu picture is
  packed at `$D800`-`$DFFF` with `$DB`, count, value runs (unpack_menu).
- Text is drawn into the bitmap from the font at `$BD00`, each pixel
  widened to a solid multicolour pair (xor_glyph, font_char); inline text
  follows each `JSR $8360` (print_inline) as bitmap address, characters, 0.
- Sprites: 0 the marker, 1 the Fuse, 2-7 the edge walkers in pairs (or
  the roamers on 2-3 and 6-7). The death and the start of a life are four
  sprites flying between the marker and the field's corners (marker_burst).

## Mechanics

- **Lives**: 3 at the start (`$1567`), at most 5 (`$1566`); an extra life
  each 50,000 points (extra_life_p1/p2, thresholds `$1F90`-`$1F95` raised
  by 50,000 each time).
- **The claim**: when a line reaches the edge, finish_line turns it into
  edge, fill_find_side follows the edge from Qix 1's point to find its
  region, and the fill (fill_column) fills the other side, counting pixels.
  The claimed percentage is the high byte of the player's claimed pixel
  total (claim_check, capped at 99): one percent is 256 pixels, and the
  field's inside is about 25,000. *Live*: with the requirement poked to 1 %,
  a 6 % claim ran claim_check and then level_end.
- **Scoring** (score_fill): points = pixels / 2, doubled for a slow line.
  A fast line is one that ends with fire released (draw_step sets `$23`).
  Each split of the Qix this game ($0291) doubles again, but the doubling
  adds only the low byte to itself: from 256 points on, a split adds less
  than double (a bug, by reading the code). At the level's end, 1,000
  points for each percent over the requirement (claim_check).
- **Trapped roamer**: a roamer walled in on all sides sets `$154D`, after
  which every line scores and fills as slow, until the player dies
  (roam_next_dir, life_lost): the manual's "All FAST fills will now
  generate SLOW points until you die".
- **The Qix** (qix_step, `$946A`, once a pass; on two-Qix levels the
  two take turns): a line between two ends, each with a speed across
  (3 or 4 multicolour pixels a step) and a speed down (4 or 5 lines),
  kept as signed bytes. Every change of a speed draws a new size and
  flips its sign (negate_speed, random_speed1). A speed changes only:
  - when the turn timer `$0271` passes zero: a new time (a random byte
    kept if `$20`-`$3E`, about one draw in eight, else cut to 0-3, then
    masked by the level's `$6F`), and each speed reversed three times in
    four; no pull;
  - when an end would leave the box two pixels inside the field
    (qix_limits): that speed reversed, plus the level's pull towards the
    marker (`$6E` if the first end is left of or above the marker, `$6D`
    otherwise, chosen after each step); the end stays put for the step;
  - when an end's move crosses a claimed edge (colour 3 in the `$E000`
    plane; qix1_check_line): the move across and the move down are tested
    on their own, and each that crosses is bounced as at a wall.
- **Qix line length**: the second end is stepped 5 towards the first
  while they are 30 or more apart on either axis; there is no minimum
  (the test against `$156F` can never decide alone). *Live*: the largest
  span seen in 1,000 steps was 29 on each axis.
- **Turn times by level**: 1-4 steps on level 1 (`$6F` = 3); one turn in
  eight 1-8 steps on level 3 (`$07`), 1-31 on levels 2 and 4-6 (`$1F`),
  33-48 from level 7 (`$2F`). *Live* with level 7's values: times up to 45.
- **Bounce turn time**: a bounce calls new_turn_time, which stores at
  `$0273`; nothing reads `$0273`, so a bounce leaves the turn timer
  running. *Live*: a read watch on `$0273` stayed silent for 1,600 steps.
- **Qix fallback**: when the new line itself still crosses a claimed
  edge (only possible in a concave field), the Qix takes the line in
  trail slot `$B5`, the oldest, erased at the start of the step, and the
  turn timer is cleared. *Live*: with a claimed peninsula, 5 fallbacks in
  500 steps, each onto the line of exactly eight steps before.
- **Qix trail**: the last eight lines stay on screen (tables at
  `$021E`-`$026D`, eight of ten slots used, `$156B` = 7). pixel_op tests
  each pixel against the line being drawn (colour 1 in the `$6000` plane)
  when drawing and when erasing, so the newest line kills as it is drawn
  and the oldest as it is erased. *Live*: a colour-1 pixel placed under
  trail lines of different ages, six times; five kills came from the
  erase. Erasing clears every Qix pixel of the old line, crossings with
  newer lines included; drawing XORs the pattern into the bitmap, so
  crossings change colour (by reading pixel_op).
- **Two Qix** (`$BB` bit 7): qix_step serves Qix 1 and Qix 2 on
  alternate passes (`$027A`), so each moves half as often; both use the
  same planes, and qix_reset puts both on the same line. Qix 2's copy of
  the edge test reads Qix 1's y2 (`$028A`) at `$982F` in place of its own
  (`$028E`), when it tests its second end's move across alone (a bug, by
  reading; *live*: a two-Qix replay without the slip drifts from the game
  at step 288 of 400, and with it every step matches).
- **Qix colour**: a random 0-3 each step, 0 read as 1, so pattern `$55`
  half the time and `$AA` or `$FF` a quarter each (qix_colour,
  qix_pattern).
- **Port**: `work/page/qixmove.js` follows qix_step for one Qix with the
  line routine it uses. Fed the random numbers the game drew, it gives
  the same line, speeds, turn time, pulls, trail index and colour as the
  game for 1,000 recorded steps (3 runs: level 1 in the open field; level
  7's values with a claimed peninsula; level 3's with a claimed box and a
  spur), 4,256 random numbers, 112 bounces off claimed edges and 4
  fallbacks among them. With two ports sharing the planes and the
  `$982F` slip kept, a fourth recording of two Qix (level 7's values,
  claimed peninsula, 400 steps, 201 of them by Qix 2) matches every step
  of both. The minisite's viewer runs it, with two Qix on the levels that
  have them.
- **Sparx timer**: the bar right of the field shortens from both ends
  (timer_bar_tick); each time it runs out it counts (timer_runs) and the
  edge walkers are released by those counts (lvl_91D5-$91D7). Pair B, from
  level 3, chases up the line once it reaches the marker's last corner
  (chaser_b1_step, chaser_b2_step).
- **Sparx** (walker pairs, sprites 2-7) walk the edge pixel by pixel; at a
  junction they take the branch nearer the Qix (walk_choose). They start
  halfway round the edge from the marker (sparx_start_point). Touching the
  marker kills (place_enemy_sprite).
- **The Fuse**: when the marker stops while drawing, after a delay the
  Fuse runs along the line from its start; it burns the line behind it
  into the killing colour and kills on reaching the marker (fuse_tick,
  fuse_advance).
- **Spritz / roamers**: from level 5 (`$BE` bit 7: sprites 2-3, in place of pair C;
  from level 7 bit 6 as well: sprites 6-7, in place of pair A), creatures start at a Qix's
  middle, wait 32 passes (roamer_delay), and roam the open field diagonally, turning by a table of 28
  wall patterns (roam_next_dir); touching the line being drawn kills.
- **Practice** plays one level and returns to the title (next_level). It has no pair B walkers, and its roamer setting is forced to `$80`, so the first roamer pair always appears (level_params, enemies_step).
- **Two players**: each keeps a board; switch_player swaps zero page and
  page 2 with `$5E00`/`$5F00` and the planes through `$C000`/`$E000`.

## Data tables

The level tables (lvl_tables, `$1181`), indexed by level; from level 12
on, levels alternate the settings of 10 and 11 (level_params).

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Claim needed (`$B8`) | 65 % | 65 % | 65 % | 65 % | 70 % | 70 % | 75 % | 75 % | 80 % | 80 % | 80 % |
| Two Qix (`$BB`) | | | yes | yes | | yes | | yes | yes | | yes |
| Timer may run out (`$91D9`) | 2 | 2 | 3 | 3 | 2 | 2 | 1 | 1 | 1 | 1 | 1 |
| Pair A after runs | 1 | 1 | 1 | 1 | 1 | 1 | never | never | never | never | never |
| Pair B after runs | 3 | 3 | 3 | 3 | 2 | 2 | 1 | 1 | 1 | 1 | 1 |
| Pair C after runs | 2 | 2 | 2 | 2 | never | never | never | never | never | never | never |
| Pair B chases up the line (`$159B`) | | | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Roamers (`$BE`) | | | | | one pair | one pair | two pairs | two pairs | two pairs | two pairs | two pairs |
| Qix pull to the marker (`$6E`) | 0 | 1 | 0 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 2 |
| Hint at the level's end | | split | | Spritz | | | | | | | |

## Sound

- The music player (`$E000`, 3,370 bytes of code and tables) plays eleven
  tunes; tune 10 is the title's. A tune is three streams of notes and
  21 commands (repeat, call, jump, transpose, waveform, filter, vibrato,
  pulse sweep and others, dispatched through mus_cmd_lo/hi). The tunes at
  the end of a level are shuffled (shuffle_tunes). The Internet Archive
  credits the C64 music to Tim Follin; nothing in the program names him.
- Sound effects (`$B800`) are twelve scripts of notes and seven commands
  on the three voices (sfx_read); 3 and 4 are the Qix's hum, 5 the alarm,
  6 the extra life, 7 and 8 a slow and a fast fill, 9 a death, 10 and 11
  the Fuse.
- Voice 3 is set to noise at the start (sprite_colours_init) and read at
  `$D41B` by the random generator (random_range).

## Live tests

- PAL against NTSC with the crack's loader: stalls on PAL, loads on NTSC.
- The loads: segment addresses logged at the loader's segment start
  (`$02B1`) for `-`, `TITLE1`, `TITLE2`, `ALIEN`, `SCENE` and `TAITO`.
- Music tempo: 600 frames, 600 music_frame calls, 500 voice updates.
- Pause: RUN/STOP froze the main loop until the stick moved.
- Slow against fast draw: line lengths over 120 frames.
- Level end: requirement poked to 1 %, a 6 % claim ended the level.
- Lives and requirement at the start of a game: lives 3, level 1, `$B8` =
  `$41`.
- The Qix, after each qix_step: speed sizes (3-4 across, 4-5 down
  without a pull), turn times, the largest span, the pull against the
  marker's position (600 of 600 steps on level 7's values), fallbacks,
  kills on erase, and a read watch on `$0273` (Mechanics).
- The Qix port: 1,000 steps of one Qix and 400 of two replayed with the
  game's random numbers, every step equal.

## The listing's error rate

A sample of 60 line comments (seed 20261010), drawn from 651 hand-written
comments (45 drawn) and 375 generated by a script (15 drawn), was checked
against the bytes by an agent that wrote none of them. 6 of the 45
hand-written comments were wrong (13 %; 95 % interval about 6 % to 26 %)
and none of the 15 generated ones (0 %; interval 0 % to 20 %); weighted by
the two populations, about 9 % of the listing's comments. The errors were
in what a routine does, not in what calls it: four edge-walk routines
named a quarter turn off, a colour the code can never choose, a walk
described in the wrong direction, a music command's operands, and one
register. The listing carries the fixed text for all six, and the families
they came from were audited: the eight edge-walk routines (`perimeter_*` and `fill_follow_*`,
renamed by the direction they go straight on) and the music source's
block descriptions (re-derived from the tune pointers). The generated
comments are true but thin ("part of a table, referred to by a routine"),
and they are what a Gold pass would most improve. The Qix's movement
routines, from qix_reset to pixel_op, were audited against the port
(Mechanics): six of their comments were wrong, among them the fallback
line (the oldest, not the newest), the line length (a maximum only) and
the erase (a clear, not an XOR), and the listing carries the checked text.
