---
name: c16-reference
description: Commodore 16 and Plus/4 facts for reverse engineering, where to read about a game, the CPU and its port, the memory map and the ROM switch, input and output, TED (the screen, its registers, timers and raster), timing, interrupts, the keyboard and joysticks, sound, the KERNAL and BASIC 3.5, tapes, disks and cartridges, where plus4emu differs from a real machine, the mistakes that bite, and where the sources disagree. Consult this instead of recalling from training.
---

# Commodore 16 and Plus/4 reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

The profile is the machine the kit runs: a **PAL Commodore 16 with 16 KB
of RAM**, its KERNAL ROM 318004-05 and BASIC 3.5 (318006-01), with no
tape or disk until one is attached. `--model plus4pal` gives a **PAL
Plus/4** in its place: 64 KB, and the 3-plus-1 software in its function
ROMs. Both machines are built round one chip, TED (the 7360 or 8360),
which is the video, the sound, three timers, the keyboard's input lines
and the clock, beside a 7501 or 8501 CPU. The emulator is plus4emu (GPL
v2) at git 939e652, built as a library and driven by the kit's server,
`kit/c16/p4emu_server.py`, through `kit/c16/plus4emu.py`
(`kit/skills/c16/tool-plus4emu`). The NTSC machines appear only in notes
marked as theirs.

Addresses are written with `$`, as Commodore's manuals write them.

Each fact says how it was checked:

- **"live"**: run on the kit's server on 19 October 2026, on the C16
  unless the entry says Plus/4.
- **"KERNAL source, init.src, ramtas"**: a file and a label of
  Commodore's own source for the TED KERNAL, revision 05
  (`KERNAL_TED_05` in github.com/mist64/cbmsrc), or for BASIC 3.5
  ("BASIC source", `BASIC_TED`). The source's `kernal.src` sets
  `palmod =false`, the NTSC KERNAL; the PAL ROM the kit runs ($FF80
  holds $85, release 5 with bit 7 set for PAL, live) takes the other
  branch wherever the source tests `palmod`.
- **"ROM $FCB3"**: the 318004-05 KERNAL as the kit's server loads it,
  read live.
- **"plus4emu, ted_main.cpp"**: a file, and a function where it helps, of
  plus4emu's source at git 939e652, the kit's build.
- **"VICE, plus4mem.c"**: VICE 3.10.0's source, the second emulator
  consulted.
- **"TLC"**: "Talking to TED: the MOS 7360/8360 text display ICs", by
  Levente Hársfalvi, C= Hacking issue 12 (March 1996), written from a
  demo coder's experience.
- **"the guide"**: the Programmer's Reference Guide for the Commodore
  Plus/4 (Cyndie Merten and Sarah Meyer, Scott, Foresman 1986), by
  chapter or appendix.
- **"the encyclopedia, 500247"**: a page of the Plus/4 Encyclopedia on
  Plus/4 World, `https://plus4world.powweb.com/plus4encyclopedia/<number>`.

A fact checked only live, or only in an emulator's source, was not
checked on a real machine. Where the documents and the emulators
disagree, the entry says what each says, and "Where the sources
disagree" lists every case.

## Where to read about a game first

Before any code, and before the emulator, when the contributor has said
yes to looking the game up online (`kit/START.md`): the game's page on
Plus/4 World, `https://plus4world.powweb.com/software/<Title_With_Underscores>`.
When the guess misses, search for one distinctive word of the title,
`https://plus4world.powweb.com/search.php?s=<word>&target=programs`, and
follow the result's link: the search matches its text as one piece, so
two words that are not next to each other in the title find nothing.
Both answered a script's fetch on 19 October 2026. Nearly every game for
these machines has a page, built the same way, so read one as a form:

- **Title, Category, Release Date, Language, Released by** and the
  credits (Code by, Graphics by and the like): fill `game.json`.
- **Size**: 16K, 32K or 64K, the memory the game needs. A 16K game runs
  on the kit's C16; a 32K or 64K game needs `--model plus4pal`.
- **Machine**: PAL Only, NTSC Only, or both.
- **Notes**: often the tape loader by name (a Novaload serial, for
  instance), and who cracked or trained which version.
- **Download**: a link for each version (the original, cracks, trainers,
  compilations). Never downloaded.
- **External links**: the same game on the C64 and other machines.
  Writing about the C64 version (`kit/skills/c64/c64-reference`, "Where
  to read about a game first") often describes this one too, but it is
  another program: check every borrowed fact in this game's code.
- **Publications**: magazine reviews, cheats, maps and solutions, each
  with the magazine, the issue and the page.

The site's Cheats list, `https://plus4world.powweb.com/cheats`, is one
page with every game's cheats, by title. Most are monitor commands: a
patch (`>176A A5 - Unlimited lives`, an address and the bytes to put
there), a start address (`G 1020 - Restart game`), or a POKE, sometimes
twice, marked "(packed)" and "(unpacked)" because the address differs
before and after the game decompresses itself. Each is an address with
its meaning already attached: take it to the disassembler as a symbol
candidate, in the version of the code it names.

The Plus/4 Encyclopedia describes the machine and its tape formats: 500247
the TAP format and the KERNAL's own tape format, 500272 to 500281 the
turbo loaders one by one, 500232 the KERNAL's jump table, 500248 the CPU's
speed and 500290 the CPU's port. A game's loader is usually one of those.

These are fan catalogues: what they say is documented, not true. Record
each one you use under Sources in `features.md` with its address and the
date you read it, the game's page as `links.wiki` in `game.json`, and a
manual as `links.manual`; a manual, when one exists, outranks any
catalogue. Read the documents only. The site and its mirrors also offer
tape and disk images of nearly every game, and none is ever downloaded.

## The machines

| | C16 (the profile) | Plus/4 (`--model plus4pal`) |
|---|---|---|
| RAM | 16 KB, seen four times over the 64 KB | 64 KB |
| ROMs | BASIC 3.5 at $8000, the KERNAL at $C000 | the same, and the 3-plus-1 software (bank 5) |
| After power-on | `12277 BYTES FREE` (live) | `60671 BYTES FREE` and `3-PLUS-1 ON KEY F1` (live) |
| BASIC's top of memory | $3FF6 (live, $37-$38) | $FD00 (live) |
| RS-232 | none | a 6551 ACIA at $FD00 |

Both run the same KERNAL and BASIC. What differs for a program is the
RAM it reaches, the C16's mirror of it ("Memory map"), and anything it
takes from the function ROMs.

## The CPU

The 7501 (the 8501 in later machines) is an NMOS 6502 with a port of its
own at $00 (direction) and $01 (data), as the C64's 6510 has (the guide;
TLC). It runs the 6502's documented instructions and the undocumented
ones as the 6510 does (plus4emu, cpu.cpp; the kit's disassembly takes
them from `kit/cpu/m6502.py`), and the twelve JAM opcodes ($02, $12,
$22, $32, $42, $52, $62, $72, $92, $B2, $D2, $F2) stop it. It has no NMI:
plus4emu's CPU has no such input, and the guide calls $FFFA "Vector
(used for reset, not NMIs)".

The port, from the encyclopedia, 500290, with the KERNAL's use:

| Bit of $01 | Meaning |
|---|---|
| 7 | serial bus DATA in |
| 6 | serial bus CLOCK in |
| 5 | not connected; reads 0 (plus4emu reads $00 masked with $DF) |
| 4 | cassette read |
| 3 | cassette motor, 0 = on |
| 2 | serial bus ATN out |
| 1 | serial bus CLOCK out and cassette write |
| 0 | serial bus DATA out |

The serial outputs drive the lines through inverters, so writing 1 pulls
a line low (the encyclopedia, 500290). The KERNAL sets $00 to $0F and $01
to $08 (KERNAL source, init.src, ioinit) and never changes $00.

Reset: TED has no reset pin, so a reset can find the RAM paged in at the
top of memory. The KERNAL copies 8 bytes, $FFF6-$FFFD, into the RAM
beneath them: `STA $FF3E` (the ROMs back in) and `JMP $F2A4` (start),
with the reset vector, $FFF6, after them (KERNAL source, vectors.src,
gostrt; init.src, ramtas). The CPU's reset reads $FFFC from whatever is
paged in, and either way lands on that code. $FFFA-$FFFB, where a 6502
keeps its NMI vector, is the operand of that `JMP`.

The start-up order (KERNAL source, init.src, start): `SEI`, the stack at
$FF, a look for cartridges (spkpat, then poll, which runs any that asks
to start, below), IOINIT, RAMTAS (skipped on a reset with RUN/STOP held
when RAM already holds the KERNAL's mark, $A5 at $0508), RESTOR, CINT,
then BASIC at $8000, or the monitor with RUN/STOP held.

## Memory map

| Range | What | Notes |
|---|---|---|
| $0000-$0001 | the CPU's port | in plus4emu a write sets the port and leaves the RAM beneath as it was at power-on (live: the `ram` space reads $00 $FF there); on a real machine, unknown |
| $0002-$00FF | zero page | BASIC $02-$8F, the KERNAL $90-$FF; $D0-$E8 is "area for use by banking software" (KERNAL source, declare.src) |
| $0100-$01FF | the stack | |
| $0200-$07FF | the KERNAL's and BASIC's work areas | the table below |
| $0800-$0BFF | the screen's attributes (colour, luminance, flash) | where the KERNAL puts them, $FF14 = $08 (init.src) |
| $0C00-$0FFF | the screen's characters | |
| $1000-$3FFF | BASIC's program and variables, from $1001 | the KERNAL's bottom of memory is $1000 (init.src, ramtas) |
| $3FF6-$3FFF | on a C16, the copy of the reset code (above) | BASIC's top of memory is $3FF6 |
| $4000-$7FFF | on a C16, the same RAM as $0000-$3FFF; on a Plus/4, RAM | |
| $8000-$BFFF | BASIC (or another ROM, below), the RAM beneath | |
| $C000-$FBFF | the KERNAL, with TED's character set at $D000-$D7FF, the RAM beneath | |
| $FC00-$FCFF | the KERNAL's banking code, whatever ROM bank is selected | |
| $FD00-$FF3F | input and output, always: no RAM is ever seen here | "Input and output" |
| $FF40-$FFFF | the KERNAL's jump table and vectors, the RAM beneath | |

**RAM on a C16.** 16 KB is decoded four times: $4000, $8000 and $C000 are
the same RAM as $0000, so a write to $5234 changes $1234 (live; VICE,
plus4mem.c, masks a 16 KB machine's addresses with $3FFF). RAMTAS finds
the size this way, by writing the reset code at $FFF6 and looking for it
at $3FF6 and $7FF6: 16 KB puts BASIC's top at $3FF6, 32 KB at $7FF6, 64
KB at $FD00 (KERNAL source, init.src, ramtas).

**The ROMs or the RAM.** A write of any value to $FF3E pages the ROMs in
at $8000-$FCFF and $FF40-$FFFF; a write to $FF3F pages the RAM in there
(the guide, "Banking on the Plus/4"). A read with the ROMs in reads the
ROM; a write always stores into the RAM beneath (the guide). Bit 0 of
$FF13 reads 1 while the ROMs are in (live: $D1, and $D0 after a write to
$FF3F). Reading $FF3E or $FF3F tells nothing: plus4emu returns the ROM's
byte with the ROMs in and $FF without (live). The KERNAL reads RAM under
the ROMs with a routine RAMTAS copies to $07D9 (kludes: `PHP`, `SEI`,
`STA $FF3F`, `LDA (zp),Y`, `STA $FF3E`, `PLP`, `RTS`; KERNAL source,
patches.src, sobsob; init.src, ramtas). A caller first writes the
zero-page address of its pointer into the `LDA`'s operand, $07DF
(sinner).

**Which ROMs.** $FDD0-$FDDF chooses them by the address written, the
value being ignored (KERNAL source, banking.src, which writes `sta
bnksel,x`): bits 0-1 of the address choose the ROM at $8000-$BFFF (0
BASIC, 1 the function ROM's low half, 2 cartridge 1's, 3 cartridge 2's)
and bits 2-3 the ROM at $C000-$FFFF (0 the KERNAL, 1 the function ROM's
high half, 2 and 3 the cartridges'), so $FDD0 is BASIC and the KERNAL and
$FDD5 the 3-plus-1 software (VICE, plus4mem.c; plus4emu, memory.cpp,
write_register_FDDx). $FC00-$FCFF reads the KERNAL whichever bank is
chosen (live: unchanged after a write to $FDD5). On the C16 a bank with
no ROM fitted reads $FF at $8000-$FBFF and $FF40-$FFFF, its vectors
included (live, after a write to $FDD5).

At every reset the KERNAL looks in banks 0, 5, 10 and 15 for "CBM" at
$8007-$8009; a ROM that has it is logged with the device number at $8006,
and number 1 is started at once with `JSR $8000` (KERNAL source,
banking.src, poll). BASIC has $00 at $8006 and the 3-plus-1 ROM $0C
(live), so neither starts itself.

**Power-on RAM.** plus4emu fills RAM with $00 and $FF in turn, $00 at
even addresses (live: $2000 reads `00 ff 00 ff`). RAMTAS zeroes
$0002-$0101, $0200-$04FF and $0700-$07FF (KERNAL source, init.src,
ramtas); everything else keeps the power-on pattern until something
writes it. A real machine's power-on RAM is not something to rely on.

### Where the KERNAL and BASIC keep things

Names are the KERNAL source's (declare.src); values live after power-on.

| Address | Name | What |
|---|---|---|
| $2B-$2C | txttab | start of BASIC's program: $1001 |
| $37-$38 | memsiz | BASIC's top of memory: $3FF6 on a C16 |
| $90 | status | the KERNAL's I/O status |
| $91 | stkey | the STOP key's flag |
| $A3-$A5 | time | the jiffy clock, high byte first |
| $C8-$C9, $EA-$EB | pnt, user | the cursor's line in the characters ($0Cxx) and in the attributes ($08xx) |
| $CA, $CD | pntr, tblx | the cursor's column and row |
| $EF | ndx | how many keys wait in the keyboard buffer |
| $FB | curbnk | the ROM bank to return to after an interrupt |
| $0200-$0258 | buf | BASIC's input line |
| $0300-$0311 | ierror ... iescex | BASIC's vectors |
| $0312-$0331 | itime ... isave | the KERNAL's vectors (Interrupts, below) |
| $0333-$03F2 | tapbuf | the tape buffer, 192 bytes |
| $0473 | chrget | BASIC's character fetch, copied to RAM |
| $0508 | dejavu | $A5 once RAMTAS has run, so a reset with RUN/STOP held skips it ("The CPU") |
| $0527-$0530 | keyd | the keyboard buffer, 10 keys |
| $055F-$05E6 | keybuf, pkybuf | the function keys' lengths and texts |
| $07D9-$07E4 | kludes | the routine that reads RAM under the ROMs; $07DF (sinner) is its pointer's zero-page address |
| $07FD | palcnt | the PAL jiffy clock's fifth tick (Interrupts) |

## Input and output

Nothing but these answers between $FD00 and $FF3F, whichever of the ROMs
or the RAM is paged in (the guide; plus4emu, ted_init.cpp). An address
with no device reads the data bus: whatever the last transfer left there.
The kit's server reads those addresses as $FF.

| Range | Device | Notes |
|---|---|---|
| $FD00-$FD0F | 6551 ACIA, the Plus/4's RS-232: data, status, command, control, repeated every 4 bytes | The KERNAL looks for it only when a program opens an RS-232 channel (open.src, apres) |
| $FD10-$FD1F | a 6529 latch: on a Plus/4 the user port | On both machines bit 2 is the cassette's PLAY switch, 0 = pressed (KERNAL source, patches.src, judt2; plus4emu, ted_read.cpp); one register through the 16 |
| $FD20-$FD2F | none on a stock machine | The KERNAL writes $09 and $89 to $FD20 at reset, to silence a speech module (patches.src, spkpat) |
| $FD30-$FD3F | 6529, the keyboard latch: the rows to read at $FF08 | One register through the 16 |
| $FDD0-$FDDF | the ROM bank, by address ("Memory map") | Write only |
| $FEC0-$FEC7, $FEF0-$FEF7 | the 1551 disk drive's parallel interface, unit 9 and unit 8 | KERNAL source, openchanl.src (tstkdy); declare.src names $FEF0-$FEF5 |
| $FF00-$FF1F | TED | "TED's registers" |
| $FF3E, $FF3F | the ROMs in, the RAM in | Write only, any value |

## TED

TED makes the picture from the RAM (or the ROMs, below), in a display
window of 40 by 25 cells of 8 by 8 pixels inside a border, and it has no
sprites (TLC). `site/lib/c16.js` draws the window from TED's registers and
memory by the rules in this section, and `kit/c16/frame.py` compares its
picture with plus4emu's, pixel by pixel, in every mode.

### What TED draws

**Colours.** A colour is a byte: bits 0-3 the colour, bits 4-6 the
luminance (0 darkest, 7 brightest). Colour 0 is black at every luminance,
so TED shows 121 colours (TLC). BASIC's COLOR numbers the colours from 1,
TED from 0 (the guide, COLOR): 0 black, 1 white, 2 red, 3 cyan, 4
purple, 5 green, 6 blue, 7 yellow, 8 orange, 9 brown, 10 yellow-green, 11
pink, 12 blue-green, 13 light blue, 14 dark blue, 15 light green.
plus4emu's RGB values are `site/lib/c16.js`'s palette (from plus4emu,
display.cpp, Plus4_ColorToRGB); how close they are to a real TED's is
unknown.

**Where things are.** The screen is 2 KB at $FF14 bits 3-7 (2 KB steps):
1 KB of attributes, then 1 KB of characters; the KERNAL's is $0800 and
$0C00. The character set is at $FF13 bits 2-7 (1 KB steps; 2 KB steps,
bits 3-7, with 256 characters or extended colour). A bitmap is 8 KB at
$FF12 bits 3-5 (8 KB steps). Bit 2 of $FF12 takes the character set and
the bitmap from the ROMs instead of the RAM. The KERNAL's own characters
are in ROM at $D000 (IOINIT sets $FF12 to $04 and $FF13 to $D0;
init.src).

**The character ROM** holds two sets of 128 characters in the C64's
screen-code order: $D000-$D3FF capitals and graphics, $D400-$D7FF small
letters and capitals. TED draws the reversed characters itself. The
first set is the C64's glyph for glyph; 16 of the second set's glyphs
are drawn differently from the C64's (live, compared with VICE's C64
character ROM 901225-01).

**Text** (bits 5 and 6 of $FF06 and bit 4 of $FF07 clear): each cell is
one bit a pixel, a 1 in the attribute's colour (bits 0-6) and a 0 in the
background, $FF15. With $FF07 bit 7 clear there are 128 characters, and a
character code with bit 7 set is drawn reversed; with it set there are
256 and none is reversed. An attribute with bit 7 set flashes: the
character shows for 16 frames and is hidden for 16. The hardware cursor,
$FF0C-$FF0D, shows its cell reversed in one half of the same 32 frames,
and the cursor's cell does not flash. Flash, reverse and the cursor
belong to this mode alone (plus4emu, ted_main.cpp and render.cpp;
`kit/c16/frame.py` measured all three).

**Multicolour text** ($FF07 bit 4): a cell whose attribute has bit 3 set
is 4 pixels of 2 bits a line, each pair 00 $FF15, 01 $FF16, 10 $FF17,
and 11 the attribute without bits 3 and 7. A cell with bit 3 clear is
drawn as text in its colour.

**Extended colour** ($FF06 bit 6): 64 characters; bits 6-7 of the code
choose the background of the cell from $FF15-$FF18.

**Bitmap** ($FF06 bit 5): 320 by 200 pixels, the 8 KB laid out in cells
as the C64 lays out its bitmap (8 bytes to a cell, a cell's bytes in
turn). Each cell's colours come from the screen: a 0 is the character
byte's bits 0-3 as the colour with the attribute's bits 4-6 as the
luminance, and a 1 the character's bits 4-7 with the attribute's bits
0-2. **Multicolour bitmap** (with $FF07 bit 4): 2 bits a pixel, 00
$FF15, 01 the cell's colour for a 1, 10 the cell's colour for a 0, 11
$FF16.

**No such mode.** Extended colour together with bitmap or multicolour
draws black (plus4emu; `kit/c16/frame.py`).

**The window.** $FF06 bit 3 clear makes 24 rows: the border covers 4 more
lines at the top and at the bottom. $FF07 bit 3 clear makes 38 columns:
the border covers 8 more pixels at each side. The scroll, $FF06 bits 0-2
and $FF07 bits 0-2, moves the cells down and right; a vertical scroll of
3 puts the first row at the window's top. A vertical scroll below 3 in 25
rows brings in part of a 26th row, drawn from the 40 places after the
screen's 1,000th. What fills the pixels a scroll leaves at the left of
each line, or above the first row in 25 rows, is whatever TED last held,
which memory does not say; a scrolling game hides it in the 38-column,
24-row window (plus4emu; `kit/c16/frame.py` measured all of it).

**The display off** ($FF06 bit 4 clear): the border colour fills the
picture, and TED fetches nothing, so the CPU runs faster ("Timing").
TED starts a frame's display at its line 0, and opens the window at line
4 (or 8), only when the bit is set then (plus4emu, ted_main.cpp).

**What TED reads.** The screen (attributes and characters) is read from
whatever the CPU sees: with the ROMs paged in and the screen at $8000 or
above, TED shows the ROM. The character set and the bitmap follow
$FF12 bit 2 instead: with that bit set, data at $8000 and above comes
from the ROMs, and below $8000 TED reads nothing at all, so the picture
shows whatever the data bus last held (plus4emu, ted_main.cpp; measured
in `kit/c16/frame.py`'s development). Which ROM it reads is the bank
$FDD0-$FDDF selects (plus4emu, memory.cpp).

### TED's registers

The kit's names (`kit/c16/registers.py`) and the KERNAL source's
(declare.src), where it has one. "Reads" gives what plus4emu returns when
it differs from what was written (plus4emu, ted_read.cpp): compare a value
read back with these masks before deciding a register holds something.

| Address | Kit / KERNAL name | Bits | Reads |
|---|---|---|---|
| $FF00-$FF01 | ted_timer1_lo/hi, timr1l/h | timer 1, 16 bits, low byte first | the count |
| $FF02-$FF03 | ted_timer2_lo/hi, timr2l/h | timer 2 | the count |
| $FF04-$FF05 | ted_timer3_lo/hi, timr3l/h | timer 3 | the count |
| $FF06 | ted_control1, tedvcr | 7 test (keep 0), 6 extended colour, 5 bitmap, 4 display on, 3 25 rows, 2-0 vertical scroll | |
| $FF07 | ted_control2 | 7 256 characters and no reverse, 6 NTSC, 5 freeze, 4 multicolour, 3 40 columns, 2-0 horizontal scroll | |
| $FF08 | ted_keyboard, keybrd | a write latches the keyboard and joystick lines; a read gives them, 0 = pressed ("Keyboard and joysticks") | the latch |
| $FF09 | ted_irq_flags, tedirq | flags: 6 timer 3, 4 timer 2, 3 timer 1, 2 light pen, 1 raster; a write of 1 clears that flag | 7 set when a flag that is enabled is set; 0, 2 and 5 read 1 |
| $FF0A | ted_irq_mask, tedicr | enables, the same bits; bit 0 is bit 8 of the raster compare | bits 5 and 7 read 1 |
| $FF0B | ted_raster_compare | the raster line to interrupt at, bits 0-7 | |
| $FF0C-$FF0D | ted_cursor_hi/lo, tedcrh/tedcrl | the cursor's place, 10 bits | $FF0C bits 2-7 read 1 |
| $FF0E | ted_voice1_freq_lo, tedmlo | voice 1's frequency, bits 0-7 | |
| $FF0F | ted_voice2_freq_lo | voice 2's frequency, bits 0-7 | |
| $FF10 | ted_voice2_freq_hi, tedmhi | voice 2's frequency, bits 8-9, in bits 0-1 | bits 2-6 read 1, bit 7 reads 0 |
| $FF11 | ted_sound, tedvoi | 7 D/A, 6 voice 2 noise, 5 voice 2 square, 4 voice 1, 3-0 volume | |
| $FF12 | ted_bitmap_voice1_hi | 5-3 the bitmap, 2 character set and bitmap from ROM, 1-0 voice 1's frequency bits 8-9 | bits 6-7 read 1 |
| $FF13 | ted_charset, tedcbr | 7-2 the character set, 1 single clock, 0 (read only) the ROMs paged in | |
| $FF14 | ted_screen | 7-3 the screen | bits 0-2 read 1 |
| $FF15 | ted_background | background, colour 0 of the multicolour modes | bit 7 reads 1 |
| $FF16-$FF18 | ted_colour1-3 | the other background colours | bit 7 reads 1 |
| $FF19 | ted_border | the border | bit 7 reads 1 |
| $FF1A-$FF1B | ted_char_pos_hi/lo | where the next row of characters starts, 10 bits | $FF1A bits 2-7 read 1 |
| $FF1C-$FF1D | ted_raster_hi/lo | the raster line, 9 bits, writable | $FF1C bits 1-7 read 1 |
| $FF1E | ted_hpos | the position on the line; written inverted (TED takes `(~value & $FC) >> 1`) | the position times 2 |
| $FF1F | ted_char_line | 6-3 the flash counter, 2-0 the line within the character row | bit 7 reads 1 |
| $FF3E | rom_on, romon | any write pages the ROMs in | the ROM's byte, or $FF |
| $FF3F | ram_on, romoff | any write pages the RAM in | the ROM's byte, or $FF |

What the KERNAL leaves (IOINIT, init.src, with the source's own comments):
$FF06 $1B ("blnk=1, 25 rows, y=3"), $FF07 $08 on PAL, $48 on NTSC ("pal,
freeze=0, mcm=0, 40col, x=0"), $FF0A $02 ("disable all interrupts except
raster"), $FF0B $CC ("end of screen"), $FF12 $04 ("charset from rom"),
$FF13 $D0 ("character base @ $d000"), $FF14 $08 ("vm base
@ $c00"), the colours $FF15 $71, $FF16 $5B, $FF17 $75, $FF18 $77, $FF19
$6E. Live after power-on, $FF00-$FF1F read `e1 01 71 7e 80 7e 1b 08 ff
7d a2 a1 fc a0 00 00 7c 00 c4 d1 0f f1 db f5 f7 ee fc 00 fe 00 c6 a8`,
with the raster compare at $A1 at that moment.

### Timers and the raster

TED's three timers count down at the single clock always ("Timing"; TLC;
the VICE manual: "The TED timers always run with the slower clock
rate"). A write to a timer's low byte stops it and a write to its high
byte starts it. Timer 1 reloads the value last written when it reaches
zero; timers 2 and 3 run on (plus4emu, ted_write.cpp). Each sets its flag
in $FF09 as it passes zero, and interrupts when $FF0A enables it. The
KERNAL's tape routines use timer 1 to write, timer 2 for the serial bus's
time-out and as the tape's "dipole hunter", and timer 3 to read bits
(KERNAL source, declare.src).

TED numbers its lines from near the top of the display window, not from
the top of the border. In 25 rows the
window opens at line 4 and closes at line 204; in 24 rows at 8 and 200. A
PAL frame is 312 lines, with vertical blanking at lines 251 to 268 and
sync at 254 to 256 (plus4emu, ted_main.cpp, checkVerticalEvents); the top
border is the lines from 269 to 311 and 0 to 3. TLC: "The 0 line of the
register corresponds to the first line of the character screen area, not
the top of the border." The raster interrupt compares $FF0B with bit 0 of
$FF0A as bit 8.

The flash counter, $FF1F bits 3-6, goes up once a frame, and the flash
changes each time it carries into bit 7, every 16 frames (plus4emu,
ted_main.cpp).

## Timing

| | PAL | NTSC |
|---|---|---|
| Double clock | 1,773,447 Hz | 1,789,772 Hz |
| Single clock | 886,724 Hz | 894,886 Hz |
| Lines a frame | 312 | 262 |
| Double-clock cycles a line | 114 | 114 |
| A frame | 35,568 cycles, 49.86 a second | 29,868 cycles, 59.92 a second |

The clocks are from VICE (plus4.h) and the VICE manual; TLC gives 57
single-clock cycles a line, the same count. TED divides its crystal by 20
on PAL and by 16 on NTSC for the single clock (TLC; plus4emu, plus4vm.cpp,
updateTimingParameters, with a crystal of 17,734,475 Hz).

**The kit's server counts double-clock cycles**: a frame is 35,568 of
them (`kit/c16/plus4emu.py`, FRAME_CYCLES). A TED timer's count goes down
by one every two.

The CPU runs at the double clock except where TED needs the bus: while it
fetches the screen and refreshes the RAM it runs the CPU at the single
clock (TLC), and bit 1 of $FF13 forces the single clock everywhere. So
the speed of a loop depends on where the raster is. The encyclopedia
(500248) measured, on PAL: 1,695,665 Hz with the display off and the
double clock, at least 1,147,196 Hz with the display on, 886,724 Hz with
the display off and the single clock forced, and 779,523 Hz with the
display on and the single clock forced. The KERNAL's tape routines turn
the display off for this ("1.7mhz clock & no dma's", KERNAL source,
tapsup.src, faster). A cycle count measured in the emulator holds only
for the same TED state.

## Interrupts

A TED interrupt reaches the CPU's IRQ; there is no NMI ("The CPU"). The
KERNAL's path, from its source and the ROM:

1. The vector at $FFFE is $FCB3 (puls, in the $FC00 page, so it is there
   whatever ROM bank is selected): it pushes A, X and Y, writes $FDD0
   (BASIC and the KERNAL), and jumps to $CE00 (krnirq, interrupt.src).
2. krnirq looks at the B flag the CPU pushed: a `BRK` goes through
   ($0316) cbinv, to the monitor's break entry; anything else through
   ($0314) cinv, to $CE0E (srvirq).
3. srvirq calls the split screen's routine on every raster interrupt
   (split.src, srvspl): in BASIC's split screen, graphics with text
   below, it switches to text at line 161 ($A1) and back to graphics at
   line 204 ($CC). It serves the ACIA when a channel was opened, and the
   tape's time-out. Then, for a raster interrupt, it clears TED's raster
   flag itself (`STA $FF09`) and looks at bit 6 of the compare, $FF0B:
   at line 161 it sets the compare to 204 and leaves; at line 204 it
   jumps through ($0312) itime, to $CE42 (ntime). ntime updates the
   jiffy clock, counts down BASIC's SOUND durations (domus) and scans the
   keyboard with interrupts enabled, then sets the compare back to 161
   and leaves (interrupt.src).
4. It returns through $FCBE (irqret): `LDX $FB` (curbnk), `STA $FDD0,X`
   (the bank that was selected), `PLA`, `TAY`, `PLA`, `TAX`, `PLA`,
   `RTI`.

The vectors at $0312-$0331, as RESTOR sets them (init.src, vectss):
$0312 itime ($CE42, "60 hz interrupt vector (before jiffy)"), $0314 cinv
($CE0E), $0316 cbinv ($F44C), $0318 iopen, $031A iclose, $031C ichkin,
$031E ickout, $0320 iclrch, $0322 ibasin, $0324 ibsout, $0326 istop,
$0328 igetin, $032A iclall, $032C usrcmd, $032E iload, $0330 isave. A
game that keeps the KERNAL's interrupt can point $0314 at its own code,
which then serves TED itself: clears the flags in $FF09 and sets the
next compare. Or it can point $0312 at its own code, which the KERNAL
jumps to once a frame, at line 204, with the raster flag already
cleared; that code ends with `JMP $CE42`, or else sets the compare back
itself and leaves through $FCBE (irqret).

**The jiffy clock**, $A3-$A5, counts 60 a second: the line-204
interrupt comes 50 times a second on PAL, and every fifth adds one more
tick (KERNAL source, patches.src, judt2, palcnt at $07FD). It wraps at
$4F1A01, 24 hours (time.src, udtim). The same interrupt switches the
cassette motor on while PLAY is held (patches.src, judt2).

**With the RAM paged in**, the CPU reads its IRQ vector from the RAM at
$FFFE-$FFFF, which RAMTAS does not set; on a C16 that is the RAM at
$3FFE-$3FFF. A game that pages the ROMs out either disables interrupts or
writes its own vector there ("The mistakes that bite").

## Keyboard and joysticks

The KERNAL reads the keyboard by writing a row's bit, 0 to select, to
$FD30 and to $FF08, then reading $FF08, where a pressed key is 0
(KERNAL source, ed3.src, keyscn). The matrix (the KERNAL's table, ed7.src;
plus4emu's key codes, row × 8 + column):

| Write | bit 0 | bit 1 | bit 2 | bit 3 | bit 4 | bit 5 | bit 6 | bit 7 |
|---|---|---|---|---|---|---|---|---|
| $FE | INST/DEL | RETURN | £ | HELP | F1 | F2 | F3 | @ |
| $FD | 3 | W | A | 4 | Z | S | E | SHIFT |
| $FB | 5 | R | D | 6 | C | F | T | X |
| $F7 | 7 | Y | G | 8 | B | H | U | V |
| $EF | 9 | I | J | 0 | M | K | O | N |
| $DF | DOWN | P | L | UP | . | : | - | , |
| $BF | LEFT | * | ; | RIGHT | ESC | = | + | / |
| $7F | 1 | CLR/HOME | CTRL | 2 | SPACE | C= | Q | RUN/STOP |

F4 to F7 are SHIFT with F1, F2, F3 and HELP (ed7.src, mode2). After
power-on F1 to F7 and HELP type `GRAPHIC`, `DLOAD"`, `DIRECTORY`,
`SCNCLR`, `DSAVE"`, `RUN`, `LIST` and `HELP`, the last five with RETURN
(init.src, pfktbl; live).

The joysticks are read through $FF08 too: write $FF08 with bit 2 clear
for port 1 or bit 1 clear for port 2, then read it. Bits 0-3 are up,
down, left and right, and fire is bit 6 for port 1 and bit 7 for port 2,
0 = pressed (plus4emu, ted_write.cpp, write_register_FF08, and the
server's port map; live: port 1 held left with fire reads $BB, port 2
$7B). TED reads every line selected at once: the keyboard rows still
selected in $FD30 and the joysticks the $FF08 write selects. A program
that reads a joystick with a keyboard row left selected sees those keys
as joystick bits, which is why Plus/4 World's keyboard page says to write
$FF to $FD30 first.

## Sound

TED has two voices (TLC; the guide):

- **Voice 1**, a square wave: frequency bits 0-7 at $FF0E, bits 8-9 in
  bits 0-1 of $FF12; on with bit 4 of $FF11.
- **Voice 2**, a square wave or noise: frequency bits 0-7 at $FF0F, bits
  8-9 in bits 0-1 of $FF10; the square on with bit 5 of $FF11, the noise
  with bit 6. With both set, the square sounds (plus4emu, ted_snd.cpp).
  This split is BASIC 3.5's own (BASIC source, noise.src: `tedmhi` holds
  voice 2's high bits at $FF10 and voice 1's at $FF10 + 2).
- **Volume**, bits 0-3 of $FF11: 0 to 8, and 9 to 15 sound as 8 in both
  emulators (plus4emu: 0, 6, 16, 26, 36, 46, 56, 66 and 75 for 0 to 8).
  BASIC's VOL takes 0 to 8 and refuses 9 (BASIC source, noise.src).
- **D/A**, bit 7 of $FF11: both voices' outputs are held high, so the
  output is the volume alone, which plays samples written to $FF11
  (TLC; plus4emu and VICE).

**Frequency.** Both emulators count a voice's value up to 1023 and
reload it, flipping the output each time: on PAL, f = 110,840 ÷ (1023 −
value) Hz, and a value of 1023 counts 1024 (plus4emu, ted_snd.cpp; VICE,
ted-sound.c, `0x400 - ((freq + 1) & 0x3FF)`). The documents give 1024 −
value ("Where the sources disagree"). The noise is an 8-bit shift
register with taps at bits 7, 5, 4 and 1 in both emulators.

BASIC's SOUND takes a voice (1, 2, or 3 for voice 2's noise), a value of
0 to 1023 and a duration in jiffies, which the KERNAL's interrupt counts
down at $04FC-$04FF (mtimlo, mtimhi) before switching the voice off
(BASIC source, noise.src; KERNAL source, music.src, domus).

## The KERNAL

One KERNAL for the C16 and the Plus/4. Its jump table (vectors.src; the
encyclopedia, 500232, for the four below $FF80; addresses live):

| Entry | Name | Goes to | | Entry | Name | Goes to |
|---|---|---|---|---|---|---|
| $FF49 | DEFKEY | $B7C2 (BASIC's ROM) | | $FFBA | SETLFS | $F413 |
| $FF4C | PRINT | $DC49 | | $FFBD | SETNAM | $F40C |
| $FF4F | PRIMM | $FBD8 | | $FFC0 | OPEN | ($0318) |
| $FF52 | MONITOR | $F445 | | $FFC3 | CLOSE | ($031A) |
| $FF81 | CINT | $D84E | | $FFC6 | CHKIN | ($031C) |
| $FF84 | IOINIT | $F30B | | $FFC9 | CHOUT | ($031E) |
| $FF87 | RAMTAS | $F352 | | $FFCC | CLRCH | ($0320) |
| $FF8A | RESTOR | $F2CE | | $FFCF | BASIN | ($0322) |
| $FF8D | VECTOR | $F2D3 | | $FFD2 | BSOUT | ($0324) |
| $FF90 | SETMSG | $F41A | | $FFD5 | LOADSP | $F043 |
| $FF93 | SECND | $EE4D | | $FFD8 | SAVESP | $F194 |
| $FF96 | TKSA | $EE1A | | $FFDB | SETTIM | $CF2D |
| $FF99 | MEMTOP | $F427 | | $FFDE | RDTIM | $CF26 |
| $FF9C | MEMBOT | $F436 | | $FFE1 | STOP | ($0326) |
| $FF9F | SCNKEY | $DB11 | | $FFE4 | GETIN | ($0328) |
| $FFA2 | SETTMO | $F423 | | $FFE7 | CLALL | ($032A) |
| $FFA5 | ACPTR | $EC8B | | $FFEA | UDTIM | $CEF0 |
| $FFA8 | CIOUT | $ECDF | | $FFED | SCRORG | $D834 |
| $FFAB | UNTLK | $EF3B | | $FFF0 | PLOT | $D839 |
| $FFAE | UNLSN | $EF23 | | $FFF3 | IOBASE | $FC19 |
| $FFB1 | LISTN | $EE2C | | $FFF6 | reset code | ("The CPU") |
| $FFB4 | TALK | $EDFA | | $FFFC, $FFFE | reset, IRQ | $FFF6, $FCB3 |
| $FFB7 | READSS | $F41C | | | | |

The entries from $FF81 are the C64's, at the C64's addresses. The names
are the kit's, and a listing shows each as `KERNAL_` and the name (the
kit's system file, `kit/c16/kernal_ted.py`). The C64's manuals call
SECND, LISTN, READSS, CHOUT, LOADSP, SAVESP and SCRORG SECOND, LISTEN,
READST, CHKOUT, LOAD, SAVE and SCREEN.

**PRIMM**, $FF4F, prints the text that follows the `JSR` up to a $00
byte, then returns after it (KERNAL source, util.src: "a jsr to this
routine is followed by a immediate ascii string, terminated by a $00").
The bytes after a `JSR $FF4F` are text, not code.

The $FC00 page holds the banking code and its jump table at $FCF1:
gobvec, phenix, fetchl, long and lngirq (KERNAL source, banking.src):
calls from one ROM bank into another.

## BASIC 3.5

BASIC's program starts at $1001, after a 0 at $1000. `RUN` starts the
BASIC program there, so machine code loaded at $1001 starts from `RUN`
only behind a BASIC line that calls it with `SYS`. BASIC 3.5's
tokens (live, the table at $818E: 126 keywords, $80-$FD):

- $80-$CB as the C64's BASIC V2, $CB being `GO`.
- $CC `RGR`, $CD `RCLR`, $CE `RLUM`, $CF `JOY`, $D0 `RDOT`, $D1 `DEC`,
  $D2 `HEX$`, $D3 `ERR$`, $D4 `INSTR`, $D5 `ELSE`, $D6 `RESUME`, $D7
  `TRAP`, $D8 `TRON`, $D9 `TROFF`, $DA `SOUND`, $DB `VOL`, $DC `AUTO`,
  $DD `PUDEF`, $DE `GRAPHIC`, $DF `PAINT`, $E0 `CHAR`, $E1 `BOX`, $E2
  `CIRCLE`, $E3 `GSHAPE`, $E4 `SSHAPE`, $E5 `DRAW`, $E6 `LOCATE`, $E7
  `COLOR`, $E8 `SCNCLR`, $E9 `SCALE`, $EA `HELP`, $EB `DO`, $EC `LOOP`,
  $ED `EXIT`, $EE `DIRECTORY`, $EF `DSAVE`, $F0 `DLOAD`, $F1 `HEADER`,
  $F2 `SCRATCH`, $F3 `COLLECT`, $F4 `COPY`, $F5 `RENAME`, $F6 `BACKUP`,
  $F7 `DELETE`, $F8 `RENUMBER`, $F9 `KEY`, $FA `MONITOR`, $FB `USING`,
  $FC `UNTIL`, $FD `WHILE`.

`kit/scripts/listing.py` types a BASIC program as bytes with its text in
the comment (`kit/c16/cpu.py`).

## Tapes

**The TAP file** (the encyclopedia, 500247): a 20-byte header, then the
pulses. $00-$0B hold `C16-TAPE-RAW` (or `C64-TAPE-RAW`), $0C the version
(0, 1 or 2), $0D the machine (2 for the C16 and Plus/4), $0E the video
standard (0 PAL, 1 NTSC), $10-$13 the data's length, low byte first. Each
byte is a time in units of 8 single-clock cycles: a whole wave in
versions 0 and 1, half a wave in version 2. A $00 is followed, in
versions 1 and 2, by three bytes giving the time in cycles, low byte
first. plus4emu reads TAP files signed `C16-TAPE-RAW` in version 1 or 2
and refuses the rest (plus4emu, tape.cpp, Tape_C16); it also reads its
own tape files, and WAV files when it was built with libsndfile
(`kit/c16/INSTALL.md`).

**The KERNAL's own format** (KERNAL source, tapwrt.src): three wave
lengths, a short, a long and a word marker, whose halves the writer times
with timer 2 as 212, 424 and 850 single-clock cycles less 4 for its own
set-up ("240us", "480us", "960us"). A 0 bit is a short then a long, a 1
bit a long then a short. A byte is a word marker and a long, then 8 bits
from the lowest, then an odd parity bit. A block is a leader of shorts, a
countdown $89 to $81 (on the second copy $09 to $01), the block's type,
its data, a checksum (the type and the data XORed together), a long, and
194 shorts. Every block is written twice. The types: 1 a BASIC program,
loaded where BASIC starts; 2 a data block; 3 a program loaded where it
was saved; 4 a data file's header; 5 the end of the tape. A header block
is 192 bytes at $0333 (tapbuf): the start address, the end address and
the file name. The encyclopedia (500247) gives the leaders as 16,382 and
243 shorts, and the TAP values as $35, $6A and $D4 in version 1. The
pulse lengths are not the C64's, so neither machine reads the other's
tapes (the encyclopedia, 500247).

**The cassette.** The motor is bit 3 of $01, 0 = on, and the PLAY switch
bit 2 of $FD10, 0 = pressed. The KERNAL switches the motor on and waits
before reading (tapsup.src, moton), and its interrupt keeps the motor
running while PLAY is held ("Interrupts"). It prints `PRESS PLAY ON TAPE`
and, when PLAY is down, reads with the CPU's interrupts off, the display
off, and TED's raster interrupt exchanged for timer 1's (tapsup.src,
faster), and puts them back after (slower).

**Turbo loaders.** Most commercial tapes load a short program in the
KERNAL's format that reads the rest in a faster format of its own: a
pulse is timed with one of TED's timers and compared with a threshold.
The encyclopedia's pages 500272 to 500281 describe each family (Novaload,
the Zifra loader, Audiogenic's, Supersoft's, Anirog's, Microdeal's,
Razorload, NewLine's and Novotrade's), with its thresholds, sync bytes and
checksums. The loader is part of the game's code: annotate it as such.

## Disks, program files and cartridges

**Disks.** The 1541 attaches to the serial bus as on the C64; the 1551,
made for these machines, to a parallel interface at $FEF0 (unit 8) or
$FEC0 (unit 9). Both use the same disk format, so a D64 image serves
either (plus4emu's features page; "Input and output"). The kit's server
runs a 1541.

**Program files.** A PRG file is a two-byte load address, low byte
first, then the bytes. BASIC programs load at $1001.

**Cartridges.** A cartridge is a ROM in bank 2 or 3 ("Memory map");
one with "CBM" at $8007 and 1 at $8006 starts itself at reset. VICE's
CRT format for these machines is "PLUS4 CARTRIDGE ", version 2.0 (the
VICE manual). The kit's server does not take cartridges.

## Where plus4emu differs from a real machine

- **A SID card.** plus4emu answers at $FD40-$FD5F and $FE80-$FE9F with
  the SID card that later owners fitted, and switches it on at the first
  write there (plus4emu, plus4vm.cpp). A stock machine has nothing
  there. The server's `read` shows $00 there.
- **The ACIA** is off in the kit's server, on the Plus/4 too, so
  $FD00-$FD0F reads the data bus. The KERNAL never looks for it unless a
  program opens an RS-232 channel ("Input and output").
- **The data bus.** Reads of an address with no device give the last
  value plus4emu's model left on the bus; the server's `read` shows $FF.
- **The palette** is plus4emu's own ("TED").
- **The sound's frequency** counts one less than the documents' formula
  ("Sound").
- **Power-on RAM** is $00 and $FF in turn ("Memory map").

## The mistakes that bite

- **$0000 and $0001 in a snapshot.** A flat RAM image holds the RAM
  beneath the CPU's port there, not the port; the port's values are in
  the snapshot's header (`kit/c16/snapshot.py`). The server's `read` in
  the `ram` space gives the RAM too.
- **Code that runs from RAM under the ROMs.** With the ROMs paged in, a
  read of $8000-$FFFF gives the ROM; a game's code or data there is in
  the RAM beneath. Read the `ram` space, and check which is paged in
  ($FF13 bit 0) before reasoning about a read the game makes.
- **The IRQ vector with the RAM paged in** is the RAM at $FFFE-$FFFF,
  which RAMTAS leaves as it was at power-on; on a C16 that is
  $3FFE-$3FFF, just after the reset code's copy. plus4emu powers on
  with $00 $FF there, which sends an interrupt to $FF00, among TED's
  registers: a game that pages the ROMs out with interrupts enabled
  writes its own vector first.
- **The 16 KB mirror.** On a C16, $4000, $8000 and $C000 are the same
  RAM as $0000: a pointer at $5000 writes to $1000. The KERNAL's RAM
  test depends on it, and so does any program that sizes memory the
  same way.
- **Keyboard rows mixing into a joystick read** ("Keyboard and
  joysticks"): what looks like a joystick bit can be a key.
- **Registers that read back with bits set**, $FF15-$FF19 with bit 7
  among them ("TED's registers"): `LDA $FF15` after `STA $FF15` does not
  return the value stored.
- **$FF1E is written inverted** and read doubled.
- **The character set from ROM below $8000** is not the RAM: TED reads
  nothing there ("What TED draws").
- **Text after `JSR $FF4F`** (PRIMM) is not code ("The KERNAL").
- **Cycle counts.** The server's cycles are double-clock cycles, TED's
  timers count single-clock ones, and the CPU's speed depends on the
  raster and on whether the display is on ("Timing").
- **The jiffy clock counts 60 a second on PAL**, from a 50 Hz interrupt
  ("Interrupts"): a game's 50 Hz loop is not the clock's.

## Where the sources disagree

1. **$FF07 bit 5.** The guide's register table: "Flashing: 0 = yes, 1 =
   no". The KERNAL source's comment ("freeze=0"), TLC ("TED stop ... only
   single clock and refresh cycles remain") and plus4emu (the picture
   blank, TED's counters stopped): it freezes TED. Trust the second
   group; flashing is the attribute's bit 7.
2. **$FF06 bit 4.** TLC calls it "Blank screen"; it is 1 for the display
   on (the guide: "0 = blank screen, 1 = display screen"; the KERNAL's
   $1B with the comment "blnk=1"; plus4emu).
3. **The frequency's high bits.** TLC puts voice 1's at $FF10 and voice
   2's at $FF12. BASIC 3.5's own code (noise.src), the guide, VICE and
   cc65 put voice 2's at $FF10 and voice 1's at $FF12. Trust BASIC.
4. **The loudest volume.** TLC: "Maximum value is 8". The guide's table:
   "0 = off, F = highest". BASIC's VOL stops at 8, and both emulators
   play 9-15 as 8. Trust 8.
5. **$FF11 bit 7.** The guide's table: "Sound reload switch: 0 = on, 1 =
   off"; its chapter on sound: "Sound switch". TLC, plus4emu and VICE: D/A
   mode, the outputs held so the volume alone sounds.
6. **$FF13 bit 0.** The guide: "Status of clock". TLC: "always sets to 1
   when ROM is active over $8000. READ ONLY". Live it is 1 with the ROMs
   paged in and 0 without ("Memory map"). Trust TLC.
7. **The frequency formula.** TLC and the guide's note table: f = single
   clock ÷ 8 ÷ (1024 − value). Both emulators: (1023 − value). Which a
   real TED does is unknown; the difference is under 0.3 % for values
   below 700.
8. **TLC's PAL constant**, 111840.45, is probably a slip for 110840.45:
   886,724 ÷ 8 = 110,840.5 (inferred).
9. **$0318.** cc65's `plus4.inc` names it `NMIVec`; the KERNAL keeps the
   OPEN vector there (init.src, vectss), and the CPU has no NMI.
10. **The TAP signature.** The encyclopedia allows `C16-TAPE-RAW` with
    any version; the VICE manual says `C16-TAPE-RAW` is for version 2
    only.
11. **The clocks' last digit.** The encyclopedia gives 1,773,448 and
    1,789,773 Hz; VICE 1,773,447 and 1,789,772.
12. **The joystick's select value.** The guide: "For joystick port 1,
    store $FA … For port 2, use $FD". Plus/4 World's keyboard page: $FB
    for port 1. Both clear bit 2, which is the one that selects port 1
    (plus4emu), so both work.
13. **regenerator2000's built-in Plus/4 file** puts SETLFS, CHOUT and
    CLRCH at $EF8A, $FEC9 and $FECC, where the ROM has none of them, and
    spells BASIN and SAVESP as 8ASIN and SAYESP. The kit's file corrects
    them (`kit/c16/kernal_ted.py`).

## Sources

- Commodore's source for the TED KERNAL (revision 05) and BASIC 3.5:
  `https://github.com/mist64/cbmsrc`, folders `KERNAL_TED_05` and
  `BASIC_TED`.
- plus4emu, by István Varga: `https://github.com/istvan-v/plus4emu`, git
  939e652 (2 April 2020), its README "plus4emu 1.2.11 beta"; the kit
  builds it as `kit/c16/tools.py get-plus4emu` says.
- VICE 3.10.0's source, `src/plus4/` (plus4mem.c, plus4.h,
  ted-sound.c), and the VICE manual, `doc/vice.texi`:
  `https://sourceforge.net/p/vice-emu/code/HEAD/tree/trunk/vice/`.
- Levente Hársfalvi (TLC), "Talking to TED", C= Hacking 12, March 1996:
  `https://www.devili.iki.fi/pub/Commodore/docs/magazines/chacking/chacking_12.txt`.
- Cyndie Merten and Sarah Meyer, Programmer's Reference Guide for the
  Commodore Plus/4 (Scott, Foresman and Company 1986, ISBN
  0-673-18249-5), a third-party book:
  `https://archive.org/details/Plus-4_Programmers_Reference_Guide`.
- The Plus/4 Encyclopedia: `https://plus4world.powweb.com/plus4encyclopedia`,
  pages 500232, 500247, 500248, 500272-500281 and 500290, read on 19
  October 2026.
- cc65's `asminc/plus4.inc` and `cfg/c16.cfg`:
  `https://github.com/cc65/cc65`.
