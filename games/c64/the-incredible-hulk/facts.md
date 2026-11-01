# The Incredible Hulk — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

- Scott Adams's adventure system, "Version: 3-127": the title prints
  "Version: 3-" ($70EC) and then the database's version number, 127
  (`db_version`, $8062).
- The program is 11,263 bytes at `$5400`-`$7FFE`, loaded from 45 sectors
  that are in no file; the adventure is the file `SHULK.DB`, 9,856 bytes
  at `$8030`-`$A6AF` (`orientation.md`). The program is the same, byte for
  byte, on Commodore's 1984 disk and on the 1986 re-release.
- It is written like a Z80 program: zero page holds register pairs HL
  (`$4E`), DE (`$50`), BC (`$52`), IX (`$54`) and IY (`$56`), and a library
  at `$72E0`-`$753F` pushes, pulls, increments and compares them. Five
  routines take a word from the bytes after their call (`inline_word`,
  $7346): `SETHLI` ($5451, HL = the word), $5490 (HL = the word at that
  address), $548D (store HL there), $5478 and $547B (compare HL with the
  word at that address, or with the word itself).
- Every routine is reached through a table of JMPs: the program's own at
  `$5400`, whose slots lead to a table at the head of each module
  (`$5500` actions, `$5B00` interpreter, `$6100` conditions and rooms,
  `$6540` screen and keyboard, `$6C40` parser and title, `$72E0` register
  library, `$7540` pictures and disk, `$7D60` demonstration).
- Pieces of the original assembler's source and symbol table are left in
  the gaps between modules ($54DB, $5A11, $6068, $64E7, $72C3, $7538,
  $7A1B, $7D45). They give the names of the entry table's slots (RESTRT,
  PUT, PUTCR, PUTZ, READK, CLS, PUTSA, PUTS, GETIA, PUTNUM, DECHL,
  INCHL, SETHLI, SAVER, GETER, PUSHL, PULLHL, DECBC), source line numbers
  1860 to 2030, a comment ("MATCH STRNG WORD TO VOCR?"), variables (LX
  the light's turns at `$1E9F`, K at `$1EA1`), the interrupt's routines
  (SETIRQ, OLDIRQ, IRQRTN, VICINIT, GREADK0, SCRN) and two labels named
  JEFF2 and JEFF3. VICINIT and SETIRQ in the table at $7A1B are five
  bytes before the routines that do that work ($661C and $6B23), so that
  table is from an earlier assembly.

## Memory layout

| Thing | Where |
|---|---|
| Register pairs and the interpreter's flags | `$39`-`$6F` |
| Screen: the picture's colours above the split, the text window below | `$0400`-`$07E7` |
| Picture buffer: each picture or piece as loaded from disk | `$0800`-`$1B0C` |
| The game's state, the block a save writes | `$1C00`-`$1E3D` |
| The counter, a word | `$1C00` |
| 32 flags, a byte each | `$1C02`-`$1C21` |
| The room, a word | `$1C22` |
| Saved rooms (bytes) and saved counters (words) | `$1C24`, `$1C2A` |
| The items' locations, a word each (`$FF` carried) | `$1C3C`-`$1CA9`, through the pointer at `$1C3A` |
| The check byte | `$1E3C` |
| The line typed, then the word being looked up | `$1E3E`, `$1E70` |
| The output line | `$1EA8` |
| Other variables (`$1F14` tester, `$1F20` picture owed, `$1F22` picture on, `$1F28` demonstration) | `$1F0C`-`$1F2A` |
| Bitmap | `$2000`-`$3F3F` |
| Cache of the last room picture | `$4000`-`$530C` |
| The program | `$5400`-`$7FFE` |
| The adventure (`SHULK.DB`) | `$8030`-`$A6AF` |

## Timing

- Two raster interrupts a frame ($6AB6): one at line 192 that waits for
  line 201 and, after a delay loop ($6B1C), switches to text on line 210,
  just before character row 20; one at line 247 that waits for line 255
  and switches back to the bitmap on line 265, in the bottom border.
  *live*: one frame recorded with `kit/c64/frame.py`, the writes to
  `$D011` and `$D018` on lines 210-211 and 265. Any other interrupt goes on to the
  KERNAL's handler (`$EA31`) only when the raster line's low eight bits
  are under 128 ($6B0C).
- The line reader flashes its cursor every 1,200 polls of the keyboard
  (`$67D0`).
- Command 88 waits while HL counts 65,536 steps ($55FD); the
  demonstration waits while HL counts down 5,000 before each character
  it types ($7D6A).
- At the prompt the game polls the keyboard about 111 times a frame
  (110.8). *live*: VICE v3.14.0, the polls counted over
  frames at the command prompt.
- A picture's load through the fast loader takes about 1.75 million
  cycles to find the file and 1,884 cycles a byte; a name with no file
  takes 2.16 to 2.40 million cycles to fail. *live*: VICE v3.14.0 with
  the 1541 emulated, the stopwatch read at `load_picture`, `decode` and
  `load_failed` for R??002*, R??083*, R??084*, R??086* and four pieces
  with no file.

## Controls

- A command is typed on one line of at most 14 characters: the
  fourteenth ends the line by itself ($688D). DEL rubs out; a list of 34
  keys is refused ($6B5D), and so are the shifted letters ($6B7F). *live*
- The first word must be a verb and the second a noun; a third gets
  "Use 1 or 2 words only!" ($6DFE). Only the first four letters of a
  word count ($8066).
- One-letter commands ($6D03-$6D7A): N, S, E, W, U, D move; L and I are
  LOOK and INVE; Z turns the picture off and on; T, P and X set the
  tester (`$1F14` = 2, 1, 0); V passes a turn.
- Character `$FF` leaves the game for BASIC through a BRK ($6844). The
  C64's keyboard never produces it. *live*, by putting `$FF` in the
  keyboard queue: the screen cleared to "READY.", `$0314` back at
  `$EA31`.

## Graphics

- The top 20 rows are a multicolour bitmap at `$2000` with its screen at
  `$0400`; the bottom five are text in the ROM's lower-case set
  (`vic_setup`, $661C; `raster_irq`, $6AB6). With the picture off the
  whole screen is text.
- A picture is a file on the disk, `R01nnn` for room `nnn` and `B01nnnI`
  or `B01nnnR` for an item's piece in the inventory or in a room. The
  program asks for `R??nnn*`, so the two characters after R or B can be
  anything ($766C). The game's own fast loader in the drive sends it
  ($7777).
- A picture's header ($7A9A) gives its first column, first row, last
  column and bottom row, then four colour bytes: a hue in the high four
  bits and a brightness in the low four, as the Atari 400 and 800 keep
  colours. Each becomes one of the C64's colours from a bright table or a
  dark one ($7B71). One colour pair fills the whole screen area and one
  colour the whole colour RAM, so every picture has four colours.
- The data that follows is a run-length code of two-byte pairs, written
  down each column two pixel rows at a time ($7AF6-$7B40).
- The items in the room are drawn over the picture from item 0 up
  ($75F7), each its own file. Every piece sets the four colours again,
  so the last piece drawn colours the whole picture. *live*: in the
  dome, with the sign drawn last, the screen bytes were `$26` (red and
  blue), where the dome's own picture gives `$86` (orange and blue); in
  the cavern, after the cage, `$86`, where the picture gives `$8E`.
- The bytes the game's loader brings in are the files on the disk, byte
  for byte. *live*, at the three returns from `load_picture` ($7558,
  $75DE, $765D): 60 of the 70 picture files, each the same bytes as its
  file; the play did not ask for the other ten.
- Rooms 13 and 14 share picture 2, 5 and 6 share 3, 7 and 8 share 4, 10
  and 11 share 9, 17 and 18 share 16 ($7A72). In four places an item's
  piece is swapped for another ($7A0E).
- The last room picture loaded under 80 is kept at `$4000` and copied
  back when the room is drawn again ($7984, $79A4).
- Pictures 81 to 89 are scenes shown by actions (command 90), 90 to 97
  close-ups after LOOK ($6A22), 98 the carried items and 99 the title.

## Mechanics

- The adventure is a table of 262 actions ($9446-$A4A5), kept as eleven
  columns: verb, noun, five condition words and four command bytes. The
  interpreter ($5B06) runs them in order.
- After the player's command, the automatic actions (verb 0) run; each
  runs when a number from 1 to 100 is no more than its noun ($5B7D). The
  number is the raster line added to a running total that moves on with
  every keyboard poll and every key ($5F39).
- A condition word is value × 20 + type; 20 types ($6118), from "item
  carried" to "counter equals". Type 0 is a parameter for the commands.
- A command byte of 1 to 51 prints that message, 52 to 101 runs
  handler n − 52 from the table at $550F, which has 39 (52 to 90; no
  action uses 91 to 101), and 102 and above prints message n − 50.
- GET carries at most 10 items ($8072). GET or DROP of a word no action
  uses searches the items' names for it between slashes ($5D9A).
- The score counts the items whose names start with `*` in room 16, of
  17 ($5836). With all 17 there SCORE typed in room 16 has the Chief
  Examiner give the password "ARIA" and shows picture 87 (actions
  202-208), and the score ends the game with "YOU WON!". *live*: the
  password and picture 87.
- Command 80 ($56A6), which SCORE's actions 202 and 208 use to swap the
  room with saved room 0 (the fuzzy area), does not move the player: it
  stores the saved room, saves the current one and jumps to $5754 with
  the current room still in A, which sets it again. So actions 203-206
  test the gems in the room the player stands in. *live*: SCORE in the
  dome with the 17 treasures in room 16 prints "Stored 17 treasures",
  "Scale 0-100 thats 100" and "YOU WON!" with no Chief Examiner. *traced*
  on the game's code in the kit's simulator: with the 17 in the dome,
  SCORE there gives the password and "Stored 0 treasures".
- The light is item 9 and lasts 150 turns ($8078), but item 9 starts in
  room 0 and no action brings it out, so the countdown ($6C55) never
  runs. It is dark only while the eyes are closed (action 137).
- V passes a turn without a command: the verb is still 0, so the
  automatic actions run as the turn's command and again at its end
  ($6D72). *live*: two runs of $5B06, one of the light's countdown.
- A save writes `$1C00`-`$1E3D` to the file `@0:` + the area's letter +
  `.S` (letters shifted) on the disk ($646F); a restore loads it and
  refuses it unless its last byte is 1 ($8064, at `$1E3C`).

## Data tables

| Table | Where |
|---|---|
| Header: the tables' addresses and the counts | `$8030`-`$8081` |
| Nouns, 129 entries of five bytes | `$8082` |
| Verbs, 129 entries | `$8307` |
| Texts: rooms, messages, items, each a length and the characters | `$858C`-`$92FA` |
| A second copy of the starting locations, never read | `$92FC` |
| Item names' addresses | `$936A` |
| Starting locations | `$93D8` |
| Action verbs, nouns, commands (4 columns), conditions (5) | `$9446`, `$954C`, `$9652`, `$9A6A` |
| Room descriptions' addresses | `$A4A6` |
| Exits, six columns of a word per room | `$A4D0` |
| Messages' addresses | `$A5CC` |

21 rooms, 55 items (17 treasures), 100 messages; 42 verbs and 81 nouns,
counting AUTO (verb 0) and ANY (noun 0), with 133 more spellings and two
empty verb entries (116 and 124).

## Text

The texts are ASCII in both cases, and PUT ($66A5) swaps the cases for
the C64's lower-case set and prints `"` as `-`. The text window uses the
ROM's character set, so there is no private alphabet to decode
(`30-text`). The string sweep (`kit/cpu/strings.py`) finds the program's
own messages, the colour test, the copyright and title screens, the
demonstration's script ($7DAD) and the source fragments above.

## Sound

One sound: at the end of a six-line page, a short triangle-wave beep on
voice 1, frequency `$204E`, whose settings are copied from `$6A0A` ($69C8).
The register census finds no other write to the sound chip.

## Register census

From `python3 kit/cpu/census.py`, 48 instructions name 15 registers.

| Register | What the game does with it | Where |
|---|---|---|
| `$00`, `$01` | the processor port: `$2F` and `$36`, BASIC out | `cold_start`, $657B |
| `$D011` | bitmap on for the picture, off for the text | $6634, raster table $6B14 |
| `$D012` | the raster split's lines; read for the 1-100 chance and by the exit to BASIC | $6AB6, $5F3D, $6847 |
| `$D016` | multicolour on | $662C |
| `$D018` | screen and bitmap or character set, per half | $6AF4 |
| `$D019`, `$D01A` | raster interrupt acknowledged, enabled, disabled | $6AB6, $6B23, $6854 |
| `$D020`, `$D021` | border and background, per half | $658A, $6AFA |
| `$D400`-`$D406` | voice 1, written from $6A0A | $69CB |
| `$D404`, `$D418` | the beep's gate; volume 6 | $69D8, $69D3 |
| `$DD00`, `$DD02` | the video bank; the serial bus to the fast loader | $661C, $782F-$78C7 |

Never touched: the sprites, the joysticks and CIA 1, voices 2 and 3, the
filter.

## The listing's error rate

One sample, seed 20261031, drawn from the listing's 1,717 comments: 60
of the 871 written by hand and 20 of the 846 generated from the
database's tables (the actions, the vocabulary, the texts and the
exits). A checker on claude-opus-5-5 that wrote none of them marked 6
of the 80 wrong, each read again against the code and upheld: 6 of the
60 hand-written (10 %, Wilson 95 % interval 5-20 %) and none of the 20
generated (0-16 %); weighted by the two populations, about 5 % of the
comments. One was wrong outright: `word_index` ($1E89) was called the
word of the line being split off, when it is the number of the entry
`find_word` has reached and, when it returns, the matched word's number.
Five were wrong in a detail: command 84 ($5724) said it prints the noun
as typed, when a synonym prints as its main word; the source fragment at
$5A11 put the shifted "<HIT R" two bytes early; $6CE8 said the echo is
blue, when READK echoes in black and blue comes after; the table of
missing pieces ($7675) said only a room piece is marked, when a failed
inventory piece is marked too; and `clear_bitmap` ($7CD7) said it clears
to `$3FFF`, when it stops at `$3FFE`. All six are corrected, with the
comments that said the same: `word_count` ($1E8A), the word buffer
($1E70), command 85 ($572D) and the item-word compare ($5E18). The rate
is a lower bound: a checker misses some of what is wrong. It is over the
mark of one in 30, and the run made no audit of every comment. The
checker's notes showed one more wrong outside the sample, also
corrected: `count_carried` ($5586) looks at items 0 to 53, not every
item.

## Live tests

All from `work/play-start.vsf` in vice-mcp v3.14.0, 31 October 2026.

- Typing 16 letters: the line ended after 14, and the last two began the
  next line.
- `XYZZY`: `Don't know how to -XYZZY- something.`, the quotes as hyphens.
- `E XYZZY` in the dome: the room became 3, the tunnel, with no
  complaint about the second word.
- `V`: no output, `$1F1F` 0 to 1, `$5B06` run twice and the light's
  countdown once (checkpoints that do not stop, the interrupt handler as
  the control).
- `T` then `BITE TONGUE`: "Ouch! I scream!" `DID: 11`, "I'm The
  Incredible Hulk (Tm)" `DID: 12`, "now!" `DID: 13`, "Rope Breaks!"
  `DID: 14`, then the dome (room 2).
- `QUIT`: "O.K. Stored 0 treasures", "Scale 0-100 thats 0", the room,
  "Now Hit-Y"; RETURN turned the picture off (`$1F22` `$FF` to 0). No
  "ADVENTURE over!".
- `LOOK RING` in the dome: the file asked for was `R??095*`.
- `$FF` in the keyboard queue at the prompt: BASIC's "READY." on a
  cleared screen.
- `SAVE GAME` to area B, then to area C, each on a fresh copy of the
  1984 disk: the new file's blocks were track 32 sectors 4, 14 and 6, the
  blocks areas A and D already pointed at, so A and D then loaded the
  new game as well. On the original disk the block map lists those three
  blocks as free. The disk's four areas hold saved games: A and D the
  field as the Hulk with the mirror, chair, gem and fan; B the fuzzy area
  as the Hulk with a gem; C the starting position. The 1986 disk has
  areas A to C only, each with its own blocks.
- `SCORE` in the fuzzy area with the 17 treasures put there: "Chief
  Examiner appears & says: -Save this password: ARIA-." under picture 87
  (`reference/aria-password.png`).
- The game's loads, at checkpoints on the three returns from
  `load_picture`, with the disk attached after the snapshot: 10 room
  pictures (`R01001` from the snapshot), the inventory picture, 11
  scenes and close-ups, 17 of the 18 room pieces and 21 of the 22
  inventory pieces, each the same bytes as the file read off the disk by
  `kit/c64/disk.py`. Not asked for: `R01000`, `R01081`, `R01083`-`R01086`,
  `R01088`, `R01099`, `B01001I` and `B01250R`.
