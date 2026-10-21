# Lemmings — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Start each case where the game starts it, and feed it what the page feeds it": the level tunes played almost nothing when started at the level's set-up; following every caller of the driver's start entry found the music starts at the first release, and the page and its test start it there.
- `60-verify`: "A test must contain cases that have to succeed": the code sheet's test checks five numbers read off the manual's printed table as well as the game's own arithmetic, so a page and a game that agreed on a wrong rule would still fail.
- `60-verify`: "search with every opcode and every index that can reach it": the line of text at `$A184` and the routine at `$2910` are called unread only after the references search showed no reader within reach.
- `10-orient`: "Compare it with the play snapshot byte for byte": the first stop after the game's load held only `$5000`-`$5FFF` of it, so the hand-over moved to the level briefing, which holds the whole program.
- `40-sweep`: "Relocating loaders can leave a second copy of code or tables in memory": the briefing's code turned out to be kept packed under the I/O area and restored before each load, and is labelled as such.

## What was changed in the kit

- `site/lib/sid.js`: a `digi` option (on `createSID`, `host` and `mount`) adds the 6581 mixer's DC level that the volume scales, so samples played through `$D418` are heard; the header says how to drive such a player with `period`. Lemmings' end tune needs it: its tune is silent without its NMI's volume writes.
- `kit/c64/test_sid_digi.js`: checks that volume changes are silent without `digi`, heard with it, and quiet at a steady volume.

## Candidates

- **A string sweep reads mixed-case text one byte late.** The game's text
  is in screen codes of the lower-case set, where capitals are `$41`-`$5A`.
  A sweep that accepts only `$00`-`$3F` (as Rick Dangerous's and this run's
  `work/strings.py` do) ends each run at a capital and starts the next
  after it, so every string that starts with a capital is reported one
  byte late and without its first letter. Caught when the addresses were
  checked by searching for whole strings. A `40-sweep` rule would say:
  when the sweep's runs start with a lower-case word, decode with
  capitals at `$41`-`$5A` as well and take the address of the capital.

## Maintainer asks

- **Add a tape helper to `kit/c64/vice.py`: change tapes, press PLAY and set the position in decimal.** A game on several cassette sides needs its tapes changed at a prompt, and the vice-mcp server has no tape tool. This run did it through VICE's text monitor (`codemap.monitor('attach "<file>" 1')`, `tapectrl 1`, `tapeoffs <offset>`), which reads every number as hexadecimal: an offset typed as 441050 was set to 4,460,624, and two positions were tried before that showed. A `tape(rpc, path, offset=None)` helper beside `autostart()` in `vice.py`, which converts the offset to hex and stops on a held checkpoint as `codemap.monitor` does, with a line in `tool-vice-mcp` under "The sequence that works", would save the next tape game the detour.
- **Add a string sweep script to `kit/cpu/`, beside `census.py`.** `40-sweep` asks for a screen-code and a PETSCII string sweep, but the kit has no script for it, and Mayhem in Monsterland, Rick Dangerous and Lemmings each wrote their own `work/strings.py`. One script, taking a game or part folder and a snapshot like `census.py`, that also decodes the lower-case set's capitals (`$41`-`$5A`) and reports a run at its first letter, would make the sweep the same everywhere and remove the off-by-one above.

## What cost the most time

Bronze: the cassette release, about an hour, before the contributor
offered the disks. Silver: splitting the program into parts that own
their bytes (a resident base under the intro, the menu, the game and the
ending) after the first cut had the ending owning the game's bytes. A
line in `10-orient`'s "A game of several parts" saying to start with a
base part for whatever never leaves memory, when a loader stays resident
under every load, would have saved the restructuring.

The browser extension was not connected in this session; the pages were
checked with an installed Chrome run headless (`--screenshot`, an
isolated `--user-data-dir` in the session's scratch folder) against the
built site served from WSL.

Host: Ubuntu 26.04.1 under WSL2 on Windows 11 (kernel
6.18.54.1-microsoft-standard-WSL2), Intel Core i7-3770. VICE built from
the vice-mcp v3.13.2 source as in the earlier runs here; `check-emulator`
57 of 57. regenerator2000 0.9.20. Node from `tools/node`.
