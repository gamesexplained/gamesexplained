# Jumpman Junior — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": I read all 15 against the listing before counting, and each held, so none was dropped as a false alarm.
- `60-verify`: "Correct every comment the sample found wrong, and every other comment that says the same thing": the one wrong change-script name led to six more shared scripts on levels 7 and 11, and two lists of a variable's uses to the rest of `$0881`-`$0885`.
- `75-review`: "Tell the reader nothing about which sections you think are weak": the reader found the level 9 map letting all sixteen bombs be defused, which I had not looked for.
- `12-media`: "An open file or bank with 90 % of its bytes in one part's listing is answered": the game file was still open; answering it showed the protection's 268 bytes needed saying.

## What was changed in the kit

- `kit/skills/c64/c64-reference/SKILL.md`, VIC-II essentials: the VIC's registers repeat every 64 bytes up to `$D3FF`, so a store there is a VIC write to name, not a mistyped address. A fact about the machine, checked live in VICE (`facts.md`).
- `kit/skills/c64/c64-reference/SKILL.md`, "`CBM80` in a game that is not a cartridge": the reset looks for the signature before RAMTAS, which is what sets the tape buffer pointer `$B2`/`$B3` to `$033C`. A fact about the machine, read in the KERNAL.
- `kit/c64/snapshot.py`, `kit/c64/check_emulator.py`, `kit/c64/r2000.py`: read a VICE 4.0.0 snapshot, whose RAM moved, by its module. The same change as on the branch `game/c64/a-nightmare-on-elm-street`, carried here because this run needed it; whichever pull request merges second takes it unchanged.
- `kit/lessons/2026-11-17-jumpman-junior.md`: stores into a cartridge image's own range become real writes when the image runs from RAM; a list of a byte's uses is checked by a references search.

## Candidates

- A cartridge image loaded into RAM from disk: a store that hit ROM on the cartridge now changes the game. Here it was level 10's `STA $8004`, which rubs out the `CBM80` signature. It went unnoticed in annotation as a harmless leftover and was caught only by a live test. A skill would say, in `60-verify`: when the game is a cartridge image running from RAM, list every store into the image's range and test each one. No other game in `games/` was found with the same shape, so it waits here.

## What cost the most time

- Restarting the emulator and disassembler after the container restarted mid-run, and a first live test that poked Jumpman onto a bomb before the level was drawn. Neither was the kit's fault.
- The single change that would have saved the most: the lesson above, a search for stores into the cartridge's own range, run at orient.

## Environment

- Linux x86_64 container; VICE 4.0.0 release (`v4.0.0-linux-x86_64-gui.zip`), `check-emulator` 55 of 57 (`checkpoints-survive-load`, `snapshot-ram-offset`, as recorded in `orientation.md`); regenerator2000 0.9.20.

## Maintainer asks

None.
