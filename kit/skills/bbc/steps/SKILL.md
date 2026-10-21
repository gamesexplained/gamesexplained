---
name: steps
description: Which of the kit's tools each core step uses on the BBC Micro - the snapshot, the disc's files, the disassembler, the register census, the references search, the processor's idioms, the simulator, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
---

# The core steps on the BBC Micro

The core skills (`kit/skills/core/`) say what each step needs and name a
row of this table where a tool does it; this says which tool does it on
the BBC Micro Model B. The machine's facts are in `bbc-reference`, and
how to drive the emulator and the disassembler in `tool-jsbeeb` and
`tool-regen2000`. Every script prints its usage with `-h`, and every
JavaScript file's header is its manual. A game written in BBC BASIC is
read through `kit/bbc/basic.py` (`bbc-reference`, "A game written in
BASIC").

| Row | Core step | On the BBC Micro |
|---|---|---|
| `snapshot` | `10-orient`, `15-parts`, `50-coverage`: the image everything is read from | a `.json.gz`, saved by the kit's jsbeeb server (`tool-jsbeeb`, "Snapshots") and read by `kit/bbc/snapshot.py`; the hand-over is `work/entry.json.gz` |
| `media` | `10-orient`, step 7; `15-parts`, step 6: the files on the disc | jsbeeb loads a disc (`.ssd`, `.dsd`, or `.hfe` for a flux image of a protected original) or a tape (`.uef`) (`tool-jsbeeb`, "Discs and tapes"); `*CAT` in the emulator lists a disc's files, and `bbc-reference`, "Loading", gives the catalogue's layout, each file's load address included. The kit has no script that writes the files out yet |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | regenerator2000, live, in its BBC Micro mode, through `kit/bbc/r2000.py` (`tool-regen2000`); `symbols_export.py <game>` reads the running session. A BASIC program is typed as BASIC and listed by `kit/bbc/basic.py` |
| `census` | `40-sweep`, the register census | `python3 kit/cpu/census.py <game or part dir> [<snapshot.json.gz>] [--live]`: SHEILA, FRED and JIM, the repeats folded where `bbc-reference`, "SHEILA", gives them. A BASIC game's chips are reached through the MOS: read its `SOUND`, `ENVELOPE`, `*FX` and `VDU` statements instead |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | `python3 kit/cpu/opcodes.py <game> [<snapshot.json.gz>] [--live] --refs <address>`, as on the C64. In a BASIC program, search the listed text for the variable, and for a `PROC` or `FN` its name |
| `cpu` | `50-coverage`, inline arguments and jump tables | the Model B's NMOS 6502: `kit/skills/cpu/6502` |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/cpu/cpu6502.js` bare, `new CPU(mem)`: all 64 KB are RAM, so a hook (`hooks`) stands in for each MOS call the routine makes. A BASIC routine is run in jsbeeb instead, and its variables read with `basic.py`'s `variable()` |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | none yet: drive the game in jsbeeb through the kit's server (`tool-jsbeeb`). A Play tab's lockstep needs a machine built first, in `kit/bbc/` |
| `lockstep` | `70-minisite`, Play (`play.md`) | none yet |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | `BBC.render` and `BBC.drawScreen` in `site/lib/bbc.js` draw modes 0 to 6 from screen memory, and `BBC.screen7`, `BBC.cells` and `BBC.drawTeletext` mode 7; `kit/bbc/frame.py test` holds both to jsbeeb's picture. A game that changes the video registers within a frame has no frame recorder yet |
| `sound` | `70-minisite`, "The sound" | `site/lib/sn76489.js` (`BBCSound`) plays a recording of every byte written to the SN76489, made with jsbeeb's `sound` capture (`tool-jsbeeb`, "The screen, the text and the sound"). It holds what the MOS wrote for `SOUND` and `ENVELOPE` too, so a BASIC game's tunes are recorded the same way. Say in the caption that the page plays what the chip was sent |
| `fixes` | `60-verify`, the checker's corrections | `python3 kit/bbc/r2000.py --apply fixes.json`, the C64's client and format |
| `page` | `70-minisite`, "Building it" | `site/lib/bbc.js` (`BBC.load` and the drawing above), `site/lib/sn76489.js`, and `lib/cpu6502.js` as `C64Cpu`, used bare |
