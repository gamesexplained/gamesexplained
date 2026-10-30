# Squirm — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

The original Mastertronic cassette of 1984 (catalogue number 1C 0003),
from the Ultimate Tape Archive's TAP (`orientation.md`). One BASIC file,
`SQUIRM`, `$0801`-`$3F47`, started by `10 SYS 15133` (`$3B1D`). The game
carries no version string. The author's initials, TK for Tony Kelly, are
a character of the set (`tk_logo_char`, `$2AD0`), shown in the bottom
right corner in play and kept as the default names TK1 to TK5 of the
high-score table (`hiscore_screen`, `$1042`).

## Memory layout

| Thing | Where |
|---|---|
| BASIC stub `10 SYS 15133` | `$0801`-`$080D` (`basic_stub`) |
| Leftover BASIC program of the "CBM 64 ASSEMBLER" (not the game's) | `$080E`-`$0F9F` |
| Status line templates, top (also the high score's store) and bottom | `$0FA0`-`$0FEF`, `$0FF1`-`$1040` |
| High-score screen, with the table inside it | `$1042`-`$1389` |
| Title screen | `$138A`-`$16D1` |
| Mazes 1, 2 and 3, 840 screen codes each (rows 2 to 22) | `$16D2`, `$1A1A`, `$1D62` |
| Title colours (colour RAM image) | `$20AB`-`$23F2` |
| Screen copy routines, the spinner animation, high-score colours | `$23FA`-`$2571` |
| Leftover BASIC arrays (not the game's) | `$2572`-`$2647`, `$26DE`-`$27FF` |
| Worm cell lists, A to E | `$2648`-`$267F` |
| Game variables | `$2680`-`$2693` |
| Strings: PRESS FIRE TO START, GET READY, LEVEL, BONUS RUN | `$26AC`-`$26DD` |
| Character set | `$2800`-`$2FF8` (character `$FF`'s last 7 bytes are code) |
| Code | `$2FF9`-`$3D86` |
| Bonus tune, title tune for voices 1 and 2 | `$3DB8`, `$3E80`, `$3EE4` |
| Zero page | `$57`-`$58` the player's directions, `$FB`-`$FE` the player's position and a work pointer; the KERNAL's `$A2` (jiffy clock) and `$C5` (key) are read |

Screen at `$0400`, character set at `$2800` (`$D018` = `$1A`, set at
`$3B20`), video bank 0. Nothing is loaded after the start, and nothing
above `$3F48` is written.

## Timing

- The game runs on the KERNAL's interrupt, CIA 1's timer A, 60 a second
  on PAL; `irq_handler` (`$3CB3`) chains to the KERNAL's `$EA31`. *Live*:
  in the bonus run, 901 calls of `bonus_irq` against 1,112 of `$EA31`
  over the run and the level announcement that follows.
- Every wait stores a value in the jiffy clock's low byte `$A2` and loops
  while it is `$80` or more, so storing `$100 - n` waits n jiffies.
- The main loop's pass waits `step_delay` (`$2689`): `$FA`, six jiffies,
  ten passes a second, at the start. Once every four levels
  `move_creatures` (`$3A72`) adds 1, one jiffy less per pass; at level 25
  it reaches `$00` and the loop stops waiting. *Live*: completing a level
  with `level_stage` at 4 took `step_delay` from `$FA` to `$FB`.
- The character animation (`$3CB3`) runs every seventh interrupt, about
  8.6 times a second.
- The bonus run lasts 901 interrupts, about 15 seconds: its timer counts
  900 down to 0 and ends one count later (`bonus_irq`, `$3D27`; `$384C`).
  *Live* (901 hits).

## Controls

- Joystick in control port 1, read raw from `$DC01` (`move_player`,
  `$306E`). Up, down, left and right move; fire alone (`$EF`) stops the
  player; two directions at once count as nothing new, and the player carries on.
- The keyboard works too, because the KERNAL leaves `$DC00` = `$7F`
  (keyboard row 7 selected) and that row's keys pull the same lines as
  the stick: **1** up, **←** down, **CTRL** left, **2** right, **SPACE**
  fire (c64-reference, "Keyboard and joystick"). *Live*: each of the four
  moved the player, and SPACE started a game from the title.
- **F1** pauses (`$3C67` reads the KERNAL's key number `$C5` = 4). The
  pause silences the game, waits about two seconds, then waits for fire
  alone (`pause`, `$3C73`).
- Every test of fire is for `$DC01` = `$EF` exactly, so a key of row 7
  held at the same time stops it counting (`$32C5`, `$3BCF`, `$3C80`).
- Name entry: left and right move the highlight over A to Z and a
  space, fire takes the letter, three letters (`enter_name`, `$30DE`).
  *Live*: holding right for half a second moved three letters, and a
  score of 300 climbed from fifth place to first and became the HI score.

## Graphics

- Characters only: no sprites (`$D015` = 0), no raster interrupt.
- The maze is drawn in multicolour text mode (`$D016` = `$D8`, `$3BE0`);
  the title and the high-score screen use plain text (`$D016` = `$C8`).
- `colour_maze` (`$35E8`) gives every wall cell 9 (multicolour, white)
  and every empty cell the value of a counter that steps 1 to 7 and
  round again on every cell, walls included, so a cell's colour depends
  on where it is. The game never
  recolours a cell, so worms, eggs and the player take the colour of the
  cell they are on and change colour as they move. The walls' pairs of
  bits show the shared registers `$D022` and `$D023`, both blue (6).
- The text is plain screen codes, no private alphabet: an italic A to Z
  at `$01`-`$1A`, bold digits at `$30`-`$39`, and a block alphabet and
  digits drawn light on dark at `$81`-`$9A` and `$B0`-`$B9`, the same
  codes with bit 7 set.

| Characters | What they draw | Animated by |
|---|---|---|
| `$00` | solid block: the bonus run's trail, a wall | |
| `$01`-`$1A` | italic A to Z | |
| `$1B`-`$25` | maze walls (with the space `$20`) | |
| `$26`-`$2F`, `$3A`-`$3F` | pieces of the title's SQUIRM logo | |
| `$30`-`$39` | digits | |
| `$40`-`$42` | an arrow in three frames, never drawn | `$3CC4`, rotated |
| `$43` | worm's head | |
| `$44`, `$45` | worm's body (`$45` only on the title) | |
| `$46` | egg | `$3CF5`, each row rolled left |
| `$47`/`$48`, `$49`/`$4A` | the two treasures, two poses each | `$3CD8`, `$3CE6`, swapped |
| `$4B`, `$4C`, `$4D` | the value of a collected treasure: 100, 10, nothing | |
| `$4E`-`$55` | eight frames of a spinning figure; `$51` is the player, `$4E`-`$50` the lives | `rotate_spinner`, `$2508` |
| `$5A` | TK | |
| `$5B` | a box, for the name entry | |
| `$5E`-`$7F`, `$9B`-`$9F`, `$A1`-`$AF` | the leftover assembler's opcode table, never drawn | |

## Mechanics

- **The main loop** (`main_loop`, `$3BF6`): move what the level stage
  says; move the player; look at the cell the player now stands on: an
  egg scores 10 and counts, the treasure is collected, a worm's head
  (`$43`) or body (`$44`) costs a life; clear the cell the player left
  (unless it stood still); draw the player; wait; silence both voices;
  pause on F1.
- **Movement** (`move_player`, `$306E`; `step_player`, `$3014`;
  `try_cell`, `$2FF9`): a new direction is tried first and kept if open;
  otherwise the player carries on the way it was going, and stops when
  that is blocked. A cell may be entered if it holds a space or any
  character from `$28` up; below `$28` are the walls.
- **The exits**: a step left from column 0 is a step to the previous
  screen address, the last column of the row above, and a step right
  from column 39 lands on column 0 of the row below. The mazes leave
  those cells open (row 12, column 0 and row 11, column 39 in all
  three, and maze 2 also row 10, column 39 and row 11, column 0), so the
  sides join. *Live*: left from the start cell (12, 0) arrived at (11, 39)
  and ran on along row 11.
- **Worms**: five, A (8 cells) and B to E (5 cells each), cell lists at
  `$2648`-`$267F`. Each step a worm tries the directions in the shared
  order of `worm_direction` (`$2680`), right, left, up, down, starting
  wherever the last mover left it, up to four tries; boxed in, its head
  jumps back to its start cell (`step_worm_a`, `$334D`). A worm may enter
  a space, an egg or the player's cell (`cell_is_free`, `$3C93`). Worms A
  and E lay an egg where their tail was; B, C and D leave a space, so
  they eat eggs. Start cells: A `$048E`, B `$0755`, C `$04CB`, D
  `$0575`, E `$06FB` (`reset_worms`, `$3669`).
- **Level stages** (`level_stage`, `$2688`; `move_creatures`, `$3A46`):
  a cycle of four levels, 1 worms C, D, E; 2 and the treasure; 3 and
  worm B; 4 all five worms and the treasure. Each new level steps the
  stage on; at 5 the game gets one jiffy faster and the stage goes back
  to 1. *Live*: stage 4 to 5 at a level's end, then 1 with
  `step_delay` one higher.
- **Eggs**: each scores 10 (`add_score` with X = 4, `$3724`); the egg
  count `$2690` goes to voice 1's pitch, so the tone rises; the 255th egg
  ends the level (`$3C12`). *Live*.
- **The treasure** (`step_treasure`, `$39DF`; `move_treasure`,
  `$3961`): moves like a worm, from `$0755`, with a note on voice 2 for
  each step. Its worth (`treasure_value`, `$2684`) steps 1, 2, 3 on every
  pass of the main loop, and is read when it is collected: nothing, 10 or
  100 (`collect_treasure`, `$373B`). After a collection its value picture
  shows for 30 passes, and the treasure comes back, as the other
  picture, 200 passes after it was taken.
- **Lives**: three (`$3B9D`). A death (`lose_life`, `$3A7D`): the player
  falls down the screen to the status line with a noise, the
  walls flash through the colours, a life icon is wiped (`$3AFA`), and
  the player starts again, standing still, at `$05E0`. The worms keep
  their places.
- **Bonus run** (`bonus_run`, `$3780`): after the 255th egg, about 15
  seconds in which nothing moves but the player. Eating a worm's body
  scores 100, a head 200, an egg 10; every cell the player leaves
  becomes the solid block `$00`, which it cannot enter again. The bonus
  interrupt (`$3D27`) animates nothing, so the eggs and the spinning
  figure stop for the run.
- **Next level** (`level_complete`, `$3879`): the next maze in the order
  1, 2, 3, 1 (`maze_number`, `$2682`); the egg count and the worms
  start again; the player starts at `$05E0`, moving up.
- **The level number**: after 9, `$3887` sets the tens digit to 1
  instead of adding 1, so level 19 is followed by level 10, and the
  number then runs 10 to 19 over and over. *Live*: 19 became 10.
- **Score**: kept only on the screen, in reversed digits at
  `$0414`-`$0419`; the last digit is always 0. `draw_status_lines`
  (`$23FA`) copies the templates, which sets the score back to 0, at a
  new game and when a new best score is set, so the score on the top
  line goes back to 000000 the moment a new HI is entered. *Live*.
- **High scores**: five rows kept inside the high-score screen
  (`$1042`); a score that beats the fifth climbs one row at a time with
  a rising beep (`enter_name`, `$30DE`). The best score is written into
  the top status template (`$0FA4`), and survives until the machine is
  reset.
- **Dead code**: the older test `$32D5`-`$32EE`, replaced by the JMP to
  `cell_is_free` at `$32D2`; `$3D18`-`$3D26`, before the bonus
  interrupt's entry; `$3D70`-`$3D75`, the tail of an older
  `bonus_tune_step`. The arrow `$40`-`$42` is animated but never drawn.
- **A stray write**: `colour_maze`'s last pass starts with X = `$FF` and
  writes one colour to `$DC4C`, a mirror of CIA 1's serial data register
  (`$3649`).

## Data tables

- Mazes (`$16D2`, `$1A1A`, `$1D62`): 21 rows of 40 screen codes, copied
  by `show_maze1` to `show_maze3`; walls are `$1B`-`$25`, open cells
  `$20`.
- Worm cell lists (`$2648`): screen addresses, head first, A eight cells,
  B to E five.

## Sound

Voices 1 and 2 only, both pulse waves with attack, decay, sustain and
release all 8 (`new_game`, `$3B33`); voice 3 is off. Almost every sound
is a write of a voice's frequency high byte, `$D401` or `$D408`, with 0
for silence: the low bytes are never written. The main loop silences
both voices at the end of each pass (`$3C5F`), so each sound in play is
one pass long.

- Title tune (`$3BB2`): 100 steps of `title_tune_voice1` (`$3E80`) and
  `title_tune_voice2` (`$3EE4`), 10 jiffies each, round until fire. Its
  notes are the high bytes `$0A`, `$14` up to `$64`, multiples of 10,
  which are about 150, 300 up to 1,500 Hz on PAL: the harmonic series of
  150 Hz, not a scale.
- Level jingle: the first 30 steps of the title tune (`$38B2`).
- Bonus tune (`$3DB8`): 255 steps on voice 2, one a pass of the bonus
  run; it reads on past its 200 bytes into the first 55 of the title
  tune's voice 1. The table holds 151 notes and then 49 zeros, silence.
  The run lasts 901 jiffies and its passes wait `step_delay` (`$3835`),
  so at six jiffies a pass (levels 1 to 4) it has 151 passes, one for
  each note; at five jiffies 181, ending in silence; at four (levels 9
  to 12) 226, reaching the title tune's bytes; from three, the whole 255
  and round again.
- The treasure's walk: steps 1 to 29 of `title_tune_voice1` on voice 2.
- Death: voice 1 switched to noise at `$14` (`$3A7D`), then `DEC $D401`
  once a row (`$3A8F`). The SID's registers cannot be read back: the DEC
  reads the chip's data bus, the last value written, until it fades.
  Rows come three jiffies apart, longer than VICE's 6581 holds the bus
  (7,424 cycles) and shorter than its 8580 (663,552), so the pitch falls
  a step a row on an 8580 and jumps to `$FF` after the first step on a
  6581. *Live*: after each DEC the chip read `$13`, `$12` ... `$09` with
  the 8580, and `$13` then `$FF` ten times with the 6581.
- Name entry: `fade_beep` (`$30A2`) steps the volume and voice 1's pulse
  width from 15 down to 0.

### Register census

| Register | What the game does with it | Where |
|---|---|---|
| `$D016` | `$C8` hires text on the title and high scores, `$D8` multicolour in play | `$3270`, `$3B71`, `$3BE0` |
| `$D018` | `$1A`: screen `$0400`, characters `$2800` | `$3B22` |
| `$D020` | border: red in play, yellow in the bonus run, blue on the high scores | `colour_status_lines` callers |
| `$D021` | black background | `$3B27` |
| `$D022`, `$D023` | the walls' two colours, blue; counted 0 to 15 in the death flash, `$D023` read back to end it | `$3B5E`, `$3AD2`, `$3C8D` |
| `$D401`, `$D408` | voice 1 and 2 pitch, high byte | everywhere |
| `$D402`, `$D403`, `$D409`, `$D40A` | pulse width `$0A0A`; `$D403` faded by `fade_beep` and read once in dead code (`$3D1B`) | `$3B49`, `$30A7` |
| `$D404`, `$D40B` | `$41` pulse with gate; `$81` noise for the death | `$3B41`, `$3A7D` |
| `$D405`, `$D406`, `$D40C`, `$D40D` | envelopes `$88` | `$3B33` |
| `$D412` | voice 3 off | `$3B30` |
| `$D418` | volume 15; 0 in the pause and after `fade_beep` | `$3B57`, `$3C73`, `$30A4` |
| `$DC01` | joystick port 1 and keyboard row 7 | `$3076`, `$3124`, `$32C5`, `$3BCF`, `$3C80` |

No instruction names a sprite register, `$D019`/`$D01A`, the SID's
frequency low bytes, filter or voice 3's frequency, `$DC00`, CIA 1's
timers or CIA 2.

### Strings

The game's own strings are screen codes: "PRESS FIRE TO START"
(`$26AC`), "GET READY" (`$26C0`), "LEVEL" (`$26CA`), "BONUS RUN"
(`$26D4`), and the text inside the screens and status templates ("PLUG
JOYSTICK IN PORT 1", "MYSTERY BONUS", "10 POINTS FOR", "LIVES",
"TIMER", "HI", "SCORE"). The leftover BASIC program at `$080E` holds
the assembler's own texts: "CBM 64 ASSEMBLER", "DEREK BUSH", "PETER
HOLMES", its menu and its error messages. The character set holds
fragments of the assembler's opcode table ("AND", "ROL" and so on).

## The listing's error rate

**Sample 1.** Seed 20261030, 60 comments drawn at random from the
listing's 337, spread over the whole image, checked by a fresh agent on
claude-opus-5-5[1m] that wrote none of them, with `checker.md`'s brief. Six
were wrong in a detail and none in the main claim: the leftover BASIC
piece at `$0C00` was said to start in the middle of line 175, where its
first bytes are that line's number; two of the screen copies' last
pieces (`$133F`, and `$19CF` with it) were said to be rows 20 to 22
where they are row 21 from column 5 and row 22; maze 2 (`$1A1A`) was
said to have maze 1's openings, where it has two ways across; the
opcode table at `$2D08` left CPX out of its list; `fade_beep` (`$30A2`)
missed one of its six calls; and `colour_maze` (`$35E8`) was said to
give empty cells 1 to 7 in turn, where its counter steps on every cell,
walls included. All six were corrected, with every other comment and
note that said the same. 6 of 60 is over the mark of 2; the 95 %
interval for the share of wrong comments is 3.8 % to 20.5 %, a lower
bound, since a checker misses some. The listing has had no full audit.

## Live tests

All on VICE (`orientation.md`), from `play-level1.vsf` unless said.

- Keyboard: holding 2, 1, CTRL and ← for a quarter of a second each moved
  the player right, up, left and down; SPACE on the title started a game
  (from `entry.vsf`).
- Exits: the stick held left from the start cell (12, 0) put the player
  on (11, 39), then along row 11.
- Level end: with `$2690` = `$FE`, an egg poked beside the player and
  the stick right, the level ended at once; `bonus_irq` ran 901 times;
  the level number poked to 19 showed 10 on the next level; `level_stage`
  poked to 4 went to 5 and then 1, and `step_delay` from `$FA` to `$FB`.
- Name entry: lives poked to 1, the score to 300 and a worm's body
  beside the player; after the death the alphabet's highlight blinked,
  right held half a second moved it from A to D, and the name DCC took
  first place with HI 000300, the score on the top line back to 000000.
- Death sound: a worm's body poked beside the player and the stick
  right; a checkpoint after each `DEC $D401` read the chip's bus, with
  the 8580 the snapshot carries and with a 6581 from a fresh boot.
- A code map of a whole session (title, two levels, a death, the pause,
  a bonus run, game over and name entry, `codemap.json`) ran most of the
  game. What it did not reach is read from the code: worms A and B and
  the later level stages, maze 3, two of the treasure's three values and
  eating worms in the bonus run. None of the dead code listed above ran.
