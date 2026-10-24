# Paradroid — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "The comparison that counts the pixels that differ from the emulator's picture of the same frame is the drawing's test": I rebuilt a recorded frame of play from memory, which showed the deck drawn in one colour per character where three comments said multicolour; they were corrected and the frame matched all 104,448 pixels.
- `70-minisite`: "A widget that runs a mechanic is a claim too": each widget's port was run against the game's own routine in the kit's 6502 before it went on the page, which found the ship names one word off and the enquiry's capitals unlike the game's.
- `60-verify`: "A clock decremented from the main loop is only as regular as the loop": I counted passes against frames in play (66 in 200) before writing any time in seconds, and the comments that said "frames" for counts kept in the loop were changed to passes.
- `10-orient`: "take each to the same screen and compare their memory": the 1985 and 1986 Hewson disks were compared in play, which showed the 1986 one is a different build, and the plain and patched 1985 images were compared track by track before the patched one was used.

## What was changed in the kit

Nothing. The one silent failure this run met, a pass taken for a frame,
is already the rule in `60-verify`, "Time it", and the rule caught it.

## Candidates

The colours named in comments. `kit/skills/c64/c64-reference` has the
colour registers but no table of the 16 colour codes and their names, so
a comment names a colour from memory. Here the console's comment said the
window was cleared "in yellow", where the routine clears it to an
orange background with yellow text (`$F8` in `$2C`); a screenshot of the
console showed it. That one was a colour taken for the wrong role, not a
wrong name, so no other game can be named yet. If a later run finds a colour named
wrongly, the reference would take the table (codes 0-15 and their names,
from the Programmer's Reference Guide, checked against a screenshot).

## Maintainer asks

None.

## What cost the most time

Annotating the data to 100 % coverage (the `$6900` tables, the sprite
shapes, the dictionary, the title pages, the droid records and the deck
plans) took about half the run, and no change to the kit would have cut
much of it: it is the job.

## Operating system and tools

Linux x86_64, Ubuntu 24.04, in a cloud container with no display. VICE
3.10 from the vice-mcp v3.13.2 release (`v3.13.2-linux-x86_64-gui.zip`),
regenerator2000 0.9.20 from crates.io, Node 22. The protected original
met the drive hang `tool-vice-mcp` describes ("Protected originals
(`.g64`) need the drive's own processor"); the collection's "(patched)"
dump of the same disk loads, and the comparison that shows its game data
is the original's is in `orientation.md`. Autostart jams the drive on
both images, since the boot file runs code from the BAM sector with
`M-E`; typing `LOAD"*",8,1` loads it (`agent-history.md`).
