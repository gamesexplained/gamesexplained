# Fat Worm Blows a Sparky — facts

Current truth for this game. Every fact names its evidence: a routine, a
table, or a live observation (with the snapshot). Where the inlay and the
code disagree, the code wins and `features.md` says **differs**.

## Machine and layout

- 48K ZX Spectrum, ROM at `$0000-$3FFF`, screen at `$4000-$5AFF`, the
  game's own code and data at `$5B00-$EBFF`, the boot/init routine, the tape
  loader and the hand-over stub at `$EC00-$FFFF` (`work/layout.json`; strings
  and code read from `work/entry.sna`).
- **`$5B00-$62FF` is generated at boot, not authored data.** `$EBF0-$EC59`
  builds the 256-entry bit-reverse table at `$6200-$62FF` (eight `SLA C` /
  `RR A` pairs per entry) and the pre-shift pages below it, writing into
  `$5Bxx`-`$62xx`; the boot/init routine at `$EB9C` runs it before play
  starts. The board's own records are the rest of the region, and the walker
  at `$AF49` advances through them by `$0007` (`$AF43`), not 8 bytes.
- **`$C001-$C2EE` is referenced.** Eighteen words in the pointer table at
  `$BF27` point into it (`$C011`, `$C02D`, ... `$C279`), so it is not data
  "no operand references by address".
- The game runs with **interrupts disabled**: the hand-over stub executes
  `DI`, the snapshot header reads `IFF2=0`/`IM=1`, and the image contains
  no read of the ROM frame counter at `$5C78`. It times itself.
  (`work/entry.sna` header, `orientation.md`.)
- **Every `IN` and `OUT` in the game, from the built listing**: `IN A,($FE)`
  keyboard reads at `$7BFC`, `$7CA9`, `$D33E` and `$E5B3`; `IN A,(C)` at
  `$7B91`; the Kempston joystick `IN A,($1F)` at `$7C32`; and `OUT ($FE),A`
  (border and speaker) at `$E755`, `$EA8A`, `$EAD3`, `$EAEC`. So `$FE` is not
  the only input port, and `$D6AE` is not an input at all: it is the high
  byte of the `JP Z,$DB0C` at `$D6AC`. No AY (a 48K machine).
- **No custom character set.** Text is the ROM font (`$3C00`-based), plain
  ZX codes. The forgery warning's text table is at `$7CE0`. `$E7B1` is not
  menu text: it is the key names of the redefine-keys screen (`$E7A8`-`$E7DA`
  holds `<SPACE>`, `<SYM SHIFT>`, `<CAPS SHIFT>`, `<ENTER>`); the menu's own
  text is message `$86` of the game's message script and starts at `$E7DB`.

## Boot and entry

- Tape: a BASIC wrapper (`POKE 23624,0`, `POKE 23693,0`, `CLEAR 65535`,
  `LOAD "WORM" CODE`, `RANDOMIZE USR 64242`) calls a 190-byte turbo loader
  at `$FAF2`, which loads 49001 bytes to `$4000` and returns to `$EFD8`.
- Hand-over stub: the `DI` is at **`$EFDA`**, not `$EFD8` (`$EFD8-$EFD9` are
  two zero bytes the listing does not carry as instructions). It sets
  `SP=$F000`, clears the bitmap `$4000-$57FF` with `LDIR`, fills the
  attributes `$5800-$5AFF` with `$0E`, sets the border to `1` (blue) and
  `JP $7C92`.
- `$7C92` reads the byte at `$FC00`; non-zero draws the anti-piracy forgery
  warning from the string at `$7CE0` and waits for a key
  (`$7C90`-`$7CB0`), zero goes straight to the menu. **No code writes
  `$FC00`** - there is no store to it anywhere in the listing - so it is not
  a variable but a byte of the loaded image, and it reads `$FF` in both
  snapshots, so the real boot takes the warning path.
- `$7F30` copies a pre-rendered picture from `$F000-$F8FF` onto the screen
  and jumps to the menu handler at `$E508`.
- The menu handler draws the title `FAT WORM BLOWS A SPARKY` and the three
  choices; `0` starts play.

## Play

- The view is a smooth-scrolling top-down perspective of a circuit board;
  the worm sits at the centre, and blocks near the screen edge show their
  sides. The insert map and the four counters are drawn into the bottom
  band (`reference/13-play.png`).
- HUD counters: `SPARKIES`, `SPINDLES`, `MY-SCORE`, `HI-SCORE`
  (`reference/12-menu.png`, `reference/13-play.png`).
- Controls, from the inlay: `Q` faster, `A` slower, `O` rotate left,
  `P` rotate right, `1` burper sparky, `SPACE` blaster sparky, `H` halt
  (bouncing-ball routine), `G` game over. Kempston joystick optional.

## The renderer and the perspective (`$80EB`, `$811E`)

- The screen is drawn from a 256&times;128 board bitmap at `$F000`
  (32 bytes a row), which the panel and line plotters share, then copied
  onto the ULA screen by `$E9E8`, a straight copy: that routine has no mask
  and no reference to the ROM font, whatever its older comment said.
  Verified live: the buffer in `work/play-1.sna` holds the dithered
  pattern. See "The rasteriser" below.
- Objects are drawn from four extent words. `$80EB`
  (`scale_object_extent`) reads a scale byte from the **128-byte** curve at
  `$6300`-`$637F` - `LD H,$63` / `LD L,A` / `SRL L` indexes 0-127 - and
  applies it to each word through `$811E`. The curve is one monotone run from
  `$00` to `$FA`; `$6380` onwards is a different table, not more curve.
  `$811E` (`mul_scale`) is a shift-and-add that returns
  `extent * (128+B) / 128`; it doubles `DE`, shifts `B` right and adds on
  the carry, eight times, then folds the high byte back. Verified by reading
  `$811E`-`$8179`, the curve at `$6300`, and by simulating the routine
  (`HL=00BF`, `B=3F` gives `HL=011D` = 285).
- **`$811E` is not the game's only range test.** Inside it, a value with a
  non-zero high byte takes one of two paths: the positive path multiplies
  only what is below `$C0` in the low byte, and the **negative path also
  scales** (measured at `B=3F`: `$FF00` and `$FF20` come back unchanged,
  `$FF40` gives `$FEE2` and `$FFC0` gives `$FFA1`, so the untouched window is
  `$FF00-$FF3F`). Two other routines test ranges as well: `$B9F2`
  (`LD A,D / AND A / RET NZ / ... / BIT 7,L`) and `$D027`
  (`LD A,E / AND $1F / RET Z / CP $09 / RET NC / LD A,D / CP $5A`).
- `$81DB` (`draw_object`) scales each object's extent twice, at the
  record's `+$0D` and `+$0C` bytes, adds `$0080` to the first two resulting
  words and `$0040` to the last two (which is what centres the worm), then
  dispatches on **`type & $C0`** - `$827B` is `AND $C0`, then `CP $C0`,
  `CP $80`, `CP $40` - to one of four drawing arms, not on `type & 3`.

## The rasteriser (`$8E67`, `$9270`, `$E9E8`, `$EAA9`)

Observed by stopping `work/play-1.sna` at each drawing routine for one
frame and reading the arguments and the changed bytes of the buffer. Costs
come from single-stepping one whole frame: 84,854 instructions and 676,229
T-states, equal to the count between two checkpoints at `$E9E8`. In the
frames inspected (idle, and the buffers after holding `O` and `Q`+`O`, at
headings `$B5` and `$1F`) every face is an axis-aligned rectangle or a
wedge beside one.

- **There is no general polygon filler.** A solid object is drawn from
  two primitives. `$8E67` fills an axis-aligned rectangle: `B`=x1, `D`=x2,
  `C`=y1, `E`=y2, after `$8E13`/`$8E30` clip them to 0-255 by 0-127.
  `$9270` fills a trapezoid whose two parallel sides are horizontal: the
  x-range of its first row is `($802B,$802D)`, the x-range of its last
  row `($802F,$8031)`, and the first row is `($80B3)`. One end of a range
  collapsing to a point makes a triangle. In the traced frame a box was one
  `$8E67` call (x 12-42, y 27-73) with one wedge above and one below it.
  The worm is a chain of small `$9270` and `$8E67` pieces.
- **Mode `$80B4` bit 7 frames the rectangle.** With it set, `$8E67` draws
  the first and last rows solid ink (`$8F8A`) and the pattern between;
  with `y1 = y2` that is a one-pixel solid bar, which is how the outline
  pass `$828F` draws an edge (observed: several one-row calls per frame).
- **Rectangle rows are filled by a computed jump.** `$8EAE` stores
  `$8F76 - 2n` (n whole bytes in the row) into the operand of the `jp` at
  `$8F87`, which lands in a chain of `INC L / LD (HL),A` pairs at
  `$8F34-$8F74`: n bytes cost 11 T-states each with no counter. The step
  to the next row is `ADD HL,DE` with `DE = 32 - n`, which the chain
  leaves one row short. The end bytes are masked with the table at `$8F00`
  (`7F 3F 1F 0F 07 03 01 00`), the mask pairs held in `BC'` and `DE'` for
  the whole fill.
- **Fill patterns are two bytes.** `$80BE`/`$80BF` give a row byte `P` and a
  modifier `M`; successive rows alternate between two bytes derived from
  them, and bit 5 of the row's buffer address (row parity) picks which one
  a row gets, so the dither stays fixed to the screen. Seen in the buffer:
  pattern `$AAFF` stores `AA 55 AA 55...` down a face and `$88AA` stores
  `DD 77 DD 77...` (0 is ink in the buffer). With `M = 0`, `$8ED2`
  takes a shorter path that writes the same byte on every row.
- **Slanted edges are walked with 16-bit fraction accumulators.** `$9270`
  turns each edge's x-change into an increment in `IX` or `IY` (halved by
  `SRL D / RR E` in one of the two cases), then patches the displacement of
  the `JR` at `$942E` (one edge) and of the `JR` at `$94C9` (the other) to
  select one of five loop bodies each (`$942F/$9435/$9452/$947A/$949E` and
  `$94CA/$94D0/$94F6/$951F/$953A`). The displacements written (`$00`,
  `$06`, `$23`, `$4B`, `$6F` and `$00`, `$06`, `$2C`, `$55`, `$70`) land
  exactly on those entries.
  A span's interior bytes use the rectangle's `$8F34` chain through the same
  patched `$8F88`, and the edge loops rotate a one-bit mask a pixel at a
  time and write a byte once, after the mask has crossed it.
- **Cost of a frame.** At idle: 676,229 T-states, 5.2 frames a second at
  3.5 MHz. Row spans (`$93E1`, `$9270`) take 27.1 %, rectangles (`$8F38`,
  `$8E67`) 16.1 %, the copy to the screen (`$E9E8`) 11.5 %, the clear
  (`$EAA9`) 3.8 % and the multiplies (`$811E`, `$A8D8`) 7.0 %. Frames
  sampled under idle, `Q`, `O`, `P`, `A` and `Q`+`O` took between 521,392
  and 695,976 T-states, 5.0 to 6.7 frames a second. A 50-second session
  played by hand in a windowed ZEsarUX running at 99.3 % of real speed (378
  frames, counted by a non-stopping checkpoint at `$E9E8`) averaged 7.5
  frames a second, with one-second readings from 5.0 to 10.9 and a mean
  frame of 461,852 T-states: what the scene holds sets the rate, and the
  scripted samples above were the slow end. The slanted edges cost more
  than the interiors they bound.
- **The clear and the copy use the stack.** `$EAA9` sets `SP=$0000` and
  pushes `$FFFF` 2,048 times (11 T-states per two bytes); the first push
  lands on `$FFFF` and the writes run down to `$F000`, which is the
  buffer. `$E9E8` sets `SP=$F000` and `POP`s the buffer two bytes at a time
  into the screen (32 T-states per two bytes, against 21 per byte for
  `LDIR`). The constants `$00E1` and `$F900` added to `HL` after each row
  and each character row walk the screen's interleaved layout with no
  multiply. The buffer is the top 128 pixel rows, two thirds of the screen
  (`$4000` then `$4800`). Interrupts are off for all of it.
- **The copy clicks the speaker.** The copy loop contains `DEC L / JP NZ /
  LD L,H / XOR $F8 / OUT ($FE),A`. Forcing `$8055` to 1, 2 and 4 and running
  one frame executed the `OUT` at `$EA8A` 128, 64 and 32 times, with the
  frame's cost unchanged. The sound script writes `$8055` once a frame
  (`$E9F6`), so a sound effect is the timing of the copy. The clear
  (`$EAA9`) has the same loop with `$8056`; its `OUT`s did not run in the
  test, because `$8056` is rewritten before `$EAA9` runs.
- **The frame is not synchronised to the display.** The recorded play
  coverage (`work/cov-play.txt`) executes no `HALT` and no `EI`, and the
  only port read is the keyboard at `$7BFC`.
- **The view translates and never rotates.** After holding `O` to heading
  `$EB` (a diagonal), four consecutive frames showed the same rectangles
  (x 10-41, y 23-69; x 91-175) moving by about one pixel in x and one in
  y a frame, with unchanged sizes and no slanted rectangle edges. The
  heading feeds the worm's movement (`$9CF1`) and its limbs, not the
  projection of the board.
- **Culling happens while projecting.** `$AF73` subtracts the camera from
  each corner and returns early, without inserting the record, when a
  result's high byte shows it is outside the view.

Open: which slope and direction each of the ten loop bodies serves, and
how `$9270` chooses displacement `$00` (a vertical edge). `symbols.json`
names the `$8E13` family `edge_*`; `$8E67` is the rectangle filler.

## The draw list (`$AAF3`)

- Every frame `$AAF3` (`build_display_list`) rebuilds a list of
  depth-sorted 15-byte records: one per live board object, then the four
  board panels, each inserted by the sorted insert at `$B008`. Verified by
  reading `$AAF3`-`$AB10`.
- Its first two instructions are `LD HL,$EB8D` then `LD HL,$0000`. The
  second overwrites the first, so the list head is set to a null pointer
  and the following `LD (HL),A` writes to `$0000` in ROM. The list is built
  correctly from a load that never has any effect.

## The worm (`$9EB0`)

- `$9EB0` (`worm_steer`) chooses one of four legs from bits 7 of the
  overlap object's flags at `(IX+$09)`, `(IX+$05)`, `(IX+$03)` and
  `(IX+$07)`, each of which snaps the worm onto a track direction (0/128
  or 64/192). `($8001)` is the heading; `($8000)` is **not** a 12-frame rate
  limiter - `$9CF1`'s first two instructions clear it and the frame loop at
  `$765C` calls `$9CF1` every frame, so it holds state for one frame. When
  the worm is already heading into the window a leg tests,
  `$9F37` reverses the heading and quarters the projection scale
  (`$8002`) - the worm bumping into an edge.
- `($8001)` heading, `($8002)` speed/scale, `($8003)` speed,
  `($7FF4/$7FF6/$7FFE)` position, `($805D)` sparkies, `($8059)` frame
  counter, `($7C71)` entity count. Read from `work/play-1.sna`: `$8001` =
  `$83` (the initial heading the steering code writes), `$805D` = 20 (the
  HUD's `SPARKIES:00020`), `$8059` = 125, `$7C71` = 8. Live: holding
  `SPACE` at `work/play-1.sna` took `$805D` 20→19 and `$7C71` 8→9; the
  `1` key then took them 19→18 and 9→10.

## The halt screen (`$D05E`)

- `H` runs a self-contained bouncing-ball screen at `$D05E`, reached only
  from the `CALL $D05E` at `$779A`. Its pattern fill at `$D37D` writes
  **4&nbsp;KB at `$F000-$FFFF`**, with `SP=$0000` and PUSH working down from
  `$FFFF` (measured by simulating the routine: the stack pointer's lowest
  value is exactly `$F000`, and 3,672 of the 4,096 bytes change value) - not
  the 1&nbsp;KB at `$FC00-$FFFF` an earlier note claimed. It keeps the old
  stack pointer at `$E9E6` and restores it, and is called from `$D12F`. The
  `H` key's path is `$7C13` reading the controls into `($8057)`, the frame
  loop's bit-4 test at **`$778C`** (`$7789`-`$778E`), and the wait at
  `$7790` for the key to be released. It was not executed in either
  snapshot; its appearance is open.

## Open

- The difficulty ramp the author describes ("the monsters get tougher") is
  not tied to a table.
- The author describes a level/height progression the game *lacked*; no
  evidence of one has been found.
