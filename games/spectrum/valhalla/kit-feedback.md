# Valhalla — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": the parser widget and the picture sheet each got a test that runs the game's own code in SkoolKit's simulator and the page's port side by side, `test_parser.py` and `test_pictures.py`.
- `60-verify`: "Draw a random sample of about 60": the checker's 60 found seven wrong details, and rereading one of them showed that `features.md` said nobody follows you, which line 4010 contradicts.
- `70-minisite`: "So load it and look at it before calling this step done": the screenshots showed "you defeats Idun" in the fight calculator and the character table's key column out of sight.
- `70-minisite`: "Sweep the whole input space, not a few plausible values": the parser test runs three misspellings of every word and 100 random strings, not only the dictionary's own words.

## What was changed in the kit

- `kit/spectrum/basic.py` (new): reads a Sinclair BASIC program and its variables as the ROM keeps them, for the listing's new `BASIC` text type; `kit/spectrum/test_basic.py` holds it against SkoolKit's BASIC lister. Most of this game is BASIC, and the Source tab could only show it as bytes.
- `kit/spectrum/cpu.py`: adds the `BASIC` text type and `text_items`, for a text type whose items are longer than a byte.
- `kit/scripts/listing.py`: walks a `BASIC` block's whole extent and writes one record per line, variable or array row, with `enc: "basic"`.
- `kit/scripts/build.py`: the About tab's memory map counts a BASIC routine as code and an array as a table.
- `site/source.html`: shows a BASIC record as `LIST` prints it, with room for a long line.
- `kit/spectrum/skoolkit.py`, `kit/skills/spectrum/tool-skoolkit/SKILL.md`: the control file carries `BASIC` as `; kit-block $ADDR BASIC` before a `b` block.
- `kit/skills/spectrum/zx-spectrum-reference/SKILL.md`: "A game written in BASIC", where PROG and VARS are and what moves in play.
- `kit/PLATFORMS.md`: `cpu.py`'s optional `text_items`.
- `kit/spectrum/codemap.py`: each option now takes every value after it. It read only the first value after `--entry` or `--map` and ignored the rest without a word, so this game's committed code map had come from one entry and one of 23 executed lists. A value before any option is now an error. A new `--inline ADDR:N` names a routine whose arguments follow its `CALL`; without it the trace decoded Valhalla's drawing arguments as code and walked into 14,271 bytes of the BASIC program and the screen. The self-test covers both. `kit/skills/spectrum/tool-zesarux/SKILL.md` names `--inline`, and says to leave out an executed list from a session that ended in a BASIC error, whose crash ran through the machine stack.
- The lessons: `kit/lessons/2026-10-10-valhalla.md`.

## Candidates

A claim that a documented behaviour does not exist, read from one routine.
`features.md` said nobody follows you, from line 5500, which brings a
character from anywhere when you are alone; line 4010, the start of every
character's turn, also sends one to the same arrival routine from the place
you just left, which is the following the manual describes. It was caught
only because the independent check happened to sample line 4010's comment.
The skill would say, in `20-features` or `60-verify`: before marking a
documented behaviour absent, list every caller of the routine that would
produce it and read each one. No other game folder shows the same mistake
yet.

A route marked live that was not the one walked. `facts.md` gave the way to
Felstrong's cave from the map table and called it live; the emulator had
walked another. Caught while building the route stepper from the run's own
commands. The skill would say: copy a live claim's steps from the log of
the run that made it.

## Maintainer asks

- #318: 60-verify: say how bad a first sample must be before the whole listing is audited.

## What cost the most time

A `BASIC` text type in the listing from the start, so that a game written
in BASIC could be annotated line by line without first extending
`listing.py` and the Source tab.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04, no display), a hosted cloud session. ZEsarUX
13.0 (`check-emulator` 41 of 45, the four with workarounds in
`tool-zesarux`), SkoolKit 10.1, Python 3.13, node 22, Chromium from
Playwright for the page check. ZEsarUX stopped answering once when a
breakpoint never fired and `run` timed out; `tools.py --platform spectrum
stop zesarux` and a fresh start cleared it.
