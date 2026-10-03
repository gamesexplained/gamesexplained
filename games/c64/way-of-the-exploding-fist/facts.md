# Way of the Exploding Fist — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/play_round1.vsf`, the snapshot named in
`orientation.md`.

## Build

The Melbourne House disk, a GCR image (`GCR-1541`, 42 tracks). The game
proper is entered through BASIC at `$1AED` (`SYS 6893`), which calls the
machine set-up `$18E8` and jumps to the outer loop `$1EE1` (*live*: a
stopping checkpoint at `$1AED` caught the hand-over). It carries no
version text and no credits.

## Memory layout

| Thing | Where |
|---|---|
| Speech timing table, 256 16-bit periods (copied from `$C700`/`$C800` by `$18F8`; the disk file `m.prerun`, byte for byte) | `$0200`-`$03FF` |
| Music: patterns, pattern tables, driver, song tables, 25 instruments | `$0400`-`$1159` |
| Per-move tables (blows, blocks, reach windows, strike frames, points) | `$115D`-`$12D0` |
| Bull bonus round | `$12F8`-`$1469` |
| High-score table and name entry | `$146A`-`$17BA` |
| Backdrop unpackers | `$17BB`-`$18E7` |
| Machine set-up, game flow, judge, function keys | `$18E8`-`$1FF9` |
| Panel: scores, clock, rank text | `$2002`-`$22CE` |
| Computer opponent and its tables | `$22CF`-`$27FF` |
| Fighter update: controls, moves, hit test | `$2808`-`$2D61` |
| Raster interrupt chain and multiplexer handlers | `$2D62`-`$3119` |
| One-bit speech player | `$311A`-`$31F1` |
| Multiplexer set-up | `$31F2`-`$37BC` |
| Animation engine and sprite builder | `$37BD`-`$3E7F` |
| Packed backdrop bitmaps (4) | `$3F5F`-`$68CA` |
| Packed backdrop colours (4) | `$68CB`-`$71FF` |
| Reach profiles (22 of 59 bytes) | `$7200`-`$7711` |
| Animation word table and step lists | `$7720`-`$79E9` |
| Frame-to-cell tables (9 slots x 79 frames) | `$7AE0`-`$7DA6` |
| Multicolour mirror table, cell page table | `$7E00`-`$7FFF` |
| Fighter shape cells, 64 bytes each | `$8000`-`$BFFF` |
| Blank sprite; fighters' build buffers (run time); bull sprites | `$C000`; `$C040`-`$C93F`; `$C940`-`$CBFF` |
| Screen memory, sprite pointers | `$CC00`-`$CFFF` |
| Sprites under the I/O chips: bull, judge, shadow row | `$D000`-`$DFFF` |
| Bull sprites and the font (codes `$20`-`$5F`) | `$E000`-`$E5BF` |
| Backdrop bitmap (unpacked at run time) | `$E640`-`$F53F` |
| Speech sample table and four samples | `$F540`-`$FFDC` |
| Hardware vectors | `$FFFA`-`$FFFF` |

`$01` is `$05` in play: RAM at `$A000` and `$E000`, I/O at `$D000`
(`$1956`). VIC bank 3 (`$1993`), screen at `$CC00`, `$D018` = `$39`. The
KERNAL is out and the game owns the vectors: NMI `$2FF2`, RESET `$1990`
(an `RTI`), IRQ rewritten by each raster handler.

## Timing

- **Seven raster interrupts a frame**, each writing the next handler's
  address into `$FFFE/$FFFF` (*live*, `kit/c64/frame.py capture`). `$31F2`
  runs at line 0 and sets up the multiplexer for the frame; `$2FB0` is armed
  for line 89, busy-waits for line 90, turns on bitmap mode (`$D011` =
  `$3B`) and starts CIA 2 timer B; the sprite handlers follow the
  fighters; the handler on line `$D9` (one of `$2FFF`, `$3039`, `$3073`,
  `$30C5`, chosen through `$25/$26`) draws the shadow row; `$30E5` at line
  255 sets text mode for the panel, sets `$D021` from `$AD` and calls the
  music driver (`$3111`).
- **NMI from CIA 2 timer B** (`$DD0D` = `$82`, latch `$16BC`, `$197B`-`$1987`):
  `$2FF2` sets `$D021` = 7 part-way down the screen and ignores any other
  NMI source, so RESTORE does nothing.
- **Once a frame:** the line-0, line-255 and music-call code ran 250 times
  in 250 frames (*live*, exec checkpoints on `$31F2`, `$30E5`, `$3111`).
- **The exchange loop does not keep to the frame.** In the same 250 frames
  of a two-player bout with both fighters idle, the loop (`$1AC7`) and the
  clock (`$212F`) ran 195 times (*live*).
- **The bout clock counts loop passes.** `bout_clock_tick` (`$212F`) takes
  one unit off `$B2` every 50 calls (`$B1` from `$32`), and a bout starts
  at 30 (`$1B37`). Measured: 50 frames per unit with the computer
  fighting, 60-66 frames per unit with two idle players (*live*, frames
  between changes of `$B2`). So the "30 seconds" last about 30 to 40 PAL
  seconds.

## Controls

- **Ports:** fighter 0 reads joystick port 2, fighter 1 port 1
  (`LDA $DC00,X` at `$2851`; *live*: port 2 moves the white fighter).
- **Stick to move** (`stick_to_move`, `$286C`, indexed by the five port
  bits; left and right are swapped when the fighter faces left, `$2857`).
  Read with the fighter facing right; *live* for every entry below with a
  two-player game, port 2 (the move number read from `$61`):

  | Stick | Without fire | With fire |
  |---|---|---|
  | centre, or fire alone | 1 stand | 1 |
  | forward | 2 walk forward | `$0C` |
  | back | 3 walk back | `$11` |
  | down | 4 crouch | `$0A` |
  | up | 5 jump | `$0E` flying kick |
  | up-forward | 6 high punch | `$0D` |
  | down-forward | `$18` from standing, 7 from a crouch (`$2B33`) | `$0B` |
  | down-back | 8 somersault backwards | `$10` |
  | up-back | 9 somersault forwards | `$0F` |

  Sixteen inputs give sixteen moves; with standing that is the eighteen
  movements of the box once the crouching variant 7 and the turn round
  `$12` (fire + back from standing, `$11` turned into `$12`) are counted.
  Which kick or punch each fire move is was judged from screenshots only
  for the moves named in the table.
- **Keyboard** (F7 in the attract mode, `$C6`): player 1 Q W E / A D /
  Z X C with fire S or left SHIFT (`$28B2`-`$2930`); player 2 P @ * / L ; /
  , . / with fire : or right SHIFT (`$2931`-`$29B3`). The first held
  direction key wins.
- **Function keys** (`$1E64`), working only in the attract mode (`$B0` =
  0) except F5: F1 or fire starts a game, F3 flips one or two players
  (`$AE`), F7 joystick or keyboard, DEL speech on or off (`$CF`), F5
  abandons a game (`JMP $1EE1`, without resetting the stack). *Live*: F1,
  F3, F5, F7, DEL (`$CF` 0 to 1), fire on port 2, and fire on port 1, which
  starts a one-player game because `$DC01` carries both the keyboard
  columns and port 1.
- **Automatic block:** pulling back (move 3) while the opponent's blow is
  in reach becomes the block that answers it, `$13` or `$14` from
  `move_block_answer` (`$118F`) (`$2AF2`).

## Graphics

- **Fighters are 3 x 3 grids of multicolour sprites**, sprites 0-2 for one
  fighter and 3-5 for the other, re-used down the screen by the raster
  chain. The gap between the fighters' tops (`$1C`, `$1D`) picks one of
  seven chains (`$32CD`); a gap of exactly `$14` lines has its own combined
  handlers (`$2F02`, `$2F59`).
- **Poses are built in software** (`$3914`-`$3E7F`): for each of the nine
  slots the frame tables at `$7AE0` give a cell number, and the cell's 64
  bytes are copied from `$8000 + 64 x cell` into one of two buffers per
  fighter (`$C040`/`$C280` and `$C4C0`/`$C700`), which are swapped every
  build (`$76,X`). A cell of 0 leaves the slot blank (pointer 0, the empty
  sprite at `$C000`). A fighter facing left is built mirrored through the
  table at `$7E00`, which reverses the four bit pairs of a byte ($01 to
  $40; checked for all 256 entries).
- **Animations** are lists of 4-byte steps (ticks, shape frame, X step, Y
  step) reached through `anim_list_table` (`$7720`), one per move number:
  `fighter_start_anim` (`$2B46`) copies the move into the animation number,
  and `fighter_animate` (`$37BD`) plays it forwards or backwards. X is
  clamped by `$12E9`/`$12EB` for frames below `$3B`.
- **The shadow:** while a fighter is off the ground, the line-`$D9`
  handler draws a row of fixed sprite images from `$D480`-`$DC3F` at Y
  `$DA` (pointers from `$3B5D`); *live*, a jump shows a shadow on the
  ground (`reference/jump-shadow.png`).
- **Backdrops are packed in memory**, never loaded from disk. `$1F3A`
  unpacks backdrop `$AF AND 3` when it changes: `bitmap_unpack` (`$17BB`)
  reads the stream from `$1839` backwards (control byte n < `$80` copies n
  bytes, n >= `$80` repeats one byte n AND `$7F` times, 0 ends) and writes
  downwards from `$F53F`, filling `$E640`-`$F53F`; `colour_unpack`
  (`$1849`) reads a nybble stream from `$1841` in three passes (colour RAM
  low nybbles from `$D8C8`, screen high and low nybbles from `$CCC8`), a
  nybble n giving n AND 7 literal nybbles, or with bit 3 set one nybble
  repeated n AND 7 times. Re-implemented in Python, both reproduce the
  play snapshot's bitmap and screen colours byte for byte for backdrop 0,
  and every stream ends exactly on its own header
  (`work/backdrop.py`). 0 Fuji with pagoda and torii, 1 a lake under a
  volcano, 2 a dojo, 3 a Buddha statue.
- **The floor hides data:** rows 17-24 of the bitmap have all four
  colours set to yellow (`$192F`: screen and colour RAM `$77`; `$D021` = 7
  from the NMI), so the RAM behind them (`$F540`-`$FFDC`) holds the speech
  samples.
- **The judge:** at a decision `judge_decision` (`$1F93`) puts sprites 6
  and 7 over the seated judge drawn into each backdrop, with a pointer and
  position per backdrop (`$1FFA`-`$2009`). *Live* at the end of a
  two-player game (`reference/judge-decision.png`).
- **Font:** codes `$20`-`$5F` at `$E100`-`$E2FF`, in ASCII order, not
  the ROM's glyphs. Panel text is plain ASCII (`$12BE` `1 PLAYER`,
  `$22A4` `JOYSTICK` `KEYBOARD` `NOVICE ` `10TH DAN`); `DEMO` is written
  with immediates (`$21B3`).

## Mechanics

- **Modes** (`$1EE1`): the attract mode `$1CD2` (both fighters computer,
  levels random 3-11, one demo bout per backdrop), the one-player game
  `$1BA7` (`$AE` = 0) and the two-player game `$1B09` (`$AE` = 1; *live*).
- **Scoring a blow is decided by distance.** A blow is tested once, on the
  frame its pose reaches `move_strike_frame[move]` (`$1204`) and only on
  the tick a step starts (`$88,X`). The distance between the fighters is
  compared with the reach profile for the move and the defender's frame
  (`$121D` facing each other, `$124F` from behind): at the profile's
  distance or nearer by up to `$11BD[move]` a whole point, nearer by up to
  `$11D6[move]` a half point, otherwise a miss; `$80` means a defender in
  that frame cannot be hit (`$2B70`-`$2C40`). The backward test is one unit
  narrower (`$2BF4` against `$2C0D`).
- **Points** (`$12A5`, hundreds, halved for a half point): moves 6, 7,
  `$0D`, `$0F`, `$10` 800; `$0A` 400; `$0B`, `$0C` 200; `$0E`, `$11` 1000;
  `$18` 600. *Live*: a whole point with `$0C` scored 200. The score lives
  only as screen digits (`$CC31`, `$CC41`) and rolls over past 999999
  (`$2100`).
- **One player** (`$1BA7`): four half symbols (`$8A,X`) win a bout
  (`$1D5F`); two bout wins (`$B5`) clear a rank, from NOVICE to 10TH DAN
  (`$B4`, text through `$22C3`); a lost bout ends the game; a draw replays
  it. At time up the fighter with more halves wins, then the one with more
  points (`$BD,X`); a full tie replays the bout. Each unit left on the
  clock adds 100 to player 1's score (`$21DF`). Past 10th dan the
  opponent's level is 7 plus a random 0-3 (`$1C65`) while the text stays
  10TH DAN.
- **Two players** (`$1B09`): four bouts, one per backdrop, on points only;
  the blow's symbol is drawn in the panel (font codes `$21`-`$28`,
  `$1DDE`/`$1DF3`) and cleared when the next exchange starts (*live*: `#$`
  appeared at `$CC2B` after a whole point, then cleared). The judge
  signals the winner at the end (`$1F93`, *live*).
- **The bull** (`bull_round`, `$132C`): after a rank is cleared on the
  Buddha backdrop (`$1C1C`-`$1C24`, `$AF AND 3` = 3). The bull is fighter
  slot 1, its sprites shown directly by pointer (`$5D` = `$40`). It falls
  only to move 7 (down-forward from a crouch) on its strike frame `$0D`
  with the bull `$19`-`$1D` units ahead: 3000 points (`$1383`). If it
  reaches the player first, the player is floored; if it passes without
  a hit, 500 points (`$1406`). *Live* (the stage forced by pokes, so the
  Fuji backdrop stayed on screen): the bull charged and floored an idle
  player (`$C2` = 1, `reference/bull-charge.png`); holding down, then
  down-forward when the bull was 28 units away, felled it at 26 (`$C2` =
  `$80`, 3000 points, `reference/bull-felled.png`).
- **The computer opponent** (`ai_think`, `$22CF`) blocks with
  `$118F[attacker's move]`, starts a scripted plan from `$2788` (nine
  plans through `$2774`), or counter-attacks; picks attacks by distance
  from `$26D5` (facing each other) and `$2725` (same way); against a block
  it picks the blows that block does not stop (`$27A1`/`$27A5`). Eight
  per-level masks (`$27A9`-`$27FC`) set its timing; the level is 0 at
  NOVICE and rises with each bout won (`$1C2D`). Random numbers:
  `random_next` (`$2589`), shift left and XOR `$1D` on carry, all 255
  non-zero values (checked by computing the cycle); `$99` is stepped every
  frame (`$1AFF`).
- **High scores:** one per mode in the panel (`$1299` one player, `$129F`
  two); a five-place table with names and ranks for one player
  (`$146A`-`$17BA`), with name entry by the game's own keyboard scan
  (`$150F`) to song 4. Holding fire at game over skips the table, leaving
  the new entry named `......` (`$1472`).

## Data tables

| Table | Where | What |
|---|---|---|
| `move_end_kind` | `$115D` | what ends each move: back to standing, hold the pose, or walk |
| `move_is_blow` | `$1176` | 1 for the eleven scoring moves |
| `move_block_answer` | `$118F` | the block that answers each blow |
| `move_reach_reversed` | `$11A8` | backward blows `$0F`, `$10` |
| `move_full_window`, `move_half_window` | `$11BD`, `$11D6` | margins for whole and half points |
| `move_strike_frame` | `$1204` | the frame a blow is tested on |
| reach pointers | `$121D`, `$124F` | 25 words each, into the profiles at `$7200` |
| `move_points` | `$12A5` | points per blow in hundreds |
| `ai_low_answer` | `$12D0` | the computer's low version of an attack |
| X clamps | `$12E9`, `$12EB` | by facing |
| `bull_hit_reach` | `$142F` | 59 bytes by player frame |
| `stick_to_move` | `$286C` | 32 bytes, the five port bits |
| reach profiles | `$7200`-`$7711` | 22 x 59 bytes, by defender frame |
| `anim_list_table` | `$7720` | 33 words: lists 1-31 and an end |
| frame tables | `$7AE0`-`$7DA6` | 9 x 79 cell numbers |
| `mirror_pairs` | `$7E00` | bit-pair reversal |
| `cell_page_table` | `$7F00` | `$80` + cell / 4 |

## Sound

- **Music** (`$09A5`, once a frame): three voices, four songs chosen by
  `$FF`: 1 attract mode (`$1CF8`), 2 one-player game (`$1BE5`), 3 two
  players (`$1B31`), 4 name entry (`$1764`), 0 silence. Songs 1-3 loop,
  song 4 plays once. Each voice has an order list (0 stop, 1 n play
  pattern n, 2 i jump, 3 i c repeat) dispatched through `$0D31`; patterns
  hold notes (semitone, octave, length index) and instrument changes
  (`$80` + n); 25 instruments with pulse-width and filter modulation from
  three triangle LFOs and voice 3's oscillator and envelope (`$0D3C`-`$0EB2`).
- **The music is tuned for an NTSC machine:** the note table (`$0D15`-`$0D20`,
  high byte 1) is within 5 cents of equal temperament at 1,022,727 Hz and
  65-70 cents flat at the PAL 985,248 Hz (computed from the table with
  the formula in `c64-reference`), so this PAL release plays two-thirds
  of a semitone flat.
- **Speech:** a one-bit player (`speech_irq`, `$311A`) toggles the SID's
  master volume between 15 and 0 on each CIA 1 timer B interrupt, the
  next period coming from the table at `$0200`/`$0300` indexed by the
  sample byte. Four samples (`$F540` table): sample 2 is started with
  every attack (`$2B54`), others with hit reactions and the bull round.
  Every raster handler first passes a pending CIA 1 interrupt to the
  speech player. `$CF` non-zero skips speech (DEL).

## Oddities

- **A trap on CIA 2 timer A.** After a scoring blow `blow_reaction` reads
  `$DD0E` (`$2CAE`), a register the game never writes; if it is non-zero
  the routine pushes two bytes and jumps into the animator, unbalancing
  the stack. *Live*: with `$DD0E` set to 1 before a blow, the CPU ended at
  `$0201` and the screen filled with garbage; without it, play went on.
  Why the check exists is not known.
- `$216E`/`$2169` read fighter 0's half/whole flag `$6E` for both fighters
  where `$206C` uses `$6F` for the second; it affects only the points
  tie-break.
- `$2661` (computer plan 7) compares against `$0053,Y` with Y = 14, and
  `$2646` (plan 8) stores to `$9D` without X.
- `$2593` loads most per-level parameters into shared zero page, so with
  two computer fighters (the attract mode) fighter 1's level sets both.
- Short tables: `$27CD` has 11 entries for 12 levels, `$27FC` 4.
- `$67,X` is written at four places and never read.
- Never reached: `$3754`, `$379A`, the speech entries for samples 4-7
  (`$3170`-`$3185`), the routine at `$12ED` and `JMP $1AED` at `$115A`.

## Live tests

| Test | How | Result |
|---|---|---|
| Hand-over | stopping checkpoint on `$1AED`, then a store watch on `$FFFE` | entered by `SYS` from BASIC; `$1943` installs the vectors |
| Raster chain | `frame.py capture` | seven handlers and their lines |
| Option keys | key presses in the attract mode, screenshots | F1, F3, F5, F7, DEL, fire on ports 1 and 2 as above |
| Stick table | each of 16 inputs on port 2 in a two-player game, `$61` read | every entry of `$286C` as tabled |
| Clock | exec checkpoints over 250 frames; frames between changes of `$B2` | per-frame code 250, loop 195; 50 or 60-66 frames per unit |
| Scoring | whole point with `$0C` at a distance of 12, two players | 200 points, symbol drawn then cleared |
| Bull | stage, wins and halves poked; blow landed; then crouch and down-forward at distances | bull charges and floors; felled at distance 26 for 3000 |
| Judge | one point, clock run out in warp | judge sprites shown at the end of the two-player game |
| `$DD0E` trap | `$DD0E` = 1, then a scoring blow | crash to `$0201` |
| Backdrops | Python re-implementation of both unpackers | byte-identical to the snapshot |
| Players byte | `$AE` read in a two-player game | 1 |
