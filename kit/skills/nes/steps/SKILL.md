---
name: steps
description: Which of the kit's tools each core step uses on the NES - the snapshot, the cartridge, the disassembler, the register census, the references search, the processor's idioms, the simulator, the whole machine, the lockstep, the frame, the sound, the checker's fixes and the page's scripts. Read it beside the core skill that names a row.
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
| `snapshot` | `10-orient`, `50-coverage`: the image everything is read from | a `.json.gz`, saved by the kit's jsnes server (`tool-jsnes`, "Snapshots") and read by `kit/nes/snapshot.py`, which gives the CPU's 64 KB with the PRG banks the mapper had selected. A bank it had not selected is not in the snapshot: on a banked board, none yet; read it with the server's `prg` space and say so in `kit-feedback.md` |
| `media` | `10-orient`, step 7: what the cartridge holds | the iNES image itself: `cartridge` in the server describes it (mapper, PRG and CHR sizes, mirroring, the CRC32 NesCartDB lists), and `nes-reference`, "The cartridge image", gives the header's layout |
| `disassembler` | `10-orient`, step 6; `50-coverage`, the loop | none yet. regenerator2000 0.9.20, the C64's disassembler, ships a system file named `NES` with the PPU's and the APU's registers by name; the kit has no project writer for it. Until a run adds one in `kit/nes/`, beside the BBC's `kit/bbc/project.py`, read code with the server's `disassemble` |
| `census` | `40-sweep`, the register census | none yet: `kit/cpu/census.py` needs the machine's `registers.py`, which this platform does not have. Search the image for absolute operands in `$2000-$4017` by hand, and fold `$2008-$3FFF` onto `$2000-$2007` (`nes-reference`, "Memory map") |
| `references` | `50-coverage`, step 2; `60-verify`, "Negative results" | none yet: `kit/cpu/opcodes.py --refs` reads a game's blocks from its symbol map, which needs the disassembler above. Until then, search the snapshot's image for the address's two bytes and for its zero-page byte, and remember RAM's mirrors |
| `cpu` | `50-coverage`, inline arguments and jump tables | the 2A03's 6502, with no decimal mode (`nes-reference`, "The CPU"): `kit/skills/cpu/6502` |
| `simulator` | `60-verify`; `70-minisite`, a widget's test | `kit/cpu/cpu6502.js` bare, `new CPU(mem)`, on the image `snapshot.py` reads. All 64 KB are RAM to it: a routine that touches the PPU or the APU needs a hook (`hooks`) for those addresses. The simulator carries out NMOS decimal mode whenever D is set, which the 2A03 never does: check the routine and its callers for `SED` first, and if one is there, add an option to turn decimal off in `kit/cpu/cpu6502.js` rather than trusting the result |
| `machine` | `60-verify`, "Unreachable"; `70-minisite`, Play | none yet: drive the game in jsnes through the kit's server (`tool-jsnes`). A Play tab needs a machine built first, in `kit/nes/` |
| `lockstep` | `70-minisite`, Play (`play.md`) | none yet |
| `frame` | `10-orient`, step 3; `70-minisite`, "One frame, rebuilt from memory" | none yet: `screenshot` in the server is jsnes's picture. A page's drawing from the PPU's memory (`read` with `space: "ppu"` and `"oam"`) needs `site/lib/nes.js`, which a run on this platform writes, and a check against jsnes's picture |
| `sound` | `70-minisite`, "The sound" | none yet: `sound` in the server records every write to the APU (`tool-jsnes`, "The screen and the APU"); no page plays such a recording |
| `fixes` | `60-verify`, the checker's corrections | none yet: it goes with the disassembler |
| `page` | `70-minisite`, "Building it" | none yet: `site/lib/nes.js`, and `lib/cpu6502.js` as `C64Cpu`, used bare |
