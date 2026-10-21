---
name: steps
description: Which of the kit's tools each core step uses on the ZX Spectrum - the snapshot, the tape's files, the control file, the port census, the references search, the processor's idioms, the simulators, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
---

# The core steps on the ZX Spectrum

The core skills (`kit/skills/core/`) say what each step needs and name a
row of this table where a tool does it; this says which tool does it on
the ZX Spectrum, 48K and 128K. The machine's facts are in
`zx-spectrum-reference`, and how to drive the emulator and the
disassembler in `tool-zesarux` and `tool-skoolkit`. Every script prints
its usage with `-h`, and every JavaScript file's header is its manual.

| Row | Core step | On the ZX Spectrum |
|---|---|---|
| `snapshot` | `10-orient`, `15-parts`, `50-coverage`: the image everything is read from | a `.sna`, saved by ZEsarUX (`tool-zesarux`, "Snapshots"); the hand-over is `work/entry.sna`. A 128K game's is the 128K `.sna`, and `python3 kit/spectrum/banks.py parts` makes a part of each bank the processor did not see |
| `media` | `10-orient`, step 7; `15-parts`, step 6: the files on the tape | SkoolKit's `tapinfo.py` lists a `.tzx` or `.tap`'s blocks; the kit has no script of its own that writes them out yet |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | SkoolKit's control file, `work/<slug>.ctl`, written and read rather than a live session (`tool-skoolkit`); `symbols_export.py <game> --ctl work/<slug>.ctl` exports it. `50-coverage`, "When the disassembler does not follow control flow", applies from the start: `kit/spectrum/codemap.py` holds the typing against what ran |
| `census` | `40-sweep`, the register census | none: the machine's I/O is ports, not addresses (`zx-spectrum-reference`, "Ports"), and `kit/cpu/census.py` refuses it. List every `IN` and `OUT` in the code and the port each reaches, from its operand or from `BC` for `IN r,(C)` and `OUT (C),r`; a game reads few, usually `$FE` and a joystick's |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | `python3 kit/spectrum/codemap.py <game> <snapshot.sna> --refs <address>`, which also lists where the address is stored as a word |
| `cpu` | `50-coverage`, inline arguments and jump tables | the Z80 has no note of its own yet. A routine that takes arguments from the bytes after its call reads its return address with `POP HL` or `EX (SP),HL`, and `codemap.py --inline ADDR:N` tells the trace (`tool-zesarux`). An address pushed for `RET`, or jumped to with `JP (HL)`, is the handler's own, not one less as on the 6502 |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/spectrum/z80.js` in node; `python3 kit/spectrum/simulate.py <snapshot.sna> <addr> [REG=hex ...]` runs one routine in SkoolKit's simulator; `kit/scripts/port_check.py` holds a page's block against a simulator in Python |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | `kit/spectrum/machine.js` ("The machine", below) |
| `lockstep` | `70-minisite`, Play (`play.md`) | `kit/spectrum/lockstep.js`: `standIn` and `irqBytes`; a wait for the display is a `HALT` |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | the screen is one bitmap and its attributes at `$4000`, the same for the whole frame: `Spectrum.drawScreen` in `site/lib/spectrum.js` draws it from memory, and `python3 kit/spectrum/frame.py test` holds that drawing to ZEsarUX's picture, in both FLASH phases. A game that changes the border or the attributes as the beam passes has no frame recorder yet |
| `sound` | `70-minisite`, "The sound" | `site/lib/ay.js` ("The sound", below) |
| `fixes` | `60-verify`, the checker's corrections | no live disassembler takes them: correct the control file by address, matched on the old text, then export it and build the listing again (`symbols_export.py --ctl`, `listing.py`) |
| `page` | `70-minisite`, "Building it" | `site/lib/spectrum.js` (`Spectrum.load`, `drawScreen`, `drawCharset`), `site/lib/ay.js` |

## The machine

`kit/spectrum/machine.js` is the Z80 with the frame's interrupt, the
keyboard read through port `$FE` and contended memory around it, started
from a `.sna` or the listing's memory, counting passes where the main
loop begins. Given `model: 128` it is the 128 instead, with its frame,
its banks paged through `$7FFD` and its sound chip, and the lockstep
compares the banks out of view as well. `kit/spectrum/lockstep.js` runs a
port beside it.

It also runs a game headless much faster than real time, with typing
through the keyboard matrix, which makes it a way to play a game that
keeps its text in memory for hours in minutes and read what it printed
from RAM.

## The sound

`site/lib/ay.js` is the site's model of the 128's AY-3-8912 and of the
beeper, measured against ZEsarUX's own output, with a player and a piano
roll. It plays a recording of what the game's sound driver wrote to the
chip, one call of the driver at a time (the format is in its header).
Make the recording by running the game's own driver on the kit's Z80 from
the listing, one call for each time the game makes one, and keep a test
beside the page that makes it again from the listing and holds the
page's recording to it. Check a stretch against the emulator: ZEsarUX's
`get-io-ports` shows the AY's registers, and `--aofile` records what it
played (`tool-zesarux`). Say in the caption that the page plays the
game's own driver's writes.

The model has no envelope yet (registers 11 to 13, and bit 4 of a
volume): a recording that uses it plays wrong. The beeper is a level for
each call, so a tune made by toggling the speaker inside a timing loop
needs the times of its edges, which no shared script plays yet.
