---
name: c64-reference
description: Commodore 64 facts for reverse engineering, memory map, banking, video, sound, timers, interrupt vectors, and the mistakes that bite. Consult this instead of recalling from training.
---

# C64 reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

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
what the CPU *saw* depends on `$01` at that moment.

## VIC-II essentials (`$D000`)

| Register | Meaning |
|---|---|
| `$D000`–`$D00F` | sprite 0–7 X, Y; `$D010` X high bits |
| `$D011` | control 1: bit 4 screen on, bit 5 bitmap mode, bit 3 25/24 rows, bits 0–2 vertical scroll, bit 7 raster high bit |
| `$D012` | raster line |
| `$D015` | sprite enable |
| `$D016` | control 2: bit 4 multicolour, bit 3 40/38 columns, bits 0–2 horizontal scroll |
| `$D018` | memory pointers: high nibble × `$0400` = screen base, bits 3–1 × `$0800` = character base, both within the VIC bank |
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
to select it per cell.

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

## RAM the VIC cannot see

In VIC banks 0 and 2 the video chip sees the character ROM at `$1000`-`$1FFF`
within the bank, so the RAM underneath is invisible to it and free for the
CPU even while the screen is on. A game using bank 0 can keep 4 KB of
tables there and lose nothing. The same applies to `$9000`-`$9FFF` in bank
2. The corollary is that a game which also wants a character set in the
*other* bank has to copy the ROM into RAM there, which is the usual reason
for a byte-for-byte copy of `$D000`-`$D7FF` appearing somewhere in a bank
1 or 3 layout.

## Screen codes and PETSCII

Screen codes: `@`=0, A–Z=1–26, space=32, digits `0`–`9`=48–57, symbols
follow. Bit 7 inverts. PETSCII (used by the KERNAL's print routine and in
files) is a different encoding: A–Z at `$41`–`$5A` (or `$C1`–`$DA`),
digits `$30`–`$39`, `$0D` is return. A string block that reads as garbage
in one encoding may be perfect in the other, and a custom character set
may use neither (see `re-text`).

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
- **A string found in a snapshot file is not necessarily the screen.** A
  game keeps its own copy of the status line to stamp onto the screen, and
  finding that copy while hunting for the RAM offset gives an offset that is
  wrong by the distance between the two.
- An unread twin of a table can exist after a relocating loader. Check
  which copy the code reads.
- PAL vs NTSC changes the clock and so every derived rate; state which one
  the emulator was set to.
