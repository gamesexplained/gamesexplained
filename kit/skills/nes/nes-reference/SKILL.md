---
name: nes-reference
description: NES (Famicom) facts for reverse engineering, the CPU's memory map and its mirrors, the cartridge image and the common mappers, the PPU's registers, memory, tiles, palettes and sprites, scrolling, the vertical blank and its NMI, the controllers, the APU, timing, and the mistakes that bite. Consult this instead of recalling from training.
---

# NES reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

The profile is the machine the kit runs: an **NTSC NES** (Ricoh 2A03 CPU,
2C02 PPU), as jsnes emulates it. PAL and the Famicom appear only in notes
marked as theirs.

Each fact says where it comes from: a page of the NESdev wiki,
`https://www.nesdev.org/wiki/<page>`, read on 17 October 2026 ("NESdev,
CPU memory map"); the jsnes source the kit runs, under
`tools/nes/node_modules/jsnes/src` ("jsnes, src/cpu.js"); or the kit's
machine itself ("live", with the date). Where a document and the emulator
disagree, the entry says so, and says which one the game was written for:
the hardware.

## Where to read about a game first

Before any code, and before the emulator, when the contributor has said
yes to looking the game up online (`kit/START.md`):

- **NesCartDB**, `https://nescartdb.com/`: the board each release was
  made on, its mapper, its PRG and CHR sizes and its checksums. Search by
  title. Match the contributor's image to a row by its CRC32 of the PRG
  and CHR data (the file without its 16-byte header), which says which
  release they own.
- **Data Crystal**, `https://datacrystal.tcrf.net/`: RAM maps and ROM
  maps others have published for many games. Treat each entry as a lead
  to test, not a fact: they are unchecked, and they name addresses for
  one release.
- **The Cutting Room Floor**, `https://tcrf.net/`: unused content and the
  differences between releases, which is where a page's discoveries often
  start.
- **StrategyWiki**, `https://strategywiki.org/`: the controls, the rules,
  the scoring and the enemies, for many games.
- The game's manual, for the names of the things on screen.

What a script's fetch got on 29 October 2026:

| Site | Answer |
|---|---|
| StrategyWiki's API, `https://strategywiki.org/w/api.php?action=parse&page=<Page>&format=json&prop=wikitext` | answered with the page's wiki text; the wiki's own pages gave a browser check (403) |
| Wikipedia's API, the same query on `https://en.wikipedia.org/w/api.php` | answered |
| NesCartDB, Data Crystal, The Cutting Room Floor, the NESdev wiki | a browser check (403), and the wikis' APIs gave one too |

A site behind a browser check is read by hand, not got round: ask the
contributor to open the page and paste what it says, or leave it out and
say so under Sources in `features.md`. For NesCartDB, give them the
CRC32 the server's `cartridge` command reports, so they can find the
release's row.

A game with a published disassembly can be used as a check on the run,
or imported (`kit/skills/core/40-sweep`); say which in `game.json`.

## Memory map

The CPU sees a 64 KB address space; most of it belongs to the cartridge
(NESdev, CPU memory map).

| Range | Size | What |
|---|---|---|
| `$0000-$07FF` | 2 KB | internal RAM: zero page `$0000-$00FF`, stack `$0100-$01FF`, the rest the game's |
| `$0800-$1FFF` | 6 KB | three mirrors of `$0000-$07FF` |
| `$2000-$2007` | 8 | the PPU's registers |
| `$2008-$3FFF` | | mirrors of `$2000-$2007`, every 8 bytes: a write to `$3456` is a write to `$2006` |
| `$4000-$4017` | 24 | the APU and the I/O registers (controllers, sprite DMA) |
| `$4018-$401F` | 8 | the CPU's test mode, normally disabled |
| `$4020-$5FFF` | | the cartridge's, rarely used |
| `$6000-$7FFF` | 8 KB | the cartridge's: usually work or battery-backed RAM, when there is any |
| `$8000-$FFFF` | 32 KB | the cartridge's: ROM, and the mapper's registers, written by storing to ROM addresses |

- **There is no system ROM.** No BIOS, no kernal, no MOS: every byte the
  CPU runs is in the cartridge or was copied to RAM by it. An address in
  `$8000-$FFFF` that looks like a system call is the game's own code.
- **The vectors** are the last six bytes, supplied by the cartridge:
  `$FFFA` NMI, `$FFFC` reset, `$FFFE` IRQ and BRK (NESdev, CPU memory map).
  The reset vector is where a disassembly starts, and the NMI vector is
  almost always the frame handler.
- **`$0200-$02FF`** is, in most games, the copy of the sprite table that
  is sent to the PPU each frame through `$4014` (NESdev, CPU memory map,
  PPU OAM). Check the game's write to `$4014` before naming it: the value
  written is the page.
- **Mirrors alias.** `LDA $0800` reads `$0000`. A game rarely does this on
  purpose, but a search for references to a RAM address that ignores the
  mirrors can come back empty when it is not.
- **An unmapped read returns open bus**, usually the high byte of the
  address just read (NESdev, CPU memory map, Standard controller). The
  controller ports' top bits are open bus, which is why a game masks its
  `$4016` reads with `AND #$01`.

## The cartridge image

A `.nes` file is the iNES format (NESdev, iNES):

| Bytes | What |
|---|---|
| 0-3 | `NES` and `$1A` |
| 4 | PRG ROM size, in 16 KB units |
| 5 | CHR ROM size, in 8 KB units; 0 means the board has CHR RAM instead |
| 6 | bit 0: nametable arrangement (0 horizontal mirroring, 1 vertical mirroring); bit 1: battery-backed RAM at `$6000`; bit 2: a 512-byte trainer at `$7000` comes before the PRG data; bit 3: four-screen or another layout; bits 4-7: the mapper's low nybble |
| 7 | bits 4-7: the mapper's high nybble; bits 2-3 equal to 2 mean the header is NES 2.0 |
| 8-15 | rarely used; old rippers wrote their names across 7-15, which corrupts the mapper's high nybble |

After the header come the trainer if any, then the PRG ROM, then the CHR
ROM. The image is a binary: it stays in `work/`, and `check_binaries.py`
refuses its magic bytes and its extension.

- **PRG** is the CPU's: the code and the data it reads. **CHR** is the
  PPU's: the tiles. The CPU cannot read CHR ROM at all, so a tile is
  found in the image, or in the PPU's memory in a snapshot, never in the
  CPU's 64 KB.
- **Where PRG sits depends on the mapper.** The image's offset of a byte
  is not its CPU address; the mapper's page in this file says how one
  becomes the other.

## Mappers

The **mapper** is the cartridge's banking hardware, numbered by iNES
(NESdev, Mapper). The common ones (NESdev, NROM, UxROM, CNROM, MMC1,
MMC3):

| iNES | Board | CPU side | PPU side |
|---|---|---|---|
| 0 | NROM | `$8000-$BFFF` the first 16 KB; `$C000-$FFFF` the last 16 KB (NROM-256) or a mirror of `$8000-$BFFF` (NROM-128); no registers | 8 KB CHR ROM, fixed |
| 1 | MMC1 (SxROM) | 16 KB or 32 KB banks; one of the two halves may be fixed; 8 KB RAM at `$6000` on most boards | 4 KB or 8 KB CHR banks |
| 2 | UxROM | `$8000-$BFFF` switchable 16 KB; `$C000-$FFFF` fixed to the last bank | CHR RAM, usually |
| 3 | CNROM | as NROM | 8 KB CHR banks, switched by a write to `$8000-$FFFF` |
| 4 | MMC3 (TxROM) | four 8 KB windows, two switchable, the last fixed; a scanline counter that raises an IRQ | 2 KB and 1 KB CHR banks |
| 7 | AxROM | one switchable 32 KB bank | CHR RAM; one-screen nametables |

- **NROM-128 maps its 16 KB twice.** `$C000-$FFFF` is the same ROM as
  `$8000-$BFFF`, so every byte has two CPU addresses. The vectors are read
  at `$FFFA-$FFFF`, so code is usually assembled for `$C000` and the copy
  at `$8000` is never run; check which one the program counter is in
  before labelling, and count the 16 KB once.
- **A write to ROM is a register write.** On UxROM, CNROM and many
  discrete boards the value is written to an address in `$8000-$FFFF`
  that holds the same value, to avoid a bus conflict: the ROM drives the
  bus too, and the result is the AND of the two (NESdev, NROM, UxROM).
  A bank switch routine that reads a table and writes back the byte it
  read is this, not a bug.
- **MMC1 is written one bit at a time**: five writes, low bit first, bit 0
  of each; the fifth write's address picks the register (`$8000` control,
  `$A000` CHR 0, `$C000` CHR 1, `$E000` PRG). A write with bit 7 set
  resets the shift (NESdev, MMC1). A routine of five `STA`/`LSR` pairs is
  this.
- **The vectors and the bank switch code must be reachable in every
  bank** a mapper can put at the top, unless it fixes the last bank
  there (NESdev, CPU memory map). On UxROM and MMC3 the last bank is
  fixed, so the reset code, the NMI and the bank switching live there.

## The PPU

The PPU draws a 256 by 240 picture from its own 16 KB address space,
`$0000-$3FFF`, which the CPU reaches only through `$2006` and `$2007`
(NESdev, PPU memory map).

### Its memory

| PPU range | What |
|---|---|
| `$0000-$0FFF` | pattern table 0: 256 tiles, from the cartridge's CHR |
| `$1000-$1FFF` | pattern table 1: 256 tiles |
| `$2000-$23FF` | nametable 0: `$2000-$23BF` the tile numbers, 32 by 30; `$23C0-$23FF` its attribute table |
| `$2400`, `$2800`, `$2C00` | nametables 1 to 3, laid out the same; the console has RAM for two, and the cartridge's mirroring decides which two of the four are copies |
| `$3000-$3EFF` | mirror of `$2000-$2EFF` |
| `$3F00-$3F1F` | palette RAM: `$3F00-$3F0F` the background's four palettes, `$3F10-$3F1F` the sprites' |
| `$3F20-$3FFF` | mirrors of the palettes |

The **OAM**, 256 bytes inside the PPU, holds 64 sprites of four bytes
each (NESdev, PPU memory map, PPU OAM).

### Tiles

A tile is 8 by 8 pixels in 16 bytes: eight bytes of bit 0 of each pixel,
then eight bytes of bit 1, one byte a row, the leftmost pixel in bit 7.
Two bits make a colour index 0 to 3, and 0 is transparent (NESdev, PPU
pattern tables). Tile `n` of a table starts at `n * 16`.

### Nametables and attributes

A nametable is 960 tile numbers, 32 a row for 30 rows, then a 64-byte
attribute table (NESdev, PPU nametables, PPU attribute tables). Each
attribute byte covers 32 by 32 pixels, 4 by 4 tiles, and gives each of
its four 16 by 16 quarters a palette number in two bits: bits 0-1 top
left, 2-3 top right, 4-5 bottom left, 6-7 bottom right. The byte for
tile column `x`, row `y` is at `$23C0 + (y / 4) * 8 + x / 4` in
nametable 0. That is why most games build their screens from 16 by 16
"metatiles": a block smaller than an attribute quarter cannot have its
own colours.

### Palettes

Palette RAM holds 32 six-bit entries, each a number of one of the 64
colours the PPU can make (NESdev, PPU palettes). A pixel's entry is
`%SAAPP`: S sprite or background, AA the palette, PP the tile's colour
index. Entry `$3F00` is the backdrop, shown wherever every layer is
transparent; `$3F10`, `$3F14`, `$3F18` and `$3F1C` are mirrors of
`$3F00`, `$3F04`, `$3F08` and `$3F0C`, so a write to either changes
both. The RGB value of each of the 64 colours is not in the console: it
depends on the television, and the page names the palette it draws with.

### Sprites

Each OAM entry (NESdev, PPU OAM):

| Byte | What |
|---|---|
| 0 | Y of the top, minus one; `$EF-$FF` hides it |
| 1 | the tile; for 8 by 16 sprites, bit 0 picks the pattern table and the top tile is the rest, the bottom the next |
| 2 | bits 0-1 the palette (4 to 7); bits 2-4 do not exist in the PPU and read back as 0 through `$2004`; bit 5 behind the background; bit 6 flipped horizontally; bit 7 flipped vertically |
| 3 | X of the left |

- At most **eight sprites on a scanline** are drawn; the ninth and later
  are dropped for that line (NESdev, PPU OAM). Games that rotate the
  order of their sprites each frame are trading a missing sprite for a
  flickering one.
- **Sprite 0 hit**: bit 6 of `$2002` is set when an opaque pixel of
  sprite 0 meets an opaque background pixel. Many games park sprite 0
  under the status bar and wait for the hit, to change the scroll part
  way down the screen (NESdev, PPU registers, PPU OAM). A tight loop on
  `BIT $2002` with `BVC` or `BVS` is this.
- **`$4014` copies a page to OAM**: writing `n` sends `$n00-$nFF`, and
  stops the CPU for 513 or 514 cycles (NESdev, PPU OAM).

### The registers

`$2000-$2007`, mirrored to `$3FFF` (NESdev, PPU registers):

| Address | Name | R/W | Bits |
|---|---|---|---|
| `$2000` | PPUCTRL | W | 7 NMI at vertical blank; 5 sprites 8 by 16; 4 background pattern table (`$1000` if set); 3 sprite pattern table (8 by 8 only); 2 `$2007` adds 32, not 1; 1-0 the nametable at the top left, which is bit 8 of the Y and X scroll |
| `$2001` | PPUMASK | W | 7-5 colour emphasis; 4 sprites on; 3 background on; 2 sprites in the left 8 pixels; 1 background in the left 8 pixels; 0 greyscale |
| `$2002` | PPUSTATUS | R | 7 vertical blank, cleared by the read; 6 sprite 0 hit; 5 sprite overflow (unreliable). Reading it also resets the write toggle `$2005` and `$2006` share |
| `$2003` | OAMADDR | W | the OAM address for `$2004` |
| `$2004` | OAMDATA | RW | OAM data |
| `$2005` | PPUSCROLL | W twice | first write X, second write Y |
| `$2006` | PPUADDR | W twice | first write the high byte, second the low |
| `$2007` | PPUDATA | RW | PPU memory at the address, which then moves on by 1 or 32 |
| `$4014` | OAMDMA | W | the page to copy to OAM |

- **A read of `$2007` is a byte late**, below the palettes: it returns
  what the previous read fetched, and the first read after setting the
  address is a dummy. Code that reads the PPU's memory throws one away
  (NESdev, PPU registers, PPUDATA).
- **The PPU ignores `$2000`, `$2001`, `$2005` and `$2006` for about 29,658
  cycles after reset**, which is why reset code waits for two vertical
  blanks by polling `$2002` before it sets the PPU up (NESdev, PPU
  registers).
- Writing `$2006` overwrites the scroll: the two share a register inside
  the PPU, so a game sets `$2000` and `$2005` again after its writes to
  the PPU's memory (NESdev, PPU scrolling, "Set the scroll last").

### Scrolling

The common case, each frame in the NMI (NESdev, PPU scrolling): write X
to `$2005`, then Y, then the nametable bits to `$2000`. The picture is a
window onto the four nametables, two of them real; to scroll further than
two screens, the game writes the column or row about to come into view
before it does (the "seam"). A split, a still status bar over a scrolling
field, needs the scroll changed while the screen is being drawn: through
a sprite 0 hit, a timed loop, or a mapper's scanline IRQ (MMC3).

## The frame: vertical blank and the NMI

- An NTSC frame is 262 scanlines of 341 PPU dots; the CPU runs one cycle
  for three dots, so a frame is 29,780.5 CPU cycles, about 113.67 a
  scanline. The picture is lines 0 to 239; vertical blank starts on
  line 241 and lasts 20 lines, about 2,273 CPU cycles (NESdev, Cycle
  reference chart). The CPU's clock is 1.789773 MHz, and the frame rate
  about 60.1 Hz.
- With `$2000` bit 7 set, the PPU raises an **NMI at the start of
  vertical blank**, line 241 dot 1 (NESdev, PPU registers). Nearly every
  game does its PPU writes there, since outside vertical blank (with
  rendering on) the PPU's memory cannot be written safely, and paces its
  game loop on it: either all the logic runs in the NMI, or the main loop
  waits for a flag the NMI sets.
- Turning `$2000` bit 7 on while the vertical blank flag is set raises an
  NMI at once (NESdev, PPU registers). A game that reads `$2002` before
  enabling the NMI is avoiding this.
- **IRQ** comes from the mapper (MMC3's scanline counter) or the APU (its
  frame counter, or the end of a DMC sample); many games never enable it,
  and `$FFFE` then points at an `RTI` or at the reset code (NESdev, CPU
  interrupts, APU).

## The controllers

Both read through one strobe (NESdev, Standard controller):

1. Write 1 then 0 to `$4016`: the controllers latch their buttons.
2. Read `$4016` eight times for controller 1, `$4017` for controller 2:
   bit 0 of each read is a button, in the order **A, B, Select, Start,
   Up, Down, Left, Right**; 1 is pressed. After eight reads a standard
   controller returns 1.

So the routine is a loop of eight `LDA $4016`, `LSR A`, `ROL <byte>`, and
the byte it builds has A in bit 7 and Right in bit 0 when rotated in that
direction. The Famicom also reports a second set of buttons, from its
expansion port, in bit 1, which Famicom games often OR in, and its
controller 2 has a microphone in bit 2 of `$4016` and no Select or
Start (NESdev, Standard controller).

**DPCM conflicts.** A DMC sample's fetch can steal a read of `$4016` and
make it look as if Right is pressed; a game that plays samples reads
the controller twice and compares, or uses the trick the wiki gives
(NESdev, Standard controller, Controller reading code). A loop that reads
the pad until two readings agree is this.

## Sound: the APU

Inside the 2A03, at `$4000-$4017` (NESdev, APU):

| Registers | Channel |
|---|---|
| `$4000-$4003` | pulse 1: duty and volume or envelope; sweep; timer low; length and timer high |
| `$4004-$4007` | pulse 2, the same |
| `$4008-$400B` | triangle: linear counter; unused; timer low; length and timer high |
| `$400C-$400F` | noise: volume or envelope; unused; mode and period; length |
| `$4010-$4013` | DMC: rate, loop and IRQ; direct level; sample address `$C000 + 64 * A`; length `16 * L + 1` |
| `$4015` | enables the channels (write); their length counters and the IRQ flags (read) |
| `$4017` | written, the APU's frame counter: four or five steps (bit 7), and its IRQ (bit 6 inhibits it); read, controller 2. The same address is two things |

- A pulse channel's pitch is `1789773 / (16 * (t + 1))` Hz for the 11-bit
  timer `t`; the triangle's is half that (NESdev, APU). A table of 11-bit
  values in the ROM, falling as it goes, is a note table, and the
  formula names its notes.
- Writing `$4003` or `$4007` restarts the pulse's phase, so music with
  vibrato writes only the low byte (NESdev, APU).
- Most games run their music from the NMI, once a frame.

## Timing

| Quantity | NTSC |
|---|---|
| CPU clock | 1.789773 MHz |
| CPU cycles a frame | 29,780.5 |
| CPU cycles a scanline | 113.67 |
| Scanlines | 262: 240 drawn, 1 after, 20 of vertical blank, 1 before |
| Vertical blank | about 2,273 CPU cycles |
| Sprite DMA | 513 or 514 cycles |

(NESdev, Cycle reference chart, PPU OAM.) **PAL** consoles run the CPU at
1.662607 MHz, draw 312 lines with 70 of vertical blank and run at
50 Hz, so a PAL release of a game can differ in its timing tables and
its speed (NESdev, Cycle reference chart).

## The CPU

The 2A03's processor is a 6502 with the **decimal mode removed**: `SED`
sets the flag, but `ADC` and `SBC` stay binary (NESdev, CPU). A game that keeps
its score in binary-coded decimal does the decimal adjustment in code.
Everything else in `kit/skills/cpu/6502` applies, the undocumented
opcodes included.

## The mistakes that bite

- **Looking for a system call.** There is no ROM in the console; a JSR to
  `$F000` is to the game's own code.
- **Reading CHR as code or as CPU data.** It is not in the CPU's address
  space. Tiles are in the PPU's memory, and a pointer the CPU follows
  never leads to them; it leads to `$2006`/`$2007` writes that copy data
  from PRG into CHR RAM, on a board that has CHR RAM.
- **Labelling an NROM-128 game twice.** Its 16 KB is at `$8000` and at
  `$C000`. Pick the half the vectors and the program counter use.
- **A store to ROM is not a bug.** On a board with registers it is a bank
  switch; on NROM it does nothing.
- **Trusting `$2002`'s vertical blank bit for timing.** Reading it on the
  wrong dot can miss a frame (NESdev, PPU registers); the game's own NMI
  flag is the frame count to trust.
- **Expecting the frame to start at the NMI.** The NMI is at line 241;
  the picture has already been drawn, from what the game set up during
  the previous vertical blank.
- **The value written to `$4014` is a page**, not a sprite.
- **An emulator's palette is one choice of 64 colours.** Name it on the
  page; do not claim an exact colour for a real television.

## Sources

The NESdev wiki, `https://www.nesdev.org/wiki/`, its pages CPU memory
map, iNES, Mapper, NROM, UxROM, CNROM, MMC1, MMC3, PPU memory map, PPU
registers, PPU pattern tables, PPU nametables, PPU attribute tables, PPU
palettes, PPU OAM, PPU scrolling, Cycle reference chart, CPU interrupts,
APU, CPU, Standard controller and Controller reading code, each read as its
raw wiki text on 17 October 2026; PPU OAM read again on 26 October 2026 for byte 2's
unwired bits.
