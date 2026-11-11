# Fist II: The Legend Continues — Training: verified technical facts

Current truth for the Training program, the disk's second load. The
workflow lives in `kit/skills/`; how this understanding developed lives in
the game's `agent-history.md`. Every fact names the routine or table it
comes from, and every address is this part's. Unless marked *live*, a fact
comes from reading the code in `work/entry.vsf`, the moment the loader
hands over.

## Build

Training is a load of its own, chosen with `1` at the disk's menu. The
loader `LOADIT` (`$C000`-`$C27F`) blanks the screen (`$C20D` clears bit 4
of `$D011`), sets a cyan border and reads six files through the KERNAL;
a failed load turns the border red. In this order it loads `TNK4B` at
`$1000` and, with every ROM and the I/O switched out, copies it to
`$D000`-`$FFEF` (`$2FF0` bytes, leaving the file's last nine behind); `TNK4A` at `$C280`-`$CFFF`, over its own end; `TNK3` at
`$1000`, copied to `$8000`-`$BFFF`; `TNK12A` at `$0400`-`$5BFF`; `TOLOR`
at `$6000`, its 1,024 bytes copied into colour RAM; and `TNK2B` at
`$5C00`-`$7FFF`, over it. It turns the screen back on and jumps to
`loader_jump` (`$C3FD`), which jumps to `training_entry` (`$115A`) and on
to `start` (`$1D8A`). `$C21F`-`$C27B` of the loader is a second copy of
its own last steps that nothing runs. `TOLOR`'s colours are light blue,
with green in places in rows 17-24, and Training writes every colour RAM
cell again: the status rows at start-up (`status_colours`), the band and
the floor with each location (`unpack_colours`, `fill_floor_colour`).

The hand-over also holds location 1's picture in the band (`$E640`-`$F53F`)
and its colours in the screen (`$CCC8`-`$CEA7`), byte for byte as
`unpack_picture` and `unpack_colours` make them (checked in
`kit/cpu/cpu6502.js`), and `init_training` (`$1B2D`) marks location 1 as
the one shown (`location` `$D2`). Every game and the demonstration start
at location 0, so it is unpacked over before play.

None of the six game files matches its Adventure counterpart: `TNK12A`,
`TNK2B`, `TNK3`, `TNK4A`, `TNK4B` and `TOLOR` differ from `BNK12A`,
`BNK2B`, `BNK3`, `BNK4A`, `BNK4B` and `COLOR` in 99 %, 99 %, 88 %, 75 %,
97 % and 88 % of their bytes. Much of the code, the music driver and the
fighter engine among it, is the Adventure's at other addresses (the game's `facts.md`).

## Memory layout

| Thing | Where |
|---|---|
| Sample periods, copied from `$C700`/`$C800` | `$0200`-`$03FF` |
| The tunes' patterns | `$0400`-`$09A4` |
| Music driver | `music_update` `$09A5`-`$0F51` |
| Tune tables, sequences, 25 instruments | `$0F52`-`$1159` |
| Entry, variables, move tables, scores and texts | `$115A`-`$12FF` |
| Fighter engine: scripts, sprite positions, pose building, mirroring | `$1300`-`$19FF` |
| Pictures, start-up, game flow, scores, clock, ranks | `$1A00`-`$252D` |
| Computer opponent, controls, moves, hits | `$252E`-`$3033` |
| Raster interrupts, sprite multiplexer, NMI, sample player | `$3034`-`$3BF3` |
| The four locations' packed pictures and colours | `$3CE2`-`$74FF` |
| Strike tables, 22 of 59 bytes | `$7500`-`$7A11` |
| Move scripts (`anim_script_ptrs` `$7A20`) | `$7A20`-`$7C13` |
| Mirror table, sprite images' low bytes | `$7E00`, `$7F00` |
| 256 packed body sprite images | `$8000`-`$B40D` |
| Five sets of seven heads | `$B700`-`$BFBF` |
| Sprite buffers, built at run time | `$C000`-`$CBFF`, around `$C3FD`, `$C700`-`$C8FF`, `$CA40`-`$CBFF` |
| Screen: status rows, the band's colours, sprite pointers | `$CC00`-`$CFFF` |
| Sprite images for the video chip, under the I/O area | `$D000`-`$DFFF` |
| Status font, 96 characters | `$E000`-`$E2FF` |
| Pose tables: nine images for each of 60 poses | `$E300`-`$E51B` |
| Picture band, unpacked at run time | `$E640`-`$F53F` |
| Sample table and samples | `$F540`-`$FFDC` |

## Timing

- `$01` = `$05`: I/O in, RAM under both ROMs (`setup_vectors` `$1B88`).
  The vectors are the game's own: IRQ `$FFFE` = `irq_top` `$34CF`, NMI
  `$FFFA` = `nmi` `$32C4`, reset `$1BD5` (an `RTI`).
- A frame is a chain of raster interrupts: `irq_top` at line 0, `irq_band`
  at `$59`/`$5A` (the top of the picture band), the row handlers
  `$3034`-`$327C` that move the fighters' sprites down, one of the four
  last-split handlers `$32DC`-`$33A2`, and `irq_bottom` at line `$FF`.
  `irq_band` starts CIA 2's timer B for 5,820 cycles, about 92 lines;
  its NMI sets the background to the floor colour where the floor
  begins. RESTORE reaches the same NMI and flips `pause_flag` (`$1166`).
- `irq_top` clears `step_flag` (`$115F`) and `play_bout` (`$1D0B`) waits
  for it, so a bout takes at most one step a frame. The clock
  (`clock_tick` `$236A`) counts 50 steps to a second, 60 seconds a bout,
  and waits while either fighter is reacting to a hit and until fighter
  0's opening bow (move `$17`) is over (`$1D56`).
- The music driver runs once a frame from `irq_bottom` (`$33EE`).
- Every raster handler first tests CIA 1 and hands its interrupt to the
  sample player (`irq_sample_tick` `$33F7`).

## Controls

- Joystick: fighter 0 port 2 (`$DC00`), fighter 1 port 1 (`$DC01`)
  (`read_joystick` `$2AB8`). For a fighter facing left, left and right
  are swapped, so `joy_moves` (`$2AD8`) always reads right as forwards.
- Keyboard (F7, `read_keyboard` `$2AF8`): fighter 0 `Q` `W` `E`, `A` `D`,
  `Z` `X` `C` for the eight directions and `S` or the left SHIFT for fire;
  fighter 1 `P` `@` `*`, `L` `;`, `,` `.` `/` and `:` or the right SHIFT.
- `read_function_keys` (`$20F4`): F1 or fire on port 2 starts a game, F3
  switches one and two players, F7 joystick and keyboard, DEL samples on
  and off (`samples_off` `$EE`), each only at the title; F5 at any time
  goes back to the title.
- Pulling back as an attack comes within reach blocks by itself
  (`auto_block` `$2D63`); down and forwards from the stance becomes move
  `$18` unless the fighter is ducking (`$2DA9`).

## Graphics

- Status rows 0-4 are text in the status font (`$E000`), the picture band
  rows 5-16 a multicolour bitmap, and rows 17-24 the floor, one colour.
  Bank 3: screen `$CC00`, bitmap `$E000` (`setup_vic` `$1BD6`).
- Pictures: `unpack_picture` (`$1A00`) reads a location's data backwards
  from its end, `n` below `$80` copying `n` bytes and `$80 + n` repeating
  one; `unpack_colours` (`$1A8E`) unpacks a stream of four-bit values in
  three passes into colour RAM and the two halves of the screen's colour
  bytes. Location colours (`loc_band_bg` `$21FF`, `loc_border` `$2203`,
  `loc_floor` `$2207`, `loc_status_bg` `$220B`): band light grey, green,
  blue, blue; border blue, brown, red, black; floor yellow, blue, brown,
  blue; status rows light blue, light blue, blue, black.
- A fighter is a head sprite and nine body sprites in three rows of three.
  The fighter in front, the one attacking (`fighter_step` `$2A67`, while
  sprites 0-2 touch nothing in `$D01E`), takes sprites 0-3, the other 4-7;
  raster handlers move each trio down to its second and third rows. The
  layout routines (`choose_layout` `$35B0`) pick one of seven arrangements
  by the gap between the fighters' heights, and fill the handlers'
  operands each frame.
- Poses: 60 (`$00`-`$3B`). The pose tables at `$E300` give each of the
  nine parts a packed image (0 for none). Images are zero-run packed (`$00
  n` writes `n` zeros) and start at `$8000` + `sprite_frame_hi`[*i*] × 256 +
  `sprite_frame_lo`[*i*] (`$CB00`, `$7F00`). A fighter facing left is built
  by `decode_part_mirrored` (`$1866`), which reverses each row's bytes and
  passes each through `mirror_table` (`$7E00`).
- Heads: five sets of seven images, one set per fighter type
  (`type_heads_lo` `$1CEF`), placed by `head_x`, `head_y` and `head_flags`
  (`$CA40`, `$CA7C`, `$CAB8`), mirrored or turned upside down by the flags.
  Head colours by type: white, red, dark grey, green, white; body
  colours red, brown, dark grey, red, brown (`$1CEA`, `$1CF9`).
- Extra sprites: some poses show three more sprites in a row below the
  fighter (`irq_extras_a` `$32DC` and the rest). Their images, pointers
  `$52`-`$70`, lie at `$D480`-`$DC3F` in the RAM under the I/O area, where
  only the video chip reads them.

## Mechanics

- Modes (`title_loop` `$2171`): the demonstration (`demo` `$1F5D`), one
  player against the computer, and two players.
- Two players (`two_player_game` `$1DA6`): four rounds, one in each
  location, each the whole 60 seconds. When a fighter falls, the other
  scores the last hit's points a second time (`two_player_bout` `$1E18`)
  and both start again at full energy. The higher score wins.
- One player (`one_player_game` `$1E45`): each opponent must be beaten
  twice (`wins_needed` `$D1`); then the rank goes up a dan, the
  computer's level (`$D0`) rises by one and the next location comes. The
  ranks run NOVICE, 1ST to 10TH DAN (`show_rank` `$2436`). Past 10TH DAN
  the game is endless, each opponent at a random level from 7 to 10
  (`one_player_endless` `$1EFE`). A loss ends the game.
- When the clock runs out the fighter with more energy wins; equal energy
  means the bout is fought again (`one_player_bout` `$1F21`). Winning
  before the clock runs out adds 100 for each second left (`time_bonus`
  `$241A`).
- Energy: 127 at each bout's start (`init_fighter_side` `$1CCE`). A hit
  lands when the attack shows its strike pose (`move_strike_pose`
  `$120E`) and the other fighter stands at the strike table's reach or
  within `full_hit_margin` short of it (a full point) or `half_hit_margin`
  (a half point) (`hit_test` `$2E13`). A full point takes twice the
  move's `move_damage` (`$12DF`), a half point once.
- Score: a full point adds `move_points` (`$1297`) hundreds, a half point
  half that (`add_score` `$22A7`). Past 999,900 the score becomes 000000
  (`add_hundred` `$22D0`). The computer's score is hidden in a
  one-player game.
- The computer (`ai_move` `$252E`): twelve levels (0-11) set the masks
  that time its waits, walks, holds and answers (`ai_set_level` `$27F2`,
  tables `$2A08`-`$2A5B`). It walks until close, turns when its opponent
  is behind, and chooses an attack from the distance (`ai_dist_face`
  `$2934`, `ai_dist_back` `$2984`), or one of nine plans (`ai_plans`
  `$29D3`). Levels 7 and up walk forwards where the table says flying
  kick (`ai_flying_kick` `$2780`); levels 0 and 1 make no new choice when
  the table says sweep (`ai_sweep_choice` `$278A`).
- The demonstration pits two computer fighters at random levels from 3 to
  11 (`demo` `$1F5D`).

## Data tables

- Move tables, one byte for each move 0-`$18`: `move_let_go` `$1167`,
  `move_is_attack` `$1180`, `move_block` `$1199`, `move_strikes_back`
  `$11B2`, `full_hit_margin` `$11C7`, `half_hit_margin` `$11E0`,
  `move_strike_pose` `$120E`, `move_points` `$1297`, `ai_low_swap`
  `$12C2`, `move_damage` `$12DF`.
- Strike tables `$7500`-`$7A11`: 22 of 59 bytes, one byte per pose, `$80`
  where the pose does not strike, otherwise its reach; `strike_table_a`
  (`$1227`) when the fighters face each other, `strike_table_b` (`$1259`)
  when they face the same way.
- Move scripts: `anim_script_ptrs` (`$7A20`) points at each move's list of
  four-byte steps (time, pose, X step, height step); the next entry's
  address gives the length.

## Sound

- Music: the Adventure's three-voice driver (`music_update` `$09A5`).
  Four tunes: 1 the demonstration, 2 a one-player game, 3 a two-player
  game, chosen by `tune` (`$FF`). Nothing sets 4, so tune 4 is never
  played (its patterns at `$08D6`, its sequences at `$1055`).
- Samples: `start_sample` (`$3463`) plays one of four, unless DEL has
  turned them off. CIA 1's timer B (`irq_sample_tick` `$33F7`) flips the
  SID's volume between `$0F` and 0, each sample byte choosing the time to
  the next flip through the period tables at `$0200`/`$0300`. Sample 0
  (`$F580`) plays with the hits that end in fall `$16`, sample 1 (`$F663`)
  with those that end in `$1A` or `$1B`, sample 2 (`$F979`) as an attack
  starts and sample 3 (`$FED3`) as a falling fighter shows pose `$2C` or
  `$28`.
- The samples lie in bitmap rows 17-24 (`$F540`-`$FFDC`), under the floor,
  which is one colour in all four halves of its colour bytes, so they are
  never seen.

## Unused and leftover

- `$FCD3`-`$FED2`: 512 bytes in the samples' form between samples 2 and
  3 that no table entry points to: a fifth sound Training never plays.
- The entry points for samples 4-7 (`$344D`-`$3462`) are never called.
- The scoring of The Way of the Exploding Fist: `$1FEF`-`$2097` adds a
  hit's half or whole point to a tally and draws round point symbols;
  `$23A4` adds to another tally. Nothing calls either. Training still
  colours the symbols' cells (`setup_vic`, `$1C34`-`$1C63`) and clears
  them before each bout (`clear_points` `$2098`).
- Sprite images: 26 of the 256 packed images belong to no pose (0, 1, 6,
  16, 27, 32, 38, 53, 69, 88, 113, 118, 119, 129, 139, 140, 145, 167, 171,
  178, 201, 215, 239, 244, 252, 253), and under the I/O area 18 images at
  `$D000`-`$D47F`, the one at `$D700` and 15 at `$DC40`-`$DFFF` are shown
  by no pose.
- `$7C14`-`$7DFF`: script steps for poses `$40`-`$4C`, which Training does
  not have; the script of move `$1C` (`$7A20` table) is never started.
- `bit_masks` (`$12F8`): the complement for sprite 5, `$1305`, is `$DD`
  where `$DF` belongs, so it would clear sprite 1's ninth X bit too. Only
  sprites 0 and 4 use the table.
- `ai_set_level` (`$27F2`) stores most of a level's masks without X, so in
  the demonstration both computer fighters play with the masks of
  whichever was set last. Plan 8 (`plan_either` `$289D`) stores 5 into
  fighter 0's plan whichever fighter runs it.
- `$3B8B` and `$3BD1`: two fill routines nothing calls, each filling the
  wrong handler's rows.
- `script_end_patch` (`$7C02`): the script's end, reached by a `JMP` that
  replaced its first three bytes at `$13BF`; it stores the script position
  it already holds, then does what the code left at `$13C2`-`$13CD` did.

## Strings

`JOYSTICK`, `KEYBOARD`, `NOVICE `, `10TH DAN` (`$24DF`), `1 PLAYER`,
`2 PLAYER` (`$12B0`), the high scores (`$128B`, `$1291`) and `DEMO`
(`show_demo` `$23EE`, written character by character). No build
identifier or credit.

## Hardware register census

`kit/cpu/census.py`, 261 instructions naming 68 registers.

| Register | What the game does with it | Where |
|---|---|---|
| `$01` | `$05`: I/O in, RAM under the ROMs | `setup_vectors` `$1B8B` |
| `$D000`-`$D00F` | sprite positions; sprite 4's are set through an index from sprite 0's | `place_sprites`, `place_head_a`/`_b`, the row handlers |
| `$D010` | ninth X bits | `place_sprites`, `msb_bits_a`/`_b` |
| `$D011`, `$D016`, `$D018` | bitmap for the band, text for the status rows | `setup_vic`, `irq_band`, `irq_bottom` |
| `$D012`, `$D019`, `$D01A` | the raster chain; `$D012` also read to wait for line `$FE` | every handler, `wait_frames` `$2403`, `winner_bows` |
| `$D015`, `$D01B`, `$D01C` | all sprites on, in front, multicolour | `setup_vic` |
| `$D01E` | sprite collisions: the front fighter changes only while sprites 0-2 touch nothing | `fighter_step` `$2A79` |
| `$D020`, `$D021` | the border per location; the background changed for the band, the floor and the status rows | `setup_vic`, `load_location` `$21EF`, `irq_band`, `nmi`, `irq_bottom` |
| `$D022`, `$D023`, `$D025`-`$D02E` | the status rows' multicolours; sprite multicolours and colours | `setup_vic`, `place_sprites`, `place_head_a`/`_b` |
| `$D400`-`$D406`, `$D415`-`$D418` | voices (indexed), filter, volume; `$D418` also the sample player's flips | music driver, `irq_sample_tick` |
| `$D41B`, `$D41C` | voice 3's oscillator and envelope, modulation sources | `music_ramps` `$0DFC` |
| `$DC00`-`$DC03` | joysticks and the keyboard | `read_joystick`, `read_keyboard`, `read_function_keys` |
| `$DC04`-`$DC07`, `$DC0D`-`$DC0F` | timer A counts cycles, timer B its underflows, for the samples | `start_sample` `$3463`, `irq_sample_tick` |
| `$DD00` | video bank 3 | `setup_vic` |
| `$DD06`, `$DD07`, `$DD0D`, `$DD0F` | timer B for the floor's colour split, the NMI source | `setup_vectors`, `irq_band` `$32B3`, `nmi` |

Named by no instruction: the light pen, sprite expansion, sprite to
background collisions, `$D024`, SID voices 2 and 3 (reached through the
driver's index), the paddles, the CIAs' clocks and serial ports, CIA 2's
port B, timer A and control A.

## The listing's error rate

On 11 November 2026, 80 of the listing's 1,293 comments were drawn with
seed 20261111 (`kit/scripts/sample.py draw`): 20 from the 451 a script
wrote from templates (sprite images, move scripts and strike tables,
operands, colour RAM cells) and 60 from the 842 written one by one. A
checker that wrote none of them, `claude-opus-5-5`, marked each against
the code and the simulator. 8 were wrong: 10 %, with a 95 % interval of
5.2 % to 18.5 %, or 8.7 % weighted by the strata's sizes. All 8 were
among the 60 written one by one, so the sample is over the mark of 2 in
60. They were: the RTI that ends `irq_bottom` every frame (`$33F6`),
called unreachable; the first two head sets' labels swapped (`$B700` is
type 1's, `$B8C0` type 0's); the two tables of a head image's offset
(`$14BD`, `$14CA`) described as its low byte and page, when they are
added to the set's address; the click volume `$4D` described as the next
value instead of the last; the range of `$7D`, which also takes the falls
`$1A` and `$1B`; a computer's walk whose random count comes out 0, which
lasts 256 steps; and `move_state` letting a low attack through from a
walk, when it is ignored. All 8 were corrected, with one more comment
that said the same as the first: the RTI that ends `irq_band` (`$32C3`).
Both RTI comments were carried from the Adventure, where each RTI
follows a jump. A ninth finding did not hold: the operand at `$327C` has
a second writer only in code nothing calls. A checker misses some wrong
comments, so the rate is a lower bound; an audit of every comment is
recommended (`TODO.md`).

## Live tests

- *live* (vice-mcp v3.14.0): from the disk's menu (`work/menu.vsf`), `1` loads
  Training and the loader stops at `$C3FD` (`work/entry.vsf`). In a
  one-player bout at the temple (`work/play.vsf`: mode 0, tune 2) the
  floor is one colour, yellow, with no trace of the samples in it.
