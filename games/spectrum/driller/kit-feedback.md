# Driller — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Pace it by the machine's clock": the Play tab's port charges each stretch, routine and count of work its fitted T-states, and when a sensor in view made the page run ahead of the game, the interrupt's own work (its sensors and beams) got counts and a fit of its own.
- `60-verify`: "give them to a checker for a sample check as the draw wrote them, before you change any of them": the 75 comments went to the checker exactly as drawn, and only after its verdicts were read against the code were the 14 wrong ones corrected.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the gas widget calls `drill`'s own multiply and divide, and the Discoveries puzzle runs the game's scripts through the port's `run_scripts`, rather than a model of them written for the page.
- `70-minisite`: "Sweep the whole input space, not a few plausible values": the arithmetic routines are tested on random operands beside the game's own, not only on the operands play gave them.
- `70-minisite`: "Stepping through things of one kind": the Maps tab steps through the 29 areas with the site's `.pick` control.

## What was changed in the kit

- `kit/lessons/2026-11-02-driller.md`: what the run learned about reading a game's object scripts (below).

## Candidates

None.

## Maintainer asks

- #729: kit/spectrum/lockstep.js: tell a port write of the same value apart from no write at all.

## What cost the most time

False differences at the sensors' beam (`$8A21`, `$8A46`). Six saved moments failed late in play by one byte each, and it took several rounds of lockstep runs to see that the port was right and the lockstep's record of the interrupt's writes was stale: when the port's own program writes the value an interrupt had just left, `lastWriters()` in `kit/spectrum/lockstep.js` cannot tell it from no write (#729). A checkpoint at each end of every beam wait fixed it.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04, no display), a hosted cloud session. ZEsarUX 13.0 (`ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`), check-emulator 47 of 50 on 2 November 2026, the three failures (count-while-running, load-keeps-frame-phase, warp) each covered by a workaround in `kit/skills/spectrum/tool-zesarux`. SkoolKit 10.1, Python 3.13.18, Node 22.23.4. Nothing new for the install notes.
