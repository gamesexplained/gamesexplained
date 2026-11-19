# Ikari Warriors — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/12-media`: "Answer them `unused` only once the game is shown to ask for every file by name": I searched the unmatched sectors instead of answering them unused, and found the game's `$4000`-`$CFFF` in them, EORed with `$C9`.
- `kit/skills/core/70-minisite`: "The game's own driver run on the kit's processor counts as a port": the Music page runs the game's driver for the three tunes and the 23 effects, and the Maps page runs the game's own `draw_map_row` the same way.
- `kit/skills/core/60-verify`: "Silver needs the measure, not the mark": the sample of 80 found 16 wrong; they were fixed, and the audit is left to a later run as the skill says.

## What was changed in the kit

- `kit/lessons/2026-11-17-ikari-warriors.md`: encoded sectors, the game's own level routine as the map, and a run-time exclusion that hid a table.

The snapshot fix for VICE v4.0.0 (`kit/c64/snapshot.py`, `kit/c64/check_emulator.py`) and its row in `kit/c64/INSTALL.md`, first made on this branch, reached `main` from another branch before this one; this branch takes `main`'s versions.

## Candidates

The media scan answers a sector only when a run of sectors matches a run of the listing. Here every sector of the game was in the listing, but some in the loader's own interleave and some EORed with `$C9`, and the scan matched none of them; answered from the scan alone they would have been `unused`. The skill would say, in "Before Silver: the answers": when a run of sectors matches nothing and holds no filler, match it a sector at a time and try the 256 single-byte keys before answering. I cannot name another game folder whose disk is laid out this way.

## Maintainer asks

- **Teach media.py scan to match a disk's sectors one at a time and through a single-byte key.** On Elite's Ikari Warriors disk the scan matched none of the game's 17 tracks: the sectors are stored in the loader's own interleave, and tracks 8 to 14 are EORed with `$C9`. A sector-by-sector match against the snapshots, trying the 256 keys on each sector's first 40 bytes, found all of them in seconds (`games/c64/ikari-warriors/media.json`). The scan could report such a match as `near`, with the key, so the run answers it as a part instead of nearly calling it unused (`kit/scripts/media.py`, `kit/c64/media.py`).

## What cost the most time

`kit/c64/snapshot.py` reading v4.0.0 snapshots 23 bytes off: every read was wrong until `check-emulator`'s `snapshot-ram-offset` test pointed at it, and the fix in this branch would have saved the hour.

## Operating system and tools

Linux x86_64 in a Claude cloud container; VICE vice-mcp v4.0.0 release (`v4.0.0-linux-x86_64-gui.zip`), 57 of 57 after the snapshot fix. After switching the machine to NTSC and back, `VICIIModel` reads 0 and snapshots saved under model 1 refuse to load until it is set to 1 again.
