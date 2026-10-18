---
name: steps
description: Which of the kit's tools each core step uses on the NES: the snapshot, the cartridge, the disassembler, the register census, the references search, the processor's idioms, the simulator, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
---

# The core steps on the NES

The core skills (`kit/skills/core/`) say what each step needs and name a
row of this table where a tool does it; this says which tool does it on
the NES. The machine's facts are in `nes-reference`, and how to drive the
emulator in `tool-jsnes`. Every script prints its usage with `-h`, and
every JavaScript file's header is its manual. A row marked "none yet"
names what to do until a run on this platform builds the tool.

| Row | Core step | On the NES |
|---|---|---|
| `snapshot` | `10-orient`, `50-coverage`: the image everything is read from | a `.json.gz`, saved by the kit's jsnes server (`tool-jsnes`, "Snapshots") and read by `kit/nes/snapshot.py`, which gives the CPU's 64 KB with the PRG banks the mapper had selected; the RAM's mirrors and the chips' registers read as zero there, since they hold nothing of their own. An NROM-128 cartridge's 16 KB is at `$8000` and again at `$C000`: list the half the vectors do not point into under `coverage.exclude` in `game.json`, as "the PRG ROM's mirror", so that every byte is counted once. A bank the mapper had not selected is not in the snapshot: on a banked board, none yet; read it with the server's `prg` space and say so in `kit-feedback.md` |
| `media` | `10-orient`, step 7: what the cartridge holds | the iNES image itself: `cartridge` in the server describes it (mapper, PRG and CHR sizes, mirroring, the CRC32 NesCartDB lists), and `nes-reference`, "The cartridge image", gives the header's layout |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | regenerator2000 0.9.20, the C64's, in its NES mode, through `kit/nes/r2000.py` (`tool-regen2000`); `python3 kit/scripts/tools.py r2000 games/nes/<slug>/work/<state>.json.gz` builds the project from the snapshot and starts it, and `symbols_export.py <game>` reads the running session |
| `census` | `40-sweep`, the register census | `python3 kit/cpu/census.py <game> [<snapshot.json.gz>] [--live]`: the PPU's eight registers with their repeats to `$3FFF` folded, then the APU's and the I/O registers, named from `kit/nes/registers.py`. What it cannot see, such as an access through a pointer, is in its header |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | `python3 kit/cpu/opcodes.py <game> [<snapshot.json.gz>] [--live] --refs <address>`, as on the C64. It does not fold the mirrors: for a RAM address, search its three mirrors too (`$0800`, `$1000` and `$1800` above it), and for a PPU register its repeats |
| `cpu` | `50-coverage`, inline arguments and jump tables | the 2A03's 6502, with no decimal mode (`nes-reference`, "The CPU"): `kit/skills/cpu/6502` |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/cpu/cpu6502.js` bare, `new CPU(mem)`, on the image `snapshot.py` reads. All 64 KB are RAM to it: a routine that touches the PPU or the APU needs a hook (`hooks`) for those addresses. The simulator carries out NMOS decimal mode whenever D is set, which the 2A03 never does: check the routine and its callers for `SED` first, and if one is there, add an option to turn decimal off in `kit/cpu/cpu6502.js` rather than trusting the result |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | none yet: drive the game in jsnes through the kit's server (`tool-jsnes`). A Play tab needs a machine built first, in `kit/nes/` |
| `lockstep` | `70-minisite`, Play (`play.md`) | none yet |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | `NES.frame` in `site/lib/nes.js` draws the background and the sprites from the PPU's memory (`snapshot.py`'s `ppu`, `oam` and `registers`); `python3 kit/nes/frame.py draw <snapshot> <out.png>` draws a snapshot with it, and `kit/nes/frame.py test` holds it to jsnes's picture. Four things jsnes draws wrongly are listed there: its screenshot is not the console's at the edges or for 8 by 16 sprites from `$1000`. A game that changes the scroll part way down the screen is drawn in bands, one call each, with no recorder yet to say where they are |
| `sound` | `70-minisite`, "The sound" | none yet: `sound` in the server records every write to the APU (`tool-jsnes`, "The screen and the APU"); no page plays such a recording |
| `fixes` | `60-verify`, the checker's corrections | `python3 kit/nes/r2000.py --apply fixes.json`, the C64's client and format |
| `page` | `70-minisite`, "Building it" | `site/lib/nes.js` (`NES.PALETTE`, `NES.tile`, `NES.frame`, `NES.draw`), and `lib/cpu6502.js` as `C64Cpu`, used bare. A page carries the tiles and nametables it draws as data, and loads the script itself, `<script src="../../lib/nes.js">`, as the BBC's pages do; the build adds it only to the About page, for the footprint |
