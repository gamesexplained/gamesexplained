---
name: tool-regen2000
description: How to drive regenerator2000 on a Commodore 16 or Plus/4 game. Starting it on the kit's plus4emu snapshot in its Plus/4 mode, the kit's corrected system file and where it is read, how the KERNAL's names and the chips' registers come through to symbols.json and the listing, the RAM under the ROMs, and the traps that are the TED machines'. The rest is the C64's skill.
---

# regenerator2000 on the Commodore 16 and Plus/4

The disassembler is the one the C64 uses, installed once for every
machine: regenerator2000 0.9.20 from crates.io (`kit/c64/INSTALL.md`,
"Get the disassembler"). The client, the annotation log, `--apply`,
`--replay`, the tools that matter and most of the traps are the same on
every machine, and `kit/skills/c64/tool-regen2000` has them; read it
first. This file is what is different on the TED machines.

## Start

```
python3 kit/scripts/tools.py r2000 games/c16/<slug>/work/<state>.p4emu
python3 kit/c16/r2000.py --game games/c16/<slug> r2000_read_region '{"start_address": 4096, "end_address": 4351}'
python3 kit/scripts/symbols_export.py games/c16/<slug>
```

regenerator2000 cannot open the kit's plus4emu snapshot, so the launcher
always builds a project first (`kit/c16/project.py`): the snapshot's RAM
(a C16's 16 KB once at $0000-$3FFF, a Plus/4's whole 64 KB), the
annotations of the last export (none in a game's first session), and the
machine named as `"system": "Commodore Plus4"`. regenerator2000 has no
system for the C16, which runs the Plus/4's KERNAL and BASIC. With it the
session comments a call into the KERNAL's jump table with what the
routine does (`jsr KERNAL_BSOUT ; $FFD2 BSOUT output to channel`) and TED's
registers with their bits, instead of the C64's KERNAL and chips. Without
it the same session names the same addresses after the C64's, with
nothing to say so. Use `kit/c16/r2000.py`, the C64's client with the TED
machines' reading of a session, for every call and for `--apply`;
`symbols_export.py` and `coverage.py --live` load it for a C16 game
themselves.

## The system file

regenerator2000 0.9.20's own file for the Plus/4 has three of the jump
table's names at addresses where the ROM has no such routine (SETLFS,
CHOUT and CLRCH at $EF8A, $FEC9 and $FECC; the table has them at $FFBA,
$FFC9 and $FFCC), spells three others BASIN, SAVESP and UNTLK as 8ASIN,
SAYESP and UNTLR, leaves the four entries below $FF80 unnamed, has no
comment on TED's registers $FF00-$FF0D (the timers, the two control
registers, the keyboard latch, the interrupts and the cursor), and gives
bit 0 of $FF13 as the clock. `kit/c16/system-commodore_plus4.toml` is that
file corrected, each change checked against Commodore's KERNAL source and
the ROM or against `c16-reference`, and its header lists them.
`project.py` copies it to `tools/r2000-home/config/regenerator2000/`
every time it builds a project, and a session reads a system file there
in place of its own:

- **On Linux** the launcher points regenerator2000's settings at
  `tools/r2000-home/` (its XDG paths), so a session started by `tools.py
  r2000` reads the kit's file. Seen on 19 October 2026: `jsr $FFC9` came
  with the comment `$FFC9 CHOUT open channel out`, which the built-in
  file gives to $FEC9, and `lda $ff08` with the kit's comment on the
  keyboard latch.
- **On macOS** regenerator2000 keeps its settings in
  `~/Library/Application Support/regenerator2000/`, whatever the
  launcher says (`kit/c64/INSTALL.md`, "Uninstall"), and the kit writes
  nothing outside the repository, so the session reads its built-in
  file: no comment on `jsr $FFBA`, `$FFC9` or `$FFCC`, none on
  $FF00-$FF0D, and a wrong one on $EF8A, $FEC9 and $FECC, where a game
  can have code of its own.
- **On Windows** nobody has run it.

Either way `symbols.json` gets the kit's names: `kit/c16/r2000.py` leaves
the built-in file's three misplaced names out, and names every entry
point of the jump table the game refers to from `kit/c16/kernal_ted.py`,
whatever the session called it. Read the comments in a session on macOS
with that in mind.

## What comes through, and how

- **Text is the C64's.** The TED machines print PETSCII and draw the C64's
  screen codes from a character ROM in the C64's order (`c16-reference`,
  "TED"), so type a string `petscii` or `screencode` exactly as on the
  C64, and the session, `symbols.json` and the listing read it right. A
  string in an alphabet of the game's own is typed `byte`, its text in the
  comment.
- **The KERNAL's names come from the export.** A session keeps a
  jump-table name only where its first analysis found the code calling
  it; a call it traces later gets an automatic label (`s_FFD2`), as on the
  C64. `kit/c16/r2000.py` names each entry the game refers to in
  `symbols.json` (`KERNAL_BSOUT`, `KERNAL_PRIMM`, `KERNAL_SCNKEY`, and the
  rest of `c16-reference`, "The KERNAL"), and the listing shows `jsr
  KERNAL_BSOUT`. `python3 kit/c16/kernal_ted.py` prints the table.
- **The chips are named by the listing.** No RAM is ever seen at
  $FD00-$FF3F, so `listing.py` names every operand there after the
  register (`ted_border`, `ted_irq_flags`, `keyboard_latch`, `rom_on`,
  `rom_bank_0`), from `kit/c16/registers.py`, whatever the session called
  it. The session itself shows $FC00-$FD30 and $FF00-$FF3F as bare
  addresses, which the system file keeps automatic labels off, with the
  file's comment where it has one (`sta $fd10 ; User Port PIO (P0-P7)`),
  and mints automatic labels for the rest of the area, such as `a_FDD0`
  and `a_FEF0`. Leave them. An address that only repeats a register (the
  keyboard latch answers on all of $FD30-$FD3F) keeps its address in the
  listing.

## The RAM under the ROMs

A C16's RAM is 16 KB, and the snapshot holds it once, at $0000-$3FFF. A
Plus/4 game can page the ROMs out (`STA $FF3F`) and keep code or tables in
the RAM beneath, at $8000-$FCFF and $FF40-$FFFF (`c16-reference`, "Memory
map"). The kit's defaults leave $4000-$FFFF out of coverage
(`symbols_export.py`), so for a game that uses that RAM:

1. Find it: the code map (`tool-plus4emu`, "What ran") lists code that ran
   above $3FFF, and `chips` says whether the ROMs were paged in (`rom`).
   A census of $FF3E and $FF3F (`kit/cpu/census.py`, `rom_ram`) finds
   where the game pages them, and of $FDD0-$FDDF (`rom_bank`) where it
   chooses among them.
2. Give the range back with `coverage.include` in `game.json`, and type it
   as for any other memory. A Plus/4 snapshot holds the RAM there whether
   or not the ROMs were paged in.
3. An operand there names the KERNAL's routine when the instruction lies
   outside the range, and the game's own label when it lies inside. Code
   outside that reads or writes the RAM there with the ROMs paged out
   goes in `game.json` under `io`, one row per stretch of such code,
   `["$1000", "$10FF", "ram", "the RAM paged in at $1003"]`, exactly as on
   the C64 (`kit/skills/c64/c64-reference`, "Code and tables under the I/O
   area").

When such a game keeps its own code at an address of the jump table, the
KERNAL's name is wrong for it: give the address a label of your own,
which wins over the name `kernal_ted.py` gives.

## Traps

- **Text after `JSR $FF4F` is decoded as code.** PRIMM prints the bytes
  after its `JSR` up to a $00 and returns past them (`c16-reference`, "The
  KERNAL"). The flow tracer does not know, so it reads the text as
  instructions and often runs on into the next routine misaligned: in a
  test on 19 October 2026, the `HI` and $00 after a `JSR $FF4F` came out as
  `pha` and `eor #$00`. Type the text `petscii`, the $00 with it, and the
  code after it `code`.
- **Following a call into the KERNAL types the image's zeros as code.**
  After a `JSR` into the jump table the flow tracer goes on into
  $FF40-$FFFF, which a C16 snapshot holds as zeros and a Plus/4's as the
  RAM beneath; in the same test, from `JSR $FF4F`, it typed $FF4F-$FFFF as
  code. That range is excluded from coverage
  and the listing leaves it out, so this costs nothing; set it back to
  `undefined` if the block list is to be read by eye, and before giving the
  range back for a Plus/4 game that does use it.
- **On a C16 the same RAM has four addresses.** $1234, $5234, $9234 and
  $D234 are one byte (`c16-reference`, "Memory map"), and the session and
  the listing hold it once, at $1234. A game that reaches its own code or
  data through one of the others (a pointer at $5000, or code run at $D000
  with the RAM paged in) refers to an address the listing does not hold:
  the cross-reference is lost, and `kit/cpu/opcodes.py --refs` finds it
  only when asked for each of the four. Say in the comment which address
  the game uses.
- **The zero page and page 3 come with the KERNAL's and BASIC's
  comments.** In the Plus/4 mode the session gives a zero-page cell the
  code uses an automatic label and the comment on what the KERNAL or
  BASIC keeps there (`lda zpa_A3 ; TIME Real-time jiffy clock`, `sta
  zpa_FB ; CURBNK Current bank configuration`), and the vectors in page 3
  the same (`lda a_0314 ; CINV IRQ Ram Vector`). A game that has taken the
  machine over uses those cells for its own variables. The comments never
  reach `symbols.json` (the client reads only comments of your own), but
  they mislead a reader of the session: read what the code does, and
  label the cell for what the game keeps there.
- **The CPU is the NMOS 6502's.** The 7501 and 8501 run its undocumented
  opcodes as the C64's 6510 does, and they come out as data just as on
  the C64 (its skill, Traps).
