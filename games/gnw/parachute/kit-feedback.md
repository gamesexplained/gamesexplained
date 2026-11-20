# Parachute — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `gnw-reference`: "Run each helper once with the bit set and once clear on": I measured every call-table entry on the model with a script before naming any, and when a prediction of the jump chance disagreed with the chip, the measurement showed skip_if_mode_lt2 was named the wrong way round.
- `60-verify`: "the draw wrote them, before you change any of them": I left the listing alone while the checker marked the sample, and corrected the 15 findings only after its verdicts were in.
- `steps`: "Drive that run with a player that can score": I replaced the first coverage run's random presses with a player that aims the boat, so the points, the bonus and the tree ran in the coverage run.
- `gnw-reference`: "Inside a subroutine, `TRS x` is a jump": it explained why timekeep's TRS to the sounds never comes back to timekeep, and the port's timekeep ends where the sound ends.
- `steps`: "Yield on every loop the program can stay in": the port yields at the wait's every pass and at read_keys, so a held button never stalled the lockstep.

## What was changed in the kit

- `kit/gnw/lockstep.js`: takes `initial`, the buttons held from power on, before the first checkpoint, so a test can hold a test pad while the unit powers on (this game's R3 row, which turns misses off); its header also says that in a sleeping clock a press must last longer than a second to reach a checkpoint. A tool change: without it the power-on path could not be held to the chip.
- `kit/skills/gnw/steps`: the `references` row now says to power on before each phase of a coverage run and print each game's score, because a game key pressed while the last game is over may start nothing. This run's first coverage run played no game in its Game A and Game B phases and its tags then said the scoring paths never ran in a game; games/gnw/octopus's first coverage run met the same false "never in a game" from random presses (its agent-history.md, the first wrong turn).

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

The lockstep sessions for the clock's rare states, whose presses fell between checkpoints while the chip slept: the sentence now in `kit/gnw/lockstep.js`'s header would have saved the most.

## Versions

macOS 27.0.1 on Apple silicon, Python 3.9.6, Node 24.18.0, the kit at 0.0.360.
