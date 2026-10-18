# Rick Dangerous — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

A run to Silver in two sittings: Bronze on 12 October 2026 (orient,
features, sweep), then coverage, verify and the minisite on 13 October,
with kit 0.0.155 on Windows 11 with the tools in WSL2 (Ubuntu 26.04.1).
One agent did the work; three checking agents, one sample and two halves
of an audit, worked in `60-verify`.

## Skill text that changed what I did

- `50-coverage`: "Find what writes the operand, parse every table it reads": the object handlers ($1D40/$1D83), the trap scripts' dispatch and the music's track commands ($5226) were all reached only through operands written at run time, and each table was parsed and traced.
- `40-sweep`: "Decode the whole image as screen codes (and again as the system's text encoding)": the screen-code pass found nothing; the second pass found the story texts, the rude-word list and both code names.
- `70-minisite`: "The game's own driver run on a 6502 core inside `createDriver` counts as a port": the player runs the game's 1.7 KB music player on a small core in the page, checked write for write against the simulator, rather than a hand port of it.
- `10-orient`: "Save the hand-over too": the hand-over showed that `$0864` is a JSR the start-up turns into an LDA, which the play snapshot alone would not have shown.

## What was changed in the kit

- `kit/c64/codemap.py`: `dump --under-rom` now names the recorded instructions under the KERNAL that neither the KERNAL's code nor the game's is found to reach (`unreached`), instead of keeping them in silence. In this run four instructions of the KERNAL's keyboard wait ($E5CD-$E5D4), recorded before the game banked the KERNAL out, were kept as game code, where the game keeps sprite graphics; `check_listing.py` then asked for them to be typed as code. A script change, so no lesson; `kit/c64/test_codemap.py` has a case for it.
- `kit/skills/c64/tool-vice-mcp/workarounds.md`, "A slow host": autostart's warp depends on the image; a TAP ended with warp off. A correction of a platform note in place.

## Candidates

A game that never writes `$DC00` scans whatever keyboard row the loader
left selected, and a bit test on `$DC01` then names a key only through that
row. Here the main loop's tests at `$0A71`, `$0A87` and `$0A95` read like
joystick-port-1 tests and are also the 2, C= and ← keys, because `$DC00`
reads `$7F`. Reading the bit against the matrix with an assumed row gives a
confident wrong key; it was caught by reading `$DC00` live. `c64-reference`
would say: before naming the key behind a `$DC01` test, read what `$DC00`
holds at that moment, live.

The listing's first sample was bad mostly for one reason: comments written
about a routine from the routine alone, without its callers. Three of the
eleven wrong comments named the screen a routine serves from its name (the
sprite paths, called only from the story screens, were described as the
title's). `50-coverage` already says callers come from the references
search; nothing more is proposed until another game shows the same.

The second sample was clean in the hand-written comments (1 of 45) and
bad in the generated ones (6 of 20), and five of the six came from one
rule in a script of this run: it named the nearest label before an
address as the table holding it, and the nearest label before an
instruction as the routine running it. A two-byte vector, a short table
or a subroutine then "held" whatever followed it. Rewriting the template
fixed all 321 of its comments at once. `50-coverage` would say: a script
that writes comments places an address only in a block or region known to
hold it, and names an instruction's routine only when the code runs
straight from the routine's entry to it.

## Maintainer asks

- **Offer a 6502 core in `site/lib/sid.js` for a page that runs a game's own music player.** This page carries a small interpreter inside its `createDriver` (`rd-music` in `games/c64/rick-dangerous/index.html`, 150 lines), because the driver must refer to nothing outside itself to run in the AudioWorklet. Every page that runs a driver's own code will need the same; a shared helper the driver's source could include (or a `createDriver` sid.js builds from code bytes and entry points) would save the next run the core and its testing.

## What cost the most time

Comments written in bulk without checking their callers: the audit of all 582 hand-written comments after a bad sample cost more than writing them, and a rule in `50-coverage` to write the caller list from `opcodes.py --refs` before the comment, for every routine, would have saved most of it.
