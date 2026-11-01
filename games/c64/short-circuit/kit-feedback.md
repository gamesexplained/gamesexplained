# Short Circuit — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`).

## Skill text that changed what I did

- `10-orient`: "a stopping checkpoint on the game's first instruction (the loader's jump into it)": I first stopped at the load address of the big program, `$0400`; that checkpoint never fired in two minutes, so I read the loader's last instructions and found the jump to `$9548`.
- `50-coverage`: "Find what writes the operand, parse every table it reads": the three raster handlers and the voices' command tables were reached through pointers the disassembler did not follow; I printed each table and seeded its entries.
- `50-coverage`: "Data the ledger cannot see": the list after the first listing build showed 42,000 bytes of uncounted graphics, maps and music, which I then typed and described.
- `40-sweep`: "Relocating loaders can leave a second copy": it made me test the stale-looking block at `$3DE0` against the live routines instead of annotating it as code.

## What was changed in the kit

- `kit/scripts/launcher.py`: `unpack_dmg` tries the mount point inside the clone and, when `hdiutil attach` refuses it, mounts the image in the system's temporary folder. On this Mac the clone is on an external drive (`/Volumes/...`), where the first mount point was refused and `get-vice download` stopped with a traceback.
- `kit/c64/INSTALL.md`, `kit/c64/tools.py`: `cargo install --locked ...`, with the reason. Without `--locked` the compile of regenerator2000 0.9.20 stopped with `expected anyhow::Error, found CoreError`.

## Candidates

None.

## Maintainer asks

- **A snapshot that was saved stopped is loaded stopped, and `10-orient` says the opposite.** `10-orient` says "A loaded snapshot **starts running immediately**", while `tool-vice-mcp` says a load on a stopped machine leaves it stopped. On release v3.14.0 a snapshot saved after `pause()` loaded stopped: the joystick seemed to do nothing and the clock seemed frozen until `vice_ping` said `paused`. The skill could say that a snapshot saved while stopped is loaded stopped and needs `vice_execution_run`.

- **`kit/c64/test_stdio_bridge.py` fails on macOS.** `test_snapshot_conversion_preserves_ram_and_previous_project` compares `/private/var/folders/...` with `/var/folders/...`: on a Mac the temporary folder is a link, and the test's `project_path` resolves it where the expected path is not. The test passes on Linux. Resolve both sides with `Path.resolve()` in the test.

## What cost the most time

The disassembler follows no table of address-minus-one words, so every handler of a game that dispatches with `PHA` and `RTS` has to be found by hand: a script that lists every `PHA`/`PHA`/`RTS` dispatch and prints the table it reads would have saved the most time.
