# Platoon — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `10-orient`: "The line beside each write is where the handler before it wrote the vector": the first comments named each raster handler by the line of the write that named it; I rewrote them from what each handler writes.
- `tool-vice-mcp`: "Prove the machine is running before you believe a negative result": a cheat test read nothing with every checkpoint at zero, the control included, and the cause was a machine left stopped, not the game.
- `10-orient`: "Save the hand-over too": OVL1 lands whole at `$0400`, and play rewrites `$D000`-`$D7FF`, so the listing is built from the hand-over.
- `20-features`: "A hosted session's network policy can refuse every page fetch": every page answered 403, and `features.md` uses search summaries for plain claims only, marked second-hand.

## What was changed in the kit

None.

## Candidates

None.

## Maintainer asks

None.

## Run notes

Linux x86_64, Ubuntu 24.04 cloud container. The v3.13.2 release zip
needed `libpcap0.8t64`, `libieee1284-3t64`, `libglew2.2`, `libevdev2`,
`libmicrohttpd12t64` and `libportaudio2`, all in the list in
`kit/c64/INSTALL.md`; `check-emulator` passed 57 of 57.
regenerator2000 0.9.20 built from crates.io with the container's cargo.

`parts.py add --adopt` after annotating in a session started on the game
folder: `symbols_export.py <part>` then refused, and its message named
`--from <game folder>`, which worked.

## What cost the most time

No kit change would have saved much: the longest step, finding where the
loader waits for a key, took one sample of the program counter, as
`tool-vice-mcp` already says.
