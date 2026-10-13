# Clowns — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the cartridge image named in `orientation.md`.

## Build

An 8 KB Ultimax cartridge (`Clowns.crt`, hardware type 0, EXROM 1, GAME 0),
one ROM at `$E000`-`$FFFF`, SHA-1 of the ROM
`ffebfc19263dc50d3a808135dbe88567617af6b8`. The title screen says
©1982 Bally/Midway and ©1982 Commodore.

The program is two halves:

- `$E000`-`$EFFF`: a program compiled from a high-level language, with its
  runtime library. Every procedure opens a frame on a software stack with
  `JSR proc_enter` (`$E00C`) and closes it with `JMP proc_leave` (`$E020`);
  the stack pointer is `$02/$03` and starts at `$0200`, so the main
  program's own frame, `$0200`-`$0243`, holds every global variable. Truth
  values are `$00` and `$FF`, built by the same compare-and-branch pattern
  each time. Strings are printed by `JSR print_inline` (`$E0F5`) with the
  text after the call. Which language and compiler made it is unknown.
- `$F000`-`$FFFF`: hand-written machine code, graphics and tables. The
  compiled program reaches the machine code only through `call_ml`
  (`$EB01`), which looks routine n up in `ml_table` (`$F000`, 25 entries)
  and calls it with A, X and Y from its arguments; results come back in
  `$20`-`$25`, read with `peek` (`$EF3E`).

Parts of the language's runtime are linked in and never called:
`print_byte` (`$E0BF`), `print_newlines` (`$E11D`), the 16-bit
`mul16`/`div16` (`$E19A`-`$E22D`), the division-by-zero error
(`div_by_zero`, `$E0AD`, which ends in `JMP $7000`), and output device 0
(`device0_chrout`, `$E183`), a `JMP $FFD2` meant for a KERNAL's CHROUT that
on this cartridge lands in a table (`pow10_ten`). The code map recorded in
play (`codemap.json`) runs none of them.

Two places look patched after compilation: `read_paddle_seesaw` calls
`smooth_paddle` followed by four `NOP`s (`$F19D`-`$F1A3`), and the
instruction after the copyright string is a one-byte `TAY` (`$ED4A`) where
every other call is set up with `LDY #`. Neither changes what the game does.

Run on the kit's C64 (`kit/c64/machine.js`) for 30,000 frames from power-on, through the
title's demonstration, the menu and a game, once with `$0800`-`$DFFF` filled with `$00` and once
with `$FF`: neither fill changed, and `$0000`-`$07FF` ended the same in both. The game uses no RAM
above `$07FF`, the 2 KB the MAX Machine has (C64-Wiki, "Commodore MAX Machine", read 12 October
2026).

## Memory layout

| Thing | Where |
|---|---|
| Compiled main program and runtime | `$E000`-`$EFFF` |
| Machine-code routine table | `ml_table`, `$F000`-`$F031` |
| Machine-code library | `$F032`-`$F7FF` |
| Character set (the video chip's `$3800`) | `font`, `$F800`-`$FAFF`, characters 0-95 |
| Balloon glyphs, eight pre-shifted copies | `balloon_glyphs`, `$FB00`-`$FBBF`, characters 96-119 |
| See-saw sprite shapes (pointers `$EF`-`$F2`) | `seesaw_sprites`, `$FBC0`-`$FCBE` |
| Clown frames, 11 x 32 bytes | `clown_shapes`, `$FCBF`-`$FE1E` |
| Tables, text, tunes | `$FE1F`-`$FFDA` |
| CPU vectors | `$FFFA`-`$FFFF` |
| Zero page work bytes, balloon state, collision mask | `$02`-`$FF` |
| Global variables (main program's frame) | `$0200`-`$0243` |
| Software stack (procedure frames) | from `$0246` |
| Flying clown's sprite shape (pointer `$0F`) | `$03C0`-`$03FF` |
| Screen | `$0400`-`$07E7`; colour memory `$D800` |

In the Ultimax configuration the video chip sees the cartridge's top 4 KB
at `$3000`-`$3FFF` of its bank. The game sets `$D018` = `$1E` (screen
`$0400`, characters `$3800`) and uses sprite pointers `$EF`-`$F2`
(`$3BC0`-`$3CBF`), so its font and the see-saw's shapes are read straight
from the ROM at `$F800` and `$FBC0`. *Live*: the title shows `©1982` where
the string holds `(1982`; the ringed C exists only as character 40 of
`font` (`$F940`).

No instruction reads or writes `$0800`-`$CFFF` except the operands of five
`BIT` instructions used to skip a byte (`$F1A6`, `$F258`, `$F3E9`, `$F61B`,
`$F674`) and the unreachable `JMP $7000` (`$E0BC`, `$E441`).

## Timing

- There are no interrupts. The IRQ and NMI vectors point at a lone `RTI`
  (`irq_nmi`, `$F765`); the only `SEI` is the cold start's and there is no
  `CLI` anywhere. Nothing reads the raster register `$D012`: the game never
  waits for the video frame.
- The clock is CIA 1's timer A, loaded with `$2710` (10,000 cycles) and set
  to run once (`cold_start`); `wait_tick` (`$F711`) waits for it to run out
  and starts it again. Every loop of the game waits there once a pass.
- *Live*, PAL: 950 timer restarts in 500 frames, 1.90 a frame, about 95
  ticks a second. 10,000 cycles alone would be 98.5 a second; the
  difference is passes whose work takes longer than the timer.
- The balloons move one pixel every third tick (`scroll_balloons`, divider
  `$41`). The tumbling clown changes frame every eleventh tick
  (`move_clown_sprite`). The platform run is 13 steps of 10 ticks
  (`platform_run`). The fall animation lasts 48 ticks (`fall_animation`),
  the pause after "GAME OVER" 255 ticks, about 2.7 seconds (`delay`). While a tune plays the
  game stands still (`play_tune` waits for it).

## Controls

- Paddles in control port 1. Player 1 turns the first paddle (`$D419`),
  player 2 the second (`$D41A`): `read_paddle_seesaw` reads `$D419,Y` with
  Y = the player. *Live*: values 0, 100 and 200 at the read put the
  see-saw's sprites at x = 41, 146 and 271.
- The see-saw's x is 1.25 x (200 - paddle reading), at least 0, smoothed
  as (new + 3 x old) / 4 (`smooth_paddle`) and at least 17.
- F1 or the first paddle's button: start, and one player. F3 or the second
  paddle's button: two players (`read_keys`, code 1 or 3). *Live*: button A
  on the title brought up the menu; button B there started a two-player
  game.
- The joystick does nothing (*live*: held left on either port, nothing
  moved).

## Graphics

- Text mode, black background, cyan border (`vic_init`). Walls, ceiling,
  platforms and balloons are characters; the clowns and the see-saw are
  sprites 0, 1 and 2, all white, behind the characters (`$D01B` = `$FF`).
- The status line uses reversed glyphs (characters 64-84, `font_status`):
  dark letters cut out of cyan cells.
- Balloons: 36 columns (2-37) of screen rows 3, 5 and 7, twelve balloons
  of three characters each per row, blue, green and yellow. The top and
  bottom rows move right, the middle row left, one pixel at a time: the
  row's fine position 0-7 picks one of the eight copies in
  `balloon_glyphs`, and the start column moves a cell when it wraps
  (`scroll_balloons`).
- The flying clown is sprite 0, built at `$03C0` from 16 x 16 frames
  (`draw_clown`). Frames 0-3 flail while it flies, 4 is the landing pose
  (shown when falling below y 150), 5 and 6 are the crumple and the clown
  lying flat after a fall, 7-10 run right and left along a platform.
- The see-saw is sprites 1 and 2, 24 pixels apart, at y 234 (sprite
  coordinates): shapes `$EF`/`$F0` with the left end down and a clown
  standing on it, `$F1`/`$F2` mirrored.

## Mechanics

- **Collision is pixel-exact against characters.** `draw_clown` keeps the
  clown's shape in a mask shifted to the character grid and ANDs it with the
  glyph of each of the nine cells under the clown (`probe_offsets`); a
  shared pixel reports the cell's character code. `move_clown_sprite`
  returns the highest code below `$5A`, or `$60` for a balloon, and pops
  every balloon touched. The sprite collision registers are read only once,
  at power-on, to clear them.
- **Physics** (`move_clown`, one tick): x is 24 bits (`$0200`-`$0202`), y
  16 bits (`$0203/$0204`), speeds in 256ths of a pixel a tick; gravity is
  added to the speed down every tick: 3, 11 or 27 256ths at speed levels
  0, 1 and 2 (`level_gravity`).
- **Walls, ceiling, platforms** (`collide`): the left and right walls
  (characters 85, 86) reverse the speed across when the clown moves into
  them; the ceiling (87) reverses the speed up; a platform's top (89) while
  falling gives a small bounce, speed -1 + (100 + random(50))/256.
- **The see-saw.** A clown falling at y 176 or lower lands if its x is in
  the 24 pixels at the raised end; otherwise it is down once past y 184
  (`move_clown`, `launch`, `check_fallen`). The landing point picks zone
  0-3 (6 pixels each), and the zone the other clown's launch: across 2.5,
  1.5, 1.75 or -2 pixels a tick plus 1 to 45 256ths, up 6, 6.375, 6.16 or
  5.5 plus a term that grows with the balloons popped and bounces made at
  this speed level; halved twice at level 0 and once at level 1; never
  faster up than 6 pixels a tick. The see-saw tilts the other way after
  every bounce, and the bounce scores 10.
- **Speed-ups** (`new_jump`, `pop_balloons`): every jump starts at speed
  level 0. The level moves on when a pop takes the count of balloons still
  to go below zero: from 0 to 1 on the first, second or third balloon (the
  count starts at 3 less random 1-3), from 1 to 2 after 9 or 10 more, and
  from 2 back to 1 after 49 or 50 more (`next_level` is 1, 2, 1), so a long
  jump alternates between levels 1 and 2. Pops count only once the clown
  has bounced on the see-saw since the last change.
- **Popping.** An odd number of balloons popped in one tick reverses both
  speeds; an even number lets the clown pass through. A tick with pops also
  nudges the speed across by random(90) - 45 256ths, -44 to +45 (`random`
  returns 1 to n).
- **Rows.** A row emptied by a pop refills at once (`refill_row`) and
  gives its bonus: 1000 for blue, 500 for green, 200 for yellow
  (`row_bonus`, held in tens); a rising clown's upward speed is cut
  (`pop_balloons`). Emptying the top row also gives the bonus jumper when
  the player has none: the bonus flag (`$023F/$0240`) is cleared, the next
  fall costs no jump, and the next jump is announced "BONUS PLAY". *Live*.
- **Jumps.** Five each at the start (`new_game`); a fall costs one unless
  the bonus flag says it is free (`fly`), and after a free fall the same
  player goes again. The game ends when both players have none (`main`).
  *Live*.
- **Starting a jump** (`new_jump`): one of the four platforms at random
  (left or right, upper or lower), a run of 13 pixels towards the middle
  (`platform_run`) and a leap at 60/256 of a pixel a tick across and down.
- **Score** (`add_score`): 16 bits per player, in tens of points; the
  status line prints it with a constant 0 after it (`print_digits`). A
  balloon is 100, 50 or 20 (`balloon_row_points`), a bounce 10. The high
  score is kept from power-on, replaced only by a greater score
  (`main_high_score`), and shown on the title and after each fall in a
  game.
- **Attract mode** (`title_screen`, `attract_loop`): the same game with
  the sound off and the see-saw driven by the program, moving 2 pixels a
  tick towards the point under the clown; "GAME OVER" blinks every 50
  ticks.

### Two-player turns

After every fall that costs a jump, `fly` passes the turn to the other
player while player 2 has jumps left, without checking that the other
player has any. When
player 1 runs out first, the game keeps alternating: player 1's next turn
starts with 0 jumps, and that fall takes the counter to 255. The status
line's jump digit is then character `$40` + 127 (`show_status_number`
keeps seven bits), a cell of `font` that holds clown-shape bytes. *Live*:
with player 1 at 0 jumps and player 2 at 3, the turns went player 2,
player 1, player 2, player 1, and player 1's counter went 0, 255, 254.
When player 2 runs out first, player 1 plays on alone, as intended.

## Data tables

| Table | Where | Contents |
|---|---|---|
| `ml_table` | `$F000` | 25 machine-code routine addresses; numbers 3, 11 and 12 are never passed to `call_ml` |
| `vic_init` | `$F733` | 30 values for `$D011`-`$D02E` |
| `sid_init` | `$F74C` | 22 values for `$D400`-`$D415`, sharing its first five with `vic_init`'s last five |
| `screen_row_lo/hi` | `$FE1F`/`$FE38` | screen addresses of the 25 rows |
| `probe_offsets`, `probe_rows` | `$FE51`, `$FE60` | the nine cells of the collision test |
| `balloon_row_base`, `balloon_row_points` | `$FE5A`, `$FE5D` | 0/12/24; 10/5/2 (tens) |
| `column_balloon` | `$FE69` | which balloon covers each of 36 columns; its first nine entries are also the probe cells' column offsets |
| `playfield_layout` | `$FE8D` | nine five-byte records: column, row, count, character, step |
| `status_line` | `$FEC0` | row 0 in reversed glyphs |
| text | `$FEE8`-`$FF16` | "BONUS PLAY" and "PLAYER" sharing their letters as "BONUS PLAYER", "BONUS JUMP", "100502", "HIGH SCORE", "GAME OVER" |
| `tune_notes`, `tune_lengths`, `tune_start` | `$FF17`, `$FF73`, `$FFA0` | three tunes |
| `fall_pitches` | `$FFA3` | 24 pitch words; its last three bytes are also `pow10`'s first three |
| `pow10` | `$FFD0`/`$FFD5` | divisors 4,115, 1, 10, 100, 1,000, 10,000 as overlapping low and high tables |
| Constant tables set by `init_tables` | `$0223`-`$0243` | gravity, launch speeds by zone, speed-up counts, row bonuses (*live*: read back 100/50/20, 3/11/27, 3/10/50) |

The `$1013` (4,115) divisor makes the sixth digit always 0, which is how a
score held in tens is printed in points. The middle row's bonus is printed
"0500" (`show_bonus`, *live*).

The last five values of `vic_init` (for sprites 3-7's colours) are the
first five of `sid_init`. The three bytes after `sid_init` (`$F762`,
`$A0 $F4 $10`) are never read, and the SID's `$D416` and `$D417` are never
written.

## Sound

- Voice 1 plays the tunes (`play_tune`): tune 0 at the start of a game and
  with "BONUS JUMP", tune 1 with a row bonus, tune 2 after a fall in a
  game. Each note's last tick is silent, so repeated notes are heard apart.
- Voice 2: the see-saw bounce, a pulse whose pitch falls for 32 ticks
  (`sound_bounce`, `sound_tick`); the fall whistle, 48 ticks of the pitches
  in `fall_pitches` (`sound_fall`).
- Voice 3: the pop, noise gated for one tick (`sound_pop`).
- Volume 15 in a game (`sound_on`), 0 in the attract mode (`sound_off`).
  There is no music during play.

### Register census

| Register | Use | Routine |
|---|---|---|
| `$D000`-`$D005`, `$D010`, `$D015` | sprite positions and enables | `draw_clown`, `draw_seesaw`, `cold_start` |
| `$D011`-`$D02E` | set once | `cold_start` |
| `$D01E`, `$D01F` | read once to clear | `cold_start` |
| `$D012`, `$D016`, `$D018` | never read or written after the cold start | |
| `$D400`, `$D401` | voice 1 pitch | `play_tune` |
| `$D407`, `$D408`, `$D40B`, `$D40C` | voice 2 pitch, control, envelope | `sound_tick`, `sound_bounce`, `sound_fall` |
| `$D412` | voice 3 control | `sound_pop`, `sound_tick` |
| `$D418` | volume | `sound_on`, `sound_off` |
| `$D419` (`$D41A` through Y) | paddle | `read_paddle_seesaw` |
| `$D800`-`$DBFF` | colour, also through `($14)` and `($28)` | `clear_screen`, `draw_playfield`, `put_char`, `scroll_balloons` |
| `$DC00`, `$DC01` | keyboard column, paddle buttons and F1/F3 | `read_keys` |
| `$DC02`-`$DC05`, `$DC0D`, `$DC0F` | set once | `cold_start` |
| `$DC0E` | the tick | `wait_tick`, `cold_start` |
| CIA 2 (`$DD00`-`$DDFF`) | never touched: the video bank stays at its power-on value | |

## The listing's error rate

A sample of 60 of the listing's 236 line comments (seed 20261011, drawn
over the whole ROM) was checked against the bytes by an agent that wrote
none of them: 9 had a wrong detail, 15 % (95 % Wilson interval 8-26 %),
a lower bound on the true rate. What was wrong: registers a routine
returns its results in (`div8`, `div8_nonzero`, `div16`, the arithmetic
bytes at `$0A`); the speed table `next_level`, read as 1, 1, 2 where it is
1, 2, 1; text that `new_game` and `new_jump` show only in a game, not in
the attract mode; the condition on the balloon swap in `new_jump`; the
codes `move_clown_sprite` ignores; and a free fall in `fly`, which also
skips the change of turn. Every comment that repeated one of those beliefs
was corrected with it (`pop_balloons`, `next_level`, `pops_random`), and
the whole listing was then read again against the code by the agent that
wrote it, which corrected five more comments: four details that could not
be checked or were out of date (`$7000` called unmapped, a renamed label,
a pause's length in seconds) and one of wording (`main_high_score`). No
second independent sample was drawn.

## Live tests

All in VICE x64sc (own build of vice-mcp v3.13.2), PAL, 11 October 2026.
The paddle is not one of the emulator's inputs here: tests set the value
the game computes at `$F196` by stopping there and setting A.

1. Paddle values 0, 100, 200: see-saw sprites at x 41, 146, 271.
2. Joystick left on ports 1 and 2 for 25 frames: nothing moved.
3. F1, F1 starts one player; F1, F3 two players; paddle button A on the
   title opens the menu, button B there starts two players.
4. Tick rate: a counting checkpoint on `$F717` (`INC $DC0E`) over 500
   frames: 950.
5. Two-player turns: player 1 set to 0 jumps and player 2 to 3 during
   player 2's turn; turns alternated and player 1's counter went 0, 255,
   254.
6. The top row emptied by the clown's own pop (all its other balloons
   cleared first, the clown placed under the last one): "BONUS JUMP", then
   "BONUS 1000", the bonus flag cleared, the game standing still during
   both tunes; the next fall left the jumps at 5, the next jump showed
   "BONUS PLAY", and the fall after cost a jump.
7. The middle row the same way: "BONUS 0500".
8. A row emptied by writing its flags, with no pop, gives no bonus and is
   refilled at once (the bonus check runs only in `pop_balloons`).
9. The constant tables `$0226`-`$0228`, `$023C`-`$023E`, `$0241`-`$0243`
   read back 3/11/27, 3/10/50, 100/50/20.
10. A one-player game played by an autopilot steering the see-saw under
    the clown, then a two-player game: the code map in `codemap.json`,
    5,004 bytes run, every one inside the code the static trace found.
