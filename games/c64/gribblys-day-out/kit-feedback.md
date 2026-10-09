# Gribbly's Day Out — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "So load it and look at it before calling this step done": screenshots in headless Chromium found the tile grid ten lines out, labels running into each other, the effects player sounding voice 3's noise, and the first view drawn past the map's edge, which led to the view reading on into the next map row.
- `70-minisite`: "A widget that runs a mechanic is a claim too": I ported the sound driver and `level_result` and tested both against the game's code; the driver's test failed on voice 2 and showed how the effect chain is really read.
- `60-verify`: "A rate read from the code": I counted `main_loop`'s passes live, found its work runs on alternate passes, and rewrote 27 comments that said "each frame".
- `60-verify`: "have an agent that wrote none of them check each against the bytes": 80 comments sampled, 5 wrong, all rewritten.

## What was changed in the kit

- `kit/lessons/2026-10-09-gribblys-day-out.md`: this run's lessons.
- `site/lib/sid.js`: with the filter off, the default, voice 3 off (`$D418` bit 7) now cuts voice 3 when `$D417` does not route it to the filter, as the chip does and as the player already did with the filter on. Before, every player that left the filter off played voice 3 even when the game had switched its output off; this game runs voice 3 as noise for its random numbers and keeps it silent that way, so its effects player hissed. Of the eight other pages with a player, Mr. Hat, Lode Runner and Wizard never set the bit; the rest were not checked, and on any of them the change cuts only a voice the chip cuts too.
- `kit/c64/test_sid_voice3_off.js`: voice 3's noise at full sustain with `$D418` = `$0F` and `$8F`, with the filter off, 6581 and 8580, and routed to the filter with the filter off. It fails on the old `sid.js`.

## Candidates

An effect's chain byte read through Y on the wrong voice: the checking
agent rewrote the comment from the code and got it wrong, and only the
port's test caught it. The lesson file has the general rule; whether
`60-verify` should say "test a correction before applying it" waits for a
second game where a checker's correction was itself wrong.

Rates in comments settled at verify rather than while annotating: 27
comments said "each frame" for work `main_loop` does on alternate passes,
and `60-verify` caught them, as designed, after they were written. If a
second game shows the same, `50-coverage` could ask for the live count of
the main loop's passes before any rate is written.

## Maintainer asks

- **Let the SID player call a driver on a CIA timer period, not only once a PAL frame.** This game's title tune is called every 47,288 cycles from CIA 1's timer. `site/lib/sid.js` calls a page's driver once per frame (19,656 cycles), so the port runs each call in the frame its cycle falls in, two or three frames apart, and a note's length wanders by up to a frame (falcon-patrol's port does the same). A `period` option in cycles on `C64Sid.mount`, with the player calling the driver at each period's end, would let a port play at the game's own tempo; it goes in `site/lib/sid.js`'s player loop, with a case in `kit/c64/test_sid_bus.js` or a test of its own.

## What cost the most time

A live count of `main_loop`'s passes at the start of `50-coverage`, before any comment gave a rate, would have saved rewriting 27 comments at verify.

## Operating system and tools

Linux x86_64, Ubuntu 24.04.5, no display (a cloud container). VICE
v3.13.2 (vice-mcp build), regenerator2000 0.9.20 from crates.io, node
22.22.0. `check-emulator` needs `--platform c64` when called directly.
Pages checked in Playwright's Chromium.
