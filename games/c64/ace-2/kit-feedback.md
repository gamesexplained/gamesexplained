# ACE 2 — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": for each of the twelve wrong comments in the sample I searched the listing for the same belief and corrected seven more with them (plane two's message panel at `$8AA0`, the "letters" of three more character sets, the pitch table at `$6582`, the cipher at `$6F7F` and the grid's second name characters at `$675F`).
- `70-minisite`: "A widget that runs a mechanic is a claim too": the music player runs the game's own driver and the map's read-out is a port of `$14AF`, and `test_sound.js` and `test_map.js` hold them against the game's code for 16,000 calls and for all 23,040 positions on the map.
- `60-verify`: "Give them a stratum of their own": the 106 comments written by scripts (colour RAM and the music's patterns) got 20 of the sample to themselves, and `facts.md` gives the rate weighted by the strata.
- `70-minisite`: "say in the caption how many differ and why": I compared the rebuilt frame with VICE's picture before captioning it, and the caption gives the count, 0 of 104,448.

## What was changed in the kit

- `kit/c64/disk.py`: a directory entry whose chain of sectors leaves the disk is listed as "not a file", with how far its chain goes, and the listing, `unowned()` and `files()` (which leaves it out and says so on standard error) go on past it; `follow()` gives a chain as far as it goes. Before, the first such entry stopped the listing with a `ValueError`, and ACE 2's original disk has five of them, decoys of one sector each, after its boot file. `kit/c64/test_disk.py` adds a decoy disk.
- `kit/cpu/cpu6502.js` and `kit/c64/machine.js`: `readSnapshot` returns the colour RAM (bytes 761-1784 of x64sc's `VIC-IISC` module, format 1.4) as `colour`, and `Machine.fromSnapshot` loads it. Before, a machine started from a snapshot had colour RAM of 0 everywhere, so a test that reads the screen's colours started from black until the game rewrote them; `games/c64/darkman/test_frame.js` reads the same 1,024 bytes from the file by hand. `kit/c64/test_machine.js` adds the case.
- `kit/skills/c64/c64-reference`: the note on colour RAM in a snapshot says `readSnapshot` gives it for format 1.4, and what to do for any other.

## Candidates

None.

## Maintainer asks

- #559: Record the value the game stored beside each video chip write in frame.py

The orientation notes and the page's band captions first quoted `$D018`
and `$D01A` as `frame.py` records them, read back with the chip's unused
bits set, although `frame.py -h`, `kit/skills/c64/c64-reference` and the
Antiriad lesson all warn about it. They were corrected by hand from the
stores; the ask is for the record itself to carry the stored value.

## Operating system and tools

Linux x86_64 in a cloud container with no `sudo`: VICE's release zip
needed its libraries unpacked into `tools/vice-libs`, as
`kit/c64/INSTALL.md` says, and then ran. The original disk took 234
seconds of warp from the reset to the game's first instruction.

## What cost the most time

`frame.py` recording the value each store wrote (#559) would have saved the correction round on the register values; most of the run's time went on reading the 23,805 bytes of code, which no change to the kit shortens.
