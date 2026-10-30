# Squirm — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `c64-reference`: "`$D400`-`$D418` cannot be read. A read of one returns the data bus": the death's `DEC $D401` was read as the bus and measured after each step on a 6581 and an 8580, and the page's sound player and `test_sound.js` both model the bus with `createBus`, so the two chips' deaths sound as the game's do.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the sound players got `test_sound.js`, which runs the game's own sound code with its real interrupt and compares every write to the SID, jiffy by jiffy; it found the player silencing the high-score climb and writing a bonus note before its gate.
- `60-verify`: "A first sample is usually over the mark": the sample's six wrong comments were corrected with the comments that said the same, and the run went on to the minisite, recommending the audit rather than starting one nobody asked for.
- `70-minisite`: "`../../lib/cpu6502.js` is the kit's 6502 simulator": every widget runs the game's own routines on the listing's bytes, and `test_frame.js` holds the frame the page draws to VICE's, pixel for pixel.

## What was changed in the kit

- `kit/c64/INSTALL.md` and `kit/c64/tools.py`: the disassembler is installed with `cargo install --locked`, and the notes say why. Without it cargo took `regenerator2000-tui` 0.9.21, which does not compile with regenerator2000 0.9.20, so the install as written failed on 30 October 2026.
- `kit/scripts/listing.py`: a note names the routines in the Source tab's index that keep the disassembler's own name (`b_3A8F` and the like), with `kit/scripts/test_listing_auto_names.py`. This listing had 48 of them, blocks given a line comment and never a name, and nothing said so until the index was read by eye.
- `kit/lessons/2026-10-30-squirm.md`: reading a leftover BASIC program along its own line links.

## Candidates

**A code map that misses the start-up.** `codemap.py zap` runs a stopped
machine for a moment to reach VICE's monitor. With the hand-over
snapshot loaded and stopped at the game's entry, the start-up ran in
that moment and was cleared with the record, so the first code map held
no start-up and said nothing about it. It was caught because the
disassembler had traced the start-up from the entry and the map did not
show it. Loading the snapshot again after the zap recorded it. A skill
would say, in `kit/skills/c64/tool-vice-mcp`, "Recording what ran": zap
before loading the snapshot the session starts from, since the zap runs
the machine and clears what ran while it did.

## Maintainer asks

None.

## What cost the most time

The `--locked` fix to the disassembler's install, now in
`kit/c64/INSTALL.md`, would have saved the failed compile and the hunt
for its cause.

## Operating system and tools

Linux x86_64 in a cloud container, no display; VICE 3.10 from the vice-mcp
release v3.14.0 (`v3.14.0-linux-x86_64-gui.zip`), which needed the nine
packages `kit/c64/INSTALL.md` lists unpacked into `tools/vice-libs`;
regenerator2000 0.9.20 built with `--locked` (about six minutes); Node 22.
