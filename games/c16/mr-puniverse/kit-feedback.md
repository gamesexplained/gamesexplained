# Mr Puniverse — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Test each routine alone first, against the game's routine run by the simulator": all 89 routines were tested on 723 saved moments of play before the lockstep, and the one wrong case (a shot moving into his block) showed there, beside its cause.
- `60-verify`: "A wrong comment is usually one belief written down more than once": each of the four wrong comments the sample found was searched for in the listing, and the others that said the same were corrected with it.
- `70-minisite`: "Read what the interrupt writes through one function": the port reads the key code and the SHIFT flag through `P.irqByte`, so the lockstep hands it every value the game read in a stretch.
- `60-verify`: "Give them a stratum of their own, draw about 20 from it": the room comments, written by the room decoder, were sampled as a stratum of 20 beside 60 hand-written ones.

## What was changed in the kit

- `kit/c16/machine.js`, `site/lib/c16.js` (`C16.timing`'s `charLine`), `kit/c16/ted_timing.py` and its fixture: TED's `$FF1F` bits 0-2, the line within the character row, as plus4emu gives them. Why: this game's random cannon reads bit 0 to choose a side, and the machine returned a constant.
- `site/lib/c16.js` (`C16.scnkey`), `kit/c16/machine.js` (`kernalHooks`), `kit/c16/scnkey_record.js`, `kit/c16/test_scnkey.js` and its fixture: the KERNAL's keyboard scan written again in JavaScript, held to the ROM on 800 recorded cases, cycles included. Why: a game whose interrupt calls SCNKEY could not run on the machine or on a page without it.
- `kit/skills/c16/steps/SKILL.md`, "machine": names `kernalHooks` and `C16.scnkey`.
- `kit/skills/c16/c16-reference/SKILL.md`, "Timers and the raster": what `$FF1F` bits 0-2 read, line by line.
- `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's clock": count the page's pass once its clock reaches the checkpoint, not when the port yields it. It matters in `games/c16/prospector-pete` and `games/c16/tycoon-tex`, whose runtimes count at the yield. Lesson: `kit/lessons/2026-10-27-mr-puniverse.md`.
- `kit/skills/c16/c16-reference/SKILL.md`, "The mistakes that bite": bytes below the game that it reads before writing them, the tape buffer's among them, set as plus4emu holds them at the hand-over, and the page's first picture compared with plus4emu's because a lockstep cannot show one missing. It would have mattered in `games/c16/tycoon-tex`, also a Novaload tape run from its listing with the loader in the tape buffer. Lesson: `kit/lessons/2026-10-27-mr-puniverse.md`.

## Candidates

A pacing fit that watches the port's counts of work through a proxy put
in `P.N`'s place sees none of them when the port's groups keep their own
reference to the object (`const N = P.N`). Nothing failed: the fit
passed its test on a session it was not fitted on, with the missing
cycles folded into the interrupt's cost, and only `test_play.js`'s
timing of F1 to the first pass (eight frames late) showed it. The
C16 ports of `games/c16/prospector-pete` and `games/c16/tycoon-tex` reach
`P.N` through `P` each time, so their proxies work. If a third port
captures it, `play.md`'s "Pace it by the machine's clock" would say:
watch the object's own properties, or check that every count the port
makes reaches the fit.

## Maintainer asks

- #592: count Prospector Pete's and Tycoon Tex's Play-tab passes when the clock reaches them

## What cost the most time

A step in `play.md` that compares the page's first picture with the
emulator's before the lockstep starts would have caught the title's
missing colours at once, instead of after 240,000 frames of clean
lockstep.

## Tools

Linux (Ubuntu 24.04), x86_64, in a cloud container; plus4emu 1.2.11
(git 939e652) with `kit/c16/codemap.patch`, built without libsndfile;
regenerator2000 0.9.20; Python 3.13.17; Node.js 22.22.0 for the port and the
tests. The install notes held without change.
