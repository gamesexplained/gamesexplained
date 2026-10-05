# Title and start-up — verified technical facts

The start-up is the program the boot file `2.0` loads from side 1, track
4, logical sector 16: sixteen pages to `$7E00-$8DFF`, entered at `$7E00`
(`JMP $7F2A`) with no load header. It draws the title screen, plays the
title sequence until Start or Utils is chosen, and leaves through the
engine's `load_program` (engine `$03AD`) for the game at T31/L9 or the
utilities at T8/L20; it never returns. On the way it reads the logo font
to `$CA00-$CBFF` and unpacks the title picture over its own `$8A00`, up
to `$A2FF`.

## Load and layout

- In the hand-over snapshot the program counter is `$7E00`, and
  `$7E00-$8DFF` is side 1's T4/L16 down to T4/L1, byte for byte.
- What the sixteen pages hold:

| Range | What |
|---|---|
| `$7E00-$7F29` | the entry jump, the title's sound code and its four sound records |
| `$7F2A-$8132` | the set-up and the title sequence |
| `$8133-$8477` | the explosion waits, the waits and polls, the menu, Start, Utils, reading a save, the logo's layout, the typing hook |
| `$8478-$860A` | the packed text |
| `$860B-$86FF` | engine bytes (the game's facts, "Build") |
| `$8700-$8BFF` | five filler sectors, each `$4B` and 255 bytes of `$01` |
| `$8C00-$8CFF` | the death program, whole: T4/L2, equal to the death part's `$7E00-$7EFF` |
| `$8D00-$8DFF` | the logo font's first page, T4/L1 |

- No instruction of the program can reach `$860B-$89FF`: `opcodes.py
  --refs` with reach 255 finds none for `$860B`, `$8640`, `$8680`,
  `$86C0`, `$86FF`, `$8700`, `$8780`, `$8800`, `$8880`, `$8900`, `$8980`
  or `$89FF`. `$8A00-$8DFF` is written over by the title picture
  (`$7FFE`), and the logo font is read from the disk again (`$7FA4`),
  not taken from `$8D00`.
- The program writes into its own bytes at the operands `$80B0`, `$80EE`,
  `$815F`, `$816E`, `$8246`, `$824A`, `$824E`, `$8253`, `$826C`, `$827B`,
  `$8280`, `$8319`, `$8425` and `$8426`, and at the picture's `$8A02`;
  nowhere else (every store, increment and decrement with an absolute
  address in its code blocks).
- Three routines are entered inside the operand of a `BIT`: `$7F22`
  (inside `$7F21`), `$8154` (inside `$8153`) and `$8363` (inside
  `$8362`).

## Set-up

- It clears zero page `$02-$FF` (`$7F30-$7F37`), sets `$D011` to `$37`
  (`$7F55`, `$7F91`), clears the whole screen, sets up the menu bar
  (`$818E`), colours rows 1-16, columns 1-36 of the screen matrix `$86`
  (`$836C`), draws a frame from column 0, row 0 to column 37, row 17
  (`$7F89`) and the gauge empty (`$7F8C`).
- The logo: two pages from T4/L1 to `$CA00-$CBFF` (`$7F96-$7FA4`), swapped
  with the font's glyphs `$20-$5F` at `$C600-$C7FF` (`$838B`), the layout
  at `$83AD` printed at column 33, row 1 in colour `$86`, and the fonts
  swapped back (`$7FA7-$7FD7`). The layout is glyph codes `$20-$5F`, four
  to a row, sixteen rows. After the set-up `$CA00-$CBFF` is T4/L1-L0
  (`play-title.vsf`).
- The title picture: T5/L16, twenty sectors (`$CE` = 20: T5/L16 down to
  L0, then T4/L20-L18), unpacked to `$8A00` with the limit `$A300`
  (`$7FDA-$7FFE`). Decoded offline, the twenty sectors give the 6,400
  bytes of `play-title.vsf`'s `$8A00-$A2FF` but for `$8A02`.
- `$8A02`, the picture's last column, unpacks as `$24` and is set to
  `$20` (`$8001-$8003`), so that a redraw stops at column 32, short of
  the logo. Run from `play-title.vsf`, the redraw (engine `$0586`, through
  `$041F`) reads `$8A00-$91F4` and leaves the logo's 432 non-zero bitmap
  bytes at columns 33-36 as they were; with `$24` it reads to `$91FA` and
  clears all 432.
- `$AC` = 1 turns the picture's animation on before the sequence starts
  (`$800A`).

## The title sequence

The sequence (`$800E-$8130`) repeats until a menu item loads a program.
Waits are in units of 255 menu polls (`$8156`).

| Step | What | Where |
|---|---|---|
| 1 | gauge emptied, message area cleared, credits (messages 1-4) shown | `$800E-$802A` |
| 2 | picture redrawn, a wait of 64 | `$802D-$803B` |
| 3 | messages 5, 6 and 7 typed over the picture at column 1, rows 1, 3 and 5, 10 apart; a wait of 50 | `$803E-$8061` |
| 4 | picture redrawn, message area cleared, message 8 shown; 30 with the animation off, 70 with it on | `$8064-$8082` |
| 5 | message area cleared, messages 9-12 shown, the siren | `$8085-$809F` |
| 6 | animation on; the gauge at `$40`, `$38`, `$30`, `$28`, `$20`, `$18` (a wait of 4 each), `$10`, a whistle, a wait of 4, 8 (a wait of 4), 1, a whistle | `$80A2-$80D9` |
| 7 | fourteen explosions, each after its wait in `$8133`: 4 5 2 3 6 5 1 3 4 3 4 2 4 3, ended by `$FF` | `$80DC-$80F0` |
| 8 | animation off, message area cleared, messages 13-17 typed at column 1, rows 1-5 (a wait of 10 after the first), a wait of 100, back to step 1 | `$80F5-$8130` |

- Run from `play-title.vsf` with no interrupts, a unit takes 62,249
  cycles with the animation off and 66,730 with it on, about a
  sixteenth of a second, and one pass from `$800E` back to `$800E`
  53,112,447 cycles, 53.9 seconds at the PAL clock (985,248 Hz) before
  the time the raster interrupt takes. In that run the siren starts at
  20.6 s and ends at 31.6 s, and the explosions run from 34.1 s to
  38.3 s.
- Every wait polls the keyboard and the menu (`$8164`: engine `$022A`,
  then `$02DE`), so Start and Utils act at any point. The siren polls
  once a step (`$7E96`, `$7EBD`) and typing once a character (`$8438`);
  the siren's pause at its top (`$7EA9-$7EB1`, about 1.3 seconds) and
  its fade (`$7ECE-$7EDA`, about 1.0 second), the whistle
  (`$7EFA-$7F10`) and the explosion's own sound (`$7F13-$7F1C`) poll
  nothing. A key pressed then waits in `$EC` for the next poll.

## Sound

- The start-up drives the SID itself. Its only stores to `$D400-$D7FF`
  are at `$7E05-$7E47`, `$7ED1`, `$7EE2-$7EF2`, `$7F03` and `$7F26`
  (every code block decoded; its indirect stores go through `$12`, `$66`
  and `$E9`, none of them at the SID).
- `start_sound` (`$7E03`) turns voice 1 (Y = 0) or voice 2 (Y = 7) off,
  writes an 11-byte record from `$7E4B` (attack/decay, sustain/release,
  control, pulse width, three bytes for `$D415+Y`, frequency, volume) and
  writes the control byte last. With Y = 7 the three filter bytes land at
  `$D41C-$D41E` (`$7E1D`, `$7E23`, `$7E29`).

| Record | Sound | Voice | Control | Frequency | Attack/decay, sustain/release | Volume |
|---|---|---|---|---|---|---|
| 0 (`$7E4B`) | explosion | 1 | `$85`: noise, gate, bit 2 | `$0320` | `$1A`, `$00` | `$0F` |
| 1 (`$7E56`) | siren, lower | 1 | `$21`: sawtooth, gate | `$1C31` | `$BF`, `$FF` | `$0A` |
| 2 (`$7E61`) | whistle | 1 | `$15`: triangle, gate, bit 2 | `$FD2E` | `$09`, `$00` | `$0F` |
| 3 (`$7E6C`) | siren, upper | 2 | `$21`: sawtooth, gate | `$2187` | `$BF`, `$FF` | `$0A` |

- Record 0 has the envelope, pulse width and filter bytes of the engine's
  explosion (engine `$C9BC`), at frequency `$0320` where the engine's is
  `$2000`.
- The siren (`$7E77`): voice 2 sounds `$0556` above voice 1
  (`$7EE2-$7EF2`). The pitch rises one step at a time from `$1C31` to
  `$2186`, a `delay_a($19)` and a poll a step; then a pause of eight
  `delay_a($FF)` (`$7EAD`); then it falls from `$2187` to `$1839`
  (`$7EB2-$7ECC`); then the master volume counts down from 10 to 0 with
  `delay_a($C0)` between (`$7ECE-$7EDA`), and both voices are turned off.
- The fall's `DEX`, `BNE`, `DEY` (`$7EB5-$7EB8`) lowers the high byte when
  the low byte reaches 0 rather than when it wraps: after `$2101` comes
  `$2000`, then `$20FF`. The pitch drops 256 for one step at each of the
  nine high bytes from `$21` down to `$19`. The rise's `INX`, `BNE`,
  `INY` (`$7E8E-$7E91`) has no such step.
- The whistle (`$7EFA`): record 2, then `$D401` from `$FD` down to `$0B`
  with `delay_a(8)` between, played twice (`$80C7`, `$80D9`).
- An explosion (`$7F13`): record 0, then `delay_a($80)`.
- Each typed character sounds the engine's click, record 22 of engine
  `$C9BC` (noise at `$1000`), through `$04D2`, then waits `delay_a($A0)`
  (`$8427-$842C`).

## Start and Utils

- The bar's menu has two items, Start and Utils (`$3A` = 1, `$81A6`), no
  hidden keys (`$81D6`) and the handlers Start `$81FA` and Utils `$81DB`
  (`$81D7`).
- Utils turns both voices off, readies the engine for the disk
  (`$82F8`), checks side 1 as the game's facts describe and loads T8/L20
  (`$81EF-$81F7`).
- Start turns both voices off, keeps `$AC` and turns the animation off,
  and prints "Use last saved game (Y/N)?" at column 0, row 23 with the Y
  in inverse (`$81FA-$8214`, text `$82DA`). RETURN or Y takes side 1's
  save whatever its age, N searches the four sides, back-arrow returns to
  the title with `$AC` as it was (`$827F`), and other keys are ignored
  (`$8217-$8226`).
- "Insert side 1. (RETURN)" (`$82A1`, text `$82B3`) only waits for
  RETURN or space, or back-arrow to return to the title. The side is
  checked afterwards by the engine (engine `$1897`), which repeats
  "INSERT SIDE n. (RETURN)" with no way out: it ignores its wait's carry
  and reads the side again (engine `$18DE-$18E7`). After N, a player
  without all four sides cannot go back.
- N (`$8228-$827C`) clears the best so far, reads the saves of sides 1, 2,
  3 and 4 in turn and compares each side's 32-bit count `$04`, `$05`,
  `$06`, `$F4FD` (low byte first) with the best; a count not smaller
  becomes the best and its side is kept (`$8243-$826D`), so ties go to
  the later side. The best side's save is then read again and the game
  loaded (`$827A`).
- Every side of the masters holds the same save, count 0 (key `$BB`), and
  a play side made by Copy starts with it, so on four fresh sides N takes
  side 4. The saves on all 24 disk images of the run (the four originals
  and the copies made of them, some after play) match their
  checksum when run through the engine's own `scramble_save` and
  `save_checksum` (engine `$04E7`, `$04EA`).
- After the side is chosen, `DEC $76` (`$828E`) makes the engine's
  `load_item_table` load item file `$75` = 0, which zero page's clearing
  left; then side 1 is checked (`$8293`) and T31/L9 loaded
  (`$8296-$829E`).
- Before any disk work (`$82F8`), the animation goes off, the message area
  is cleared, `$92` = 1 (tested by the game's entry, game `$7E5C`),
  `$5BFB` = 1 and `$B8`, `$AC` and `$C5` = 0.

## Reading a save

- The error exit of the read (`BCS` at `$8316`) is never taken: the
  engine's sector read prints its error, waits and reads again until the
  read works, and returns with the carry clear (engine `$2806-$283E`).
- A save whose checksum does not match is accepted with no message
  (`$832F-$834C`): each byte 0-254 of the eight pages is EORed again with
  twice its offset, which leaves it as stored EOR `$F4FF`, and the start-up
  goes on to load the game.
- Then `$F478-$F485` goes back to zero page `$02-$0F` (`$834E-$8359`) and
  the line buffer is cleared (`$835B`).

## Text

- The packed text block is at `$8478` (`$846F`). Its group table
  (`$84B4`) has five words, so twenty slots: message 0 is empty, 1-17 are
  the title's text, and slots 18 and 19 would decode from the engine
  bytes after `$860A`; nothing asks for them (the program's message
  numbers are 1-17). Alphabet codes 33-59 (`$8499-$84B3`) are all `$7F`.
- Messages 1-4 are the credits (the game's facts, "Build"). The story:
  5 "Place : EARTH", 6 "Year  : 1998", 7 "Status: DEFCON 1" (`$8522`);
  8 "Computer defense initiative activated." (`$8547`); 9-12 "Diplomatic
  solutions to the world's problems fail and war erupts as some madmen
  press ahead with their insane dreams." (`$8561`); 13-17 "Current
  condition: / High concentrations of / radiation produce random storms
  / and mutations. Somehow life / continues in the Wasteland!" (`$85B5`).
- Messages 1-4, 8 and 9-12 are shown word-wrapped through the engine's
  `show_message` (`$8464`). Messages 5-7 and 13-17 are typed
  (`$83FD`): the start-up finds the engine's `print_char` jump (engine
  `$1DF8`) through the jump table's entry at engine `$0323` (`$8455`), keeps its target in the
  `JSR` at `$8424` and points it at `$8424`, so each character is printed,
  then clicked, delayed and followed by one poll (`$8424-$8454`).
- The two prompts are plain ASCII with the engine's control bytes:
  "Use last saved game (Y/N)?" (`$82DA`) and "Insert side 1. (RETURN)"
  (`$82B3`).

## Code nothing reaches

- The `JSR $7F22` at `$80F2`: the explosion loop leaves on the table's
  `$FF` through the `BMI` at `$80E4`, and its `INX`, `BNE` always loops.
- `$8460-$8463`, an entry that sets the cursor and goes on into
  `$8464`: no instruction calls or loads `$8460`, and no immediate in the
  code is `$60`.
- `$8173-$818D`: 27 bytes of glyph codes `$8B-$9C`, two to a row in the
  layout `$83AD` uses. The one instruction that can reach them is
  `LDA $8133,X` at `$80E1` with X = `$40`, which the `$FF` at `$8141`
  stops at 14.
