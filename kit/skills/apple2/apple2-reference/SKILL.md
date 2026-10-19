---
name: apple2-reference
description: Enhanced Apple IIe facts for reverse engineering, where to read about a game, the memory map, aux memory and the language card, the soft switches, the screen, the keyboard, paddles and buttons, the speaker and the Mockingboard, timing and the floating bus, interrupts and reset, the Disk II and its disk images, DOS 3.3 and ProDOS 8, the Monitor ROM, Applesoft, the 65C02, where Apple2TS differs from a real IIe, the other Apple II models, and the mistakes that bite. Consult this instead of recalling from training.
---

# Apple IIe reference for reverse engineering

Consult this file. If a fact you need is not here, say so in the game's
`kit-feedback.md` and derive it from the emulator, not from memory.

The profile is the machine the kit runs: a **128K enhanced Apple IIe**,
NTSC. Its CPU is a 65C02 without Rockwell's bit instructions. An
extended 80-column card with 64K of auxiliary memory sits in the
auxiliary slot, a Mockingboard in slot 4, and a Disk II controller with
two drives in slot 6. There is no hard disk and no clock card. The
emulator is Apple2TS 3.7.0 (MIT) inside the kit's server,
`kit/apple2/apple2ts_server.mjs`, driven with `kit/apple2/apple2ts.py`
(`kit/skills/apple2/tool-apple2ts`). The Apple II, the II Plus, the
unenhanced IIe, the IIc and the IIgs appear only in notes marked as
theirs.

Addresses are written with `$`, as Apple's manuals write them.

Each fact says how it was checked:

- **"live"**: run on Apple2TS 3.7.0's IIe on 19 October 2026, with the
  kit's slots and settings (Sources says which server).
- **"ROM $FA62"**: the enhanced IIe's ROM that Apple2TS 3.7.0 ships,
  disassembled as 65C02 code. **"Boot ROM $C65C"**: the Disk II's
  16-sector boot ROM, the same way. Both are byte for byte the ROMs MAME
  0.289 lists for those parts (Sources).
- **"Apple2TS, src/worker/memory.ts:812"**: a line of Apple2TS's source
  at tag v3.7.0.
- **"MAME 0.289, src/mame/apple/apple2e.cpp:2092"**: a line of MAME's
  source, the second emulator consulted. Its IIe driver records, in its
  comments, what tests on real machines found.
- **A document** under Sources, by page or table: "TRM 1987, p. 83",
  "Sather p. 5-24", "BAD p. 3-8".

A real IIe is what a game was written for. Where the documents and MAME
agree and Apple2TS does something else, the entry says what each does,
and "Where Apple2TS differs from a real IIe" lists every such case. A
fact checked only live, or only in Apple2TS's source, was not checked on
a real IIe.

## Where to read about a game first

Before any code, and before the emulator, when the contributor has said
yes to looking the game up online (`kit/START.md`). Two collections on
the Internet Archive describe an Apple II game's disk without anything
being downloaded, and both answered a script's fetch on 19 October 2026:

- **A Woz A Day** (`collection:wozaday`, 2,834 items that day): copies of
  original disks as WOZ images, which keep the copy protection. An item's
  description gives the year, the authors, the publisher, the version,
  and the machine and memory the game needs. None of the 13 descriptions
  read said anything about the protection.
- **The 4am collection** (`collection:apple_ii_library_4am`, 3,372
  items): cracked copies. Each item has a notes file, `<title>.txt`, with
  the Name, Genre, Year, Credits, Publisher, Platform (the machine and
  memory), Media, Sides, OS and Previous cracks. A write-up of the
  protection follows, or the transcript of the cracking tool Passport,
  which names the protection it found and every byte it changed, by
  track, sector and offset (`T00,S08,$25: E1 -> 00`). That file is worth
  reading before the code: the bytes it lists are the protection's.

Find an item with the search API,
`https://archive.org/advancedsearch.php?q=collection:wozaday+AND+title:(<title>)&fl[]=identifier&fl[]=title&fl[]=description&rows=50&output=json`
(or `collection:apple_ii_library_4am`), and read its description with
`https://archive.org/metadata/<id>/metadata`. `https://archive.org/metadata/<id>`
lists the item's files with their names and formats, so the notes file
can be fetched by name. Manuals and magazine reviews are items of
`mediatype:texts` (the collections `gamemanuals` and `manuals_apple` hold
many); a scan's OCR text is the item's file whose name ends `_djvu.txt`.
A manual, when one exists, outranks any catalogue.

The Asimov archive's documentation, mirrored at
`https://mirrors.apple2.org.za/ftp.apple.asimov.net/documentation/`, has
`games/` (35 entries on 19 October 2026: a folder for each of a few
games, and `misc/`), `magazines/`, `source_code/`, `hardware/`, `os/` and
`programming/`. `https://mirrors.apple2.org.za/Apple%20II%20Documentation%20Project/`
holds documents about the machine and its cards, not games.

What else a script's fetch got on 19 October 2026:

| Site | Answer |
|---|---|
| `ftp.apple.asimov.net`, the archive itself | the connection was reset: use the mirror |
| MobyGames | a browser check (403) |
| Wikipedia's API | answered once, and refused once with 429 (too many requests) |
| the Wayback Machine, `https://web.archive.org/` | the connection was reset |
| `https://apple2online.com/` | answered, with a WordPress front page |
| `https://www.apple2history.org/`, `https://www.callapple.org/`, comp.sys.apple2's archive at `https://comp.sys.apple2.narkive.com/` | answered |

These are fan catalogues: what they say is documented, not true. Record
each one you use under Sources in `features.md` with its address and the
date you read it, the game's page as `links.wiki` in `game.json` and a
manual as `links.manual`. Read the documents only. The same searches list
disk images (`.woz`, `.dsk`, `.do`, `.po`, `.nib`, zips, and each 4am
item's `00playable.dsk`), and the mirror has an `images/` folder and a
`Collection_4am/` folder: none of them is ever downloaded.

## Memory map

Main memory is RAM from $0000 to $BFFF. $C000-$CFFF is the I/O page and
the cards' ROM, with no RAM beneath it. $D000-$FFFF is ROM, with the
language card's 16K of RAM beneath it (Aux memory and the language card,
below). Aux memory, the 80-column card's 64K, has the same layout.

| Range | Holds | Free to a game that has taken over |
|---|---|---|
| $0000-$00FF | zero page: the Monitor, Applesoft and DOS each use parts of it (table below) | yes, once none of them is called |
| $0100-$01FF | the stack | no |
| $0200-$02FF | the input buffer GETLN fills (TRM 1987 Appendix J: BUF) | yes, when no line is read |
| $0300-$03CF | free. The Disk II's boot ROM builds its tables at $0300-$03D5 while it reads sector 0 (Boot ROM $C600) | yes |
| $03D0-$03EF | DOS 3.3's vectors, written when DOS boots (DOS 3.3 and ProDOS 8, below) | yes, with no DOS |
| $03F0-$03FF | the Monitor's vectors: BRK, reset, the power-up byte, &, Control-Y, NMI, IRQ (The Monitor ROM) | only those the game replaces: reset and interrupts go through them |
| $0400-$07FF | text and lo-res page 1, with the screen holes (The screen) | it is the screen |
| $0800-$0BFF | text and lo-res page 2. A disk's boot sector loads at $0800, and an Applesoft program starts at $0801 | yes |
| $0C00-$1FFF | free | yes |
| $2000-$3FFF | hi-res page 1 | it is the screen |
| $4000-$5FFF | hi-res page 2 | yes, when it is not shown |
| $6000-$95FF | free | yes |
| $9600-$BFFF | DOS 3.3, or ProDOS's BASIC.SYSTEM and global page | yes, once the game no longer calls them |
| $C000-$C0FF | the soft switches and the slots' I/O (The soft switches) | no |
| $C100-$C7FF | slot n's 256 bytes of ROM at $Cn00, or the IIe's internal ROM | no |
| $C800-$CFFF | one card's expansion ROM, or the internal ROM | no |
| $D000-$F7FF | Applesoft BASIC's ROM, or the language card's RAM | the RAM, yes |
| $F800-$FFFF | the Monitor's ROM and the CPU's vectors, or the language card's RAM | the RAM, yes |

The kit's coverage leaves out $0100-$01FF, $C000-$CFFF and $D000-$FFFF
by default (`kit/scripts/symbols_export.py`). A game that loads code or
data into the language card takes $D000-$FFFF back with
`coverage.include` in `game.json`: `kit/apple2/snapshot.py` reads that
range as main memory's language-card RAM, with the $D000 bank the
switches chose when the snapshot was saved, never as the ROM.

A game that keeps code or data in aux memory, or in the language card's
other $D000 bank, makes each of those a part of its own
(`kit/skills/core/10-orient`, "A game of several parts";
`kit/scripts/parts.py`). The part's `part.json` has `"bank"` set to one
of `"aux"`, `"mainlc1"`, `"mainlc2"`, `"auxlc1"` or `"auxlc2"`, which
`kit/apple2/snapshot.py` reads: aux memory's 64K, or one 4K bank of main
or aux memory's language card at $D000-$DFFF with the 8K above it. The
bank part lies `"over"` the part the code runs in, its `"ranges"` are
where the bank shows, and the main part's `"banks"` rows,
[first, last, bank's id, why], say which of its instructions see the
bank.

Zero page, as the enhanced IIe's Monitor uses it (TRM 1987 Appendix J,
the ROM listing's equates; names as in `kit/apple2/monitor.py` where it
has them):

| Address | Name | Holds | Checked |
|---|---|---|---|
| $20-$23 | WNDLFT, WNDWDTH, WNDTOP, WNDBTM | the text window: left column, width, top row, bottom row + 1 | listing; SETWND ($FB4B) writes $20, $22 and $23 (ROM) |
| $24, $25 | CH, CV | the cursor's column and row | listing; `monitor.py --check` |
| $26-$27 | GBASL, GBASH | a lo-res row's base address; Applesoft's hi-res routines keep a hi-res row's there | listing; live, with GBASCALC and HPOSN |
| $28-$29 | BASL, BASH | the cursor row's base address | listing; live, with BASCALC |
| $2A-$2B | BAS2L, BAS2H | a second row pointer, for scrolling | listing |
| $2C, $2D | H2, V2 | the far end of a lo-res line | `monitor.py --check` |
| $30 | COLOR | the lo-res colour, in both halves of the byte | `monitor.py --check` |
| $32 | INVFLG | $FF for normal text, $3F for inverse (SETNORM, SETINV) | listing; TRM 1987 Appendix B |
| $33 | PROMPT | the character GETLN prompts with | listing |
| $36-$37 | CSWL, CSWH | the output hook: COUT jumps through it | listing; TRM 1987 Table H-9 |
| $38-$39 | KSWL, KSWH | the input hook: RDKEY jumps through it | listing |
| $3A-$3B | PCL, PCH | after a BRK, its address plus 2 | TRM 1987 Table 6-9; ROM $FA47 |
| $3C-$3F, $42-$43 | A1, A2, A4 | the Monitor's address pairs, which MOVE takes | listing; `monitor.py --check` |
| $44 | MACSTAT | the memory switches at a BRK (Interrupts and reset) | listing; TRM 1987 Table 6-10 |
| $45-$49 | | A, X, Y, P and S, saved by SAVE ($FF4A) and by a BRK | ROM $FF4A-$FF57 |
| $4E-$4F | RNDL, RNDH | counted up while KEYIN waits for a key | listing (its WAITKEY loop); TRM 1987 Table H-9 |

$00-$1F is free to a program as far as the Monitor goes; Applesoft uses
parts of it (Applesoft and Integer BASIC, below).

## Aux memory and the language card

The 80-column card's 64K sits at the same addresses as main memory, and
switches choose which of the two the CPU reaches (TRM 1987 pp. 88-90;
Sather chapter 5; live). Each switch is turned off by a write to its
even address and on by a write to the odd one; bit 7 of the status
address reads it.

- **RAMRD** ($C002 off, $C003 on; status $C013) sends reads of
  $0200-$BFFF to aux memory, and **RAMWRT** ($C004, $C005; $C014) sends
  writes there. They are separate: a program can read main memory and
  write aux.
- **ALTZP** ($C008, $C009; $C016) switches zero page, the stack and the
  language card's RAM together. The stack pointer stays where it was and
  the bytes beneath it change, so a program that sets ALTZP inside a
  subroutine returns through aux memory's stack (live: a write to $0080
  and to $D000 with ALTZP on landed in aux memory's).
- **80STORE** ($C000, $C001; $C018) overrides RAMRD and RAMWRT for the
  display memory: with it on, PAGE2 ($C054, $C055) picks main or aux
  memory for $0400-$07FF and, when HIRES is on too, for $2000-$3FFF,
  instead of picking the page shown (TRM 1987 pp. 88-90). Live, with
  80STORE and PAGE2 on: a write to $0400 landed in aux memory, a write to
  $2000 with HIRES off in main memory, and one with HIRES on in aux.

The **language card** is 16K of RAM beneath the ROM: 8K at $E000-$FFFF
and two 4K banks at $D000-$DFFF. Its switches are reads and writes of
$C080-$C08F (Sather pp. 5-23 to 5-25; a2audit, audit/langcard.asm):

- Address bit 3 picks the $D000 bank: $C080-$C087 bank 2, $C088-$C08F
  bank 1. $C084-$C087 repeat $C080-$C083, and $C08C-$C08F repeat
  $C088-$C08B.
- An access to $C080, $C083, $C084, $C087 or their bank-1 twins makes
  $D000-$FFFF read the RAM; one to the others makes it read the ROM.
- Writing to the RAM takes two reads of an odd address in a row. The
  first read sets PRE-WRITE; a second, with PRE-WRITE set, enables
  writing. An even read, or any write to $C080-$C08F, clears PRE-WRITE.
  Any access to an even address disables writing. A write to an odd
  address leaves writing as it was.
- The two reads need not be of the same address: $C081 then $C089 reads
  the ROM and writes bank 1, and $C08F then $C087 reads and writes bank 2
  (a2audit). `LDA $C08B`, `STA $C08B`, `LDA $C08B` leaves writing off,
  since the store cleared PRE-WRITE.
- Status: bit 7 of $C011 is set while bank 2 is in, and bit 7 of $C012
  while the RAM is read (live: after `LDA $C080` both read $C1, with an
  `A` in the keyboard latch; after `LDA $C08A`, $41 and $41).

The names the listing gives them (`kit/apple2/registers.py`):

| Address | Name | $D000-$FFFF reads | Writes go to | $D000 bank |
|---|---|---|---|---|
| $C080 | lc_read_ram2 | RAM | nowhere | 2 |
| $C081 | lc_write_ram2 | ROM | RAM, after two odd reads | 2 |
| $C082 | lc_read_rom2 | ROM | nowhere | 2 |
| $C083 | lc_ram2 | RAM | RAM, after two odd reads | 2 |
| $C088-$C08B | lc_read_ram1, lc_write_ram1, lc_read_rom1, lc_ram1 | as above | as above | 1 |

At a reset the MMU reads the ROM, enables writing to the RAM, picks bank
2 and turns every memory switch above off (Sather pp. 5-24 and 5-25;
TRM 1987 p. 83; MAME 0.289, src/mame/apple/apple2e.cpp:1237-1242). The
ROM's reset code does not touch $C080-$C08F (ROM, every access to the
range read). Apple2TS leaves writing disabled after a reset instead
(Apple2TS, src/worker/motherboard.ts:467; live). So a program cannot
keep its reset handler in the language card: the reset switches the ROM
back in, and the CPU reads its reset vector from the ROM (TRM 1987,
p. 83).

The 65C02 reads its interrupt vectors from whatever is switched in at
$FFFA-$FFFF. A game that runs with the language card's RAM read takes
IRQ, BRK and NMI through the vectors in that RAM (in aux memory's, with
ALTZP on), not through the ROM's handler (Interrupts and reset).

$C100-$CFFF is the cards' ROM space, and three switches give parts of it
to the IIe's internal ROM (Sather p. 5-28; Apple2TS,
src/worker/memory.ts:258-300; live):

- **INTCXROM** ($C006 off, $C007 on; $C015): on, the internal ROM fills
  $C100-$CFFF (live: $C600 read $8D, the internal ROM's byte, instead of
  the Disk II ROM's $A2).
- **SLOTC3ROM** ($C00A off, $C00B on; $C017): off, as after a reset,
  $C300-$C3FF is the internal ROM, the 80-column firmware and the
  enhanced IIe's interrupt code; on, it is slot 3's.
- **INTC8ROM**, a switch with no address of its own: an access to
  $C300-$C3FF with SLOTC3ROM off gives $C800-$CFFF to the internal ROM,
  until an access to $CFFF gives it back. A card's own expansion ROM
  takes $C800-$CFFF when its $Cn00 page is accessed, until the same
  access to $CFFF (live: $C800 read the internal ROM's $4C after a read
  of $C300).

## The soft switches

The IIe's I/O page, $C000-$C0FF, is switches: an access to an address
flips a switch, reads a status bit or a key, or clicks the speaker. The
names are those `kit/apple2/registers.py` gives the listing, which are
Apple's in lower case (TRM 1987 Table 2-9 and its Appendix J listing),
with the exceptions noted. A store's operand takes the write name, any
other instruction's the read name (`kit/apple2/cpu.py`).

$C000-$C00F work on a write only; a read there returns the keyboard,
whichever address it is (a2audit, audit/softswitch.asm; MAME 0.289,
src/mame/apple/apple2e.cpp:2049; live: `LDA $C00F` and `LDA $C007` both
read the key). The listing gives a load from one of them the switch's
name, since code that reads $C00F means the switch.

| Address | Read name | Write name | Written, it |
|---|---|---|---|
| $C000 | kbd | clr80store | turns 80STORE off (Apple's CLR80COL) |
| $C001 | (kbd) | set80store | turns 80STORE on (Apple's SET80COL) |
| $C002 | (kbd) | rdmainram | reads $0200-$BFFF from main memory |
| $C003 | (kbd) | rdcardram | reads $0200-$BFFF from aux memory |
| $C004 | (kbd) | wrmainram | writes $0200-$BFFF to main memory |
| $C005 | (kbd) | wrcardram | writes $0200-$BFFF to aux memory |
| $C006 | (kbd) | setslotcxrom | gives $C100-$CFFF to the slots |
| $C007 | (kbd) | setintcxrom | gives $C100-$CFFF to the internal ROM |
| $C008 | (kbd) | setstdzp | zero page, stack and language card from main memory |
| $C009 | (kbd) | setaltzp | the same from aux memory |
| $C00A | (kbd) | setintc3rom | gives $C300-$C3FF to the internal ROM |
| $C00B | (kbd) | setslotc3rom | gives $C300-$C3FF to slot 3 |
| $C00C | (kbd) | clr80vid | 40 columns |
| $C00D | (kbd) | set80vid | 80 columns, and double hi-res with annunciator 3 off |
| $C00E | (kbd) | clraltchar | the primary character set |
| $C00F | (kbd) | setaltchar | the alternate set: MouseText and inverse lower case |

$C010-$C01F are read: bit 7 is the status, and bits 0-6 are the
keyboard's last key (MAME 0.289, src/mame/apple/apple2e.cpp:2056-2111;
live: with `A` in the latch, each read $C1 for on and $41 for off). Any
access to $C010, and a write to any of $C010-$C01F, clears the keyboard
strobe (Sather chapter 7; MAME 0.289, apple2e.cpp:2404-2414; Apple2TS,
src/worker/softswitches.ts:290).

| Address | Name | Bit 7 set when |
|---|---|---|
| $C010 | kbdstrb | a key is down (any key); the access clears the strobe |
| $C011 | rdlcbnk2 | the language card's bank 2 is at $D000 |
| $C012 | rdlcram | $D000-$FFFF reads the language card's RAM |
| $C013 | rdramrd | RAMRD is on |
| $C014 | rdramwrt | RAMWRT is on |
| $C015 | rdcxrom | INTCXROM is on |
| $C016 | rdaltzp | ALTZP is on |
| $C017 | rdc3rom | SLOTC3ROM is on: slot 3's ROM |
| $C018 | rd80store | 80STORE is on (the listing's equate is RD80COL) |
| $C019 | rdvblbar | the beam is NOT in the vertical blank: bit 7 is clear during it (Timing) |
| $C01A | rdtext | text mode |
| $C01B | rdmixed | mixed mode |
| $C01C | rdpage2 | PAGE2 |
| $C01D | rdhires | HIRES |
| $C01E | rdaltchar | the alternate character set (the listing's equate is ALTCHARSET) |
| $C01F | rd80vid | 80 columns |

$C020-$C04F answer anywhere in their 16 addresses: Sather gives them as
$C02X, $C03X and $C04X (pp. 2-18 and 2-19). MAME 0.289 decodes all
sixteen for the cassette and the speaker (apple2e.cpp:1876 and 1884)
but only $C040 itself for the strobe (apple2e.cpp:1916). A read of them
returns the floating bus (Timing). TRM 1987 says to use a read: an
indexed store addresses a switch twice on successive cycles, so a
toggle ends where it began (p. 38).

| Addresses | Name | Does |
|---|---|---|
| $C020-$C02F | tapeout | toggles the cassette output |
| $C030-$C03F | spkr | toggles the speaker (Sound). Apple2TS acts on $C030 alone |
| $C040-$C04F | strobe | pulses the game port's strobe output |

$C050-$C05F work on a read or a write (a2audit, audit/softswitch.asm):

| Address | Name | Does |
|---|---|---|
| $C050 | txtclr | graphics |
| $C051 | txtset | text |
| $C052 | mixclr | full-screen graphics |
| $C053 | mixset | mixed: four lines of text below the graphics |
| $C054 | txtpage1 | page 1; with 80STORE on, main memory |
| $C055 | txtpage2 | page 2; with 80STORE on, aux memory |
| $C056 | lores | lo-res graphics |
| $C057 | hires | hi-res graphics |
| $C058 | clran0 | annunciator 0 off (the ROM listing's equate: SETAN0) |
| $C059 | setan0 | annunciator 0 on (CLRAN0) |
| $C05A | clran1 | annunciator 1 off (SETAN1) |
| $C05B | setan1 | annunciator 1 on (CLRAN1) |
| $C05C | clran2 | annunciator 2 off (SETAN2) |
| $C05D | setan2 | annunciator 2 on (CLRAN2) |
| $C05E | clran3 | annunciator 3 off: double hi-res, with 80COL and HIRES on (SETAN3) |
| $C05F | setan3 | annunciator 3 on: double hi-res off (CLRAN3) |

The annunciators' names disagree between Apple's documents. TRM 1987
Table 2-10 says the first address of each pair turns the annunciator
off; the ROM listing in TRM 1985 and TRM 1987 Appendix J names the
first SETANn and the second CLRANn (SourceGen's Cxxx-IO.sym65 follows
the listing). `registers.py` names them by what they do, as the table
says. Nothing reads an annunciator back.

$C060-$C06F are read, bit 7 only; $C068-$C06F repeat $C060-$C067 (MAME
0.289, apple2e.cpp:2131-2180):

| Address | Name | Bit 7 |
|---|---|---|
| $C060 | tapein | the cassette input |
| $C061 | butn0 | button 0, and the Open Apple key: set while pressed |
| $C062 | butn1 | button 1, and the Solid Apple key |
| $C063 | butn2 | button 2, or the Shift key on a IIe with the shift-key modification |
| $C064-$C067 | paddl0-paddl3 | set while that paddle's timer runs |

$C070-$C07F: an access to any of them starts the four paddle timers
(TRM 1987 Table 2-9, its footnote; MAME 0.289, apple2e.cpp:2019).
`registers.py` names $C070 `ptrig`, and $C07E and $C07F `rdioudis` and
`rddhires` read, `ioudison` and `ioudisoff` written. TRM 1987 lists
those four for the IIe; MAME's driver says they exist only on the IIc
and that on the IIe the addresses are paddle triggers like the rest
(MAME 0.289, apple2e.cpp:1851 and 2182-2183). Live, $C07E and $C07F
read random values ($8A; $6C and $31).

$C080-$C08F is the language card (Aux memory and the language card).
$C090-$C0FF is the slots' I/O: slot n's 16 addresses are $C080 + n ×
16, and code reaches them as `$C080,X` with X = n × 16. The listing
names $C080-$C08F indexed by X with the Disk II's names
(`registers.SLOT`); slot 6's disk is $C0E0-$C0EF (The Disk II). The
Mockingboard has no I/O addresses: it answers in slot 4's ROM space,
$C400-$C4FF (Sound). $CFFF (`clrrom`) takes $C800-$CFFF away from
whichever card held it.

An instruction can make more than one access. On the 65C02, `STA $C055`
is one write, but `INC $C083` is two reads and a write (MAME 0.289,
src/devices/cpu/m6502/ow65c02.lst:363-373). That matters for the
language card's two reads and for the speaker (Where Apple2TS differs).

## The screen

Text and lo-res share the text pages; hi-res has pages of its own. Each
mode's rows are interleaved in memory, the same way in every mode (TRM
1987 chapter 2; the row formulas checked live against the ROM's own
routines):

| Mode | Page 1 | Page 2 | Row r, or line y, starts at |
|---|---|---|---|
| text, 24 rows of 40 | $0400-$07FF | $0800-$0BFF | $0400 + $80 × (r mod 8) + $28 × (r div 8): BASCALC ($FBC1), live for all 24 |
| lo-res, 40 × 48 blocks | the same | the same | text row r: its low nibbles are block row 2r, its high nibbles 2r + 1 (TRM 1987, "Low-resolution graphics"); GBASCALC ($F847) gives the text rows' bases, live |
| hi-res, 280 × 192 | $2000-$3FFF | $4000-$5FFF | $2000 + $400 × (y mod 8) + $80 × ((y div 8) mod 8) + $28 × (y div 64): HPOSN ($F411), live for all 192 |
| 80-column text | $0400-$07FF of main and aux memory | as page 1, at $0800 | as text: aux memory holds the even columns, main the odd (TRM 1987, "Video display pages") |
| double hi-res, 560 × 192 | $2000-$3FFF of main and aux memory | at $4000 | as hi-res: aux memory's byte comes first on the line |

The text rows begin at $0400, $0480, $0500, $0580, $0600, $0680, $0700,
$0780, $0428, $04A8, $0528, $05A8, $0628, $06A8, $0728, $07A8, $0450,
$04D0, $0550, $05D0, $0650, $06D0, $0750 and $07D0 (live). Each 128
bytes hold three rows of 40 and eight bytes that no row shows: the
**screen holes**, $0478-$047F, $04F8-$04FF, and so on to $07F8-$07FF.
They belong to the cards: slot n's are $0478 + n, $04F8 + n, ... $07F8 +
n (TRM 1987 Table 6-3, p. 136). The 80-column firmware keeps its state
in slot 3's ($047B, $04FB, $057B, $05FB, $067B, $06FB, $077B, $07FB),
and $07F8 holds $Cn for the card using $C800 (TRM 1987 Appendix J:
MSLOT; live: $C6 after the power-up boot). A game that clears the whole
page clears them too. Hi-res pages have the same gaps, which nothing
owns.

The text screen's codes (TRM 1987 Table 2-4):

| Codes | Primary set | Alternate set (ALTCHAR on) |
|---|---|---|
| $00-$1F | upper case, inverse | the same |
| $20-$3F | punctuation and digits, inverse | the same |
| $40-$5F | upper case, flashing | MouseText on the enhanced IIe; inverse upper case on the original IIe |
| $60-$7F | punctuation and digits, flashing | lower case, inverse |
| $80-$9F | upper case, normal | the same |
| $A0-$BF | punctuation and digits, normal | the same |
| $C0-$DF | upper case, normal | the same |
| $E0-$FF | lower case, normal | the same |

A space on the screen is $A0. Live, after a reset into Applesoft, row
23 held $DD (`]`), $FF (the cursor) and $A0s.

A hi-res byte is seven dots and a colour bit. Bit 0 is the leftmost dot,
bit 6 the rightmost; bit 7 is not a dot. In colour, a dot in an even
column is violet when bit 7 is clear and blue when it is set, and a dot
in an odd column green or orange; two lit dots side by side are white
(TRM 1987, "High-resolution graphics"). Forty bytes make a line of 280
dots.

The lo-res colours, a nibble each (TRM 1987 Table 2-5): 0 black, 1
magenta, 2 dark blue, 3 purple, 4 dark green, 5 grey, 6 medium blue, 7
light blue, 8 brown, 9 orange, 10 grey, 11 pink, 12 light green, 13
yellow, 14 aquamarine, 15 white.

Which mode shows is the switches together: TEXT on shows text (80
columns with 80COL on); TEXT off shows lo-res, or hi-res with HIRES on,
and double hi-res when 80COL is on and annunciator 3 is off ($C05E).
MIXED shows text rows 20-23 below the graphics. PAGE2 picks page 2,
except with 80STORE on. Double lo-res was not checked.

The kit draws its screenshots itself, from both 64Ks and the switches
(`kit/apple2/screen.py`), with page 2 shown only when 80STORE is off, as
on a IIe. It draws the state at one moment, not the beam's progress
down the screen.

## Keyboard, paddles and buttons

- **$C000** (`kbd`): bit 7 is set when a key has been pressed since the
  strobe was last cleared; bits 0-6 are its ASCII code, which stays after
  the strobe is cleared (TRM 1987 chapter 2, "The keyboard"; live).
- **$C010** (`kbdstrb`): any read or write clears the strobe. A read's
  bit 7 is set while any key is held down. Reading that flag clears the
  strobe too, so read $C000 first (TRM 1987 chapter 2; live: with B held,
  `LDA $C010` read $C2 and then $C000 read $42).
- **The arrow keys** give $08 (left), $15 (right), $0B (up) and $0A
  (down), with bit 7 set at $C000 (TRM 1985, the 80-column firmware's
  ESCTAB; Apple2TS, src/common/utility.ts:311-315).
- **Open Apple and Solid Apple** are buttons 0 and 1, $C061 and $C062.
  The extended-keyboard IIe wires Shift to button 2, $C063, and an older
  IIe with the shift-key modification does the same (TRM 1987 chapter 2).
- **The paddles.** An access to $C070 (any of $C070-$C07F on a IIe)
  starts four timers, and bit 7 of $C064-$C067 stays set until paddle n's
  timer runs out, after a time that grows with the paddle's resistance,
  about 3 ms at the most (TRM 1987 p. 42). PREAD ($FB1E), with the paddle
  in X, counts in a loop of 11 cycles and returns 0-255 in Y (TRM 1987
  Appendix B; live: PREAD read back each value the server set, 0, 1, 50,
  100, 128, 200, 254 and 255). Apple2TS times a full turn as 0.00278
  seconds, 2,836 cycles (src/worker/devices/joystick.ts), and the kit's
  server turns a value into the time PREAD takes to count to it
  (`kit/apple2/apple2ts_server.mjs`). A game that times the paddles with
  its own loop counts in its own units.
- **A joystick** is two of the analog inputs and the buttons; the TRM
  says only that two of them serve a two-axis joystick (chapter 2, "The
  hand control connector signals"). Read which a game polls from its code:
  the X it gives PREAD, or the $C064-$C067 address it reads.
- **Retriggering.** MAME's driver says the paddle timers, a 558 chip,
  cannot be restarted while they run (apple2e.cpp:2019). Apple2TS
  restarts them on every access (src/worker/devices/joystick.ts:88).

## Sound

### The speaker

Every access to $C030-$C03F moves the speaker's cone to its other
position: two accesses make one cycle of a square wave (Sather chapter
7, p. 7-10; MAME 0.289, apple2e.cpp:1876). A read and a write are the
same to it. A tone of f Hz is an access every 1,020,484 / (2f) cycles.

The number of accesses an instruction makes matters here. Live, in
Apple2TS, these instructions touched $C030 this many times: `LDA abs`,
`STA abs`, `BIT abs`, `LDA abs,X` and `STA abs,Y` once; `STA abs,X` and
`INC abs` twice; `INC abs,X` and `LSR abs` three times, all of an
instruction's accesses on the same cycle. On a 65C02, `INC abs` is three
accesses, read, read, write (MAME 0.289, ow65c02.lst:363-373), so it
moves the cone where Apple2TS's two do not.

Apple2TS clicks only at $C030 itself (src/worker/softswitches.ts:128),
and the kit's sound log records those clicks. A game that clicks at
$C031-$C03F is silent in the kit's machine and missing from its log:
count its speaker accesses with the register census (`kit/cpu/census.py`).

### The Mockingboard, slot 4

Two 6522 VIAs, at $C400-$C40F and $C480-$C48F, each driving one
AY-3-8910 sound chip of three tone channels and a noise generator (the
Mockingboard manual, Appendix F's listing: ORB $C400, ORA $C401, DDRB
$C402, DDRA $C403, and the second at $C480; MAME 0.289,
src/devices/bus/a2bus/a2mockingboard.cpp). A 6522's sixteen registers
are named, from offset 0, `orb`, `ora`, `ddrb`, `ddra`, `t1cl`, `t1ch`,
`t1ll`, `t1lh`, `t2cl`, `t2ch`, `sr`, `acr`, `pcr`, `ifr`, `ier` and
`ora_nh`, prefixed `mb1_` or `mb2_` (`kit/apple2/registers.py`).

Port A carries a byte to the sound chip and port B's bits 0-2 its
control lines (BC1, BDIR and RESET, MAME's a2mockingboard.cpp). The
manual's routines (Appendix F, "Primary Routines"):

| Step | Writes |
|---|---|
| set up | DDRA = $FF, DDRB = $07 |
| reset the chip | ORB = $00, then ORB = $04 |
| pick a register | ORA = its number; ORB = $07, then $04 |
| write it | ORA = the value; ORB = $06, then $04 |

The sound chip's registers (the Mockingboard manual, Table 3-1 and
Appendix B):

| Register | Holds |
|---|---|
| R0, R1 | channel A's tone period: fine (0-255) and coarse (0-15) |
| R2, R3 | channel B's |
| R4, R5 | channel C's |
| R6 | the noise period, 0-31 |
| R7 | enable: bits 0-2 the tone of A, B and C, bits 3-5 their noise; a 1 turns it off (63 is silence, 56 tone only, 7 noise only) |
| R8, R9, R10 | the amplitude of A, B and C: 0-15, or 16 to follow the envelope |
| R11, R12 | the envelope period, fine and coarse |
| R13 | the envelope's shape, 0-15 |
| R14, R15 | not used |

A tone's frequency is the chip's clock ÷ (16 × period) (MAME 0.289,
src/devices/sound/ay8910.cpp:1077-1082 and 1348). The manual's table of
notes assumes a clock of 1.023 MHz and gives 440 Hz as period 145
(Appendix E): 1,023,000 ÷ (16 × 145) is 441.

A 6522's interrupt goes to the CPU's IRQ line, the two chips' together.
Timer 1 free-running (ACR bit 6 set) interrupts every latch + 2 cycles
(live: a latch of $2000 gave 8,194 cycles between interrupts). A timer
counts down once a cycle, so a program can look for the card by reading
one (live: three reads of T1C-L four cycles apart gave $FB, $F7, $F3).

Apple2TS's Mockingboard (src/worker/devices/mockingboard.ts) answers
only at the exact addresses $C400-$C40E and $C480-$C48E: no repeats
elsewhere in the page, and nothing at $C40F and $C48F. It cannot read
the sound chip back, resets it only when ORB's low three bits are all 0,
clears timer 1's flag on a write to T1L-L (its source says the data
sheet does not), counts its timers down by whole instructions, and loses
the cycles past zero when it reloads timer 1. MAME's card answers in
the whole page, $C400-$C47F being the first 6522 and $C480-$C4FF the
second, each repeating its sixteen registers, and resets a sound chip
whenever ORB's bit 2 is 0 (a2mockingboard.cpp:293-305, 345-358 and
441-451). The kit's sound log records the sound chips' register writes.

## Timing

| What | Value | Checked |
|---|---|---|
| CPU clock | 1,020,484 cycles a second on average: 14.31818 MHz ÷ 14, with one cycle in 65 stretched to 16 periods | Sather pp. 3-6 and 3-14 (1.02048432 MHz) |
| A line | 65 cycles, 63.695 µs (15,700 Hz); 40 of them fetch the picture | Sather p. 3-14 |
| A frame | 262 lines, **17,030 cycles**, 16.688 ms (59.92 Hz): 192 lines of picture and 70 blank | Sather p. 3-14; `kit/apple2/apple2ts.py` FRAME_CYCLES |
| The vertical blank | 70 lines, 4,550 cycles | Sather p. 3-14; live: 4,551 by polling $C019, every 17,033 (polls are a few cycles apart) |
| $C019 | bit 7 clear during the blank | TRM 1987 Appendix J (RDVBLBAR, ">127 if not vertical blanking"); MAME 0.289, apple2e.cpp:2092; live |
| WAIT ($FCA8) | (26 + 27A + 5A²) / 2 cycles from the JSR to the instruction after it: 29, 50, 398 and 26,363 for A = 1, 2, 10 and 100; A = 0 took 167,299 | live |

The kit's server counts 1,020,484 cycles a second
(`kit/apple2/apple2ts_server.mjs`, CLOCK). Apple2TS paces a frame at
16.6881 ms, which its comment works out as 17,030 cycles at 1,020,488 a
second (src/worker/motherboard.ts:74), and MAME 0.289 runs its IIe at
1,021,800 Hz with no long cycle (apple2e.cpp:5019 and 5048). A count in
cycles is the same in all three.

In Apple2TS a frame begins with the blank: cycles 0-4,549 of each 17,030
are the blank, and the 192 lines of picture follow
(src/worker/motherboard.ts:1088-1104). It runs whole instructions, so an
instruction's accesses all happen on one cycle, and $C019 changes only
between instructions.

### The floating bus

On a IIe, a read of an address that drives no data returns the byte the
video circuits fetched from memory on that cycle: $C020-$C04F,
$C050-$C05F, bits 0-6 of $C060-$C06F, $C070-$C07F, $C080-$C08F, an empty
slot's I/O and ROM, and $CFFF (Sather pp. 5-40 and 5-41). The byte comes
from whatever the screen shows, text, lo-res or hi-res, page 1 or 2
(MAME 0.289, apple2e.cpp:3379-3390; src/mame/apple/apple2video.cpp:128-197).
A program can follow the beam that way, without $C019.

Apple2TS reads it differently (src/worker/softswitches.ts:337-355): a
read of $C050-$C05F gives the byte of hi-res page 1 under the beam, or
a random byte during the blank, whatever the screen shows; other
addresses give a random value from 0 to $B3, and an empty slot a random
byte (src/worker/memory.ts:540-600). Live, in text mode, 256 reads of
$C058 gave $AA, the value filling hi-res page 1, 156 times, and $55,
the value filling text page 1, once. The kit's server makes the random
values repeatable: they come from a seeded generator that snapshots keep.
A game that follows the beam through the floating bus works in the kit's
machine only when it reads $C050-$C05F with hi-res page 1 on the screen.

## Interrupts and reset

The 65C02's vectors in the ROM ($FFFA-$FFFF): NMI $03FB, RESET $FA62,
IRQ and BRK $C3FA (ROM). Nothing on the IIe's board interrupts on the
kit's machine: the Mockingboard's two 6522s are the only source of IRQs,
and nothing raises NMI.

**IRQ through the ROM.** $C3FA is the enhanced IIe's handler, in the
internal ROM under slot 3 (TRM 1987 pp. 150-156, Tables 6-8 to 6-10). It
saves A in $45, notes the memory switches, switches to main memory and
the ROM, and calls the routine at ($03FE) as an interrupt: that routine
ends with RTI, which comes back to the ROM at $C3F4, and the ROM puts
the switches back and returns to the interrupted code. Live, 137 cycles
passed from $C3FA to the routine and 156 from its RTI back to the
interrupted code; TRM 1987 says 150-200 µs in and 40-140 µs out.

**BRK** goes the same way and on to $FA47, which stores the BRK's
address plus 2 in $3A-$3B and A, X, Y and P in $45-$48, then jumps
through ($03F0) (TRM 1987 Table 6-9; ROM $FA47). Power-up sets $03F0 to
$FA59, which prints the registers and enters the Monitor (ROM). $44
holds the memory switches at the BRK (TRM 1987 Table 6-10): bit 7
ALTZP, 6 80STORE with PAGE2, 5 RAMRD, 4 RAMWRT, 3 the language card's
RAM read, 2 its bank 1 read, 1 its bank 2 read, 0 the internal $Cn ROM.

**A game's own vectors.** With the language card's RAM read, the 65C02
takes IRQ, BRK and NMI from the vectors in that RAM and the ROM's handler
never runs: put the game's vectors at $FFFA-$FFFF of the bank it reads
(in aux memory's with ALTZP on). The kit's emulator check runs its test
program that way (`kit/apple2/check_emulator.py`). The 65C02 clears D
when it takes an interrupt or a BRK (MAME 0.289, ow65c02.lst:255-283;
Apple2TS, src/worker/instructions.ts:375); the 6502 left D as it was.

**Reset.** The MMU turns every memory switch off and puts the language
card to ROM read, write enabled, bank 2 (Aux memory and the language
card). The ROM's reset code at $FA62 (ROM; TRM 1987 pp. 95-98):

1. CLD; SETNORM; INIT, which sets text mode and the full window;
   SETVID and SETKBD, which point CSW and KSW at COUT1 and KEYIN;
   annunciators 0 and 1 off ($C058, $C05A); the 80-column firmware's
   reset; a read of $CFFF; the keyboard strobe cleared; BELL.
2. If $03F4 equals $03F3 EOR $A5, it is a warm reset. When $03F2-$03F3
   holds $E000, Applesoft's cold start, as power-up leaves it, the ROM
   changes it to $E003, the warm start, and jumps to $E000. Otherwise it
   jumps through ($03F2).
3. Otherwise it is a power-up. The ROM prints "Apple //e", sets
   $03F0-$03F4 to $59 $FA $00 $E0 $45, and looks for a disk controller
   from slot 7 down to slot 1, by the bytes $20, $00 and $03 at $Cn01,
   $Cn03 and $Cn05. It boots the first it finds, slot 6 on the kit's
   machine; with none, Applesoft starts.

Live: page 3 after power-up was 59 FA 00 E0 45 and then $FF to $03FF;
after Applesoft's cold start, 59 FA 03 E0 45. A reset with $03F2 =
$6000 and $03F4 = $C5 went to $6000; with $03F4 wrong it booted again.
To catch reset, a game points $03F2-$03F3 at its own code and sets
$03F4 to match. On the IIe reset is Control-Reset. Open Apple with
Control-Reset forces a cold start, and the ROM changes two bytes in
every page of main memory first, the power-up byte with them, so that no
program survives it; Solid Apple with Control-Reset runs the self-test
(TRM 1987 pp. 95-98).

## The Disk II

The controller in slot 6 answers at $C0E0-$C0EF ($C080 + $60), and its
boot ROM, Apple's 341-0027 (16 sectors), is at $C600-$C6FF. Its sixteen
addresses (BAD Figure 6.1; the names are `kit/apple2/registers.py`'s,
`s6_` in front when the operand is the absolute address):

| Offset | Name | Does |
|---|---|---|
| +0 to +7 | phaseoff0, phaseon0, ... phaseoff3, phaseon3 | each of the head stepper's four magnets off or on |
| +8, +9 | motoroff, motoron | the drive motor |
| +A, +B | drv1, drv2 | which drive |
| +C, +D | q6l, q6h | Q6 off or on |
| +E, +F | q7l, q7h | Q7 off or on |

Q7 off and Q6 off reads the data latch; Q7 off and Q6 on senses the
write protect (bit 7); Q7 on and Q6 off writes; Q7 on and Q6 on loads
the write latch (BAD Figure 6.1). Code reads the latch with
`LDA $C08C,X`, X being $60, until bit 7 is set: every byte on the disk,
a nibble, has its top bit set.

**A track.** 35 tracks, 0-34, of 16 sectors of 256 bytes on a DOS 3.3 or
ProDOS disk, 143,360 bytes in all. Each sector is an address field and a
data field, with sync bytes between (BAD chapter 3):

- **Address field**: D5 AA 96; the volume, the track, the sector and the
  EOR of the three, each as two nibbles, 4-and-4 (the odd bits, then the
  even ones: shift the first left with a 1 in bit 0 and AND it with the
  second, BAD pp. 3-13 and 3-14); DE AA EB.
- **Data field**: D5 AA AD; 342 nibbles of 6-and-2 data and a checksum
  nibble; DE AA EB. The 64 data nibbles run from $96 to $FF.
- DOS checks only the first two bytes of each epilogue: the EB is written
  and never read (BAD chapter 3).
- **Sync**: self-sync bytes are $FF and two zero bits, written in 40
  cycles instead of 32, and a few of them in a row bring a reader into
  step (BAD p. 3-8).
- A 13-sector disk, DOS 3.2's, has address fields that begin D5 AA B5
  and 410 nibbles of 5-and-3 data (BAD chapter 3; `kit/apple2/disk.py`).

**Sector order.** A sector's number is the one in its address field.
DOS 3.3 and ProDOS each number the sectors of a track in their own order,
and a disk image stores them in that order (live: a test disk whose
sectors each held their own number, booted as `.dsk` and as `.po`):

- DOS 3.3 order, logical 0-15 is physical 0, 13, 11, 9, 7, 5, 3, 1, 14,
  12, 10, 8, 6, 4, 2, 15.
- ProDOS order, logical s is physical 2s mod 15, and 15 is 15. Block b is
  track b div 8, logical sectors 2 × (b mod 8) and the one after.

**The head.** Four magnets, phases 0-3, pull the head. Turning them on in
ascending order moves it inward, to higher tracks; one phase is half a
track, so a whole track is two, and RWTS stops on phases 0 and 2. Two
neighbouring phases on together hold the head on a quarter track. A step
takes about 20 ms to settle, and there are 70 half-track positions
(Sather p. 9-14).

**The boot** (Boot ROM, disassembled; live):

1. $C600-$C61F builds the 6-and-2 decoding table at $036C-$03D5.
2. It finds its own slot: JSR $FF58 (an RTS), then the return address
   left on the stack, times 16, goes to $2B and X.
3. It picks drive 1, turns the motor on, and steps the head outward
   (LDY #$50), WAIT $56 between steps, 19,664 cycles, to reach track 0
   whatever track it was on.
4. It reads sector 0 of track 0 into $0800: it waits for D5 AA 96, reads
   the volume, track and sector without checking the address checksum,
   compares the sector with $3D and the track with $41, waits for D5 AA
   AD, and decodes 86 nibbles into $0300-$0355 and 256 into the page at
   ($26). It checks the data checksum and ignores the epilogue.
5. The byte at $0800 is then the number of sectors to read: the ROM
   reads sectors 1, 2, ... of track 0 into the pages that follow while
   $3D is below it ($C6EB), then jumps to $0801 with X = $60.

At $0801, live: A = $01, X = $60, Y = $00, S = $FF, P = $35; $26-$27 =
$0900, $2B = $60, $3D = $01, $40 = $41 = $00; 1,843,082 cycles after the
power-on, about 1.8 s. The ROM's sector loop starts at $C65C, so a boot
sector that sets $26-$27, $3D and $41 and jumps to $C65C reads one more
sector of the track the head is on, then comes back to $0801.

**Disk images** (`kit/apple2/disk.py` reads them all; the kit's server
takes WOZ, `.dsk`, `.do` and `.po`, `kit/skills/apple2/tool-apple2ts`,
"Disks"):

| Format | Holds | Keeps copy protection |
|---|---|---|
| `.woz`, WOZ 1 or 2 | each track's bits as a drive read them, with a map of 160 quarter tracks | yes: timing, weak bits, half tracks, unusual fields |
| `.nib` | 35 tracks of 6,656 nibbles | unusual fields only: no timing, no weak bits |
| `.dsk`, `.do` | 35 × 16 × 256 bytes in DOS 3.3 order | no: the sectors' data only |
| `.po` | the same in ProDOS order | no |
| `.d13` | 35 × 13 × 256 bytes | no |
| `.2mg` | a 64-byte header, then one of the above | as what it holds |

A protected game that boots from a `.dsk` has been cracked: compare it
with the 4am notes before reading its loader as the original's.

WOZ 2.1 (the WOZ reference, 16 June 2021): the INFO chunk's data begins
at byte 20, 60 bytes, with the bit timing in units of 125 ns (32 is 4 µs,
a standard disk). TMAP, at byte 88, has 160 entries, one for each
quarter track from 0.00 to 39.75: the index of the track the head reads
there, or $FF for none, where a drive reads random bits. A whole track
normally shows at its own quarter and the ones either side, track 1.00
at 0.75 and 1.25. TRKS, at byte 256, gives each track's first block,
block count and bit count, and the bits start at byte 1,536, block 3. A
run of three or more 0 bits makes the drive's amplifier, an MC3470, read
false 1s at random: those are the weak bits some protections check. WOZ
2.1 adds FLUX, a track kept as flux timings, which `kit/apple2/disk.py`
reports and does not read.

**Copy protection**, in general terms (BAD Appendix B, pp. B-1 to B-3):
changed prologues, epilogues or checksums; sectors numbered out of order,
or the same number twice; data between tracks, on half or quarter
tracks; sync bytes counted, which a nibble copier loses; file names with
hidden control characters; memory changed on reset, so the running game
cannot be stopped and saved; and loaders of the game's own in place of
DOS's. Weak bits and track lengths come from WOZ 2.1. A 4am transcript
names the protection it removed ("Where to read about a game first").

## DOS 3.3 and ProDOS 8

### DOS 3.3

From Beneath Apple DOS ("BAD"); no DOS 3.3 disk was booted live.

- **The boot** (BAD chapter 5, "What happens during booting"): the
  controller's ROM, Boot 0, loads track 0 sector 0 at $0800. Boot 1
  there reads sectors 1-9 of track 0, RWTS and the loader, Boot 2, into
  the nine pages below where DOS will end: $B700-$BFFF from a 48K slave
  disk, $3700-$3FFF from a master disk, which first copies Boot 1 to
  $3600. Boot 2 reads the rest of DOS, 27 sectors from track 2 sector 4
  down to track 0 sector $A, each into the page below the last; a master
  disk's DOS then moves itself to the top of memory.
- **Memory** (BAD chapter 5, "DOS memory use", pp. 5-1 and 5-2): on a
  48K machine DOS takes the top 10.5K or so. Its file buffers come
  first, 595 bytes each and three of them with MAXFILES 3; the main
  routines follow from $9D00 (BAD chapter 6, "DOS buffers"), then the
  file manager, and RWTS in the last 2.5K, up to $BFFF. HIMEM is $9600
  with three buffers (BAP p. 2-8).
- **Page 3** (BAD pp. 5-4 and 5-5; names as `kit/apple2/monitor.py`):

| Address | Name | Holds |
|---|---|---|
| $03D0 | DOSWARM | JMP to DOS's warm start, which keeps the BASIC program |
| $03D3 | DOSCOLD | JMP to DOS's cold start |
| $03D6 | FILEMGR | JMP to the file manager |
| $03D9 | RWTS | JMP to RWTS |
| $03DC | LOCFPL | loads Y and A with the address of the file manager's parameter list |
| $03E3 | LOCRPL | loads Y and A with the address of RWTS's IOB |
| $03EA | DOSHOOK | JMP to the routine that connects DOS to CSW and KSW again |

- **Hooks.** DOS points the Monitor's output and input hooks, CSW ($36)
  and KSW ($38), at itself, so COUT and RDKEY pass through DOS while it
  is connected (BAD chapter 5; DOSHOOK).
- **RWTS** (BAD pp. 6-4 to 6-6): JSR $03E3 for DOS's own IOB (Y low, A
  high), fill it in, and JSR $03D9 with Y and A pointing at an IOB.

| IOB byte | Holds |
|---|---|
| $00 | the table type, $01 |
| $01 | the slot × 16 |
| $02 | the drive, 1 or 2 |
| $03 | the volume expected, 0 for any |
| $04 | the track, 0-34 |
| $05 | the sector, 0-15 |
| $06-$07 | the address of the device characteristics table |
| $08-$09 | the address of the 256-byte buffer |
| $0A | not used |
| $0B | the byte count of a partial sector, 0 for 256 |
| $0C | the command: 0 seek, 1 read, 2 write, 4 format |
| $0D | the return code: 0 none, $08 an error while formatting, $10 write-protected, $20 volume mismatch, $40 drive error, $80 read error. The carry is set on an error |
| $0E-$10 | the volume, slot × 16 and drive of the last access |

  The device characteristics table is the device type ($00 for a Disk
  II), the phases per track ($01) and a motor-on time count ($EFD8).
  RWTS uses $48, where the Monitor keeps P: set $48 to 0 after a call.
- **The disk** (BAD chapter 4): the VTOC is track 17 ($11) sector 0. Its
  bytes $01-$02 are the first catalog sector's track and sector, $03 the
  DOS release, $06 the volume (1-254), $27 the track/sector pairs a list
  holds (122), $34 the tracks on the disk (35) and $35 the sectors a
  track (16); a bit map of free sectors, four bytes a track, follows.
  Catalog sectors are linked by their bytes $01-$02 and hold seven
  35-byte entries from $0B: the track of the file's first track/sector
  list ($00: never used; $FF: deleted) and its sector; the type, $00 T,
  $01 I, $02 A, $04 B, $08 S, $10 R, $20 new A, $40 new B, plus $80 when
  locked; the name, 30 characters with bit 7 set; the length in sectors.
- **Files** (BAD p. 4-11): a B file begins with its load address and its
  length, two bytes each, low byte first; an A or I file with its length.
- **DOS's zero page** (BAD pp. 8-41 and 8-42): $24, $26-$2F ($2C-$2F
  hold the checksum, sector, track and volume of the last address field
  read), $33, $35-$39, $3C-$4D, $67-$6A, $6F-$70, $73-$74, $AF-$B0,
  $CA-$CD and $D8-$D9.

### ProDOS 8

From the ProDOS 8 Technical Reference Manual ("ProDOS TRM") and Beneath
Apple ProDOS ("BAP"); no ProDOS disk was booted live.

- **Memory**: the kernel takes 12K of the language card's RAM,
  $D000-$FFFF with one $D000 bank, and $BF00-$BFFF; the other $D000 bank
  holds its QUIT code from $D100; zero page $3A-$4F is the kernel's (BAP
  chapters 5 and 7). BASIC.SYSTEM sits at $9600-$BEFF, with its own
  global page at $BE00 and 1K file buffers below it (BAP chapter 5).
- **Calls**: JSR $BF00 (the MLI), followed by a call number byte and a
  two-byte address of the parameter list; it returns past those three
  bytes with the carry clear and A = 0, or the carry set and the error
  code in A (ProDOS TRM section 4.2).
- **The global page**, $BF00-$BFFF, is at the same address on every
  machine (ProDOS TRM section 3.3.2). The system bit map, $BF58-$BF6F,
  has a bit for each page of $0000-$BFFF, bit 7 of $BF58 for page 0
  (section 5.1.4). MACHID is at $BF98, and $BF30 holds the slot and
  drive last used (BAP chapter 8; the listing in section 5.2.2 has
  $BF98, though its text gives $BF96 once). The MLI cannot read into
  or out of the language card or aux memory (section 5.1.4).
- **/RAM**: on a 128K IIe, ProDOS makes aux memory a RAM disk, /RAM,
  slot 3 drive 2. A program that uses aux memory for anything else must
  disconnect /RAM first (ProDOS TRM section 5.2.2).
- **The disk**: 512-byte blocks of two sectors each, in ProDOS order
  (The Disk II). A file's storage type is $1 to $3 for a standard file
  (seedling, sapling, tree) and $D for a directory (ProDOS TRM Appendix
  B).

## The Monitor ROM

The Monitor is the ROM from $F800. The routines below are its documented
entry points (TRM 1987 Appendix B, "Directory of Built-in Subroutines";
the Apple II Reference Manual), which keep their addresses in every
Apple II's ROM, so a game written for the II Plus calls the same ones.
The names are `kit/apple2/monitor.py`'s, the listing's names for them;
each was run on the kit's machine on 19 October 2026 and did what Apple
documents (`monitor.py --check`). On the enhanced IIe, many of them pass
through $FBB4 to the 80-column firmware in the internal ROM (ROM: KEYIN
is `LDY #$03; JMP $FBB4`).

| Address | Name | Does |
|---|---|---|
| $F800 | PLOT | plots a lo-res block: A the row, Y the column, in COLOR |
| $F819 | HLINE | a horizontal lo-res line: A the row, Y the left end, H2 ($2C) the right |
| $F828 | VLINE | a vertical lo-res line: Y the column, A the top, V2 ($2D) the bottom |
| $F832 | CLRSCR | clears the lo-res screen |
| $F836 | CLRTOP | clears its top 40 rows |
| $F847 | GBASCALC | the lo-res row base for A into GBASL (not in `monitor.py`; live) |
| $F85F | NXTCOL | adds 3 to COLOR |
| $F864 | SETCOL | sets COLOR from A |
| $F871 | SCRN | the colour of the block at row A, column Y |
| $F941 | PRNTAX | prints A and X as four hex digits |
| $F944 | PRNTX | prints X as two |
| $F948 | PRBLNK | prints three spaces |
| $F94A | PRBL2 | prints X spaces (256 for X = 0) |
| $FB1E | PREAD | paddle X's value, 0-255, in Y |
| $FB2F | INIT | text mode, page 1, the full window |
| $FB39 | SETTXT | text mode, the full window |
| $FB40 | SETGR | lo-res, mixed with four lines of text |
| $FB4B | SETWND | the full window |
| $FB5B | TABV | moves the cursor to row A |
| $FB6F | SETPWRC | sets the power-up byte from the reset vector |
| $FBC1 | BASCALC | the text row base for A into BASL |
| $FBDD | BELL1 | a beep: 1 kHz for 0.1 s |
| $FC10 | BS | the cursor back one |
| $FC1A | UP | the cursor up one |
| $FC22 | VTAB | the base address for CV |
| $FC24 | VTABZ | the base address for row A |
| $FC42 | CLREOP | clears from the cursor to the end of the window |
| $FC58 | HOME | clears the window and puts the cursor at its top left |
| $FC62 | CR | a carriage return |
| $FC66 | LF | a line feed |
| $FC70 | SCROLL | scrolls the window up a line |
| $FC9C | CLREOL | clears from the cursor to the end of the line |
| $FC9E | CLREOLZ | the same from column Y |
| $FCA8 | WAIT | waits (26 + 27A + 5A²) / 2 cycles (Timing) |
| $FD0C | RDKEY | a key through the input hook KSW, in A |
| $FD1B | KEYIN | waits for a key at $C000, counting RNDL up |
| $FD35 | RDCHAR | a key, with the escape codes acted on |
| $FD67 | GETLNZ | a carriage return, then GETLN |
| $FD6A | GETLN | reads a line into $0200, with the prompt in PROMPT; X is its length |
| $FD6F | GETLN1 | GETLN with no prompt |
| $FD8B | CROUT1 | clears to the end of the line, then CROUT |
| $FD8E | CROUT | prints a carriage return |
| $FDDA | PRBYTE | prints A as two hex digits |
| $FDE3 | PRHEX | prints A's low nibble as a hex digit |
| $FDED | COUT | prints A through the output hook CSW |
| $FDF0 | COUT1 | prints A on the screen |
| $FE2C | MOVE | copies A1 to A2 to A4 onward, Y = 0 |
| $FE80 | SETINV | inverse text |
| $FE84 | SETNORM | normal text |
| $FE89 | SETKBD | IN#0: KSW to KEYIN |
| $FE8B | INPORT | IN#A |
| $FE93 | SETVID | PR#0: CSW to COUT1 |
| $FE95 | OUTPORT | PR#A |
| $FF2D | PRERR | prints ERR and a bell |
| $FF3A | BELL | prints a bell character |
| $FF3F | RESTORE | loads A, X, Y and P from $45-$48 (Apple's documents call it IOREST) |
| $FF4A | SAVE | saves A, X, Y, P and S in $45-$49, then CLD (IOSAVE in the documents) |
| $FF58 | IORTS | an RTS |
| $FF65 | MON | the Monitor, with a bell |
| $FF69 | MONZ | the Monitor, with no bell |

Page 3's vectors (the Monitor's; BAD pp. 5-4 and 5-5; TRM 1987 Table
4-11 and Appendix J; `monitor.py` checked each by making the ROM go
through it):

| Address | Name | Holds |
|---|---|---|
| $03F0-$03F1 | BRKV | where a BRK goes ($FA59 after power-up) |
| $03F2-$03F3 | SOFTEV | where a warm reset goes |
| $03F4 | PWREDUP | $03F3 EOR $A5 when SOFTEV is valid |
| $03F5-$03F7 | AMPERV | a JMP for Applesoft's & |
| $03F8-$03FA | USRADR | a JMP for the Monitor's Control-Y |
| $03FB-$03FD | NMI | a JMP for an NMI |
| $03FE-$03FF | IRQLOC | the address of the IRQ routine |

Power-up writes only $03F0-$03F4. With no DOS, $03F5-$03FF held $FF
after power-up and after Applesoft's cold start (live); TRM 1987 Table
4-11 gives JMP $FF58 as the & vector's usual contents.

## Applesoft and Integer BASIC

Applesoft BASIC is the ROM from $D000 to $F7FF. A game written in it, or
with a BASIC program in front of its machine code, keeps the program at
$0801 (live: a program typed at the prompt, read back from memory):

- $0800 holds 0. Each line is a two-byte link to the next line, a
  two-byte line number, the line's text with its keywords as tokens, and
  a 0; a link of 0 ends the program. `10 X=USR(1.5)` is `0E 08 0A 00 58
  D0 D5 28 31 2E 35 29 00`: the link $080E, the number 10, `X`, `=` ($D0),
  USR ($D5), `(1.5)`, 0.
- A keyword is one byte, from $80 to $EA; everything else is ASCII with
  bit 7 clear. A DOS 3.3 A file is the program's length and then the
  program from $0801 (BAD p. 4-11).

The tokens, read from the ROM's own keyword table at $D0D0-$D25F (live;
SourceGen's Applesoft.sym65 has the same):

| | +0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 |
|---|---|---|---|---|---|---|---|---|
| $80 | END | FOR | NEXT | DATA | INPUT | DEL | DIM | READ |
| $88 | GR | TEXT | PR# | IN# | CALL | PLOT | HLIN | VLIN |
| $90 | HGR2 | HGR | HCOLOR= | HPLOT | DRAW | XDRAW | HTAB | HOME |
| $98 | ROT= | SCALE= | SHLOAD | TRACE | NOTRACE | NORMAL | INVERSE | FLASH |
| $A0 | COLOR= | POP | VTAB | HIMEM: | LOMEM: | ONERR | RESUME | RECALL |
| $A8 | STORE | SPEED= | LET | GOTO | RUN | IF | RESTORE | & |
| $B0 | GOSUB | RETURN | REM | STOP | ON | WAIT | LOAD | SAVE |
| $B8 | DEF | POKE | PRINT | CONT | LIST | CLEAR | GET | NEW |
| $C0 | TAB( | TO | FN | SPC( | THEN | AT | NOT | STEP |
| $C8 | + | - | * | / | ^ | AND | OR | > |
| $D0 | = | < | SGN | INT | ABS | USR | FRE | SCRN( |
| $D8 | PDL | POS | SQR | RND | LOG | EXP | COS | SIN |
| $E0 | TAN | ATN | PEEK | LEN | STR$ | VAL | ASC | CHR$ |
| $E8 | LEFT$ | RIGHT$ | MID$ | | | | | |

Applesoft's zero page. The addresses were checked live; the names are
SourceGen's, which it takes from *What's Where in the Apple* and the
S-C DocuMentor (Sources):

| Address | Name | Holds |
|---|---|---|
| $0A-$0C | USRVEC | the JMP that USR() calls; the cold start puts JMP $E199 there, the ILLEGAL QUANTITY error (live) |
| $67-$68 | TEXTTAB | the program's start, $0801 |
| $69-$6A | VARTAB | the simple variables' start, just after the program |
| $6B-$6C | ARYTAB | the arrays' start |
| $6D-$6E | STREND | the arrays' end |
| $6F-$70 | FRETOP | the bottom of the strings, which grow down from HIMEM |
| $73-$74 | MEMSIZE | HIMEM ($C000 with no DOS, live) |
| $75-$76 | CURLIN | the line running; $FF $FF at the prompt after the cold start |
| $9D-$A2 | FAC | the number being worked on: exponent, four mantissa bytes, sign |
| $AF-$B0 | PRGEND | the program's end |
| $B1-$C8 | CHRGET | a routine in RAM that fetches the program's next byte (below) |
| $B8-$B9 | TXTPTR | the address CHRGET reads next: the operand of its LDA |
| $D8 | ERRFLG | $80 while ONERR is on (SourceGen only) |
| $E6 | HPAG | the hi-res page drawn on, $20 or $40 (HPOSN, live) |

CHRGET, live: `E6 B8 D0 02 E6 B9 AD xx xx C9 3A B0 0A C9 20 F0 EF 38 E9
30 38 E9 D0 60`. It adds 1 to TXTPTR, reads the byte there, skips
spaces, returns with the carry clear for a digit and Z set for `:` or 0.
CHRGOT, $B7, reads the same byte again. Being RAM, it can be patched to
add commands, and a game's BASIC part may do so.

Variables, live, from `A=1.5:B%=-2:C$="HI":D$=C$+"!":DIM E(2):E(1)=3`:

- A simple variable is 7 bytes: two of name, five of value. Bit 7 of the
  first name byte marks an integer (`%`), bit 7 of the second an integer
  or a string (`$`): A is `41 00`, B% `C2 80`, C$ `43 80`.
- A real is five bytes: the exponent, $80 more than the power of 2 (0
  for the number 0), and four bytes of mantissa whose top bit is the
  sign. 1.5 is `81 40 00 00 00`, 3 is `82 40 00 00 00`, and -3 is `82 C0
  00 00 00`. In FAC the leading 1 is written out and the sign is a byte
  of its own: -3 is `82 C0 00 00 00 FF` there (live, through USR).
- An integer is two bytes, high byte first: -2 is `FF FE`.
- A string is its length and its address, three bytes: C$ pointed into
  the program's own text at $0815, and D$, built by the program, to
  $BFFD at the top of memory.
- An array, from ARYTAB: the name, two bytes; the offset to the next
  array, two bytes, low first; the number of dimensions; each one's
  size, two bytes, high first; then the elements. E(2) is `45 00 16 00 01
  00 03`, then three reals.

USR(x) puts x in FAC and calls $000A. `CALL n` jumps to n, and the
program's machine code often sits where a CALL or a USR expects it.
HPOSN ($F411) sets the hi-res position from Y-X and A, and HPLOT0
($F457) plots there (SourceGen's names; HPOSN's row base live).

**Integer BASIC** is not in the IIe's ROM. A DOS 3.3 master disk loads
it into the language card, a file of type I is its program, and its
programs are laid out differently from Applesoft's; this file does not
describe them (not checked).

## The 65C02

The enhanced IIe's CPU is a 65C02 (TRM 1987 Appendix A, pp. 209-210,
which reprints NCR's data sheet: "ten new instructions and two new
addressing modes", 27 opcodes). It has none of Rockwell's bit
instructions (RMB, SMB, BBR, BBS), nor WDC's WAI and STP: those opcodes
are no-ops (MAME 0.289, src/devices/cpu/m6502/w65c02.cpp; Apple2TS,
src/worker/instructions.ts:795-841).

**The listing decodes 65C02 code**: `kit/cpu/m65c02.py` holds the table,
178 documented opcodes (the 6502's 151 and the 27 the 65C02 adds) and
the other 78 as no-ops of fixed lengths, and `kit/scripts/listing.py`
decodes an Apple II game with it. Its names and lengths match Apple2TS
3.7.0's opcode for opcode (`python3 kit/cpu/opcodes.py --check apple2`:
256 of 256 on 19 October 2026). **regenerator2000 0.9.20 does not know
the 65C02**: a test of all 27 added opcodes on 18 October 2026 showed
each as `.byte $xx ; Invalid or partial instruction` and decoded the
bytes after it as other instructions (an operand of $10 as `bpl`, of
$00 as `brk`); none appeared as one of the 6502's undocumented
opcodes (`kit/skills/apple2/tool-regen2000`, "Traps").

The 27 opcodes:

| Opcodes | Instruction |
|---|---|
| $80 | BRA, branch always |
| $DA, $5A, $FA, $7A | PHX, PHY, PLX, PLY |
| $64, $74, $9C, $9E | STZ zp, zp,X, abs, abs,X: store zero |
| $04, $0C | TSB zp, abs: test, and set A's bits in memory |
| $14, $1C | TRB zp, abs: test, and clear A's bits in memory |
| $1A, $3A | INC A, DEC A |
| $89, $34, $3C | BIT #imm, zp,X, abs,X |
| $7C | JMP (abs,X) |
| $12, $32, $52, $72, $92, $B2, $D2, $F2 | ORA, AND, EOR, ADC, STA, LDA, CMP, SBC (zp) |

The no-ops, with their lengths and cycles, which MAME 0.289 and
Apple2TS agree on:

| Opcodes | Bytes | Cycles | Reads in MAME |
|---|---|---|---|
| every $x3, $x7, $xB, $xF | 1 | 1 | nothing |
| $02, $22, $42, $62, $82, $C2, $E2 | 2 | 2 | its operand |
| $44 | 2 | 3 | the zero page byte |
| $54, $D4, $F4 | 2 | 4 | the zero page byte, then zp + X |
| $5C | 3 | 8 | its operand only |
| $DC, $FC | 3 | 4 | the address with X added to its low byte only |

Apple2TS's no-ops read nothing (src/worker/instructions.ts:795-841), so
a no-op aimed at a soft switch flips it on a 65C02, if MAME is right,
and not in the kit's machine.

What a 6502 program does differently on the 65C02:

- **The 6502's undocumented opcodes are gone.** LAX, SAX, DCP and the
  rest are no-ops of the lengths above, so a II Plus program that uses
  one fails on the enhanced IIe.
- **JMP (abs)** takes the high byte from the next page when the pointer
  is at $xxFF: `JMP ($02FF)` reads $02FF and $0300, where the 6502 read
  $02FF and $0200. It takes 6 cycles, not 5 (TRM 1987 Appendix A, Table
  A-1; Apple2TS, instructions.ts:510-512).
- **BIT #imm** sets Z only, and leaves N and V (TRM 1987 Appendix A;
  Apple2TS, instructions.ts:354-355).
- **Interrupts and BRK clear D** (Interrupts and reset).
- **ADC and SBC** take a cycle more in decimal mode (MAME 0.289,
  ow65c02.lst:83-91; Apple2TS, instructions.ts:156-157).
- **Read-modify-write** instructions read their address twice and write
  it once, where the 6502 read once and wrote twice (MAME 0.289,
  ow65c02.lst:363-387). Apple2TS reads twice for ASL, LSR, ROL and ROR
  and for INC and DEC abs,X, but once for INC and DEC in their other
  modes and for TSB and TRB (instructions.ts:321-334, 450-498, 774-790).
- **Shifts, INC and DEC abs,X.** TRM 1987 Table A-1 gives 6 cycles on the
  65C02 for ASL, LSR, ROL, ROR, INC and DEC abs,X (7 on the 6502). MAME
  0.289 takes 7 for all six (ow65c02.lst:150-161, 311-323, 375-387);
  Apple2TS takes 6, or 7 across a page, for the shifts and 7 for INC and
  DEC. Which a IIe's 65C02 takes was not checked.
- **Extra reads.** MAME's 65C02 reads the address before the carry for
  `STA abs,X`, `STA abs,Y` and `STA (zp),Y`, and for a load that crosses
  a page (om6502.lst:751-761, 1294-1329), and for `STZ abs,X`
  (ow65c02.lst:797-804). Apple2TS makes that read only for `STA abs,X`
  and `STZ abs,X`, at the address after the carry (instructions.ts:733-737
  and 761-765). Where a real 65C02's extra read lands was not checked.

## Where Apple2TS differs from a real IIe

Each of these was found in Apple2TS 3.7.0's source, and the live ones on
the kit's machine. "A IIe" means what the documents and MAME agree on;
none was checked on a real IIe.

- **The language card after reset.** A IIe enables writing to the RAM;
  Apple2TS disables it (src/worker/motherboard.ts:467; live). A program
  that writes to the RAM after a reset without the two reads works on a
  IIe and not in the kit's machine.
- **INC, DEC, TSB and TRB read once.** A 65C02 reads twice, so `INC
  $C083` write-enables the language card on a IIe and not in Apple2TS
  (live: no write), and `INC $C030` moves the speaker three times on a
  IIe and twice in Apple2TS.
- **No extra reads** for `STA abs,Y`, `STA (zp),Y`, loads that cross a
  page, or the no-ops, and an instruction's accesses all fall on one
  cycle (The 65C02).
- **The speaker answers at $C030 only**, not $C031-$C03F
  (src/worker/softswitches.ts:128), and $C020-$C02F does nothing.
- **$C04F reads $CD**, an emulator's signature (softswitches.ts:133); a
  IIe returns the floating bus.
- **The floating bus** is hi-res page 1 under the beam at $C050-$C05F,
  and random everywhere else (Timing).
- **$C071 and $C073 written** select a RamWorks memory bank, which the
  kit's machine has none of, and start no paddle timer; $C074 is an
  accelerator's switch (src/worker/memory.ts:624-629;
  softswitches.ts:165-166). On a IIe every access to $C070-$C07F starts
  the timers.
- **Paddle timers restart** on every trigger (Keyboard, paddles and
  buttons).
- **$C07E and $C07F** read random values; a IIe's are paddle triggers
  whose reads float.
- **The Mockingboard** answers at exact addresses only and simplifies the
  6522's timers (Sound).
- **A No-Slot Clock** answers at $C300-$C3FF whenever the internal ROM is
  there (src/worker/memory.ts:556-574, src/worker/nsc.ts), although the
  profile has no clock. A game that looks for a clock finds one, and it
  tells the date and time of the computer the server runs on
  (src/worker/nsc.ts), so a run that reads it does not repeat.
- **Power-on memory** is all $FF, except $9E and $9F, which are 0
  (src/worker/memory.ts:427-456). What a real IIe's memory holds at
  power-on was not checked.
- **The clock and the frame.** 1,020,488 Hz in Apple2TS's frame time, the
  blank at the start of each frame, and $C019 evaluated between
  instructions (Timing).
- **Apple2TS's own picture** shows hi-res page 2 when 80STORE and PAGE2
  are both on (src/worker/memory.ts:812), and draws Video-7 card modes
  for some switch settings (memory.ts:754-768, 791-793). The kit draws
  its screenshots itself and shows page 1, so only Apple2TS's web page
  shows these.
- **The server's changes.** The kit's server turns off the patches
  Apple2TS makes to some twenty games it recognises, so the machine runs
  every program as it is; it also draws the random values from a seeded
  generator and puts keys straight into the latch, with no auto-repeat.
  Its `hello` reply lists every change (`kit/skills/apple2/tool-apple2ts`).

## Other Apple II models

Not the kit's machine; for a game that checks for, or needs, one of
them.

- **Apple II and II Plus** (ROM: Apple2TS ships the II Plus's). A 6502,
  whose undocumented opcodes run. 48K, with an optional 16K language card
  in slot 0, whose $C080-$C08F switches are the IIe's; no aux memory, no
  80 columns without a card, no MouseText, and no $C011-$C01F status
  reads. IRQ and BRK go through $FA40 (ROM): it saves A in $45 and jumps
  through ($03FE) at once, leaving the memory switches alone; a BRK goes
  on to $FA4C and ($03F0).
- **The unenhanced IIe**: a 6502, with the IIe's memory switches. Its ROM
  sends IRQ and BRK to $FA40 as the II Plus does (ROM), and its alternate
  character set has inverse upper case where the enhanced IIe has
  MouseText (TRM 1987 Table 2-4).
- **IIc**: a 65C02. $C019 reads VBLINT, an interrupt flag, rather than
  the beam (MAME 0.289, apple2e.cpp:2257). IOUDIS, at $C07E and $C07F,
  exists, and decides whether $C058-$C05F are the annunciators and
  double hi-res or the mouse's and the vertical blank's interrupt
  switches (apple2e.cpp:1806-1850 and 2286-2292). Its $FFFE points to
  $C803 (TRM 1987 p. 156).
- **IIgs**: a 65C816. $C019's bit 7 is set during the blank, the
  opposite of the IIe's (MAME 0.289, src/mame/apple/apple2gs.cpp:1623,
  which cites Apple IIgs Technical Note #40). A IIe game that waits on
  $C019 waits on the wrong half of the frame there.

## The mistakes that bite

- **Reading the I/O page through the kit's `read`.** The server returns
  $00 there: a read through the bus would flip a switch. The switches,
  the keyboard and the cards are `chips` (`kit/apple2/apple2ts.py`).
- **A read is a switch.** `LDA $C055` shows page 2, and `LDA $C083`
  changes what $D000-$FFFF holds; a program that reads one of these to
  test it has flipped it. Only $C000-$C00F need a write.
- **$C000-$C00F are two things.** Read, they are the keyboard; written,
  the memory switches. A store's operand takes the write's name in the
  listing (`sta set80store`), a load's the read's.
- **One read does not write-enable the language card.** It takes two
  odd reads in a row; a store between them cancels it, and `INC $C083`
  does it on a 65C02 and not in Apple2TS.
- **Which $D000 bank.** Two 4K banks share $D000-$DFFF; $E000-$FFFF has
  one. Code at $D000 in one bank and data at $D000 in the other are two
  parts, and so is anything in aux memory (Memory map).
- **ALTZP moves the stack.** The return addresses pushed before the
  switch are in the other 64K after it.
- **80STORE changes PAGE2.** With it on, $C055 picks aux memory, not the
  second page.
- **Rows are not in order.** Text row 1 is at $0480 and row 8 at $0428;
  hi-res line 1 is at $2400. Use the formulas in The screen.
- **The screen holes.** Clearing $0400-$07FF clears the cards' bytes and
  the 80-column firmware's state with it.
- **Text's bit 7.** Normal characters have it set: `A` on the screen is
  $C1. A message stored with bit 7 clear shows inverse or flashing, and
  a listing must not read it as different text (`kit/apple2/cpu.py`).
- **Hi-res bit order.** Bit 0 is the leftmost dot, and bit 7 is a colour
  shift, not a dot: seven dots a byte.
- **$C019 is clear during the blank.** On the IIe bit 7 is 0 in the
  vertical blank; on the IIgs it is 1, and on the IIc it is an interrupt
  flag.
- **The ROM's IRQ handler costs about 300 cycles** (137 in, 156 out,
  live), and runs only while the ROM is at $FFFE. A game with the
  language card switched in needs its own vectors there.
- **Silent clicks.** A speaker access at $C031-$C03F is a click on a IIe
  and nothing in the kit's machine or its sound log.
- **Page 3 is not set up.** On the kit's machine with no DOS, $03F5-$03FF
  hold $FF: Applesoft's & runs into them, and a JMP there must be the
  game's.
- **RWTS and $48.** RWTS uses $48, where the Monitor keeps P; a program
  that calls RWTS and then the Monitor sets it to 0 first.
- **$4E-$4F change while the Monitor waits for a key.** A game that seeds
  its random numbers from them gives a different game for each moment a
  key is pressed: drive the keys at fixed frames when a run must repeat.
- **DOS order and physical order.** A `.dsk` stores sectors in DOS 3.3's
  order, a `.po` in ProDOS's; a sector number in an address field is
  physical. A loader with a table of its own reads its own order
  (`kit/apple2/disk.py`, `--order`).
- **A cracked image is not the original.** The 4am notes list each byte
  the crack changed: a protection check may be gone from the code, and a
  loader may have been replaced.
- **Undocumented opcodes.** None exists on the 65C02: a II Plus program
  that uses one does something else on the kit's machine, so the listing
  shows those bytes as data.

## Sources

The documents come first and the emulators after them; where they
disagree, the entry above says so. Each was read on 19 October 2026.

- **Apple IIe Technical Reference Manual**, Apple Computer, the 1987
  edition ("TRM 1987", for the enhanced IIe; Addison-Wesley), read as the
  Internet Archive's OCR text,
  `https://archive.org/download/apple-iie-technical-reference-manual-1987-edition/Apple%20IIe%20Technical%20Reference%20Manual%20(1987%20Edition)_djvu.txt`;
  and the 1985 edition ("TRM 1985"),
  `https://archive.org/download/Apple_IIe_Technical_Reference_Manual/Apple_IIe_Technical_Reference_Manual_djvu.txt`.
  Copyright Apple. Cited by page, table, chapter or appendix; Appendix J
  is the enhanced IIe's Monitor and 80-column firmware listing, cited as
  "the listing". Read 19 October 2026.
- **Understanding the Apple IIe**, Jim Sather, Quality Software, 1985
  ("Sather"), the Internet Archive's OCR text,
  `https://archive.org/download/Understanding_the_Apple_IIe/Understanding_the_Apple_IIe_djvu.txt`.
  Copyright its author. Cited by page ("Sather p. 5-24"). Read 19 October
  2026.
- **Beneath Apple DOS**, Don Worth and Pieter Lechner, Quality Software,
  fourth printing, May 1982 ("BAD"),
  `https://archive.org/download/beneath-apple-dos/Beneath%20Apple%20DOS_djvu.txt`.
  Copyright its authors. Cited by page or chapter. Read 19 October 2026.
- **Beneath Apple ProDOS**, Don Worth and Pieter Lechner, Quality
  Software, second printing, March 1985 ("BAP"),
  `https://archive.org/download/bapdos/BeneathAppleProDOS_djvu.txt`.
  Copyright its authors. Cited by chapter. Read 19 October 2026.
- **ProDOS 8 Technical Reference Manual**, Apple Computer ("ProDOS TRM"),
  `https://archive.org/download/Apple_ProDOS_8_Technical_Reference_Manual/Apple_ProDOS_8_Technical_Reference_Manual_djvu.txt`.
  Copyright Apple. Cited by section. Read 19 October 2026.
- **Apple II Reference Manual**, Apple Computer, 1979,
  `https://archive.org/download/Apple_II_Reference_Manual_1979_Apple/Apple_II_Reference_Manual_1979_Apple_djvu.txt`,
  for the Monitor's documented names. Copyright Apple. Read 19 October
  2026.
- **Inside the Apple IIe**, Gary B. Little, Brady, 1985,
  `https://archive.org/download/InsideTheAppleIIe/Inside%20the%20Apple%20IIe_djvu.txt`,
  consulted for the keyboard and the 80-column firmware. Copyright its
  author. Read 19 October 2026.
- **The Mockingboard manual**, Sweet Micro Systems, read as the Internet
  Archive's OCR text,
  `https://archive.org/download/Mockingboard_Docs/Mockingboard_Docs_djvu.txt`.
  Copyright Sweet Micro Systems. Cited by table and appendix. Read 19
  October 2026.
- **WOZ disk image reference 2.1**, John K. Morris (Applesauce), 16 June
  2021, `https://applesaucefdc.com/woz/reference2/`. Cited as "WOZ 2.1".
  Read 19 October 2026.
- **a2audit**, Zellyn Hunter's test disk for Apple II emulators, whose
  expected results describe real machines (MIT,
  `https://github.com/zellyn/a2audit`, commit 6fdcedf of 21 March 2025):
  audit/langcard.asm and audit/softswitch.asm, cited by file. Read 19
  October 2026.
- **SourceGen's Apple symbol files**, faddenSoft (Apache-2.0,
  `https://github.com/fadden/6502bench`, SourceGen/RuntimeData/Apple):
  Applesoft.sym65, Cxxx-IO.sym65 and F8-ROM.sym65, used to check names
  and addresses; Applesoft.sym65 credits *What's Where in the Apple* by
  William F. Luebbert and the S-C DocuMentor for Applesoft by Bob
  Sander-Cederlof. Read 19 October 2026.
- **Apple2TS 3.7.0**, Chris Torrence's emulator (MIT,
  `https://github.com/ct6502/apple2ts`, tag v3.7.0, commit c900979). The
  kit installs its src/ folder in `tools/apple2/apple2ts/`
  (`kit/apple2/tools.py`), so a line cited as "Apple2TS,
  src/worker/memory.ts:812" can be read there: src/worker/memory.ts,
  motherboard.ts, softswitches.ts, instructions.ts, nsc.ts,
  devices/joystick.ts, devices/mockingboard.ts, and
  src/common/utility.ts. Read 19 October 2026.
- **The ROMs Apple2TS 3.7.0 ships** in src/worker/roms/: the enhanced
  IIe's (rom_2e.ts), whose halves match MAME 0.289's 342-0304-A
  ($C000-$DFFF) and 342-0303-A ($E000-$FFFF) by CRC-32 and SHA-1; the
  unenhanced IIe's and the II Plus's (rom_2e_unenhanced.ts, rom_2+.ts);
  and the Disk II's 341-0027-A (slot_disk2_cx00.bin), which matches
  MAME's the same way. Disassembled as 65C02 code and cited as "ROM
  $xxxx" and "Boot ROM $xxxx". Apple's, and never committed. Read 19
  October 2026.
- **MAME 0.289** (tag mame0289; the files cited are BSD-3-Clause,
  `https://github.com/mamedev/mame`): src/mame/apple/apple2e.cpp,
  apple2video.cpp and apple2gs.cpp, src/devices/bus/a2bus/a2mockingboard.cpp,
  src/devices/sound/ay8910.cpp, and src/devices/cpu/m6502/w65c02.cpp,
  dw65c02.lst, ow65c02.lst and om6502.lst. Cited by file and line. Read
  19 October 2026.
- **The kit's machine** ("live"): Apple2TS 3.7.0's IIe run headless under
  Node by the server of the platform's evaluation, the forerunner of
  `kit/apple2/apple2ts_server.mjs`, with the same slots (3: the extended
  80-column card, 4: Mockingboard, 6: Disk II) and the same changes
  (game patches and the slot-7 timer off, a seeded random generator).
  The boot checks used test disks of their own, never a game. Every
  live value was read on 19 October 2026.
- **The kit's own tables**: `kit/apple2/registers.py` (soft switch
  names), `kit/apple2/monitor.py` (Monitor names, each run by its
  `--check` on 19 October 2026), `kit/apple2/snapshot.py`,
  `kit/apple2/disk.py` and `kit/cpu/m65c02.py`. Read 19 October 2026.
- **The sites in "Where to read about a game first"**, fetched by a
  script on 19 October 2026 to see what each returns. Nothing in the rest
  of this file rests on them.
