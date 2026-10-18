# Thrust — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `20-features`: "If you believe a feature is not there, write down exactly what you searched for and how, and leave it": F5 did not pause on the first try, so pause stayed open with the test written down, and the key search later found the pause routine and the hold it needs.
- `40-sweep`: "Extract every access to the I/O region from the disassembly, group by register, and demand an attributed feature for each": the census had no write to `$DD00` though the video bank had changed, and chasing that found the start-up code that runs at `$0400` and lies undecoded at `$B773`.
- `20-features`: "Test each control from a moment you have looked at": every control was tested from the same still snapshot, with and without the key, reading the sprite registers, which gave the 32 directions and the fuel each control burns.
- `10-orient`: "Save the hand-over too": `entry.vsf` settled which snapshot to disassemble, and later disproved my reading of `$63` as the demo flag.
- `30-text`: "First rule out an offset.": one search by letter differences showed the texts are plain ASCII, with no private alphabet to decode.

## What was changed in the kit

- `kit/c64/census.py`: refuses, with a line saying to run `symbols_export.py` (or to disassemble first, with `--live`), when the blocks it reads have no code. Before, a first session's census, run before any export, printed "0 instructions name 0 registers" and listed every chip register as named by nothing, which reads as a finding. `kit/c64/test_census.py` tests both messages.

## Candidates

- **A census misses code the game runs from somewhere else.** Thrust copies three pages of start-up code from `$B773` to `$0400` and runs them there, then reuses `$0400`. The code is assembled for `$0400`, so the disassembler cannot trace it in place, and `census.py` reads only decoded code: the census showed no write to `$DD00`, `$D01A`, `$D020` or the CIA timers, although the start-up writes all of them. It was caught because the video bank in play did not match any write the census listed; a byte search of the image for the store instructions (`8D 00 DD` and so on) found them at `$B78C`-`$B846`. `40-sweep` could say: when a register's live value matches no write in the census, search the snapshot for the store opcodes with that operand, inside code blocks or not, before calling it untouched. No other game folder could be named for it.

## Maintainer asks

None.

## What cost the most time

A checkpoint armed straight after `autostart()` never fired (90 seconds lost, and the boot script rewritten); a sentence in `tool-vice-mcp` saying to arm checkpoints only once the autostarted program is running would have saved it, if a second run shows the same.

## Operating system and tools

macOS 26.5.1 on Apple silicon (arm64). vice-mcp v3.13.2 release
(`v3.13.2-macos-arm64-gui.dmg`), 57 of 57 in `check-emulator`, as the
table in `kit/c64/INSTALL.md` records for that build. Rust installed into
`tools/` with rustup's installer as `kit/c64/INSTALL.md` says; the
regenerator2000 0.9.20 compile took under ten minutes. Python 3.9.6 (the
system's). There is no Node or Firefox on the machine, and neither was
needed for a Bronze run. The C64 manual on REG-Vault is a scanned PDF,
which neither the fetch tool nor the Read tool could open without
poppler, which was not installed.
