# Gribbly's Day Out — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The analysed program is Hewson Consultants' cassette release of 1985, a
raw recording of the tape (`orientation.md`): a header and a two-byte
block in the Commodore ROM loader's format, then one turbo-loaded block
that fills `$0C00`-`$AFFF`. The boot code rides in the header and jumps
through the vector at `$8000` to `start_game` `$42C0`. The listing is
built from `work/play-level1.vsf` (SHA-256 `eca75ddd…9baa`), saved about
13 seconds into the first level, where every byte of the program sits at
the address it runs from.

`start_game` moves `$8000`-`$9FFF` to `$E000`-`$FFFF` and
`$A200`-`$AFFF` to `$C200`-`$CFFF`, then reuses `$8000`-`$BFFF` for the
level map. The game runs with `$01` = `$25`: RAM at `$A000`-`$BFFF` and
`$E000`-`$FFFF`, I/O at `$D000`, no BASIC or KERNAL ROM. It owns the
hardware vectors at `$FFFA`: NMI is a bare `RTI` (`nmi_rti` `$7412`), so
RESTORE does nothing; RESET restarts the game at `$42C0`.

The best-score line credits "(c) ST Software 1985" (`best_line`
`$7FCC`), and the title page credits Andrew Braybrook (`credit_lines`
`$788A`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page: sprite parameters, pointers, score, Gribbly's movement, psi, sound driver | `$02`-`$EF` |
| The pause's copy of the game clock, levels done, best score | `$0200`-`$0229` |
| The Gribblet table (8) and the creature table (16 slots) | `$0340`-`$03F7` |
| Status panel and title text screen, and its sprite pointers | `$0400`-`$07FF` |
| Play screen, 40 x 18 tiles shown, and its sprite pointers | `$0800`-`$0BFF` |
| Messages and the panel's labels | `$0D00`-`$0DE2` |
| Seon's seven sprite shapes, `$39`-`$3F` | `spr_seon` `$0E40`-`$0FFF` |
| What one sprite does to another, 8 x 8 | `collide_table` `$1000` |
| Column shapes and templates for the scenery | `$1100`-`$1C72` |
| Stray code from another program, never run | `stray_code` `$1C80`-`$1FFF` |
| The text font, upper and lower halves | `font_top` `$2000`, `font_bottom` `$2400` |
| The play tiles (multicolour characters) | `$2800`-`$2FFF` |
| Sprite shapes `$C0`-`$FF` | `$3000`-`$3FFF` |
| The hidden memory editor and the text printer | `$4000`-`$42BF` |
| Start-up, title, play loop, creatures, Gribbly, web, interrupts | `$42C0`-`$750B` |
| The sound driver | `$7554`-`$77FF` |
| Strings, bars, web triangles, level colours, movement constants, Gribbly's face | `$7800`-`$7FEF` |
| The level map, 256 columns x 64 rows, one byte a tile | `$8000`-`$BFFF` |
| The soil row under the map | `$C000`-`$C11F` |
| Scene lists of levels 7, 10, 9, 14, 0, 4, 5 and 11 | `$C200`-`$CE6F` |
| Per-level pointers: scene lists, web layouts, start columns, names | `$E010`, `$E030`, `$E050`, `$E060` |
| Level names | `$E100`-`$E2C7` |
| Web layouts, 70 bytes a level | `$E300`-`$E77F` |
| Scene lists of levels 12, 6, 8, 13, 15, 3, 1 and 2, and more shapes | `$E780`-`$F9E3` |
| Instruments, effects, note frequencies, the title tune | `$FB00`-`$FF5F` |

Map cell (column, row) is at `$8000` + 256 x row + column (`tile_at`
`$5D5E`): the row's page is `$80` + row, so a pointer's high byte is the
row.

## Timing

- PAL, 50 frames a second. In play four raster interrupts chain
  through the IRQ vector (`orientation.md`): `irq_top` `$745A` at line
  44, `irq_collide` `$74E0` at 182 (or earlier, when two sprites touch),
  `irq_blank` `$7424` at 189 and `irq_panel` `$74AF` at 197.
- `main_loop` `$48E8` makes one pass a frame and alternates its work by
  the frame counter `$2E`. Odd frames: joystick, Gribbly's movement, the
  clock, the psi bar, the game time, the score, the tape motor and the
  sound, then scrolling and redrawing the view. Even frames: the web
  power-down and the pause key, then the character and face animation,
  Gribbly's collisions, bubbles, creatures, the fire button, Gribblets'
  hops and bounces, and the Gribblet count. So everything that moves
  moves every other frame, 25 times a second, and every speed in the
  listing is per step of two frames. *Live:* in 512 frames, 512 passes,
  256 calls of `gribbly_physics` `$68F5`, `animate_chars` `$6651` and
  `move_creatures` `$584D`, and 2 of `spawn_seed_pod` `$5D8B`.
- Points reach the score one a step: 25 a second (`score_tick`
  `$6FF0`). *Live:* 100 pending points became 50 in 100 frames.
- A seed pod may appear once every 256 frames, about every 5 seconds
  (`main_loop`, `spawn_seed_pod`). At the same moment Seon's wait timer
  `$78` counts down; it starts at (28 - level) x 2 (`level_start`), so
  Seon waits 56 x 256 frames, nearly 5 minutes, on level 0, and about 10
  seconds less for each level number above it. Touching Gribbly or the
  web's power-down ends the wait at once.
- The title pages and the cut sequences run on CIA 1's timer instead,
  every 47,288 cycles, 20.8 times a second (`irq_title` `$7413`), which
  only calls the sound driver. *Live:* 208 calls in 500 frames.
- A title page is a loop of `title_frame` `$44EA` steps, each a busy
  wait of `$50` delay loops: about nine a second, not tied to the frame.
  A page lasts 256 steps. *Live:* 89 steps in 500 frames; with no input
  the Scenario page gave way to Controls after about 1,450 frames (29
  seconds) and Controls to Scenario after as many again.

## Controls

- Joystick in port 2 (`read_joystick` `$6E9C`, `$DC00`). Bouncing on
  the ground, left and right push Gribbly along and up takes off; in the
  air all four directions push him. Fire blows a bubble one frame in
  eight while held (`blow_bubble` `$6429`); a fresh press also tries a
  web control above or in his cell while flying (`press_control`
  `$6B8B`) and picks up or puts down a Gribblet while bouncing low
  (`gribblet_fire` `$6098`). Bubbles come only while Gribbly faces left
  or right.
- Function keys are read straight from the keyboard matrix
  (`read_fkeys` `$721C`), with either SHIFT making f1 f2 and so on. On
  the title: f1 sets and starts the real-time clock, f3/f4 and f5/f6
  step the hours and minutes while setting, f7/f8 choose 50 Hz or 60 Hz
  mains while setting (`clock_keys` `$70A7`); otherwise f5/f6 change the
  volume 1-15 and f7/f8 choose colour or black and white (`volume_keys`
  `$59D5`, `colour_keys` `$59AF`).
- RUN/STOP pauses (`pause` `$72E5`). In the pause CLR/HOME (matrix row
  6, column 3) abandons the game, the clock keys work, f7 freezes the
  screen with the word "Cheese" until f8 (`freeze_keys` `$73C9`), and
  RUN/STOP or fire resumes. *Live* (below).
- Holding a key on the datasette runs its motor (`tape_motor` `$73AD`).
- Joystick and fire choose the letters of a best-score signature
  (`check_best_score` `$5470`).

## Graphics

- Two screens a frame. The play view, the top 18 rows of the screen at
  `$0800`, is multicolour text with the tiles at `$2800` and the level's
  colours (`irq_top`). Below it `irq_blank` blacks out a line with an
  invalid mode (`$D011` = `$7F`, bitmap and extended colour together),
  and the status panel is hi-res text from `$0400` with the font at
  `$2000` (`irq_panel`).
- Panel text is double height: a glyph's code goes in a cell and code
  OR `$80`, its lower half, below; capitals are also two cells wide
  (`draw_glyph` `$421E`).
- The view scrolls in every direction by the hardware's fine scroll
  plus a full redraw of 40 x 18 tiles from the map on odd frames
  (`scroll_x` `$65D8`, `scroll_y` `$6605`, `draw_view` `$6702`).
  Gribbly's sprite never moves sideways: he is always at the view's
  column 19, and the world scrolls round him.
- The view has no right edge of its own. `draw_view` reads each row
  with `LDA ($1A),Y` (`$676B`), `$1A` the first column and `$1B` = `$80`
  plus the row, and Y up to 39, so a view that starts after column 216
  runs off the end of the map row into the next one: its right-hand
  columns show the left wall one row down. Levels 0 and 1 open that
  way (start columns 224 and 228). What stops Gribbly is the wall he
  sees: when he touches the background with the view's first column at
  `$EC` or more, `gribbly_collides` pushes him back (`$6CD2`). Checked in
  the snapshots taken as levels 0 and 1 began: all 120 and 180 cells of
  the play screen past column 255 equal the next row's columns 0 on.
- Gribblets sitting on ledges are tiles, not sprites (`$38`-`$3F`, with
  `$40`/`$41` for one on its back). A Gribblet becomes a hardware sprite
  only while it hops, falls or rides a Flyer, and a creature takes one of
  sprites 1-7 only while it is on or near the screen (`free_sprite`
  `$620B`, `on_screen` `$57D5`).
- Character animation every fourth frame cycles four groups of four
  characters, the web lines and controls (`animate_chars`,
  `rotate_chars` `$6632`); every eighth frame the Gribblets look about,
  the water moves, the flipped Gribblets wave their legs and the
  psi-grub pulses.
- Gribbly's face is drawn into his three sprite shapes (`animate_face`
  `$6AAD`): random head patterns every eighth frame, a blink and a look
  round every 128 frames (`eyes` `$6B36`), and a smile while points are
  being added or a frown while they are being taken off.
- Level colours come from four eight-entry tables by level & 7
  (`level_bg_colours` `$7DBF` to `level_cram` `$7DD7`); f8 on the title
  swaps them for grey shades.

## Mechanics

- **Psi and the bank.** A game starts with psi 1 and 119 in the bank
  (`new_game` `$4504`). Before every level `transfer_stage` `$5FC1`
  moves energy one unit at a time until psi is 40, from the bank or into
  it (the bank stops at 255); with both empty the game is over. Psi
  moves one unit a step towards a target (`psi_bar` `$5F02`). Hitting
  scenery or a lit web line in flight costs 4 (`gribbly_collides`
  `$6CC3`), touching Seon 3 (`sprite_collisions` `$5604`); saving a
  Gribblet gives 8 and eating a psi-grub 3 to 6 (`bounce_tiles`
  `$61A5`). Psi above 64 is capped and the excess times 8 is paid as
  points (`add_psi` `$604D`). Psi reaching 0 ends the level, which is
  then played again on the same map.
- **Scoring** (pending points `$26` to add and `$30` to take off): a
  bubbled seed pod 20, Topsy 40, chrysalis 60 (`creature_hit` `$574F`,
  type - 2 times 20); a Flyer bubbled into dropping its Gribblet 100
  (`flyer_drop` `$576F`); picking up a Gribblet 20, putting one down
  -20, saving one in the cave 100 (`gribblet_fire`); catching a falling
  one 100; one falling off the map -100 (`fall_gribblet_move` `$4F04`);
  switching a web section on 10, off -10 (`web_switch_score` `$6C92`);
  a collision in flight -5; touching Seon -10. A Stomper is turned round
  by a bubble, not killed; Seon is stopped and calmed, for no points.
- **The life cycle.** Seed pods fall from the top of the map and become
  Topsies where they land (`seed_pod_move` `$5BF8`). A Topsy walking
  onto a sitting Gribblet flips it onto its back (`topsy_move` `$5213`).
  Once every 256 frames a Topsy may become a chrysalis, and a chrysalis
  hatch into a Stomper, each with a chance of `spawn_chance` in 256
  (`chrysalis_move` `$538A`). A Stomper walking onto a flipped Gribblet
  absorbs it and becomes a Flyer (`stomper_move` `$4C8B`); a bubbled
  Flyer drops it as a falling Gribblet (type 9), which Gribbly can catch,
  and which lands safe only on two cells of empty ledge or of the cave's
  ledge (`fall_gribblet_move`). Bouncing low on a flipped Gribblet rights
  it. A Gribblet still in a Flyer when the level restarts is lost
  (`reset_gribblets` `$629B`).
- **Spawning.** `spawn_chance` `$68` = level x 2 + 20 + performance
  (`level_start` `$4573`). A seed pod is added only while there are
  fewer than level + 8 creatures and fewer than 13 slots in use
  (`spawn_seed_pod`).
- **Collisions** between sprites are latched by `irq_collide` and acted
  on through `collide_table` (`apply_collision` `$56A8`). A bubble pops
  on whatever it hits. Between creatures a Topsy destroys a seed pod and
  another Topsy, and a chrysalis is crushed by a seed pod, a Topsy, a
  chrysalis or a Stomper.
- **Levels and progress.** There are 16 levels, 0-15, each a scene
  list and a web layout. A level ends when every Gribblet is saved or
  lost (`count_gribblets` `$6241`). With fewer than six saved, the same
  level is built again; with six or more the performance `$5D` rises by
  the number saved beyond five (at most 14), the level is marked done,
  and the next is the highest undone level at or below the smaller of a
  random 0-15 and the performance, or else the first undone one from 1
  upwards (`level_result` `$64F3`). Level 0 always comes first and level
  15 last. A player who saves exactly six every time raises the
  performance by one a level and plays the levels in order, 0 to 15. With all 16 done the game adds 6,809 points and ends.
- **The web.** Five bands of 14 triangles, 16 x 12 tiles each, from map
  column 32 and row 1 (`web_band_a` `$684D`, `web_band_b` `$68A1`); each
  level's layout byte per triangle removes some of its six controls and
  switches some slopes (`web_block_a` `$6D64`). A control switches a
  slope or a base row (`web_diag_left` `$6C5B`, `web_row` `$6C85`). A lit
  line bounces Gribbly back. A line switched off is drawn with
  character codes + `$80`, whose shapes are blank, so it vanishes and
  nothing collides with it. Seon bounces off a lit line at four times the
  speed and switches a control under it with a chance of performance in
  32 (`seon_web` `$4B10`).
- **The power-down.** When 7 of the 8 Gribblets are saved, lost or
  inside a Flyer, the controls die, every web line goes off, Seon's wait
  ends (`web_power_down` `$4E6D`), and from then on his aggression rises
  by one every 256 frames, to 14. Seon steers towards Gribbly when a
  random 0-15 is below his aggression (`seon_move` `$49AF`).
- **Gribbly's movement** uses one of two sets of twelve constants,
  copied in as he takes off or lands (`draw_view`): flying, up to 9
  pixels a step sideways, 4 up and 6 down (`flight_consts` `$7DDF`);
  bouncing, 4 sideways and no vertical push (`bounce_consts` `$7F33`).
  In flight a pull of $FFD0 (-48/256 of a pixel a step) is added to
  the vertical speed every step (`gribbly_physics` `$68F5`). Each
  landing from a bounce sets the next bounce's speed to four times the
  sideways speed.

## Data tables

- Scene lists (`build_level` `$5DCB`): a ground part of words naming
  column shapes, each column drawn upwards from the bottom row, then a
  template list of floating scenery, records of (column, row, template
  address) ended by a zero address (`draw_templates` `$5E77`). The
  ground runs from map column 32 to 255. Every tile drawn goes through
  `note_tile` `$5ED2`, which records the Gribblets and turns an empty
  ledge cell into a psi-grub with a chance of 6 in 256.
- The left wall, columns 0-31, gets 96 random rock shapes per level
  (`scatter_rocks` `$4BFD`).
- Level names by level from `level_names` `$E060`; starting view
  columns from `start_cols` `$E050`.
- Level 4's name (`$E198`) is "Wot, no ground?" with a Chad at each
  end: the British wartime doodle of a face peering over a wall, whose
  caption is always "Wot, no ...?". Chad is two characters of the panel
  font, `$7E` and `$7F`, with `$FE` and `$FF` below them as for every
  double-height glyph. (Identified by Aaron Bell from the drawing.)
- `collide_table` `$1000`: row = type of the sprite affected - 2,
  column = type of the other - 2; bit 7 kill, 6 reverse, 5 stun Seon, 4
  the Topsy rule, 3 drop a Gribblet.

## Sound

- One driver (`sound` `$7554`) with three modes in `$9D`: silence, the
  title tune, sound effects. The tune plays only on the title pages,
  from the CIA interrupt; play uses effects only, called every other
  frame.
- The tune (`music_step` `$75AE`) is three note lists of one byte a step
  at `$FE00`, `$FE80` and `$FF00`, a step every fourth call: about 5.2
  steps a second. Voice 1's list loops after 95 steps, about 18
  seconds. Voices 1-3 play instruments 1-3 (sawtooth, triangle, pulse),
  and voice 3, the bass, runs through the low-pass filter (`$D417` =
  `$24`, cutoff register 0). The volume key sets the tune's volume only:
  setting up effects writes `$D418` = `$8F`, full volume.
- The note table (`note_freqs` `$FD00`) is tuned for an NTSC clock: C4
  is $10C3, middle C on NTSC and 252 Hz on PAL, so on a PAL machine
  the tune plays about 65 cents flat.
- Effects use voices 1 and 2 only (`effects_step` `$75F2`): 24 records
  of 16 bytes at `$FB80`, each a frequency sweep with a step counter, a
  repeat count, a pulse-width sweep and an optional effect to chain to.
  Voice 3 runs noise at the top frequency with its output cut, and the
  game reads its oscillator, `$D41B`, as its random numbers.
- Saving a Gribblet plays effect `$94`. The inlay's "the music will play
  if you have found a safe ledge" is that effect; no tune plays in play.

## The listing's comments

A sample of the listing's comments, checked against the bytes by an
agent (on `claude-opus-5-5[1m]`) that wrote none of them. Seed 60, 80
comments in two strata: 60 of the 495 written by hand and 20 of the 55
written by script (each level's scene list, name and web layout, and the
shape stretches). 5 were wrong, 6.2 % (Wilson 95 % interval 2.7-13.8 %),
all by hand: 5 of 60 (8.3 %, Wilson 3.6-18.1 %), 0 of 20 by script
(0-16.1 %), so 7.5 % weighted by the strata's sizes. The checker re-ran
the level builder in Python on all 16 levels to test the scripted ones.
The wrong ones: the web power-down works one row a call, every other row,
not two; Seon switches only a live control in the first of the two cells
under him; a cut sequence's `wait_frame` lasts two frames on even steps;
an effect's mode 1 jumps to a separate reset frequency; and
`start_effect` takes the voice in A. All five were rewritten. Separately,
before the sample was checked, every comment that gave a rate per frame
was checked against `main_loop`'s alternation (*live*, Timing): the
creatures, Gribbly's speeds and the hop timer move every other frame, a
bubble comes one frame in eight, and the title's "frames" are steps of
about a ninth of a second. 27 comments were rewritten for that.

## Live tests

All on VICE vice-mcp v3.13.2, PAL, 9 October 2026, from the snapshots in
`work/`, with a breakpoint on a routine that certainly runs (an
interrupt handler) as the control in every count.

- **Pause and abandon** (`work/py/live_pause.py`): RUN/STOP, then 200
  frames: `pause` entered once, its loop `$7322` 195 times, the message
  field reading "Pause"; CLR/HOME, then 70 frames: `$7368` and `title`
  `$43A7` once each, sound mode back to the tune.
- **Score rate** (`work/py/live_score.py`): 100 pending points, 100
  frames, `irq_panel` 100 hits: `score_tick` 50 calls, the score 50.
- **The play loop** (`work/py/live_loop.py`): the counts under Timing,
  on level 0's and level 12's snapshots alike.
- **Every level builds** (`work/py/live_levels.py`): level 0-15 forced
  into `$3C` after `level_result` and built by the game's own
  `level_start`; each reached `main_loop` with 8 Gribblets in the table.
- **Title timing** (`work/py/live_title.py`, `work/py/live_pages.py`):
  the counts under Timing.
- **Title keys**: f1, f3-f8 on the title pages printed "Set clock",
  stepped the hours and minutes, "50 Hertz", "Started", "Volume nn",
  "Colour" and "Blk~Whte".

## The pages' ports

Both run the game's own routine in `kit/c64/cpu6502.js` on the bytes of
`listing.json` beside the port taken from `index.html`, and run in the
kit's tests.

- **The sound driver** (`test_sound.js`): the title tune through two
  passes, every effect on both voices with and without bit 7, and 300
  runs of random requests: 38,796 calls, the same 300,119 SID writes in
  the same order and the same zero-page state after each.
- **The next level** (`test_level.js`): `level_result` `$64F3` over
  every performance, saved count and every seventh random byte, from
  three levels, on 45 sets of levels done: 674,325 cases, all the same.
