# Speedball 2 — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": the checker marked one sprite frame's comment wrong, and the search found 23 more frame comments with the same belief, all corrected with it.
- `60-verify`: "a stratum of their own, draw about 20 from it": the 173 comments written from templates got 20 draws of their own and a weighted rate beside the plain one, which kept 3 wrong in 20 from standing for the whole listing.
- `70-minisite`: "with a button for every tune the game stores": tune 1, which nothing in the intro starts, got its own button and a section on the Discoveries page instead of a line in `TODO.md`.

## What was changed in the kit

- `kit/c64/INSTALL.md` and `kit/c64/tools.py`: both `cargo install` lines for regenerator2000, and the message `tools.py` prints when it is missing, now pass `--locked`, and the install section says why. Without it cargo took `regenerator2000-core` 0.9.21 for the 0.9.20 release, and the compile stopped with `error[E0308]` at `src/main.rs:838`.
- `kit/lessons/2026-10-30-speedball-2.md`: a code map recorded while a game runs code it unpacks into a shared buffer.

## Candidates

A code map recorded in play holds every instruction that ran, including
those of routines the game unpacks into a buffer and runs there: this
game unpacks four of them, one at a time, to $C000, where its snapshot
holds the title routine. `check_listing.py` then fails every one of those
bytes that is not typed Code, and typing them as code makes the
disassembler read the title's bytes at boundaries that belong to another
program, a listing that reads as code and is wrong. It was caught only
because the run had already compared the menu, gym and match snapshots
and found different code at $C000 in each. The run kept, inside the buffer, only the
starts a trace of the snapshot reaches, and described each buffered
routine on its packed bytes (`kit/lessons/2026-10-30-speedball-2.md`).
`50-coverage` would say, beside its guidance on code loaded as data:
when a code map records code in a buffer the game unpacks or copies into
during play, keep from it only what a trace of the snapshot reaches
there, and list the buffered code where it is stored. No other game's
notes show the same shape, so the skill is not edited.

## Maintainer asks

None.

## What cost the most time

The regenerator2000 compile was the only stop the kit caused, and
`--locked` on its install line, now there, would have saved it; the rest
of the time went on the game's encrypted boot and on the annotation
itself.

## Operating system and tools

Linux 6.18 x86_64, a cloud container with no display. VICE v3.14.0
(vice-mcp's Linux release, `check-emulator` 57 of 57), regenerator2000
0.9.20 built with `cargo install --locked`, Python 3.13.17, node v22.22.0.
