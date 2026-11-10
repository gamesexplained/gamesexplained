# Big Trouble In Little China — kit feedback

## Skill text that changed what I did

- `10-orient`: "A packed program may pass through several hand-overs": the first stop at the unpacker's last return went into a small stage, not the game, so I went on to a second stop and kept the last one.
- `10-orient`: "Ask what the image is before trusting it.": the restore of colour RAM and chip registers at `$094B` showed the image holds a frozen machine, so the loader and its protection are not in it, and I wrote that in `orientation.md`.

## What was changed in the kit

None. The run edited nothing under `kit/`.

## Maintainer asks

- **Say in `kit/START.md` that a hosted session on a clone of the fork needs an `upstream` remote before `check_docs.py` is run.** The check compared the branch with the fork's `main`, which was weeks behind, and reported kit changes this branch never made, until `git remote add upstream https://github.com/gamesexplained/gamesexplained` and a fetch. The script could add or find the remote itself, or say what it compared against.

## What cost the most time

Finding the real hand-over behind a packer that unpacks in three rounds: a script that records the program counter each time the stack returns into a new address range, or that stops at the first `RTS` into the address the final stage restores, would have saved the most time.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04.5) in a cloud container with no display. vice-mcp v3.14.0 release zip: passed `check-emulator` 57 of 57. Its missing libraries (libglew2.2, libevdev2, libieee1284, libmicrohttpd12t64, libpcap0.8t64, libportaudio2 and the three libraries libpcap needs) were unpacked into `tools/vice-libs` as `kit/c64/INSTALL.md` says, and it started. regenerator2000 0.9.20 installed with the documented `cargo install --locked` and the proxy settings.
