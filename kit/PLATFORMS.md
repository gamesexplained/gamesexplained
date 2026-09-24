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
| `kit/<platform>/tools.py` | the launcher: starts, checks, stops and contains the tools; `kit/scripts/tools.py` hands commands to it | `kit/c64/tools.py` |
| `kit/<platform>/<tool>.py` | a scripting client per tool, for the loops that are too slow as single calls | `vice.py`, `r2000.py` |
| `kit/<platform>/check_emulator.py` | `kit/EMULATOR.md`'s tests as a script with its own test program, one name per check; the launcher runs it as `check-emulator` | `kit/c64/check_emulator.py` |
| `kit/skills/<platform>/tool-<emulator>/workarounds.md` | what to do instead, one section per check that fails on some build | `tool-vice-mcp/workarounds.md` |
| `site/lib/<platform>.js` | what the page needs that is specific to the machine | `c64.js`, and the memory map in `memmap.js` |

## Where the shared scripts branch on the platform

These already read `platform` from `game.json` and need one entry each:

- `kit/scripts/build.py`, the platform's display name.
- `kit/scripts/symbols_export.py`, the standard coverage exclusions (stack,
  I/O) and the screen and character set sizes. `coverage.py` and
  `listing.py` take their regions from here.
- `kit/scripts/check_binaries.py`, the extensions and magic bytes of the
  platform's images and snapshots, so that none can ever be committed.
  Several platforms are listed already; check yours is.
- `kit/scripts/symbols_export.py` imports `kit/<platform>/r2000.py` for a
  live export. A different disassembler needs its own client and its own
  live and project readers.

## Where the shared scripts are the C64 in all but name

The second platform is the one that lifts these seams, and should do it
then rather than copy the code:

- `kit/scripts/listing.py` reads a VICE snapshot (RAM at a fixed offset, 64
  KB) and decodes 6502. Another machine has another snapshot format and
  another CPU. The snapshot reader and the decoder belong in
  `kit/<platform>/`; the ledger, the output format and the contract that
  `check_listing.py` enforces stay shared.
- `kit/scripts/symbols_import.py` has the same snapshot reader and writes
  regenerator2000's project format. Whether regenerator2000 handles other
  CPUs is not established; check before assuming.
- `kit/c64/tools.py` carries pieces that are not about the C64 at all:
  port probing, the pseudo-terminal wrapper, process start, the per-OS
  home folders, and the walk that `verify-footprint` does. Lift them into
  `kit/scripts/` when the second launcher needs them.
- `site/lib/memmap.js` draws the C64's memory layout and is named for it.
- `kit/template/index.html` names its colour tokens after the C64.

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
4. Lift the seams in `listing.py` and the symbols scripts.
5. `site/lib/<platform>.js`, and whatever the memory map needs.
6. Run one game through the whole workflow to Silver. The retrospective on
   that game (`kit/skills/core/80-retro`) is where the seams you missed show
   up; fix them in the same pull request.
7. Bump `kit/VERSION` and open the pull request as `AGENTS.md` says. The
   entry in `kit/CHANGELOG.md` is not "added the platform" but what the
   first game on the new platform taught the kit about reverse engineering that the
   earlier machines did not.

## Two rules

- Do not refactor a seam ahead of its second consumer. With one platform
  the interface is a guess; the second platform tells you where the seam
  actually is.
- Platform facts go in `kit/skills/<platform>/` and platform code in
  `kit/<platform>/`, never in `kit/skills/core/` or `kit/scripts/`.
  `check_docs.py` enforces the first half.
