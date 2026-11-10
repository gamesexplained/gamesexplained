# Fire Trap — kit feedback

This file is provisional: the run is at Bronze, and the retrospective is
written again when the run reaches its final tier.

## Skill text that changed what I did

- `10-orient`: "Several versions on one disk": the contributor gave two images of the same crack, so I compared their directories before choosing one; they hold the same program with different sizes (128 and 152 blocks) and I analysed the plain one.
- `10-orient`: "A packed program may pass through several hand-overs": the first stop at `$0816` was only a second-stage unpacker, so I read it and set the checkpoint at its last jump, `$0900`.

## What was changed in the kit

- `kit/c64/INSTALL.md` and `kit/c64/tools.py`: the disassembler install now says `cargo install --locked`, with the reason.

## Candidates

- A comment that says where a routine writes (colour RAM, a screen, a character set) should be read against the address the pointer is built from. Seven of the 21 wrong comments in this game's sample named the wrong destination. A line in `50-coverage` asking for the pointer's base to be named would catch them.

## Maintainer asks

None.

## What cost the most time

`cargo install` of the pinned disassembler release failing to compile (three errors in the TUI crate) until `--locked` was added.
