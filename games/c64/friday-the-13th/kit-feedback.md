# Friday the 13th — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": running the round bonus on the kit's processor for the Discoveries widget showed the score is stored least significant first, a comment the sample had not drawn, and that a round with no survivors pays 2,560 points.
- `70-minisite`: "say in the caption how many differ and why": counting the pixels against the screenshot showed the screenshot was room 39, not the starting room 38 the page was about to call it.
- `60-verify`: "Silver needs the measure, not the mark": with 14 of 60 wrong, the run fixed the 14, published, and recommended the audit instead of stopping.

## What was changed in the kit

Nothing.

## Candidates

- Counters described in "passes" when the code counts on every other pass: five comments said "every 16 passes" or "10-pass counter" where the count steps once every two passes. The failure is silent, so it belongs in `50-coverage` if another run meets it: "Before giving a counter's period in frames or passes, find where it is incremented and how often that code runs."
- A screenshot saved in `20-features` is named for what the agent thought it showed ("play-church", "at the start of a round"); the room was not the starting room. A pixel count against the page's own drawing caught it.

## Maintainer asks

None.

## What cost the most time

A note in `kit/c64/r2000.py --help` that a text dump of the disassembly taken early in the run goes stale as blocks are retyped: the run read code from an old dump twice and saw bytes where the listing had code.

## Where the kit cost time

- A snapshot loaded with `snapshot_load` stays paused, and `10-orient` says so only in general terms; a random-play run on it did nothing for 150 seconds before the PC was read. The skill's bullet "Ask the emulator whether a loaded snapshot is running" covers it.

## Environment

Linux x86_64 (Claude cloud container, Ubuntu 24.04), vice-mcp v3.14.0 release zip (`check-emulator` 57 of 57), regenerator2000 0.9.20 built with `cargo install --locked`.
