# Mercenary — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/handover-7200.vsf` (`orientation.md`).

## Build

- The contributor's `MERCENAR.D64`, program `MERCENARY`: the game packed
  into one file (Compacker V2.0, then a run-length stage and a copy at
  `$5000`); `orientation.md` has the chain. The packed program's BASIC line
  and a second program, *The Second City*, are the only other things on
  the disk.
- The analysed image is `work/handover-7200.vsf`: stopped at `$7200`, the
  game's start-up, after the copy at `$5000` has run. It is the only state
  that holds the start-up code (`$7200`-`$75D5`) and the intro script
  (`$7000`-`$71B3`), which the second bitmap overwrites in play.
- No build identifier or version string was found. `COMPACKER V2.0` in the
  BASIC line is the packer's.
- The original Novagen disk, booted to the same `$5000`, matches the analysed
  memory over `$0800`-`$CFFE` but for five places (`orientation.md`): the
  intro's first message ("NOVADRIVE COUNTDOWN", which the crack replaced
  with "ABC UNLIMITED"), the `CBM80` reset signature at `$8004` (zeros in
  the crack), one branch offset at `$2178`, filler at `$5100`-`$52FF`, and
  `$BFFF` (*live*, `work/orig-entry-5000.vsf`).
- **The reset trap** (original only): with `CBM80` at `$8004`, the KERNAL's
  reset routine jumps through `$8000` to `$2170`: `SEI`, then a loop that
  branches back to its own `LDX #$00` and spins for ever. The crack removed
  the signature and changed the loop's offset.

## Memory layout

| Thing | Where |
|---|---|
| Hand-over | `$5000`: copies `$4000`-`$4FFF` to `$E000` and `$6000`-`$6FFF` to `$F000`, calls `SETMSG`, refuses NTSC (`$5024`), `JMP $7200` |
| Start-up | `$7200` `JMP $7290`: `$8135` (hardware), tables, then the main loop |
| Hardware setup | `$8135`: `$01` = `$36` while it runs, VIC bank 1, CIA interrupts off, NMI `$8009`, IRQ `$B9BB` at line 0, sprite 0 expanded at (160, 116) in light grey, border black; `$01` = `$35`, `CLI` |
| Main loop | `$855C`, `JMP $855C` at `$859E` and `$85EF`; `$A8` picks the branch |
| Raster interrupts | `$B9BB` at line 0 (the view), `$BA1E` at line `$BA` (the panel); each writes the other into `$FFFE` |
| Event scripts | the word table `$0800`-`$0865` (51 entries), scripts `$0866`-`$1248` |
| Script interpreter | `$8AB2`; handlers through the word table `$8D5E` (35 entries) |
| Message printer | `$8DC3` from the panel interrupt; `$8DAA` starts canned message X from the split table `$20A0`/`$20E0` |
| Dictionary | words `$1249`-`$151B`; pointers split at `$2120` (low) and `$2210` (high), one byte before each word |
| Canned messages | 64 token lists at `$151F`-`$16C9` (the object names among them), pointers split at `$20A0` (low) and `$20E0` (high) |
| Objects | 64; position in nine split tables: X `$2880`/`$2480`/`$2540`, height `$28C0`/`$24C0`/`$2580`, Y `$2900`/`$2500`/`$25C0` (low, middle, high); model pointer `$2800`/`$2840`; `$2940`, `$29C0`, `$2A00`, `$2B00` per object |
| City map | 256 locations (row Y, column X, index Y × 16 + X), four tables `$2C00`, `$2D00`, `$2E00`, `$2F00`, read at `$8F22` and `$8F66` |
| Player position | X `$74`:`$73`:`$72`, height `$77`:`$76`:`$75`, Y `$7A`:`$79`:`$78`; the high byte is the grid square shown in LOC |
| Bitmaps (bank 1) | `$4000` and `$6000`, double-buffered (below) |
| View colours and panel | screen matrix `$5C00`-`$5FE7` |
| Panel character set | `$7800`-`$7FFF` |
| Key and joystick reader | `$B2FE` (stick), `$B281` (keyboard matrix) |

## Timing

- PAL only: `$5024` jumps back to `$5000` when `$02A6` is 0 (NTSC). The copy's
  self-modified operands (`$5004`-`$500D`) are not reset, so the second
  pass copies `$5000` onwards over zero page, the stack and the screen and
  the machine crashes (*live*: switched to NTSC, power cycle, boot; 40 s
  later the program counter was at `$704C` and in the KERNAL's IRQ entry,
  `$02A6` itself overwritten with `$9D`, the BASIC screen full of copied
  bytes: `reference/ntsc-machine-crash.png`).
- One raster interrupt pair a frame. The panel half counts frames in `$E2`
  to 50, then seconds in `$E3`-`$E4` (`$BA60`-`$BA70`): 100 frames advanced
  from a stop took `$E3` from `$8C` to `$8E` with 99 hits on `$B9BB` (*live*).
- The main loop ran 10 passes in 100 frames standing still on the ground
  (*live*, non-stopping checkpoints on `$855C` and `$AF84` over 100
  frames): the view is redrawn five times a second there.
- **One view takes 13 frames over the city.** Stepping 24 frames from
  `work/intro-city-grid.vsf` (the opening descent, the whole city in view)
  and reading both bitmaps after each: after a swap, the new back buffer is
  filled with sky and ground in about 2 frames, nothing is drawn for about
  6 (the models are being transformed), the lines go in over about 5, and
  the buffers swap (`$24` 68, 69, 70 at frames 0, 4 and 17): about 3.8 views
  a second (*live*).
- **Double buffering** (`$AF84`): `$24` counts passes; on even passes the
  game draws into `$4000` (`$25` = `$40`) while `$C7` = `$78` shows `$6000`,
  on odd passes the reverse (`$25` = `$60`, `$C7` = `$70`). The view's
  interrupt copies `$C7` into `$D018`.

## Controls

The keyboard reader `$B281` scans the matrix itself and forms a key number
row × 8 + column (the KERNAL's numbering), with bit 6 for SHIFT and bit 7
for CTRL, in `$07`; a new key goes to `$E9`, the previous one to `$EA`.
The joystick is read from `$DC00`, control port 2 (`$B2FE`): directions to
`$80`, fire to `$81`.

| Key | Number | Where |
|---|---|---|
| D (drop) | `$12` | `$B33F` → `$98FE` |
| L (leave) | `$2A` | `$B349` → `$98C8` |
| + and - (fine speed) | `$28`, `$2B` | `$B356`, `$B361` → `$B499` |
| CTRL + S, CTRL + L (save, load) | `$8D`, `$AA` | `$B36C`, `$B377`; digit through `$BC50` into `$825E`; RETURN → `$819E` |
| CTRL + RETURN (pause) | `$81` | `$B335` |
| CTRL + Q (quit situation) | `$BE` | `$B3E5`: stack reset, `JMP $80E8` |
| E (elevator) | `$0E` | `$B3F6` |
| digits, SHIFT + digits (speed) | through `$BC50` | `$B47E` |
| T (take), B (board) | `$16`, `$1C` | `$970A`, `$970E` in `$9706` |
| Y (yes) | `$19` | script key tests at `$0AB6` and `$10CF` |

## Text

Three alphabets on one character set (`$7800`):

| What | Glyph for a character | Seen |
|---|---|---|
| Message window | ASCII + `$80`: `$C1` is A, `$A0` space, `$ED` ?, `$EE` !, `$EF` ' (the letters are holes in solid cells) | *live*: "DO YOU WANT TO BUY?" read from `$5F7A` |
| Panel labels | ASCII - `$20`: `$21` is A (EL is `$25 $2C`) | *live*, screen row 18 |
| Figures | the value: `$00`-`$09` are 0-9; `$8B` +, `$8D` - | *live*, the LOC, ALT and SPEED readouts |

Stored text is ASCII in capitals, the last character of a word with bit 7
set. In messages, values 0-9 stand for the digits, `$0A`-`$0F` for
* + , - . / (glyphs `$8A`-`$8F`: so `$0D` is a hyphen, "TYPE - DOMINION DART"),
and `$6D`, `$6E`, `$6F` for ?, ! and '. A message is a list of tokens, ended by 0 (`$8E24`):

| Token | Meaning |
|---|---|
| `$01`-`$07` | word n of the dictionary, printed straight after the previous one (endings such as S and ED) |
| `$08`-`$EE` | word n, after a blank |
| `$EF` | a blank |
| `$F0`-`$F7` | the word whose number is in `$57D8`-`$57DF` (through `$56E8`), after a blank |
| `$F8`-`$FE` | figure 8 + (token AND 7) of the sixteen at `$76E0`, i.e. the four BCD bytes at `$7700` + 4 × (token AND 7), formatted into `$7720` |
| `$FF` | literal text follows, up to the character with bit 7 set |

Word n starts one byte after the address in `$2120`+n (low) and
`$2210`+n (high). The ending message prints "PLEASED YOU!VE GONE": the
literal at `$1163` has `$6E` (!) where the apostrophe `$6F` was meant.

## The event scripts

A script is bytes read through `($1F),Y`. Each operation byte holds the
operation in bits 0-5; bit 7 inverts a test; bit 6 turns a taken branch
into a call. A test is followed by its operands and a two-byte target:
taken, the script jumps there (or calls, with the return address pushed
on `$BEC2`); not taken, it goes on after the target. `$8AB2` runs one
operation per call from the main loop, and does nothing while a message
is still printing (`$E6` non-zero).

| Op | Handler | Does |
|---|---|---|
| 1 | `$8C36` | print the tokens that follow, up to a 0 |
| 2 | `$8C4E` | zero the seconds clock `$E3`-`$E4` |
| 3, 4, 5 | `$8BB2`, `$8BA3`, `$8BBE` | jump, call, return |
| 6 | `$8B47` | test the grid square: `$74` and `$7A` against two operands |
| 7 | `$8AF0` | test the clock against a two-byte operand |
| 8, 9 | `$8C57`, `$8B41` | call machine code at a two-byte address (9 tests its carry) |
| 10 | `$8AE5` | test a random number (`$ADEF`) |
| 11 | `$8B60` | test the last key |
| 12, 19, 26, 29, 31 | `$8B37`, `$8B24`, `$8B72`, `$8B17`, `$8B57` | tests on the object numbered in `$57EE` and the values `$57ED`, `$57EF` (what they hold is not settled) |
| 13, 14, 21 | `$8C6C`, `$8C73`, `$8C98` | set, add and sum sixteen four-byte BCD figures at `$76E0` + 4n |
| 15, 30 | `$8BF5`, `$8CDB` | set and copy script variables `$57E0`-`$57EF` |
| 16, 17, 18 | `$8CF3`, `$8CFF`, `$8B2D` | set, clear and test bits of `$BEC0` |
| 20, 27 | `$8D22`, `$8D34` | print canned message n (`$8DAA`; 27 picks n at random) |
| 22, 23 | `$8D46`, `$8B03` | add to and test the signed value `$BEBD` (saturating at ±127) |
| 24, 25 | `$8AD0`, `$8D0D` | test and write any byte of memory |
| 28 | `$8D40` | clear the key (`$B4B2`) |
| 32, 33 | `$8BDB`, `$8B7C` | set or clear, and test, bits of `$29C0` for the object numbered in `$57EE` |
| 34 | `$8B0E` | test `$A9` |

## Hardware register census

From the code traced so far (it grows as coverage does):

| Register | Use | Where |
|---|---|---|
| `$D000`, `$D001`, `$D010`, `$D017`, `$D01D`, `$D01B` | sprite 0 placed at (160, 116), expanded both ways | `$8135` |
| `$D027` | sprite 0 colour | `$8184`, `$91DF`, `$B23E` |
| `$D015` | sprite enable | `$937D` |
| `$D011`, `$D016`, `$D018`, `$D021` | view and panel modes, per raster band | `$B9BB`, `$BA1E` |
| `$D012` | raster compare set; read in waits | `$8169`, `$B9DC`, `$BA14`, `$BA31`; reads `$731C`, `$74E8`, `$AA9E`, `$AF76`, `$B255` |
| `$D019`, `$D01A` | raster interrupt only | `$8171`, `$8174` |
| `$D020` | black border | `$818E` |
| `$D400`-`$D406` | voice 1 | `$AF45`, `$B915`, `$B963`-`$B97B` |
| `$D408`, `$D40B`, `$D40D` | voice 2 | `$B607`, `$BA87`, `$BAE9`; `$741E`, `$743B`, `$AF4E`, `$BB33`; `$B613` |
| `$D40F`, `$D412` | voice 3: the message tick; control | `$8DCD`, `$8DF9`; `$B91D` |
| `$D800`-`$DBE7` | colour RAM: the panel's colours, cleared at `$BB61` | `$B4CC`-`$B536`, `$BB61`-`$BB6A`, `$80CE` |
| `$DC00`-`$DC03` | keyboard and joystick port 2 | `$B281`-`$B303` |
| `$DC0D`, `$DD0D` | CIA interrupts off | `$8147`, `$814A` |
| `$DD00` | VIC bank 1 | `$8142` |

Not written by anything traced so far: `$D418` (volume), the filter
registers `$D415`-`$D417`.

## Strings

The string sweep finds 235 runs of three or more letters ending in a
bit-7 character. Apart from the scripts, the dictionary and the object
names: the intro's messages at `$700B`-`$71B4`, and four names at `$760A`,
"KBCODE(", "MYONO (", "POWER (", "ALLFLG(", nothing reads yet.

## Live tests

- The opening sequence and the idle messages, logged from the message row
  (`$5F78`-`$5F8E`) every quarter second for five and a half minutes from
  `$7200` with no input: every message listed in `features.md`, in order,
  and the idle lines 18 s apart.
- The Dart bought: at the fifth "DO YOU WANT TO BUY?", Y held for 1.5 s
  one second after the question appeared: "TRANSACTION COMPLETED", "YOU
  HAVE 4000 CREDITS", and `$7700`-`$7703` went from `00 00 90 00` to
  `00 00 40 00`. Saved as `work/dart-bought.vsf`.
- RESTORE in play: one hit on `$8009`, and the main loop went on (nine
  passes in the next two seconds).

- Walking forward two seconds from the start raised Y (`$7A:$79:$78`) from
  `$08:$88:$00` to `$08:$8C:$60`; turning changed no position byte.
