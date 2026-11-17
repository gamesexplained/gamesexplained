# The Living Daylights — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Start with the leads, because a run's best findings can sit in its notes": I listed sixteen leads from `facts.md` and `features.md` and gave each a section before writing, which put the level 8 pause, the sound driver's slips and the source scraps on Discoveries.
- `60-verify`: "Correct every comment the sample found wrong, and every other comment that says the same thing": the Bond sprite error was in 13 comments and `facts.md`, not only the two the sample drew.

## What was changed in the kit

- `kit/lessons/2026-11-17-the-living-daylights.md`: three reading lessons from the sample and the Graphics tab.

## Candidates

The sample's commonest error, sprite roles taken from the sprites' numbers, went unnoticed until a checker drew the positions; a skill line in `50-coverage` ("draw a multi-sprite figure at the positions its code sets before naming its parts") would have caught it. No other game's notes show the same mistake yet, so it waits here.

A reference screenshot named `level-intro.png` was a frame of play, and the first `level-4.png` was the weapon menu; both were caught only when the pages were laid out. A check that every reference picture is shown and captioned by a page would catch it earlier.

## Maintainer asks

None.

## What cost the most time

Settling the listing after switching the snapshot from the hand-over to play, because the packed screens move when the game starts; `10-orient` saying "take the listing's snapshot after the game's own start-up has copied its data into place" would have saved the rebuild.

Host: Linux x86_64 (Claude cloud container), VICE 4.0, regenerator2000 0.9.20, node 22.
