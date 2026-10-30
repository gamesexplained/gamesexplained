# Power Drift — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Activision's original PAL disk, `power_drift[activision_1989](pal).g64`
  from the C64 Preservation Project (`orientation.md`). `AS` starts `GM1`,
  a loader at `$0334` that reads six blocks through the KERNAL's `LOAD`
  and hands over with `JMP $0834` (`game_start`).
- After the hand-over the game fills the whole 64 KB: no page is free.
  The title picture is shown while the game loads, by code the loader calls
  (`$C800` after block 0, `$6800` after block 1) and later overwritten;
  after the hand-over `game_start` goes straight to the course and driver
  select screen (`select_screen`).
- The text at `$0800` (`signature_text`) and `str_copyright` ($0FB7,
  "COPYRIGHT ACTIVISION,SEGA,CHRIS BUTLER") are the only credits the
  program holds.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: pointers, the multiplexer's sprite records ($4A-$7D, copied to $8A-$BD by `copy_kart_sprites`), the draw order $CA-$D5, the frame counter $E5 | `$0002`-`$00FF` |
| The loader, left in memory and never read again | `$0334`-`$07FF` |
| Game flow, select screen, high scores, name entry | `$0800`-`$1004` |
| The panel, places, faces, podium, start lights, wipe, spin, rivals' movement, kart sorting | `$1005`-`$1B00` |
| Scenery lists (25) and scenery streams (51 of 12 bytes) | `$1B01`-`$2328` |
| `track_step`, the 25 piece lists and the piece routines with their row tables | `$2329`-`$321B` |
| Bends, the player's movement, gears, score, clock, `setup_stage`, start tables | `$321C`-`$3732` |
| `course_table` and the five course records | `$3733`-`$3868` |
| Pause, waits, random numbers, video set-up, colour copy, view clear, rivals on screen | `$3869`-`$3C75` |
| Scenery drawing, its 24 picture tables, the tile blitter `draw_tiles` | `$3C76`-`$4554` |
| The road: `draw_road`, the hills' row tables, the edge routines | `$4555`-`$5017` |
| Interrupts, the sprite bands, the multiplexer | `$5018`-`$536E` |
| The race's variables | `$536F`-`$53FF` |
| The colour buffer (25 rows of 40, rows 5 to 24 copied to colour RAM) | `$5400`-`$57E7` |
| Four character blocks of 1,400 bytes (characters `$42`-`$F0` of the race set) | `$5820`-`$6DFF` |
| The tile sheet: character codes in rows 256 bytes apart | `$6E00`-`$B7F5` |
| The horizon's own characters, two sets of 113 bytes | `$B685`, `$B785` |
| The sound driver | `$B800`-`$C054` |
| Its workspace and shadow registers | `$C055`-`$C100` |
| Note lengths, frequencies, instruments, effects, the two tunes | `$C101`-`$CFFF` |
| Sprites `$40`-`$A2` (the video bank is `$C000`-`$FFFF`; pointer p is at `$C000` + 64 p) | `$D000`-`$E8BF` |
| The panel: rows 0 to 4 of the screen at `$E000` | `$E000`-`$E0C7` |
| View screen 1 (rows 5 to 24) and its sprite pointers | `$E8C8`-`$EBFF` |
| View screen 2, also the select and text screens | `$EC00`-`$EFFF` |
| The panel and text character set | `$F000`-`$F7FF` |
| The race character set: `$00`-`$41` fixed, `$42`-`$FF` copied in each stage | `$F800`-`$FFF9` |
| NMI and IRQ vectors in RAM | `$FFFA`-`$FFFF` |

The panel and the sprites share memory: the screen at `$E000` shows only
its first five rows, and sprites `$83`-`$9F` live where its rows 5 to 24
would be. Sprite `$83`, the chequered marker over the player's face, starts
at `$E0C0`, so its first eight bytes are the panel's row 4, columns 32 to
39 (`sprite_83`). It is drawn at Y `$2E` with no Y expansion (`$D017` = 0,
*live*), so those bytes fall in rows 0 to 2, which are above line 51,
under the top border. The panel's sprite 0 pointer, `$E3F8`, is byte 56
of sprite `$8F`, the third driver's face from the front: `sprite_band_irq`
writes each band's pointer there as it places the band (`$65` when read in
a race, *live*, where the file holds `$BA`).

### Hardware registers

From the register census (`kit/cpu/census.py`, 196 instructions name 69
registers):

| Chip | What the game does with it |
|---|---|
| `$01` | `$35` from `setup_interrupts`: the KERNAL and BASIC banked out, I/O in |
| VIC `$D000`-`$D009`, `$D00E`-`$D010` | sprites 0-3 by `sprite_band_irq`, 4-7 by `race_irq_view` and `kart_mux_irq` (through `,y` from `$D008`), 7 also the marker and the select cursor |
| VIC `$D011`, `$D012`, `$D019`, `$D01A` | the raster chain (`irq_handler` acknowledges; each handler sets the next line) |
| VIC `$D015`, `$D01B`, `$D01C` | all eight sprites on and multicolour, 4-7 behind the background (`setup_video`) |
| VIC `$D016`, `$D018` | multicolour text; `$D018` = `$8C` for the panel (screen `$E000`, set `$F000`), `$AE`/`$BE` for the view (`view_d018`), `$BC` for the select and text screens |
| VIC `$D020`-`$D023`, `$D025`-`$D02B` | border, the sky and ground colours, multicolours, sprite colours |
| SID `$D400`-`$D414`, `$D418` | the sound driver only; the filter is never used (`$D415`-`$D417` are only cleared, by `sound_silence`'s loop over `$D400`-`$D41B`) |
| CIA 1 `$DC00` | the joystick in port 2 (13 reads) |
| CIA 1 `$DC01` | the space bar (`pause_on_space`); also read and ignored by `cmd_effect_release`, which no pattern uses |
| CIA 1 `$DC04`-`$DC07`, `$DC0D`-`$DC0F` | timer A changes the background from sky to ground at the horizon; timer B places the sprite bands |
| CIA 2 `$DD00`, `$DD02` | the video bank `$C000` (`setup_video`) |
| CIA 2 `$DD0E`, `$DD0F` | its timers stopped (`setup_interrupts`) |

## Timing

- A race frame is one pass of `race_frame_loop`, which draws the whole
  view into the screen not shown and flips. *Live*, from `work/play-a1.vsf`:
  166 to 177 passes in 500 PAL frames (ten seconds), about 17 a second,
  standing or driving.
- The race clock (`race_clock`) counts race frames, not time: its
  hidden sixths digit `$53E1` steps every other race frame, so a clock
  second is 12 race frames. *Live*: in ten seconds of emulated time the
  clock moved on 14 to 15 seconds.
- The frame counter `$E5` goes up once a video frame, in `race_irq_top`
  and `select_irq_top`; `wait_frame` and `wait_frames` count it.
- Raster chain of a race frame: `race_irq_top` (line 0: panel, sound,
  timers) → `panel_irq_lower` (line `$4A`) → `race_irq_view` (line `$5A`,
  the view's screen) → `kart_mux_irq` for each kart below → line 0. CIA 1
  timer A (`$24` × 256 cycles after the top) switches the background to the
  ground colour; timer B places the four bands of `sprite_bands`.

## Controls

- Joystick in port 2 (`$DC00`). Up accelerates every other race frame
  (`speed_up`); with neither up nor down the kart slows every other race
  frame (`slow_down`), twice as fast with down held (`move_player`).
- Left and right slide the road three units a race frame against the kart
  (`$2F`, kept from `$A8` to `$1B`) and turn the kart's picture a step every
  fourth race frame (`set_kart_frame`).
- Fire changes gear, once a press (`gear_change`): low gear tops out at
  speed level 18, high at 32, and high gear accelerates more slowly below
  level 14 (`move_player`).
- Space pauses: hold, let go, press and let go again (`pause_on_space`,
  `$DC01` = `$EF`).
- On the select screen left and right move the course highlight, the
  driver cursor runs along the faces by itself, and fire picks both
  (`driver_cursor_loop`).

## Graphics

- The race screen is the panel (rows 0 to 4 of `$E000`, panel set) over
  the view (rows 5 to 24 of `$E800` or `$EC00`, race set), split by
  `race_irq_view` at line `$5A`.
- The view is drawn in character cells, not a bitmap: `clear_view` fills
  it with `$20` (sky), `draw_horizon_rows` copies up to seven rows of the
  stage's horizon picture (it scrolls sideways a column a step in a bend,
  `bend_drift`), `draw_road` draws the road a row at a time from the
  bottom, and `draw_scenery` cuts the roadside pictures out of the tile
  sheet with `draw_tiles`, far ones first. Colours go to the colour buffer
  and `copy_colours` copies them to colour RAM after the flip.
- The sky and ground are one background colour changed mid-screen by CIA 1
  timer A, its high byte `$23`, which the track's hills move.
- The karts are sprites: the player's is a head (sprite 0) and three body
  sprites in band 0 of `sprite_bands`; the start sign and lights take bands
  2 and 3 for the start (`start_lights`). The eleven rivals are up to
  twelve sprite records multiplexed through sprites 4 to 7
  (`kart_mux_irq`), sorted by Y each race frame (`sort_karts`). A rival
  near enough has a head and three body sprites like the player's
  (`rival_near`, `rival_close`, `rival_middle`); far ones are one or two
  sprites (`rival_pictures`).
- Steering pictures: five frames (`kart_body_frames`), each in two sets
  that alternate every eight race frames for the wheels. A spin runs
  through eight frames (`spin_kart_1`-`_3`); the head turns to the front
  for frames 3 to 7 (`spin_head_tables`).
- Scenery: 24 types (`scenery_pictures`), each with a picture at 16
  distances; a slot's distance counts down from 15 a track step at a time
  (`scenery_tick`), and four slots are on screen at once.

## Mechanics

- **Courses and stages.** Five courses of five stages (`course_table`).
  A stage's record gives its piece list, scenery list, raised-track count,
  multicolour, sky and ground colours and two horizon pictures.
- **Laps.** The position `$5380`/`$5381` grows by the speed level each
  race frame; 50 coarse steps are a lap, and the fourth lap ends the race
  for the player (`move_on`). Rivals do the same with their own speeds
  (`move_rivals`): rival 0's top speed is `$1E`, rival 10's `$0C`
  (`rival_top_speeds`); the player's is 32 in high gear.
- **Places and the podium.** The player's place is worked out each race
  frame from the rivals' laps and positions (`update_place`). There are
  three podium places (`$53AA`); each kart that finishes takes the next
  (`place_finisher`). When the third is taken before the player has
  finished, `$53AB` is set and the race ends in `game_over`; so a place in
  the first three is needed to go on.
- **Speed.** Speed levels 0 to 32; the read-out adds 7 km/h a level
  (`speed_up`): 126 km/h is the top of low gear, 224 of high. *Live*: level
  18 showed 126, level 10 70, level 17 119.
- **Score.** Each race frame adds a quarter of the speed level
  (`add_speed_score`) to a six-digit BCD score (`$53DC`-`$53DE`); the panel
  shows a seventh digit, a fixed 0, after it (`draw_score`).
- **Time bonus.** At the end of a stage won, `show_bonus` shows 45 minus
  the seconds of the race time, in BCD: the minutes are ignored, and
  seconds from 46 to 59 wrap to 99 down to 86. `count_bonus` then adds
  1,000 points and takes one off the bonus until it reaches 0, but
  `draw_score`, which it calls each time, ends with `CLD`, so every
  subtraction after the first draw is binary: the BCD bonus is counted
  down as a hexadecimal number. A bonus shown as 25 pays 37,000 points
  ($25 = 37), and while it counts the panel shows the letters A to F,
  which are the alphabet's characters `$0A`-`$0F` (`draw_bonus_digits`).
  Seconds of exactly 45 give a bonus of 00, counted down from 0 through
  255: 256,000 points. *Live* (`work/bonus_live.py`): with the seconds
  at 20, the bonus showed 25, counted 37 times through 1F, 1E ... 1A and
  0F ... 0A, and the score went from 0 to 37,000; on the kit's simulator
  (`work/bonus_test.js`) seconds 00, 10, 30, 44, 45, 46, 50 and 59 paid
  69, 53, 21, 1, 256, 153, 149 and 134 thousand.
- **Bends.** A bend piece sets `$2D` from 0 to 18 (9 is straight, below 9
  left); on each step in a bend the road is pushed sideways against the
  kart by the stage's pull and the horizon scrolls (`bend_drift`).
- **Hills, raised track and jumps.** Climbs, crests and descents point the
  road's three row tables (widths, scenery rows, kart heights) at their
  sets for each step and move the horizon (`piece_climb`, `piece_crest`,
  `piece_descent`). On raised track (`$53D4` not zero) a kart off the road
  falls (`move_player`) and is dropped back onto it from the top of the
  view (`drop_kart_back`, `drop_kart_step`), at 70 km/h. A jump leaves a
  gap in the road; the kart is in the air from step 7 to 21, and below
  speed level 10 (70 km/h) on any of those steps it falls (`piece_jump`).
  In the air the stick does nothing: the road keeps the sideways slide it
  had at the take-off (`move_player`).
- **Spins.** Running into roadside scenery at distance 0 (`draw_scenery`)
  or into a slower rival at distance 1 in front (`place_rivals`) starts a
  spin of ten turns (`kart_spin`), during which the road slides back under
  the kart and the horizon whirls.
- **Off the road.** Off the road (`$2F` outside `$C0`-`$FF`) above speed
  level 3 the kart slows (`move_player`).
- **High scores.** Seven entries of three BCD bytes and three letters
  (`high_score_scores`, `high_score_names`); a new score is placed from the
  bottom up (`high_score_check`) and named on the ring of letters
  (`name_entry`).

## Data tables

- `course_table` ($3733) → five 60-byte records; `track_a1`-`track_e5`
  ($2346-$2B0B) piece lists ended by `$FFFF`; `scenery_a1`-`scenery_e5`
  ($1B01-$20C4) scenery lists of streams and character blocks.
- `scenery_streams` ($20C5): 51 streams of four records (left, over the
  road, right); `scenery_stream_unused` ($22B1) is named by no list, and
  every list starts with `scenery_start` ($22F9).
- `scenery_pictures` ($3E0B) → a 64-byte table per type: width, height and
  source in the tile sheet at each of 16 distances; `scenery_colours`
  ($3E3D).
- `rival_pictures` ($3B43), `rival_scale` ($3B23), `rival_top_speeds`
  ($1989), `rival_lanes` ($3717), `rival_start_coarse` ($3701).
- `head_behind`, `head_looking_back`, `head_front` ($1779-$179C), one
  sprite pointer per driver.

## Sound

- One driver at `$B800`: `sound_play` once a video frame, called only by
  `race_irq_top` (`$5253`) and `text_irq` (`$5181`), so the select screen,
  whose handlers never call it, is silent; `sound_tune` ($B804) is the tune `sound_reset` starts
  (1 on the name entry, 2 in the race, 0 silence); a write to
  `sound_effect` ($B805) starts an effect on voice 3.
- Two tunes (`tune_table`, $C4BA), three voices each, of order lists and
  patterns; four effects (`effect_table`). The game starts only effects 2
  (a place won or lost, `update_place`, or a rival alongside,
  `rival_near`) and 3 (a spin, `kart_spin`): the references search finds
  `$B805` written with 2 at `$1412` and `$3BBB` and with 3 at `$1689`, and
  otherwise only by the driver. Effect 4, a looping engine hum, is started
  only from `$BF29` when `$B808` is set, which only starting effect 4 does;
  effect 1 has no writer. `sound_engine_off` ($C01C) is called by nothing.
- Pattern commands 18, 24 and 33 are in no tune or effect; 36 is only in
  effect 1 and 42 only in effect 4.
- `game_start` sets `sound_music_off` ($B806) before the select screen
  and clears it, with tune 2, before the race; `name_entry` starts tune 1.

## The listing's error rate

One sample, seed 20261030, of 60 comments drawn from the listing's 572: 40
from the 469 written by hand and 20 from the 103 a script wrote from the
game's tables (the scenery lists, the tile sheet, the sprites and the
course records). One checker on claude-opus-5-5 with
`kit/skills/core/60-verify/checker.md`. Every verdict of wrong was read
against the code, and all seven held: 7 of 60, 11.7 % (95 % interval 5.8 %
to 22.2 %), over the mark and a lower bound on the true rate; 5 of the 40
hand-written and 2 of the 20 scripted, 12.0 % weighted by the two groups'
sizes. None was wrong about what its routine or table is for; each was
wrong in a detail. The select screen's cursor starts on the second driver,
not the first (`$0CED`): its loop moves it on before it first places it.
The copy of the kart sprites does not cover their draw order, which the
interrupt reads where it is sorted (`$18EE`). A scenery list's tail named
one stream where there are three (`$1D11`). The player's routine left out
the jump, in which the stick does nothing, and the slow-down after a fall
from a raised stretch (`$3291`). The two horizon pictures were named the
wrong way up (`$37DD`): the first of each stage's pair is drawn above the
second. A sprite's sharing and two distance ranges were miscounted
(`$D000`), and the panel's sprite 0 pointer is written for every band, not
only band 0 (`$E3F8`). All seven were corrected, with the comments that
said the same: the tails of two more scenery lists (`$1CA1`, `$1F9D`), and
the horizon's names in the other four courses' horizon lists, the course
record, five pieces of the tile sheet, the two sets of horizon characters,
the race's character set, `setup_stage` and the copy loops of
`draw_horizon_rows`, whose eight labels swapped.

## Live tests

- `work/bonus_live.py`: from `work/play-a1.vsf`, stopped at the top of
  `race_frame_loop`, the seconds `$53E0` set to `$20`, the score to 0 and
  the program counter to `stage_won`: the bonus showed 25, counted 37
  times showing 1F to 1A and 0F to 0A, and left the score at 37,000. A
  screenshot (`reference/bonus-hex.png`) shows BONUS 1B000.
- `work/bonus_test.js` (the kit's simulator on the same snapshot):
  `show_bonus` and `count_bonus` for eight values of the seconds.
- `work/clock_live.py` and `work/clock_live2.py`: 500-frame windows with
  checkpoints on `race_frame_loop`, standing and with the stick held up:
  166 to 177 passes, the clock 14 to 15 seconds on; the speed level and the
  km/h read-out (18 and 126, 10 and 70, 17 and 119); `$D017` and `$D01D`
  0; `$E3F8` `$65` and `$E3FF` `$83` in the race.
- `work/bendcheck.py`: bends below 4 and above 14 photographed; `$2D`
  below 9 is a left bend.
