---
name: tool-regen2000
description: How to drive regenerator2000 on an NES game. Starting it on the kit's jsnes snapshot in its NES mode, how the PPU's and the APU's registers and the game's text come through to symbols.json and the listing, and the traps that are the NES's. The rest is the C64's skill.
---

# regenerator2000 on the NES

The disassembler is the one the C64 uses, installed once for every
machine: regenerator2000 0.9.20 from crates.io (`kit/c64/INSTALL.md`, "Get
the disassembler"). The client, the annotation log, `--apply`, `--replay`,
the tools that matter and most of the traps are the same on every machine,
and `kit/skills/c64/tool-regen2000` has them; read it first. This file is
what is different on the NES.

## Start

```
python3 kit/scripts/tools.py r2000 games/nes/<slug>/work/<state>.json.gz
python3 kit/nes/r2000.py --game games/nes/<slug> r2000_read_region '{"start_address": 49152, "end_address": 49407}'
python3 kit/scripts/symbols_export.py games/nes/<slug>
```

regenerator2000 cannot open the kit's NES snapshot, so the launcher always
builds a project first (`kit/nes/project.py`): the CPU's 64 KB from the
snapshot, the annotations of the last export (none in a game's first
session), and the machine named as `"system": "NES"`. It says so as it
starts. Use `kit/nes/r2000.py`, the C64's client with the NES's reading of
a session, for every call and for `--apply`; `symbols_export.py` and
`coverage.py --live` load it for an NES game themselves.

Start the reading at the vectors, the last six bytes: `$FFFC` is reset,
`$FFFA` the NMI, nearly always the frame handler, and `$FFFE` the IRQ
(`nes-reference`, "Memory map").

## What comes through, and how

- **The registers are commented, and named by the listing.** In NES mode
  the session comments each instruction that names a PPU or APU register
  (`sta a_2000 ; PPUCTRL ...`) but labels the address only automatically.
  Leave those labels: no RAM lies under `$2000-$401F`, so `listing.py`
  names every operand there after the register (`PPUCTRL`, `OAMDMA`,
  `JOY1`) from `kit/nes/registers.py`, whatever the session called it.
  `$4017` is `JOY2_FRAME` there: read, controller 2; written, the APU's
  frame counter.
- **Text is ASCII, typed as PETSCII,** for the few games whose font sits
  at the ASCII places. regenerator2000 has no ASCII type; type such text
  `petscii`, and `symbols.json` and the listing call it ASCII. Most games
  number their letters in the order they drew their font: type those
  strings `byte`, with the words in the comment, and the alphabet in
  `facts.md` (`kit/skills/core/30-text`). Never type anything
  `screencode`: it is the C64's order, and the export stops on it.

## Traps

- **An NROM-128 cartridge is in the image twice.** Its 16 KB is at `$8000`
  and again at `$C000` (`nes-reference`, "Mappers"). Annotate the half the
  vectors point into, set the other to `undefined`, and exclude it in
  `game.json` (`steps`, "snapshot"), or every routine is counted twice.
- **The tiles are not in the image.** The CHR ROM is the PPU's, not the
  CPU's: the snapshot's 64 KB has no graphics in it. Read the tiles with
  `kit/nes/snapshot.py`'s `ppu`, or the server's `chr` space, and draw them
  with `site/lib/nes.js` (`steps`, "frame").
- **`$0800-$5FFF` is zero in the image.** The RAM's mirrors and the chips'
  registers hold nothing of their own there (`kit/nes/snapshot.py`). A
  `JSR` or `JMP` into that range is data typed as code.
- **A store to ROM is a mapper's register** on a board that switches
  banks: `sta $8000` changes which bank is mapped, and the code after it
  may run from another bank, which the snapshot does not hold
  (`nes-reference`, "Mappers"; `steps`, "snapshot").
- **Undocumented opcodes come out as data**, as on the C64: the 2A03 runs
  them (`nes-reference`, "The CPU"), and `kit/cpu/opcodes.py` finds them.
