---
name: steps
description: Which of the kit's tools each core step uses on the Apple II - the snapshot, the disk's files, the disassembler, the register census, the references search, the processor's idioms, the simulator, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
---

# The core steps on the Apple II

The core skills (`kit/skills/core/`) say what each step needs and name a
row of this table where a tool does it; this says which tool does it on
the kit's Apple II, a 128K enhanced Apple IIe. The machine's facts are in
`apple2-reference`, and how to drive the emulator and the disassembler in
`tool-apple2ts` and `tool-regen2000`. Every script prints its usage with
`-h`, and every JavaScript file's header is its manual.

| Row | Core step | On the Apple II |
|---|---|---|
| `snapshot` | `10-orient`, `50-coverage`: the image everything is read from | a `.json`, saved by the kit's Apple2TS server (`tool-apple2ts`, "Snapshots") and read by `kit/apple2/snapshot.py`: main memory, with the language card's RAM at $D000-$FFFF; auxiliary memory and the language card's other bank are parts with a `bank` (`kit/scripts/parts.py`). The hand-over is `work/entry.json` |
| `media` | `10-orient`, step 7: the files on the disk | Apple2TS takes a WOZ image, which keeps a protected original's bits, or a 16-sector `.dsk`, `.do` or `.po` (`tool-apple2ts`, "Disks"). `python3 kit/apple2/disk.py info <image>` says how each track is formatted and which sectors read; `catalog` and `extract` read a DOS 3.3 or DOS 3.2 disk's files, a binary file's load address included; `read` and `sectors` read sectors in DOS's, ProDOS's or a loader's own order; `nibbles` shows a track's fields, for a disk whose marks a protection has changed. A ProDOS disk's files are not read yet: its sectors are |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | regenerator2000, live, in its Apple II mode, through `kit/apple2/r2000.py` (`tool-regen2000`); `symbols_export.py <game>` reads the running session, and `coverage.py --live` its figure. It does not know the 65C02 (`tool-regen2000`, Traps) |
| `census` | `40-sweep`, the register census | `python3 kit/cpu/census.py <game or part dir> [<snapshot.json>] [--live]`: the soft switches by page, each slot's I/O, the disk drive in slot 6 and the Mockingboard in slot 4, with the repeats folded where `kit/apple2/registers.py` gives them: the speaker, the cassette output, the game port's strobe and the paddle trigger anywhere in their sixteen addresses, and the language card's switches at +4 |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | `python3 kit/cpu/opcodes.py <game> [<snapshot.json>] [--live] --refs <address>`, as on the C64, with the 65C02's table (`kit/cpu/m65c02.py`) |
| `cpu` | `50-coverage`, inline arguments and jump tables | the enhanced IIe's 65C02. The NMOS 6502's idioms hold (`kit/skills/cpu/6502`), and `apple2-reference`, "The 65C02", has what it adds, `jmp (abs,x)` among them. A game written for the II or II+ is NMOS code, whose undocumented opcodes the 65C02 runs as no-ops |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/cpu/cpu6502.js` bare, `new CPU(mem)`, with a snapshot's main memory: all 64 KB are RAM, so the soft switches are plain bytes the test sets, and a hook (`hooks`) stands in for each Monitor call the routine makes. It is the NMOS 6502 and knows none of the 65C02's 27 opcodes, so a routine that uses one runs in Apple2TS instead (`set-registers`, `until`, `tool-apple2ts`); `strict: true` stops on any undocumented opcode, which on this machine is a no-op |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | none yet: drive the game in Apple2TS through the kit's server (`tool-apple2ts`). A Play tab's lockstep needs a machine built first, in `kit/apple2/` |
| `lockstep` | `70-minisite`, Play (`play.md`) | none yet |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | `Apple2.render` and `Apple2.draw` in `site/lib/apple2.js` draw lo-res, hi-res, double hi-res and double lo-res from memory, and `kit/apple2/test_frame.py` holds them to `kit/apple2/screen.py` at every pixel. The server draws nothing, so `screen.py` is the kit's one picture of the screen, its hi-res colours an approximation of what a TV shows (`tool-apple2ts`, "The screen, the text and the sound"). The page shows a game's text as text. A game that changes modes as the beam passes has no frame recorder yet |
| `sound` | `70-minisite`, "The sound" | none yet on a page: `sound` in the kit's server records the speaker's clicks and every change to the Mockingboard's sound chip registers, with their cycles (`tool-apple2ts`), and a page needs a player for that log written first. Say in the caption what the page plays |
| `fixes` | `60-verify`, the checker's corrections | `python3 kit/apple2/r2000.py --apply fixes.json`, the C64's client and format |
| `page` | `70-minisite`, "Building it" | `site/lib/apple2.js` (`Apple2.render`, `Apple2.draw`, `Apple2.textBase`, `Apple2.hiresBase`, and `Apple2Map`, the footprint widget), and `lib/cpu6502.js` as `C64Cpu`, used bare, for routines in the NMOS 6502's instructions |
