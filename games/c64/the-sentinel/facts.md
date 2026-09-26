# The Sentinel — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in `work/entry.vsf`, the hand-over image named in
`orientation.md`.

## Build

The image is a freezer-cartridge backup of the Firebird release,
restarted at the game's entry `$3F00` (`orientation.md`). Two parts of
memory are not in it:

- `$FF40`-`$FFFF`, which the game fills itself when it starts (`$8900`).
- `$B000`-`$B5FF`, 1.5 KB of code the game calls once for every step of a
  pan (`JSR $B006` at `$367C`), which nothing in the image can restore. A
  track-level image of the original disk was tried as well; its track 25
  is damaged where the loader starts reading (`orientation.md`).

Landscape 0003 had been entered when the backup was made: `$0CFD` =
`$03`, and the seed register holds it.

### The C64 program is the BBC Micro program

Long stretches of the C64 code are byte for byte the BBC Micro original,
as reconstructed by Mark Moxon (https://thesentinel.bbcelite.com/; the
assembled listing `3-assembled-output/compile.txt` of
https://github.com/markmoxon/the-sentinel-source-code-bbc-micro, read 25
September 2026). A 10-byte window of the BBC code found exactly once in
the C64 image places 10,751 of the BBC program's 23,534 code bytes (most
of the rest differ only in address operands that moved), and 556 of the
BBC's 885 code labels land on the same instruction.

| BBC Micro | Commodore 64 | Offset |
|---|---|---|
| `$0400`-`$0CFF`: landscape tiles, object tables, variables | same addresses | 0 |
| `$0D00`-`$3AFF`: most of the game | same addresses, each routine 0 to +54 bytes later where C64 changes were made | small |
| `$3B00`-`$3D82`: arctangent and half-angle tables | same addresses, same bytes | 0 |
| `$3715`-`$3AD2`: screen buffers, sights, icons | rewritten, in pieces at `$9556`-`$9A50` | +`$5E41` to +`$6033` |
| `$49A0`-`$59FF`: object shapes, text tokens, music, icons, sine table | `$9CA0`-`$ACFF` | +`$5300` |
| `$5560`-: hypotenuse and angle maths | `$9280`- | +`$3D20` |
| `$5C00`-`$5FFE`: object drawing, title objects | `$8400`-`$889C` | from +`$2800` |

Zero page and the `$0Cxx` variables keep their BBC addresses, with one
exception: the BBC's `$00` and `$01` (the enemy being processed and the
current object) are the 6510's processor port on the C64, so they moved
to `$90` and `$91` (BBC `$16AC LDX $00` is C64 `$16B9 LDX $90`; `$187B
STX $91`; the reset at `$115D`-`$1165` clears `$02`-`$B1` where the BBC
cleared `$00`-`$8F`).

The secret codes are the BBC's too. Simon Owen's list
(https://github.com/simonowen/sentcode, read 25 September 2026) gives
one column for "BBC/C64", and the port in `work/port/landscape.js`
reproduces all 10,000 codes from the C64 routines.

### What the C64 adds or rewrites

- `$3F00`-`$3FB3`, the entry: `JSR $8900`, the play interrupt `$95E9`,
  the sprite shapes and positions, and 256 random bytes at
  `$0200`-`$02FF` (the seed register set to `01 01 01 01 01`, stepped 256
  times, then 256 more results stored, `$3F96`-`$3FAF`).
- `$8900`-`$9032`, the machine layer: set-up, a copy of the BBC operating
  system's entry points, the keyboard, the text driver and the sound
  (section "The BBC operating system, rebuilt").
- `$9508`-`$9AF6`: the energy row, the raster interrupt, the circular
  play screen and its pan steps, the sights and the video-mode switch.
  The BBC's screen routines were rewritten here, and new code put round
  them.
- `$3700`-`$395E`: code that works out every tile corner's angle from the
  player into a table at `$BC00`-`$CBFF` after each move, so that drawing
  the view need not compute them corner by corner, and two fills of the
  sky.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: BBC variables at BBC addresses; C64-only `$90`-`$B2` (moved BBC `$00`/`$01`, view origin, copy pointers, sights position, fade random state, pointers to the angle table) and `$F0`-`$F7` (text and sound pointers); `$B3`-`$EF` and `$F8`-`$FF` unused | `$0000`-`$00FF` |
| Object flags (bit 7 free; bit 6 set: standing on the object in bits 0-5), pitches, drawing work area, in the stack page | `$0100`, `$0140`, `$0180`-`$01BF` |
| Random bytes for the scanner's static | `$0200`-`$02FF` |
| Landscape tiles, 32 × 32 corners, one byte each | `$0400`-`$07FF` |
| Object tables, 64 entries each: x, height, z, yaw, height fraction, type | `$0900`, `$0940`, `$0980`, `$09C0`, `$0A00`, `$0A40` |
| Drawing tables, 96 entries each: pitch low and high, x high, yaw low | `$0A80`, `$0AE0`, `$0B40`, `$0BA0` |
| Variables | `$0C00`-`$0CFF` |
| Code (BBC-derived) | `$0D03`-`$3695` |
| C64 angle-table code | `$3700`-`$395E` |
| Tables: play-screen rows, arctangent, half-angle tangent, bitmap rows, edge pixels, tile visibility | `$3A00`-`$3EFF` |
| C64 entry | `$3F00`-`$3FB3` |
| Play screen: five character sets | `$4000`-`$67FF` (VIC bank 1) |
| Sprite shapes: sights, scanner | `$7000`-`$70FF` |
| Screen matrix and sprite pointers | `$7C00`-`$7FFF` |
| Load-chain leftover, not called by the game | `$8000`-`$80FF` |
| BBC Micro font, character n at `$8000` + 8n | `$8100`-`$83FF` |
| Code (BBC-derived, moved) | `$8401`-`$889C` |
| C64 machine layer | `$8900`-`$9032` |
| SID frequencies | `$9033`-`$9232` |
| Code: maths, stars, fade, icons, interrupt, pan, sights, video | `$9280`-`$9AF6` |
| Object shapes: points, polygons, colours | `$9CA0`-`$A79F`, in pieces |
| Drawing tables: screen x, yaw | `$A7A0`-`$A85F` |
| Text printing and tokens, music, icons, sounds, sine | `$AA44`-`$ACFF` |
| Polygon edges while drawing; landscape generator workspace | `$AD00`-`$AEFF` |
| Fill pattern, unused | `$AF00`-`$AFFF`, `$B600`-`$BBFF` |
| Missing from this image | `$B000`-`$B5FF` |
| Angle table: yaw low and high, pitch low and high of every tile corner | `$BC00`-`$CBFF` |
| Title colour matrix | `$CC00`-`$CFFF` (VIC bank 3) |
| RAM under the I/O area: fill only; nothing banks the I/O out (`$01` stays `$35`) | `$D000`-`$DFFF` |
| Bitmap the view is drawn into, shown as it is on the title screens | `$E000`-`$FF3F` (VIC bank 3) |
| Vectors and the BBC-style entry points | `$FF40`-`$FFFF` |

## Timing

- **The raster interrupt** `$95E9` runs five times a frame (*live*: 504 in
  1,985,257 cycles). Each run rewrites `$D018` for the next 40-line band
  (`band_lines` `$9589`, `band_charsets` `$958E`); the game's per-frame
  work runs in one band only (`frame_band` `$9593`). `set_band_lines`
  `$9595` puts the lines at `$FD` − 8 × `$95` + 40k, kept within 51-250;
  with no vertical scroll they are 53, 93, 133, 173 and 213 (*live*:
  writes at 54, 94, 134, 174, 214).
- **Enemy timers** (`$0C20`-`$0C37`) are counted down at `$1317`, the BBC
  routine, which acts on one call in three (`$0C50`). The C64 calls it
  through a gate at `$130C` that adds `$CD` to `$1335` and goes on only
  on a carry: 205 frames in 256. *Live*, after the player's first action:
  1,000 frames gave 1,000 gate calls and 801 tick calls, so the timers
  count 50.125 × 205/256 / 3 = **13.38 times a second** on PAL. The BBC
  counted 16.7 a second.
- **The Sentinel turns** by 20/256 of a circle (28.1°), the step at
  `$9D37`, whenever its turn timer, set to 200 ticks at `$1813`, runs
  out: about every 15 s. *Live*: yaw 112 → 92 → 72 → 52 at 242,235,
  15,064,561 and 29,837,750 cycles, steps of about 752 frames (15.0 s).
  The wiki's "30° every ten seconds" is not what this version does.
- **Nothing turns until the player acts.** Bit 7 of `$0CE5` holds the
  enemy timers and the scanner; `$12E1` clears it on any action key,
  U-turn and hyperspace included, even when the action then fails. Pans
  do not wake them. *Live*: 20 s idle, the Sentinel's yaw stayed 112; 500
  frames before any action, 0 calls of `$130C`.
- **Draining**: an enemy that sees the player waits 120 ticks (`$1835`),
  then drains one unit per tactics cycle with the tactics timer set to 30
  ticks (`$1848`). *Live*: energy 2 → 1 → 0 with 2,595,000 cycles (2.6 s)
  between the last two units, then death. 30 ticks is 2.2 s; the other
  0.4 s has not been traced.
- **Keys** are polled from the interrupt (`$9678` → `$119F`); `$130B`
  holds polling off for one frame after each gameplay step (`$1284`).
- **Sound** is timed in frames: the interrupt calls `$FFC5` then `$FFC2`
  once a frame (`$9638`-`$963D`).
- **The pan step** (`$3668`-`$3694`): the interrupt sets bit 7 of `$0CD8`
  while `$0CC1` is not 0 (`$964F`-`$9656`); the main loop then moves the
  screen origin (`$96A6`), reads the raster line once and, if it is below
  230, spends about 400 cycles in a delay loop (`$3670`-`$367A`), and
  calls the missing `$B006`.

## Controls

All keys, no joystick: the traced code reads `$DC01` only in the key
test `$8CF9`, with a line driven on `$DC00`. A key's number is the bit
read on `$DC01` × 8 + the line driven on `$DC00` (`$8D04`-`$8D1C`), the
KERNAL's numbering transposed: A is `$11` here and 10 in the KERNAL.

| Key | Action | Where |
|---|---|---|
| S, D | pan left, right; with the sights on, move them | `$138D` table, `$10B7`, `$9958` |
| L, `,` | pan up, down (pitch limits `$35` and `$CD`, `$114B`) | same |
| SPACE | sights on and off, once per press | `$11AE`-`$11FE`, latch `$1236` |
| A | absorb | `$1B18` |
| T, B, R | create a tree, boulder, robot | `$1B18`, `$1BBA` |
| Q | transfer | `$1B18` |
| H | hyperspace | `$1B1F` → `$2156` |
| U | U-turn (yaw flipped by `$80`), once per press | `$1B2B`-`$1B39`, re-armed `$11EA` |
| 7, 8 | volume down, up: 16 levels, `$D418` = level / 8 | `$347D`-`$34A8` |
| CRSR ←→ | pause (the scanner turns solid) | `$34BA` |
| CRSR ↑↓ | continue | `$34BA` |
| F1 | abort to the title | `$11A3` → `$0C64` → `$1017` |

The table at `$138D` holds the 15 game keys as C64 key numbers in the
BBC's order; the slot table beside it (`$139C`) is the BBC's byte for
byte. *Live*: CRSR ←→ stopped the main loop (8,048 hits a second at
`$31D2` → 0) while the interrupt went on, and CRSR ↑↓ restarted it; 7, 7,
8 made 9 stores to `$D418`; F1 took the game back to the title.

The sights move within x `$10`-`$8F` and y `$20`-`$9F` (`$0CC6`,
`$0CC7`). Pushed past an edge they jump back by 64 and the view pans.

## Graphics

### The view is drawn into a bitmap, then copied into characters

- The 3D drawing code writes a multicolour bitmap at `$E000`-`$FF3F`
  (320 bytes a character row; row tables `$3D83`/`$3DB5`). Polygons
  (`$22AA`) and fills (`$2211`) draw only there.
- On the title and overview screens that bitmap is what the VIC shows:
  bank 3, bitmap mode, `$D011` = `$3B`, `$D018` = `$38`, colours in
  `$CC00`-`$CFFF` (`set_display_mode` `$9A51` with A = 0).
- In play, the VIC shows multicolour **text** in bank 1 (`$9A51` with A =
  `$80`): a screen matrix at `$7C00` filled with character codes 0-239
  (`$9AAC`), and five character sets at `$4000`, `$4800`, `$5000`,
  `$5800`, `$6000`, one per 40-line band. The bitmap is copied into them
  row by row (`$979D`, row addresses `$3A00`/`$3A20`). Rows 0, 5, 10, 15
  and 20, where the character set changes mid-row, are copied into both
  sets (`$3A40`). In `play-l0000.vsf` every bitmap row equals its copy.
  *Live*: the kit's renderer redraws a frame of play from the captured
  registers and memory with 0 of 104,448 pixels different.
- The character sets form a circular 40 × 25 screen. `$94`/`$95` are the
  column and row of its origin; a pan step (`$96A6`) moves them. Nothing
  in the image rewrites the matrix for a moved origin, and
  `set_band_lines` is called only from `$98BC`, so both are left to the
  missing `$B006`. With an `RTS` there (a test patch), a pan leaves the
  screen as it was, and the next full redraw shows the new view (*live*).
- Before a full redraw the screen is blanked to blue (`$358D`), and the
  visibility pass builds its corner-height tables in the play screen's
  own character sets, `$4000`-`$5F3E` (`$25C4`, called through `$245B` at
  `$35BA`); the redraw (`$98B2`) then copies the new view over them.

### Sprites, icons and the scanner

- **The sights are sprite 0**: an 11 × 11 cross at `$7000` (pointer
  `$C0`), placed at x = 2 × `$9B` + 14, y = `$F9` − `$9C` (`$99DC`),
  hidden by `$9A3C`. The BBC drew them into the screen.
- **The scanner is sprites 1-3** (`$7040`-`$70FF`) at x = 264, 288, 312,
  y = 51 (`$3F62`-`$3F93`). `$163F` fills four rows of them: state 0 off,
  4 static, 8 solid (pause). The static comes from the page of random
  bytes at `$0200`, read backwards through the operand at `$1671`, so it
  repeats every eight redraws.
- **The energy icons are characters 240-249**, copied from `$ABB0` into
  all five character sets (`$98E8`-`$98FD`) and written into screen row 0
  by `$9508`: a gold robot (246) for each 15 units, a robot for each 3 of
  the rest, then a tree (242-243) for 1 or a boulder (244-245) for 2. The
  scanner's frame is characters 247, 248 and 249 in columns 29-38. *Live*:
  10 units showed three robots and a tree; 9 three robots; 8 two robots
  and a boulder; 5 a robot and a boulder.
- **Stars**: `draw_stars` `$93F5` puts 40 dots into the bitmap per call,
  from a ×5 random generator of its own (`$93AE`); the overview calls it
  three times (120 stars; the BBC drew 240).
- **Game-over fade**: `$945F` scatters dots straight into the character
  sets; the decay loop at `$8801` makes 900 calls of 27 dots.

### Text

The game's text is ASCII and goes out through `$FFEE`, the C64's copy of
the BBC's OSWRCH (`$8A6B`). It draws the BBC Micro's own 8 × 8 font
(`$8100`-`$83FF`) as multicolour characters, two cells wide, on the
`$E000` bitmap: 20 × 25 characters. It handles VDU codes 4, 5, 8, 9, 10,
13, 17, 18, 25, 31, 127 and 32-126 (`$8B13`) and ignores the rest, the
bell (7) included, so the number entry's "buffer full" beep (`$3319`) is
silent on the C64. A PLOT keeps only its fifth byte: bit 7 set draws the
following characters one pixel row lower (`$8A8D`, `$8C3E`), which is how
the drop shadow's `PLOT 0,0,-4` comes out.

Messages are tokens. `$8617` prints token X: it takes an offset from
`$AA84`+X and prints the bytes from `$AA96` plus that offset until `$FF`,
each through `$3414`, which expands a byte of `$C8` or more as token
(byte − `$C8`) and hands anything else to `$AA6A`. `$AA44` prints a
character with a drop shadow by patching it into a 23-byte VDU sequence
at `$AA96` and sending that backwards, which draws it twice, offset; when
bit 7 of `$0C0F` is set it sends the character plain.

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

Tokens 7, 8, 9 and 12 were graphics-cursor moves on the BBC (`VDU
25,4,x;y;`); on the C64 they are TABs padded with three zero bytes, so
the offset table did not change. Tokens 1 and 2 put the answer on row
21, where the BBC used row 27. The game prints tokens 0 (`$1027`), 1
(`$1037`), 2 (`$105F`), 3 (`$1081`), 4 (`$8864`, the overview), 5
(`$1AA8`, the next landscape's code) and 6 (`$3632`).

Digits are printed with the letter O for zero (`$31F6`), in the input
field too. The title's `THE SENTINEL` is not text: 15 bytes at `$32C6`
(`$84`, `$D5`, `THE`, `$80`, `$C7`, `SENTINEL`) place 3D block letters,
each 4 tiles wide and 8 deep, made from the font's glyphs (OSWORD 10,
`$3225`) and drawn with object 63 (`$3204`, `$323A`).

### Colours

The BBC's colours are translated: the palettes at `$869D` and the
per-landscape tables `$14D4`/`$14F3` hold C64 colour codes (BBC red,
green, yellow, cyan and white became 2, 5, 7, 3 and 1), and the screen is
blanked with 6 (C64 blue) where the BBC passed 4 (BBC blue). `$1420` sets
colours 2 and 3 of the ground by the number of enemies placed: green and
white for one, cyan and red for four, yellow and red for eight (checked
against the overview screens of eight landscapes).

## Mechanics

| Rule | Where |
|---|---|
| Energy by object: robot 3, sentry 3, tree 1, boulder 2, meanie 1, the Sentinel 4, tower 0. The wiki's 4 for a sentry is not what the table says; the BBC's table is the same | `$214F`, added on absorbing at `$1B9E`-`$1BA4` |
| Energy is kept to 6 bits (`AND #$3F`), so it would wrap at 64 | `$2148` |
| Starting energy 10 (*live*) | `$1457` |
| Creating charges the energy first and refunds it if the object cannot be placed. *Live*: T, A, B, R took 10 → 9 → 10 → 8 → 5 | `$1BBA`, `$1BD5` |
| An object can stand on an empty tile, on a boulder (half a unit up) or on the tower (a unit up) | `$1F16` |
| A boulder can be absorbed by its side: a gaze within `$40` of the tile centre returns the boulder's top | `$1E48`-`$1E68` |
| Nothing can be absorbed once the Sentinel is gone, nor the tower | `$1B8E`-`$1B91` |
| Hyperspace costs 3 units and puts a new robot on a random tile below the player's height + 1; without 3 units the game ends (*live*: energy 10 → 7; with 2 units, game over) | `$2156`, `$1238`, `$1272` |
| Hyperspacing from the Sentinel's tile wins the landscape | `$2184`-`$219D` |
| The next landscape is the current number + the energy left, added in BCD. The carry out of the top digit is dropped, so a sum past 9999 starts again from 0000 (9990 + 15 would give 0005) | `$1A87`-`$1A95`, `$3462` |
| Losing restarts the same landscape without asking for its code | `$35F4`-`$3600` |
| Enemies drain objects down: robot to boulder, boulder to tree, tree gone; what an enemy takes it keeps (`$0C88`+n) and later turns back into trees | `$1A2D`-`$1A4B`, `$1A5D` |
| A meanie is made from a tree within 9 tiles of the target, whose tile the enemy can see; it turns 8/256 a step and forces a hyperspace when it sees the player | `$19B5`-`$19E0`, `$1728`, `$171D` |
| The game-over picture shows the culprit: `$0C1C` holds 5 (the Sentinel), 1 (a sentry), 4 (a meanie) or 0 (the player's own robot, after a hyperspace without the energy). *Live*: the Sentinel after a drain; the player's robot after H with 2 units | `$16C6`, `$1722`, `$1B24`, `$87DA` |

## Landscape generation

`work/port/landscape.js` ports these routines. It reproduces, byte for
byte, the tiles, the 64 object slots and the variables of eight
landscapes recorded in the emulator (0000, 0001, 0002, 0012, 0100, 1000,
4321, 9999; `work/traces/`), and all 10,000 codes of the published list.

1. **The seed.** A 40-bit shift register at `$0C7B`-`$0C7F`. The reset
   leaves it `00 00 01 00 00`; `$33ED` puts the landscape number, in BCD,
   into `$0C7B` (low) and `$0C7C` (high). Each number (`$31CA`) shifts the
   register eight times towards `$0C7F`, feeding in bit 3 of `$0C7D`
   exclusive-or bit 0 of `$0C7F`, and returns `$0C7F`. So the third number
   drawn is the landscape's high BCD byte, unchanged.
2. **The tiles** (`$2ACC`). 81 numbers are drawn and set aside; only the
   third is used again, by the anti-cracker code. The steepness is 24 for
   landscape 0000, otherwise 14 + a number from 0 to 22 (`$3451`). All
   1,024 corners get a number. Each corner is then averaged with the next
   three along its row, then along its column, twice; the lines wrap
   round, so the far edge is averaged with the near one. The result is
   scaled by the steepness to altitudes 1-11. Lone peaks drop to their
   higher neighbour and lone pits rise to their lower one, rows then
   columns, twice. Each tile gets one of 15 shapes (`$2C7C`), and each
   byte ends as altitude × 16 + shape.
3. **The enemies** (`$1420`). Landscape 0000 has one. Elsewhere a drawn
   number moves the thousands digit + 2 up or down by a count of its
   leading zero bits, redrawn until the result is 0-7, and the count is
   that result + 1 (`$3426`); below landscape 0100 it is capped at the
   tens digit + 1 (`$33ED`). The map is cut into 8 × 8 blocks of 4 × 4
   tiles; enemies go on the highest flat tiles, one per block, and each
   chosen block rules out its eight neighbours (`$14FB`). Enemy 0 is the
   Sentinel, standing on its tower, object 63.
4. **The overview is drawn** (`$8858`), before the player and the trees
   exist, which is why it shows neither.
5. **The player** (`$1450`): object 62, energy 10, on tile (8,17) in
   landscape 0000, otherwise on a random empty flat tile lower than the
   lowest enemy and lower than altitude 6; if none is found the limit
   rises by one (landscapes 1970 and 5395 need it).
6. **The trees** (`$147D`): 10 + a number from 0 to 22, at most 48 − 3 ×
   the enemies, each below the lowest enemy. Across the 10,000 landscapes
   that gives 10 to 32 trees; 916 of the 2,603 landscapes with eight
   enemies end at the limit of 24.
7. **The code** (`$14AA`): 43 more numbers, each made into two decimal
   digits by subtracting 6 from any nibble of 10 to 15 (`$339A`);
   numbers 39 to 42 are the eight digits. Digits 4-9 are twice as likely
   as 0-3. Landscape 0000's code, 06045387, is also stored at `$108C`.

1,212 to 1,880 numbers are drawn per landscape. No two of the 10,000
codes are the same.

### The anti-cracker code

The BBC's traps survive:

- The landscape builder at `$2ACC` is called from `$1071`. Unless it is
  only showing a code (bit 7 of `$0C71`), it rewrites its own return
  address on the stack (`$2C19`-`$2C26`), so it returns not to `$1074` but
  to `$8817`, a `BMI $8858` hidden in the operand of a `JMP` at `$8816`.
  `$8858` places the enemies, draws the overview while the screen is
  still blank, places the player and the trees and checks the code.
- The check (`$14AA`) compares each of its 43 numbers with a byte of the
  typed code's area and rotates the results into `$0C65`; `$14DC` wants
  bits 1-4 set. Only then does it drop its own return address and
  "return" into play at `$356D`, an address computed from the Sentinel's
  object flags (`$14E5`-`$14F2`); `$356C` is a decoy byte. A wrong code
  returns to `$886F`, which jumps to WRONG SECRET CODE at `$1074`.
- The third seed number is copied into the operand of an `LDA #` at
  `$0F3C`, after an `RTS` and a data byte, that nothing jumps to
  (`$2C5C`). Play sets `$0C75` to that number + 1
  (`$18A2`, in the enemies' sight check). Each 3D character drawn compares
  the two (`$322F`), and while `$0C75` is lower it draws one extra seed
  number (`$31A2`, a `BCC` into `$31CA`), so a code shown without the
  landscape having been played comes out wrong. Below landscape 0100 the
  number is 0 and the test cannot fail.
- A 43-byte stash is written over page `$3F` (`$14C7`), the start-up code
  on the C64 (a screen buffer on the BBC), and read back at
  `$254F`-`$2570`. A snapshot taken after a landscape is built therefore
  cannot be restarted at `$3F00`.

## Corner cases

What the tests that sort values into classes actually let through
(`opcodes.py --refs` was run on every address this file calls unread).

- **The pitch limits are tested for equality** (`$1102`: `CMP $1149,Y`,
  `BEQ`), not as a range. That holds because every pitch the player can
  have is `$F5` + 4k: `$1F7E` sets `$F5` when an object is placed, and a
  pan step adds or takes 4. The limits `$35` and `$CD` sit 16 steps above
  and 10 steps below the starting pitch. The other writers of pitch
  (`$8839`, `$13CB`) set up the title and overview cameras, not the
  player.
- **Energy is kept to 6 bits** (`$2148`), so 64 would read as 0. By the
  placement rules no landscape holds more than 62 units in all: landscape
  0340, with eight enemies (the Sentinel 4, seven sentries 3 each), 24
  trees, the player's 10 and the starting robot's 3. If energy is
  conserved, as the manual says and `$1A4F`/`$1A5D` show for what the
  enemies take, the wrap is never reached.
- **A tile byte of `$C0` or more means an object stands there** (`CMP
  #$C0` at `$1257`, `$1ACF`, `$1B57` and elsewhere). A tile's own byte is
  at most `$B0` + 15: altitude 11 at most, times 16, plus the shape.
- **The next landscape past 9999** drops the carry (`$1A93`): 9990 + 15
  units gives 0005.
- **Transfer takes only a robot** (`$1B64`: type 0), **absorb refuses the
  tower** and everything once the Sentinel's slot is free (`$1B8E`-`$1B9A`),
  and an enemy drains only a boulder standing alone, or the top of a
  stack when that is a tree or a boulder (`$1AB0`-`$1AE1`).

## Data tables

| Table | Where |
|---|---|
| Object shapes: first point, first polygon and drawing phase per type | `$9CA0`, `$9CAB`, `$9CB6` |
| Point yaw, height (sign in bit 7), distance from the axis | `$9DE0`, `$9F20`, `$A060` |
| Polygon data: bits 0-1 sides − 3, bits 2-3 fill colour, bits 4-5 edge colour, bit 7 drawing pass | `$A1A0` |
| Polygon point lists (addresses at `$A2E0`/`$A420`): Sentinel `$A560`, tree `$A600`, boulder `$A643`, tower `$A66D`, 3D letters `$A6A0`, robot `$A6B4`, sentry `$A72F`, meanie `$9CCD` | |
| Enemy turning steps, ±20 | `$9D37` |
| Arctangent (entry n = arctan(n/256) in 1/256 turns, 16 bits) and the tangent of the half angle (512 × tan(½ arctan(n/128))), identical to the BBC's | `$3B00`, `$3C01`, `$3D02` |
| Sine, 128 entries | `$AC80` |
| SID frequency for pitch n = round(2100 × 2^(n/48)): quarter semitones, 48 to the octave, 123.3 Hz at 0 on PAL; entries 239-255 wrap | `$9033`/`$9133` |
| Seven sound blocks, three pitch-effect records | `$AC00`, `$AC40` |
| Music | `$AB50` |
| Energy icons and scanner frame, characters 240-249 | `$ABB0` |
| Keyboard maps, ASCII by key number, with and without SHIFT | `$8FB3`, `$8FF3` |
| Tile visibility, one bit a tile | `$3E80` |

## Sound

The BBC's SOUND and ENVELOPE become the C64's own OSWORD 7 (`$8DB4`),
which takes an 8-byte block (`$3470` passes block n at `$AC00` + 8n):

1. voice
2. SID control byte
3. attack/decay
4. sustain/release; the low nibble also picks a release time in frames
   from `$8EC1`
5. pitch, looked up in `$9033`/`$9133`
6. pulse width in bits 0-3; with bit 7 set, the pitch is shifted down
   (bits 4-6) + 1 octaves
7. duration in frames (`$80` and up: held)
8. pitch-effect offset at `$AC40` (`$80`: none)

The seven sounds: 0 enemy turning (`$181D`), 1 meanie turning
(`$1750`), 2 create and absorb (`$12EE`, held), 3 music notes, 4 the
scanner (`$3568`), 5 the ping (`$1A1F`; also after a volume key, `$34B2`,
and at pitch 170 for a refused action, `$1BAB`-`$1BB5`), 6 game over,
falling from pitch 230 (`$87CB`) to 60 (`$3540`-`$355A`). The three
pitch effects are the pitch half of the BBC's envelopes 2, 3 and 4, for
the music, the scanner and the ping, stepped once a frame (`$8F0C`).

Music (`$34DE`, data at `$AB50`): a byte of `$C8` or more sets the wait
after each following note to (byte − `$C8`) × 4 frames; other bytes are
notes, played as sound 3 on the three voices in turn (`$3504`-`$3510`);
`$FF` ends a tune. `$888F` starts the music at an offset:

| Offset | When | Where |
|---|---|---|
| 0 | hyperspace | `$2181` |
| 25 | transfer | `$1B82` |
| 40 | U-turn: the last notes of the transfer tune | `$1B3C` |
| 50 | game over | `$87F6` |
| 66 | landscape finished | `$3627` |

## The BBC operating system, rebuilt

`$8900` writes six `JMP`s at the BBC's operating-system addresses, and
the BBC code calls them unchanged:

| Address | BBC | C64 target and what it does |
|---|---|---|
| `$FFEE` | OSWRCH | `$8A6B`: the text driver above |
| `$FFE0` | OSRDCH | `$8D2C`: waits for the last key returned to be released, scans for one held, and returns its ASCII (`$8FF3`, or `$8FB3` with SHIFT); never reports Escape |
| `$FFF4` | OSBYTE | `$8F78`: only `$81` (test a key, `$8CF9`) and `$15` (silence a voice); anything else returns, including the Escape acknowledgement `$7E` at `$8639` |
| `$FFF1` | OSWORD | `$8D81`: only 7 (sound) and `$0A` (read a glyph from `$8000` + 8 × code) |
| `$FFC2` | GSINIT | `$8ED1`: the sound's note timer, once a frame |
| `$FFC5` | GSREAD | `$8F0C`: the pitch effects, once a frame |

`$8642`, where the BBC enabled the keyboard before a key is read, is a
bare `RTS`.

## Hardware registers

The census of every absolute access to `$D000`-`$DFFF` in the traced code.

| Register | Use | Where |
|---|---|---|
| `$D000`-`$D007`, `$D010` | sprite 0 to 3 positions | set at `$3F62`-`$3F88`; sprite 0 moved by `$96D6`-`$9722`, `$99E6`-`$9A0A`; `$D010` also at `$134C`, `$1351` in BBC-derived code |
| `$D011` | screen on, mode, raster high bit | `$8986` (init), `$95D2`-`$9615` (interrupt), `$9A6A`, `$9A96` |
| `$D012` | raster compare; read once before a pan step | `$95CF`, `$960D` (interrupt), `$9A7D`; `$3670` |
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
| `$DC00`-`$DC03` | keyboard: line out, bits in, directions | `$8CFC`-`$8D17` |
| `$DC0D`, `$DD0D` | interrupt control | `$8979`, `$897C`, `$8F99`-`$8FA4`, `$95E1`, `$95E4` |
| `$DD00`, `$DD02` | VIC bank | `$8A09`-`$8A18` (bank 1 at start), `$9A58`-`$9A91` |

No joystick port is read in the traced code: `$DC00` is written (a
keyboard line) and `$DC01` read, only in the keyboard scan at `$8CF9`.
What the missing `$B000`-`$B5FF` touches is unknown.

## Strings

The sweep of the whole image for ASCII and screen-code runs of five or
more characters found the tokens above, `THE SENTINEL` at `$32CD`, the
BBC BASIC error messages, the keyboard tables and the font. Everything
else it printed is code or table bytes that happen to fall in the
printable range.

## Leftovers

- **BBC BASIC.** The gaps between the tables at `$9C03`-`$9C9F`,
  `$9D40`-`$9DDF`, `$9E80`-`$9F1F`, `$9FC0`-`$A05F`, `$A100`-`$A19F`,
  `$A240`-`$A2DF`, `$A380`-`$A41F`, `$A4C0`-`$A55F`, `$A860`-`$AA43`,
  `$AC38`-`$AC3F` and `$AC55`-`$AC7F`, and the run-time table at
  `$A7A0`-`$A7FF` in the image, hold BBC BASIC's own code at BASIC's own
  addresses: SQR at `$A7B4`, whose `BMI` reaches error 21 `-ve root` at
  `$A7A9`; the SIN and COS range reduction at `$A9D3`, whose `BCS` reaches
  error 23 `Accuracy lost` at `$AA38`; log10 e and ln 2 in BASIC's
  five-byte float form at `$A869` and `$A86E`; error 19 `String too long`
  at `$9C04`. Nothing in the game reads them. At BBC addresses (C64 −
  `$5300`) the gaps are the BBC version's screen-buffer rows and the
  routines the C64 moved to `$9280`.
- **The load chain**: `$0800 JMP $8080`, and at `$8080` a stub that
  copies `$5C00`-`$80FF` to `$0800`-`$2CFF` and jumps to `$0816`.
- **Unread tables**: the BBC's sights tables (`$9A17`-`$9A3B`,
  `$9A45`-`$9A50`, `$9CC1`-`$9CCC`, `$3DE7`-`$3DFF`), a BBC-to-C64 colour
  table at `$8CF1`, the first character code of each screen row at
  `$3A60` (which only the missing code could use), and four glyphs that `$89C5` patches into the font
  (an arrow, a centred dash, two blocks) and nothing prints.
- `$6800`-`$6FFF` and `$7100`-`$7BFF` hold what looks like a multicolour
  picture that nothing in the image reads; the missing `$B000` code is
  the only candidate.

## Open questions

- What `$B000`-`$B5FF` holds, beyond having to scroll the play screen.
- The drain interval measured (2.6 s) against the tactics timer read
  (30 ticks, 2.2 s).
- How BBC BASIC's own code came to fill the gaps of the C64 build.
- `$897F` writes `$64` to `$D019` where `$9A7B` puts the same value in
  `$D012`: possibly a slip, with no visible effect.
- The text driver does not check its position: a row of 25 or more would
  draw past `$FF3F` (`$8AA4`, `$8AAE`); the game never asks for one.
- `$1515`: if the heights run out before every enemy is placed, the enemy
  count becomes `$FF`. None of the 10,000 landscapes reaches it.
- Quit may not work while paused (`$967E` resets the key slots); not
  tested.

## Live tests

| Test | Result |
|---|---|
| Hit counts over 1,985,257 cycles of play, landscape 0000 | `$95E9` 504 (five a frame), `$8F98` 0, `$8F9E` 0, control `$31D2` 16,081 |
| Blank `$E000`-`$FF3F` and `$CC00`-`$CFE7` at the hand-over, run | the whole title is drawn again within about 12 s: the title picture is the game's output |
| Store and execute checkpoints on `$B000`-`$B5FF` from the hand-over to the first view | 0 and 0, against 3,357 interrupt entries |
| Hold S on the first view, execute checkpoint on `$B000`-`$B5FF` | stops at `$B006`, called from `$367C`, after 0.6 s |
| Objects of landscape 0000 in play | #0 the Sentinel at (12,4), yaw 112; #63 its tower; #62 the player at (8,17); #46-#61 sixteen trees |
| Sights on, aim at a flat square, T, A, B, R (test patch at `$B006`) | energy 10 → 9 → 10 → 8 → 5; a tree, then a boulder with a robot on it |
| Q, then wait, seen by the Sentinel | the scanner fills; energy 2 → 1 → 0, 2,595,000 cycles apart; the Sentinel drawn in dots; the overview again |
| H with 10 units; with 2 units (poked) | 10 → 7 and a new view; game over, the player's own robot shown |
| Landscape 0001 with 12345678, then with 02254153 | WRONG SECRET CODE; the overview of landscape 0001 |
| Eight landscapes entered through the prompts with the published codes | all accepted; their tiles, objects and variables dumped to `work/traces/` and matched by the port |
| The Sentinel's yaw idle, then after a U-turn | unchanged for 20 s; then 20/256 of a turn every ~752 frames |
| Enemy timer calls over 1,000 frames after waking | `$130C` 1,000, `$1317` 801: 13.38 ticks a second |
| CRSR ←→, then CRSR ↑↓ | the main loop stops while the interrupt runs and the scanner turns solid; then it runs again |
| 7, 7, 8 | 9 writes to `$D418` |
| F1 in play | back to the bitmap display (`$9AF6` = 0) and the title |
| `frame.py capture` of the first view | 0 of 104,448 pixels differ from the emulator's picture |
