# Friday the 13th — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

None.

## What was changed in the kit

Nothing.
(80-retro, step 3).>

## Candidates

None.

## Maintainer asks

<one bullet per ask. Filed: "- #123: the ask in one line". Not filed (no
yes, or no way to reach the repository): "- **The ask, in one line.** The
problem, what it cost, what to change and where", which the repository
files when the pull request merges. Prose around the bullets is free;
check_docs.py checks the bullets.>

## What cost the most time

<one sentence: the single change to the kit that would have saved the most time>

## Where the kit cost time

- A snapshot loaded with `snapshot_load` stays paused, and `10-orient` says so only in general terms; a random-play run on it did nothing for 150 seconds before the PC was read. The skill's bullet "Ask the emulator whether a loaded snapshot is running" covers it.

## Environment

Linux x86_64 (Claude cloud container, Ubuntu 24.04), vice-mcp v3.14.0 release zip (`check-emulator` 57 of 57), regenerator2000 0.9.20 built with `cargo install --locked`.
