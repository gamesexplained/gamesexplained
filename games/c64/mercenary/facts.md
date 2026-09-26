# Mercenary — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names the
routine or table it comes from. Unless marked *live*, a fact comes from
reading the code in `work/handover-7200.vsf` (the start-up, `orientation.md`)
or `work/play-ground-0808.vsf` (play). Numbers are decimal unless written
with `$`. A square is written XX-YY: column X, then row Y, as the LOC
readout shows it.

## Build

- The contributor's `MERCENAR.D64`, program `MERCENARY`: the game packed
  into one file (Compacker V2.0, then a run-length stage and a copy at
  `$5000`); `orientation.md` has the chain. The only other program on the
  disk is *The Second City*.
- The analysed image is `work/handover-7200.vsf`: stopped at `$7200`, the
  game's start-up, after the copy at `$5000` has run. It is the only state
  that holds the start-up code (`$7200`-`$75D5`) and the opening's script
  (`$7001`-`$71B3`), which the second bitmap overwrites in play.
- No build identifier or version string was found. `COMPACKER V2.0` in the
  BASIC line is the packer's.
- The original Novagen disk, booted to the same `$5000`, matches the
  analysed memory over `$0800`-`$CFFE` but for five places (`orientation.md`):
  the opening's first message ("NOVADRIVE COUNTDOWN"; the crack has "ABC
  UNLIMITED"), the `CBM80` signature at `$8004` (zeros in the crack), the
  branch offset at `$2178`, filler at `$5100`-`$52FF`, and `$BFFF` (*live*,
  `work/orig-entry-5000.vsf`). `$CFFF` (`$38`) is the packer's.
- `$D000`-`$DFFF` is not the game's: `$D000`-`$D867` is filled with `$33`,
  `$D868`-`$DA67` is the first unpacker's turbo tape loader (built to run at
  `$FE00`), and `$DA68`-`$DFFF` is packed data (it holds `$B669`-`$B924`
  byte for byte at `$DB05`). No game code maps that RAM in: every write to
  `$01` stores `$35`, `$36` or `$05`.
- Leftovers from development: the Atari DOS 2 menu ("A. DISK DIRECTORY
  I. FORMAT DISK B. RUN CARTRIDGE J. DUPLICAT…") at `$BC90`-`$BCFF` in the
  Atari's internal screen code; four names at `$7606`, "KBCODE(", "MYONO
  (", "POWER (", "ALLFLG(", read by nothing; an unread copy of
  `$3F6A`-`$3FFE` at `$CF6A`-`$CFFE`.

### The reset trap

The original's `$8004` holds `CBM80`, so the KERNAL's reset routine takes
the game for a cartridge and jumps through `$8000` to `$2170`:

```
$2170  SEI
$2171  LDX #$00
$2173  STA $2180,X
$2176  DEX
$2177  BNE $2171     original: offset $F8
$2179  INC $2175
$217C  JMP $2170
```

The branch goes back to `LDX #$00`, so X is 0 at every store: the loop
writes A to `$2180` for ever and never reaches the `INC`/`JMP` that would
have wiped memory page by page. Branching to `$2173` (offset `$FA`) would
have made it a wipe. The crack zeroes the signature and changes the offset
to `$F9`, which lands on the `$00` operand of `LDX`, a `BRK`. *Live*: a
reset of the original leaves the program counter in `$2171`-`$2177` with a
screen of garbage (`reference/reset-original-hangs.png`); the crack resets
to BASIC's READY (`reference/reset-crack-basic.png`).

## Memory map

| What | Where |
|---|---|
| Zero page | position, angles, speed, maths accumulators, printer, keys; swapped with `$BF02`-`$BFFF` around KERNAL calls (`$B8F6`) |
| Scene tables | `$0100`-`$01BF`, `$02C0`-`$02FF`, `$0340`-`$07FF`: 64 vertex slots (world, view, projected, screen, clip flags), edges `$0580`/`$05C0` |
| Event scripts | word table `$0800`-`$0865` (51 scripts), byte code `$0866`-`$1248` |
| Dictionary | 239 words `$1249`-`$151B`, pointers `$2120`/`$2210` |
| Canned messages | 64 token lists `$151F`-`$16D2`, pointers `$20A0`/`$20E0` |
| Object models | 32 at `$1700`-`$2098`, 23 at `$3B25`-`$3FFE`; pointers `$2800`/`$2840` |
| After save/load, reset trap | `$2160` (`SEI`, `JMP $80BA`), `$2170` (above), inside the dictionary's pointer table |
| Room pointers | `$2300`/`$23C0` (rooms `$01`-`$AE`) |
| Objects | 64; positions in nine split tables: X `$2880`/`$2480`/`$2540`, height `$28C0`/`$24C0`/`$2580`, Y `$2900`/`$2500`/`$25C0` (low, middle, high); room `$2940`; flags `$29C0`; objects in view `$2981` on (count `$B2`) |
| City | building model per square `$2600`/`$2700`; square status `$2B00`; roads `$2C00`-`$2FFF`; view radius by height `$2A00` |
| Rooms | 174 records `$3000`-`$3B23` (room `$AE` starts at `$3B16`; `$3B24` spare) |
| Bitmaps (bank 1) | `$4000`-`$553F` and `$6000`-`$753F`, 160 × 136 multicolour pixels each, double-buffered |
| Hand-over copier | `$5000`-`$502E` |
| Drawing tables | row addresses `$5540`/`$55D0`, pixel masks `$5660`, column offsets `$5700`, clear masks `$7760` |
| Spinning points, script variables | `$57A0`-`$57DF`, `$57E0`-`$57EF` |
| Maths tables | logarithm `$5800`, antilogarithm `$5900`, sine `$5A00`/`$5B00` |
| Screen matrix | `$5C00`: rows 0-16 the view's colours, rows 17-24 the panel, message window `$5F78`-`$5F8E`, sprite pointers `$5FF8` |
| Opening | script `$7001`-`$71B3`, start-up `$7200`-`$75D5` (hand-over only) |
| Road lists (play) | points `$7540`, edges `$7580`/`$75C0` |
| Gun sight sprite, dial tape | `$7640`, `$7680`-`$76ED` |
| Credits | `$7700` (BCD), offer `$7704`, figures as text `$7720` |
| Panel character set | `$7800`-`$7FFF` |
| Cartridge header, angle and BCD tables | `$8000`-`$80B9` |
| Code | `$80BA`-`$BBC1` with tables inside, and `$BD00`-`$BE9E` (row fills) |
| Missiles and ships in flight | `$BDA3`-`$BDFF` |
| Motion record, carried list, counters, script state | `$BEA0`-`$BEFF` |
| Zero-page copy | `$BF00`-`$BFFF` |
| Building models | 29 at `$C000`-`$CF66`; 15 road pieces and 62 more at `$E000`-`$FFCF` |
| Vectors | NMI `$FFFA` (`$8009`), IRQ `$FFFE` |

## Start-up and the opening

- `$5000` copies `$4000`-`$4FFF` to `$E000` and `$6000`-`$6FFF` to `$F000`
  (self-modified operands `$5004`-`$500D`), calls `SETMSG`, tests PAL, and
  jumps to `$7200`. `$7200` jumps to `$7290`: the hardware setup `$8135`,
  the row and column tables (`$72A2`, 136 rows; `$72C5`), then the opening.
- **PAL only**: `$5024` goes back to `$5000` when `$02A6` is 0 (NTSC). The
  copier's operands are not reset, so the second pass copies from `$7000`
  over zero page and on up through memory, over its own code: the machine
  crashes (*live*: switched to NTSC, 40 s after the boot the program counter
  was in the KERNAL's interrupt entry, `$02A6` overwritten with `$9D`, the
  screen full of copied bytes, `reference/ntsc-machine-crash.png`).
- The hardware setup `$8135`: `$01` = `$36` while it runs, VIC bank 1, CIA
  interrupts off, NMI to `$8009` (an `RTI`), raster interrupt `$B9BB` at
  line 0, sprite 0 expanded at (160, 116) in light grey, black border, then
  `$01` = `$35` and `CLI`.
- The opening's script at `$7001` runs a starfield (`$72FA`-`$74C9`): 21
  stars, speed from −32 a frame, multiplied by 4.05 once, then by 1.012 a
  frame to about −512, then by 0.977 a frame back to −32. The planet then
  grows from distance 1023 to 0 in steps of 8, 4, 2 and 1 (`$74CA`), drawn
  as a disc of radius 1024 / distance (`$7508`).
- Play starts at X `$08:$88`, Y `$08:$88`, height `$7F:$00:$88`, heading
  512 (south), pitch `$0300` (straight down), motion mode 10 (the descent,
  `$9E66`). The first stage of the descent converts heights × 8 (road ends
  and object dots) through the self-modified `$9E93`, which `$9E84` patches to `JMP $8510` when that stage
  ends. The crash landing puts object 10, the wreck, at the crash site.
- Credits start at 9000 (`$710C`). `$7203` starts script 0: the crash
  report, a landing remark picked at random from canned messages 60-63
  ("WHERE AM I", "YOU CRASHED", "GOOD LANDING!", "OUCH!"), the offer of the
  Dominion Dart for 5000, and the idle lines, until the player boards a
  craft.

## Timing

- One raster interrupt pair a frame: `$B9BB` at line 0 (the view) and
  `$BA1E` at line `$BA` (the panel), each writing the other into `$FFFE`.
  The panel half counts frames in `$E2` to 50, then seconds in `$E3`-`$E4`
  (`$BA60`-`$BA70`): 100 frames advanced from a stop took `$E3` from `$8C`
  to `$8E` with 99 hits on `$B9BB` (*live*).
- The main loop waits for raster line 224 before each buffer swap (`$AF76`).
  It ran 10 passes in 100 frames standing on the ground (*live*): the view is
  redrawn five times a second there.
- **One view takes 13 frames over the city.** Stepping 24 frames from
  `work/intro-city-grid.vsf` and reading both bitmaps after each: after a
  swap the new back buffer is filled with sky and ground in about 2 frames,
  nothing is drawn for about 6 while the models are transformed, the lines
  go in over about 5, and the buffers swap (`$24` 68, 69, 70 at frames 0, 4
  and 17): about 3.8 views a second (*live*).
- **Double buffering** (`$AF84`): `$24` counts passes; on even passes the
  game draws into `$4000` (`$25` = `$40`) while `$C7` = `$78` shows `$6000`,
  on odd passes the reverse (`$25` = `$60`, `$C7` = `$70`). The view's
  interrupt copies `$C7` into `$D018`.
- Benson's printer runs from the panel interrupt, one character a frame
  (below).

## The main loop

`$855C`, looping through `JMP $855C` at `$859E` and `$85EF`. Every pass
runs one script operation (`$8AB2`) and the hired ship (`$8634`), then one
of two branches on `$A8` (0 on the surface, non-zero inside a complex; set
by the movement code at `$A1E8`, `$A298`, `$A2F3`, cleared by CTRL + Q at
`$80FD` and by a door out to the surface at `$90C2`):

| Surface | Complex |
|---|---|
| `$A544` sines and cosines of the view angles | `$A544` |
| `$94E0` the square: reload its building when the square changes | `$AF6E` wait for line 224, swap buffers, fill sky and ground |
| `$A320` view matrix (in a craft) | `$939E` keep the player inside the walls |
| `$A4B2` turn the building's spinning points | `$9437`, `$90BE` doors |
| `$AF6E` swap and fill | `$96D8`, `$96E7` the room's box |
| `$9054` roads (skipped when `$EF` is set, beyond ±99) | `$9706` objects, keys T and B |
| the square's building, when `$77` = 0 | `$B2FE` keys and stick |
| object 0's step (`$85C5`), `$9706` objects | `$A165` movement |
| `$B2FE`, `$A165` | |
| fire, the hit follow-up, moving objects, the attack ship | |

Weapons and moving objects therefore run only on the surface.

## Numbers

- **Floats** are two bytes: a mantissa byte m and an exponent byte whose
  bits 2-7 are a signed exponent e (−32 to 31), bit 0 the sign, bit 1
  always 0. The value is ±(1 + m/256) × 2^e. There is no zero: x − x gives
  2^(e−9), and the integer 0 converts to 2^−8.
- **Tables**, all 256 entries checked: `$5800` = round(256 log2(1 + i/256)),
  `$5900` = round(256 (2^(i/256) − 1)); `$5A00`/`$5B00` hold sin((i + 0.5)
  × 90°/256) as floats.
- `$82FA` multiplies and `$8334` divides by adding and subtracting logs
  (error at most 0.429 % and 0.437 %; the worst division is mantissas `$F7`
  ÷ `$EF`: logs 249 − 244 = 5, and `$5905` holds 3). Overflow of the final
  exponent add saturates to ±2^30, underflow to 2^−31 (`$831A`); the
  mantissa carry (`$8307`) and borrow (`$8346`) adjust the exponent before
  that check and wrap, so (1.5 × 2^31) × 1.5 gives 2.25 × 2^−32 while
  1.5 × (1.5 × 2^31) saturates. `$838B` adds: the smaller mantissa is
  shifted by the exponent difference through self-modified branches
  (`$83AB`, `$8404`), a difference of 9 or more returns the larger operand,
  unlike signs subtract and renormalise (`$83D5`; an underflow there returns
  +2^−31, sign lost, `$83EC`), and the result truncates (up to 0.581 % of
  the larger operand; 1.0078125 + 0.998046875 gives 2.0). The exponent carry
  is unchecked: 2^31 + 2^31 gives 2^−32. Callers subtract by flipping the
  sign bit (`EOR #1`, `$9C91`, `$AA05`). All of this was checked against the
  routines in a 6502 simulator on millions of operand pairs
  (`work/tests/test-math-float.js`).
- `$841F`/`$841E`: sine and cosine of a 1024-step angle (Y high 2 bits, X
  low), ±0.001. `$8434`: 8-bit sine and cosine of a 64-step angle from the
  half-wave table `$8457` (into `$BEBE`/`$BEBF`). `$82BB` 8 × 8 multiply;
  `$82D3` signed A × Y / 128; `$8477` float to 8 bits (rounds halves away
  from zero); `$84A7` float to 16 bits (negatives come out as ones'
  complement); `$8510` 24-bit integer to float (truncates).
- **Random numbers** (`$ADEF`): a 16-bit shift register `$F3`:`$E8` shifted
  right, the new top bit being bit 0 XOR bit 3 of `$E8`; period 57,337.
  `$B94D` (the key beep) also steps it.

## The view

- **Units.** Positions are 24 bits a coordinate; one city square is 65536
  units, and the high byte is the square number the LOC readout shows.
  Angles are 1024 steps a turn: heading 0 moves toward falling Y (north),
  256 west, 512 south, 768 east, and turning left raises it; pitch 512 is
  level, more is nose down; roll 0 is level. Rates are per main-loop pass.
- **Projection** (`$A75C`, one row of the matrix `$40`-`$51` at a time):
  with X, Y, h the vertex minus the player,
  u = X cos h − Y sin h, w = sin p (X sin h + Y cos h) − cos p h,
  z = cos p (X sin h + Y cos h) + h sin p,
  x' = cos r u + sin r w, y' = sin r u − cos r w;
  screen x = `$8E` + 64 x'/z, y = `$8F` + 128 y'/z (Y doubled for the wide
  pixels). The focal length 64 is the exponent `$21` = `$18`. The window is
  160 × 136. In a craft its centre (`$8E`, `$8F`) is (80, 68) moved by c
  times the matrix's height column, c = min(height/4096, 16): `$8E` = 80 +
  round(c · −sin r cos p), `$8F` = 68 + round(c · cos r cos p), so it rises
  by up to 16 lines in level flight, tilts with the roll, and does not move
  looking straight down. The sky and ground fill (`$AFD5`) keeps the fixed
  centre (80, 68), so from high up the painted horizon lies below eye level
  and far roads fall on the sky, where they do not show. On foot and
  underground the heading-only transform `$A979` is used, `$A320` does not
  run, and `$8E`/`$8F` and the clip window `$90`-`$97` keep their last
  values. The mirror flag `$F1` flips x. The page's port of the whole
  surface pass (`$A544`, `$94E0`, `$A320`, `$A4B2`, `$AFD5`, `$9054`,
  `$96D8`/`$96E7`) is bit-exact against these routines in a 6502 simulator
  on 18,000 random views, and reproduces the displayed bitmaps of
  `work/stadium-view.vsf` byte for byte (`work/tests/city-test-*.js`).
- **Vertices.** A building's vertices come through `$A5CE`, an object's
  through `$A61F` (objects 0-15 are first turned by their angles `$802A`,
  `$801A`, `$800A` in 64ths of a turn, `$A6AD`), road ends through `$A67B`
  (the centre of square v at ground level).
- **Clip flags** (`$0700`): bit 7 behind, bit 0 X off, bit 1 Y off. An edge
  with both ends behind is skipped; an end behind is replaced along the line
  toward it (`$9B2C`); an off-screen end becomes the screen corner the line
  heads for (`$BBD8`/`$BBE0`); an off-screen start is cut at the window's
  edges through region codes (`$BBE8`, `$BBF8`, `$BC18`).
- **Far objects** (`$9728`): an object 65536 units or more away on any axis
  is one dot at its origin (`$ADCB`); below the player it is drawn only
  within `$B9` squares (`$B9` = `$2A00`[height / 2048]), so on foot objects
  beyond the next square vanish.
- **One building at a time.** Only the player's own square has its model
  loaded (`$94FE`-`$952F` reload it when `$74` or `$7A` changes), and it is
  drawn only below height 65536 (`$77` = 0). *Live*: at 08-08, 3072 units
  from its north edge and facing north, the horizon was empty; 3072 units
  over the line into 08-07, Bosher Stadium stood on it
  (`reference/one-building-a-0808-facing-north.png`, `-b-0807-…`).
- **00-00 never shows its building.** The square number 0 also means
  "outside the city" (`$952B`), so its model (`$E424`) is never loaded and
  no road ends there.

## Drawing

- A pixel (x, y) of the view is at `$25` × 256 + (y >> 3) × 320 + (y & 7) +
  (x >> 2) × 8, through the row tables `$5540`/`$55D0` and the column table
  `$5700` (x ≥ 128 adds the missing 256 through the carry); its two bits
  are `$C0` >> 2(x & 3).
- **Eight line routines**, one per octant, at `$AC61` + 47n: x+y+, y+x+,
  y+x−, x−y+, x−y−, y−x−, y−x+, x+y−, picked through `$BBD0` and the address
  tables `$BC38`/`$BC40`, called through `JMP ($0004)`. Each plots, steps
  the major axis, adds or subtracts the slope `$66` (|minor|/|major| × 256)
  from an 8-bit error, and steps the minor axis on the carry or borrow.
  Octant 5 adds with the carry set, so it steps by slope + 1: a vertical
  line of 129 pixels or more drawn upward kinks one pixel left after 128.
  A vertical line only reaches octant 5 when its X difference is negative:
  x − x keeps the sign of the operand the set-up at `$9A94` puts the end in
  (`$8383`), so vertical lines left of the view's centre kink and those from
  the centre rightwards (octant 6) do not. `$66` cannot hold 1, so a 45°
  line gets `$FF` and counts as steep: diagonals of 129 pixels or more miss
  one sideways step (at step 129 in octants 1 and 2, 128 in octant 6) and
  end one pixel short; octant 5's extra 1 makes its diagonals exact. The
  eight routines and their set-up were checked bit for bit against the
  6502 code on 4,680 lines (`work/tests/test-math-line.js`).
- **Line colour**: `$AE06` patches all eight routines to `ORA $5660,X` (the
  pixel pair gains %01, `$AE02`) or `AND $7760,X` (the pair becomes %00,
  `$ADFC`). Buildings and objects are drawn with AND: white lines. The roads
  are drawn with ORA (`$9054`): over the ground's %10 that gives %11, the
  colour-RAM colour (dark grey on the surface), and over the sky's %01 it
  changes nothing. A building's edges are drawn from the last down
  (`$96E7`): those after its pen split (`$98`) with ORA, as road marks
  on the ground, then the structure with AND. *Live*: the roads of the
  descent's frame are %11. A room is drawn by the same routine with the pen
  split set to `$FF` (`$920A`), so every room edge is ORA, %11, byte 4's
  colour; the objects in it follow with AND (`$8592`), white.
- **Colours**: %00 is `$A3` (white on the surface), %01 the sky (blue, fixed
  by `ORA #$60` at `$BB4C`), %10 `$A5` (the ground), %11 `$A6`; the
  surface's are `01 06 05 0B` at `$B27D`. `$BB48` writes `$60` OR `$A5`
  into the view's matrix `$5C00`-`$5EA7` (so %01 is blue and %10 is `$A5`)
  and `$BB4F` fills colour RAM with `$A6` (%11), whenever the place changes.
  The next place's colours wait in `$C2`-`$C5` and become `$A3`-`$A6` when
  the view changes: at the end of a door wipe (`$AEF3`), a lift arrival
  (`$A2E3`-`$A2E9`) or the end of a ride (`$BB1D`). Underground, a room's
  byte 3 goes to `$C4` (`$91DB`) and byte 4 to `$C5` (`$91E5`); `$C2` is 1,
  white (`$9399`), or 0 in an unlit dark room (`$9200`). A booth's flash
  swaps `$A5` for `$BB7E` + `$F0` each pass (`$AFA8`).
- **Sky and ground** (`$AFD5`): each row is split at the horizon's x; cells
  on the left get `$82` through the unrolled fill in page `$BE`, cells on
  the right `$83` through page `$BD` (entry offsets written at `$B10B` and
  `$B0F9`), with the boundary byte from `$BC4C`. `$82`/`$83` are `$55` sky
  and `$AA` ground, swapped when the craft is upside down. The horizon's x
  moves |cot roll| × 128/256 a row. Inside a complex the view is filled with
  `$AA`.
- **Display modes** (operands of `$B9BB`, `$B9F8`): normal, top curtain
  (`$AE37`: multicolour text with `$D018` = `$F6`, a solid band, switching
  to the bitmap at line Y + 50), bottom curtain (`$AE76`). The wipes
  `$AE96` (down, 6 lines a frame, in the new ground colour) and `$AEF3` (up,
  4 lines a frame) hum on voice 2 ring-modulated by voice 1 (`$AF52`). A
  lift ride sweeps two text bands in the shaft colours `$BBCA` past the view.

## The panel

- Text rows 17-24 of the matrix, character set `$7800`. `$B53D` runs once a
  pass: ALT (`$B56D`) shows `$77` as two digits, then `$76`:`$75` × 1000 /
  65536 as three, so ALT = height × 1000/65536 (the Colony Craft's deck,
  `$40FF3F`, reads 64997); SPEED (`$B5A8`) is the speed's 16-bit value, high
  byte as two digits, then the low byte × 25/64; LOC (`$B64C`) shows each
  coordinate's high byte from −99 to 99, negatives in reversed figures
  (glyphs `$80`-`$89`); beyond, `$803A`'s `$AA` entries print `**` and `$EF`
  is set. At −128 it would read a reversed `*9`.
- The EL and COMP dials scroll the dial tape `$7680`-`$76ED` a row at a
  time from the panel interrupt (`$B67B`, `$B75B`, `$B809`, `$B899`): EL is
  coloured by pitch quarter (blue, blue, green, green, `$B757`), COMP by
  heading quarter (red, blue, black, green, `$B895`).
- **Metal Detector** (`$B542`): with object 26 carried, on the surface,
  below `$77` = 1 and outside 00-00, the message window turns blue on a
  Mechanoid square (`$2B00` bit 6), red on a nobody's square (bit 5), green
  otherwise; without it, red.
- The gun sight is sprite 0 (`$7640`, pointer `$D9`), shown only while object
  40, the Sights, is carried (`$9374`).

## The city

- 16 × 16 squares, number Y × 16 + X (`$B7`, the same index for every
  table). `$2600`/`$2700` give each square's building model, read only by
  `$9575`; they point at 98 distinct models: 91 structures and 7 road
  pieces. 233 squares hold a structure (00-00's is never drawn) and 23
  only a road piece. The image holds 106 models: 91 buildings (29 at
  `$C000`-`$CF66`, 62 at `$E1D3`-`$FFCF`), every one used, and 15 road
  pieces (`$E000`-`$E1D2`), 8 of them unused. Drawn all at once, the city
  would be about 7,500 points and 9,600 edges; one square is a few dozen.
- **Building model** (loader `$9575`, reader `$968D`): +0 last vertex, +1
  last edge, +2 pen split P (edges 0-P are the structure, drawn with AND;
  later edges are road marks, drawn with ORA; `$FF`: all road marks), +3
  rotor R (0: none; else (R AND 15) + 1 spinning vertices, speed (R AND
  `$F0`)/2 into `$A2`, then the rotor centre's x and z at +4, +5). Edges
  are one byte, from-vertex in the high nibble, to-vertex in the low, until
  a `$00`, then two bytes each. Spinning vertices are 3 bytes (dx, height,
  dz in quarter units); the rest are 2: x = byte1 AND `$3F`, z = byte2 AND
  `$3F` (0 → `$00`, 63 → `$FF`, else value + `$60`, so `$80` is the
  centre), height = (byte1 >> 6) × 4 + (byte2 >> 6), 15 meaning a third
  byte follows. A unit is 1/256 of a square. Vertices 60-63 are the square's
  road ends (east, west, south, north).
- A building with a rotor turns its first vertices by `$A2` a pass
  (`$A12B`, `$A4B2`) unless the square is destroyed.
- **Roads** (`$2C00`-`$2FFF`): for each square, the squares at the two ends
  of the road along its row (`$2C00` west, `$2D00` east) and of the road
  along its column (`$2E00` north, `$2F00` south), 0 for none; every square
  a road crosses lists the whole road. 32 roads (15 along X, 17 along Y)
  with 52 distinct ends. In every square, a building model draws a stub toward a road end exactly
  when the map names another square there (68 entries name the square
  itself, where a road ends).
- Roads are drawn only from height 2048 up. `$8EC2` lists the roads in a
  (2r + 1)² window of squares around the player, r = `$2A00`[height / 2048]
  (0-63; the value 29 never occurs), clipped to the city (`$8F7F`), into the
  point list `$7540` and the edge lists `$7580`/`$75C0`; `$9054` draws them.
  Roads ending in the player's square are skipped, and that square's own two
  (`$757C`-`$757F`) are drawn only above 65535 (`$909D`). From height
  `$200000` up, the 13-road picture at `$902A` replaces them.
- **Square status** `$2B00`: bit 7 destroyed (the model is flattened by
  `$96A6`/`$96AC`, and the rotor stops); bit 6 Mechanoid, bit 5 nobody's,
  neither Palyar (115, 27 and 114 squares); bits 0-4 n: when the square is
  destroyed, script 32 + n runs once and the bits are cleared (`$8800`-`$8813`).
  The 27 nobody's squares are the 23 road-piece squares, the three
  ground-grid squares (`$CDC0`) and 00-00; destroying one starts no script
  (`$87CD`, `$8805`).
- **Named squares** (script = 32 + n):

| Square | Script | Name (from the script) | Model |
|---|---|---|---|
| 03-08 | 36 | Novabill (no reprisal) | `$E88D`, a giant head |
| 02-03 | 37 | the author's advert | `$CE24`, spelling ENCOUNTER! |
| 12-03 | 38 | Sabins Cube | `$CF25`, a cube on its corner, turning |
| 06-00 | 39 | Walton Monument | `$EF57` |
| 06-03 | 40 | St. Stallards | `$F3D3` |
| 10-01 | 41 | Moorby Arch | `$F2D4` |
| 07-00 | 42 | Tyler Point | `$F003` |
| 08-07 | 43 | Bosher Stadium | `$C3D1` |
| 12-13 | 44 | Jordan Airport | `$E1D3` |
| 02-04 | 45 | Vector Henge | `$EC4A` |
| 07-09 | 46 | the brother-in-law's house | `$E655`, a cottage |
| 01-04 | 47 | Mechanoid Fort | `$EBE9` |
| 15-02 | 48 | Coach and Horses | `$F448` |
| 13-04, 03-13, 09-13, 04-15, 09-15 | 49 | TRAITOR! | `$C82E`, the Commodore logo |
| 14-05, 14-08, 12-11, 06-15, 11-15 | 50 | GOOD SHOW! | `$C7B2`, the Atari logo |

  *Live*: the logos (`reference/sign-commodore-1304.png`,
  `reference/sign-atari-1405.png`), and "TRAITOR!" when 13-04's sign was
  shot (below). The manual's Science Museum at 03-01 (`$FE98`) has no
  name of its own: `$2B00` = `$43` gives it script 35, the one for
  unnamed Mechanoid squares. Scripts 36-48 print "YOU HAVE JUST DESTROYED" and the name, and
  all but 36 then set off an attack by the square's owner.

## Objects

- 64 objects. Their model is `$2800`/`$2840`: +0 last vertex; 3 signed
  bytes a vertex (X, height, Y) in steps of 16 units (`$A6F1`, `$978A`);
  then an edge count e: below `$80`, e + 1 one-byte edges (two nibbles),
  else (e AND `$7F`) + 1 two-byte edges. Every edge is drawn: there are no
  faces or colours. All 55 models parse end to end.
- **`$2940`**, the object's room: 0 the surface, `$01`-`$AE` a room, `$FF`
  carried, boarded or out of play.
- **`$29C0`** flags: bit 7 carried; 5 too heavy (TOO HEAVY without the
  Antigrav or the Sink, `$9817`); 4 fixed (needs the Sink, `$980B`); 3 print
  the name (canned message n) when taken or boarded; 2 start script n then
  (`$98B1`); 0 sold. Bit 6 is toggled at `$9360` and read by nothing.
- **Roles**: objects 0-7 are the craft B can board (`$9857`); 8-15 move
  (`$8690`, velocities and lifetimes at `$BDA3`): 8 is the player's
  missile, 14 the attacker's missile, 15 the attack ship; 10 is the wreck.
  Object 0, the brother-in-law's new ship, moves +1/256 square in Y each
  surface pass along column 00, wrapping from row 15 to 0 (`$85C5`). Object
  7 is the interstellar ship (room 5, behind the Pass). Object 63 is the
  Colony Craft, at height `$40FCC0` over 08-08 and drawn as a dot.
- **Names**: canned message n is object n's name; T or B prints it for the
  objects with `$29C0` bit 3 (6, 16, 24-32, 34, 35, 38, 40-47), and the
  scripts name the Mechanoid (12). 6 CHEESE, 12 MECHANOID, 16 PHOTON EMITTER, 24 ANTI TIME BOMB, 25 NOVADRIVE, 26 METAL
  DETECTOR, 27 ANTIGRAV, 28 POWERAMP, 29 NEUTRON FUEL, 30 ANTENNA, 31 ENERGY
  CRYSTAL, 32 COFFIN, 34 LARGE BOX, 35 USEFUL ARMAMENT, 38 GOLD, 40 SIGHTS,
  41 MEDICAL SUPPLIES, 42 ESSENTIAL 12939 SUPPLY (a crate lettered PEPSI),
  43 WINCHESTER, 44 CATERING PROVISIONS, 45 DATABANK, 46 PASS, 47 KITCHEN
  SINK. 17-23 are the seven keys, each shaped like the door it opens. The
  unnamed include 48, drawn as a cobweb, and 56, a pyramid.
- **Taking and carrying**: T takes an object within 256 units on every axis
  (`$9800`), B boards one of objects 0-7 within 512 on foot (`$985D`), D
  drops the last one taken (`$990D`), L leaves a craft only when landed
  (`$98C8`). At most ten are carried (`$9827`; list `$BEB1`, count `$EB`).
- **Objects that change the rules**: the Kitchen Sink (47) skips the fixed
  and heavy checks (`$980B`); object 48 opens every locked door (`$948E`);
  the Antigrav (27) lifts heavy objects; the pyramid (56) lets D work in
  the air, leaving the object at the player's height (`$98FE`); the Poweramp
  (28) in the Dart doubles its thrust and raises its ceiling to 90
  (`$9F8A`, `$A050`); the Photon Emitter (16), carried or in the room,
  lights the dark rooms; the Anti Time Bomb (24), carried, turns a hit on
  a destroyed building into its repair (`$87AF`, `$8816`); the Pass (46)
  works the lift at 03-15.

## Moving

- **Mode** `$A9`: 0-7 the craft the player is in (its object number), `$80`
  on foot, 9 falling, 10 the opening's descent. `$9D99` copies craft n's
  16-byte motion record from `$9DAD` + 16n to `$BEA0` and the main loop runs
  `JMP ($BEA0)`: `$9F17` flying (records 0, 1, 3, 4, 6 and 8), `$9EFD` on
  the ground (2, 5), `$9E5D` interstellar (7), `$9EBE` falling (9), `$9E66`
  and then `$9E60` the descent (10).
- **Walking** (`$A18B`, `$A1ED`): stick up adds −80 cos h to Y and −80 sin h
  to X each pass (rounded down), stick down the reverse; left and right turn
  16/1024. No inertia and no height change. *Live*: 14 steps moved Y by
  `$460`.
- **Flying** (`$9F17`-`$A13C`), each pass:
  1. The turn rate decays and gains the turn acceleration while the stick
     is left or right.
  2. The stick moves the pitch by the record's pitch rate.
  3. Speed v = (v + T × thrust) × keep, T being the throttle `$EC`/`$ED`
     set by the keys.
  4. Y += v cos p cos h, X += v cos p sin h.
  5. On the ground (`$7F` set) with |v| below 128 the pitch is held level
     and the height does not change; otherwise height += v sin p × climb,
     halved for every 65536 above the ceiling (`$BEAD`).
  6. Height below 64 is a touchdown: a crash if this pass's height step was
     256 or more, or the pitch is 640-1023 (nose down more than 45°);
     otherwise the craft lands (height 63, roll 0, ground handling record
     8). A crash throws the player out (`$98C8`) and flashes black (`$B242`).
  7. Over 08-08 at height `$40` with the middle byte `$FC` or more, the
     craft lands on the Colony Craft's deck (`$40FF3F`) with no crash test.
  8. The heading changes by the turn rate; the roll follows it.
- **Take-off**: the level pitch's sine is −0.003, so above speed 128 a craft
  on the ground lands again every pass; pulling back lifts it past 64 and the
  flying record returns. *Live*: the Dart left the ground with full throttle
  and the stick back (`reference/flight-dart-descending.png`).
- **The records** (`$9DAD`), and the top speeds the SPEED readout gives with
  the throttle at its limit, in the air and on the ground, against the
  review table in Zzap!64 13 (craft matched by speed where the code does
  not name them):

| Record | Craft | Ceiling | Thrust | Top speed | Zzap!64 |
|---|---|---|---|---|---|
| 0 | the brother-in-law's new ship (object 0) | `$5A` | 0.906 | 11577 / 3859 | — |
| 1 | Dominion Dart | `$0A` (`$5A` with the Poweramp) | 0.391 | 4990 / 1663 | 4950 / 1650 |
| 2 | car (ground only) | — | 0.195 | 832 | 825 |
| 3 | jet | `$5A` | 0.195 | 7485 / 832 | 7400 / 825 |
| 4 | Palyar diamond | `$01` | 0.391 | 1663 / 1663 | 1650 / 1650 |
| 5 | land Dart (ground only) | — | 0.906 | 3859 | 3837 |
| 6 | CHEESE | `$5A` | 0.781 | 9980 / 3327 | 9900 / 3300 |
| 7 | interstellar ship | — | — | — | — |

- **Throttle** (`$B47E`, `$BC50`): digits 1-9 set T to 2^(n+4), 0 to 2^14;
  SHIFT reverses it; SPACE and ← set it to 2^−31, a stop; + and − multiply
  it by 1.03 and 0.98 every pass while held (`$B499`), refusing 2^15.
- **Falling** (record 9, `$9EBE`): height −12032 a pass, roll +16, pitch
  +21, heading +13.
- **No collisions on the surface**: no movement path tests a building;
  underground `$939E` holds the player inside the room's walls (the wall
  sound, `$9413`).

## Lifts

- The E key (`$B3FD`) starts a ride when no ride is running (`$CA` = 0) and
  `$7F` is set. On the surface it needs the middle bytes of X and Y (`$73`,
  `$79`) both in `$70`-`$73` and the square in `$B4B6`/`$B4BE`, entries 1-8:
  09-06, 09-05, 03-00, 11-13, 03-15 (the Pass, `$B430`; else PASS HOLDERS
  ONLY), 81-35, 136-136 (LOC `**`), 08-08. Nothing tests the height.
  Underground, E works anywhere in rooms 1-8, the hangars (`$B455`).
- The ride (`$A24A`, `$BA7B`, `$BADD`) goes down to room n or up to the
  lift square; room 8's lift comes up on the Colony Craft's deck. Arriving
  below, `$A2EB` sets the middle bytes of X and Y to 8 and the low bytes come
  from door 0's placement (room 8: X `$08:$20`, Y `$08:$80`, as in the live
  test). No room name is printed on a lift arrival: the name is printed only
  when a door wipe ends (`$AEE4`).
- **The 08-08 lift works from the ground.** Entry 8 is meant for the deck,
  but with no height test it answers on the ground too. *Live*: standing at
  08-08 with `$73` = `$79` = `$71`, E took the player down into room 8, the
  Colony Craft's hangar; E there brought them up to height `$40:$FF:$51`, on
  the Colony Craft's deck (`reference/lift-0808-room8-hangar.png`,
  `reference/lift-0808-colony-deck.png`).

## Underground

- 174 rooms, `$01`-`$AE` (`$2300`/`$23C0`, records `$3000`-`$3B23`). A record (`$90F6`-`$9287`,
  `$9437`): byte 0 X size in units of 256 (bit 7: transporter booth); byte
  1 height (bits 0-2) and a number n (bits 3-7); byte 2 Y size (bit 7: on
  entry start script n, else show canned message n through `$F7`); bytes
  3, 4 colours (`$C4`, `$C5`). Doors follow, 4 bytes each: type (bit 7 in a
  wall of constant X, bits 4-6 which door of the destination you come out
  of, bits 0-3 the outline), destination, X, Y. A 0 ends the list; `$80`
  ends it and makes the room dark.
- The room is a box: 8 corners from the sizes (`$919E`), 12 edges from
  `$933A`/`$9346`; the doors are outlines from `$928A` through `$932B`: 2
  plain, 3 triangle, 4 up arrow, 5 down arrow, 6 cross, 7 diagonal, 9-15
  key shapes. A door of type 8-15 is LOCKED (canned message 0, `$9430`)
  unless object 8 + type is carried (`$9493`) or object 48 is.
- **Transporter booths**, rooms `$72`-`$87`: cross-marked doors are two-way
  (on entry door 0 is relinked to the room you did not come from,
  `$9119`-`$913B`), diagonal ones one-way; room `$72` sends you to one of 8
  rooms at random (`$910E`); room `$7F` toggles the mirror flag `$F1`, which
  swaps the stick's left and right (`$A165`, `$A17B`) and flips the view,
  but only when entered from room `$90`: both its links name `$56`, so
  entering from `$56` skips the relink, the flash and the toggle (`$9125`).
  Nothing else writes `$F1`, and CTRL + Q leaves it set. The relinked doors
  are not in the save file.
- **Dark rooms**: 20, shown dark with ITS VERY DARK IN HERE (canned message
  1) unless the Photon Emitter is carried (`$941A`) or in the room
  (`$9425`); all 9 triangle-marked doors lead into one. Hangar 5 is the one
  dark room with a name: `$9224` stores its message 9 over the 1 stored at
  `$9208`, so Benson says HANGER.
- Rooms 1-8 are the hangars (16 × 16 × 4, HANGER). The doors that do not
  lead into booths join them into complexes: hangars 1 and 2, 78 rooms;
  hangar 3, 13 (every Mechanoid room); 4, 9; 5, 12; 6, 3; 7, 7; the Colony
  Craft's floors 8, 10 and 12. Every door leads to a door that leads back,
  except the doors into the ten one-way booths, room `$45`'s door 0 (it
  names door 6 of room `$96`, which has 4) and room `$AB`'s door 3, the
  drop from the Colony Craft. Four doors carry a skull and crossbones
  (objects 57-60): into the mirror booth (`$90`), the drop (`$AB`), the
  prison (`$62`) and dark hangar 5 (`$6F`). The prison's one door is
  recorded 128 units outside its walls (X `$84`) and needs key 17 anyway. The Colony Craft has three floors joined
  by booths `$86`/`$87`: the top with hangar 8 (three doors need key 23),
  the middle `$9A`-`$A3`, the bottom `$88` and `$A4`-`$AE`. Room `$AB`'s door
  3 leads to room 0: the player falls from beside the Colony Craft
  (`$90ED`, mode 9).
- 23 rooms start a script on entry (the briefings `$29` Palyar and `$66`
  Mechanoid, communications `$10`, the prison `$51`, the banks and the
  sale rooms); room `$A8` shows canned message 15.

## Weapons and attacks

- **Firing** (`$886A`): with fire pressed (`$81` = 0), in a craft, on the
  surface, object 8 flies along the view direction at 4096 units a pass for
  16 passes. Hitting object 15 prints ENEMY SHIP DESTROYED; hitting object
  0 starts script 27.
- **Hitting a building** (`$871B`): a moving object below height 2048 whose
  X and Y middle bytes are both in `$70`-`$8F` (within 4096 units of a
  square's centre) sets that square's bit 7, keeps the old status in `$FB`,
  and starts a 16-pass countdown `$F4` on square `$F5`.
- **The follow-up** (`$879B`, every pass): only while the player is in
  square `$F5` (`$87A4`) does it collapse the model, count the square in
  `$BEBC` (Mechanoid) or `$BEBB` (Palyar), nothing for nobody's (bit 5), and
  start its script. If the lead of one count over the other reaches 105
  (`$BEBC` − `$BEBB`, script 10, the Palyar reward) or 106 (the other way,
  script 26), that script runs instead (`$87EE`-`$87FE`).
- **Shooting into the next square** goes unnoticed. The countdown runs out
  while the player is elsewhere, and a later hit finds the square already
  destroyed (`$87C1`), so the building is never counted or named, and no
  attack follows. *Live*: from 12-04, 1024 units up, a missile fired east
  destroyed 13-04's sign (`$2B4D` `$51` → `$D1`) with no count and no
  message; inside 13-04 it lay flat (`reference/blind-shot-1304-flattened.png`).
  From the ground the same shot fails: the level sine −0.003 sinks the
  missile below ground (`$8778`) within about five passes.
- *Live*, from inside the square: at 13-04 the sign sank into the ground,
  `$BEBC` became 1 and Benson printed TRAITOR!
  (`reference/sign-commodore-collapsing.png`, `-flattened.png`).
- **Attacks**: `$BEF8` is set by the square scripts (34 and 35 at random,
  81 in 256, for unnamed squares; the named ones always) and by script 27.
  The attack ship (object 15) homes at (player − ship) / 32 a pass; its
  missile (object 14) is aimed once at launch and not steered. A hit prints
  SHIP DESTROYED and drops the player into mode 9: falling, never killed.
- `$BEBB`/`$BEBC` count destroyed Palyar and Mechanoid squares. The Palyar
  reward (script 10) moves the Pass (46) from room `$50` to room 1, or
  pays 500,000 if it has already left `$50`.

## Money and trade

- Credits are figure 8, four BCD bytes at `$7700`, most significant first;
  figure 9 (`$7704`) is the offer. Script operations 13, 14 and 21 set, add
  and sum figures at `$76E0` + 4n (only 8 and 9 are used; 0-7 would land on
  the dial tape). There is no subtraction: a purchase adds the ten's
  complement (99995000 is −5000 at `$0A29`; 99000001 is −999,999 at
  `$0E90`).
- **The Dart**: 5000, offered at the start with a Y window of 4 to 5
  seconds from the end of the question (`$0AB6`-`$0ABA`: op 2 at `$8C4E`
  zeroes the seconds `$E3`/`$E4` but not the frame count `$E2`, so every
  wait of n seconds lasts between n − 1 and n). *Live*: Y at the fifth offer gave "TRANSACTION
  COMPLETED", "YOU HAVE 4000 CREDITS", `$7700`-`$7703` `00 00 90 00` →
  `00 00 40 00` (`work/dart-bought.vsf`). Boarding it unbought angers the
  brother-in-law (`$BEC0` bit 5) and a Palyar ship attacks (script 1).
- **Sales** (object: Palyar room / Mechanoid room; each object is paid for
  once, `$29C0` bits 0 and 4; the Mechanoid rooms pay only while the
  Mechanoid lies in room `$66`):

| Object | Palyar | Mechanoid |
|---|---|---|
| Neutron Fuel (29) | 200,000 (`$88`) | 250,000 (`$46`) |
| Energy Crystal (31) | 100,000 (`$AD`) | 100,000 (`$32`) |
| Large Box (34) | 35,000 (`$93`) | 80,000 (`$30`) |
| Useful Armament (35) | 65,000 (`$92`) | 120,000 (`$22`) |
| Winchester (43) | 100,000 (`$90`) | 250,000 (`$12`) |
| Databank (45) | 100,000 (`$AA`) | |
| Mechanoid (12) | 250,000 (`$9A`) | |
| Essential 12939 Supply (42) | 50,000 (`$9B`) | |
| Gold (38) | 100,000 (`$A2`) | |
| Catering Provisions (44) | 60,000 (`$A3`) | |
| Medical Supplies (41) | 40,000 (`$A5`) | |

  The best total, the Dart not bought: 1,400,000 + the 500,000 reward +
  9000 = 1,909,000, the maximum Zzap!64 18 printed.
- **The hired ship** (script 2, room `$10`, the radio working only with the
  Antenna carried or in the room): 999,999, but the test at `$0E6F` is
  `$7700` > 0, i.e. at least 1,000,000. Credits start at 9000 and every
  price is a multiple of 5000, so they always end in 4000 or 9000 and
  exactly 999,999 cannot occur. The ship is object 7, placed over 08-08 at
  height `$7F0000` by `$8664` and lowered by `$8634` for 780 passes (about
  2.6 minutes; the message says 2 MINS).
- **The escape** (script 7, `$107F`): riding object 7, on the surface, with
  the ship hired or the Novadrive carried, answering Y, and 02-03 (the
  advert, `$2B00`+`$32` bit 7) not destroyed; otherwise THE AUTHOR WON'T LET
  YOU LEAVE. It pokes `$BEFE`; `$AA62` then runs the escape starfield and
  never returns. The ending never clears `$BEC0` bit 6, so GAME OVER repeats
  for ever, a 15-second wait and a 150-frame line apart.

## The event scripts

- A script is bytes read through `($1F),Y`. Each operation byte has the
  operation in bits 0-5; bit 7 inverts a test; bit 6 makes a taken test a
  call. A test is followed by its operands and a two-byte target: taken,
  the script jumps (or calls, pushing the return address on `$BEC2`, index
  `$E5`); not taken, it goes on after the target. `$8AB2` runs one
  operation a main-loop pass and waits while a message prints (`$E6` ≠ 0).
- `$8A8C` starts event script A: it refuses while `$BEC0` bit 6 is set,
  sets it, pushes the running script's address and jumps through
  `$0800`/`$0801`; event scripts end by clearing bit 6 and returning.
  `$7203` starts script 0 directly. Triggers: entering a room (`$921E`),
  taking or boarding object n with `$29C0` bit 2 (`$98C0`), a square
  destroyed (`$8813`), object 0 hit (`$8797`).

| Op | Handler | Does |
|---|---|---|
| 0 | none | the table entry is `$0000`; no script uses it |
| 1 | `$8C36` | print the tokens that follow, up to a 0 |
| 2 | `$8C4E` | zero the seconds clock `$E3`-`$E4` |
| 3, 4, 5 | `$8BB2`, `$8BA3`, `$8BBE` | jump, call, return |
| 6 | `$8B47` | test the square: `$74` and `$7A` against two operands |
| 7 | `$8AF0` | test clock < operand |
| 8, 9 | `$8C57`, `$8B41` | call machine code (9 tests its carry); no script uses them, and neither could return correctly (`$8C69` returns into op 13) |
| 10 | `$8AE5` | test operand < a new random byte `$E8` |
| 11 | `$8B60` | test the last key (SHIFT and CTRL ignored), then clear it and beep |
| 12 | `$8B37` | test object `$57EE` carried (`$941A`) |
| 13, 14, 21 | `$8C6C`, `$8C73`, `$8C98` | set, add, and sum four-byte BCD figures (13 turns the `ADC` at `$8C89` into `BIT`) |
| 15, 30 | `$8BF5`, `$8CDB` | set and copy the script variables `$57E0`-`$57EF` (setting `$57ED` also writes "XX-YY" at `$BEF9`) |
| 16, 17, 18 | `$8CF3`, `$8CFF`, `$8B2D` | set, clear and test bits of `$BEC0` |
| 19 | `$8B24` | test the player in room `$57EF` (`$CD`) |
| 20, 27 | `$8D22`, `$8D34` | print canned message n (27 picks n at random) |
| 22, 23 | `$8D46`, `$8B03` | add to and test `$BEBD` (saturating at +127/−128); no script uses them |
| 24, 25 | `$8AD0`, `$8D0D` | test a byte of memory > value; write a byte |
| 26 | `$8B72` | test square `$57ED` destroyed (`$2B00` bit 7) |
| 28 | `$8D40` | forget the key (`$B4B2`) |
| 29 | `$8B17` | test object `$57EE` in room `$57EF` (`$2940`) |
| 31 | `$8B57` | test the player in square `$57ED` (`$B7`); no script uses it |
| 32, 33 | `$8BDB`, `$8B7C` | set or clear, and test, `$29C0` bits of object `$57EE` |
| 34 | `$8B0E` | test the craft the player is in (`$A9`) |

- **`$BEC0`**: bit 0 the last answer was Y; 1 the key-sites message given
  (`$11F5`, used by both site scripts, of which only 10 pays); 2 the
  ship hired; 3 the advert destroyed (read by nothing); 5 the
  brother-in-law angry; 6 an event script running; 7 the stick or a key
  touched (`$B2FE`), which script 0's idle lines test.
- **The scripts**: 0 the opening; 1 the Dart boarded (the job offer if
  bought); 2 communications and the hired ship; 3-6, 9, 14-19 the Palyar
  sale rooms; 20, 22-25 the Mechanoid ones; 7 the escape; 8 and 29 the
  banks; 10 and 26 the site rewards; 11 the prison; 12 the Mechanoid taken
  (THE MECHANOID DEMANDS THAT YOU PUT HIM DOWN); 13 and 28 the briefings,
  each paragraph given only while the player stays in the room; 27 object
  0 hit; 34, 35 unnamed squares destroyed; 36-50 the named squares; 21 and
  30-33 point at a spare "CRASH" script nothing starts. Every script byte
  in `$0866`-`$1248` and `$7001` parses; `$0A96`-`$0A9C` (a 3-second wait)
  and `$0B15` are never reached.

## Text

Three alphabets on one character set (`$7800`):

| What | Glyph for a character | Seen |
|---|---|---|
| Message window | ASCII + `$80`: `$C1` is A, `$A0` space, `$ED` ?, `$EE` !, `$EF` ' (the letters are holes in solid cells) | *live*: "DO YOU WANT TO BUY?" read from `$5F7A` |
| Panel labels | ASCII − `$20`: `$21` is A (EL is `$25 $2C`), the Atari's internal screen code | *live*, screen row 18 |
| Figures | the value: `$00`-`$09` are 0-9; `$8B` +, `$8D` − | *live*, the LOC, ALT and SPEED readouts |

Stored text is ASCII in capitals, the last character of a word with bit 7
set. In messages, values 0-9 stand for the digits, `$0A`-`$0F` for
* + , - . / (glyphs `$8A`-`$8F`: so `$0D` is a hyphen, "TYPE - DOMINION
DART"), and `$6D`, `$6E`, `$6F` for ?, ! and '. "LOAD NO. O-9 ?" is
written with the letter O, which has the same glyph as the digit 0 (`$7E78`
and `$7800` hold the same bytes). Inside a word or a literal a zero byte
prints as 0; only the print operation's scan for the end of its text
(`$8C40`) would stop at one, so a zero in a script's literal would leave the
script pointer short.
A message is a list of tokens, ended by 0 (`$8E1E`):

| Token | Meaning |
|---|---|
| `$01`-`$07` | word n of the dictionary, printed straight after the previous one (endings such as S and ED) |
| `$08`-`$EE` | word n, after a blank |
| `$EF` | a blank |
| `$F0`-`$F7` | the word whose number is in `$57D8`-`$57DF`, after a blank; no message uses them |
| `$F8`-`$FE` | figure 8 + (token AND 7), the four BCD bytes at `$7700` + 4 × (token AND 7), formatted into `$7720` |
| `$FF` | literal text follows, up to the character with bit 7 set |

- Word n starts one byte after the address in `$2120`+n (low) and
  `$2210`+n (high); 90 word numbers are unused. Canned message n starts
  one byte after `$20A0`/`$20E0`+n; 17-20, 33, 37, 39 and 51-55 repeat
  their neighbour's pointer. 10, 11, 13, 14, 22 and 36 are printed by
  nothing: the rooms name only 9 and 15; operation 20 names 3, 4, 5, 7, 8,
  12, 21, 23 and 50, and the sale objects through `$57EE` (`$1027`);
  operation 27 names 60-63; the code prints 0 (LOCKED, `$9430`), 1 (dark
  rooms, `$9206`), 2, 48-50, 56-59 (the save and load prompts, `$B373`,
  `$B380`, `$B3B4`) and the objects with `$29C0` bit 3, none of which is 10,
  11, 13, 14, 22 or 36.
- **The printer** (`$8DC3`, every frame): text scrolls into the window
  `$5F78`-`$5F8E` in 25-character lines, one character a frame, the tick on
  voice 3 at frequency (character AND `$3F`) + `$30`, blanks silent. After
  each line it waits until the frame count `$E0` reaches `$E1` (`$7D` in
  play, `$96` at the ending): lines start 124 frames apart in play, 25
  moving and 99 still, and a message of L lines keeps the printer busy for
  124 L + 1 frames. The window is 23 cells wide, so the first two characters
  of each line have scrolled off when it stops. `$DE`/`$DF` are single bytes,
  so a message cannot run past 255 bytes, and `$8DAA` drops a new request
  while one prints. Lines are centred with dictionary words that are only
  spaces (words 230-238, nine spaces down to one), and canned message 50,
  nine spaces, clears the window. A port of `$8DA4`-`$8EC1` matches the
  game's code run in a 6502 simulator on every frame of all 219 messages
  (`work/tests/benson-test.js`).
- The ending prints "PLEASED YOU!VE GONE": the literal at `$1163` has
  `$6E` (!) where the apostrophe `$6F` was meant.

## Controls

The keyboard reader `$B281` scans the matrix itself and forms a key number
row × 8 + column (the KERNAL's numbering), with bit 6 for SHIFT and bit 7
for CTRL; the last key found wins, and `$E9` is latched when the number
changes. The joystick is control port 2 (`$B2FE`): directions to `$80`,
fire to `$81`; stick input skips the keyboard for that pass.

| Key | Number | Where |
|---|---|---|
| D (drop) | `$12` | `$B33F` → `$98FE` |
| L (leave a craft) | `$2A` | `$B349` → `$98C8` |
| + and − (throttle trim, while held) | `$28`, `$2B` | `$B356`, `$B361` → `$B499` |
| CTRL + S, CTRL + L (save, load) | `$8D`, `$AA` | `$B36C`, `$B377` → `$B382`: SAVE/LOAD NO. O-9 ?, the digit through `$BC50` into `$825E`, PRESS RETURN WHEN READY, RETURN → `$819E`, anything else cancels |
| CTRL + RETURN (pause, until the next new key, which is then acted on) | `$81` | `$B335` |
| CTRL + Q (quit the situation) | `$BE` | `$B3E5`: stack reset, `JMP $80E8` |
| E (lift) | `$0E` | `$B3F6` → `$B3FD` |
| digits, SHIFT + digits, SPACE, ← (throttle) | through `$BC50` | `$B47E` |
| T (take), B (board) | `$16`, `$1C` | `$970A`, `$970E` in `$9706` |
| Y (yes) | `$19` | script key tests (op 11), `$0AB6`, `$10CF` |

- **CTRL + Q** (`$80E8`) scatters everything carried, and the craft the
  player is in, at random over the city, and puts the player in the Dart
  (object 1) on its pad at 08-08; the code has no "nothing carried"
  condition.
- The cassette motor is switched on (`$01` = `$05`, `$B3B9`) while the save
  prompt waits, although the file goes to disk.

## Sound

All through `$B958` (voice 1) or `$B93A` (voice 2), four bytes a sound from
`$B987`; `$B910` loads all 25 SID registers from `$B921` at start-up
(volume 15, filter off).

| Sound | Voice | Event | Where |
|---|---|---|---|
| 0 | 1 | key beep: E, D, T/B, CTRL + Q/S/L, the save digit, a script key match; L only in a craft; the throttle keys only on the surface in a craft | `$B94D` |
| 4 | 1 | building destroyed | `$876E` |
| 8 | 1 | a missile launched, yours or the attacker's | `$8882`, `$8947` |
| `$0C` | 1 | the attacker's missile hits you | `$8983` |
| `$10` | 1 | your missile hits a ship | `$884B` |
| `$14` | 1 | walking into a wall | `$9413` |
| `$18` | 1 | crash or hit flash | `$B24D` |
| `$1C`, `$20` | 1, 2 | transporter chime | `$AEDC`, `$AEE1` |
| `$24` | 2 | engine | `$B61A` |
| `$28`, `$2C` | 2 | gate-off fades | start-up |
| `$30` | 2 | lift hum, pitch from `$BBA5` each frame | `$BA87`, `$BAE9` |

- **The engine** (`$B5D8`-`$B61C`): the sustain level is the speed's power
  of two minus 3 (at least 1); the frequency's high byte is that level plus
  the mantissa's top four bits. It is silent underground and in the
  descent. Benson's tick is voice 3 (`$8DCD`, `$8DF9`).

## Save and load

- CTRL + S / CTRL + L, a digit and RETURN (`$819E`): `SETLFS` 1, 8, 1 (disk
  only), file name "@0:MER" and the digit (`$8258`), 1904 bytes at
  `$4000`-`$476F` gathered from 14 blocks (`$8260`: high, low, length − 1;
  0 ends): `$2B00`-`$2BFF`, `$2480`-`$25FF`, `$2880`-`$29FF`,
  `$57E0`-`$57EF`, `$7700`-`$775F`, `$7ED8`-`$7F07` and `$7FD0`-`$7FFF`
  (the dial glyphs), `$5EF8`-`$5F97` (panel rows), `$8000`-`$803F`,
  `$BDA0`-`$BDFF`, `$BEA0`-`$BEFF`, `$BF00`-`$BFFF`. The world state goes
  with it: every object, every square, the scripts' state and the whole zero
  page (`$B8F6` swaps it with `$BF02`-`$BFFF` around the KERNAL calls).
- After a save or load, `JMP ($BFFD)` at `$8215` resumes through the game's
  own `$FD`/`$FE`, which hold `$2160` (`SEI`, `JMP $80BA`); a loaded file
  could supply another address there. The SAVE result is not checked; a
  failed LOAD resumes unchanged. The booths' relinked doors (`$3000`-`$3B16`)
  are not saved. Because `$8000`-`$803F` is saved, a save made with the
  original disk carries `CBM80` into any copy that loads it.

## Hardware register census

Every absolute reference in the listing (`work/census.txt`); indexed
references cover the ranges shown.

| Register | Written at | Read at |
|---|---|---|
| `$D000`, `$D001`, `$D010`, `$D017`, `$D01B`, `$D01D` (sprite 0 at 160, 116, expanded, in front of the view) | `$817F`, `$8189`, `$8191`, `$8177`, `$816C`, `$817A` | |
| `$D011` (modes, per band) | `$81BF`, `$B9C3`, `$BA00`, `$BA42` | `$B250` |
| `$D012` (raster) | `$8169`, `$B9DC`, `$BA14`, `$BA31` | `$731C`, `$74E8`, `$AA9E`, `$AF76`, `$B255` |
| `$D015` (sprite enable) | `$937D` | |
| `$D016` | `$B9CD`, `$BA4A` | |
| `$D018` | `$B9BE`, `$B9FB`, `$BA3F` | |
| `$D019`, `$D01A` (raster interrupt only) | `$8171`, `$B9E1`, `$BA19`, `$BA36`; `$8174`, `$81A5` | |
| `$D020` (black border) | `$818E` | |
| `$D021` (per band) | `$B9C8`, `$BA05`, `$BA45` | |
| `$D027` (sprite 0 colour) | `$8184`, `$91DF`, `$B23E` | |
| `$D400`-`$D418` (all, at start-up) | `$B915`,X; `$D400`-`$D40D` `$AF45`,X | |
| `$D401`, `$D404`-`$D406` (voice 1 or 2 by Y) | `$B963`-`$B97B`,Y; `$D404` also `$922B`, `$94D3` | |
| `$D408`, `$D40B`, `$D40D` (voice 2) | `$B607`, `$BA87`, `$BAE9`; `$741E`, `$743B`, `$AF4E`, `$BB33`; `$B613` | |
| `$D40F` (voice 3, the tick), `$D412` | `$8DCD`, `$8DF9`; `$B91D` | |
| `$D800`-`$DBE7` (colour RAM) | `$80CE`, `$BB61`-`$BB6A` (the view), `$B4CC`-`$B536` (panel) | |
| `$DC00`-`$DC03` (keyboard, port 2) | `$B28E`, `$B29A`, `$B283`, `$B300`, `$B28A` | `$B291`, `$B29D`, `$B303` |
| `$DC0D`, `$DD0D` (CIA interrupts off) | `$8147`, `$814A` | `$814D`, `$8150` |
| `$DD00` (VIC bank 1) | `$8142` | |

The scripts also poke `$D404` and `$D40B`. Nothing touches the sprite
registers beyond sprite 0, `$D01C`, `$D022`-`$D026`, or the CIA timers.

## Corner cases

- `$9360` loads the carried object into Y but toggles `$29C0`,X, the slot
  numbers 1 to n, so it flips bit 6 of the wrong objects; nothing reads bit
  6.
- A taken test with bit 6 set pushes the operation's address + 3 whatever
  its operand count (`$8BA3`); no script sets bit 6.
- Message numbers above 63 (`$8D22`) and operations 35-63 are not checked.
- The door test's along-wall window is `$40`-`$BF` for Y but `$28`-`$A7` for
  X (`$9437`).
- `$9ED6` adds to `$29`, `$2B`, `$2D` without keeping them to 10 bits.
- A ground craft that becomes airborne loses 65536 units of height a pass
  and crashes (`$9F09`).
- Touchdowns with the pitch below 512 (reversing, nose up) are not levelled
  (`$A0C4`); upside-down touchdowns are safe. The Colony Craft's deck has no
  crash test, and a descent faster than 1024 a pass goes through it.
- Walking due north drifts west one unit a step: the sine is taken half a
  step off and rounded down.
- `$A861`, `$A911`, `$AA34` add the focal exponent to x'/z without checking
  it, so a point at almost zero depth is drawn at the centre.
- Room `$51` (the prison) has door 0 at X `$84` in a room 4 wide: `$9456` can
  never match it.
- The building model at `$E7FF` counts 18 vertices and has 17, reading two
  bytes of `$E849`; `$ECEF`'s vertex 6 is unused; `$F3D3` draws one edge
  twice.
- `$8FAE` never checks the road list's size (52 ends fit 60 slots).
- `$8EC2` tests whether the whole city is already listed (`$EE`) with the
  X register that `$8F7F` leaves unchanged when an axis misses the city:
  fly out of the city due north or south with a view radius of 8 or more
  and all 32 roads stay listed, where arriving any other way lists none.
  The roads then lie on the sky, where they do not show, except at the
  horizon with the nose down (checked in a 6502 simulator).
- `$B3D6` would hang if `$E1` were below 30; only the opening sets it that
  low, and it reads no keys.
- The escape loop keeps the scripts and the L, D, E and digit keys live;
  `$BEFE` stays set after CTRL + Q, so boarding craft 7 again should
  launch without Y (not tested).

## Live tests

- The opening and the idle lines, logged from the message row every
  quarter second for five and a half minutes from `$7200` with no input:
  every message listed in `features.md`, in order, the idle lines 18 s
  apart.
- The Dart bought at the fifth offer (above).
- RESTORE in play: one hit on `$8009`, and the main loop went on (nine
  passes in the next two seconds).
- Walking forward two seconds from the start raised Y from `$08:$88:$00` to
  `$08:$8C:$60`; turning changed no position byte.
- The clock rate, the 13-frame view, NTSC, the reset trap, one building at
  a time, the 08-08 lift, the signs, TRAITOR!, the shot into the next
  square and the Dart's take-off: in their sections above. Each started
  from a saved snapshot (`work/`), with pokes only to place the player.
