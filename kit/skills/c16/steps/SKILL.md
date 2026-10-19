---
name: steps
description: Which of the kit's tools each core step uses on the Commodore 16 and Plus/4 - the snapshot, the tape's and the disk's files, the disassembler, the register census, the references search, the processor's idioms, the simulator, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
---

# The core steps on the Commodore 16 and Plus/4

The core skills (`kit/skills/core/`) say what each step needs and name a
row of this table where a tool does it; this says which tool does it on
the kit's TED machines, the Commodore 16 and the Plus/4, one platform:
the same KERNAL, BASIC and TED, with 16 KB of RAM on the C16 and 64 KB on
the Plus/4. The machine's facts are in `c16-reference`, and how to drive
the emulator and the disassembler in `tool-plus4emu` and
`tool-regen2000`. Every script prints its usage with `-h`, and every
JavaScript file's header is its manual.

| Row | Core step | On the C16 and Plus/4 |
|---|---|---|
| `snapshot` | `10-orient`, `50-coverage`: the image everything is read from | a `.p4emu`, plus4emu's own snapshot file with the kit's notes in it, saved by the kit's server (`tool-plus4emu`, "Snapshots") and read by `kit/c16/snapshot.py`: a C16's 16 KB once, at $0000-$3FFF, and a Plus/4's whole 64 KB, the RAM under the ROMs included. The hand-over is `work/entry.p4emu` |
| `media` | `10-orient`, step 7: the files on the tape or the disk | plus4emu takes a C16 TAP, or a WAV recording of a tape when it was built with libsndfile (`tape`); a D64 in drive 8 (`disk`); and a PRG or P00 put straight into memory (`program`) (`tool-plus4emu`, "Tapes, disks and program files"). `python3 kit/c64/disk.py <image>` lists a D64's files and `disk.py extract` writes them out, each with its load address first. No script reads a tape's files yet: load the tape in plus4emu, and read each header the KERNAL finds at $0333 (`c16-reference`, "Tapes") |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | regenerator2000, live, in its Plus/4 mode, on the project `tools.py r2000` builds from the snapshot, through `kit/c16/r2000.py` (`tool-regen2000`); `symbols_export.py <game>` reads the running session, and `coverage.py --live` its figure |
| `census` | `40-sweep`, the register census | `python3 kit/cpu/census.py <game or part dir> [<snapshot.p4emu>] [--live]`: TED at $FF00-$FF1F, the ROM and RAM switches at $FF3E-$FF3F, the ROM banking port at $FDD0-$FDDF, the disk drive's ports at $FEC0 and $FEF0, and the CPU's port at $00-$01, with the repeats folded where `kit/c16/registers.py` gives them: the ACIA every four bytes and each 6529 through its sixteen. The rows for $FF3E and $FF3F say where a Plus/4 game pages the ROMs out (`tool-regen2000`, "The RAM under the ROMs") |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | `python3 kit/cpu/opcodes.py <game> [<snapshot.p4emu>] [--live] --refs <address>`, as on the C64. On a C16 the same byte of RAM has four addresses, $1234, $5234, $9234 and $D234: ask for each (`tool-regen2000`, Traps) |
| `cpu` | `50-coverage`, inline arguments and jump tables | the 7501 or 8501, an NMOS 6502 with the 6510's port at $00-$01: `kit/skills/cpu/6502`. The KERNAL's PRIMM takes the text after its `JSR $FF4F` as an inline argument (`c16-reference`, "The KERNAL") |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/cpu/cpu6502.js` bare, `new CPU(mem)`, with the snapshot's RAM: all 64 KB are RAM, so TED's registers are plain bytes the test sets, and a hook (`hooks`) stands in for each KERNAL call the routine makes. The C16's repeats of its 16 KB are not modelled: a routine that reaches its RAM above $3FFF needs the test to copy the bytes there and read its writes back from there |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | none yet: drive the game in plus4emu through the kit's server (`tool-plus4emu`). A Play tab's lockstep needs a machine built first, in `kit/c16/` |
| `lockstep` | `70-minisite`, Play (`play.md`) | none yet |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | `C16.render` and `C16.draw` in `site/lib/c16.js` draw TED's text, multicolour, extended colour and bitmap modes from memory and TED's registers. `python3 kit/c16/frame.py test` holds them to plus4emu's picture at every pixel, run by hand after a change because it needs the server, and `kit/c16/test_frame.py` holds them to `c16-reference` in CI. A game that changes TED's registers as the beam passes has no frame recorder yet |
| `sound` | `70-minisite`, "The sound" | none yet on a page: `sound` in the kit's server records every write to TED's sound registers with its cycle (`tool-plus4emu`, "The screen, the text and the sound"), and a page needs a player for that log written first. Say in the caption what the page plays |
| `fixes` | `60-verify`, the checker's corrections | `python3 kit/c16/r2000.py --apply fixes.json`, the C64's client and format |
| `page` | `70-minisite`, "Building it" | `site/lib/c16.js` (`C16.render`, `C16.rgba`, `C16.draw`, `C16.rgb`, `C16.css`, and `C16Map`, the footprint widget), and `lib/cpu6502.js` as `C64Cpu`, used bare. The footprint draws $0000-$3FFF, the C16's RAM (`PLATFORM_MAP_SPAN` in `kit/scripts/build.py`): a game that uses the Plus/4's other 48 KB needs it widened there first |
