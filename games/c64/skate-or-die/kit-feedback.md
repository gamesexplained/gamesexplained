# Skate or Die! — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). The run took the
High Jump load to Silver on 4 October 2026, under the interim policy of one
declared load per game (RFC #124), on kit 0.0.74.

## Skill text that changed what I did

- `50-coverage`: "The emulator's executed-address map: every address the CPU executed": seven simulated practice runs gave the floor, and it found the sound scripts' machine-code helpers, which are reached only through the bytecode and one of which was typed as data.
- `60-verify`: "Draw a random sample of about 60": the audit sampled 60 comments over every agent's range and found four with a wrong detail, which the auditing agent rewrote; the rate (6.7 %) is in `facts.md`.
- `50-coverage`: "Correct the brief the moment a fact in it turns out wrong": four leads in the brief (the NMI vector as a sample player, the end-of-run wait, the CPU port value, a routine's name) were corrected while agents ran, and the reports confirmed each correction.
- `50-coverage`: "Find every call site of every such routine, type the argument bytes as data": the status-line printer at `$1242` eats the string after its call; typing it removed a bogus block in the bitmap.

## What was changed in the kit

- `kit/c64/check_emulator.py`: `-h` and `--help` print the usage and stop. They used to run the whole check, which hard-resets the machine; this run, a request for usage reset the paused machine.
- `kit/scripts/check_docs.py`: a game's title is matched without `\b` at its ends, so a title ending in punctuation (`Skate or Die!`) is found in its lesson heading. The lesson file failed the check before.

## What cost the most time

Kit 0.0.74 has no clock, so there is no timings table. By the session's own
reckoning the longest parts were the seven annotation agents (the sound
scripts and the ramp physics), the live tests of pumping and height, and
building the in-page music player and its test against the game.

The one change to the kit that would have saved the most minutes: the
`50-coverage` warning that typed inline arguments are decoded again by later
traces, which cost two rounds of finding and clearing the same bogus block.

## Operating system and tools

- Linux x86_64, a hosted cloud container.
- VICE 3.13.1 (the project's Linux release): 56 of 57 checks passed;
  `pause-at-instruction` failed, as `tool-vice-mcp/workarounds.md` records
  for Linux.
- regenerator2000 0.9.20.
- A headless Chromium click on the music page's player did not advance its
  clock. The player's driver is checked in Node instead (`tests/music.js`):
  over 15,000 frames its SID writes match the game's own, in order.

## Candidates

No other game folder shows these yet, so they stay here for the next run
that meets one (`kit/skills/core/80-retro`, step 3):

- **`50-coverage`, "Inline parameters": typed inline arguments do not stay
  typed.** A trace started later from anywhere that reaches the call (another
  agent's range, a re-run from the executed-address map) assumes the call
  returns, decodes the argument as code again and can invent a block where
  its bogus operands point, which coverage then counts. After every agent's
  export, check that each call site's argument is still data. Here: High
  Jump's status-line printer at `$1242`, twice.
- **`60-verify`: a value the code never writes came from the loaded file.**
  A random seed, counter or flag with no store anywhere was not "left
  over": its first value is the one the file brings from the disk, and the
  snapshot holds whatever it has moved on to since. Find it in the loaded
  file before describing it. Here: every event's music seed (highjump
  `$35AB`, ramp `$E13B`, downhill `$7638`, jam `$AB3E`).

## The whole-game run (5 and 6 October 2026)

- **Loading each event without the town.** The event manager's own entry
  for going to an event (here `$F99C`, X = the row) loaded every event
  from one snapshot, where steering the town never reached Freestyle. A
  multi-load game with a hub likely has such an entry; `10-orient`'s "A
  game of several parts" could say to look for the hub's dispatch before
  driving its map. Not changed: one game's evidence.
- **Several disassemblers at once.** `KIT_R2000_PORT` per part, with the
  stdio bridge, ran seven instances side by side, and the annotation logs
  replayed into fresh instances after a container restart. Both worked as
  `tool-regen2000` describes.
- **Importing an over-part.** `symbols_import` into a part that is "over"
  another failed with overlapping blocks; clipping offline with
  `parts.clip` worked. A maintainer may want `symbols_import` to clip as
  `symbols_export` does.
- **Fan-out cost.** Seven annotation agents and then seven page agents ran
  into the usage limit and a restart; main's kit (#221) now caps this.

## Maintainer asks

- **`symbols_import` on a part that is over another** fails with "symbol
  blocks overlap" where the part's session holds the resident part's
  addresses too. Ask: clip to the addresses the part owns, as
  `symbols_export` does (`parts.clip`), or say in `-h` that it must be
  done first. <!-- kit-ask -->
