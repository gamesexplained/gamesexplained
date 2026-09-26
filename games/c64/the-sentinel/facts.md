# The Sentinel — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/entry.vsf`, the hand-over image named in
`orientation.md`.

## Build

The image is a freezer-cartridge backup of the Firebird release, restarted
at the game's entry `$3F00` (`orientation.md`). Two parts of memory are not
in it: `$FF40`-`$FFFF`, which the game fills itself when it starts, and
`$B000`-`$B5FF`, 1.5 KB of code the game calls when the view pans
(`JSR $B006` at `$367C`), which nothing in the image can restore.

### The C64 program is the BBC Micro program

Long stretches of the C64 code are byte for byte the BBC Micro original, as
reconstructed by Mark Moxon (https://thesentinel.bbcelite.com/, assembled
listing `3-assembled-output/compile.txt` of
https://github.com/markmoxon/the-sentinel-source-code-bbc-micro, read 25
September 2026). A 10-byte window of the BBC code found exactly once in the
C64 image places 10,751 of the BBC program's 23,534 code bytes (the rest
differ mostly in address operands that moved), and 556 of the BBC's 885
code labels land on the same instruction in the C64 image.

| BBC Micro | Commodore 64 | Offset |
|---|---|---|
| `$0400`-`$0CFF`: landscape tiles, object tables, variables | same addresses | 0 |
| `$0D00`-`$3EFF`: most of the game's code, and the arctangent tables at `$3B00`-`$3DFF` | same addresses, each routine shifted by 0 to +54 bytes where C64 changes were made | small |
| `$49A0`-`$59FF`: object shapes, text tokens, music, icons, the sine table | `$9CA0`-`$ACFF` | +`$5300` |
| `$5560`-... | `$9280`-... | +`$3D20` |
| `$5C00`-... | `$8400`-... | +`$2800` |

The zero-page and `$0Cxx` variables keep their BBC addresses (for example
`$0C07`, `$0C52`, `$0CFD`/`$0CFE` in the routine at `$33F0`).

What the C64 adds, found by the register census (below) and by what does
not match the BBC code:

- `$3F00`-`$3FB3`: the entry: calls `$8900`, installs the play interrupt
  (`$95E9`), sets up sprites 1 to 3 (`$3F62`-`$3F93`).
- `$8900`-`$8FB2`: machine set-up (`$8900`), the keyboard scan
  (`$8CF9`-`$8D23`), the sound code, and a copy of the BBC operating
  system's entry points: `$8900` writes `JMP`s at `$FFC2`, `$FFC5`, `$FFE0`,
  `$FFEE`, `$FFF1` and `$FFF4` (targets `$8ED1`, `$8F0C`, `$8D2C`, `$8A6B`,
  `$8D81`, `$8F78`), the addresses of the BBC's GSINIT, GSREAD, OSRDCH,
  OSWRCH, OSWORD and OSBYTE. The BBC-derived code calls them as a BBC
  program would: `$862C` reads a key with `JSR $FFE0` and on Escape calls
  `$FFF4` with A = `$7E`, which is how a BBC program acknowledges Escape.
- `$8FB3`-`$9032`: two keyboard tables, 64 bytes each, ASCII by C64 key
  matrix position in the order column × 8 + row (`$7F` DEL, `3`, `5`, `7`,
  `9`, `+`, `£`, `1` is column 0); the second has lower-case letters.
- `$95E9`-`$9AF5`: the raster interrupt, the video-bank switching between
  title and play, sprites and colour RAM.

### Fragments of BBC BASIC in the gaps

Three stretches of unused memory hold BBC BASIC error messages, each in
BASIC's error form (a zero, the error number, the text, a zero): `$9C04`
error 19 `String too long`, `$A7A9` error 21 `-ve root`, and `$AA38`
error 23 `Accuracy l` (cut off by the code at `$AA44`). Nothing in the
traced code reads them. At BBC addresses (C64 minus `$5300`) they fall
inside the BBC program's own data area.

## Memory layout

Provisional; the coverage step settles each row.

| Thing | Where |
|---|---|
| Landscape tile data, 32 × 32 | `$0400`-`$07FF` (differs between hand-over and play) |
| Object tables | `$0900`-`$0BFF` |
| Variables | `$0C00`-`$0CFF` |
| Game code (BBC-derived) | `$0D00`-`$3EFF` |
| C64 entry | `$3F00`-`$3FB3` |
| Play screen: five character sets and the screen matrix | `$4000`-`$67FF`, `$7C00`-`$7FE7` (VIC bank 1) |
| Text font: the BBC Micro's own 8 × 8 glyphs, character n at `$8000` + 8n | `$8100`-`$83FF` (`A` at `$8208`, `0` at `$8180`) |
| Game code (BBC-derived, moved) | `$8400`-`$88FF`, `$9280`-`$9AF5` |
| C64 machine layer | `$8900`-`$9032`, `$95E9`-`$9AF5` |
| Object shapes, tokens, music, icons, sine | `$9CA0`-`$ACFF` |
| Missing from this image | `$B000`-`$B5FF` |
| Title screen: multicolour bitmap and matrix, drawn by the game | `$E000`-`$FF3F`, `$CC00`-`$CFE7` (VIC bank 3) |
| Vectors and the BBC-style entry points, written by `$8900` | `$FF40`-`$FFFF` |

## Text

The game's text is ASCII and goes out through `$FFEE`, the C64's copy of
the BBC's OSWRCH (`$8A6B`), with BBC VDU control codes: `$1F` x y moves the
text cursor (TAB), `$11` n sets a text colour, `$12` a b a graphics colour,
`$19` and five bytes a PLOT, `$04` and `$05` join text to the text or the
graphics cursor, `$09` moves right one character. No custom alphabet.

Messages are tokens. `$8617` prints token X: it takes an offset from
`$AA84`+X and prints the bytes from `$AA96` plus that offset until `$FF`,
each through `$3414`, which expands a byte of `$C8` or more as token
(byte − `$C8`) and hands anything else to `$AA6A`. `$AA6A` sends a PLOT
(`$19`) and its five bytes straight to OSWRCH; `$AA44` prints a character
from `$20` to `$7E` by patching it into a 23-byte VDU sequence at `$AA96`
and sending that, which draws it twice, offset, for the drop shadow on the
title screen's prompts. When bit 7 of `$0C0F` is set, `$AA44` sends the
character to OSWRCH plain.

| Token | Byte | Text |
|---|---|---|
| 0 | `$C8` | tokens 10, 12, 17, then text background colour 1: `PRESS ANY KEY` at the prompt row |
| 1 | `$C9` | TAB(1,21), five spaces, five spaces, three spaces, TAB(1,2), `LANDSCAPE` ` NUMBER?`, then TAB(5,21) for the answer |
| 2 | `$CA` | `SECRET ENTRY CODE` `?` at TAB(1,2), then TAB(3,21) |
| 3 | `$CB` | `WRONG SECRET CODE` at TAB(1,2), then token 0 |
| 4 | `$CC` | `PRESS ANY KEY` at TAB(3,24), then `LANDSCAPE` at TAB(1,2) |
| 5 | `$CD` | `SECRET ENTRY CODE` at TAB(1,2), `LANDSCAPE` at TAB(3,4) |
| 6 | `$CE` | TAB(1,21), `PRESS ANY KEY` |
| 7-9 | `$CF`-`$D1` | TAB(1,2), TAB(3,4), TAB(3,24) |
| 10, 11 | `$D2`, `$D3` | text at the graphics cursor, graphics colour 0 or 1 in the background |
| 12 | `$D4` | TAB(1,21) |
| 13 | `$D5` | `LANDSCAPE` (`$AB1C`) |
| 14 | `$D6` | `SECRET ENTRY CODE` (`$AB26`) |
| 15, 16 | `$D7`, `$D8` | five and three spaces |
| 17 | `$D9` | `PRESS ANY KEY` (`$AB42`) |

The title's `THE SENTINEL` is separate: 15 bytes at `$32C6` (`$84`, `$D5`,
`THE`, `$80`, `$C7`, `SENTINEL`) printed one at a time through `$3204`.

## Hardware registers

The census of every absolute access to `$D000`-`$DFFF` in the traced code.

| Register | Use | Where |
|---|---|---|
| `$D000`-`$D007`, `$D010` | sprite 0 to 3 positions | set at `$3F62`-`$3F88`; sprite 0 moved by `$96D6`-`$9722`, `$99E6`-`$9A0A`; `$D010` also at `$134C`, `$1351` in BBC-derived code |
| `$D011` | screen on, mode, raster high bit | `$8986` (init), `$95D2`-`$9615` (interrupt), `$9A6A`, `$9A96` |
| `$D012` | raster compare and wait | `$95CF`, `$960D` (interrupt), `$9A7D`; `$3670` waits for line 230 before `JSR $B006` |
| `$D015` | sprite enable | `$119B`, `$164F`, `$1657`, `$35A1` (in BBC-derived code), `$87B7`, `$8990`, `$9A0D`-`$9A41` |
| `$D016`, `$D017`, `$D01D` | multicolour on, no expansion | `$898B`, `$8996`, `$8993` (init) |
| `$D018` | video matrix and character base | `$8A1D` (init), `$95DD`, `$961B` (the five bands), `$9A6F`, `$9A9B` |
| `$D019`, `$D01A` | raster interrupt enable and acknowledge | `$896F`-`$8981`, `$8FA7`, `$95EB`, `$95F2` |
| `$D01C`, `$D025`-`$D02A` | sprite multicolour and colours | `$3F69`, `$3F8D`-`$3F93`, `$8999`, `$98C1`-`$9909`, `$9AA9` |
| `$D020`-`$D023` | border and background colours | `$8A05`, `$8A38`-`$8A42`, `$8657`-`$867B` |
| `$D400`-`$D406` | voice registers, reached with an index for the voice | `$8DD2`-`$8E27`, `$8EE5`-`$8F91` |
| `$D40B`, `$D412`, `$D415`-`$D417` | voices 2 and 3 control, filter off | `$89AE`, `$89B1`, `$89BB`-`$89C1` (init) |
| `$D418` | volume | `$89B6` (init), `$34A8` (in BBC-derived code) |
| `$D800`-`$DBFF` | colour RAM | `$8A26`-`$8A2F` (fill with `$0D`), `$9A73`-`$9AEF` |
| `$DC00`-`$DC03` | keyboard: row out, column in, directions | `$8CFC`-`$8D17` |
| `$DC0D`, `$DD0D` | interrupt control | `$8979`, `$897C`, `$8F99`-`$8FA4`, `$95E1`, `$95E4` |
| `$DD00`, `$DD02` | VIC bank | `$8A09`-`$8A18` (bank 1 at start), `$9A58`-`$9A91` |

No joystick port is read in the traced code: `$DC00` is written (a keyboard
row) and `$DC01` read as columns, only in the keyboard scan at `$8CF9`.
What the missing `$B000`-`$B5FF` touches is unknown.

## Strings

The sweep of the whole image for ASCII and screen-code runs of five or more
characters found the tokens above, `THE SENTINEL` at `$32CD`, the BBC BASIC
fragments, the keyboard tables and the font. Everything else it printed is
code or table bytes that happen to fall in the printable range.

## Timing

## Controls

## Graphics

## Mechanics

## Data tables

## Sound

## Live tests

| Test | Result |
|---|---|
| Hit counts over 1,985,257 cycles of play, landscape 0000 | `$95E9` 504 (five a frame), `$8F98` 0, `$8F9E` 0, control `$31D2` 16,081 |
| Blank `$E000`-`$FF3F` and `$CC00`-`$CFE7` at the hand-over, run | the whole title is drawn again within about 12 s: the title picture is the game's output |
| Store and execute checkpoints on `$B000`-`$B5FF` from the hand-over to the first view | 0 and 0, against 3,357 interrupt entries |
| Hold S on the first view with an execute checkpoint on `$B000`-`$B5FF` | stops at `$B006`, called from `$367C`, after 0.6 s |
