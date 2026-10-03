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
| `kit/<platform>/INSTALL.md` | the tools, how to get them, sizes, what they leave behind, what is known to work per operating system, and the emulator's pass/fail per phase of `kit/EMULATOR.md` | `kit/c64/INSTALL.md` |
| `kit/<platform>/tools.py` | the launcher: starts, checks, stops and contains the tools; `kit/scripts/tools.py` hands commands to it. It declares `COMMANDS` (what its `main()` accepts) and `TOOL_NAMES` (the tool names `stop` takes) as module-level tuples, which the dispatcher reads to pick the platform when there are several; `kit/scripts/test_tools.py` checks the declaration against `main()`. The platform's own scripts call the dispatcher with `--platform <name>`. What is not about a machine (port probing, the pseudo-terminal wrapper, starting and stopping a tool, telling this clone's tools from another clone's, the shared-library check, the macOS `.dmg` unpack, and `verify-footprint`'s walk and verdict) is in `kit/scripts/launcher.py`: import it rather than copy it | `kit/c64/tools.py` |
| `kit/<platform>/<tool>.py` | a scripting client per tool, for the loops that are too slow as single calls | `vice.py`, `r2000.py` |
| `kit/<platform>/registers.py` | the I/O registers by name, `NAMES`, for the operands of the Source tab; without it an operand that sees the chips shows its address | `kit/c64/registers.py` |
| `kit/<platform>/check_emulator.py` | `kit/EMULATOR.md`'s tests as a script with its own test program, one name per check; the launcher runs it as `check-emulator` | `kit/c64/check_emulator.py` |
| `kit/skills/<platform>/tool-<emulator>/workarounds.md` | what to do instead, one section per check that fails on some build | `tool-vice-mcp/workarounds.md` |
| `site/lib/<platform>.js` | what the page needs that is specific to the machine | `c64.js`, and the memory map in `memmap.js` |
| `site/status.json` | the machine's entry under `systems` (its library size, with the source and the date it was read), and its cell in every row of `hosts`: what was measured on each kind of computer, and when | the `c64` entries |

## Where the shared scripts branch on the platform

These already read `platform` from `game.json` and need one entry each:

- `kit/scripts/build.py`, the platform's display name.
- `kit/scripts/symbols_export.py`, the standard coverage exclusions (stack,
  I/O) and the screen and character set sizes. `coverage.py` and
  `listing.py` take their regions from here. Two more entries serve
  `listing.py`'s check for data the ledger cannot see: `hidden`, RAM a
  default exclusion covers but a game can still use, and `system`, the
  machine's own work area, never reported as the game's. `hidden` is also
  where an operand has two meanings, the chips' and the RAM's, and
  `listing.py` picks one per instruction (`kit/skills/core/50-coverage`,
  "A game can live under its I/O").
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
| `cpu.py` | `decode(ram, a) -> (mnemonic, mode, nbytes) or None`, `operand(a, m, mode, bs, names, regs, chips) -> (text, target)`, `text_decode(kind, byte) -> str`, `TEXT_TYPES` | `listing.py`, through `platform_modules(platform)` |
| `snapshot.py` | `read(path) -> bytes`, one flat 64 KB image; exits, naming the format it saw, on anything else | `listing.py` (the snapshot and the hand-over), `symbols_import.py` |
| `project.py` or `skoolkit.py` | `read_file(path) -> (blocks, symbols, comments)`, `write(gdir, snapshot, out=None) -> path` | `symbols_export.py` (`read_file`, `--project`/`--ctl`), `symbols_import.py` (`write`) |
| `r2000.py` or `skoolkit.py` | `read_live() -> (blocks, symbols, comments)` from the running disassembler | `symbols_export.py` (`read_live`), `coverage.py --live` |
| `registers.py` | `NAMES`, the I/O registers by name, so an operand that sees the chips shows one | `listing.py` |

The C64's `cpu.py` holds the 6502 and PETSCII together; the Spectrum's
`cpu.py` re-exports `z80.py`, which is where a third Z80 machine would
point. A `kit/cpu/` layer that splits them is cut when a third machine
arrives, not before. Two pieces are still the C64's: `site/lib/memmap.js`
is one drawing for every machine but `kit/template/index.html` still names
its colour tokens after the C64.

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
   "No run recorded".
6. Run one game through the whole workflow to Silver. The retrospective on
   that game (`kit/skills/core/80-retro`) is where the seams you missed show
   up; fix them in the same pull request.
7. Open the pull request as `AGENTS.md` says, with `[kit-bump]` in its
   description. The
   entry in `kit/lessons/` is not "added the platform" but what the
   first game on the new platform taught the kit about reverse engineering that the
   earlier machines did not.

## Two rules

- Do not refactor a seam ahead of its second consumer. With one platform
  the interface is a guess; the second platform tells you where the seam
  actually is.
- Platform facts go in `kit/skills/<platform>/` and platform code in
  `kit/<platform>/`, never in `kit/skills/core/` or `kit/scripts/`.
  `check_docs.py` enforces the first half.
