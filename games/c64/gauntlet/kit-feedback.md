# Gauntlet — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "Sweep the whole input space, not a few plausible values": the poison test runs health_tick from all 65,536 health values, and writing it showed that poison below 100 health wraps to `$FF50`, the page's best bug.
- `60-verify`: "If the first sample is bad, audit the whole listing before the page is published": with 8 of 60 wrong I audited every cited caller and every "nothing reads" claim, which found a table called unused that poison reads.
- `60-verify`: "search the listing for every comment that says the same, and correct them together": treasure_end's wrong "starts the tune" led to tune_init's wrong "sets tune_on", which the sample had not drawn.
- `70-minisite`: "The game's own driver run on a 6502 core inside `createDriver` counts as a port": the page runs both music players and the level builder from the game's bytes rather than ports written by hand.
- `c64/tool-vice-mcp`: "Hold an input until the thing that should react has reacted": the route script presses SPACE again until it sees the loader running, after a single press was lost.

## What was changed in the kit

- `kit/c64/r2000.py`: `--apply` refuses a line such as `$C100 byte`, which named a label "byte" instead of typing the address, and says to write `$C100-$C100 byte`; tested in `kit/c64/test_r2000.py`. The run met it as "Label 'byte' already exists" on the second such line, after the first had quietly named a label.
- `kit/c64/vice.py`: `frames(rpc, n)` sends a count above 1,000 as several requests, since `vice_frame_advance` refuses more than 1,000 in one; tested in `kit/c64/test_vice_client.py`. A live test asking for 2,560 frames failed partway through.
- `kit/lessons/2026-10-12-gauntlet.md`: run decimal arithmetic at its borrow.

## Candidates

None.

## Maintainer asks

None.

## What cost the most time

A note in `60-verify` that the independent checker should write each verdict to its report as it goes would have saved a whole checker run, lost with nothing written when the contributor's session limit stopped it.

## Notes for the next run

- The first checker agent stopped at the contributor's session limit before writing anything; the second, told to append each verdict to `checker.md` as it settled it, finished. This shows itself, so it is noted here, not in a skill.
- Inline string arguments after `JSR $B008` were re-decoded as code each time a trace was seeded from a call site; keeping the 21 argument words in their own annotation file and re-applying it after every seeding was the fix (`50-coverage`, "Inline parameters").
- Host: Linux x86_64, Ubuntu 24.04.5, a cloud container; VICE release v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`), regenerator2000 0.9.20, node 22.
