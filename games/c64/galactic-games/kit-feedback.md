# Galactic Games — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "`build.py --addresses` lists them page by page: a chip register can stay, but an address of the wrong part": I ran it on the finished pages and it found 19 addresses in code spans on four pages that would have opened the wrong listing; each now links to its own part or is plain text.

## What was changed in the kit

None.

## Candidates

- **A countdown reloaded and stepped on DEC/BPL runs every N + 1 ticks.** All five events' sound drivers keep a rate byte per instrument, copy it into a counter, and take the step when `DEC` drives the counter below zero (`BPL` falls through), so a rate of 26 steps every 27 ticks. Every instrument comment gave the rate byte itself as the period, and it read right; the sample checker caught it at head `$314E` and slither `$2D59` by following the reload. A skill line in `50-coverage` would say: when a comment gives a period from a counter, read where the counter is reloaded and which branch takes the step, and state the period from those (N + 1 for reload-then-`DEC`/`BPL`). No other game folder shows the same mistake on record, so it waits here.

## Maintainer asks

None.

## What cost the most time

Drawing every moving thing from the listings for the Graphics tab took longest, because each event keeps its frames in its own format; no kit change would have shortened that, so the one sentence is that the per-section screenshot script in the scratch folder (each `main section` shot on its own, since a full-page shot leaves off-screen canvases blank) would have saved a round of blank screenshots if the kit carried one.

## Operating system and tools

Linux x86_64 in a Claude cloud container. VICE release v4.0.0 (the kit's vice-mcp build, `check-emulator` 52 passed, 2 failed), regenerator2000 0.9.20, Python 3, Node with the container's Playwright and Chromium.
