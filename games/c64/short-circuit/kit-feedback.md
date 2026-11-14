# Short Circuit — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`), first by the Bronze run of 1 November 2026, then by the Silver run of 13 November 2026.

## Skill text that changed what I did

- `50-coverage`: "Bytes no instruction reads may still be read.": in the Silver run's audit it sent the checker to the video bank settings, which turned the 1,192 "unread" bytes after the title picture into the credits screen.
- `60-verify`: "For each wrong comment, whether the sample is bad or not, say what it believed, search the listing for every comment that says the same": after the cigarette routine was renamed, four comments still called it the laser pickup, and the Silver run corrected them with the audit.
- `10-orient`: "a stopping checkpoint on the game's first instruction (the loader's jump into it)": the Bronze run first stopped at the load address of the big program, `$0400`; that checkpoint never fired, so it read the loader's last instructions and found the jump to `$9548`.
- `50-coverage`: "Find what writes the operand, parse every table it reads": the three raster handlers and the voices' command tables were reached through pointers the disassembler did not follow; the Bronze run printed each table and seeded its entries.
- `40-sweep`: "Relocating loaders can leave a second copy": it made the Bronze run test the stale-looking block at `$3DE0` against the live routines instead of annotating it as code.

## What was changed in the kit

Silver run:

- `kit/c64/tap.py`: a second kind of row in `TURBO`, `"kind": "pages"`, and `page_blocks`, which read Ocean's 1987 tape format (a lead-in of 0 bits, a 1, then pages of flags, page number and 256 bytes until page 0); each run of consecutive pages is a turbo block. `kit/c64/test_tap_pages.py` holds it to a made-up tape. Lesson: `kit/lessons/2026-11-13-short-circuit.md`.
- `kit/skills/core/70-minisite`: a map or screen drawn from the game's data takes its character set and mode from a recorded frame's registers, and its test checks them; the same mistake in another form was made on `games/c64/into-the-eagles-nest` (tiles drawn in the wrong colour mode). Lesson: `kit/lessons/2026-11-13-short-circuit.md`.

Bronze run:

- `kit/scripts/launcher.py`: `unpack_dmg` tries the mount point inside the clone and, when `hdiutil attach` refuses it, mounts the image in the system's temporary folder.
- `kit/c64/INSTALL.md`, `kit/c64/tools.py`: `cargo install --locked ...`, with the reason.

## Candidates

None.

## Maintainer asks

- **A snapshot that was saved stopped is loaded stopped, and `10-orient` says the opposite.** `10-orient` says "A loaded snapshot **starts running immediately**", while `tool-vice-mcp` says a load on a stopped machine leaves it stopped. On release v3.14.0 a snapshot saved after `pause()` loaded stopped: the joystick seemed to do nothing and the clock seemed frozen until `vice_ping` said `paused`. The skill could say that a snapshot saved while stopped is loaded stopped and needs `vice_execution_run`.

- **`kit/c64/test_stdio_bridge.py` fails on macOS.** `test_snapshot_conversion_preserves_ram_and_previous_project` compares `/private/var/folders/...` with `/var/folders/...`: on a Mac the temporary folder is a link, and the test's `project_path` resolves it where the expected path is not. The test passes on Linux. Resolve both sides with `Path.resolve()` in the test.

## What cost the most time

Silver run: the audit itself, seven checkers one after another, about two hours. The change that would have saved the most is in the lesson: a self-sample on an unproven model understated the error rate by half, so the audit was always going to be the measure.

Bronze run: the disassembler follows no table of address-minus-one words, so every handler of a game that dispatches with `PHA` and `RTS` has to be found by hand.
