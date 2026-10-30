# Power Drift — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": the sample found one horizon comment with the upper and lower pictures the wrong way round; the search that followed found the same swap in 15 more comments and eight label names, and all of them were corrected together.
- `60-verify`: "Comments a program wrote, a decoder describing every record of a format": the 103 comments my scripts wrote from the scenery lists, the tile sheet, the sprites and the course records got a stratum of their own, 20 of the 60 drawn; it found the scenery lists' last sentence wrong for two stages, and the generator was fixed and run again for all 25.
- `tool-vice-mcp`: "it out unless given `--under-rom`; it says how many such instructions it saw": the first code map left out 759 instructions, the whole sound driver in the RAM under BASIC at `$B800`, and a second dump with `--under-rom` put them in.
- `70-minisite`: "with a button for every tune the game stores, unused ones too": the sound player has buttons for effects 1 and 4, which the game never starts, and hearing effect 4 is what showed it to be an engine's hum (a Discoveries section).

## What was changed in the kit

- `kit/c64/INSTALL.md` and `kit/c64/tools.py`: the disassembler is installed with `cargo install --locked`, and `INSTALL.md` says why. Without `--locked`, cargo took `regenerator2000-tui` 0.9.21 on 30 October 2026, and regenerator2000 0.9.20 failed to compile against it (`error[E0308]: mismatched types` at `src/main.rs:838`). With `--locked` it builds from the versions in its own `Cargo.lock`.
- `kit/scripts/symbols_export.py`: after writing `symbols.json`, it prints every comment that names a label by an automatic name the address no longer has (`s_10B4` in a comment, where the routine is now `show_bonus`), with the new name. `kit/scripts/test_symbols_export_old_names.py` tests it. Why: 25 of this game's comments named routines by such old names, 67 times, and a reader of the Source tab finds no label by those names. Nothing in the kit noticed. The same check over the published games finds 248 in 14 other game folders (the maintainer ask below).
- `kit/lessons/2026-10-30-power-drift.md`: the decimal flag is whatever the last routine called left it.

## Candidates

- **A BCD value changed with the decimal flag off.** `count_bonus` sets
  decimal mode, then calls `draw_score`, which ends with `CLD`, before it
  subtracts 1 from the BCD bonus. The first reading took the `SED` at the
  top of the loop to cover the subtraction: the listing said a bonus of 00
  counted 100 times, where it counts 256 times, and a bonus shown as 25
  pays 37,000 points, not 25,000. Running `show_bonus` and `count_bonus`
  on the kit's 6502 for every second from 0 to 59 caught it, and the
  emulator agreed. No other game folder is known to have the same shape;
  the next run that finds a `SED` followed by a call before the
  arithmetic would add to `50-coverage`: before writing what `ADC` or
  `SBC` does to a BCD value, find the last `SED` or `CLD` on every path
  to it, inside the routines called on the way too. The lesson file
  tells it.

## Maintainer asks

- #641: Rename the old automatic names left in 14 game folders' listing comments
- #642: Add a kit step that disassembles from every start in a C64 game's code map

## Met on the way, already recorded

- **The stick after a snapshot load.** `tool-vice-mcp/workarounds.md`
  says to set the stick again after every snapshot load. Here, setting
  it again to the value it had before the load did nothing until it was
  released first: `joy(rpc, 2, 0)` and then `joy(rpc, 2, UP)` worked
  every time.
- **A wrapper that swallows `codemap.py`'s refusal.** My own script ran
  `codemap.py` with its error output captured, and a stopping checkpoint
  left by an earlier script made `codemap.py` refuse `zap` and `dump`. The
  first play session recorded nothing, silently, because of the wrapper.
  Clearing the checkpoints and printing the error fixed it. The kit's own
  tool says what is wrong; a script that calls it must not hide that.
- **The other disk.** The C64 Preservation Project has two originals.
  The Rapidlok image, `power-drift-rl7.g64`, hung at `$A005` with a blank
  blue screen in VICE 3.10; the Securispeed image booted. Not analysed.
- **VICE's libraries in a cloud container.** The vice-mcp release needs
  libraries the container lacks, and `apt-get download` failed until an
  `apt-get update`. The nine packages were unpacked into `tools/` with
  `dpkg-deb -x`, as `kit/c64/INSTALL.md` describes.

## What cost the most time

A kit step that disassembles from every start in `codemap.json`, round after round until every start is inside a code block, would have saved the most: seeding from the first instruction of each run left the code after `RTI`s and indirect jumps untyped, and finding it took several passes of `coverage.py` and a script of my own (#642).

## Operating system and tools

Linux 6.18 x86_64 in a Claude cloud container (Ubuntu 24.04), no display;
VICE 3.10 from the vice-mcp release v3.14.0 (`v3.14.0-linux-x86_64-gui.zip`),
regenerator2000 0.9.20 built with `cargo install --locked`, Node 22.
