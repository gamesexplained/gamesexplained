# Gunship — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": the sample's 15 wrong comments came from about a dozen beliefs, and searching all eight parts for each found 38 more comments saying the same, among them two in other parts claiming every BASIC program has the LIST guard.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the big map runs the flight's own `draw_map` on the kit's 6502, and its first run showed the map is 12 by 12 squares where the listing said 14 by 14; the hit test, swept against `hit_helicopter`, showed that training, not style 0, is what makes every shot miss.
- `60-verify`: "Comments a program wrote, a decoder describing every record of a format": the 271 generated comments got a stratum of their own, and its 5 wrong of 20 came from four templates, each corrected in every record it wrote.
- `70-minisite`: "Sweep the whole input space, not a few plausible values.": the hit test runs all 32,768 combinations of attacker, style, pass and random number instead of a handful.

## What was changed in the kit

- `kit/lessons/2026-10-31-gunship.md`: a checker briefed with a wrong fact passes the comments that repeat it; "every" checked on one is a claim about one; a font can draw letters as digits.

## Candidates

A checker's brief carries the run's own `facts.md` as "what is
established", and the checker uses it. Here it said the high byte of a
unit's position was a map square, so the checker passed a comment that
said the same; a widget showed the fact wrong after the sample. The skill
would tell the run to read the brief's conventions against the code again
before the sample, and to count a passed comment as wrong when a fact in
the brief turns out wrong. No other game's history shows the same case.

A claim made with "every" from one tested case: the listing and
`features.md` said every BASIC program starts with the LIST guard, from a
live test of one. One of six does not. Caught in the copy pass, when a
heading made the claim plain. The skill (`60-verify`, or `70-minisite`'s
copy pass) would say: for "every", "all" or "each", list the members and
check each.

A custom font that draws unused letters as digits (J as 7, X as 8, O as 0)
and puts an exclamation mark where ASCII has a full stop. `30-text` warns
about punctuation moved; the letters-as-digits case is not named. Caught
when the shape viewer showed "T-J2" for a target's name.

## Maintainer asks

- **kit/c64: Add a script that logs every KERNAL LOAD during play, with the file name and the memory each load changed.** Gunship's disk is protected with Rapidlok V6, whose directory points at decoy sectors, so `kit/c64/disk.py` decoded 32 sectors of either side and none of the files. Every load (more than twenty across the two sides) had to be found by stopping at `$FFD5`, reading the name through `$BB`-`$BC` and its length at `$B7`, and comparing memory before and after, with throwaway scripts; a checkpoint on the load's return address did not fire reliably under Rapidlok, so diffs between successive `$FFD5` stops were what worked. A `kit/c64` script that runs the emulator through a route and writes, for each `$FFD5` call, the name, the drive, the secondary address and the address ranges that changed until the next call, would give `15-parts` its load table and each part's `ranges` in one run, and would work on any disk whose loader goes through the KERNAL's LOAD, protected or not.

## What cost the most time

A script that logs every KERNAL LOAD with its file name and the memory it changed would have saved the hours spent finding the eight parts' loads behind Rapidlok's decoy directory by hand.

## Operating system and tools

Linux x86_64, Ubuntu 24.04.5, in a cloud container. VICE from vice-mcp
release v3.14.0 (`v3.14.0-linux-x86_64-gui.zip`), regenerator2000 0.9.20.
The G64 images needed nothing in `vicerc`: VICE's defaults ran the drive's
processor and Rapidlok loaded every file.
