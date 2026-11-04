# Stunt Car Racer — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Give the lockstep every key the game reads": the pause session presses P, O and C= in the races, and it was that session that found the port's pause loop never yielded, which would have frozen the Play tab at the first pause.
- `70-minisite`: "Check the fit on sessions it was not fitted on": the pacing was fitted on four sessions with seed 1 and checked on four with seed 2, a mean error of 1.8 % a stretch.
- `70-minisite`: "Count the page's pass once its clock reaches the checkpoint": `test_play.js` counts the page's passes as each one's stretch is paid, so a slow page cannot pass as one in step.
- `70-minisite`: "A shape the game paints into the screen itself is drawn by the game's own routine": the opponent's car, which the game draws into the bitmap with the view, is shown on the Graphics tab in frames the Play tab's port draws, not in a drawing of its own.
- `70-minisite`: "is not drawn again as a still on a sheet": the wheels and the boost's flame are shown only moving, stepped the way the game steps them, with no sheet of their sprites.

## What was changed in the kit

- `kit/c64/lockstep.js`, `kit/spectrum/lockstep.js`, `kit/nes/lockstep.js`: a new option, `entry`, times the stretch from the address the program starts at to the first checkpoint, which was never timed before. Without it the routines only the start-up calls had no row in the pacing fit, cost the page nothing, and the Play tab reached the menus 13 frames early from the hand-over (`test_play.js` caught it). The C16 lockstep already timed that stretch.
- `kit/c64/lockstep.js`, `kit/nes/lockstep.js`: the lockstep keeps a copy of the `hooks` it is given. Given the machine's own `m.hooks`, it added its checkpoints to that object and then handed them to the copies of the machine `irqBytes` runs on, and the run went out of step at the first pass with a divergence that pointed nowhere near the cause (checked: with the old file and `hooks: m.hooks` this game's practice session stopped at pass 0; with the new one it is identical).
- `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's clock": the start is a scene the fit has to see, so a port the page starts from the game's own start gives the lockstep `entry`. games/c64/green-beret has the same shape: its page runs `P.main()` from the start-up at `$4000`, and its lockstep starts there with no `entry`, so its start-up's routines are not in its fit. Lesson: `kit/lessons/2026-11-04-stunt-car-racer.md`.

## Candidates

- **The fit can place a write inside a stretch at the wrong time.** The pacing fit priced each stretch's total well, but routines that are always called together (here the menus' line and fill routines) can share their cost in any proportion, and the fit picked one. The page then made a write in the middle of a stretch, the change of screen mode at `$3DF8`, seven frames before the game did. Nothing failed but `test_play.js`'s check of when `$3DF8` changes. A checkpoint just before the write (`$3511`) made its time the end of a stretch, which the fit measures directly. The skill would say: where the page shows the moment of a write (a change of screen mode, a sound started), put a checkpoint just before it, rather than trust the fit to split a stretch. No other game's notes show the same miss.

## Maintainer asks

- #761: Stop a lockstep run hanging when a port loop never yields.

## What cost the most time

Pacing the Play tab from the hand-over: an `entry` in the lockstep from the start, and the rule in `play.md` that now says so, would have saved the search for why the page reached the menus early.

## Operating system and tools

Linux x86_64 cloud container with no display, VICE 3.14.0 (x64sc, PAL) with its MCP server, regenerator2000 0.9.20, Node 22.23.4, Python 3.13.18. Nothing the install notes do not already say.
