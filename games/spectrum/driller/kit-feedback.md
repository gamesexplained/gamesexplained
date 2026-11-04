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

- `kit/skills/core/70-minisite/play.md`, "A clock, not a frame loop": a frame start that passes while the interrupts are off is lost, and a page that runs the lost ones back to back freezes when the handler is longer than a frame. Driller's Play tab froze that way after a sensor's hit, and `games/spectrum/where-time-stood-still` already loses, in its page's machine, the interrupt its long view copy passes over.
- `kit/lessons/2026-11-02-driller.md`: what the run learned about reading a game's object scripts, and the frozen page (below).
- `kit/skills/core/70-minisite/fast-cpu.md`, "The frame limiter": the reason for 60 ticks is the displays, not the machine's screen, and a game kept at its own speed ticks once a video frame. Driller's frame interrupt, 50 a second, gets ticks of its own at 60; `games/c64/space-rogue` and `games/c64/mercenary`, which the guide named for ticks of their own, tick once a video frame.
- `kit/skills/core/70-minisite/fast-cpu.md`, "Controls", and `site/lib/fast-cpu.js`: a repeat and every job run once a step count loops, not ticks. Driller's laser sound holds the loop that fires 12 ticks, more than K at every Speed, so a held laser fired every loop and a walk with it held took 96 ticks a step against the Spectrum's 51. `games/c64/castle-master` waits inside a loop after a throw, its one repeat.
- `kit/lessons/2026-11-03-driller-fast-cpu.md`: what adding Fast CPU to a Spectrum game taught.

## Candidates

- `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's clock": to find what the fit does not count, hook the machine at each routine's entry and its return and take each routine's own cycles a call, its callees and the interrupts left out; price from those measurements the routines whose cost a call is steady, give a routine whose cost a call varies widely a count of its own work, and fit the rest around them. Driller's face sort is a bubble sort that cost 14,000 T-states a call in one scene and 473,000 in another; uncounted, the fit put its cost on the drawing routines and the page ran 13 % fast in a view full of faces, and keys held for several passes, as well as random ones, found the scene (`port/scripts/own-cycles.js`, `port/scripts/price-routines.js`). It waits for a second game that shows it before it goes into the skill.

- `kit/skills/core/70-minisite/fast-cpu.md`, "The frame limiter" and "Controls": a delay loop in a pass that moves a pointer sets a speed of the game's own, so share the pass's time rather than time the delay as on the machine (timed as on the machine, Driller's crosshair went 60 pixels a second against the Spectrum's 94). And a main loop that waits inside itself for a key starts at the key read, with Fast CPU switched on during that wait taking the wait's loop as its own. Both wait for a second game with Fast CPU that shows them.

- `kit/skills/core/70-minisite/fast-cpu.md`, "The frame limiter": a page that shows memory as the last loop left it hides whatever the game draws and rubs out around a wait that holds the processor. Driller draws the laser's four lines, plays its sound for 0.189 s with the processor, and rubs them out in the same stretch, so the page showed no beam at all; while the clock is more than a frame past real time it now shows the frame the beam took at real time (`rt.fastFrame` in `port/page/runtime.js`). And a key that comes up before its least hold must be let go at each refresh as well as between loops, because the screens outside the main loop go round no loop: let go only between loops, a tap of I held itself down through the information screen, which closed itself after 0.7 s. Castle Master's page had the same code and was given the same line without a game moment that shows it there. Both wait for a second game that shows them.

## Maintainer asks

- #729: kit/spectrum/lockstep.js: tell a port write of the same value apart from no write at all.

## What cost the most time

False differences at the sensors' beam (`$8A21`, `$8A46`). Six saved moments failed late in play by one byte each, and it took several rounds of lockstep runs to see that the port was right and the lockstep's record of the interrupt's writes was stale: when the port's own program writes the value an interrupt had just left, `lastWriters()` in `kit/spectrum/lockstep.js` cannot tell it from no write (#729). A checkpoint at each end of every beam wait fixed it.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04, no display), a hosted cloud session. ZEsarUX 13.0 (`ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`), check-emulator 47 of 50 on 2 November 2026, the three failures (count-while-running, load-keeps-frame-phase, warp) each covered by a workaround in `kit/skills/spectrum/tool-zesarux`. SkoolKit 10.1, Python 3.13.18, Node 22.23.4. Nothing new for the install notes.
