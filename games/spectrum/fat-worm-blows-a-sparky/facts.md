# Fat Worm Blows a Sparky — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names the
routine or table it comes from, and how it was checked:

- **traced**: read in the code of `work/entry.sna` (the image as loaded;
  `orientation.md`) at the addresses given.
- **simulated**: the routine was run in SkoolKit's Z80 simulator on the
  snapshot's memory (`kit/spectrum/simulate.py`) and its registers and
  writes compared with the stated result, or with a model over many inputs.
- **live**: observed in ZEsarUX 13.0, stopped between steps, with input
  held for whole passes of the frame loop ("Live tests", at the end).

A "pass" is one trip round the frame loop at `$7638`. A "unit" is one
256th of a board cell's side; positions are 16-bit, the high byte whole
units inside the cell.

## Build

Read from `work/fat-worm-blows-a-sparky.tzx` with SkoolKit's `tapinfo.py`
and compared byte for byte with the snapshots, 3 October 2026.

| Block | What |
|---|---|
| text | `Created with Ramsoft MakeTZX` |
| header, then 96 bytes | the BASIC program `FAT`, auto-run from line 10 |
| header, then 192 bytes | `WORM`, 190 bytes of code for `$FAF2` (64242) |
| turbo block, 49,002 bytes | a flag byte of 0, the 49,000-byte image for `$4000-$FF67`, a parity byte |

- The BASIC is `10 POKE 23624,0: POKE 23693,0`, `15 CLEAR 65535`,
  `20 LOAD "WORM"CODE`, `30 RANDOMIZE USR 64242`.
- The turbo block's pulses are 453 and 709 T-states for a 0 and a 1 (the
  ROM's are 855 and 1,710), after a pilot of 4,833 pulses of 2,020
  (`tapinfo.py`). The whole tape took 140 seconds to load at real speed in
  the emulator (live).
- **The loader is the ROM's `LD-BYTES` with different numbers.** Its 190
  bytes are a nine-byte preamble (`XOR A`, `SCF`, `LD IX,$4000`,
  `LD DE,$BF68`) followed by a copy of the ROM's loading routine from
  `$0556`, with its timing constants changed, its border mask changed
  from `AND $07` to `AND $02`, and the return address it pushes changed
  from the ROM's `$053F` to `$EFD8`, the game's entry (traced in the tape
  block; ROM read from the emulator).
- **The image contains the loader that is loading it.** The 49,000 bytes
  cover `$FAF2-$FBAF`, where the loader is running. They hold the same
  code: the image and the loader differ only at `$FAF2-$FAFA` (the
  preamble, already executed) and `$FB04-$FB05` (the pushed address,
  already pushed), so nothing still to run changes under the loader
  (loader block compared with the turbo block at the same addresses).
- **A failed load starts the game anyway.** The ROM routine reports
  failure in the carry flag to the code at `$053F`. Here every exit, the
  error exits included, returns to `$EFD8`, and the entry stub does not
  look at the flag. Live: with a copy of the tape cut off 20,000 bytes
  into the turbo block, a stopping checkpoint at `$EFD8` fired with carry
  clear, `IX=$8E1F` and `DE=$7149` (29,001 bytes not loaded).
- From `$5B00` up, `work/entry.sna` equals the tape's 49,000 bytes except
  at `$7CCB-$7CCC` (the first screen's print position) and `$EFFC-$EFFF`
  (stack).

## Memory layout

| Range | What |
|---|---|
| `$4000-$5AFF` | the loading screen as loaded; the screen in play |
| `$5B00-$61FF` | seven 256-byte sprite shift tables, page `$5A+s` for a shift of `s` pixels |
| `$6200-$62FF` | bit-reversal table |
| `$6300-$637F` | perspective curve, 128 bytes |
| `$6380-$63BF` | slope table, 64 bytes |
| `$63C0-$63FF` | quarter sine, 64 bytes |
| `$6400-$6431` | the starting 5 by 5 grid of cell addresses |
| `$6432-$6463` | the live grid: the 5 by 5 cells round the worm, centre at `$644A` |
| `$6464-$757B` | the board: 129 cells, then `00 FF` |
| `$757C-$757E` | `JP $EB9C`, which nothing reaches |
| `$757F-$7F42` | new game, frame loop, bugs on the worm, end of game, panel, keys, first screen |
| `$7C71-$7E71` | the object pool in play: count, end pointer, up to 17 records of 30 bytes. It grows over the first screen's code and text |
| `$7F43-$80EA` | variables |
| `$80EB-$8EFE` | perspective, object drawing by type, rectangle fill |
| `$8EFF-$9A88` | fill masks, trapezoid and quadrilateral fills |
| `$9A89-$A8C0` | the worm: surface probe, head, cell crossing, body |
| `$A8C1-$B718` | sine and multiplies, velocity on a slope, display list, the legged bug |
| `$B719-$BF26` | masked picture plotter, the disk and the hand, the counter display, the five board handlers |
| `$BF27-$CE09` | picture tables and pictures |
| `$CE0A-$D045` | insert map |
| `$D046-$D429` | halt screen |
| `$D42A-$E46E` | spawner, object walk and the object types' handlers, movement probe |
| `$E46F-$E507` | random generator, worm width table, sound scripts |
| `$E508-$E9E5` | menu, key redefiner, tune, messages, text printer |
| `$E9E6-$EB7D` | buffer copy, buffer clear, floor |
| `$EB7E-$EB9B` | display list head, 13 unused bytes, a leftover record |
| `$EB9C-$EC6A` | the routine that made the tape; in play, display list records from `$EB9C` |
| `$EC6B-$EFD7` | zero on the tape; the display list grows up into it and the stack down |
| `$EFD8-$EFF8` | entry stub |
| `$F000-$F8FF` | the bottom panel's picture, copied to the screen once |
| `$F000-$FFFF` | in play, the frame buffer |
| `$FA24-$FF43` | a tape utility, never run by the game |
| `$FF44-$FF67` | the top of BASIC's memory as the author left it |

## Timing

- **Interrupts are off for the whole game.** The entry stub executes `DI`
  at `$EFDA`. Of the 11,594 instructions in the code map below `$FA24`,
  none is `EI`, `HALT`, `IM` or `RST`, and none calls or jumps to an
  address below `$4000`; the only other `DI` is in the tape-making routine
  at `$EB9C` (operand scan of `work/codemap.json`).
- **The frame loop is `$7638`.** Two instructions jump to it: `$7635` at
  the end of the new-game code and `$779D` at the end of the loop.
- **A pass takes about six to nine display frames**, depending on what is
  in view. Live, 120 consecutive passes from the start of a game (60
  straight, 60 turning): 403,280 to 597,120 T-states a pass, mean
  494,056, which is 5.9 to 8.7 passes a second and 5.8 to 8.5 display
  frames. The independent check's 120 passes (60 with no key, 60 turning
  the other way) ran from 403,145 to 651,650, mean 487,145. The game does
  not wait for the display.
- The 16-bit frame counter at `$8059` gains 1 a pass (`$7638`).
- The copy of the buffer to the screen costs 72,826 T-states with no
  clicks, and the fill part of the clear 25,242 (simulated).

## Controls

- `$7C13` builds the control byte `$8057` once a pass. Bits: 0 right
  (default key P), 1 left (O), 2 faster (Q), 3 slower (A), 4 halt (H),
  5 blaster (SPACE), 6 burper (1), 7 end game (G). Live for bits 0-3, 5
  and 6 by reading `$8057` with each key held; H and G by their effect.
- The eight key codes are at `$7BE0-$7BE7`, bit 7's first:
  `06 24 20 01 26 25 1A 22`. `$7BE8` tests one code with `IN A,($FE)`.
- Turning adds or subtracts `$0C` of 256 a pass; faster adds 1 to the
  speed up to a stored 11, which `$763F-$7648` cuts to 10 before the move;
  slower subtracts 3 down to 0 (live: 0, 1, ... 10, 11, 11; then 7, 4, 1,
  0).
- From the fourth pass of a fall, and for the pass in which the head is
  over no cell, the controls are discarded (`$769C-$76AB`; live).
- **Kempston**: read at `$7C32` (`IN A,($1F)`) only while `($E868)` is
  `$0E`. The menu's key 2 toggles that byte between `$0D` and `$0E`
  (`$E533`); it is also the attribute the menu line is printed in. Live:
  right gives `$01`, left `$02`, down `$08`, up `$04`, fire `$20`, fire
  with down `$48`; with the option not chosen the joystick changes
  nothing.
- **No other joystick is read.** The image's port reads are `$7B91`
  (`IN A,(C)`, key redefiner), `$7BFC`, `$7CA9`, `$D33E`, `$E5B3` (port
  `$FE`) and `$7C32` (port `$1F`); its writes are to `$FE` at `$E755`,
  `$EA8A`, `$EAD3`, `$EAEC` and `$EFF4`.
- The redefiner (`$E544`) names the controls BLASTER, BURPER, FASTER,
  SLOWER, RIGHTER, LEFTER, BOUNCER and ABORTER, and accepts any of the 40
  keys, duplicates included (`$E882` text, `$7BD8` row to slot; traced).
- `$7B8B`, which waits for one key, starts its scan again while two keys
  are down, so it returns only with a single key (simulated).

## Graphics

### The screen and the buffer

- Play is drawn in a buffer at `$F000-$FFFF`: 128 rows of 32 bytes. Buffer
  byte `$F000 + 32y + x` is screen pixel row y, byte column x, of the top
  two thirds of the screen. A set bit shows as ink (`$EAA9`, `$E9E8`).
- `$EAA9` clears it: `SP` to 0, then 2,048 `PUSH DE` with `DE = $FFFF`
  fill `$FFFF` down to `$F000`, every pixel set (simulated).
- `$E9E8` copies it: `SP` to `$F000`, 2,048 `POP DE`, each written to
  `$4000-$4FFF` in the display file's own row order (simulated with a
  patterned buffer: 4,096 bytes right, nothing above `$4FFF` written).
  Live: stopped at `$766E`, just after the copy, the buffer equals screen
  rows 0-127 byte for byte.
- A new game sets the attributes `$5800-$59FF` to `$44`, bright green ink
  on black (`$757F`; live). The bottom third is the panel, copied once
  from `$F000-$F8FF` by `$7F30` (2,048 bytes of bitmap to `$5000`, 256 of
  attributes to `$5A00`) before the menu.

### Perspective

- A display-list record holds an outline (x1, y1, x2, y2, relative to the
  worm) and two heights. For each height byte h, `$80EB` reads
  `c = ($6300 + h/2)` and `$811E` turns each coordinate v into
  `v x (128 + c) / 128`, truncated toward zero; `$81DB` then adds 128 to
  x and 64 to y, the middle of the buffer (simulated: 4,000 random records
  through `$81DB` against a model, no mismatch).
- `$811E` scales only values from -192 to 191; anything else comes back
  unchanged (`$8124-$8128`, `$817A-$817F`; simulated).
- The curve at `$6300` is within 1.2 of `128 x h / (384 - h)` for height h
  (index h/2), so a point at height h is magnified by about
  `384 / (384 - h)`: the view is from 384 units above the board (computed
  from the 128 bytes).
- For curve bytes of 171 or more (heights from `$DC`) the multiply loses a
  carry when `abs(v) x c` reaches 32,768 and returns a size 256 too small.
  `simulate.py 811E HL=00BF B=B0` returns 197 where the product is 453.
  Six board items have tops from `$E0` to `$F8`.
- **A box is two rectangles**: the outline at its bottom height and at its
  top height. Each of the four walls is drawn only when its bottom edge and
  top edge are in one order, tested at `$9011-$901C` and `$9595-$959F`, so
  a wall shows only on the side of the object that faces the middle of
  the view (simulated).
- The view never turns: the outline is scaled and moved, never rotated.
  The worm's heading goes into its movement, not into the projection.

### Object types on the board

A board item's type byte (`$827B`, `$89B8-$8A0F`):

| Bits 7-6 | Shape | Routine |
|---|---|---|
| `$C0` | box | `$89B8` |
| `$80` | ramp along x (bits 5-4 = `$10`: high at low x; else high at high x) | `$8ABC` |
| `$40` | ramp along y, the same way | `$8BC3` |
| `$00` | box cut on a diagonal, four orientations by bits 5-4 | `$8C84` |

- Bits 1-0 choose one of four 8-byte pattern sets at `$80CB`: three words,
  for the y walls, the top and the x walls, and one unused (`$825F-$8276`).
- For a plain box (`$C0-$DF`), bits 4-2 say which faces are drawn: 0 all
  five, 1 walls only, 2 no x1 wall, 3 no x2 wall, 4 no y1 wall, 5 no y2
  wall, 6 top and y walls, 7 top and x walls (`$8A12`; simulated).
- Types with bits 7-5 set are picked out by value at `$89B8`:

| Type | Drawn by | What |
|---|---|---|
| `$E0` | `$84E4` | box with a three-digit seven-segment readout on its top |
| `$E1` | `$8482` | pyramid |
| `$E2` | `$89A6` | box with its own shading: a data bus |
| `$E3` | `$8833` | box wrapped in moving stripes: a de-bugger |
| `$E5` | `$8667` | spiked ball in four sizes with a shadow on the ground: a Sputnik |
| `$E6` | `$870F` | a 16 by 15 picture named by the record: an explosion |
| `$E8-$EF` | `$84C8` | box, every face a 50 % chequer |
| `$F1` | `$83DC` | spark sized by its width on screen: a sparky |
| `$F2` | `$85D2` | speckled disc sized by width; no board item has this type and no instruction loads the value |
| `$F3` | `$840A`, `$B36A` | six-legged bug, or three small pictures when its width byte is 7: a Crawly |
| `$F4` | `$874C` | box with four triangles that pulse: an eruption pad |
| `$F5` | none (`$8A08`) | nothing: the de-bugger's pad |
| `$F6` | `$BB06` | the floppy disk |
| `$F7` | `$860A` | spindle, four pictures |
| `$FA` | `$851C` | one section of the worm |
| `$FB` | `$863F` | a 16 by 16 spark: an eruption point |
| `$FF` | none (`$89BF`) | nothing |

### Filling

- Every face is reduced to rectangles and to trapezoids with a horizontal
  top and bottom. The fill byte is the complement of `($80BE)`; when
  `($80BF)` is not 0 it is XORed in on alternate rows, which is the
  dither (`$8F9B-$8FAB`, `$93CB-$93DB`, `$9565-$956B`; simulated).
- **Rectangle** (`$8E13`, `$8E30`, `$8E67`): clipped to 0-255 by 0-127;
  the columns x1 and x2 are cleared on every row; bit 7 of `($80B4)` adds
  a cleared first and last row; so the outline comes with the fill
  (simulated against a pixel model, 700 rectangles).
- **A row is a computed jump.** The `JP` at `$8F87` goes into a chain of
  32 pairs of `INC L / LD (HL),A` at `$8F34-$8F73`, 11 T-states a byte.
  `$8EAE` and `$9412` write its operand: `$8F76 - 2n` for a span of n
  byte columns, n from 1 to 31 (and `$8EAE` writes `$8F75` for a span of
  none). The lowest entry is therefore `$8F38`, and the first two pairs,
  `$8F34-$8F37`, are never entered (simulated for every span from both
  writers).
- **Trapezoid** (`$90F9`, with `$9270` and the row at `$93E1`): the same
  fill between two edge pixels, then one step for each edge. Each edge
  has five straight-line bodies, and one is chosen for the whole
  trapezoid by rewriting the displacement of a `JR`: `$942E` for the
  right edge (`$00`, `$06`, `$23`, `$4B`, `$6F`, to `$942F`, `$9435`,
  `$9452`, `$947A`, `$949E`) and `$94C9` for the left (`$00`, `$06`,
  `$2C`, `$55`, `$70`, to `$94CA`, `$94D0`, `$94F6`, `$951F`, `$953A`).
  The cases are: vertical or pinned to the buffer's side; leftward,
  slower or faster than one pixel a row; rightward, slower or faster.
  The row step is the operand of `LD BC` at `$9561`: `$0020` downward,
  `$FFE0` upward. (Simulated: a model of `$90F9`, `$9590` and `$9819`
  compared with the code over the whole buffer for 2,920 trapezoids and
  1,920 quadrilaterals, no mismatch.)
- Sideways clipping is not computed: the walk starts from the end inside
  the buffer, an edge reaching its own side is pinned there, and an edge
  reaching the far side ends the fill (`$9042`, `$9494`, `$94EC`).
- Cost (simulated): a plain rectangle row is 107 T-states plus 11 a byte
  column after the first; a trapezoid row with vertical edges 486 plus
  11. At 81 pixels wide a rectangle row costs 206 T-states and a
  trapezoid row 585.
- `$9579`/`$9590` fill a quadrilateral with vertical left and right
  sides, `$9819` a convex one from four corners at `$801B-$8029`, split
  into three bands by `$993E`. Before drawing, `$9819` tests which way
  the corners run and which is highest (`$9890-$98BC`), and returns
  without drawing when the tests fail.

### The display list

- Head: the word at `$EB7E`. Records are 15 bytes, allocated from
  `$EB9C` by the pointer at `$8047`: +0 link, +2 x1, +4 y1, +6 x2, +8 y2
  (whole pixels from the worm), +`$0A` the address of the source (board
  item, pool record or worm entry), +`$0C` top height, +`$0D` bottom
  height, +`$0E` type. A link with a zero high byte ends the list
  (`$AAF3-$B044`, `$B2F4`).
- `$AAF3` builds it each pass: the worm's four records are filled; the
  nine cells round the worm are walked, centre first, each cell's items
  in data order (`$AEF9`, `$AF37`); the object pool is walked from its
  end to its start (`$AE3E`); the worm's four records are inserted last
  (`$AED8`).
- An item is listed only if it lies in the window x1 <= 127, x2 >= -128,
  y1 <= 63, y2 >= -64, its bottom byte is not `$FF`, and it is not a
  handler record (`$AF73-$AFF1`; simulated, 40,000 records).
- `$B008` inserts each record after the last listed record that
  `$B045` puts it after. Records whose heights overlap or touch are
  ordered by position, the one nearer the middle of the view later;
  records apart in height whose outlines overlap are ordered by height.
  The list is not sorted again (simulated: 60,000 comparisons and 4,760
  insertions against a model).
- `$B2F4` walks the list and calls `$81DB` for each record: its only
  caller of `$81DB`.
- Nothing compares the allocation pointer with a limit. `$EC6B-$EFD7` is
  free, so 72 records fit between `$EB9C` and the entry stub at `$EFD8`.
- `$AAF3` begins `LD HL,$EB8D` / `LD HL,$0000`: the first load is dead.
  It stores 0 in the head, then `XOR A` / `LD (HL),A` / `INC HL` /
  `LD (HL),A` store into `$0000` and `$0001`, which are ROM. Live: at
  `$AAFD` `HL` is 0, at `$AAFF` it is 1, and the ROM's bytes stay
  `F3 AF`.

### The worm, the floor, pictures and text

- The worm is four records of type `$FA`, one for each 16-byte entry at
  `$7F54`. Each is drawn by `$851C` as a quadrilateral between that
  entry's two edge points and the entry in front's; an entry whose bug
  count (+6) is not 0 is filled with a different pattern and gets a
  speckled disc (`$851C-$85D1`; simulated).
- The worm's points are magnified by `(128 + height) / 128`, the height
  byte going straight into `$811E`, where a box uses the curve. At height
  `$30` a point 30 pixels from the middle goes to 41 for the worm and 34
  for a box top (`$ACDC-$ACE3`; simulated).
- Each pass one of the four sections is drawn narrower: `$7653-$7659`
  set `($8067)` to (frame counter AND 3) + 1, and `$AC4C-$AC59` add the
  speed to that section's index into the 31-byte width table at
  `$E48C-$E4AA`.
- The floor (`$EB2B`): each of the nine cells is either blanked, when
  there is no cell there, or given 7 to 14 single cleared pixels at
  places from `$B350`, which returns `1509 x HL + 41`, seeded with the
  cell's address (simulated: `HL=0001` gives `$060E`).
- Pictures are plotted by `$B7E3` with a mask: each buffer byte becomes
  `(byte OR mask) XOR picture`, at any pixel column, through the shift
  tables at `$5B00-$61FF`; rows are 4 bytes (16 pixels wide) or 6 (24).
  Twelve stored opcodes at `$B8A4-$B9ED` are rewritten as `LD (HL),A`
  (`$77`) or `NOP` to clip at the left and right (simulated: 1,400 plots
  against a model).
- Sparks and discs come in sizes 1 to 20 rows from two tables of 25
  addresses, `$BF27` and `$BF59` (`$B797`, `$B7B6`); rows are 6 bytes
  from size 17 up (`$B7DB`).
- Text (`$E95D`): a byte with bit 7 set is a message number, its address
  the word at `$E795 + 2 x (number AND $7F)`; inside a message `$00`
  ends, `$80` and two bytes set the cursor, `$FE n` sets the attribute,
  and any other byte is printed by a recursive call. A character is the
  ROM's glyph ORed with itself moved one pixel right: bold, still 8
  pixels wide (`$E9CA-$E9D2`). There are ten messages; the tenth is the
  first screen's text at `$7CE0`, which nothing requests by number.

### The insert map

- `$CE0A` redraws it only when the spindle count `($805B)` or the worm's
  cell `($644A)` changes. It shows the 5 by 5 grid, 16 pixels a cell, in
  a window of 64 by 48 pixels at character columns 1-8, rows 17-22
  (`$CE29`, `$D027`; simulated).
- A missing cell gets attribute `$00`, a cell `$20`; type `$E2` items are
  plotted as pixels; types `$E8-$EF` get `$26`; a spindle whose byte +1
  is not `$FF` gets `$27`, white ink (`$CE77-$CEB6`).

### The halt screen

- H calls `$D05E` from `$779A` once the key is released. It sets
  attribute rows 0-16 to `$55`, builds a 4,096-byte dotted grid at
  `$F000-$FFFF`, and bounces a ball of 8 gores and 6 strips, with a
  shadow 13 pixels to its right (`$D0B5`, `$D150`, `$D37D`).
- Any key leaves it (`$D33D`, all half-rows read at once), H included,
  which then enters it again on release. Live: with H the frame counter
  stopped; after another key it ran again.
- The ball's state at `$D046-$D04D` is never reset, so each halt carries
  on from the last.

### The ending

- `$78C9` runs when the game ends with bit 7 of `($805B)` set. The view
  slides until the worm's y is under 2, then `($BAAD)` counts up by 1 a
  pass from 0, and `$BB06`, which draws the disk, also draws a hand from
  the script at `$BAAE`, 15 quadrilaterals, coming down from the top.
  When the hand reaches the disk `$BB25` sets bit 7 of the counter, and
  from then it falls by 3 a pass, the disk rising with the hand, until
  it is under `$80`; then the hi-score is kept and the menu returns.
- Live, with a type `$F6` item written into the worm's path: in one run
  the counter went `$01` to `$40`, then `$C1`, `$BE`, ... `$82`, 86 passes
  in all, and the screen showed a hand closing on a disk lettered DURELL
  and lifting it out of view. Where the hand meets the disk depends on
  where the worm stopped: the independent check's run turned at `$C0`.

## Mechanics

### The board

- 129 cells from `$6464` to `$7579`, then `00 FF` (walked as `$759F`
  walks it). A cell is 256 by 256 units: four link words (+0 the cell
  toward +x, +2 toward -y, +4 toward -x, +6 toward +y; 0 for none), then
  items of 7 bytes, ended by a 0 byte.
- An item: +0 top height, +1 bottom height, +2 x, +3 x size, +4 y, +5 y
  size, +6 type (`$AF73-$AFF1`).
- 459 items: 58 spindles, 23 handler records, 102 of type `$E2`, 36 of
  `$E8-$EF`, 7 `$F4`, 6 `$E0`, 4 `$E3`, 4 `$F5`, 1 `$E1`, 1 `$F6`, 14
  ramps along x, 20 along y, 7 diagonal boxes, and 176 plain boxes.
- Every link has its return link. Laid out from the links, the cells fit
  a grid 16 columns by 22 rows, except for two links that join far-apart
  cells: `$670E` east to `$7571`, and `$68EB` east to `$6C25`.
- The worm's surroundings are a 5 by 5 window of cell addresses at
  `$6432`, centre `$644A`, moved a row or column at a time as the head
  crosses a cell edge (`$9F92` east, `$A035` west, `$A1D7` north,
  `$A275` south; simulated against the links).
- A new game copies the starting grid from `$6400`, whose centre is cell
  `$64AE`, and puts the worm there at x 8, y 5, height 16, heading `$83`,
  speed 10, with 20 sparkies (`$757F-$7635`). It falls to the board:
  live, the fall counter read 2, 4, 6, 8, 10, 12 and the head landed on
  the seventh pass.
- A new game restores only the spindles: `$759F-$75CF` sets byte +1 of
  each to byte +0 less 1. Handler words and the heights the handlers
  moved stay as the last game left them.

### Handler records

- An item of type `$F7` whose y size is not `$0C` is a handler record:
  bytes +4 and +5 are a routine's address and bytes +0 to +3 its
  parameters. `$AF49` calls it, through the `CALL` it patches at
  `$AF63`, just before listing the item that follows the record, and
  never lists the record itself. Handlers therefore run once a pass for
  the nine cells round the worm and not at all for cells further away.
- The tape has 23: `$BD6F` twice, `$BD90` seven times, `$BDD1` thirteen
  times, `$BED1` once.
- `$BD6F` raises the next item's top by parameter 0 a pass to parameter
  1, then installs `$BD90`, which lowers it by parameter 2 to parameter
  3 and installs `$BD6F`: a block that rises and falls (simulated).
- When the item is type `$F4`, `$BD90` installs `$BE07` instead, with a
  wait of 5 to 36 passes; `$BE07` waits, raises the pad to its ceiling
  and, if the allowance `($8066)` is not 0 and the pool count is under
  `$0C`, adds a type `$F3` object on the pad and takes 1 from the
  allowance. All seven `$F4` pads sit behind a `$BD90` record
  (simulated).
- `$BDD1` sets the next item's top to parameter 3 plus or minus
  `(sine x parameter 2) / 256`, the angle being parameter 1 plus the
  frame counter shifted by parameter 0: a row of blocks that ripples
  (simulated, 1,251 runs against a model).
- `$BED1`, one record at `$6FFA` in cell `$6FD6`: sets the top of the
  type `$E0` block at `$700F` to `$20` while `($805B)` is under 50
  (`$BED8 CP $32`) and to `$50` from 50 on, and slides the item at
  `$7001` and the one at `$7008` to and fro in y (simulated).

### The worm's head

- `$9CF1`, called once a pass from `$765C` and from nowhere else, is the
  whole worm update, to the `RET` at `$A7D4`.
- Heading `($8001)`: 256 to the turn; `$00` is +x, `$40` is -y, `$80` is
  -x, `$C0` is +y (`$A926`; live: with heading `$83` the head's x fell by
  about 5 a pass and its y rose by about 0.4).
- Speed is the word at `$8002`; only the high byte, `($8003)`, sets the
  step, which is half of the speed times the table's sine or cosine (0
  to 255): `$04FB`, 4.98 units, a pass at speed 10 along an axis
  (`$9D05-$9D16`; simulated).
- Gravity: the fall counter `($8004)` gains 2 a pass in the air up to 20
  and is cleared on landing; the head drops half the counter in units
  each pass, 1, 2, ... 10 (`$9D1C-$9D43`; simulated). In the air bit 0
  of the speed is set, so 10 reads as 11 (`$9DFC`; live).
- On a slope the speed changes by twice `256 x abs(climb) / (speed +
  256)`, down when climbing and up when descending (`$9D4A-$9DA1`;
  simulated: `$0A00` becomes `$095C` up a 1-in-2 ramp and `$0AA4` down
  it).
- The head climbs a rise under 11 units and treats 11 or more as a wall
  (`$9EB4 CP $0B`); it passes under anything whose underside is more
  than 10 above the floor it is on (`$9B49-$9B56`) (simulated).
- A wall met within 16 of 256 of head on reverses the heading and
  quarters the speed, with no move that pass; met at an angle it turns
  the heading along the wall and the move is made again, and a second
  wall in the same pass stops the worm (`$9EF0-$9F4C`; simulated). Live:
  heading `$FF` into the side of a data bus became `$7F` with the speed
  cut from 10 to 2.
- Over no cell (`($644B)` = 0) the heading gains `$80`, a sparky is lost
  (not below 0), bit 1 of `($8058)` is set and the tone `($8056)` is 9
  (`$A3C0-$A3E6`; live: 20 to 19 sparkies on leaving the board).

### The body

- Four 16-byte entries at `$7F54`: +0, +2, +4 the offset of a joint from
  the one in front in x, y and height (signed, 256ths), +6 its bug
  count, +7 its height, +8 to +15 two points on the screen. The count of
  entries, `($809F)`, is 4 and nothing writes it.
- A joint is left alone while its offsets add up to under 11 units;
  otherwise a quarter of each offset is taken up each pass, an eighth of
  the height when the joint is above the one in front (`$A405-$A50B`;
  simulated).
- A joint in the air falls at most 5 units a pass and climbs a rise
  under 23 (`$A57B`, `$A678`; simulated).

### Bugs on the worm

- A type `$F3` object touched by the head adds 1 to `($7F5A)`; touched
  by a joint, 1 to that joint's count; and it leaves the pool
  (`$9E81-$9EA9`, `$A5FB-$A61F`; simulated).
- `$77A0` moves the counts along each pass: a bug moves one entry toward
  the tail when the next entry has none. When all four entries have at
  least one, `$7815` sets `($8058)` to `$FF` and starts the sound list at
  `$E4B7`. Live: bugs put on the first three entries read `0, 1, 1, 1`
  three passes later, and a fourth gave `$FF` on the next pass.
- **Dying**: `($8058)` falls by 1 a pass; each pass the speed falls by 4
  to 0 and the entries are pulled together, and an entry closer than 2
  units to the one in front has its count cleared (`$A43B-$A472`). The
  game ends when the four counts are 0 or the byte reaches `$7F`
  (`$7821-$783A`). Live: 26 passes from the fourth bug to the end in one
  run, 19 and 23 in two others that began from other poses.
- **End of game** (`$783B`): the worm's list records are made type `$E6`
  and shown as explosions for 8 passes, and then `$788F` keeps the
  hi-score and jumps to the menu. The four pairs of stores at
  `$7841-$785B` address the records one slot low: they write `$EB9B`,
  `$EBAA`, `$EBB9`, `$EBC8`, and the fourth worm record, whose type is at
  `$EBD7`, stays a worm section. Live: after the end those five bytes
  read `E6 E6 E6 E6 FA`.
- A type `$F5` item touched by a joint clears that joint's count; the
  head's touch does nothing (`$A5DD-$A5F3`). Live, with a pad written
  into the worm's path and a bug fed to the first entry every four
  passes: without the pad all four entries filled and `($8058)` went to
  `$FF`; with it the counts fell to `0, 0, 0, 0` as the worm crossed.
- The board's four `$F5` pads (`$6AF2`, `$6E03`, `$7400`, `$7525`) each
  lie under a type `$E3` block whose underside is `$20` or `$60`, high
  enough for the worm to pass beneath.

### Spindles, sparkies and score

- A spindle is an item of type `$F7` with y size `$0C`; there are 58,
  all 12 by 12. Taking one (`$A5AC-$A5DA`, in the joints' loop) sets its
  byte +1 to `$FF`, adds 5 sparkies and 1 to the count `($805B)`, and
  adds the new count to the score: the n-th spindle is worth n. Live:
  0 to 1 spindles, 20 to 25 sparkies, score 0 to 1, byte +1 `$FF`; a
  second spindle took the score to 3.
- The panel's SPINDLES figure is the number taken, counting up
  (`$7A98-$7ABC`).
- Firing (`$76FA-$7786`) needs at least 1 sparky, no more than 128
  (`$7708 DEC A` / `$7709 JP M`), and a pool count under `$12`. It takes
  1 sparky and adds a type `$F1` object 10 by 10 units and 18 high,
  centred on the head, its heading the worm's negated (objects turn the
  other way: for them `$40` is +y).
  Live: 20 to 19; refused at `$81` and at 0, allowed at `$80` and at 1.
- The blaster's sparky moves 7 units a pass (live: x fell from `$D65A` to
  `$CF61`), sinks 6 a pass, climbs steps under `$0C`, and fizzles in 5
  passes at a wall (`$DA01-$DA9D`; simulated).
- The burper's sparky gets `A0 00` in bytes 14 and 15 and the worm's
  heading gains `$80` (`$7771-$777E`). Live: heading `$83` became `$03`,
  and byte 14 read `$A0`, then `$9F` a pass later. It waits 160 passes,
  then rises 7 a pass and bursts on a collision or at height `$FA`
  (`$D9A9-$D9EA`; simulated).
- A sparky cannot be picked up while its byte 16, which counts down from
  `$37`, is not 0 (`$9BE1-$9BF0`, `$D9FA`). After that the worm touching
  it takes it back: 1 sparky, and the heading turned by -15 to +16
  (`$9E21-$9E5F`, `$A62B-$A669`; simulated).
- Score: 20 for a Crawly hit by a sparky (`$D84D`), 35 for a Sputnik
  (`$DD5A`), n for the n-th spindle. Nine instructions name the score
  word `$8060`, and these three are its only additions.
- The panel's score rises by at most 3 a pass toward the real score
  (`$7ADF`; live: 78 shown after 26 passes).
- **The hi-score is drawn wrong above 999.** `$788F` stores the score in
  `$8064` when it is higher and draws five digits, but `$78B8` and
  `$78BF` read `B` after `$7B6B` has zeroed it, so the thousands and ten
  thousands are drawn as 0. Live: a score of 1234 was stored as 1234 and
  drawn `00234`.

### Objects

- The pool: 30-byte records from `$7C74`, the end pointer at `$7C72`, and
  a count at `$7C71` that is 1 for an empty pool. Removing a record
  copies the last one over it (`$DEE6-$DF03`).
- A record: +0 type, +2/+3 its cell (column and row in the 5 by 5 window,
  or a cell's address when +3 is 5 or more), +4/+5 x, +6/+7 y, +8 width,
  +9 depth, +`$0B` bottom height, +`$0D` top, +`$0E` heading, +`$12`
  speed (`$DF04-$DF9E`).
- `$D691` walks the pool from the last record down and dispatches on the
  type (`$D6A1-$D6C0`).
- **Crawly** (`$F3`, `$D6C9`): wanders; turns to chase when within `$200`
  units of the worm; falls 6 a pass and climbs steps under `$14`
  (simulated). One that leaves the 5 by 5 window is removed after 40
  passes and 1 is returned to the allowance `($8066)`. A sparky kills
  it, except one of width `$0E`, which the first sparky shrinks to
  `$0A` (`$D857-$D862`).
- `$BE6C-$BE7E`: once the frame counter's high byte is `$11` or more
  (pass 4,352), a Crawly released on a pass whose low three bits are 0
  has width `$0E` instead of `$0A`. This is the only thing found that
  makes the game harder as it goes on.
- **Sputnik** (`$E5`, `$DC69`): created at height `$CF` or more in one
  of the eight cells round the worm (`$D494-$D527`); homes on the worm;
  within 20 units on both axes it drops 5 a pass and lights four panel
  cells; on reaching the board it becomes a Crawly. Passing over a
  waiting burper it sets the burper rising (`$DDDC-$DDF1`) (simulated).
- **Eruption point** (`$FB`): added at the worm when nothing was listed
  last pass (`$D442`); counts down from `$14` and then releases a small
  Crawly, 7 by 7 (`$DE41-$DEB7`; simulated).
- **Trains** (`$D534-$D690`): a leader of type `$F0` and 1 to 4
  followers of type `$F1`, started at a type `$E8-$EB` block (15 on the
  board) and riding along type `$E2` items at 7 units a pass, turning
  where blocked (`$DB0C-$DBBC`; simulated). The worm takes a follower
  like any sparky.
- **The wave** (`$7925`): when the frame counter's low byte is `$64` and
  its high byte is even, six records are copied from `$7951` into the
  pool, types `F0 F1 F1 F0 F1 F1`, if the count is under `$0A`; and when
  the high byte is a multiple of 4 the allowance `($8066)` is set to
  `$0C`. Live: a stopping checkpoint at `$7940` fired at frame `$0064`
  and next at `$0264`, each time with the six records added.
- A follower that reaches a type `$ED` item adds 1 to the decimal
  counter at `$BD6C-$BD6E` (`$DBD6-$DBDA`, `$DEB8`), which `$BD12` draws
  in seven segments on the six type `$E0` blocks.
- `$E472` is the random generator: a 24-bit shift register at
  `$E46F-$E471`, called four times a pass and once for each Crawly.
  Nothing seeds it, so the first game after loading always starts from
  `$380000`, whose first bytes out are `01 02 05 0B 16 2C 58 B0`
  (simulated).

### The disk

- The one type `$F6` item is at `$6FF3` in cell `$6FD6`. The head
  touching it sets `($8058)` and `($805B)` to `$C0`, and the game ends
  that pass through `$78C9` (`$9E66-$9E70`).
- **Nothing there tests the spindle count.** Live, a `$F6` item written
  into the worm's path ended the game with the ending and no spindles
  taken.
- The count is tested in one place, `$BED8`, where 50 raises the block
  at `$700F` from `$20` to `$50`: level with the top of the ramp on its
  west (`$7016`) and the block on its east (`$701D`), from which the
  type `$E2` arm at `$7001` runs north over a wall of height `$44`
  toward the disk. Whether the disk can be reached with the block down
  is not established.
- The board has 58 spindles and the test is for 50.

## Data tables

| Address | What |
|---|---|
| `$5B00-$61FF` | shift tables: page `$5A+s`, entry L is `L >> s` for odd L and `(L << (7-s)) AND $FF` for even L |
| `$6200` | entry L is L with its bits reversed |
| `$6300` | perspective curve, 128 bytes, index height / 2 |
| `$6380` | 64 bytes, `min(255, floor(256 / sqrt(1 + (i/64)^2)))`: what is left of a step along a slope |
| `$63C0` | quarter sine, 64 bytes, within 1.1 of `255 x sin((i + 1/2) x 90/64 degrees)` from entry 1 |
| `$7951` | six 30-byte object records, the wave |
| `$7A05`, `$7A15` | panel light colours |
| `$7BB0`, `$7BD8`, `$7BE0` | key names, redefiner rows, control key codes |
| `$7CE0` | the first screen's text, 592 bytes |
| `$80CB` | four 8-byte pattern sets |
| `$8F00`, `$8F08`, `$8F10` | pixel masks, 8 bytes each; nothing reads the third |
| `$BAAE`, `$BAF9` | the hand, as scripts of quadrilaterals |
| `$BF27`, `$BF59` | spark and disc pictures by size, 25 addresses each |
| `$BFBD-$C5B2` | spark pictures (820 bytes) and disc pictures (706 bytes) |
| `$C5B3`, `$C5EF`, `$C62B` | three explosion pictures, 15 rows of 4 bytes |
| `$C667`, `$C6A7` | 16 leg strokes of 4 bytes, and their 92 two-byte rows |
| `$C75F-$C8DE` | the disk: hub in two versions, slot, and the lettering DUR and ELL |
| `$C8DF-$CAEE` | Sputnik: shadow and four sizes; eruption point pictures |
| `$CAEF-$CC0A` | the small Crawly's pictures; four spindle pictures at `$CB4B` |
| `$CCCB` | seven-segment masks for 0 to 9 |
| `$CDB6` | ten 8 by 8 digits for the panel |
| `$D3EA` | eight 8-byte tiles for the halt screen |
| `$E48C` | 31 bytes: the worm's half width by section length |
| `$E4B2-$E4F6` | six sound lists |
| `$E5CC`, `$E5E4`, `$E5F8` | the tune: 12 pitch pairs, 10 script addresses, 10 scripts |
| `$E795` | ten message addresses |

`$5B00-$62FF` is exactly what the tape-making routine's `$EBF0-$EC59`
builds: run in the simulator on the image with those 2,048 bytes zeroed,
it reproduces them.

## Sound

- The only sound device is the speaker bit of port `$FE`.
- **In play the sound is made by the drawing.** The copy at `$E9E8`
  counts pixel rows down from `($8055)` and the clear at `$EAA9` from
  `($8056)`; at zero each reloads, XORs `A` with `$F8` and writes it to
  port `$FE` (`$EA82-$EA8A`, `$EACC-$EAEC`). The number of writes in one
  copy or clear is `floor(128 / n)` for n from 1 to 128 and none
  otherwise (simulated for all 256 values of each).
- A sound list feeds one byte a pass into `($8055)` (`$E9F6`): values,
  then 0 and a word, the next list or `$0000` to stop. The six lists:
  `$E4B2` (menu and redefiner), `$E4B7` (four bugs), `$E4C2` (28 values,
  new game), `$E4E1`, `$E4E8`, `$E4EE` (the explosion). `$E4F7` starts a
  list only when none is playing.
- **The tune** (`$E69F`, `$E6AB`, beeper `$E748`) plays on the menu: ten
  scripts of notes, half-length notes and slides, one pass of 450 notes
  lasting 193,970,724 T-states, 55.4 seconds, then again (simulated).
  The menu's keys are read only between notes (`$E791`).
- The player has a noise voice, switched by an element `$C8` that
  patches the opcode at `$E75D`. No script contains `$C8`, so it is
  never heard.

## What else the tape carries

The image was saved from the author's machine as it stood, and these
came with it. The game uses none of them.

- **The routine that made the tape, `$EB9C-$EC6A`.** It installs a
  handler address in every tagged board record (`$EBA0-$EBE4`: a code in
  byte +5 of `$FF`, `$FE`, `$FD`, `$FC` or anything else but `$0C`
  becomes `$BD6F`, `$BD90`, `$BDD1`, `$BE07` or `$BED1`), builds the
  tables at `$5B00-$62FF` (`$EBF0-$EC59`), then loads `IX=$4000`,
  `DE=$BF68`, pushes `$EFD8` and jumps to the turbo save routine at
  `$FA6B`. So the tape was written with the game about to start: the
  save returned into the entry stub, as the load does. The image holds
  the tables built, 23 records carrying handler addresses, and at
  `$EFFE-$EFFF` the word `$EFD8` it pushed. It cannot run twice: it
  recognises a record to patch by the code in the byte it overwrites.
- **Its only way in is `JP $EB9C` at `$757C`**, three bytes before the
  game's own start at `$757F`. No instruction names `$757C` and the
  image holds that word nowhere.
- **A tape utility signed "© 1983 NMS", `$FA24-$FF43`.** `$FA24-$FA66`
  is its entry: called from BASIC, it reads the next token of the line
  and accepts `SAVE`, `LOAD`, `VERIFY` or `MERGE`. The ten characters at
  `$FA56` are the copyright sign (`$7F`), then ` 1983 NMS`. `$FA67-$FF43`
  is the 48K ROM's cassette code, `$04C2-$099E`, moved up by `$F5A5`:
  1,174 of its 1,245 bytes equal the ROM's, and the 71 that differ are
  in 43 instructions: 25 calls and jumps into the copy itself, each
  moved by `$F5A5`; three 16-bit constants (the pilot lengths `$12E6`
  and `$0972` for the ROM's `$1F80` and `$0C98`, and `$020A` for
  `$0415`); and 15 one-byte changes, 13 of them counts and thresholds
  of the pulse timing, the others `AND $02` for the ROM's `AND $07` and
  `CP $FF` for its `CP $03`. That copy saved the game, and its loading
  half is what the tape's loader block is made from.
- **The first screen's flag is one of that utility's bytes.** `$7C92`
  shows the forgery warning when `($FC00)` is not zero, and no other
  instruction names `$FC00`. It is the operand of a `CP` in the ROM copy
  (`$FBFF CP $FF`, the ROM's `$065A CP $03`), so it is `$FF` on the
  tape. Live: the entry stub run with `($FC00)` at 0 went straight to
  the menu, and with `$FF` to the warning.
- **A leftover display-list record at `$EB8D`**, 15 bytes, with the head
  word at `$EB7E` still pointing at it. Both instructions that name
  `$EB8D` are dead loads.
- **`$FF44-$FF67`** is the top of BASIC's memory as the author left it:
  the machine stack with ROM return addresses (`$1303`, `$1B76`), the
  `$3E` end marker, and the first two user-defined graphics, A and B.

The ROM copy is not in the listing: it is the machine's ROM with 71 bytes
changed, and `game.json` leaves it out of the count.

## Left in the code

Each was run in the simulator unless it says live.

- **The fill can return into the frame buffer.** `RET M` at `$93E5` sits
  behind two `PUSH BC`. A trapezoid edge 256 or more pixels across gives
  a negative byte count there, and the return address taken is the
  pushed `BC`. `simulate.py 90F9 HL=0039 DE=0036 @802B=12,01
  @802D=48,01 @802F=1D,00 @8031=31,00 @80B4=81` does not return. In a
  search of 900,000 well-formed shapes none under 256 pixels across did
  it. Whether play ever draws one that wide is not established.
- Dead code: 219 bytes of instructions in `$8330-$8ABB` (`$8330-$8331`,
  `$833A-$83DB`, `$8609`, `$8A86-$8ABB`), the fragment at
  `$B719-$B724`, `$9F56-$9F58`, `$A7BA-$A7C4`. Nothing outside them
  reaches any of them.
- A mirrored leg of a Crawly whose column is 0 to 7 is not drawn
  (`$B70A` returns), and one at column 256 or more can be drawn with
  rows 8 too high (`INC L` at `$B779` with no carry into `H`).
- An unmirrored leg clipped at the left edge is drawn a row high
  (`SUB $20` twice, `$B6B3` and `$B6C0`).
- `$7708`: with 129 or more sparkies the worm cannot fire. Spindles
  give 5 each with no ceiling.
- `$A3DE CP $F0`: a sparky count of 241 or more is zeroed at the board's
  edge.
- The hi-score digits and the end-of-game records one slot low (above).
- The starting grid at `$6400` has `$7382` twice in its last row; the
  links say the first should be `$73EA`. It is outside the nine cells
  drawn and is replaced at the first cell crossing.
- Cell `$6CDE` lists the item `2E 00 70 A0 F0 10 D8` twice.
- `$80C6` and `$80C8` are written every pass and never read.

## Live tests

ZEsarUX 13.0, a second instance with no window, 3 October 2026. Each
test starts from `work/menu.sna` (or `work/entry.sna`), stopped, with
keys held for whole passes by a stopping checkpoint at `$7638`
(`work/verify/live_tests.py`, `live.py`).

| Test | Control | Result |
|---|---|---|
| truncated tape | the whole tape | the game starts with 29,001 bytes missing |
| opening fall | none needed: a count | lands on pass 7 |
| P held at the board's edge | no key | heading +`$80`, 20 to 19 sparkies |
| heading `$FF` into a data bus | the same run before the wall | `$7F`, speed 10 to 2 |
| spindle written into the path | the record before the head arrived | +1 spindle, +5 sparkies, +1 score |
| SPACE, and 1 | no key: nothing changes | -1 sparky, +1 record; 1 also reverses the heading |
| sparkies `$81`, `$80`, 0, 1 | each against the others | refused, fired, refused, fired |
| Q, A, O, P | no key | speed and heading as under "Controls" |
| each key's bit in `$8057` | each against the others | P 1, O 2, Q 4, A 8, SPACE `$20`, 1 `$40` |
| Kempston | option 2 not chosen: all 0 | as under "Controls" |
| four bugs | three bugs: no death | `$FF` next pass; 19 to 26 passes to the end |
| de-bugger pad written into the path | the same run with no pad: death | counts cleared |
| type `$F6` item written into the path | the same run with no item: play goes on | the ending, with no spindles |
| score 1234, then death | the stored word | drawn `00234` |
| `($FC00)` = 0 at the entry stub | `$FF` | menu at once; warning |
| checkpoint at `$7940` | the frame counter at each stop | `$0064`, `$0264` |
| checkpoint at `$AAFD`, `$AAFF` | the ROM bytes after | `HL` 0, 1; ROM unchanged |
| H, then another key, then G | the frame counter | stops; runs; menu |
| pass length | 120 passes, twice | 403,280 to 597,120 T-states; 403,145 to 651,650 |

## How this file and the listing were checked

Two checks by agents that wrote none of it, on a second proven model
(`claude-fable-5-1`), on 3 October 2026.

- **The maintainer's check** (`kit/CHECKING.md`): 39 claims of the
  checker's own choosing, 20 from this file, 10 names from `symbols.json`
  and 9 facts from `orientation.md`, each traced in the bytes or run in
  the simulator, and the nine marked live repeated live. All 39 held.
  `game.json` records it.
- **The listing's sample** (`kit/skills/core/60-verify`, "Measure the
  listing before calling it done"): 60 of the 937 descriptions, drawn
  with a fixed seed, six from each of the ten ranges the annotation was
  split into, checked clause by clause: about 520 clauses read, searched
  or run in the simulator. No description had a clause the bytes
  contradict. Five clauses were left unchecked: three need a screen (what
  a picture looks like, which digit is drawn on the right, which way +x
  and +y run on the screen), one was a figure the checker could not
  reproduce, which has been taken out of the comment, and one was the
  numbering of a routine's parts. With none wrong in 60, the share of
  descriptions with a wrong clause is under 5 % at 95 % confidence.
