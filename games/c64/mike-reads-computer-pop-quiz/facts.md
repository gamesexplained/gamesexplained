# Mike Read's Computer Pop Quiz — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this understanding developed lives in `agent-history.md`. Every fact names the routine or table it comes from. Unless marked *live* or *simulated*, a fact comes from reading the code in the snapshots named in `orientation.md`. The game is three parts: `title`, the program that stays in memory; `menu`, the program's own `$4F00`-`$53FF` and `$B800`-`$FFFF`; `quiz`, the same ranges with a question block loaded.

## Build

The original Elite cassette: Novaload's 512-byte boot program in the KERNAL's format, then 26 files in Novaload's format: the loader's second stage, the loading picture, the program in four files (`3`, `4`, `1`, `2`), and five question blocks of four files each (`FX`, then three one-letter files, A-C for block 1 up to M-O for block 5; names built at `$2B6E`/`$2B73`) (`orientation.md`, `media.json`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page: `display_state` `$22`, `team` `$F9`, `two_players` `$FA`, `text_ptr` `$F6`/`$F7`, `question_number` `$28`, `step_done` `$FF`, the random state `$40`-`$47` | `$0000`-`$00FF` |
| Novaload's LOAD routine, used for every question block | `$033C`-`$03F9` |
| Start-up, raster handlers, choosers, input, drawing, round steps, text buffers and messages | `$0400`-`$1ED5` |
| Score roll, question engine, block loader, the show's step loop, the text printer, answer building, the random generator | `$1ED6`-`$3F29` |
| Sprite shapes drawn at run time: bubble (0-7), score digits (8-11), grid cursor (12), the 24-sprite text panel (`$10`-`$27`), times-8 tables | `$4000`-`$4BFF` |
| The music driver, its tail (menu part) and its data | `$4C00`-`$4EFF`, `$4F00`-`$53FF`, `$5400`-`$5B4E` |
| Screen colours, sprite pointers, the multicolour bitmap (loaded holding the title picture) | `$5C00`-`$5FFF`, `$6000`-`$7F3F` |
| Grid ball, subject icons, grid numbers, pictures 0-6, cursor shape, clock tiles and faces | `$8000`-`$94E1` |
| Frame masks, both fonts, score digits, panel tables, star names, frame tiles, the game's texts | `$94E2`-`$B4FF` |
| Question buffer, unused "What happened next" buffers, the bit-pair mirror table | `$B500`-`$B7FF` |
| Menu part: the twelve faces (`$B800` + 360n), the menu's code, its texts, the title picture's colour RAM (`$F800`) | `$B800`-`$FFFF` |
| Quiz part: the sound effects (`$4F00`-`$532E`); a question block's file B (`$B800`-`$CFFF`), file A copied to `$D000`-`$DFFF`, file C (`$E000`-`$FEFF`) | `$4F00`-`$53FF`, `$B800`-`$FEFF` |

## Timing

- The raster interrupt is a chain: `$0C47` → `$0403` → `$047D` (the three rows of the sprite text panel), `$0BE7` (line `$D4`, score sprites), `$0646` (line `$FA`: screen on or off, then the music `$4C03` or, once a block is loaded, the sound effects `$4F00`, and the display state's routine through `$07A4` when `$06AC` is set) (`$0646`-`$06AA`, `$07A4`-`$0807`).
- The answer clock is a loop in the main code, not the interrupt: 32 faces drawn by `draw_clock` (`$20DE`), one face every 4 turns of the loop (8 in the Quickfire Round), a tick sound every 3 turns; after face 31 the time is up. The loop's speed depends on the drawing, so the time limit is not a fixed number of frames (`$2F51`-`$2F8F`).
- The score digits roll one line a frame, so a shown score rises by one every 16 frames (`$1ED6`).

## Controls

- Player one: joystick port 1, or W up, X down, A left, D right, S fire; because keyboard row 7 is selected while port 1 is read, SPACE, 1, left arrow, CTRL and 2 also act as fire, up, down, left and right. Player two: joystick port 2, or @ up, / down, : left, = right, ; fire. `$1C9C` writes its own operand at `$1CA9` to read `$DC01` or `$DC00` for the player whose turn it is; the keyboard is tried only when the stick reads nothing (`$1C9C`-`$1D25`).
- The game samples the stick only now and then: a press must be held (*live*: a held fire of 1.5 seconds always chose; a short one often did not).

## Graphics

- Video bank 1 (`$DD00` = `$96`), a multicolour bitmap (`$D011` = `$3B`, `$D016` = `$D8`, `$D018` = `$79`): bitmap `$6000`, screen colours `$5C00`, sprite pointers `$5FF8` (*live*: the snapshots `teams` and `q1b`).
- The bitmap is loaded holding the title picture and never cleared whole; each screen is drawn over it and what is not wanted is hidden by blacking out its colours (`$2072`).
- The text panel is 24 sprites in three rows of eight, 192 by 63 pixels, written with a proportional font by `print_text` (`$194C`) and `draw_glyph` (`$19F2`); the speech bubble is 8 sprites scrolled 3 pixels a frame (`$0506`, `$0BBC`-`$0BC2`).
- The bubble's font draws the codes `$28` "(" and `$29` ")" as opening and closing quotation marks, which the game puts round song titles (*live*: the bubble showed “ Stand By Your Man ” ?).
- The twelve stars' faces are 6 by 6 multicolour cells at `$B800` + 360n (menu part). The grid draws place p with face p, a pick stores p + 3, and that one number gives both the picture and the name (`$AE98`/`$AEA7`) (`$E75C`-`$E76E`, `$CDB0`-`$CDC1`, `$C8E3`, `$CB0B`). The menu copies the six chosen faces into pictures 1-6 (`$8678`-`$8D80`) (`$C8E0`-`$CB06`).

## Mechanics

- **The show** is 32 steps (`$3362` team, `$338E`/`$33AE` routine): the Jukebox (6 turns), Spot the Star (2), Your Scene (6), Name the Year (2), the Quickfire Round (9 questions), the final Jukebox (6 turns, on the six numbers left), and the end (`$27D7`). Round types in `$1DC0`: 0 Your Scene and the Jukebox, 1 Name the Year, 2 Spot the Star, 3 the Quickfire Round.
- **The Jukebox** grid's twelve numbers hide the six subjects twice each, shuffled at the start of a game (`$287F`); a number gives a random unasked question of its subject (`$0D4B`, `$2C72`), 2 points.
- **Your Scene**: Easy is a question on the player's own specialist subject for 1 point; Hard is another random subject for 2 (`$3A84`-`$3AAB`).
- **Name the Year and Spot the Star**: three clues, worth 3, 2 and 1 points; when the clock runs out the next clue comes and the answers A-D are shuffled again (`$2FC6`-`$2FDD`, `$269C`). Spot the Star shows no picture of the star: the screen draws the asking team's captain (`$2DA4`-`$2DC4`).
- **The Quickfire Round**: 9 questions on random subjects, 2 points each, one clock for the whole round at half speed; when it runs out the round ends; a wrong answer gives the other team a point at once (`$0D88`, `$0DDD`, `$3ABC`, `$3125`-`$3162`).
- **A wrong answer or a time-out** in the other rounds offers the question once to the other team for 1 point (`$3029`-`$3099`).
- **Scoring**: the points are the operands of `ADC #` at `$30F4` (team 0) and `$3102` (team 1); scores are BCD at `$38A6`/`$38A7` (`$30E3`).
- **The computer** answers right with probability 192/256 when it is behind player one, and otherwise picks at random among the answers player one did not choose; it takes Hard when behind and chooses at random otherwise; it makes 8-11 random cursor moves before it decides (`$0936`, `$2B91`, `$3506`).
- **Question picking**: `$2C72` picks a random question of a subject's group that has not been asked (`asked_questions` `$1DC1`). It counts the group down on every draw, rejected ones included, so it can repeat a question before the group is used up (`$2C91`), and nothing clears `asked_questions`, so after a new block loads its questions of the same numbers count as asked.
- **A question block lasts four games**: games_left is set to 3 after a load and counted down by each new game; each game uses 2 of the 8 Spot the Star and 2 of the 8 Name the Year items, whose used-item masks are cleared only at a load (`$2AE0`, `$2CEF`, `$2A5C`-`$2A5F`).
- **The random generator** is new + 1 = 254 × (byte-swapped seed + 1) mod 65537, the seed in `$46`/`$47` (seeded by the menu from the SID's voice 3 noise), returning the new high byte (`$3DA3`; *simulated* for 2,000 seeds on the kit's 6502).
- **"What happened next"** exists as a text (`$25F8`) and a copier (`$2640`) that no step, call, jump or pointer reaches.

## Data tables

| Table | Address | Notes |
|---|---|---|
| The show's steps | `$3362`, `$338E`/`$33AE` | 32 steps: team, routine |
| print_text's texts | `$3314`/`$333B` | 39 texts of the text panel |
| Star names | `$AE47`, pointers `$AE98`/`$AEA7` | 15 first names; entry p + 3 names face p |
| Question block header | `$B800`-`$B80E` | spare-answer list offset (0 in every block), word list offset, the first question of each subject and 255, 4 bytes nobody reads |
| Question records | from `$B80F` | 256 a block: question `$FF`, answer `$FF`, a flags byte (0 in all 1,280), three question numbers whose answers are the wrong answers; record 255 is never asked, but its answer is borrowed |
| Question words | offset in `$B802`/`$B803` | 126 words a block; a text byte `$80`+n is word n |
| Clue items (file C) | `$F204`, `$F200` + (`$F200`/`$F201`) | 8 Name the Year and 8 Spot the Star items, 7 strings each (three clues, the right answer, three wrong answers), and their own word list (`$F202`/`$F203`) |

## Text

The game's texts use control bytes, read by the text printer (`$36B0`-`$3830`): `$7D lo hi` call a string, `$7E lo hi` continue at a string, `$7F` end the text, `$7C` wait for fire, `$F0 n` raise an event the round code waits for, `$F1 n` insert a name, `$FE` end of a name, `$F2 n` and `$F3 n` continue at a string from the tables `$AB8D`/`$AB93` and `$B162`/`$B16B`. Question text is plain ASCII with `$80`+n for word n of the block's word list (`$259C`). The game's own code builds every question and answer: `$3416` (question into `$B500`) and `$3C3A` (answer into a 23-byte slot), and `$262E` for the clue rounds (*simulated*: all 1,275 subject questions and 80 clue items of the five blocks, `work/allq.js`, `work/clues.js`).

## Sound

- One tune, played by the driver at `$4C00` (init, A = 0, from `irq_setup` `$2B60`) and `$4C03` (once a frame from the interrupt) while no question block is loaded: three tracks of 13,536 frames each, 4 minutes 31 seconds at 50 frames a second, each looping (`$549E`, `$5663`, `$5823`). Note events are two bytes (note, length index into `$525F`, instrument); commands `$60`-`$6B` give rests, ties, volume, patterns, jumps, slides, filter and stop; 14 instruments; patterns 0, 6, 9, 11 and 20 are never called.
- Once a block is loaded the interrupt plays the sound effects instead (`$33FE`): `fx_start` (`$4FCB`) starts effect X on voice Y, `fx_frame` (`$4F00`) steps the busy voices. Effects 1 and 2 together are a wrong answer, 3 the clock's tick, 4 a right answer (filtered noise, about 4 seconds), 5 a Jukebox number chosen, 6 an answer chosen, 8 time up; effects 0, 7, 9 and 10 are never played (nine `JSR $4FCB`, each after literal X and Y loads) (*simulated*: each effect run through `$4FCB`/`$4F00`, `work/agent5/fxrun.js`).

## Hardware register census

`kit/cpu/census.py` on each part (`work/census-*.txt`).

| Register | What the game does with it | Where |
|---|---|---|
| `$01` | `$25` at start-up, `$35` in play, `$34` (all RAM) while it reads a question block | `$04F7`, `$3404`, `$3C02` |
| `$D000`-`$D010`, `$D015`, `$D017`, `$D01D`, `$D027`+ | the sprite text panel's rows, the bubble, score digits and cursor, placed by the raster chain | `$0403`, `$047D`, `$0BE7`, `$0C47` |
| `$D011`, `$D016`, `$D018` | screen on or off (`$D011` = `$40` blanks), multicolour bitmap, video memory | `$0646`, `$07A4`, `$2B50` |
| `$D012`, `$D019`, `$D01A` | the raster chain | the handlers |
| `$D020` | the loader's border flash, black in play | `$03DE`, `$2ADB` |
| `$D400`-`$D418` | the music driver and the sound effects, through an index; `$D418` volume and filter | `$4C3A`, `$4D43`, `$4F31`, `$2A53` |
| `$DC00`, `$DC01` | the keyboard matrix and both joysticks | `$1C9C` |
| `$DC04`, `$DC05`, `$DC0D`, `$DC0E` | Novaload's pulse timer; the game acknowledges CIA 1's interrupts | `$034C`, `$03E5`, `$2B2A` |
| `$DD00`, `$DD02` | video bank 1 | `$2B46` |

## The listing's error rate

Seed 77133 drew 60 of the listing's 2,030 comments (31 of the title part, 14 of the menu, 15 of the quiz), and a fresh agent on claude-opus-5-5 that wrote none of them read each against the code. 8 were wrong, 13.3 % (95 % interval 6.9 % to 24.2 %, Wilson): three variable comments missed a reader or writer (the menu's start-up clearing `$1D`, the menu's read of the first captain at `$C93C`, the three loops that write every sprite pointer at `$5FF8`), two swapped the colour targets of the row-clear loop at `$209A` (screen colours at `$5C00` against colour RAM at `$D800`), one said the loader used `$AA`-`$B1` where it never touches `$AB`, one counted 255 question records for 256, and one misread which byte the question builder overwrites with a space. Every finding held when read against the code, and all 8 were corrected, with 10 more comments that said the same. The sample is over the kit's mark of 2 in 60, so the listing awaits an audit (`TODO.md`).

## Live tests

- The tape loaded in VICE and the game started at `$40E2` → `$0400` (13 November 2026).
- Joystick port 1 and SPACE drive player one's choices; port 2 did nothing for player one (13 November 2026).
- The speech bubble drew the codes for "(" and ")" as quotation marks (13 November 2026, `work/shots/bt-*.png`).
- Each question block loaded from the decoded files through Novaload's own entry and exit (`work/fastload.py`) and the game played on (13 November 2026).
