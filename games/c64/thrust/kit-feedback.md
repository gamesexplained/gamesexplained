# Thrust — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `50-coverage`: "Before calling 100 %, go through that list and say what each stretch": the list showed `$3001`-`$3FFF` as a stale copy of the program, which led to the per-frame `JSR $3000` landing on an RTS there, and so to this copy having no music.
- `50-coverage`: "A pace in a comment is a measurement": counting `main_loop` against `raster_handler_0` (131 passes in 250 frames) showed a pass is not a frame, and a Bronze measurement (thrust cost 5 units of fuel in 25 frames) then showed `ship_physics` acts only on 6 passes in 16, which the comment and `facts.md` had missed.
- `60-verify`: "For each wrong comment, whether the sample is bad or not, say what it believed": the "alternate frames" and "the play area's third colour" beliefs were in four more comments than the sample drew, and were corrected with them.
- `60-verify`: "Read every comment it marks wrong or doubtful": all ten findings were checked against the code before they were counted; all ten held.
- `tool-regen2000`: "A `JSR` into ROM traces the RAM underneath": decoding the unused BBC key-page printer traced `$FFD2` as code, and the block was set back to data at once.


## What was changed in the kit

- Silver run: nothing.
- Bronze run: `kit/c64/census.py` refuses, with a line saying to run `symbols_export.py` (or to disassemble first, with `--live`), when the blocks it reads have no code; `kit/c64/test_census.py` tests both messages.

## Candidates

- **A game that starts at once can be mistaken for attract mode.** In the Bronze run the screen after loading looked like a demo (the ship hanging over level 1, nobody pressing anything), and sampling the demo flag `$63` from the hand-over read 0, so the flag was ruled out. In fact the crack's start-up jumps straight into a game (`$AF82`), the demo flag is only set by the title after a game ends, and it reads `$FF` there. `20-features` could say: before calling a screen attract mode, leave it running with no input until it changes (a life lost, a table, a title), and read the candidate flag on both sides of the change. No other game folder could be named for it.
- **A census misses code the game runs from somewhere else** (Bronze run): the start-up code assembled for `$0400` at `$B773` was missing from the register census. It turned out to refer to nothing at `$0400`-`$06FF`, so it decodes the same in place, and typing it as code at `$B773` put its writes into the census. No other game folder could be named for it.

## Maintainer asks

- #804: Add a way to install Node into `tools/` for the page tests, with Playwright (the recipe this run used is in the issue).

## What cost the most time

Reading the whole program once, from 15.7 % to 100 %, at about 12 KB of code; nothing in the kit would have shortened that. The single change that would have saved the most is the Node recipe above: without it the page tests could not run here until the contributor chose how to install it.

## Operating system and tools

Silver run: macOS 26.5.1 on Apple silicon (arm64). vice-mcp v3.14.0 release (`v3.14.0-macos-arm64-gui.dmg`), 57 of 57 in `check-emulator`, as the table in `kit/c64/INSTALL.md` records. regenerator2000 0.9.20. Node v26.13.0 and playwright-core from npm in `tools/` (above); Google Chrome, headless, through `tools.py browser`. Python 3.9.6.

Bronze run: vice-mcp v3.13.2 release, 57 of 57; Rust and regenerator2000 0.9.20 compiled into `tools/`. The C64 manual on REG-Vault is a scanned PDF, which neither the fetch tool nor the Read tool could open without poppler.
