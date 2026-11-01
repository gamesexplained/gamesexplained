# Lethal Weapon — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `15-parts`: "Nor is data the game fetches into a buffer during play": the fourteen stage loads were treated as data in the game part's buffers, with every stage drawn on the Maps tab, instead of fourteen parts.
- `50-coverage`: "Let a script hold the typing against the map": the code maps were re-sized from the snapshots by a script after a crash had corrupted the RAM the dump read, rather than trimmed by hand.
- `60-verify`: "If none can run it, the listing is unmeasured, and that is a gap, not a pass": with no checker allowed, the sample was drawn and handed off and the tier left at Bronze.
- `70-minisite`: "against the original code run in the kit's simulator": the music test found 64 bytes of the frequency tables missing from a listing at 100 %.

## What was changed in the kit

Nothing. Each problem below either showed itself through a check or is a candidate.

## Candidates

A listing at 100 % can leave out bytes a routine reads. The title's
frequency table at `$E568` had an untyped symbol, so its span stopped
after 64 bytes and the rest of the 96 notes was in no ledger and not in
`listing.json`; `listing.py`'s list of uncounted data did not name it,
because the bytes differ between the hand-over and the play snapshot
(the music loads after the hand-over). The page's music test, which runs
the driver on the listing's memory, wrote different frequencies and
caught it. A skill or `listing.py` could say: data read through an
indexed address whose base symbol is untyped is counted only 64 bytes;
type the whole table.

The flow tracer, seeded at a title program that carries 1541 drive code,
followed the drive code's `JMP`s and `JSR`s (drive RAM and drive ROM
addresses) into the C64's memory and minted 13 KB of code there. It
showed as an implausible code size; typing the drive code as data first
avoids it.

## Maintainer asks

- **Say what a run does when the contributor forbids subagents.** `kit/START.md` and `60-verify` start one checker without asking, but this contributor's message said "Use one agent at a time (no subagents)". The run followed the contributor, drew the sample, wrote the brief to `work/handoff/sample/` and left the game at Bronze, which costs the contributor the Silver they asked for. START.md could say which wins, or ask the contributor in the first message whether the sample's one checker is allowed.

- **Make `kit/c64/test_stdio_bridge.py` pass on macOS.** On macOS 27.0 (Apple M4), `python3 kit/scripts/test_kit.py` fails `test_snapshot_conversion_preserves_ram_and_previous_project`: it expects `/var/folders/...` and gets `/private/var/folders/...`, because macOS's temporary folder is a symlink. Comparing resolved paths (`Path.resolve()`) on both sides would fix it. The test was not changed by this run.

## What cost the most time

A code map that does not mix parts: `codemap.py dump` taken once while each part runs alone, and a note in `tool-vice-mcp` that a zap on a stopped machine needs the machine running afterwards, would have saved three recordings.
