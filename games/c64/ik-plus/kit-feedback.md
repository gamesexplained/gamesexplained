# IK+ — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Draw a random sample of about 60": the one checker's 80 comments found seven wrong at 100 % coverage, and correcting them found twelve more that repeated the same errors.
- `60-verify`: "Any claim that can be tested in the emulator in under a few minutes gets tested": I scored every attack live and compared the points added with the digits painted on the fallen fighter, which showed attacks 3 and 6 paint half the points they score.
- `70-minisite`: "Sweep the whole input space, not a few plausible values.": I ran the music port with 119 effects started at random moments and seven runs on patched data, until every instruction of the driver but one uncalled routine had run in a comparison.
- `70-minisite`: "with a button for every tune the game stores, unused ones too": the two sound effects nothing plays got buttons of their own.

## What was changed in the kit

- `kit/lessons/2026-10-09-ik-plus.md`: a lesson from this run.
- `kit/scripts/check_docs.py`: a lesson's heading may name a game whose title is three characters or fewer. The check skipped such titles for every rule, so a lesson from IK+ failed as naming no game; skill text still ignores them, where a short title would match ordinary words.

## Candidates

**A hand-over the game's own start-up rearranges.** IK+'s loader hands
over with two pages in each other's places: the game's first routine
swaps them before anything runs from either. `10-orient` offers the
hand-over or the play snapshot, and the hand-over disassembled cleanly,
and annotating it put each page's code at the other's address. The
analysis moved to an image taken just after the swap, and the
annotations made so far were applied again by address. The skill would
say: when the comparison of the hand-over with play shows a block that
moved rather than changed, take the image from just after the move.
No other game folder could be named for it.

## Maintainer asks

- #276: Stop codemap.py counting bytes that never ran when code is overwritten.

## What cost the most time

A line in `10-orient` on taking the image from just after a start-up
that moves code would have saved restarting the disassembler and
applying the first annotations again.

Run on Linux x86_64 (Ubuntu 24.04, cloud container, no display) with
VICE 3.13.2 and regenerator2000 0.9.20, as `kit/c64/INSTALL.md` says;
nothing to add to the install notes. The disk image boots about one time
in seven in VICE: its protection reads track 41, which has no sync mark
in the G64, so it passes or fails by where the head lands. The failure
shows itself (the machine resets to `READY.`), so it is written here and in
`agent-history.md` rather than in a skill; `orientation.md` has the
recipe and `work/scripts/try_boot.py` loops boots until one passes.
