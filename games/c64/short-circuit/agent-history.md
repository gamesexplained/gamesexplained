# Short Circuit — agent history

Narrative of how the analysis went, including wrong turns, for the next agent's benefit.

## Setup, 1 November 2026

- Model: claude-sonnet-5-5, which `models.py is-proven` does not list. The run goes to a Silver standard of work but `game.json` says `bronze` until a maintainer has sampled the listing on a proven model (`kit/CHECKING.md`). The contributor was not present; every decision below is mine.
- Tools on a Mac with Apple silicon: vice-mcp v3.14.0 from its release (57 of 57 checks), regenerator2000 0.9.20.
- Two kit faults met on this machine; both are in `kit-feedback.md`: `hdiutil attach` refused a mount point inside the clone on an external drive, and `cargo install regenerator2000 --version 0.9.20` stopped with a type error because cargo took a newer dependency than the crate was built with (`--locked` fixed it).
- Web: allowed, used for the C64-Wiki page and a search; the Commodore User review page refused the connection.

## Getting in

- The image is a G64 with three programs. The first autostart shows only a light-blue screen for about a minute; the game's loader does not draw anything until it has read 64 KB with a fast loader. A stopping checkpoint on the first instruction of `SHORT` (`$0400`) never fired: the real hand-over is the loader's `JMP $9548`, found by reading the loader's last instructions at `$0187` after disassembling `F`.
- A snapshot loaded on a stopped machine stays stopped. For a while the joystick seemed to do nothing, and the clock seemed frozen at 03:00:15, until `vice_ping` said `paused`. `vice_execution_run` after the load fixed it.

## Finding the shape of the game

- The coverage ledger started at 12 KB tracked of a 64 KB load. The code map (`codemap.py zap`/`dump --under-rom`, one 90-second play session driven by random stick and space presses) found 8 KB executed and seeded the disassembler.
- The first reading of the interrupt chain was wrong: I named `$0767` the top-of-frame handler and `$07A0` the panel handler. Reading the raster lines each one writes (`$D012`) shows the opposite order: `$07A0` runs at line `$F3` and prepares the next frame, `$0767` at line `$A3` is the panel band. Corrected in the symbols.
- Part two's code sat after part one's in the same load; the first sign was the second `main_loop`-shaped routine at `$26BC` with its own interrupt set-up at `$2759`. F3 on the attract screen reaches it without playing part one.
- Many handlers are reached only through tables of address-minus-one words pushed with `PHA` and `RTS` (`$0675`, `$43E8`, `$5BF0`, `$1C2E`, `$15CC`, `$8A6E`, `$8AEF`, `$8FE8`, `$3AE0`). The disassembler does not follow them; each was found by reading the dispatching routine, printing the table and disassembling each entry. The same goes for the music driver's command tables at `$9C00` (not minus one: `JMP (ind)`).
- `$3DE0`-`$3FFF` decodes as plausible code but its zero-page variable references and call targets do not match the live routines, and nothing refers to it: an older copy, left in the load.

## Wrong turns

- Tools that print too much cost tokens: a block dump of `$A05F`-`$A15D` through a helper that printed the whole contiguous code block instead of the range printed all of the music driver.
- Several routines were first described from the call shape alone and later corrected from the code (`$0767` and `$07A0`, `$3251`, `$9968`, `$9AE3`). A reader should treat comments in part two's actor routines (`$2DD4`-`$35B3`) as the least checked.

## Pages and tests

- The music player runs the game's own driver on the kit's 6502. The first comparison with a recording of the emulator's SID (one frame at a time, `vice_sid_get_state`) matched only 67 per cent of the register values, because the driver's note lengths are counted in ticks, and the game ticks the voices at a fractional rate (3.5 a frame in the attract mode: four raster handlers, each adding `$E4` to a counter). Counting hits on `$3C93` and `$A48B` with non-stopping checkpoints (200 and 173 in 50 frames) showed the rate; once the page called the driver the way each part does, the note starts agreed with the recording to within a frame, which is what `test_music.js` holds.
- `test_levels.js` finds the first frame's screen inside the strip of tiles (offset 37 characters).  It found it on the first run, with tile data read row after row, four characters a row.
- Part two's creatures were run by poking the scroll column `$02AE` and the last-seen column `$0241` so that `$8936` starts the event at once. The screenshots were taken at fixed times and show a bird (events 1 and 5), a squirrel (3), a low animal (4), a log (6) and a crouching figure (8); they were not matched to numbers with care and the pages do not name them.
- No browser was used. Chrome is installed on this Mac, but the install notes say it can start Google's updater outside the clone, and nobody was there to ask. The pages' scripts were checked for syntax with `node --check` and their data and drawing by the three tests.
- A run of `test_kit.py` took 15 minutes. Waiting that long between tool calls let the prompt cache expire, and the next call cost a full uncached read of the conversation (about 1.5 dollars): run long tests in the background and keep working.

## The Silver run, 13 November 2026

- Model: claude-opus-5-5, proven. Contributor: Nico-van-der-Zijden, a known contributor (`kit/contributors.json`), so a full audit on a proven model followed by a sample stands in for the maintainer check (`kit/CHECKING.md`). Checkers ran one at a time on claude-opus-5-5, as the contributor asked. Host: Windows 11 with WSL Ubuntu; VICE release v3.13.2 (vice-mcp commit 1e83aab134).
- The contributor gave the original cassette, the Ultimate Tape Archive V4.0 entry 1755. Loaded with warp, it reached `$9548` 265 seconds after the autostart. Its memory from `$0334` to `$FFF9` was the disk crack's byte for byte, so the analysis stood and the listing was built again from the tape.
- The tape reader listed one undecoded stretch. Reading the boot program showed the format (pages after a 1 bit); added to `kit/c64/tap.py`, it decoded all 275 pages, and every game page equalled the listing.
- The audit was cut into six address ranges and `facts.md`. It found 454 of 1,146 comments wrong; the worst were the music driver's variables (156 of 286), whose writer lists left out the scripts' own copy commands. Each checker's report was spot-checked on one claim against the bytes before its fixes were applied with `r2000.py --apply`: the puzzle flags start at `$0C`; the messages are plain ASCII; object 16 is the LIGHTED CIGARETTE; `$9637` sets bank 2 and `$D018` = `$02`; voice 2's dispatch adds `$73` plus carry into its own `JMP ($9C34)`; `$029C` starts at `$04`. All held.
- A wrong turn the audit caught on the pages: the Maps tab drew part one with the panel's character set, and its test (screen codes only) passed. The recorded frame's `$D018` gave the right set; the test now checks it.
- Part two's events were started on the kit's machine model (`kit/c64/machine.js`) from `play-part2.vsf` by setting the scroll column `$02AE` to a column of each event and `$0241` to another, then sampling the sprite pointers and colours every frame. Events 8 and 9 reuse Number 5's and the guards' shapes. The contributor named events 3, 4 and 11 (squirrel, mouse, flying elephant).
- The credits screen was captured with `frame.py capture` 2.5 seconds after the hand-over and drew exactly as VICE showed it.
- Checker 7 suspected a bug in the INPUT table at column `$9A`; running `$183D` on the kit's 6502 confirmed it (Discoveries, "One key, three drawers").
- No browser extension was connected; pages were checked with headless Chrome through a wrapper page (`work/shot.html`, `work/shoot.ps1`), which must be copied into `_site/` after each build.
