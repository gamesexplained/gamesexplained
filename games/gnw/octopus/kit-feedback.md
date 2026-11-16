# Octopus — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Read every comment it marks wrong or doubtful against the code yourself": I traced all five findings and measured the click (98 cycles, not the checker's 105) before counting them.
- `50-coverage`: "Callers and readers, and any "only", "never" or "every", come from the platform's references search": I searched `TRS $03` in the whole ROM before writing that only add_point calls skip_if_clear1.
- `steps`: "Yield on every loop the program can stay in while a button is held": the port yields at pass, the wait, after_draw and read_keys, and no session waited for ever.

## What was changed in the kit

- `kit/skills/gnw/steps/SKILL.md`: the references row says to drive the coverage run with a player that looks ahead on copies of the machine (`SM5A.load`), since random play leaves the scoring paths unrun and the phase tags then read as "never in a game" (`kit/lessons/2026-11-13-octopus.md`).
- `kit/lessons/2026-11-13-octopus.md`: the run's entry.

## Candidates

- **A test hooked on a routine shared by two paths.** test_frame's first hook, after the drawing, was also reached when nothing was drawn, and it reported 411 false differences. It showed itself, so it stays here.

## Maintainer asks

- #953: Popeye (Game & Watch): Fix the click's count in the listing

## What cost the most time

A player for the coverage run that looks ahead on copies of the machine, from the start: random play left the scoring paths unrun and two wrong conclusions followed from it.

## Systems

macOS 27.0 on an Apple M4 Mac mini, Node 24.18.0, Python 3.9.6, Google Chrome for the reference pictures and page checks.
