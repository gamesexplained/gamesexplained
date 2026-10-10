# Uridium — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "audit the whole listing before the page is published": the checker found 8 of 60 sampled comments wrong, so I read all 661 against each other and the bytes before building the page, and 13 more wrong comments came out, among them a collision rule the page was about to state wrongly.
- `60-verify`: "Start that one checker without asking": the contributor had asked for one agent, and I started the checker anyway, which is what found the first eight.
- `70-minisite`: "A widget that runs a mechanic is a claim too": the sound driver and the map builder were ported and compared with the game's own code in the simulator (99,762 driver calls, 16 maps), and the comparison is committed as `test_ports.py`.
- `tool-vice-mcp`: "When a loader hangs, look at the drive": I read the drive's program counter and RAM, found both processors waiting on each other, and from there the protection's drive code.

## What was changed in the kit

None.

## What the run met

- The contributor's G64 deadlocks on the loading screen in VICE: the protection times ten sync marks on track 39, and the image's syncs are all 24-25 bits, so the key comes out `$FF` instead of `$97`. The tell is the C64 waiting on the serial bus at `$C234` and the drive waiting for ATN at `$0391`, with the loader overwritten by its own file. A patched copy of the image with eight sync units rewritten loads (`agent-history.md` has the script). The failure shows itself, so it is written here and in `agent-history.md`, not in a skill.
- `check_docs.py` rejects "corrected" and "misread" in `facts.md`, while `60-verify` asks the error-rate paragraph to say "what was changed"; the paragraph says "rewritten" instead.

## Candidates

- `60-verify`, the audit after a bad sample: reading every comment against its neighbours found most of the 13 extra errors. Three checks did the work: a variable's comment against the comment of the routine that reads it (the collision flags were described two incompatible ways), a table base plus index against the label it lands on, and a count against the address of the next label. Only this game shows it so far; the next run with a bad sample can make it a rule if it works there too.

- `70-minisite`, testing a widget's port: the sound driver's port matched the game on 99,762 calls, and every effect button on the page was still silent, because the test fed the driver its inputs in a way the page did not (on the frame after the mode change, where the page asked on the same frame and the game's reset cleared the requests). The test now drives the port with the page's own button data and measures the sound. Only this game shows it so far.

## Maintainer asks

- **Let the listing's error-rate paragraph in facts.md say what was corrected.** `60-verify` asks for "what was wrong with them and what was changed", and `check_docs.py` fails "corrected" and "misread" in `facts.md` as narrating a past mistake, so the paragraph has to avoid the plain words. Suggest exempting a section headed for the error rate (here `## The listing's error rate`) from that check in `kit/scripts/check_docs.py`. Uridium (C64), 10 October 2026, branch `game/c64/uridium`.

## What cost the most time

The deadlocked load: a line in `tool-vice-mcp`'s note on protected originals, that a G64 can keep sync marks shorter than the original's and so fail a protection that times them, with the tell above, would have saved most of an hour.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04 container, no display); VICE vice-mcp v3.13.2 (all 57 `check-emulator` checks passed); regenerator2000 0.9.20; node 22; Chromium from Playwright for the browser check.
