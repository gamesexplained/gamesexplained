# Prospector Pete — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/70-minisite`: "A widget that runs a mechanic is a claim too": the mine on How it works and the Levels tab run the game's own level builder and frame, so both were compared with plus4emu traces frame by frame before they went on the page, which found the zero-page read and the first frame's order.
- `kit/skills/core/70-minisite/play.md`: "Run the page's runtime in node from the cold start before opening a browser": it found that levels 6 and 10 never started on the page, both times a loop reading TED's timers or the beam that never ended (Candidates).
- `kit/skills/core/70-minisite`: "A screen whose video registers change during the frame": the frame section draws `irq_play`'s three bands and counts the pixels that differ from plus4emu's picture, 0, against 30,259 with one set of registers; the Play tab draws its frames in the same bands.
- `kit/skills/core/70-minisite/play.md`: "Test each routine alone first": the Play tab, built after the Silver run, checked 67 of the port's functions on 432 moments of play before the lockstep began.
- `kit/skills/core/60-verify`: "write down every value the test actually accepts": the values `move_creatures` takes as open (0, water, a stick, an explosion) leave debris out, which became the Discoveries section on debris walling the creatures in.

## What was changed in the kit

- `site/lib/c16.js`: adds `C16.load`, the listing's 64 KB as `C64.load` gives it, because every widget on the C16 pages needs the listing's bytes; `kit/scripts/test_embedded_listing.js` tests it with the other three.
- `kit/c16/codemap.py`: new, turns the server's record of what ran into the game's `codemap.json`, folding the C16's repeats of its 16 KB, because `check_listing.py` needs a code map and the C16 kit had no script for one; `kit/c16/test_codemap.py` tests the folding, the sizing and the overlaps, and `kit/skills/c16/tool-plus4emu`, "What ran", says how to use it.
- `kit/skills/c16/steps`: the `page` row names `C16.load`.
- `kit/skills/c16/tool-plus4emu`: a `reset` keeps the server's checkpoints, as a `load` does, so a script that boots again deletes them first; a tape's hand-over is saved by ejecting at the stop, which the server marks `exact: false` and which loaded back the same. Both are facts about the tool, met on this run.
- `kit/template/orientation.md` and `kit/template/work/README.md`: the snapshot's format comes from the platform's `steps` skill instead of naming `.vsf` and `.sna`, which read wrong on a third platform.
- `site/status.json`: the C16 cell for Linux records this run.
- `kit/lessons/2026-10-19-prospector-pete.md`: what a search loop does when nothing is found, and holding a widget that reruns the game's routines to a trace of the game.
- `kit/c16/machine.js`: new, a Commodore 16 around the kit's 6502 (TED's beam and the cycles it leaves the processor on each line, the raster interrupt, the timers, the keyboard and the joysticks, and the sound registers' writes), because a Play tab's lockstep needs the game running beside the port and the C16 kit had no machine. `kit/c16/ted_timing.py` records plus4emu's timings as `kit/c16/fixtures/ted-timing.json`, and `kit/c16/test_machine.js` holds the machine to them.
- `kit/c16/lockstep.js`: new, the lockstep on that machine, with `{ cycles }` for a delay loop the port does not run, and the cycles of each part of the run for a page's clock; `kit/c16/test_lockstep.js` tests it.
- `kit/cpu/cpu6502.js`: `ioPages`, which sends the pages named to `io` on a machine without the C64's map, and `onRti`; merged with `ramSize` (#439), whose repeats stop at `$FCFF`. `kit/cpu/asm6502.js`: new, a small assembler for the JavaScript tests.
- `site/lib/c16.js`: `C16.timing`, TED's beam in ticks and the processor's cycles on each line, and `C16.renderBands`, a frame drawn in bands of lines from the memory and registers each band had; `kit/c16/test_frame.py` tests the bands.
- `kit/skills/c16/steps`: the `machine`, `lockstep`, `frame` and `page` rows name the above.
- `kit/lessons/2026-10-20-prospector-pete-play.md`: a port's clock seen from inside a stretch.

## Candidates

- **An index that runs off the top of a C16's RAM reads the bottom of it.**
  The level builder's room check for the lowest row of the map reads one
  row past `$3FFF`, which on the C16 is the zero page. Nothing in the code
  names an address above `$3FFF`, so a reading of the routine for such
  addresses misses it, and a page that runs the routine on 64 KB of plain
  memory builds a different mine on some levels and looks right. It was
  caught by comparing the page's builds with emulator traces. The
  `simulator` row of `kit/skills/c16/steps` would add: "a table at the top
  of the 16 KB is followed by the zero page, so an index that runs off its
  end reads $0000 on". No other C16 game folder exists to name; #435 would
  make the edit unnecessary.

- **A read of a timer or of the beam inside a stretch sees the clock
  stand still.** The Play tab's clock moved on at the end of each
  stretch of the port, so every read of TED's timers and of the beam's
  place inside one gave the same value. `find_space` draws random
  numbers from them until it finds room for a goodie, so on the page it
  read the same number every turn and level 10 never started; on level 6
  `swap_face` waits on a timer and the beam in a loop that never polls.
  The fix was to charge each call as it is made and each chip read its 4
  cycles, so that a read sees the cycles spent before it, and to time
  alone on the simulator the six routines the fit cannot price. The
  "A clock, not a frame loop" paragraph of `kit/skills/core/70-minisite/play.md`
  would add: "a read of a timer or the raster inside a stretch sees the
  clock moved on by what the stretch has cost so far". No other game
  folder is known where it mattered; the lesson file records it.
- **A gap the code reads.** `listing.json` leaves out the three bytes at
  `$2970-$2972`, which the game reads as a table, because `symbols.json`
  does not type them. Nothing warned: `check_listing.py` passed, and only
  the port's tests showed it. `listing.py` could list the
  bytes the code map says were read that the listing does not hold.

## Maintainer asks

- #434: Add a TED sound player to site/lib for Commodore 16 and Plus/4 pages (done in #438).
- #435: Let the kit's 6502 repeat a Commodore 16's 16 KB of RAM through the 64 KB (done in #439).

## What cost the most time

Holding the pages' engine to the emulator frame by frame cost the most,
and a 6502 that repeats a C16's 16 KB (#435) would have saved the
longest part of it, the level 16 build that differed.

For the Play tab, the pace cost the most: a first pass of level 1 twenty
frames late came from three causes in turn (a function the fit priced
that costs nothing, owed cycles turned to time at a rate a write to the
display changed, and the reads inside a stretch above), each found by
running the page beside the machine in node.

## Operating system and tools

Linux 6.18 x86_64 (Ubuntu 24.04, no display), in a hosted cloud session;
Python 3.13.16, Node 22.22.0, g++ 13.3.0. plus4emu 1.2.11 (git 939e652)
built by the kit with `kit/c16/codemap.patch` and without libsndfile, in
the kit's server, as a 16 KB PAL Commodore 16. regenerator2000 0.9.20 in
its Plus/4 mode. The tape is a raw TOSEC tape file, which the build
without libsndfile reads.
