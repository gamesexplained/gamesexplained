# Bruce Lee — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": each of the sample's 16 findings was read against the disassembly before it was counted, and all held.
- `c64-reference`: "The matrix. A row is the `$DC00` bit driven low": decoding the game's key codes against the grid showed that the keys read in play are F1, S, SPACE and V, not the function keys and RUN/STOP the Bronze comments named.
- `70-minisite`: "The game's own driver run on the kit's processor counts as a port": the Music tab runs the game's own music player and effect players on the site's 6502 instead of a rewrite, and `test_music.js` compares every SID write with the game's code in `kit/c64/machine.js`.

## What was changed in the kit

- `kit/skills/c64/c64-reference`, "Keyboard and joystick": a paragraph on games that test only a few keys from a table of row and column pairs, and naming each key from its pair. The Bronze listing named such a table's keys from a guess, and the error was silent.
- `kit/lessons/2026-11-10-bruce-lee.md`: the two lessons of this run.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

- The sample's findings: 16 to read against the code and correct, with the comments that repeated them.
- Finding the reviews' own words: the ZZap!64 transcription site refused the fetch, and the other pages carry scores only.
- From the Bronze run: finding the keys that leave a crack's intro and text page (a note in `10-orient` that a cracker's front end waits on keys its screens never name, and that the code's `$DC01` compares name them, would have saved about ten minutes).

## Operating system and tools

Linux 6.18 x86_64 cloud container; VICE v3.14.0; regenerator2000 0.9.20; Python 3; node 22.23.4 for the music test and the browser checks; Chromium through Playwright for screenshots.
