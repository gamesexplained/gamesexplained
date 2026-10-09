# Classic Adventure — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "When they are bad, audit them by template, not one by one": the sample's three wrong decoder comments were one sentence of the action-list template, so every one of the 452 lists was tested against its stored length and 323 were rewritten by the decoder, not by hand.
- `50-coverage`: "A comment a program writes is one claim made for every record": the 1,749 per-record descriptions of rooms, messages, objects, exits and rules are written by a script from each record's own bytes, with empty records named rather than given a sentence meant for full ones.
- `70-minisite`: "Sweep the whole input space, not a few plausible values": the port's lockstep test aims the jiffy clock at every chance threshold the rules test and pokes the turn and score digits to their carries, which is how the 10,000th command's patch into the printer was found.
- `50-coverage`: "Resolve every pointer table before excluding a region": each stretch excluded (the wrapper's leftover copy, the fill before the dictionary, the RAM above the program) was checked with `opcodes.py --refs` first, and the one hit, a self-modified operand, was explained in the reason.
- `tool-regen2000`: "A `JSR` into ROM traces the RAM underneath": the tracer marked `$FFBA`-`$FFFD` as code from the KERNAL calls, and it went back to undefined before the ROM range was excluded.

## What was changed in the kit

- `kit/scripts/symbols_export.py`: the platform module is loaded with its own folder on the path, so the C64 client's `r2000.py` can import `ports.py` beside it. The export and `coverage.py --live` failed with an import error before.
- `kit/c64/codemap.py`: the code map records execution in RAM only (`memmapshow 1`). It recorded the KERNAL's execution under `$E000` during the boot as the game's code, and `check_listing.py` then wanted those bytes typed as code although the ledger excludes them.
- `kit/scripts/check_listing.py`: code the map recorded inside the ledger's exclusions is left out of the untyped-code check. BASIC's `CHRGET` at `$0073`, which RUN runs, was reported as game code typed as data.
- The run's lessons are in `kit/lessons/2026-10-09-classic-adventure.md`.

## Candidates

- **A game that keeps the KERNAL and reads typed lines.** `play.md` builds the lockstep on `kit/c64/machine.js`, which models a raster and a keyboard matrix for a game that banks the KERNAL out. Classic Adventure keeps the KERNAL and reads whole lines through `CHRIN`, so `test_play.js` runs the game on `cpu6502.js` directly, with hooks for `CHRIN`, `CHROUT`, `SETLFS`, `SETNAM`, `SAVE` and `LOAD` and for the reset, and compares at each line the game reads. Nothing went wrong unnoticed, so this stays here; the next run on a parser game (an adventure with a typed command line) that finds the same shape could add a paragraph to `play.md`: compare at each line read, answer the KERNAL's line routines in the test, and hand the port the jiffy clock through `irqByte`.

## Maintainer asks

- #260: Give KERNAL entry points the same names in symbols.json whichever file regenerator2000 was started on.

The run's case was also added to #239, the shared harness for checking a page's port: `test_play.js` cuts the port out of `play.html` and runs the game's code from `listing.json` beside it, the third game to write that harness.

## What cost the most time

A lockstep harness for games that read typed lines through the KERNAL, beside `kit/c64/machine.js`, would have saved writing `test_play.js`'s hooks and comparison by hand (#239).

## Tools and host

Linux x86_64 cloud container (Ubuntu 24.04.5, no display); VICE 3.13.2 (vice-mcp release `v3.13.2-linux-x86_64-gui.zip`), 57 of 57 `check-emulator` checks; regenerator2000 0.9.20; Python 3.13.16; node 22.22.0; Chromium 141.0.7390.37 (Playwright 1.56.1's) for the page checks. A container restart during `60-verify` stopped the emulator, the disassembler and the checker agent; the tools came back with `tools.py`, the disassembler from `symbols_import.py`, and the checker was started again with a note of where it had got to.
