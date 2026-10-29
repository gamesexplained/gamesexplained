# Adding a platform

The kit is split by platform in two places. `kit/skills/core/` and
`kit/scripts/` are shared by every machine; `kit/skills/<platform>/` and
`kit/<platform>/` are one machine. The Commodore 64 was the first platform,
and it is the worked example for the next one.

## What a platform owns

| Path | Contents | The C64's |
|---|---|---|
| `kit/skills/<platform>/<machine>-reference/` | facts about the machine, consulted rather than recalled: memory map, registers, timing | `kit/skills/c64/c64-reference` |
| `kit/skills/<platform>/tool-<name>/` | one skill per tool: how to drive it, what it gets wrong | `tool-vice-mcp`, `tool-regen2000` |
| `kit/skills/<platform>/steps/` | which tool does each step the core skills name, one row each: `snapshot`, `media`, `disassembler`, `census`, `references`, `cpu`, `simulator`, `machine`, `lockstep`, `frame`, `sound`, `fixes`, `page`. A row the machine has no tool for says "none yet" and what to do instead; `check_docs.py` requires every row | `kit/skills/c64/steps` |
| `kit/<platform>/INSTALL.md` | the tools, how to get them, sizes, what they leave behind, what is known to work per operating system, and the emulator's pass/fail per phase of `kit/EMULATOR.md` | `kit/c64/INSTALL.md` |
| `kit/<platform>/tools.py` | the launcher: starts, checks, stops and contains the tools; `kit/scripts/tools.py` hands commands to it. It declares `COMMANDS` (what its `main()` accepts) and `TOOL_NAMES` (the tool names `stop` takes) as module-level tuples, which the dispatcher reads to pick the platform when there are several; `kit/scripts/test_tools.py` checks the declaration against `main()`. The platform's own scripts call the dispatcher with `--platform <name>`. What is not about a machine (port probing, the pseudo-terminal wrapper, starting and stopping a tool, telling this clone's tools from another clone's, the shared-library check, the macOS `.dmg` unpack, and `verify-footprint`'s walk and verdict) is in `kit/scripts/launcher.py`: import it rather than copy it | `kit/c64/tools.py` |
| `kit/<platform>/<tool>.py` | a scripting client per tool, for the loops that are too slow as single calls | `vice.py`, `r2000.py` |
| `kit/<platform>/registers.py` | the I/O registers by name, `NAMES`, for the operands of the Source tab; without it an operand that sees the chips shows its address | `kit/c64/registers.py` |
| `kit/<platform>/check_emulator.py` | `kit/EMULATOR.md`'s tests as a script with its own test program, one name per check; the launcher runs it as `check-emulator` | `kit/c64/check_emulator.py` |
| `kit/skills/<platform>/tool-<emulator>/workarounds.md` | what to do instead, one section per check that fails on some build | `tool-vice-mcp/workarounds.md` |
| `site/lib/<platform>.js` | what the page needs that is specific to the machine; a kit script a page runs as it is, such as the machine's processor, is served beside it from `kit/<platform>/` or `kit/cpu/` (`KIT_LIB` in `kit/scripts/build.py`) rather than copied | `c64.js`, and the memory map in `memmap.js`; `kit/cpu/cpu6502.js` as `lib/cpu6502.js` |
| `site/icons/platforms/<platform>.svg` | the machine's logo, or its maker's, in the corner of its games' cards on the home page: one colour (`currentColor`) on a 24-unit square, legible at 18 pixels, with a comment above the `<svg>` saying where it comes from; `kit/scripts/test_build_platform_icons.py` fails on a kit without one | `c64.svg`, the Commodore logo |
| `site/status.json` | the machine's entry under `systems` (its library size, with the source and the date it was read), and its cell in every row of `hosts`: what was measured on each kind of computer, and when | the `c64` entries |
| `site/credits.json` | an entry for each tool the kit installs, with who made it and a link, for the About page's thanks and the platform's status cards; the build fails on a kit that has none | `VICE`, `vice-mcp`, `regenerator2000` |

## Where the shared scripts branch on the platform

These already read `platform` from `game.json` and need one entry each:

- `kit/scripts/build.py`, the platform's display name.
- `kit/scripts/symbols_export.py`, the standard coverage exclusions (stack,
  I/O) and the screen and character set sizes. `coverage.py` and
  `listing.py` take their regions from here. `cpu` names the processor
  (`6502`, `z80`), which the shared 6502 tools in `kit/cpu/` check before
  they read a game, and `edges` the addresses where the ledger always
  starts a new region, so that one region never spans two of the
  machine's areas: the bottom of each memory bank, the screen, the ROMs. Two more entries serve
  `listing.py`'s check for data the ledger cannot see: `hidden`, RAM a
  default exclusion covers but a game can still use, and `system`, the
  machine's own work area, never reported as the game's. `hidden` is also
  where an operand has two meanings, the chips' and the RAM's, and
  `listing.py` picks one per instruction (on the C64,
  `kit/skills/c64/c64-reference`, "Code and tables under the I/O area"). `io_only` is where only the chips
  answer, with no RAM beneath (the BBC Micro's $FC00-$FEFF), so an operand
  there always gets the register's name. A machine whose screen always
  ends at the top of RAM gives `screen_top`, that address, in place of
  `screen_size`. `basic_start` is where BASIC's program starts, on a
  machine whose BASIC links each line to the next as Commodore's does:
  `check_listing.py` asks that a game's bytes there that hold such a
  link be named BASIC's.
- `kit/scripts/check_binaries.py`, the extensions and magic bytes of the
  platform's images and snapshots, so that none can ever be committed.
  Several platforms are listed already; check yours is.
- `kit/scripts/symbols_export.py` imports `kit/<platform>/r2000.py` for a
  live export. A different disassembler needs its own client and its own
  live and project readers.

## What the shared scripts load from a platform

The second platform lifted these seams, so a new machine fills them rather
than lifting them again. Each row is a file in `kit/<platform>/` and the
functions `kit/scripts/` calls on it; the ledger, the record format and the
contract `check_listing.py` enforces stay shared. A row that lists two
files is satisfied by either: `symbols_export.platform_fn` takes the first
one that exists, so a machine brings its own disassembler rather than a
copy of the C64's.

| `kit/<platform>/` | Provides | Called by |
|---|---|---|
| `cpu.py` | `decode(ram, a) -> (mnemonic, mode, nbytes) or None`, `operand(a, m, mode, bs, names, regs, chips) -> (text, target)`, `text_decode(kind, byte) -> str`, `TEXT_TYPES`, and optionally `text_items(kind, ram, start, end) -> (texts, starts) or None` for a text type whose items run over many bytes (the Spectrum's BASIC), and `sweep_runs(kind, ram) -> [(first, last, text)]` for a text type whose runs the string sweep must read whole (the C64's two character sets) | `listing.py`, through `platform_modules(platform)`; `kit/cpu/strings.py` |
| `snapshot.py` | `read(path) -> bytes`, one flat 64 KB image; exits, naming the format it saw, on anything else. A machine whose cartridges switch banks also takes `read(path, bank=n)`, the bank's chips at their addresses, for a bank's part (`kit/c64/crt.py`) | `listing.py` (the snapshot and the hand-over), `symbols_import.py` |
| `project.py` or `skoolkit.py` | `read_file(path) -> (blocks, symbols, comments)`, `write(gdir, snapshot, out=None) -> path` | `symbols_export.py` (`read_file`, `--project`/`--ctl`), `symbols_import.py` (`write`) |
| `r2000.py` or `skoolkit.py` | `read_live(gdir=None) -> (blocks, symbols, comments)` from the running disassembler; `gdir` is the game's folder or a part's (`kit/scripts/parts.py`), for a client that keeps a disassembler per part | `symbols_export.py` (`read_live`), `coverage.py --live` |
| `registers.py` | `NAMES`, the I/O registers by name, so an operand that sees the chips shows one; on a 6502 machine also `CENSUS_CHIPS`, `CENSUS_PAGES` and `CENSUS_OTHER`, the chips, pages and other addresses the register census groups its rows by | `listing.py`, `kit/cpu/census.py` |

A processor that two machines share lives in `kit/cpu/`: `m6502.py`, the
6502's opcode table, decoding and operand text; `asm6502.py`, the
assembler the C64's test programs and the BBC's are written in;
`opcodes.py`, the undocumented opcodes and the references search;
`census.py`, the register census, which takes the machine's chips from
its `registers.py`; `strings.py`, the string sweep, which takes its text
from the machine's `cpu.py` and so serves any processor; and `cpu6502.js`, the simulator the tests and the
pages run. Each machine's `cpu.py` re-exports `m6502.py` and adds its
own text: the C64's PETSCII and screen codes, the BBC Micro's ASCII. What
the core skills say about the processor's idioms is in
`kit/skills/cpu/<processor>/`. The Spectrum's `cpu.py`
re-exports `z80.py`, which moves to `kit/cpu/` when a second Z80 machine
arrives, and adds `basic.py`, the machine's BASIC as the ROM keeps it. Two pieces are still the C64's: `site/lib/memmap.js`
is one drawing for every machine but `kit/template/index.html` still names
its colour tokens after the C64.

A virtual machine that games on several machines share lives beside it,
in `kit/zmachine/`: Infocom's Z-machine, whose story file is the same on
every machine a game was sold for. It is no platform, with no `tools.py`
and no folder under `games/`: the platform's kit explains the machine's
interpreter, and `kit/zmachine/` reads the story, lists it as a part of
the game, runs it on an interpreter that traces it, and checks one
against the other (`kit/skills/cpu/zmachine`).

## The order of work

1. `kit/skills/<platform>/`: the machine reference and a skill per tool,
   written from documentation before any game is opened.
2. `kit/<platform>/`: install notes, launcher, clients. Run
   `verify-footprint` on your operating system and make it pass, as
   `kit/INSTALL.md` describes. Write the four emulator tests in
   `kit/EMULATOR.md` as `check_emulator.py`, run them, and record the
   pass/fail table in the install notes; a failure in state management or frame stepping with no
   workaround is the moment to pick another emulator, not after the
   first game.
3. The entries in the shared scripts, above.
4. Provide the platform's `cpu.py`, `snapshot.py` and its disassembler's
   `read_live`/`read_file`, as the table above sets out. The seams already
   exist; the machine fills them.
5. `site/lib/<platform>.js`, and whatever the memory map needs. Add the
   platform's cells to `site/status.json`: the build gives the status page
   a column for every kit it finds, and a host with no cell for yours reads
   "No run recorded". Add the emulator and disassembler to
   `site/credits.json`, with who made them.
6. Open the platform's pull request as `AGENTS.md` says, with `[kit-bump]`
   in its description, and merge it before any game is run on it. It adds no
   entry to `kit/lessons/`.
7. When the platform was written by a model that is not on the proven list
   (`kit/models.json`, `kit/scripts/models.py`), a maintainer checks the machine
   reference's facts and this platform's `INSTALL.md` measurements as
   `kit/CHECKING.md` sets out, and records the check beside those measurements.
   Do it before a game on the platform goes to Silver: every later run consults
   the reference instead of recalling the machine, so a wrong fact there is
   copied into all of them. The games a platform produces prove its models, not
   its reference.
8. Run one game through the whole workflow to Silver, in a pull request of
   its own, from a fresh start, as a contributor would. The retrospective on
   that game (`kit/skills/core/80-retro`) is where the seams you missed show
   up; fix them in that game's pull request. Its entry in `kit/lessons/` is
   not "added the platform" but what the game taught the kit about reverse
   engineering that the earlier machines did not.

## Two rules

- Do not refactor a seam ahead of its second consumer. With one platform
  the interface is a guess; the second platform tells you where the seam
  actually is.
- Platform facts go in `kit/skills/<platform>/` and platform code in
  `kit/<platform>/`, never in `kit/skills/core/` or `kit/scripts/`.
  `check_docs.py` enforces the first half.
