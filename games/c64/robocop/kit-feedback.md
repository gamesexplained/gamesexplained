# Robocop — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": each of the 12 findings was read against the listing before it was counted, and the same beliefs were then corrected in other comments.
- `kit/skills/core/15-parts`: "Give each part a folder, a snapshot and a route, and find what stays.": what stays in memory for all three loads got a part of its own, which is how stage seven's tiles at `$C400` were found to come with level one's file.

## What was changed in the kit

None.

## Candidates

A music driver whose tables sit a few bytes below its first routine: the
player page embedded the code from the first routine and played wrong
notes without any error, because the missing bytes read as zeros. It was
caught only because `test_music.js` compared the page against the game
with the whole load in memory. A skill could say: find the driver's range
from the reads a run of it makes (cpu6502's `reads` map), not from its
first routine.

## Maintainer asks

None.

## What cost the most time

Typing the level-skip words into the emulator reliably; a kit helper that
types a word with held keys and checks a counter would have saved it.
