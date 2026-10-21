# Tycoon Tex — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The Gremlin Graphics cassette of 1985 (Micro Projects; code by Anthony
J. Clarke, graphics by Matthew Clarke), from the TOSEC raw tape file
named in `orientation.md`, loaded on a 16 KB PAL Commodore 16 in
plus4emu. Novaload's turbo loader reads one block, `$1000`-`$3FFF`, and
its stub calls `$1800` (`start`). Nothing is loaded after that: the
menu, the high scores, the demo and all 99 levels are that one block.
*(live)*

The game calls the KERNAL once, to clear the screen with `BSOUT`
(`start`). It takes its interrupt through the KERNAL's handler and the
vector at `$0314` (`install_irq`), and ends each interrupt by pulling
the registers that handler pushed and `RTI` (`irq`). It reads the
joysticks and the keyboard through TED itself (`read_controls`,
`test_key`). The ROMs stay paged in throughout: `$FF3E` and `$FF3F` are
never written, and nor are `$FF06` or `$FF14`, so the screen stays where
the KERNAL put it (register census).

## Memory layout

| Thing | Where |
|---|---|
| Variables | zero page `$02`-`$E8`; `clear_zero_page` zeroes `$07`-`$FF` at `start` and at every new game (`start_game`) |
| Tex's characters while he dies | `$0400`-`$04A7`, characters `$40`-`$54` saved by `tex_death` and put back after |
| The characters the logo borrows | `$0560`-`$05CF`, characters `$5D`-`$6A`, saved by `show_logo_chars` while the menu is up |
| Colour memory | `$0800`-`$0BE7` |
| Screen | `$0C00`-`$0FE7`; the HUD on rows 0 to 2, the skyline on rows 3 to 7, the play field on rows 8 to 21, the pipeline on rows 22 and 23, the message on row 24 |
| The score | on the screen itself, `$0C56`-`$0C5B`, six digits as screen codes (`add_score`) |
| The skyline and pipeline characters | `$1000`-`$17FF`, 256 multicolour characters: five skyline pictures of 40 characters (`skyline_chars` to `skyline_piece_4`) and the pipe, `$C8`-`$FF` (`pipe_chars`) |
| Code, tables and text | `$1800`-`$3BFF` |
| The main character set | `$3C00`-`$3FFF`, 128 characters: the font, Tex, the bars, the menu's patterns, the enemies and the solid block (`font` to `block_char`) |

Nothing of the game is loaded below `$1000`; pages 1 to 3 hold what the
loader left there.

## Timing

A PAL frame is 49.86 a second (`kit/skills/c16/c16-reference`,
"Timing"). `irq` runs five raster interrupts a frame, one band each, at
lines 204, 23, 65, 176 and 192 (`raster_lines`); the band at line 204,
`irq_frame`, starts the frame. Most of the moving is done in the
interrupt, once a frame. The main loop (`main_loop`) runs separately, at
a pace set by a busy wait (`delay`), and moves the bouncy bomb and the
crash explosive, drains the pressure and counts the points for running.

| What | How often | Source |
|---|---|---|
| A main-loop pass | `delay` with X = 24, 16 or 8 (EASY, HARD, IMPOSSIBLE), each X 256 turns of an 11-cycle loop; with the interrupts it comes to about 3.7, 2.5 and 1.2 frames a pass with Tex standing, 4.3 on EASY with him running | `main_loop`, `loop_paces`; *live*: 408, 610 and 1,214 passes in 1,500 frames; 349 running |
| An eighth of pressure | every 24, 19 or 14 passes (EASY, HARD, IMPOSSIBLE): a full bar lasts about 6 minutes, 3 minutes 15 seconds and 72 seconds with Tex standing still | `main_loop`, `drain_rates`; *live*: 17, 31 and 86 eighths in 1,500 frames |
| A point for running | every 24 passes while Tex's speed is above 0, with a step of % COMPLETED | `main_loop`, `completed_rates` |
| A level at full speed | about 110 seconds on EASY and 37 on IMPOSSIBLE, running right without a shot | *live*: 5,462 and 1,833 frames from the start of level 2 to `level_complete` |
| Tex's step | one column every third frame, left or right | `move_tex`, `move_divider`; *live*: 10 columns in 30 frames with X held |
| A jump | ten steps, one every second frame: five rows up, five down, 20 frames | `start_jump`, `step_jump` |
| The bullet | one cell a frame | `move_bullet` |
| An explosion | eight steps, one every second frame: 16 frames, with no shot meanwhile | `tick_explosion`, `draw_explosion` |
| The arrow | one column a frame, from column 36 to 0 | `move_arrow_and_jet` |
| The jet | one column every second frame, from column 0 to 36 | `move_arrow_and_jet` |
| The jet's bomb | a row every second frame, 11 rows to the pipe | `move_jet_bomb` |
| The bouncy bomb and the crash explosive | a step each main-loop pass, so faster on the harder settings | `move_bombs`, `move_bouncy_bomb`, `move_explosive` |
| Tex's death | 23 pixels down, one every second frame, then the level goes on from column 1 | `tex_death`, `sink_tex` |
| The message | one pixel a frame | `scroll_message` |
| The star | a new size every fourth frame, six steps | `twinkle_star` |
| The demo | starts after 255 turns of the menu; changing a setting does not reset the count, only starting a game does | `menu`, `menu_turns` |

## Controls

Joystick or keyboard, chosen at the menu with J and K (`menu_keys`); the
picture between the two boxes shows which (`keyboard_icon`,
`joystick_icon`). *(live)*

The joystick in port 2 or port 1: `read_controls` reads port 2 first and
port 1 only when port 2 shows nothing, so either works and port 2 wins.
Before each read it rewrites one instruction at `$1878`
(`controls_fire_shift`), because fire is bit 7 of port 2's byte and bit 6
of port 1's. Right, left, up to jump, fire to shoot. *(live, port 1)*

The keyboard (`read_keys`, `key_columns`, `key_rows`): Z left, X right,
`;` jump, `/` down and RETURN fire. *(live: Z, X, `;` and RETURN)*

At the menu, up and down bring the next or the previous item into the
window and fire carries it out (`menu_input`, `menu_choose`). In play,
SPACE pauses and C= carries on, ESC ends the game (`check_play_keys`).
*(live)*

In the high-score table, up and down change the letter under the cursor
through A to Z, a space, and `!` to `:`; left and right move the cursor
over the seven letters; fire ends (`enter_hiscore`).

Down does nothing in play: `move_tex` never tests it.

## Graphics

Multicolour text throughout, the screen split into five bands by the
raster interrupt (`irq_frame`, `irq_skyline`, `irq_field`, `irq_pipe`,
`irq_scroller`). Each band sets its own character set, colours and fine
scroll:

| Band | Rows | Characters | Scroll |
|---|---|---|---|
| `irq_frame` | 0 to 2, the HUD | 128 at `$3C00`, 40 columns | none |
| `irq_skyline` | 3 to 7, the skyline | 256 at `$1000`, 38 columns | `$06`, the skyline's |
| `irq_field` | 8 to 21, the play field | 128 at `$3C00`, 38 columns | none |
| `irq_pipe` | 22 and 23, the pipeline | 256 at `$1000`, 38 columns | `$1B`, the pipe's |
| `irq_scroller` | 24, the message | 128 at `$3C00`, 38 columns | `$1C`, the message's |

The skyline and the pipe scroll at different speeds, which is the
parallax: at each of Tex's eight speeds the pipe moves 0, 2, 3, 4, 5, 6,
7 and 7 pixels a frame and the skyline 0, 1, 1, 1, 2, 2, 2 and 3, where
the skyline's single pixel at speed 1 comes only every other frame
(`pipe_speeds`, `skyline_speeds`, `scroll_skyline`, `half_rate`). The speed comes from Tex's column:
columns 1, 4, 7, 10, 13, 16, 19 and 22 set speeds 0 to 7, and between
them the speed stays as it was (`set_speed`, `speed_columns`). His legs
run faster with the speed: 22, 16, 14, 10, 7, 3 and 1 frames between
frames (`leg_delays`, `animate_legs`).

The skyline is built from five pictures of eight columns by five rows,
picked at random, never the same entry twice running
(`next_skyline_piece`, `skyline_piece_chars`). Pictures 1 to 3 have two
entries each among the eight, so they come up twice as often as 0 and 4.

Tex is 15 characters, `$40`-`$4E`, three columns by five rows
(`tex_layout`). His legs are the bottom two rows, rewritten from four
frames (`leg_frames`). When he dies, `turn_tex` turns every one of his
characters a quarter turn in place and `draw_tex` switches to a layout
five columns by three rows (`tex_lying_layout`), so he lies down; then
`sink_tex` slides each column down a pixel at a time into the ground.

Enemies are characters drawn into the play field: the arrow
(`$5D`-`$62`), the jet (`$63`-`$6C`), the bouncy bomb (`$6D`-`$72`),
the jet's bomb (`$73`, `$74`) and the crash explosive (`$75`-`$7A`). The
arrow, the bouncy bomb and the crash explosive have a different shape in
each scene, copied into the character set at every level
(`set_scene_graphics`, `arrow_shapes`, `bouncy_shapes`,
`explosive_shapes`); the jet is the same everywhere.

THE END, the countdown 3, 2, 1, GO! and the explosions are drawn in
solid blocks, character `$7B` (`draw_big_glyph`, `draw_explosion`). The
glyphs are 16 cells wide and nine high, two bytes a row
(`countdown_glyphs`, `the_glyph`, `end_glyph`). `draw_big_glyph_2` is a
second copy of `draw_big_glyph`, byte for byte, which `the_end` calls.

At the menu the patterned boxes, the window's edges and a strip of
lettering are characters rolled a pixel at a time (`animate_menu_chars`),
the logo's 20 cells cycle through the colours (`cycle_logo_colours`),
and every star on the screen twinkles, since the star is one character
redrawn every fourth frame (`twinkle_star`).

## Mechanics

### Levels and scenes

A level is one stretch of pipeline, filled by running and shooting until
% COMPLETED is full. Its 26 cells fill by eighths: running adds 0 to 4
eighths every 24 main-loop passes, more at higher speeds
(`completed_rates`), and every scoring shot adds 3 (`move_bullet`,
`add_completed`). The level is complete at the first addition that finds
all 26 cells full (`add_completed`).

The scene moves on at every level: desert, ice, then the grey surface
pipe, and round again (`next_level`, `scene`). Level 1 is the desert, 2
the ice and 3 the surface pipe, and 4 the desert again. *(live)* A scene
decides the colours of every band (`scene_colours`,
`set_scene_colours`), the decorated pipe pieces (`scene0_pieces`,
`scene1_pieces`; the surface pipe has only the common ones), and the
shapes of three of the enemies.

Each level decides its enemies (`next_level`, `enemy_mask`):

| Levels | Enemies | Delay base | Threshold |
|---|---|---|---|
| 1 | the jet | 128 | `$B0` |
| 2 | the bouncy bomb | 128 | `$B0` |
| 3 | the crash explosive | 128 | `$B0` |
| 4 to 6 | two of the four kinds, at random (`enemy_pairs`) | 128 | `$80` |
| 7 to 9 | three of the four, at random (`enemy_triples`) | 128 | `$40` |
| 10 to 19 | all four | 128 | 1 |
| 20 to 39 | all four | 100 | 1 |
| 40 to 59 | all four | 58 | 1 |
| 60 to 79 | all four | 1 | 1 |
| 80 to 99 | all four | 128 | 1 |

*(live: levels 2, 3, 4, 20, 40, 60, 80 and 99 entered with `$9D`
poked, the mask, the delays and the threshold read back)*

The delay base is the least count, in frames for the arrow and the jet
and in main-loop passes for the bouncy bomb and the crash explosive,
before an enemy comes back after it has gone (`enemy_delays`). The threshold is a test on a random byte each
frame: an enemy's delay counts down only on frames when the byte is at
least the threshold, so `$B0` lets it count about one frame in three and
1 nearly always (`move_arrow_and_jet`, `move_bouncy_bomb`,
`move_explosive`). From level 7 the jet's bombs break the pipe as well
as threaten Tex (bit 4 of the mask, `end_jet_bomb`); from level 4 a
break in the feed can have three middles rather than two
(`break_parts`, `build_break`).

The level is kept in decimal (BCD), and `next_level` takes the delay
group from bits 5 and 6 of it. That is right for 1 to 79 and wrong
after: level 80 is `$80`, bits 5 and 6 clear, and levels 80 to 99 get
the slow enemies of levels 1 to 19 again. *(live)*

After level 99 the level becomes 00: `next_level` adds 1 in decimal mode
and keeps the low byte. Nothing tests for the end of the game. Level 00
takes the path the code gives values below 7 that are not 1, 2 or 3: two
kinds of enemy at random, as on levels 4 to 6, with the breaks of levels
1 to 3; then 01 is level 1 again. *(live: level 99 completed with `$9D`,
level 00 began with mask `$09`)*

### Pressure

The OIL PRESSURE bar is 26 cells of eight eighths; a level starts it at
25 cells and 7 eighths (`next_level`). It falls an eighth every 24, 19
or 14 main-loop passes on EASY, HARD and IMPOSSIBLE (`drain_rates`),
whether Tex moves or not. A bomb or a crash explosive that reaches the
pipe takes 4, or 2 where a break is there already (`break_pipe`). When
the part cell holds less than the amount, `lose_pressure` takes a whole
cell and leaves the part cell at 7, whatever was left in it: such a loss
costs the part cell's eighths plus one, not the amount. A loss of 4
costs 1, 2, 3, 4, 4, 4, 4 and 4 eighths with 0 to 7 in the part cell, and
a loss of 2 costs 1 with 0 in it. *(live)*

When the bar runs out the game ends, however many lives are left
(`lose_pressure` sets `$6F`; `main_loop` goes to `pressure_out`): BAD
NEWS! OIL PRODUCTION HAS CEASED. YOU HAVE BEEN PERSUADED TO HAND IN YOUR
RESIGNATION.! BETTER LUCK NEXT TIME TEX. (`bad_news_text`). *(live: one
eighth left, three lives; the message, THE END and the menu)*

The inlay says the faster Tex runs the quicker the pressure builds. In
the code the pressure never rises during a level: speed raises %
COMPLETED and the score, and the pressure only falls.

### Breaks and deaths

The pipe is fed one piece at a time from the right
(`next_pipe_piece`, `feed_pipe`). Every 18th piece made while a random
byte is negative is a break: a left edge, one to three middles and a
right edge, two columns each (`build_break`). A bomb or a crash
explosive that lands makes a break of its own six columns wide
(`break_pipe`, `break_chars`).

Tex dies in a break when the cell of the pipe's top row under his left
column holds one of the characters `$D9`-`$E9` (`check_hole`). That is
every column of a break but its leftmost: the right edge's two columns
count as gap. The test leaves out `$DB` and `$DD`, which are characters
of the pipe's bottom row, where it never looks. He dies too when any of
his 15 cells is drawn over a character `$5C` or above, an enemy
(`draw_tex`).

Tex does not move across while he jumps (`move_tex` skips both
directions while `$23` is set), so a jump clears a break only if the pipe
carries it under him while he is up. `check_hole` tests the cell under
his left column on every frame; from the frame after up is pressed it
looks at a field row above the pipe, and 18 frames later he is back on
the pipe (`start_jump`, `step_jump`, `draw_tex`). In those 18 frames the
pipe moves 36, 54, 72 and 90 pixels at speeds 1 to 4, and the cell under
him has to go from the column before the break's deadly columns to the
one after them: 6, 8 or 10 columns, 48, 64 or 80 pixels. So at speed 1
no break can be jumped, at speed 2 only a break of one middle, at speed
3 a break of one or two middles, and from speed 4 every break. *(live at
speeds 1 to 3; speeds 1 to 7 on the kit's 6502)*

A death costs a life from `$80` and from the TYCOONS digit on the
screen (`tex_death`); at none the game is over. Tex starts again at
column 1 of the same level, with a fresh pipeline and the bars as they
were.

### Score

| What | Points | Source |
|---|---|---|
| Arrow | 25 | `move_bullet` |
| Bouncy bomb | 50 | `move_bullet` |
| Crash explosive | 200 | `move_bullet` |
| Jet's bomb | 250 | `move_bullet` |
| Running | 1 every 24 main-loop passes while the speed is above 0 | `main_loop` |
| End of a level | 1 for each eighth of pressure left, and 1 more | `level_complete` |

The jet itself cannot be shot: it flies on rows 8 and 9, above the
highest row Tex's gun reaches, row 14 at the top of a jump
(`fire_bullet`, `step_jump`, `bullet_stop`).

Every time the ten-thousands digit of the score changes, Tex gets a
life, up to 9 (`add_score`, `last_ten_thousands`): a life for every
10,000 points, and one at 100,000 when the digit goes from 9 to 0.
*(live: 9,995 to 10,001, lives 3 to 4)*

### High scores

THE TYCOONS! holds eight entries of a six-digit score and a seven-letter
name (`hiscore_table`). A score must be above an entry to beat it
(`check_hiscore`). `enter_hiscore` moves the entries below down one, and
the copy stops a byte short: the entry it moves into the place below the
new one keeps the first digit of the entry that was there. With scores
under 100,000 every first digit is 0 and nothing shows; a score of six
digits pushed down by a new best loses its first digit. *(live: GREMLIN
at 150,000, a game ended at 200,000; GREMLIN became 50,000)*

### The demo

WATCH THE DEMO, or 255 turns of the menu, plays the game
with `demo_controls` in place of the player: right until Tex reaches
column 16; after that, while he is at column 12 or beyond, left on about
one frame in eight and right on about one in eight, so he wanders; a
shot about one frame in sixteen, and a jump when the edge of a break is
just ahead of his feet (`demo_controls`, `menu`).

## Data tables

| Table | Holds |
|---|---|
| `raster_lines` | the five interrupt lines, 23, 65, 176, 192 and 204 |
| `speed_columns`, `pipe_speeds`, `skyline_speeds`, `leg_delays` | the eight speeds |
| `scene_colours` | 16 bytes a scene, 15 of them read |
| `scene0_pieces`, `scene1_pieces`, `common_pieces`, `rare_limits` | the pipe pieces and how often the decorated ones come |
| `enemy_delays`, `enemy_pairs`, `enemy_triples` | the enemies by level |
| `loop_paces`, `drain_rates` | the difficulty: 24, 16, 8 and 24, 19, 14 |
| `completed_rates` | % COMPLETED's step at each speed: 0, 1, 2, 3, 3, 3, 4, 4 eighths |
| `bouncy_starts`, `explosive_starts` | where the bouncy bomb (rows 12 to 18) and the crash explosive (rows 10 to 17) appear |
| `explosion_cells`, `explosion_rings` | the explosion, a square of five by five cells without its corners, 21 cells drawn in rings of 1, 4, 8 and 8 |
| `hiscore_table` | as loaded: 5,000 GREMLIN down to 100 M.P.LTD. |
| `message_text` | the scroller, ending with `$FF` |

Three pieces of the program are never referred to: `phone_text`, TEL
0727 34566 in PETSCII after the high-score table; `cheat_space`, 15
bytes of character codes; and `unused_scene_bytes`, three bytes. And
`right_blocked` (`$73`) is tested before Tex moves right, but nothing
ever sets it to anything but 0.

## Sound

TED's two voices, only while SOUND is ON at the menu (`sound_on`); it
is OFF as loaded. Three effects:

- **The sixgun** (`shot_sound`, `tick_shot_sound`): voice 1 at
  frequency register value `$301`, the volume at its loudest, for 20
  frames, the low byte falling by 8 a frame. The routine means the high
  bits to fall too, but it ORs them into `$FF10`, voice 2's high bits,
  instead of `$FF12`, voice 1's, so voice 1 stays at `$3xx`: a quick
  sweep from `$3F9` down to `$369` after the first frame.
- **A hit** (`hit_sound`, `tick_hit_sound`): voice 2's noise at `$3FF`,
  falling by 14 a frame, about 18 frames.
- **The level's pressure count** (`level_complete`): voice 2 as a tone,
  its frequency's low byte the pressure left (cells times 8 plus the
  part cell), so the pitch falls as the bar empties into the score.

There is no music.

## The authors' source

Plus/4 World's "Source files" download for the game, read on 21 October
2026 (93,378 bytes, SHA-256 `1a0d82c9`...`ed514`), is a copy of a
Commodore disk named PLATFORM, id `B1 2A`, of 98 files. It is not in
this repository; what it shows of how the game was made is on the
Source tab, from `original-source.md`. Against the snapshot:

- The program's source, 59 files that TYCOON-TEX chains with `.lib`,
  assembles byte for byte to the disk's object file OBJ, `$1800`-`$3BF2`
  in MOS hex, every record's checksum right. OBJ matches the game in
  every byte but `$3262`: `$58` in OBJ and the source
  (`lda scrpos+2 ;* thousands`, a life every 1,000 points), `$57` in the
  game (`add_score`).
- The character sources assemble to the disk's CHAR#1, `$1000`-`$17FF`,
  which matches the game but `$1001`-`$1002`: `$3E $3A` on the disk,
  `$09 $10` in the game, the BASIC line link `$1009`. Novaload writes
  those two bytes from the tape *(live: a write checkpoint on
  `$1001`-`$1002` stopped at Novaload's store at `$0395`)*.
- `$3C00`-`$3FFF` is the disk's binary FRAK!, identical.
- `$3BF3`-`$3BFF`, thirteen `$FF` bytes that nothing reads, are in no
  file.
- In the source, `$36E3`-`$36F1` (`marida`) holds the five enemies'
  colours for each of the three scenes and `$19BE` (`tim5`) each scene's
  offset into it; the lines that read them are commented out, and every
  enemy gets `$78`. `$1920`, `LDX #$20`, is the first instruction of
  `delay`, which every caller enters at `$1922`. `$C0` is `cheat`, set
  and tested only by lines commented out. The picture `joystick_icon`
  is a "kempston joystick".

## The listing's error rate

One sample of 60 of the listing's 466 comments, drawn with the seed
20261021 from the whole listing, checked against the bytes, the kit's
simulator and the snapshot's memory by an agent (on
`claude-opus-5-5[1m]`, the model that wrote them) that wrote none of
them. It marked 7 of the 60 wrong in a detail and none wrong in its main
claim; each of the seven was read against the code and holds. That is
11.7 % wrong (Wilson 95 % interval 5.8-22.2 %), over the mark of two in
60, and a lower bound, since a checker misses some. The seven:
`ctl_any` was said to mean a control is held, where in joystick mode it
is only ever set, other keys set it too, and nothing reads it;
`move_timer` was said to count frames, where it counts calls to
`move_divider`; `ring_count` was said to hold the cells left, where it
holds them less one; `last_ten_thousands` was said to change only when
a life is given, where it follows the score's ten-thousands digit even
at nine lives; `hud_colours` was said to give each word its own colour, where
several share one; `menu` was said to start the demo after 256 turns
with nothing chosen, where it is 255 and changing a setting does not
hold it off; and `start_explosion` was said to draw the explosion two
rows above the place hit, where it is centred on that row, two columns
to the right. All seven were corrected, with five other comments that
said the same things or that the same reading turned up wrong
(`explosion_cell`, `menu_turns`, `demo_mode`, `message_ptr`, and
`level_complete`, whose level bonus is a point for each eighth of a cell
left and one more). An audit
of every comment is recommended (`TODO.md`).

## Live tests

All on the kit's plus4emu server from the snapshots in `orientation.md`
and a snapshot of level 2 made from them (`$9D` poked at level 1),
through `kit/c16/plus4emu.py`, reading memory frame by frame. Where Tex
had to survive, Plus/4 World's invulnerability pokes (`cheats.md`) were
made first.

- **Levels and scenes:** `$9D` poked to 1 in play three times. Levels 2,
  3 and 4 began, with the ice, the grey surface pipe and the desert, the
  masks `$02`, `$08` and `$09`, the threshold `$B0`, `$B0`, `$80`, and
  breaks of 2, 2 and 3 middles.
- **Delay groups:** the level poked to 19, 39, 59, 79, 98 and 99 before
  `$9D`. Levels 20, 40, 60, 80 and 99 had delay bases 100, 58, 1, 128
  and 128; after 99 the level read 00, with mask `$09` and threshold
  `$80`.
- **Pace and pressure:** 1,500 frames with Tex still at each difficulty
  (the pace and drain poked): 408, 610 and 1,214 main-loop passes and
  17, 31 and 86 eighths of pressure lost; `irq_frame` ran 1,500 times in
  each, the control. Running right on EASY: 349 passes, 15 points.
- **A level's length:** right held from the start of level 2 with no
  shots: `level_complete` after 5,462 frames on EASY and 1,833 on
  IMPOSSIBLE.
- **The extra life:** the score poked to 9,995 and Tex run right. At
  10,001 the lives were 4 and TYCOONS read 4.
- **Pressure out:** one eighth left and three lives. `pressure_out` ran
  once, BAD NEWS was typed out, and the menu followed with the lives
  unspent.
- **The high-score shuffle:** the top entry poked to 150,000 and the
  score to 200,000, and `$7E` poked to end the game. In name entry the
  table read 200,000, 050,000, 4,000 and on; the menu showed GREMLIN at
  50,000.
- **Jumping a break:** deaths turned off, Tex walked right to speed 1,
  2 and 3, deaths on again; at each of four breaks a jump was tried on
  every frame from 12 columns before it until he fell standing. Speed 1
  cleared none; speed 2 cleared breaks of one middle only; speed 3
  cleared one and two middles and no break of three.
- **Pressure lost to a bomb:** `lose_pressure` run from `$21B1` with A
  = 4 and then 2, at 10 cells and each part cell 0 to 7: a loss of 4
  took 1, 2, 3 and 4 eighths with 0 to 3 in the part cell and 4 above;
  a loss of 2 took 1 with 0 in it and 2 otherwise.
- **The keyboard:** K at the menu set keyboard mode and J joystick;
  RETURN started the game; X moved Tex 10 columns in 30 frames and Z 4
  in 12; RETURN fired and `;` jumped; SPACE paused (the score stood for
  100 frames), C= carried on, and ESC went back to the menu.
