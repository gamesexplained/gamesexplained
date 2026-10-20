---
name: tool-regen2000
description: How to drive regenerator2000 on an Apple II game. Starting it on the kit's Apple2TS snapshot in its Apple II mode, how the Apple II's text, the Monitor's names and the soft switches come through to symbols.json and the listing, the language card, and the traps that are the Apple II's, the 65C02 first. The rest is the C64's skill.
---

# regenerator2000 on the Apple II

The disassembler is the one the C64 uses, installed once for every
machine: regenerator2000 0.9.20 from crates.io (`kit/c64/INSTALL.md`,
"Get the disassembler"). The client, the annotation log, `--apply`,
`--replay`, the tools that matter and most of the traps are the same on
every machine, and `kit/skills/c64/tool-regen2000` has them; read it
first. This file is what is different on the Apple II.

## Start

```
python3 kit/scripts/tools.py r2000 games/apple2/<slug>/work/<state>.json
python3 kit/apple2/r2000.py --game games/apple2/<slug> r2000_read_region '{"start_address": 24576, "end_address": 24831}'
python3 kit/scripts/symbols_export.py games/apple2/<slug>
```

regenerator2000 cannot open the kit's Apple II snapshot, so the launcher
always builds a project first (`kit/apple2/project.py`): the snapshot's
main memory, the annotations of the last export (none in a game's first
session), and the machine named as `"system": "Apple II"`. That system
comes with regenerator2000 0.9.20, though its own menu does not list it.
It makes the session comment a call into the Monitor with what the
routine does and the zero-page cells with the Monitor's and Applesoft's
uses, instead of the C64's. Without it the same session names the same
addresses after the C64's KERNAL, with nothing to say so. The launcher
says which system it set as it starts. Use `kit/apple2/r2000.py`, the
C64's client with the Apple II's reading of a session, for every call and
for `--apply`; `symbols_export.py` and `coverage.py --live` load it for an
Apple II game themselves.

A part whose `part.json` has a `bank` (`aux`, `mainlc1`, `mainlc2`,
`auxlc1` or `auxlc2`, `kit/scripts/parts.py`) gets that bank's memory in
its project: auxiliary memory at $0000-$BFFF, or one bank of the language
card at $D000-$FFFF.

## What comes through, and how

- **Text is ASCII, typed as PETSCII.** regenerator2000 has no ASCII type.
  Type the Apple II's text `petscii`: `symbols.json` and the listing call it
  ASCII, and show a byte the same with bit 7 set or clear, as COUT prints
  it. Most games keep their messages with bit 7 set; the session itself
  shows those as PETSCII's graphics characters, which read as nonsense, so
  read the text in the listing or with `r2000_search_memory`. A string in
  an alphabet of the game's own is typed `byte`, its text in the comment.
- **The text screen's codes are typed as screencode.** A string a game
  copies straight onto the text page is in the screen's codes (inverse,
  flashing and normal: `apple2-reference`); type it `screencode`, and
  `symbols.json` and the listing call it Screen and read it as the IIe's
  character set shows it. `screencode` is the C64's character order and
  means nothing on the Apple II, which is why the kit gives it this use.
- **The Monitor's names come from the export.** In the Apple II mode the
  session shows a call into the Monitor with a comment saying what the
  routine does, and gives the Monitor's entry points no label of their own,
  not even an automatic one. `kit/apple2/r2000.py` names each the game
  refers to in `symbols.json` (`COUT`, `HOME`, `PREAD`, `WAIT`, and page 3's
  vectors: the Monitor's `BRKV`, `SOFTEV`, `IRQLOC` and the rest, and DOS
  3.3's `DOSWARM`, `RWTS` and the rest), from `kit/apple2/monitor.py`, and
  the listing shows `jsr COUT`. A game that never boots DOS can keep its own
  code or data on page 3, and then the name is wrong: give the address a
  label of your own, which wins. `python3 kit/apple2/monitor.py` prints the
  table.
- **The soft switches are named by the listing.** The session mints
  automatic labels such as `a_C030` on the I/O page's addresses. Leave them:
  no RAM lies under $C000-$CFFF, so `listing.py` names every operand there
  after the switch, from `kit/apple2/registers.py`, whatever the session
  called it. A switch that means one thing read and another written takes
  the write's name in a store (`sta clr80store` at $C000, `lda kbd` at the
  same address), an access to $C080-$C08F indexed by X or Y is a slot's own
  register, named as DOS 3.3 names the disk drive's (`lda q6l,x`), and the
  Mockingboard's two 6522s in slot 4 are `mb1_...` and `mb2_...`. An address
  that only repeats a switch keeps its address in the listing.

## The language card

The snapshot holds the language card's RAM at $D000-$FFFF, never the ROM,
because the ROM is not the game. Most games use the ROM there or nothing;
some load code or tables into the RAM. The kit's defaults leave $D000-$FFFF
out of coverage (`symbols_export.py`), so for a game that uses it:

1. Find it: the code map (`tool-apple2ts`, "What ran") lists code that ran
   at $D000-$FFFF, and `chips` says whether the RAM was switched in to be
   read (`lcram`) and which bank was at $D000 (`lcbank2`). A census of the
   language card's switches (`kit/cpu/census.py`, $C080-$C08F) finds where
   the game switches it. `listing.py` reports data it finds there.
2. Give the range back with `coverage.include` in `game.json`, and type it
   as for any other memory. The snapshot holds the bank that was switched
   in at $D000-$DFFF when it was saved; the other bank is a part of its
   own, read with `bank` (`mainlc1` or `mainlc2`).
3. An operand there names the ROM's routine when the instruction lies
   outside the range, as `jsr COUT` does, and the game's own label when it
   lies inside. Code outside that reads or writes the RAM there goes in
   `game.json` under `io`, one row per stretch of such code,
   `["$6000", "$60FF", "ram", "the language card's RAM switched in at $6003"]`,
   exactly as on the C64 (`kit/skills/c64/c64-reference`, "Code and tables
   under the I/O area").

Auxiliary memory is a part of its own the same way (`bank` `aux`).

## Traps

- **regenerator2000 knows no 65C02.** 0.9.20 decodes the NMOS 6502's
  documented instructions only, so the 27 opcodes the enhanced IIe's 65C02
  adds (`kit/cpu/m65c02.py`: `bra`, `phx`, `stz`, `tsb`, the `(zp)` forms
  and the rest) show as `.byte` lines marked "Invalid or partial
  instruction" inside a code block, as the C64's undocumented opcodes do,
  and the bytes after one are often decoded as instructions they are not.
  In a test of all 27 on 18 October 2026, the `$10` of `stz $10` came out
  as a `bpl`, and no cross-reference reached the target of a `bra`. The
  listing's decoder is the 65C02's, so a range typed `code` reads right on
  the Source tab whatever the session shows; what goes wrong is which bytes
  are typed code, and what refers to what. Near 65C02 code, type code by
  hand from the code map rather than trusting the flow tracer, find the
  targets of `bra` and `jmp (abs,x)` from the code itself, and run
  `python3 kit/cpu/opcodes.py <game> --live`, which lists the bytes inside
  code blocks that the 65C02 runs as no-ops, a sign of data typed as code.
  A game written for the II or II+ is NMOS code and has none of this.
- **Following a call into the ROM types the language card's RAM as code.**
  After `JSR $FDED` the flow tracer goes on into $D000-$FFFF, which the
  snapshot holds as the language card's RAM, often unwritten. Those bytes
  are excluded from coverage and the listing leaves them out, so this costs
  nothing; set them back to `undefined` if the block list is to be read by
  eye, and before giving the range back for a game that does use it.
- **The zero-page comments are the Monitor's and Applesoft's.** In the
  Apple II mode the session comments zero-page cells with what the Monitor
  and Applesoft keep there (the cursor, the text window, the input
  buffer's pointers). A game that has taken the machine over uses them for
  its own variables. The comments never reach `symbols.json` (the client
  reads only comments of your own), but they mislead a reader of the
  session: read what the code does.
- **An undocumented NMOS opcode is a no-op on the 65C02**, as Apple2TS runs
  it (`kit/cpu/m65c02.py`). Code written for the II or II+ that relies on
  one behaves differently on the enhanced IIe, and `opcodes.py` lists it as
  a no-op inside a code block.
