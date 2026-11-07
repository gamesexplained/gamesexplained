# Zak McKracken and the Alien Mindbenders — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `15-parts`: "Nor is data the game fetches into a buffer during play": the rooms, costumes, scripts and sounds the game streams into its heap stayed data, carried by the pages that show them, and the game stayed one part.
- `15-parts`: "Code the game reads from the disk during play": with no kit folder for SCUMM, the scripts' 116,884 bytes went into a `coverage.virtual` row, measured through the game's own resource index, so the 100 % says what it is 100 % of.
- `70-minisite`: "Start each case where the game starts it, and feed it what the page feeds it": the effects are started through stop_sound and queue_sound, and `$FC32` is set every sixth frame where the frame interrupt sets it, which is how the test found that the engine begins nothing until the main loop's pass is done.
- `70-minisite`: "Sound effects are among them: their player goes straight after the music's": all 117 effects have their own player, the page's third section, straight after the tunes.
- `steps`: "Make the test's `createDriver` from its source text alone": after `kit/c64/sid_check.js` found every button silent, the test was changed to build the driver from its text, and it now fails the page that was silent.

## What was changed in the kit

Nothing. Each failure the run met either showed itself or is a
maintainer's call, filed below.

## Candidates

- **An effect the game counts as over while one of its parts still plays.**
  The engine's use count for a sound counts its voices, not its filter
  part, so isSoundRunning (`$571C`) says sound 36 has ended while its
  filter part is still on a channel. A page that ends a button when the
  game's own "is it running" test says so stops that sound early, and a
  test that compares only the chip writes up to that moment passes. It
  was caught because the test also asks whether any channel still plays
  the sound and lists the ones where the two disagree. The skill would
  say: when the page ends a sound by the game's own test, check that test
  against the channels, and say in the caption which the page follows.
  No other game's notes show the same case.

## Maintainer asks

- #771: Give 6502 code that a game loads into its heap a listing of its own.
- #772: Add a SCUMM script decoder so a LucasArts game's scripts can be listed.
- #773: Add the serial bus lines of `$DD00` to the C64 reference.
- #774: Stop calls patched at run time being listed as calls to the CPU port.
- #775: Name the Codex model and effort for the listing checker on each plan.

## How the parts system held up

The contributor asked. The game is one part: one load (`BOOT`, then the
39,938-byte `AA`), after which everything comes into a 20,523-byte heap
as data. Two things the game runs did not fit any kind of part. The
scripts are code for a virtual machine the kit has no folder for, so
they are a `coverage.virtual` row, which the skill provides for exactly
this (#772 asks for the folder). The music's program is 6502 code that a
resource brings into the heap at `$C300`, and no kind of part covers
native code that arrives with data during play, so it is a
`coverage.virtual` row too, run and checked on the page but not listed
(#771).

## What cost the most time

The sound players: a note in `kit/skills/c64/steps`, "sound", that an
engine may begin queued sounds only after the main loop's pass, and that
the memory a driver needs must be measured with sounds playing, would
have saved the most; both showed themselves as failing tests, so they
are written here rather than in the skill.

## Operating system and tools

Linux 6.18 x86_64 cloud container with no display; VICE 3.14.0 (x64sc,
PAL) with its MCP server; regenerator2000 0.9.20; Python 3.13.18;
Node 22.23.4; Codex CLI 0.166.0, signed in with the contributor's
ChatGPT account by device code. Nothing the install notes do not already
say.

## Exploring the story (6 and 7 November 2026)

The kit had no step for the story of an adventure: its characters,
places, puzzles and solution. This run added one for SCUMM games,
`kit/skills/cpu/scumm/explore.md`, with `kit/scumm/world.py` and its
test, and so edited no core skill. What would have saved the most time:

- **A recording rests on the exact points the kit clicks.** A change to
  how `walkto` picks its point changed the timing, and so every random
  choice after it, and a recorded route through a random jungle stopped
  matching. `explore.md` says to replay every recording after such a
  change; `test_scummvm.py` checks the clicks on the test game.
- **Waits on the game's state, not on the clock.** The Lotto's draw, the
  stupidity machine and the Martian air each needed an `until` on a
  variable, a bit or a state; `show` and `lacks` were added for them.
