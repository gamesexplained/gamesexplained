---
name: c64-reference
description: Commodore 64 facts for reverse engineering, memory map, banking, video, sound, timers, interrupt vectors, and the mistakes that bite. Consult this instead of recalling from training.
---

# C64 reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

## Where to read about a game first

Before any code, and before the emulator, when the contributor has said
yes to looking the game up online (`kit/START.md`): the game's page on
C64-Wiki, `https://www.c64-wiki.com/wiki/<Title_With_Underscores>`
(search the wiki if the guessed address misses). Nearly every commercial
C64 game has one, and the pages are built the same way, so read it as a
form:

- **Infobox**: developer, publisher, year, genre, controls (which joystick
  port, or keys), media. Fills `game.json`, and says which port to drive.
- **Description and Hints**: what the game does, the scoring, the
  controls. The first rows of `features.md`.
- **Cheats**: often POKEs, which are addresses with their meaning already
  attached: a lives counter, a level number, a timer. The most useful
  steer the page can give; take each one to the disassembler as a symbol
  candidate.
- **Screenshots**: a few, of states worth naming in `reference/`.
- **Links**: Lemon64, GameBase64, CSDb, and often a manual scan. The
  manual, when one exists, outranks the wiki as a source.

It is a fan wiki: what it says is documented, not true. One of the first
games' pages states a bonus the code never awards, which is what the
`differs` status in `features.md` is for. Record it under Sources in
`features.md` with the address and the date you read it, and as
`links.wiki` in `game.json`. Its text is under the GNU Free Documentation
License: cite it, and write your own words.

## Memory map (default configuration)

| Range | What |
|---|---|
| `$0000`–`$0001` | 6510 processor port: `$00` data direction, `$01` the port. Bits 0–2 select banking (below) |
| `$0002`–`$00FF` | zero page. Games use it heavily for variables and pointers |
| `$0100`–`$01FF` | stack |
| `$0200`–`$03FF` | system work area; `$0314/$0315` IRQ vector, `$0316/$0317` BRK, `$0318/$0319` NMI (RAM vectors used by the KERNAL) |
| `$0400`–`$07E7` | default screen RAM (1000 bytes); sprite pointers at screen base + `$03F8`–`$03FF` |
| `$0800`–`$9FFF` | BASIC program area / free RAM; most games load here |
| `$A000`–`$BFFF` | BASIC ROM, or RAM underneath |
| `$C000`–`$CFFF` | free RAM, always |
| `$D000`–`$DFFF` | I/O when banked in: VIC-II `$D000`, SID `$D400`, colour RAM `$D800`–`$DBE7`, CIA1 `$DC00`, CIA2 `$DD00`. Character ROM or RAM otherwise |
| `$E000`–`$FFFF` | KERNAL ROM, or RAM underneath. Hardware vectors `$FFFA` NMI, `$FFFC` RESET, `$FFFE` IRQ |

## Banking via `$01`

| `$01` low bits | `$A000` | `$D000` | `$E000` |
|---|---|---|---|
| `$37` (default, `%111`) | BASIC ROM | I/O | KERNAL ROM |
| `$36` (`%110`) | RAM | I/O | KERNAL ROM |
| `$35` (`%101`) | RAM | I/O | RAM |
| `$34` (`%100`) | RAM | RAM | RAM |
| `$33` (`%011`) | BASIC ROM | character ROM | KERNAL ROM |

Games that run under the ROMs use `$35` and install their own handlers at
the hardware vectors `$FFFA`–`$FFFF`. When you see `LDA #$35 / STA $01`,
expect that. The snapshot's RAM image always holds the RAM underneath;
what the CPU *saw* depends on `$01` at that moment. The banks follow the
port's lines, not the byte written: a bit that `$00` makes an input reads
as 1 there. Read back, `$01` gives what was written on its output bits;
an input bit reads 1 on bits 0-2 and 4, 0 on bit 5, and on bits 3, 6 and 7
whatever was last driven on it, until bits 6 and 7 fade to 0 some 350,000
cycles later (VICE x64sc, measured 26 September 2026). The Source tab names
the chips' registers after `kit/c64/registers.py` (`vic_sprite0_x`,
`sid_v1_control`, `cia1_port_a`) on the instructions that see the chips.

## VIC-II essentials (`$D000`)

| Register | Meaning |
|---|---|
| `$D000`–`$D00F` | sprite 0–7 X, Y; `$D010` X high bits |
| `$D011` | control 1: bit 4 screen on, bit 5 bitmap mode, bit 3 25/24 rows, bits 0–2 vertical scroll, bit 7 raster high bit |
| `$D012` | raster line |
| `$D015` | sprite enable |
| `$D016` | control 2: bit 4 multicolour, bit 3 40/38 columns, bits 0–2 horizontal scroll |
| `$D018` | memory pointers: high nibble × `$0400` = screen base, bits 3–1 × `$0800` = character base, both within the VIC bank. Work it in binary: `$8E` is `1000 111x`, screen 8 × `$0400` = `$2000`, characters 7 × `$0800` = `$3800`, so with bank 1 that is `$6000` and `$7800`; `$8E` and `$8F` are the same pair, and bit 0 means nothing |
| `$D019`/`$D01A` | interrupt status / enable |
| `$D01C` | sprite multicolour; `$D01D`/`$D017` X/Y expand; `$D01B` priority |
| `$D020`/`$D021` | border / background colour; `$D022`–`$D024` extra backgrounds |
| `$D025`–`$D026` | sprite multicolours; `$D027`–`$D02E` sprite colours |

VIC bank: CIA2 port A (`$DD00`) bits 0–1, **inverted**: `%11` = `$0000`,
`%10` = `$4000`, `%01` = `$8000`, `%00` = `$C000`. The character ROM is
visible to the VIC at `$1000`–`$1FFF` in banks 0 and 2 only.

Sprite screen coordinates: sprite (24, 50) is the top-left of the visible
text area, so text column *c*, row *r* is sprite X = 24 + 8*c*, Y = 50 +
8*r*. Sprite pointers are at screen base + `$03F8` and are **multiplied by
64**, not 256, within the VIC bank. Each sprite is 63 bytes, 24×21 pixels.

Character set: 8 bytes per glyph, 256 glyphs, 2 KB. Colour RAM holds one
nibble per cell. Multicolour character mode uses bit 3 of the colour nibble
to select it per cell: in such a cell, pixel pairs `%00` are the background
`$D021`, `%01` is `$D022`, `%10` is `$D023` and `%11` the colour nibble's low
three bits.

Bitmap mode (`$D011` bit 5) reads `$D018` differently: bit 3 alone picks
the bitmap, at `$0000` or `$2000` in the VIC bank, and the high nibble
points at the screen matrix, which now holds colours, not characters.
Check `$D011` before naming a character base from `$D018`; a raster split
can change the mode per band, so read the mode where the band is set up,
not from a register dump. In multicolour bitmap mode (`$D016` bit 4 as
well) a cell's pixel pairs are `%00` the background, `%01` the matrix
byte's high nibble, `%10` its low nibble and `%11` the colour RAM nibble.
The test of a reading is a rebuild: draw the picture from memory and
compare it with a screenshot (`kit/c64/frame.py` records a frame and
compares its rebuild with the emulator's picture).

## The video chip, cycle by cycle (PAL, measured)

Measured in VICE (x64sc, vice-mcp 3.13.1) on 24 September 2026 with
`kit/c64/frame.py test`, and followed by `C64.renderFrame` in
`site/lib/c64.js`:

- A PAL frame is 312 raster lines of 63 cycles, 19,656 cycles. The raster
  register steps in a line's first cycle, except that line 0's first
  cycle still reads 311.
- VICE's picture of the screen is 384 × 272: raster lines 16-287, sprite X
  -8 to 375 (sprite X = the picture's x − 8). The 40-column window is X
  24-343 and 38 columns X 31-334; 25 rows are lines 51-250, 24 rows 55-246.
- A register written in cycle c of a line (the store's last cycle) shows
  from the picture's 8-pixel column starting at x = 8(c − 13). A colour
  shows there at once; VICE draws one grey pixel where it changes. `$D011`'s
  bitmap and extended-colour bits and `$D016`'s X scroll show a cycle
  later, `$D016`'s multicolour bit half a cycle later.
- The graphics go into a shift register one byte per 8-pixel slot, at the
  pixel whose low three bits equal the X scroll; column i's slot is X
  24 + 8i to 31 + 8i. A scroll change that passes over a slot's moment
  loses that column, and a register not reloaded for eight pixels shows
  background.
- A sprite's Y is compared with the low eight bits of the raster line, so
  a sprite with Y below 56 is displayed twice a frame: its 21 rows start
  on the line after Y and again 256 lines further down.
- The border closes at line 251 with 25 rows and at 247 with 24. Switching
  to 24 rows between lines 247 and 250 means neither compare meets the
  raster, so the border stays open through the bottom and the top of the
  next frame. Where no character row is being fetched, the chip shows the
  byte at `$3FFF` of its bank (`$39FF` with extended colour) as a black
  pattern on the background colour.

## SID essentials (`$D400`)

Three voices, 7 registers each from `$D400`, `$D407`, `$D40E`: frequency
lo/hi, pulse width lo/hi, control (bit 0 gate, bits 4–7 waveform:
triangle/saw/pulse/noise), attack/decay, sustain/release. `$D415`–`$D418`:
filter and volume (`$D418` low nibble = master volume). Frequency to Hz:
f = value × clock / 16777216 (PAL clock 985,248 Hz; NTSC 1,022,727 Hz).

A game that never writes control or envelope registers is playing by
frequency writes alone; frequency 0 is silence.

## CIA timers and the tick

CIA1 `$DC00`–`$DC0F`: port A `$DC00`, port B `$DC01`, timer A latch
`$DC04/$DC05`, control `$DC0E`, interrupt control `$DC0D`. CIA2
`$DD00`–`$DD0F` likewise, NMI instead of IRQ.

**The tick is not the frame.** Games often clock themselves from a CIA
timer rather than the raster. Compute the rate from the latch: clock /
(latch + 1). A latch of `$411B` is about 59 Hz on PAL, not 50. Every
tempo, lifetime and duration derived from a tick count inherits this.

**Count in the unit of the loop that decrements.** A timer decremented once
per player move lasts moves, not ticks.

**Some games have no tick at all.** A game whose only `cli` is in its
attract loop runs with interrupts masked while you play, times itself with a
counting loop, and is synchronised to nothing. Count the `cli` and `sei`
instructions before assuming the interrupt you found drives the game: a
breakpoint on the handler with a hit count of zero during play settles it.
Timing derived from a counting loop follows the CPU clock, so such a game
runs about four per cent faster on NTSC than on PAL.

## Keyboard and joystick

CIA1 port A selects keyboard rows (and reads joystick port 2); port B
`$DC01` reads keyboard columns **and joystick port 1**. A game polling a
key on `$DC01` also sees the port-1 joystick. Bits, active low: 0 up, 1
down, 2 left, 3 right, 4 fire. The KERNAL's own scan leaves the last key
in `$C5`/`$CB` and the buffer at `$0277`.

The matrix. A row is the `$DC00` bit driven low, a column the `$DC01` bit
that reads low; `vice_keyboard_matrix` takes the same `row` and `col`.

| row \ col | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 0 | DEL | RETURN | CRSR → | F7 | F1 | F3 | F5 | CRSR ↓ |
| 1 | 3 | W | A | 4 | Z | S | E | left SHIFT |
| 2 | 5 | R | D | 6 | C | F | T | X |
| 3 | 7 | Y | G | 8 | B | H | U | V |
| 4 | 9 | I | J | 0 | M | K | O | N |
| 5 | + | P | L | - | . | : | @ | , |
| 6 | £ | * | ; | HOME | right SHIFT | = | ↑ | / |
| 7 | 1 | ← | CTRL | 2 | SPACE | C= | Q | RUN/STOP |

The KERNAL numbers a key 8 × row + column (A is 10, SPACE 60) and writes
64 to `$CB` when none is held. `$C5` holds the same number for the key its
scan last saw, 64 for none, and is what a game that leaves the scanning
to the KERNAL usually compares with. The modifier keys are not keys in
this numbering: the scan ORs their flags into `$028D`, 1 for either SHIFT,
2 for C=, 4 for CTRL, so CTRL+R reads as `$028D` = 4 with `$C5` = 17 (checked
in the decode table at `$EB81` of kernal-901227-03). `$0291` bit 7 set stops
SHIFT + C= switching the character set; printing CHR$(8) sets it.

`$02A6` is 1 on PAL and 0 on NTSC: the KERNAL sets it at reset from
whether the raster ever reaches line 311 (`$FF5E`-`$FF68`). A game that
keeps its music at the same tempo on both usually reads it. A game that scans the matrix itself may
number the keys the other way round, row + 8 × column; its key table is 64
bytes in that order, and printing it as an 8 × 8 grid against this one
settles which.

**A game that scans from its main loop drops short presses.** The scan
runs once a pass, not once a frame, and a pass can take several frames.
Most scanners also keep only one of two held keys and ignore a key equal
to the last one until a scan has seen none, so a doubled letter needs a
release in between. Hold each key until the game's own key variable
changes, release it, and wait for the scan to see no key before the next.

## Interrupts

KERNAL IRQ path: `$FFFE` → `$FF48` → jumps through `$0314`. Default
`$0314` = `$EA31`. A game running under ROM hooks `$0314`; a game with
KERNAL banked out owns `$FFFE` directly. NMI similarly through `$0318`
(default `$FE47`) or `$FFFA`. RESTORE triggers NMI.

## Cartridge images

A 16 KB program that loads at `$8000` and begins
`<word> <word> $C3 $C2 $CD $38 $30` is a **cartridge dump**. The two words
are the cold and warm start vectors and `$C3 $C2 $CD $38 $30` is `CBM80`
with bit 7 set, the signature the KERNAL's reset looks for at `$8000`. A
disk version of such a game is the cartridge with a loader bolted on the
front, and the loader's entry point is usually a few bytes past the
cartridge's own cold start: the cold start has to do `IOINIT` (`$FF84`),
`RAMTAS` (`$FF87`) and `CINT` (`$E518`) itself, because the KERNAL jumps
through `$8000` before doing them, and the loader runs under a KERNAL that
has already booted. Annotate the cartridge entry as well as the loader's;
the difference between them says what the machine state is on arrival.

## Freezer-cartridge backups

Many disk images in circulation are not the release but a **freezer
backup**: a cartridge (Action Replay, Final Cartridge, Expert and others)
stopped the running game and saved all of memory, packed, as one or two
files. The tells: a BASIC `SYS` line and a loader that masks the
interrupts, banks everything to RAM, unpacks colour RAM, zero page, the
stack page and the VIC and CIA registers from small blocks, then resumes
with an `RTI` into the middle of the game; reads of `$DE00`-`$DFFF`, where
freezer cartridges keep their registers. The analysed image is then the game as it stood when frozen,
not as its own loader left it, and two things follow.

- **Parts of memory may not have been saved.** A freezer cannot always
  reach RAM under the I/O area or at the very top, and a range it lost
  comes back as whatever the emulator fills memory with at power-up (in
  VICE, runs of `$00` and `$FF` in a fixed pattern). A resume that
  crashes at once usually means the vectors at `$FFFA`-`$FFFF` were among
  them. Before trusting any range that looks like fill, put a store and
  an execute checkpoint on it and play: a range the game never touches
  is spare; one it writes is working memory; one it calls is missing
  code, and nothing in the image can supply it.
- **Restart at the game's own entry.** The game's start-up code is
  usually still in memory, and it rebuilds the vectors and tables it
  needs. Find it (the only caller of the routine that sets up the
  machine, or the code the release's loader jumps to), set the program
  counter there and the stack pointer to a sane value, and snapshot
  that as the hand-over. Record the whole recipe in `orientation.md`.

## RAM the VIC cannot see

In VIC banks 0 and 2 the video chip sees the character ROM at `$1000`-`$1FFF`
within the bank, so the RAM underneath is invisible to it and free for the
CPU even while the screen is on. A game using bank 0 can keep 4 KB of
tables there and lose nothing. The same applies to `$9000`-`$9FFF` in bank
2. The corollary is that a game which also wants a character set in the
*other* bank has to copy the ROM into RAM there, which is the usual reason
for a byte-for-byte copy of `$D000`-`$D7FF` appearing somewhere in a bank
1 or 3 layout.

## RAM the CPU cannot see

The converse also bites. The VIC always reads RAM, never the BASIC or
KERNAL ROM, so a game that keeps the KERNAL switched in (`$01` = `$36`)
can still keep a bitmap, a character set or a screen at `$E000`-`$FFFF`
and show it in VIC bank 3. The CPU reading the same addresses gets the
ROM: an `LDA $E000,X` in such a game reads KERNAL bytes (a cheap source
of noise), and a `JSR $FFD2` calls CHROUT, while the snapshot shows the
game's graphics there. Say in each comment which one is meant.

The same holds at `$D000`-`$DFFF` in VIC bank 3 (`$DD00` bits 0-1 = 0).
With the I/O switched in, the CPU sees the chips there and the VIC sees
the RAM underneath, so a bank-3 game can keep 4 KB of sprites or a
character set in it. No instruction reads those bytes by address, the
emulator's CPU-view memory reads return the chips' registers, and the
coverage ledger excludes the range as I/O by default. Read the snapshot's
RAM there (the `ram` bank), and when it holds the game's data give the
range back with `coverage.include` in `game.json` and describe it.
`listing.py` names the range whenever it holds data and `game.json` has
not said what it is.

## Undocumented opcodes

The 6510 runs the NMOS 6502's undocumented opcodes, and protection code
uses them because a disassembler shows them as data bytes and a search of
the decoded instructions for an address misses them. Seen in real games:
`LAX` (`$A7` zero page: load A and X), `DCP` (`$DF` absolute,X: decrement
memory, then compare it with A), `LXA #imm` (`$AB`), and the `NOP`s that
swallow the bytes after them (`$C2` immediate, `$7C` absolute,X). `LXA`
is unstable: A = X = (A OR a constant) AND the operand, and the constant
differs between chips. VICE fixes it at `$EE`, so code that depends on it
can behave differently on a real machine. `ANE` (`$8B`, A = (A OR a
constant) AND X AND the operand) is unstable the same way, and VICE takes
`$EF` for it. `kit/c64/cpu6502.js` runs all 256 opcodes as VICE's x64sc
does, these constants included. An absolute indexed address
that passes `$FFFF` wraps round to zero page: `DCP $FF86,X` with X = `$FF`
works on `$0085`. Before saying nothing reads an address, decode the gaps
in the code with a decoder that knows these opcodes, and look for bases
that an index can carry round. `kit/c64/opcodes.py` does both (`--refs`),
with all 256 opcodes under the names VICE's monitor gives them; `--check`
compares its table with the emulator's disassembler.

## `CBM80` in a game that is not a cartridge

A program that writes `C3 C2 CD 38 30` to `$8004`-`$8008` catches the
reset and RESTORE: the KERNAL's reset routine and its NMI handler both
check for the signature and jump through `$8000` (cold) and `$8002`
(warm) when it is there. A disk or tape game does it so that RESTORE,
or a reset switch, restarts the game instead of dropping to BASIC. Read
the two vectors; test RESTORE (`vice_keyboard_restore`) with a stopping
checkpoint on the warm start.

Test the reset as well (`vice_machine_reset`), because it is not the same
path. A reset clears the 6510's data direction register `$00`, and the
KERNAL jumps through `$8000` before its `IOINIT` would set it to `$2F`
again. With `$00` = 0 every line of the processor port is an input and
the three that select the banks read high, so writes to `$01` change
nothing: BASIC, KERNAL and I/O stay
in whatever the game asks for. A game whose restart does not set `$00`
itself runs after a reset with BASIC over its data at `$A000`-`$BFFF`.
Read `$00` and the CPU's view of the game's tables after the reset; the
symptom is usually wrong colours or missing graphics, not a crash.

## Screen codes and PETSCII

Screen codes: `@`=0, A–Z=1–26, space=32, digits `0`–`9`=48–57, symbols
follow. Bit 7 inverts. PETSCII (used by the KERNAL's print routine and in
files) is a different encoding: A–Z at `$41`–`$5A` (or `$C1`–`$DA`),
digits `$30`–`$39`, `$0D` is return. A string block that reads as garbage
in one encoding may be perfect in the other, and a custom character set
may use neither (see `30-text`).

## Mistakes that bite

- Sprite pointers × 64, not × 256. Getting this wrong yields an address in
  code and a false "the sprites don't resolve".
- **Moving characters are very often character graphics, not sprites.** A
  2×2 block of glyphs stamped at screen offsets 0, 1, 40, 41 is a
  standard animated actor; four such blocks give four facings. Render
  candidate glyphs as images; a shape is instantly recognisable.
- The same glyphs are often reused for player and enemy, distinguished by
  colour RAM only. Finding "only one" actor graphic is expected.
- **Hardware sprites may be a minimap or a cursor, not the characters.**
  Work the X/Y formula through to screen coordinates before calling
  sprites unused.
- **The character set and the sprite shapes can share one 2 KB block.** A
  character base of `$3800` covers `$3800`–`$3FFF`, and sprite pointers
  `$F0`–`$FF` resolve into `$3C00`–`$3FFF`. A game that uses only 128 glyphs
  gets its sprites for free in the upper half, and rendering the glyph table
  shows the sprite bitmaps as 8×8 noise from glyph `$80` up. That noise is
  not a second alphabet.
- **Several sprites at one position are one picture.** Sprites sharing X and
  Y with different colours are a multi-coloured object built out of hires
  layers, and a sprite that is only switched on some of the time is a part
  of the object that is only sometimes present, such as an exhaust flame.
  Catching it live is hard; reading `$D015` from the code that writes it is
  not.
- Colour RAM in a VICE snapshot is not at `$D800` in the RAM image; it is
  in the VIC-II module. Loading the snapshot back and reading `$D800`
  through the emulator is quicker than finding it in the file, as long as
  you stop the machine the instant it loads. To find it in the file
  instead, scan for a run of 1024 bytes that are all less than 16: in a
  snapshot saved without ROMs there is usually exactly one, and it is the
  colour RAM.
- **Uninitialised RAM is not data.** VICE fills unwritten RAM with a
  repeating pattern of `$00` and `$FF` runs (the run length depends on its
  RAM-init settings; one build showed `FF FF 00 00 00 00 FF FF`). A region
  of a snapshot that reads like that over and over has never been written
  by anything; do not go looking for the table that produced it.
- The RAM image in a VICE `.vsf` saved **without ROMs** starts at file
  offset 209; confirm by reading two known bytes before relying on it.
  Choose those two bytes carefully. `$0000` and `$0001` are the worst
  possible choice: they are the processor port, stored separately in the
  `C64MEM` module header, and the RAM underneath them holds unrelated
  values. Screen memory is the second worst, because a running game has
  moved on since the save. Pick two bytes of the game's own code.
  `readSnapshot` in `kit/c64/cpu6502.js` reads the modules by name: the
  port (data at offset 205, direction at 206), the RAM, and x64sc's
  registers and cycle count from its `MAINC64CPU` module.
- **A string found in a snapshot file is not necessarily the screen.** A
  game keeps its own copy of the status line to stamp onto the screen, and
  finding that copy while hunting for the RAM offset gives an offset that is
  wrong by the distance between the two.
- An unread twin of a table can exist after a relocating loader. Check
  which copy the code reads.
- PAL vs NTSC changes the clock and so every derived rate; state which one
  the emulator was set to.
- **A note table is tuned for one clock.** SID frequencies are clock-
  relative, so a table computed for NTSC plays about 0.65 of a semitone
  flat on PAL (985,248 / 1,022,727), and one computed for PAL plays that
  much sharp on NTSC. Before naming a game's notes, find the clock that
  makes its table land on equal temperament: one table value against
  f = value × clock / 16777216 for each clock is enough. Name the notes
  with that clock, and say what the other machine hears.
