# Laser Squad — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Leave a polling loop's cycles out of what is fitted": the wait for SPACE after the tape is left out of the pace fit, and the page's clock runs its turns.
- `70-minisite`: "Check the fit on sessions it was not fitted on": five games of 18,995 passes were held back from the fit, which is how the weighting's gain was measured.
- `70-minisite`: "Give the lockstep every key the game reads": games with each of the four controls, and a save between turns that the page loads again, are in the runs and in `test_play.js`.
- `60-verify`: "An audit of every comment, and a second sample after it, are later work that the run recommends and does not do": the sample was over the mark, the ten wrong comments and their kind were corrected, and the audit is recommended in `TODO.md`.
- `70-minisite`: "Test each routine alone first": 201 routines were checked alone on 8,476 moments before the whole program ran in lockstep.

## What was changed in the kit

- `kit/skills/core/70-minisite` (SKILL.md, "Start each case where the game starts it"): a widget does first what the game's code does before it calls the routine; it would have mattered in `games/c64/chiller`, whose level jump left the skipped level's state on screen. Lesson: `kit/lessons/2026-11-03-laser-squad.md`.

## Candidates

- **A pace fit weighed by stretch length.** Fitted unweighted, the long stretches of the computer's turns set the prices and the many short passes (menus, the cursor) ran more than 6 % off; weighing each stretch by W / (T + W) fixed it (`port/scripts/fit-cost.js`, `kit/lessons/2026-11-03-laser-squad.md`). No other game's notes show the same failure: Driller's fit went wrong on one heavy routine instead. A run whose pace test fails on short passes adds it to `play.md`, "Pace it by the machine's clock".

## Maintainer asks

None.

## What cost the most time

A shared pace-fitting script in `kit/` (the non-negative least squares, the held-back test and the weighting), which this port copied from Driller's and then had to change, would have saved the most time.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04, no display) in a hosted cloud session; ZEsarUX 13.0 (47 of 50 in check-emulator, the three failures the Spectrum notes already record), SkoolKit 10.1, Python 3.13, Node 22. A `pkill -f` whose pattern matched its own shell command killed that command (exit 144): name the process by something its own command line does not contain, or stop a background task by its id.
