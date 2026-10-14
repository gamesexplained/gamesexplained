---
name: bbc-reference
description: BBC Micro Model B facts for reverse engineering, memory map, paged ROMs, SHEILA, the screen modes, the VIAs and keyboard, interrupts and events, timing, sound, the MOS calls, disc and tape loading, games written in BBC BASIC, and the mistakes that bite. Consult this instead of recalling from training.
---

# BBC Micro reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

The profile is the machine the kit runs: a **Model B** with **MOS 1.20**
and **DFS 1.20** on an Intel 8271 disc controller (jsbeeb 2.4.0's "BBC B
with 8271 (DFS 1.2)"). The Master 128 and the B+ appear only in notes
marked as theirs.

Addresses are written with `&`, as the BBC's own manuals write them. The
kit's tools and listings print `$`: `&FE40` and `$FE40` are the same
address.

Each fact says how it was checked: the jsbeeb 2.4.0 source the kit runs,
under `tools/bbc/node_modules/jsbeeb/src` ("jsbeeb, src/via.js"); the MOS
1.20 ROM jsbeeb ships, disassembled at &C000 with `kit/cpu/m6502.py`
("ROM &DC1C"); the kit's machine itself on 13 October 2026 ("live"); or a
document under Sources ("AUG section 13.11", "BeebWiki"). Where a
document and the machine disagree, the machine wins, and the entry says
so. A fact marked as checked in jsbeeb only was not checked on a real
BBC Micro.

## Where to read about a game first

Before any code, and before the emulator, when the contributor has said
yes to looking the game up online (`kit/START.md`): the game's page on the
**Complete BBC Micro Games Archive**, `https://www.bbcmicro.co.uk/`.
Search it with `https://www.bbcmicro.co.uk/index.php?search=<title>`; a
game's page is `game.php?id=<n>`. On 13 October 2026 it answered a
script's fetch, and a game's page read as a form:

- **Year** and **Publisher**: they fill `game.json`.
- **Release Type**, **Primary genre**, **Secondary genre**, **Players**.
- **Joystick**: whether the game reads one, and so whether to drive the
  keys or the ADC (Joysticks and the ADC, below).
- **Save**: whether the game saves, and to what.
- **Compatibility**: Model A, Model B and Master, each ticked, crossed or
  untested.
- **Play**, **Download** and **Explore Disc** lead to the disc image:
  never follow them.

For the manual, the inlay and magazine reviews, use the Internet Archive,
which answered on 13 October 2026: its item search
(`https://archive.org/advancedsearch.php?q=<title>+<publisher>&fl[]=identifier&fl[]=title&output=json`)
finds scans, and each item's OCR text is
`https://archive.org/download/<id>/<id>_djvu.txt`
(`kit/skills/c64/c64-reference`, "Where to read about a game first", has
the details). A manual, when one exists, outranks any catalogue.

What else answered a script's fetch on 13 October 2026:

| Site | Answer |
|---|---|
| BeebWiki, `https://beebwiki.mdfs.net/` | the machine, not games; a page's wiki text is `index.php?title=<Page>&action=raw` |
| 8-Bit Software, `https://8bs.com/` | answered; `https://www.8bs.com/` did not |
| Acorn Electron World, `https://www.acornelectron.co.uk/` | answered; it is about the Electron, and an Electron version of a game is another program |
| Stairway to Hell, `https://www.stairwaytohell.com/` | a page of frames built by JavaScript: nothing a script can read |
| MobyGames, the stardot forums | a browser check (403) |
| the Wayback Machine, `https://web.archive.org/` | the connection was reset |

These are fan catalogues: what they say is documented, not true. Record
each one you use under Sources in `features.md` with its address and the
date you read it, the game's page as `links.wiki` in `game.json` and a
manual as `links.manual`. Read the documents only: the same searches list
game images, which are never downloaded.

## Memory map

The Model B's 32K of RAM is &0000-&7FFF. The MOS, the language and the
filing system each own parts of it while they run. A game that has taken
the machine over can reuse what it no longer calls, but the MOS's
interrupt code runs until the game replaces it, and that code writes &FC
on every interrupt and uses page 2 throughout. The ranges are the AUG's
(chapter 11); "live" marks a value read on the kit's machine.

| Range | Holds | Free to a game that has taken over |
|---|---|---|
| &0000-&008F | the language's zero page; BASIC leaves &70-&8F to the user | yes, once the language is not called |
| &0090-&009F | Econet | yes, with no network |
| &00A0-&00A7 | whoever owns NMIs: the DFS during a transfer | not while the disc is in use |
| &00A8-&00AF | scratch for OS commands | between MOS calls |
| &00B0-&00BF | scratch for the filing system | between filing system calls |
| &00C0-&00CF | the active filing system's own | not while the disc is in use |
| &00D0-&00E1 | the VDU driver | not while OSWRCH is used |
| &00E2-&00FF | the MOS | not while the MOS's interrupt code runs |
| &0100-&01FF | the stack | no |
| &0200-&0235 | the 27 vectors, two bytes each (names in `kit/bbc/mos.py`) | not while the MOS runs |
| &0236-&02FF | MOS variables (table below) | not while the MOS runs |
| &0300-&037F | VDU variables (table below) | not while OSWRCH is used |
| &0380-&03DF | cassette filing system | yes, with no tape in use |
| &03E0-&03FF | keyboard buffer | not while the MOS reads the keyboard |
| &0400-&07FF | the language's workspace | yes, once the language is not called |
| &0800-&083F | sound workspace | not while the MOS makes sound |
| &0840-&087F | the four sound channels' buffers | not while the MOS makes sound |
| &0880-&08BF | printer buffer | yes, with no printer |
| &08C0-&08FF | envelopes 1-4 | yes, if the game defines no envelope |
| &0900-&09FF | envelopes 5-16, or the RS423 or cassette output buffer | yes, with none of those in use |
| &0A00-&0AFF | cassette and RS423 input buffer | yes, with no tape or serial in use |
| &0B00-&0BFF | the function keys' definitions | yes |
| &0C00-&0CFF | definitions of characters 224-255 | yes, unless the game prints them |
| &0D00-&0D9E | the NMI routine: the CPU's NMI vector is &0D00 (ROM &FFFA), and reset puts an RTI there (ROM &D9CD, live) | not while the disc is in use |
| &0D9F-&0DEF | extended vectors, three bytes each, for vectors a paged ROM claims | not while a paged ROM is called |
| &0DF0-&0DFF | one workspace byte for each ROM bank | as above |
| &0E00-&18FF | DFS 1.20's workspace: the catalogue of the drive in use at &0E00-&0FFF (DFS ROM, reads of &0F05 and &0F06), the rest its own | yes, once the game has stopped loading from disc |
| &1900-HIMEM | the program. PAGE, the MOS's OSHWM, is &1900 with the DFS (live: &0244 = &19, OSBYTE &83); it is &0E00 when no paged ROM claims workspace (AUG section 11.12) | yes |
| HIMEM-&7FFF | the screen (The screen, below) | the screen |
| &8000-&BFFF | the paged ROM or sideways RAM bank ROMSEL selects (Paged ROMs and sideways RAM, below) | a RAM bank, yes |
| &C000-&FBFF | MOS ROM | no |
| &FC00-&FCFF | FRED, the 1 MHz bus: nothing of the machine's own; jsbeeb reads &FF there (src/6502.js) | no |
| &FD00-&FDFF | JIM, the 1 MHz bus, the same | no |
| &FE00-&FEFF | SHEILA, the machine's chips (SHEILA, below) | no |
| &FF00-&FFFF | MOS ROM: the entry points from &FFB9 and the CPU's vectors | no |

The kit's coverage leaves &8000-&BFFF out by default, as ROM
(`kit/scripts/symbols_export.py`). A game that loads code or data into a
sideways RAM bank takes the range back with `coverage.include` in
`game.json`, or makes the bank a part of its own (`kit/skills/core/10-orient`,
"A game of several parts").

Bytes worth knowing, in zero page and page 2:

| Address | Holds | Checked |
|---|---|---|
| &EC | the internal key number of the key pressed last, plus &80; 0 when none | live. AUG chapter 11 says the number alone; its OSBYTE &78 entry and the machine add &80 |
| &ED | the key pressed before it and still held, the same way | live |
| &EF, &F0, &F1 | A, X and Y of the last OSBYTE or OSWORD; at a BRK the MOS puts the stack pointer in &F0 | AUG section 11.1; ROM &DC3F |
| &F4 | the ROM bank selected: the MOS's copy of ROMSEL | ROM &DC0B; live &0F under BASIC |
| &F6, &F7 | the address OSRDRM reads | ROM &DC14 |
| &FC | A, saved by every IRQ | ROM &DC1C |
| &FD, &FE | after a BRK, the address of the byte after it, the error number | ROM &DC31-&DC38 |
| &FF | bit 7: an ESCAPE is pending | AUG |
| &0240 | counts vsyncs down: the vsync interrupt decrements it, and OSBYTE &13 waits for it to change | ROM &DD15, &E9B6 |
| &0248 | copy of the video ULA's control register | ROM &EA02, &E6CB |
| &0249 | copy of the last palette write | ROM &EA15 |
| &024A | the ROM bank selected when the last BRK came | ROM &DC3C |
| &024B | BASIC's bank | ROM &DB09; live &0F |
| &024C, &024D, &024E | the ADC channel converting, the highest channel, the conversion type | ROM &DE4A-&DE98; AUG OSBYTE &BC-&BE |
| &0251, &0252, &0253 | the flash counter, then the two flash periods in frames (OSBYTE 9 and 10) | ROM &DD1E-&DD3A (the flash), &E6B2-&E6CE (OSBYTE 9 and 10) |
| &0258 | ESCAPE and BREAK (OSBYTE &C8): bit 0 set disables ESCAPE, bit 1 set clears memory on BREAK | AUG chapter 8 |
| &0279 | the system VIA's interrupt mask (OSBYTE &E9): a source whose bit is clear goes on to IRQ2V | ROM &DD0B; AUG section 13.9 |
| &0287-&0289 | the BREAK intercept: when &0287 holds a JMP (&4C), the MOS calls it twice on BREAK, with C clear and then set | ROM &EAD9, called at &DB32 and &DB88; AUG chapter 8, OSBYTE &F7-&F9 |
| &028C | the language's bank | ROM &DC46 |
| &0290, &0291 | *TV: the vertical offset and the interlace setting | ROM &C964, &C96F |
| &0292-&029B | the two five-byte TIME clocks, updated in turn | ROM &DDD1-&DDE8; AUG section 13.9 |
| &029C-&02A0 | the interval timer, counting up; event 5 when it reaches zero | ROM &DDEB-&DDF7 |
| &02A1-&02B0 | the type byte of the ROM in each bank, 0 for none | ROM &DB02; live: bank 14 &82 (DFS), bank 15 &60 (BASIC) |
| &02B6-&02B9, &02BA-&02BD | the ADC's last values for channels 1-4: low bytes, then high bytes | ROM &DE4F-&DE58 |
| &02BE | the last ADC channel converted | ROM &DE5B |
| &02BF-&02C8 | the enable flags of events 0-9 | ROM &E499 |

OSBYTE &A6-&FF read and write page 2 directly: OSBYTE A works on
&0190 + A, so &0236-&028F (AUG chapter 8).

The VDU variables, read live in every mode:

| Address | Holds |
|---|---|
| &0308-&030B | the text window: left, bottom, right, top, in characters |
| &0318, &0319 | the text cursor's column and row |
| &034A, &034B | the text cursor's screen address |
| &034E | the high byte of the screen's start |
| &034F | bytes per character: 8, 16 or 32 by the number of colours; 1 in mode 7 |
| &0350, &0351 | the address of the top left character, which moves as the screen scrolls |
| &0352, &0353 | bytes per row of characters: 640, 320 or 40 |
| &0354 | the high byte of the screen's size |
| &0355 | the mode |
| &0356 | the memory map type: 0 for 20K, 1 for 16K, 2 for 10K, 3 for 8K, 4 for mode 7 |
| &0357-&035A | the text and graphics colours: text foreground, text background, graphics foreground, graphics background |
| &035F | the MOS's copy of CRTC register 10 (ROM &C951, &C976) |
| &0360 | the number of logical colours, less one |
| &0361 | pixels per byte, less one; 0 in the text-only modes and mode 7 |
| &0362, &0363 | masks of the leftmost and rightmost pixel of a byte |
| &036F-&037E | the logical-to-physical palette, one byte per logical colour |

## Paged ROMs and sideways RAM

&8000-&BFFF shows one of 16 banks. ROMSEL, a latch at &FE30, selects it
with its low four bits. On the Model B **ROMSEL is write-only**: nothing
reads it back (jsbeeb gives &FE, the floating bus, src/6502.js). The MOS
keeps its copy at **&F4**, and that is how a game, or the MOS itself,
knows which bank is in. To select a bank, write &F4 first and then
&FE30, as OSRDRM does (ROM &DC0B-&DC18). The MOS pages ROMs in on its own,
interrupts included (service call 5 for an interrupt nobody claimed):
its service call routine saves &F4, pages each ROM in, and then selects
the bank &F4 held again (ROM &F168-&F189). A bank changed without
updating &F4 is switched back under the code that changed it (BeebWiki,
"Paged ROM").

On the kit's machine BASIC is in bank 15 and the DFS in bank 14 (live:
&02A1 + bank; `*HELP` gives DFS 1.20 and OS 1.20). The MOS 1.20 reset scan
(ROM &DABD-&DB0F) goes from bank 0 to 15 and accepts a bank only when it
finds `00 28 43 29` (a zero, then "(C)") at &8000 plus the byte at &8007.
A bank whose first 1K, &8000-&83FF, matches a higher bank's is ignored.
The type byte of each bank accepted goes to &02A1 + bank, and a bank whose
type byte has bit 7 and bits 0-3 all clear, BASIC's &60, goes to &024B
(ROM &DAFF-&DB09).

The header every ROM carries (BeebWiki, "Paged ROM"; both ROMs jsbeeb
ships fit it):

| Address | Holds |
|---|---|
| &8000 | language entry, a JMP |
| &8003 | service entry, a JMP |
| &8006 | type: bit 7 a service entry, bit 6 a language entry, bit 5 a Tube transfer address after the copyright, bit 4 Electron key expansions; bits 0-3 the CPU type, 0 for 6502 BASIC and 2 for 6502 code. BASIC's is &60 and DFS 1.20's &82 |
| &8007 | the offset of the copyright string |
| &8008 | a binary version number |
| &8009 | the title, ending in 0; then an optional version string |
| &8000 + (&8007) | 0, "(C)", the copyright text, 0 |

**Sideways RAM.** A stock Model B has none; boards added it. jsbeeb
2.4.0's Model B has RAM in banks 0-7 (src/models.js, `beebSwram`), so a
game that finds sideways RAM in the kit's machine might not find it on a
real B. A game puts code there by selecting the bank and storing to
&8000-&BFFF; it then calls it like any other code, with the bank selected.

## SHEILA

The page &FE00-&FEFF holds the machine's chips. The table is the AUG's
(chapter 17), with jsbeeb's decode (src/6502.js, `readDevice` and
`writeDevice`). `kit/bbc/registers.py` names each register's own address
for the listings.
"1 MHz" marks the blocks whose every access is slowed to meet the 1 MHz
clock (Timing, below).

| Addresses | Chip | Registers | 1 MHz |
|---|---|---|---|
| &FE00-&FE07 | 6845 CRTC | &FE00 register number (write), &FE01 the register's value; every 2 bytes | yes |
| &FE08-&FE0F | 6850 ACIA, serial and cassette | &FE08 status (read) and control (write), &FE09 data | yes |
| &FE10-&FE1F | serial ULA | &FE10 control, at &FE10-&FE17 in jsbeeb. A read of &FE18 gives the Econet station number and stops Econet NMIs; a read of &FE20 lets them through again. The AUG (section 25.3) puts the station number at &FE20: jsbeeb's decode is used here | yes |
| &FE20-&FE2F | video ULA | &FE20 control, &FE21 palette; both write-only | no |
| &FE30-&FE3F | ROMSEL | &FE30, low four bits, write-only. The AUG says any of &FE30-&FE3F; jsbeeb 2.4.0's B ignores writes to &FE38-&FE3B | no |
| &FE40-&FE5F | system VIA | 16 registers, repeated | yes |
| &FE60-&FE7F | user VIA | 16 registers, repeated | yes |
| &FE80-&FE9F | 8271 disc controller | &FE80 status (read) and command (write), &FE81 result (read) and parameter (write), &FE82 reset, &FE84 data (AUG section 25.1) | no |
| &FEA0-&FEBF | 68B54 Econet | | no |
| &FEC0-&FEDF | uPD7002 ADC | &FEC0 status (read), and writing it starts a conversion; &FEC1 high byte, &FEC2 low byte | yes |
| &FEE0-&FEFF | Tube | | no |

A VIA's 16 registers, at &FE40 + n for the system VIA and &FE60 + n for
the user VIA: 0 ORB/IRB, 1 ORA/IRA, 2 DDRB, 3 DDRA, 4 T1C low, 5 T1C
high, 6 T1L low, 7 T1L high, 8 T2C low, 9 T2C high, 10 SR, 11 ACR, 12
PCR, 13 IFR, 14 IER, 15 ORA/IRA without handshake. Writing a 1 to a bit
of the IFR (&FE4D, &FE6D) clears that interrupt; writing the IER with bit
7 set enables the sources whose bits are 1, with bit 7 clear disables them
(AUG chapter 22).

## The screen

### The modes

Read live in every mode, and from the MOS's tables (ROM &C3F7 for the
ULA, &C440 for the map type, &C46E for the CRTC):

| Mode | Graphics | Text | Colours | Screen | Size | Row of characters | Bytes a character | ULA &FE20 |
|---|---|---|---|---|---|---|---|---|
| 0 | 640×256 | 80×32 | 2 | &3000 | 20K | 640 bytes | 8 | &9C |
| 1 | 320×256 | 40×32 | 4 | &3000 | 20K | 640 | 16 | &D8 |
| 2 | 160×256 | 20×32 | 16 | &3000 | 20K | 640 | 32 | &F4 |
| 3 | text only | 80×25 | 2 | &4000 | 16K | 640 | 8 | &9C |
| 4 | 320×256 | 40×32 | 2 | &5800 | 10K | 320 | 8 | &88 |
| 5 | 160×256 | 20×32 | 4 | &5800 | 10K | 320 | 16 | &C4 |
| 6 | text only | 40×25 | 2 | &6000 | 8K | 320 | 8 | &88 |
| 7 | teletext | 40×25 | 8, by control codes | &7C00 | 1K | 40 | 1 | &4B |

Every screen runs from its start to &7FFF, and HIMEM is its start.

### Where a byte is, in modes 0-6

The screen is stored **character cell by character cell**, not line by
line. A cell is 8 bytes, one for each of its pixel lines, top to bottom.
Cells follow one another left to right along a row of characters, and
rows follow one another down the screen. So for pixel line y (0 at the
top) and byte column b (b = x ÷ pixels per byte), the byte is at

    start + (y div 8) × row + b × 8 + (y mod 8)

where `row` is 640 or 320 bytes. In modes 3 and 6 a row of characters is
10 lines: use `div 10` and `mod 10`. Lines 8 and 9 of each row are blank
and come from no memory: outside teletext, the display is off while the
CRTC's line counter has bit 3 set (jsbeeb, src/video.js). An address
past &7FFF wraps (Scrolling, below).

### The pixels in a byte

The video ULA looks up each pixel's colour with bits 7, 5, 3 and 1 of its
shift register, which shifts left once a pixel (BeebWiki, "Video ULA";
jsbeeb, src/video.js). With the palettes the MOS sets, that gives
(checked live by plotting single pixels):

| Colours | Modes | Pixels a byte | Pixel i, counting from 0 at the left |
|---|---|---|---|
| 2 | 0, 3, 4, 6 | 8 | bit 7 − i |
| 4 | 1, 5 | 4 | bit 7 − i is the high bit of the colour, bit 3 − i the low bit |
| 16 | 2 | 2 | left pixel bits 7, 5, 3, 1; right pixel bits 6, 4, 2, 0; each from the colour's bit 3 down to bit 0 |

So &8C in mode 1 is colours 3, 1, 0, 0, and &A5 in mode 2 is 12 then 3.

### Logical and physical colours

Screen memory holds **logical** colours. The palette maps each to one of
16 **physical** colours: 0 black, 1 red, 2 green, 3 yellow, 4 blue, 5
magenta, 6 cyan, 7 white, and 8-15, which flash between colour n − 8 and
its complement, 7 − (n − 8).

The palette register &FE21 takes a palette index (the four pixel bits
above, as a number 0-15) in its high four bits and the physical colour
**EOR 7** in its low four. Bit 3 of that low half marks a flashing
colour. OSBYTE &9B does the EOR for you (ROM &EA10-&EA18); a direct
write to &FE21 does not. A mode with fewer than 16 colours needs several
entries for each logical colour: VDU 19 writes 8, 4 or 1 of them by mode
(BeebWiki, "Video ULA"). The MOS's default colours: in two-colour modes
black and white; in four-colour modes black, red, yellow and white; in
mode 2 logical n is physical n (BeebWiki's table of the MOS's palette
writes; live, &036F-&037E after each MODE).

**Flashing.** While bit 0 of &FE20 is set, every colour whose palette
entry has bit 3 set shows its complement. The MOS flips that bit, and its
copy &0248, on the vsync interrupt when the flash counter &0251 runs out,
then reloads the counter from &0252 or &0253 (ROM &DD1E-&DD3A). The two
periods default to 25 frames each (AUG chapter 8, OSBYTE 9 and 10).

### The video ULA, &FE20

| Bits | Meaning |
|---|---|
| 7, 6, 5 | the cursor's three segments, one, one and two character clocks wide (jsbeeb, src/video.js `cursorTable`) |
| 4 | the CRTC's clock: 1 for 2 MHz and 80 bytes a line (modes 0-3), 0 for 1 MHz and 40 (modes 4-7) |
| 3, 2 | the number of columns: 11 is 80, 10 is 40, 01 is 20, 00 is 10; the pixel rate is 16, 8, 4 or 2 MHz |
| 1 | teletext: the picture comes from the SAA5050 |
| 0 | flash (above) |

The bits are BeebWiki's ("Video ULA") and fit every mode's value above.
The register is write-only; &0248 is the MOS's copy, and OSBYTE &9A writes
both (ROM &E9FF-&EA0B). Write &FE20 directly and the MOS's next flash
writes &0248, with bit 0 flipped, over it (ROM &DD2B-&DD37).

### The CRTC

The MOS's values, from its tables (ROM &C46E) and read live:

| | R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12, R13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| modes 0-2 | 127 | 80 | 98 | &28 | 38 | 0 | 32 | 35 | 1 | 7 | &67 | 8 | &0600 |
| mode 3 | 127 | 80 | 98 | &28 | 30 | 2 | 25 | 28 | 1 | 9 | &67 | 9 | &0800 |
| modes 4, 5 | 63 | 40 | 49 | &24 | 38 | 0 | 32 | 35 | 1 | 7 | &67 | 8 | &0B00 |
| mode 6 | 63 | 40 | 49 | &24 | 30 | 2 | 25 | 28 | 1 | 9 | &67 | 9 | &0C00 |
| mode 7 | 63 | 40 | 51 | &24 | 30 | 2 | 25 | 28 | &93 | 18 | &72 | 19 | &2800 |

- Select a register by writing its number to &FE00, then write its value
  to &FE01. VDU 23,0,R,V,0,0,0,0,0,0 does the same through the MOS (ROM
  &C958-&C98B), with the *TV changes to R7 and R8 below, and copies R10 to
  &035F.
- **R12 and R13**, the screen's start: in modes 0-6 the address **÷ 8**
  (&3000 is &0600). In mode 7, the address's high byte less &74, EOR &20,
  so &7C00 is &2800 (ROM &CA0F-&CA29; live). R14 and R15, the cursor, are
  set the same way.
- **R7** is written as the value plus the *TV offset plus one: the table
  holds 34 and 27, the chip gets 35 and 28 (ROM &C95E-&C964, an ADC with
  the carry set; live).
- **R8** is 1, interlaced sync, in modes 0-6, and *TV's second number
  EORs it, so `*TV 0,1` turns interlace off; a value with bit 7 set, mode
  7's &93, is left alone (ROM &C967-&C96F). &93 is interlaced sync and
  video.
- R3's high four bits are the vsync pulse's length, 2 lines. R4 is the
  frame's height in character rows less one, R5 the scan lines added to
  it, R6 the rows displayed, and R9 a row's scan lines less one (AUG
  chapter 18). So modes 0-2 have 39 rows of 8 lines, 312 lines a frame.

### Scrolling and the wrap

Changing R12 and R13 moves the whole picture: in modes 0-6 by 8 bytes,
one character cell, at a time. The MOS scrolls text this way, a row of
characters at a time, and keeps the top left character's address in
&0350.

The CRTC then reads past &7FFF, and the hardware wraps such an address
back by the screen's size, chosen by two bits of the system VIA's
addressable latch, B5 and B4 (The system VIA, below):

| Screen | Modes | B5 | B4 |
|---|---|---|---|
| 20K | 0, 1, 2 | 1 | 0 |
| 16K | 3 | 0 | 0 |
| 10K | 4, 5 | 1 | 1 |
| 8K | 6 | 0 | 1 |

A mode change sets them (ROM &CB64-&CB73, tables &C44B and &C44F); mode 7
sets B4 to 0 and leaves B5 as it was. Live, the latch read &AF in modes
0-2, &8F in mode 3, &BF in modes 4 and 5 and &9F in mode 6, and jsbeeb
subtracts 16K, 8K, 20K or 10K for B5 B4 = 00, 01, 10, 11 (src/video.js,
`screenAddrSubtract`). **The AUG (section 23.2) gives 1 1 for 20K and 1 0
for 10K: the machine says the reverse, and the machine wins.** A game that
programs the CRTC for a screen of another size must set the latch to
match.

### Mode 7

- The screen is 25 rows of 40 bytes at &7C00-&7FE7, one byte per
  character, inside a 1K block that the display wraps within.
- Bit 13 of the CRTC's address (R12 of &20 or more) selects teletext
  addressing: the low 10 bits pick the byte in the 1K, and bit 12 is
  ignored. On the Model B, bit 11 then picks &7C00 when set (R12 &28) or
  &3C00 when clear (R12 &20) (jsbeeb, src/video.js, `readVideoMem`;
  BeebWiki, "CRTC").
- The SAA5050 ignores bit 7, so &80-&9F act as control codes 0-31 (jsbeeb,
  src/teletext.js). Through OSWRCH, codes 0-31 are VDU codes, so programs
  send the control codes as 128-159; the MOS stores them as they are
  (live: VDU 129 put &81 in screen memory).

| Code | Effect, to the end of the row or the next code that changes it |
|---|---|
| &81-&87 | text in red, green, yellow, blue, magenta, cyan, white |
| &88, &89 | flash, steady |
| &8C, &8D | normal height, double height |
| &91-&97 | block graphics in red, green, yellow, blue, magenta, cyan, white |
| &98 | conceal |
| &99, &9A | contiguous graphics, separated graphics |
| &9C | black background |
| &9D | new background: the foreground colour |
| &9E, &9F | hold graphics, release graphics |

- **The MOS translates three characters in mode 7**: it stores &23 as
  &5F, &5F as &60, and &60 as &23 (live), so that `#`, `_` and `£` show
  as typed: the SAA5050's glyphs are £ at &23, # at &5F and a horizontal
  bar at &60 (jsbeeb, src/teletext_data.js). A game that writes screen
  memory itself bypasses the translation.

## The system VIA

&FE40-&FE5F. What each line does (AUG section 23.1), and how MOS 1.20
sets it up (reset code ROM &DA80-&DAA7; live):

| Line | Use |
|---|---|
| PA0-PA7 | the slow data bus: the keyboard, the sound chip, speech |
| PB0-PB2 | the address of a bit in the addressable latch |
| PB3 | the value written to that bit |
| PB4, PB5 | the fire buttons, 1 normally and 0 while pressed |
| PB6, PB7 | the speech processor's interrupt and ready lines |
| CA1 | vsync from the CRTC; the MOS's PCR &04 makes a falling edge interrupt |
| CA2 | the keyboard: a key has gone down |
| CB1 | the ADC's end of conversion |
| CB2 | the light pen strobe |
| T1 | the MOS's 100 Hz tick: free-running (ACR &60), latch &270E |
| T2 | counts pulses on PB6 for speech |

At reset the MOS enables T1, T2, CB1 and CA1 (IER &F2, ROM &DA80), and
CA2 later: live, IER read &F3 at the BASIC prompt, and DDRA &7F.

### The addressable latch

Writing &FE40 with port B's low four bits as outputs sets one bit of an
eight-bit latch: bits 0-2 name the bit, bit 3 is its new value. So &03
clears latch bit 3 and &0B sets it. The MOS writes it with interrupts
disabled (ROM &E9F8).

| Bit | Meaning |
|---|---|
| 0 | the sound chip's write enable, active at 0 |
| 1, 2 | speech processor read and write select (AUG; jsbeeb has no speech) |
| 3 | the keyboard: at 1 it scans itself; at 0 port A reads the key whose number is written to it |
| 4, 5 | the screen wrap's size (Scrolling and the wrap, above) |
| 6 | the CAPS LOCK light, lit at 0 |
| 7 | the SHIFT LOCK light, lit at 0 |

Sources: AUG section 23.2; jsbeeb, src/via.js (`portBUpdated`); the
latch read live in each mode (Scrolling and the wrap, above). At reset
the MOS sets bits 0-6 to 1 (ROM &DA03-&DA0E). Mode 7 then clears B4 and
leaves B5 set, and the CAPS LOCK light comes on, so after a reset the
latch reads &AF (live).

### The keyboard

The keys sit in 8 rows of 10 columns, and a key's **internal key
number** is row × 16 + column (jsbeeb, src/keymap.js, which gives column
and row; BeebWiki, "Negative INKEY numbers"; live for Z):

| Row | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| &00 | SHIFT | CTRL | | | | | | | | |
| &10 | Q | 3 | 4 | 5 | f4 | 8 | f7 | - | ^ | left |
| &20 | f0 | W | E | T | 7 | I | 9 | 0 | _ | down |
| &30 | 1 | 2 | D | R | 6 | U | O | P | [ | up |
| &40 | CAPS LOCK | A | X | F | Y | J | K | @ | : | RETURN |
| &50 | SHIFT LOCK | S | C | G | H | N | L | ; | ] | DELETE |
| &60 | TAB | Z | SPACE | V | B | M | , | . | / | COPY |
| &70 | ESCAPE | f1 | f2 | f3 | f5 | f6 | f8 | f9 | \ | right |

So Z is &61 and SPACE &62. One key goes by three numbers:

- the internal key number n, as above;
- n **EOR &80**, which is n + &80: **OSBYTE &79** with X = n EOR &80
  tests one key, and X returns with bit 7 set if it is down (live); &EC
  holds the same number for the key pressed last (live);
- n **EOR &FF**: **OSBYTE &81** with Y = &FF and X = n EOR &FF tests one
  key, and X and Y return &FF if it is down, 0 if not (BeebWiki, "OSBYTE
  &81"; live). As a signed byte it is −(n + 1), BASIC's negative INKEY
  number: Z is `INKEY(-98)`, X = &9E.

A direct scan, as games do it (live, with Z held and not held):

```
SEI
LDA #&7F : STA &FE43   \ port A: bits 0-6 out, bit 7 in
LDA #&03 : STA &FE40   \ latch bit 3 to 0: the keyboard stops scanning itself
LDA #&61 : STA &FE4F   \ the key's internal number, here Z
LDA &FE4F              \ bit 7 is 1 while that key is down
LDA #&0B : STA &FE40   \ latch bit 3 to 1: the keyboard scans itself again
CLI
```

While the keyboard scans itself, a key going down in rows 1-7 raises
CA2; SHIFT and CTRL, in row 0, never do (jsbeeb, src/via.js,
`updateKeys`; BeebWiki, "Keyboard"). On that interrupt the MOS notes the
key; its 100 Hz tick then enters it in the buffer and repeats it while it
is held (AUG section 13.9).

### Interrupts and timers, as the MOS uses them

AUG section 13.9, with the code that does it (ROM &DD06-&DE7F), and the
IFR bit of each:

| IFR bit | Source | What the MOS does with it |
|---|---|---|
| 0 | CA2, a key | calls KEYV to mark the key; the tick processes it |
| 1 | CA1, vsync | counts &0240 down for OSBYTE &13, times out the cassette and RS423, flashes the colours, raises event 4 |
| 2 | the shift register | passes it on: the MOS does not use it |
| 3 | CB2, light pen | passes it on |
| 4 | CB1, ADC | stores the value, starts the next channel, raises event 3 |
| 5 | T2 | speech |
| 6 | T1, the tick | TIME, the interval timer (event 5), the INKEY timer, sound, the held keys; then it checks the speech chip, the 6850 and the ADC in case an interrupt was missed |

The MOS takes them in the order CA1, T2, T1, CB1, CA2. A source the mask
&0279 (OSBYTE &E9) leaves out goes on to IRQ2V (Interrupts and events,
below).

## Joysticks and the ADC

The analogue port takes two joysticks; their four axes are the uPD7002
ADC's four channels, which the MOS numbers 1-4 (AUG section 26.1.1):

| Channel | Axis | Value |
|---|---|---|
| 1 | first joystick, left and right | high for left, low for right |
| 2 | first joystick, up and down | high for up, low for down |
| 3 | second joystick, left and right | high for left, low for right |
| 4 | second joystick, up and down | high for up, low for down |

jsbeeb agrees: its mouse-as-joystick gives 65535 for left and up, 0 for
right and down (src/mouse-joystick-source.js), and a gamepad's axes are
turned the same way (src/gamepad-source.js). A channel with nothing on it
converts to &8000, the centre (jsbeeb, src/adc.js). Not checked live: the
server this was checked on, on 13 October 2026, was started before it
had its `joystick` command (`kit/skills/bbc/tool-jsbeeb`).

- **Reading.** `ADVAL(n)` and OSBYTE &80 with X = n return a 16-bit value,
  X low, Y high. The MOS converts the channels in turn, from the highest
  (&024D) down to 1, on CB1 interrupts, and stores each result in
  &02B6 + n − 1 (low) and &02BA + n − 1 (high) (ROM &DE4A-&DE69).
- **Fire buttons** are PB4 and PB5 of the system VIA, 1 normally and 0
  while pressed (AUG section 23.1). OSBYTE &80 with X = 0 returns them in
  X, bit 0 for PB4 and bit 1 for PB5, 1 while pressed (ROM &E75F-&E768).
  The AUG calls them only the two fire buttons; in jsbeeb, PB4 is
  `button1`, the first joystick's or gamepad's fire, and PB5 `button2`
  (src/via.js).
- **The chip.** Writing &FEC0 starts a conversion: bits 0-1 the channel
  (0-3 for the MOS's 1-4), bit 3 set for 10 bits. An 8-bit conversion
  takes 4 ms, a 10-bit one 10 ms (AUG section 26.1; jsbeeb schedules
  8,000 and 20,000 cycles). &FEC0 reads: bits 0-1 the channel, bit 3 the
  mode, bits 4-5 the result's top two bits, bit 6 clear while busy, bit 7
  clear when done; &FEC1 is the result's high byte and &FEC2 its low
  byte, whose bits 0-3 are always 0 (AUG section 26.1). jsbeeb 2.4.0
  instead ORs bits 10 and 11 of its 16-bit value into bits 0-1, over the
  channel, leaves bits 4-5 clear, and passes all 8 bits of the low byte
  (src/adc.js, `onComplete`). The MOS reads only bits 6 and 7 (ROM &DE41),
  but a game that reads the channel or the top bits from &FEC0 sees other
  values in jsbeeb.

## The user VIA

&FE60-&FE7F. Port A drives the parallel printer, with CA1 the printer's
acknowledge; port B and CB1 and CB2 are the user port (AUG chapter 24).
MOS 1.20 uses only the CA1 interrupt, and passes the rest on; OSBYTE &E7
is its mask (AUG section 13.10). At reset the MOS writes &0E to the user
VIA's PCR and reads it back to tell whether a user VIA is fitted (ROM
&DA94-&DA9F; live, PCR &0E). At the BASIC prompt none of its interrupts
was enabled (live, IER &80), so its two timers are free for a game, which
takes their interrupts through IRQ1V or IRQ2V.

## Interrupts and events

### The path through the MOS

1. The 6502's IRQ vector (&FFFE) points to &DC1C. The MOS stores A in
   **&FC**, looks at the stacked flags, and sends a BRK to the BRK path
   (below). Anything else goes through **IRQ1V**, `JMP (&0204)`
   (ROM &DC1C-&DC24). Nothing else has been done: D has not been cleared.
2. IRQ1V's own target, &DC93, clears D, pushes A (from &FC), X, Y and a
   return address of &DE82, and polls the 6850 ACIA, then the system VIA,
   then the user VIA, each through its mask: &0278, &0279 and &0277 (ROM
   &DC93-&DD4F).
3. A source nobody claims is offered to the paged ROMs (service call 5),
   then the MOS puts X and Y back as they were at the interrupt, leaves A
   in &FC, and jumps through **IRQ2V**, `JMP (&0206)` (ROM &DCF3-&DD03).
   IRQ2V's own target is `LDA &FC : RTI` (&DE89).
4. A handled interrupt returns through &DE82: Y, X and A off the stack,
   then `LDA &FC : RTI`.

### What a hook must do

On entry to a routine on IRQ1V or IRQ2V, the flags and return address are
stacked for an RTI, X and Y are as they were, and A is in &FC (AUG
section 13.11; the ROM above).

- **Clear D** before any ADC or SBC: an interrupt leaves it as it was,
  and the MOS clears it only in its own IRQ1V routine (ROM &DC93).
- Handle the source and clear its flag (for a VIA, write the bit to its
  IFR), or the interrupt comes straight back.
- Leave by `LDA &FC : RTI`, or jump to the vector's old value so that the
  MOS still sees its own sources. If the system VIA's interrupts stop
  reaching the MOS, sound, speech, the clock, the interval timer, INKEY,
  the keyboard, the flashing colours and the ADC all stop (AUG section
  13.9).
- Change a vector with interrupts disabled: it is two bytes, and an
  interrupt between the two writes jumps to neither address.
- Keep interrupts disabled for no more than about 2 ms (AUG sections 13.4
  and 13.9), and call no MOS routine from the hook if it can be avoided:
  the interrupted program may be inside it (AUG section 13.11).
- Save X, Y and &FC on the stack, not in fixed places, if the routine can
  be entered again before it has finished (AUG section 13.11).

### BRK

BRK is how the MOS and languages report errors, not a crash. The BRK is
followed by an error number, the message, and a 0 (AUG section 10.2).
The MOS clears D, points &FD and &FE at the error number, saves &F4 in
&024A and the stack pointer in &F0, offers the error to the paged ROMs
(service call 6), selects the language's bank (&028C), puts X and A back,
**enables interrupts (CLI)**, and jumps through **BRKV**, &0202 (ROM
&DC27-&DC51). BASIC's BRKV prints the message and returns to the prompt.
For a listing, the bytes after a BRK are data, not code.

### Events

The MOS raises an event by calling OSEVEN (&FFBF) with the event number
in Y and a value in A. If that event is enabled (&02BF + its number
non-zero), OSEVEN disables interrupts and calls **EVNTV**, &0220, by JSR,
with the two swapped: A the event number, Y the value; X is passed on as
it was (ROM &E494-&E4A7, &F0A5). OSBYTE &0E (14) with X = the event
enables it; OSBYTE &0D (13) disables it (AUG section 12.1).

| Event | Cause |
|---|---|
| 0 | output buffer empty |
| 1 | input buffer full |
| 2 | character entering the input buffer |
| 3 | ADC conversion complete |
| 4 | vsync (the AUG calls it the start of vertical sync) |
| 5 | interval timer crossing zero |
| 6 | ESCAPE detected |
| 7 | RS423 error |
| 8 | Econet |
| 9 | user event |

An event routine preserves every register, does not enable interrupts,
keeps under about 2 ms, and **returns with RTS**, or jumps to the
vector's old value (AUG sections 12.2 and 12.3). EVNTV's own target is an
RTS (ROM &FFA6; live, &0220 holds &FFA6 at the BASIC prompt).

### NMIs

The 6502's NMI vector is &0D00, in RAM (ROM &FFFA). Reset puts an RTI
there (ROM &D9CD, live). The 8271 raises an NMI for each byte of a
transfer and at the end of a command (jsbeeb, src/intel-fdc.js), and the
DFS puts its routine at &0D00 to move the data, with &A0-&A7 as its zero
page (AUG section 11.1). A game that overwrites &0D00-&0D9E cannot use
the disc until the DFS has put its routine back.

## Timing

| What | Value | Checked |
|---|---|---|
| CPU | 2 MHz | jsbeeb, src/models.js |
| A slow access | every access to FRED, JIM, or SHEILA's &FE00-&FE1F, &FE40-&FE7F or &FEC0-&FEDF takes 1 or 2 extra cycles, to fall in step with the 1 MHz clock | jsbeeb, src/6502.js (`is1MHzAccess`, `polltimeAddr`) |
| A scan line | 64 µs, 128 cycles: R0 + 1 is 128 characters at 2 MHz or 64 at 1 MHz | ROM tables; live |
| A frame | 312.5 lines with the MOS's interlaced settings: **40,000 cycles**, 20 ms. With R8 bit 0 clear, 312 lines, 39,936 cycles | jsbeeb, src/video.js; `kit/bbc/jsbeeb.py` FRAME_CYCLES |
| Vsync | from character row R7: line 280 of the frame in every mode (35 rows of 8 lines, or 28 of 10; mode 7's R9 of 18, interlaced, gives 10 lines a row in each field); 2 lines long | ROM tables; jsbeeb, src/video.js |
| The vsync interrupt | in jsbeeb, CA1 follows the CRTC's vsync and the MOS takes its falling edge, so the interrupt and event 4 come as the 2-line pulse ends | jsbeeb, src/video.js (`setVBlankInt`) and src/via.js (`setca1`); ROM &DA85 |
| The tick | system VIA T1, free-running from latch &270E: a period of latch + 2 = 10,000 µs, 100 Hz | live; jsbeeb, src/via.js |
| VIA timers | count at 1 MHz | AUG section 22.2.3 |

The vsync's timing on a real machine, rather than in jsbeeb, was not
checked: trust jsbeeb's for the kit's work.

## Sound

The sound chip is a Texas Instruments 76489 (SN76489) with three tone
channels and a noise channel, clocked at 4 MHz (AUG section 23.3; jsbeeb,
src/soundchip.js).

- **The slow bus.** The CPU cannot reach the chip directly. It puts the
  byte on system VIA port A, then holds latch bit 0 at 0 for at least
  8 µs, interrupts disabled (AUG section 23.3). MOS 1.20 does it at
  &EB21-&EB3F: DDRA &FF, the byte to &FE4F, &00 to &FE40, a short wait,
  &08 to &FE40.
- **Tone**: f = 4,000,000 ÷ (32 × N), N from 1 to 1023 (AUG section
  23.3.1); jsbeeb plays N = 0 as 1024 (src/soundchip.js).
- **Writing a register.** A byte with bit 7 set names a register in bits
  4-6 and gives four bits of data. For a tone, a following byte with bit
  7 clear gives N's top six bits, so N = (second byte AND &3F) × 16 +
  (first byte AND &0F) (AUG section 23.4; jsbeeb, src/soundchip.js
  `poke`). Volume is attenuation: 0 loudest, 15 silent (AUG section
  23.3.1), 2 dB a step in jsbeeb (`volumeTable`).

The registers, named here by the `SOUND` channel the MOS plays on each
(live). The AUG numbers the tones the same way, so its tone 1 is &C0
(section 23.3.3). A document that calls &80 tone 1 numbers them the
other way: go by the first byte, not the number.

| First byte | Register |
|---|---|
| &80 + n, &90 + v | the tone of `SOUND 3`: frequency, low four bits; volume |
| &A0 + n, &B0 + v | the tone of `SOUND 2`: frequency; volume |
| &C0 + n, &D0 + v | the tone of `SOUND 1`: frequency; volume |
| &E0 + c, &F0 + v | the noise of `SOUND 0`: control; volume |

- **Noise control**: bits 0-1 the rate, 0 fastest, then 1, then 2
  slowest, and 3 to follow the &C0 tone's frequency, so `SOUND 1`'s pitch;
  bit 2 set for white noise, clear for periodic. Writing it restarts the
  noise (jsbeeb, src/soundchip.js `addFor`, `noisePoked`). **The AUG's
  table (section 23.3.2) puts 0 as low and 2 as high: jsbeeb has the
  reverse, and the machine wins.**
- **The MOS's pitch numbers** are its own: `SOUND` pitch 89 wrote N = 278
  (live), which is 449.6 Hz by the formula above.
- **SOUND's channel number** is four hex digits, &HSFN, the channel in the
  lowest. Measured on 14 October 2026 in jsbeeb with MOS 1.20 and BASIC II,
  from the bytes the chip was sent:
  - F, flush: `SOUND1,-15,100,100:SOUND&11,-15,200,100` played only the
    second note, at once and for its whole length; without the 1, both
    played, one after the other.
  - S, synchronise: a note with S = 1 waits for a note on one other channel
    that also has S = 1, and the two start together. `SOUND&0111,-15,100,20`
    on its own never played; `SOUND&0101,-15,60,20:SOUND&0102,-15,150,20`
    started both at the same moment.
  - The queue: six `SOUND` statements to one channel returned at once, and
    the seventh waited for the first note to end (notes of 20: `TIME` read
    1 to 8 centiseconds after each of the six, 100 after the seventh). BASIC
    waits only for the channel it is sounding, so a program that flushes
    one channel and not another runs ahead on the one it flushes.
- **An envelope is read while its note plays.** Redefining an envelope
  changes every note playing or queued with it. Five `ENVELOPE 1`
  statements, each followed by a `SOUND` that uses envelope 1, all ran in
  a few hundredths of a second: the first note's pitch steps changed as
  each definition landed, and each note after it played the definition in
  force while it played (measured on 14 October 2026 in jsbeeb with MOS 1.20 and BASIC II, from
  the bytes the chip was sent). A program's `ENVELOPE` before each
  `SOUND` gives each note its own envelope only if each note has ended
  before the next `ENVELOPE` runs.
- **OSWORD 7** is SOUND: an 8-byte block of four two-byte values, low
  byte first: channel, amplitude (−15 to 0, or an envelope 1-16), pitch,
  duration. `SOUND 1,-15,200,20` is `01 00 F1 FF C8 00 14 00`. **OSWORD
  8** is ENVELOPE, a 14-byte block of its 14 parameters (AUG sections 9.9
  and 9.10).

## The MOS: calls, VDU codes, OSBYTE and OSWORD

### Entry points

Each call from &FFCE up is a JMP through its vector in page 2, except
OSASCI, OSNEWL and OSWRCR, which are code that ends in OSWRCH. The calls
below &FFCE jump straight into the ROM (ROM &FFB9-&FFF7; the names are
those of `kit/bbc/mos.py`, whose table this checks; the vectors' own
targets after a reset are the table at &D940).

| Address | Name | What it does |
|---|---|---|
| &FFB9 | OSRDRM | read a byte of paged ROM: Y the bank, &F6 and &F7 the address |
| &FFBC | OSVDU | the VDU driver alone (&C4C0), ignoring *FX 3: a character goes to the screen, and to the printer only after a VDU 1 (AUG section 7.7, which gives it no name) |
| &FFBF | OSEVEN | raise event Y (Events, above) |
| &FFC2, &FFC5 | GSINIT, GSREAD | read a string the way * commands do |
| &FFC8 | NVRDCH | read a character, bypassing RDCHV: it jumps to &DEC5, RDCHV's target after a reset (live) |
| &FFCB | NVWRCH | write a character, bypassing WRCHV: it jumps to &E0A4, WRCHV's target after a reset (live) |
| &FFCE | OSFIND | open or close a file |
| &FFD1 | OSGBPB | read or write a group of bytes |
| &FFD4, &FFD7 | OSBPUT, OSBGET | write or read one byte of a file |
| &FFDA | OSARGS | read or write a file's arguments |
| &FFDD | OSFILE | load or save a whole file |
| &FFE0 | OSRDCH | read a character |
| &FFE3 | OSASCI | OSWRCH, but 13 is sent as 10 and 13 |
| &FFE7 | OSNEWL | 10 then 13 |
| &FFEC | OSWRCR | 13 |
| &FFEE | OSWRCH | write a character to the VDU driver and any other output |
| &FFF1 | OSWORD | A the call, X and Y the address of its block |
| &FFF4 | OSBYTE | A the call, X and Y its values |
| &FFF7 | OSCLI | X and Y the address of a command, ending in 13 |

### VDU codes

OSWRCH sends codes 32-126 to the screen as characters and acts on 0-31
and 127. The number of bytes each code takes after it is the MOS's own
table (ROM &C354, read at &C4F6: an entry with bit 7 clear has 16 minus
the count in its low four bits), and the meanings are the AUG's
(appendix D):

| Code | Bytes after | Does |
|---|---|---|
| 0 | 0 | nothing (an RTS, &C511) |
| 1 | 1 | sends the next byte to the printer only |
| 2, 3 | 0 | printer on, printer off |
| 4, 5 | 0 | text at the text cursor, text at the graphics cursor |
| 6 | 0 | VDU on |
| 7 | 0 | beep |
| 8, 9, 10, 11 | 0 | cursor left, right, down, up |
| 12 | 0 | clear the text window |
| 13 | 0 | carriage return |
| 14, 15 | 0 | paged mode on, off |
| 16 | 0 | clear the graphics window |
| 17 | 1 | text colour |
| 18 | 2 | graphics colour: plotting action, colour |
| 19 | 5 | palette: logical colour, physical colour, 0, 0, 0 |
| 20 | 0 | default colours and palette |
| 21 | 0 | VDU off |
| 22 | 1 | MODE |
| 23 | 9 | define a character (224-255 by default), or 23,0 for the CRTC, and other uses |
| 24 | 8 | graphics window |
| 25 | 5 | PLOT: action, then x and y, two bytes each |
| 26 | 0 | default windows |
| 27 | 0 | nothing (the same RTS) |
| 28 | 4 | text window: left, bottom, right, top |
| 29 | 4 | graphics origin: x, y, two bytes each |
| 30 | 0 | cursor to the window's top left |
| 31 | 2 | cursor to x, y |
| 127 | 0 | backspace and delete |

A game's text often reaches the screen as a string of these: a run of
bytes with 17, 22, 28 or 31 in it is likely VDU output, parameters and
all.

### OSBYTE

The calls a game is most likely to make, from the AUG (chapter 8 and
appendix A), with the ones checked further marked:

| A | Does |
|---|---|
| &00 | the OS version; with X non-zero, returns X = 1 on MOS 1.20 (live) |
| &02, &03 | select the input stream, the output streams |
| &04 | what the cursor keys do |
| &09, &0A | the flash periods |
| &0B, &0C | the keyboard's auto-repeat delay and rate |
| &0D, &0E | disable, enable event X |
| &0F | flush buffers: X = 0 every buffer, the sound queues with the rest, so a note that is playing stops (live: the chip was silenced at the call); X non-zero, the current input buffer only |
| &15 | flush buffer X |
| &10, &11 | the number of ADC channels to convert; start a conversion on channel X |
| &13 | wait for the next vsync |
| &76 | set the keyboard lights from the lock states |
| &78 | write &EC and &ED |
| &79 | with X = n EOR &80, test key n (live); with X below &80, scan the keyboard from key X up |
| &7A | scan the keyboard from key 16 up |
| &7C, &7D, &7E | clear, set, acknowledge an ESCAPE |
| &80 | X = 1-4: an ADC channel's value; X = 0: the fire buttons (ROM &E75F); X negative: a buffer's state |
| &81 | read a key with a time limit; with Y = &FF, test one key (Keyboard, above) |
| &82 | the high half of an I/O processor address: &FFFF (live) |
| &83, &84, &85 | OSHWM (live &1900); HIMEM; HIMEM for mode X |
| &86, &87 | the text cursor's position; the character at it and the mode |
| &8B, &8C, &8D | *OPT, *TAPE, *ROM |
| &8E, &8F | enter the language in bank X; issue a service call to the ROMs |
| &90 | *TV |
| &92-&97 | read FRED, write FRED, read JIM, write JIM, read SHEILA, write SHEILA, at offset X |
| &9A | write the video ULA's control register and &0248 (ROM &E9FF) |
| &9B | write the palette, EOR 7 applied, and &0249 (ROM &EA10) |
| &A0 | read a VDU variable |
| &A6-&FF | read and write MOS variable &0190 + A: new = (old AND Y) EOR X; the old value returns in X and the next byte in Y |
| &C8 | ESCAPE and BREAK effect (&0258) |
| &CA | the keyboard's status byte: the lock states |
| &DA | the number of bytes waiting in the VDU queue |
| &E9 | the system VIA's interrupt mask (&0279) |
| &F7, &F8, &F9 | the BREAK intercept's three bytes (&0287-&0289) |
| &FF | the start-up options |

### OSWORD

| A | Does |
|---|---|
| &00 | read a line of input |
| &01, &02 | read, write the TIME clock |
| &03, &04 | read, write the interval timer |
| &05, &06 | read, write a byte of I/O processor memory |
| &07, &08 | SOUND, ENVELOPE (Sound, above) |
| &09 | read a pixel's logical colour |
| &0A | read a character's definition |
| &0B, &0C | read, write the palette entry of a logical colour |
| &0D | read the last two graphics cursor positions |
| &7D, &7E | DFS: read the disc's cycle number, read its size |
| &7F | DFS: a command to the 8271, with drive, data address, parameters and result in the block |

&00-&0D are the AUG's (chapter 9). &7D-&7F are the DFS's (BeebWiki,
"OSWORD &7D", "OSWORD &7E", "OSWORD &7F"); the
DFS 1.20 in jsbeeb passes OSWORD &7F's command to the 8271 at &FE80
(live). On 13 October 2026, with no disc in jsbeeb's drive, a read drive
status command (&6C) did not return: the DFS waited on the 8271's busy
bit at &ACAE in its ROM until the machine was reset.

## Loading

### Disc: the DFS catalogue

A DFS disc side has 40 or 80 tracks of ten 256-byte sectors, numbered 0
to 9. A sector's logical number is track × 10 + sector. The catalogue is
sectors 0 and 1 of track 0, and the DFS keeps a copy at &0E00-&0FFF. Up
to 31 files; entry i, from 0, is at offset 8 + 8 × i in both sectors
(BeebWiki, "Acorn DFS disc format"; jsbeeb, src/disc.js, offsets &105 and
&106; DFS 1.20 ROM, reads of &0F05 and &0F06).

| Sector 0 | Holds |
|---|---|
| bytes 0-7 | the disc title's first eight characters |
| 8 + 8i to 14 + 8i | file i's name, seven characters padded with spaces |
| 15 + 8i | file i's directory character; bit 7 set means locked |

| Sector 1 | Holds |
|---|---|
| bytes 0-3 | the title's last four characters |
| 4 | the cycle number, in BCD: how many times the catalogue was written |
| 5 | eight times the number of files |
| 6 | bits 4-5 the boot option; bits 0-1 the top bits of the disc's size in sectors |
| 7 | the disc's size in sectors, low byte: 400 for 40 tracks, 800 for 80 |
| 8 + 8i, 9 + 8i | file i's load address, bits 0-15 |
| 10 + 8i, 11 + 8i | its execution address, bits 0-15 |
| 12 + 8i, 13 + 8i | its length, bits 0-15 |
| 14 + 8i | bits 6-7 the execution address's bits 16-17; bits 4-5 the length's; bits 2-3 the load address's; bits 0-1 the start sector's bits 8-9 |
| 15 + 8i | the start sector, low byte |

Files are listed by descending start sector, and none is split (BeebWiki,
same page).

**Where a file is in an image** (jsbeeb, src/disc.js, `loadSsd`): an
`.ssd` holds one side, sectors in logical order, so a file starting at
sector S begins at byte S × 256. A `.dsd` holds both sides, interleaved
by track: track t of side s is at (t × 2 + s) × 2,560, so on side 0 sector
S begins at (S div 10) × 5,120 + (S mod 10) × 256.

**Load and execution addresses** are 18 bits. With bits 16 and 17 both
set the address is in the BBC itself (the I/O processor); otherwise it is
for a second processor when one is fitted, and in practice the bits are
sometimes clear where they should be set (BeebWiki, "Acorn DFS disc
format"). With no second
processor, as on the kit's machine, both load into the BBC's own memory.

### Booting: !BOOT and *OPT 4

SHIFT and BREAK together boot the disc in drive 0: the DFS reads the boot
option from the catalogue and acts on a file called `!BOOT` (`autoboot`
in `kit/bbc/jsbeeb.py` holds SHIFT through a reset). DFS 1.20 does it at
&B478 in its ROM: it shifts catalogue byte &0F06 right four times, and
for 1 to 3 hands one of its own strings, at &B39F, &B3A9 and &B3A7, to
OSCLI (BeebWiki, "Acorn DFS disc format", gives the same three actions).

| Option | Set with | The DFS does |
|---|---|---|
| 0 | `*OPT 4,0` | nothing |
| 1 | `*OPT 4,1` | `L.!BOOT`: *LOAD it |
| 2 | `*OPT 4,2` | `!BOOT` as a command, which runs it: *RUN |
| 3 | `*OPT 4,3` | `E.!BOOT`: *EXEC it, reading its lines as if typed |

`*LOAD name` loads a file at its load address, or at one given after the
name. `*RUN name`, or `*name`, loads it and jumps to its execution
address. `CHAIN "name"` loads and runs a BASIC program, at PAGE.

### Tape

*TAPE selects the cassette filing system. A file is a run of blocks,
usually of 256 bytes, each with its own header; the format (AUG section
16.10):

| Part | Holds |
|---|---|
| leader | about 5 seconds of 2,400 Hz tone |
| &2A | the synchronising byte, `*` |
| name | 1 to 10 characters, then &00 |
| 4 bytes | load address, low byte first |
| 4 bytes | execution address, low byte first |
| 2 bytes | block number, low byte first |
| 2 bytes | block length, low byte first |
| 1 byte | block flag: bit 0 the file can only be *RUN, bit 6 an empty block, bit 7 the last block |
| 4 bytes | zero |
| 2 bytes | the header's CRC, high byte first, not counting the &2A |
| data | the block's bytes |
| 2 bytes | the data's CRC, high byte first |

The kit reads tapes as UEF files (`tape` in `kit/bbc/jsbeeb.py`): a file
that starts `UEF File!`, gzip-compressed or not, of chunks. Chunk &0100
holds bytes as the tape carries them at 1,200 baud: a 1,200 Hz start bit,
eight data bits low bit first, 2,400 Hz for a 1 and 1,200 Hz for a 0, and
a 2,400 Hz stop bit (jsbeeb, src/tapes.js). The bytes inside are the
blocks above.

### Protection, in general terms

What a loader may do that the steps above do not show:

- **Odd discs.** Sectors whose IDs claim another track, head, number or
  size, deleted-data marks, deliberate CRC errors, read through OSWORD
  &7F's 8271 commands, which include reading deleted data and report CRC
  errors in the result (BeebWiki, "Acorn DFS disc format" and "OSWORD
  &7F"). An `.ssd` or `.dsd` cannot hold any of this: such a disc needs a
  flux image, which jsbeeb reads as `.hfe` (`kit/skills/bbc/tool-jsbeeb`).
- **Odd tapes.** A loader that reads the 6850 itself, with blocks of its
  own format; files locked by bit 0 of the block flag.
- **Code.** Decryption loops keyed on the code itself; checksums; vectors
  taken over (BRKV, IRQ1V, EVNTV); BREAK made to clear memory (OSBYTE
  &C8) or caught (the intercept at &0287); the DFS's workspace and NMI
  routine overwritten once loading is over.

## A game written in BASIC

Many BBC games are BBC BASIC programs, whole or with some machine code
they `CALL`. `LOAD "name"` puts a program at PAGE and runs nothing;
`CHAIN "name"` loads it and runs it. The program is then the code to
read: a block from PAGE to TOP typed `BASIC` is listed line by line as
LIST prints it (`kit/bbc/basic.py` has the layout of a line and what
LIST does with it), and `python3 kit/bbc/basic.py list <snapshot>`
prints a snapshot's program with each line's address. A hand-over taken
after `LOAD` and before `RUN` holds the file as it was saved; a game
that changes its own program while it runs is rare, and comparing the
two shows it.

BASIC II keeps its pointers in zero page and its variables above the
program. Read on the kit's machine on 14 October 2026:

| Address | Holds |
|---|---|
| &00-&01 | LOMEM: where the variables start, TOP unless the program moved it |
| &02-&03 | VARTOP: the end of the variables |
| &06-&07 | HIMEM: the top of BASIC's memory, the start of the screen in the mode |
| &12-&13 | TOP: the byte after the program's end mark (&0D &FF) |
| &18 | PAGE's high byte: &19 on the kit's machine, the DFS's workspace being below it |
| &0400-&0403 | `@%`, the print format |
| &0404-&046B | `A%` to `Z%`, four bytes each, low byte first. `RUN` and `CLEAR` leave them, so they carry values from one program to the next |
| &0480-&04FF | the first variable of each initial, two bytes per character at &0480 + 2 × (its code − &40); `CLEAR` and `RUN` zero them |

Each variable is a link to the next with the same initial (0 at the
end), the rest of its name, &00, then its value: four bytes for an
integer (a name ending `%`), five for a real (an exponent biased by &80,
then the mantissa high byte first with its top bit replaced by the sign:
7 is `83 60 00 00 00`), four for a string (its address, the space it was
given, its length). All of this is working state, not the program: the
listing covers PAGE to TOP, and coverage counts nothing above it.

A program saved on a machine with a lower PAGE (one with no disc
interface) can test PAGE in its first line and move itself down before
it runs; its first lines, read before anything else, say whether it
does.

A BASIC game is driven from one wait for a key to the next. A program
waiting for a key is in the MOS's OSRDCH loop, so run to its idle address
(&E581 on the Model B's MOS 1.20, &E7E6 on the Master: jsbeeb's
`idleAddress`, src/models.js) to stop at each wait. BASIC's text pointer,
&0B-&0C, then points into the line being run: the last line that starts
at or before it is the one waiting, which for a wait inside a procedure
is the procedure's line, not its caller's. `basic.variable(m.read, name)`
(`kit/bbc/basic.py`) reads a variable there, an array too, which is how
a port of one of the program's routines is held to the game: compare the
routine's variables at each wait.

What a BASIC game leans on without saying so, measured on 14 October 2026
in jsbeeb with BASIC II: the limits, the errors and `LEFT$` by short
programs typed at the prompt, the two DEF rules in a game's own lines.

- **The nesting limits.** 20 REPEATs open at once (the 21st stops with
  `Too many REPEATs`, ERR 44), 26 GOSUBs (`Too many GOSUBs`, ERR 37) and
  10 FORs (`Too many FORs`, ERR 35). REPEATs and GOSUBs opened inside
  procedures count against the same limits, so a game whose rooms call
  one another and never return reaches one of them in the end. &24 holds
  the number of REPEATs open and &25 the number of GOSUBs, read as counts
  at a game's waits. A procedure calling itself has no limit but memory:
  1,946 deep in a three-line program before `No room`.
- **`No room`** is the one error `ON ERROR` does not catch: BASIC prints
  it and stops at the prompt (ERR 0).
- **`ON ERROR RUN`** starts the program again from its first line with no
  message, and `RUN` clears every variable but `@%` and `A%`-`Z%`. A game
  that restarts itself this way looks, to a player, as if it chose to.
- **A DEF met while running** is passed over as a REM is. A procedure
  whose path does not end in ENDPROC runs on to the next line, and when
  that line is another procedure's DEF, BASIC runs that procedure's body
  as its own.
- **The first DEF wins.** BASIC looks for a procedure from PAGE down the
  first time it is called, and its list of procedures found points to
  the first DEF of that name; a second one later in the program is never
  used.
- **`LEFT$` with a negative length** gives the whole string:
  `LEFT$("AB",-1)` is `AB`, `LEFT$("AB",0)` and `LEFT$("",-1)` are empty.
  A count that falls below zero then leaves a string whole.

## Master 128 and B+ notes

Not the kit's machine; for a game that checks for or needs one of them.

- **Master 128** (jsbeeb, src/6502.js, src/models.js; BeebWiki, "Paged
  ROM", "ANDY").
  - The CPU is a 65C12, which adds to the 6502: BRA (&80); PHX, PHY, PLX,
    PLY (&DA, &5A, &FA, &7A); STZ (&64, &74, &9C, &9E); TSB and TRB (&04,
    &0C, &14, &1C); INC A and DEC A (&1A, &3A); BIT immediate, zp,X and
    abs,X (&89, &34, &3C); JMP (abs,X) (&7C); and (zp) addressing for
    ORA, AND, EOR, ADC, STA, LDA, CMP, SBC (&12, &32, &52, &72, &92, &B2,
    &D2, &F2). It has none of the 65C02's bit instructions (jsbeeb,
    src/6502.opcodes.js). `kit/cpu/m6502.py` decodes none of these. On
    the Model B's 6502 the same bytes do something else: in jsbeeb's
    table most are undocumented NOPs, &9C and &9E are SHY and SHX, and the
    eight (zp) ones stop the processor.
  - ROMSEL at &FE30 can be read back. Its bit 7 pages ANDY, 4K of RAM, at
    &8000-&8FFF.
  - ACCCON at &FE34, bits from 7 down: IRR, TST, IJF, ITU, Y, X, E, D.
    D (bit 0): the display reads the 20K of shadow RAM (LYNNE). E (bit 1):
    code running at &C000-&DFFF, the MOS's VDU code, reaches shadow RAM at
    &3000-&7FFF, unless Y is set. X (bit 2): every access to &3000-&7FFF
    goes to shadow RAM. Y (bit 3): HAZEL, 8K of RAM, replaces the MOS at
    &C000-&DFFF. TST (bit 6): reads of &FC00-&FEFF give the MOS ROM.
    jsbeeb 2.4.0 does nothing with IJF, ITU and IRR (src/6502.js,
    `writeAcccon`).
  - Sideways RAM is banks 4-7. The ADC moves to &FE18, and a 1770 disc
    controller is at &FE24-&FE2B.
- **B+** (BeebWiki, "Model B plus", "ANDY", "Paged ROM"; not checked on a
  machine: jsbeeb 2.4.0 has no B+). A 1770 disc controller replaces the
  8271 at other addresses, so a game that drives the 8271 itself fails on
  it. 20K of shadow RAM holds the screen, and 12K more appears at
  &8000-&AFFF when ROMSEL's bit 7 is set. The B+ 128 adds 64K of sideways
  RAM. How the B+ switches the display to shadow RAM is left out: no
  source for it was checked.

## The mistakes that bite

- **Reading &FE30 for the bank.** It is write-only on the Model B. Read
  &F4, and write &F4 before &FE30.
- **Reading SHEILA through the kit's `read`.** The server returns &FF for
  the I/O pages, since a read through the bus would clear a VIA's flags:
  the chips' registers are `chips` (`kit/bbc/jsbeeb.py`).
- **Raster order.** The screen goes cell by cell: the byte after a cell's
  top line is the line below it, not the next 8 pixels along.
- **Pixels in neighbouring bits.** In modes 1, 2 and 5 a pixel's bits are
  spread across the byte: mode 1's leftmost pixel is bits 7 and 3, not 7
  and 6.
- **The palette's EOR 7.** &FE21 takes the physical colour inverted;
  OSBYTE &9B inverts it for you. And the byte in memory is a logical
  colour: what it looks like depends on the palette the game set.
- **The wrap.** An address past &7FFF shows the screen's start again, by
  the latch bits, not by the CRTC; and the AUG's table of those bits is
  wrong for 20K and 10K.
- **R12 and R13 are not an address.** In modes 0-6 they are the address
  ÷ 8; in mode 7, the high byte less &74, EOR &20, so &7C00 is &2800.
- **Three numberings of one key.** n, n EOR &80 (OSBYTE &79, &EC) and n
  EOR &FF (OSBYTE &81, a negative INKEY number) all name key n: a game's
  table of keys may hold any of them.
- **D on IRQ1V.** The MOS has not cleared the decimal flag when IRQ1V
  runs.
- **&FC.** Every IRQ writes A there. A game that uses &FC while the MOS's
  interrupts run loses it.
- **RTI from an event.** EVNTV is called by JSR: return with RTS.
- **BRK is data.** The bytes after a BRK are an error number and a
  message. The MOS enables interrupts before BRKV.
- **The joystick's direction.** High values are left and up.
- **The noise rate.** The AUG has it upside down: 0 is the fastest.
- **Sideways RAM that is not there.** jsbeeb's Model B has RAM in banks
  0-7; a stock Model B has none.
- **Timing loops that touch the chips.** Each access to a 1 MHz device
  costs 1 or 2 extra cycles, so a loop's cycle count depends on what it
  reads.
- **The DFS's memory.** &0E00-&18FF and &0D00-&0D9E are the DFS's while
  a game still loads from disc. Which of those bytes a later load needs
  was not checked: before deciding that a game cannot load again, look at
  what it overwrote.
- **Undocumented opcodes.** jsbeeb runs them, and its source notes BBC
  programs that use them: its NMOS table has 93 (src/6502.opcodes.js
  marks each with a `*`), and the twelve bytes &02, &12, &22, &32, &42,
  &52, &62, &72, &92, &B2, &D2 and &F2 stop the processor. For LXA (&AB)
  it uses the value a C64 gives, and its source says it does not know
  what a BBC does. `kit/cpu/m6502.py` decodes only one of them, &BF (LAX
  abs,Y), so the rest show as data in a listing. When the program counter
  reaches one, it is an instruction: step it in jsbeeb before calling it
  data.

## Sources

The machine comes first and the documents after it; where they disagree,
the entry above says so and follows the machine. Each was read on 13
October 2026.

- **jsbeeb 2.4.0**, the emulator the kit runs (GPL-3.0-or-later,
  `https://github.com/mattgodbolt/jsbeeb`): its source as the kit installs
  it, `tools/bbc/node_modules/jsbeeb/src`. Cited as "jsbeeb, src/<file>":
  6502.js, 6502.opcodes.js, adc.js, disc.js, gamepad-source.js,
  intel-fdc.js, keymap.js, models.js, mouse-joystick-source.js,
  soundchip.js, tapes.js, teletext.js, teletext_data.js, via.js and
  video.js. Read 13 October 2026.
- **MOS 1.20**, the 16K ROM jsbeeb 2.4.0 ships,
  `tools/bbc/node_modules/jsbeeb/public/roms/os.rom`, mapped at &C000 and
  disassembled with `kit/cpu/m6502.py`. Cited as "ROM &xxxx". Read 13
  October 2026.
- **DFS 1.20**, the 16K ROM jsbeeb 2.4.0 ships for the Model B,
  `tools/bbc/node_modules/jsbeeb/public/roms/b/DFS-1.2.rom` (title
  "DFS,NET", type &82), mapped at &8000 and disassembled the same way.
  Cited as "DFS 1.20 ROM" or "in its ROM". Read 13 October 2026.
- **The kit's machine**: jsbeeb 2.4.0 run by `kit/bbc/jsbeeb_server.mjs`
  on 127.0.0.1:6845, model "BBC B with 8271 (DFS 1.2)", driven with
  `kit/bbc/jsbeeb.py`; its *HELP named DFS 1.20 and OS 1.20. Cited as
  "live"; every live value was read on 13 October 2026.
- **The kit's own tables**: `kit/bbc/mos.py` (entry points and vectors)
  and `kit/bbc/registers.py` (register names), checked against the ROM
  and jsbeeb, which they matched. Read 13 October 2026.
- **The Advanced User Guide for the BBC Microcomputer** ("AUG"), Andrew
  C. Bray, Adrian C. Dickens and Mark A. Holmes, The Cambridge
  Microcomputer Centre, 1983, ISBN 0 946827 00 1; the edition remastered
  by dv8, fifth revision, January 2021, read as the Internet Archive's
  OCR text,
  `https://archive.org/download/bbc-micro-advanced-user-guide/BBC-Micro%20Advanced-User-Guide_djvu.txt`.
  Cited by chapter or section ("AUG section 13.11"). Read 13 October
  2026.
- **BeebWiki**, `https://beebwiki.mdfs.net/`, each page read as wiki text
  from `https://beebwiki.mdfs.net/index.php?title=<Page>&action=raw`:
  "Acorn DFS disc format", "ANDY", "CRTC", "Keyboard", "Model B plus",
  "Negative INKEY numbers", "OSBYTE &81", "OSWORD &7D", "OSWORD &7E",
  "OSWORD &7F", "Paged ROM" and "Video ULA". A wiki page has no version:
  each was read on 13 October 2026. Cited as BeebWiki, "<page>".
- **The sites in "Where to read about a game first"**, above: the
  Complete BBC Micro Games Archive's search and one game's page, and each
  other site in that section's table, fetched by a script on 13 October
  2026 to see what it returns. Nothing in the rest of this file rests on
  them.
