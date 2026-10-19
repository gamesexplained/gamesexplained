# Prospector Pete — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/core/70-minisite`: "A widget that runs a mechanic is a claim too": the mine on How it works and the Levels tab run the game's own level builder and frame, so both were compared with plus4emu traces frame by frame before they went on the page, which found the zero-page read and the first frame's order.
- `kit/skills/c16/steps`: "a routine that reaches its RAM above $3FFF needs the test to copy the bytes there": when level 16 built differently on the page, this pointed at the room check reading past the map; the engine copies the zero page to `$4000` before each check (#435).
- `kit/skills/core/70-minisite`: "A screen whose video registers change during the frame": the frame section draws `irq_play`'s three bands and counts the pixels that differ from plus4emu's picture, 0, against 30,259 with one set of registers.
- `kit/skills/core/60-verify`: "write down every value the test actually accepts": the values `move_creatures` takes as open (0, water, a stick, an explosion) leave debris out, which became the Discoveries section on debris walling the creatures in.
- `kit/skills/core/70-minisite`: "A page never carries a processor of its own": every widget runs the game's routines on the site's `C64Cpu` over the listing, rather than a copy of them in the page.

## What was changed in the kit

- `site/lib/c16.js`: adds `C16.load`, the listing's 64 KB as `C64.load` gives it, because every widget on the C16 pages needs the listing's bytes; `kit/scripts/test_embedded_listing.js` tests it with the other three.
- `kit/c16/codemap.py`: new, turns the server's record of what ran into the game's `codemap.json`, folding the C16's repeats of its 16 KB, because `check_listing.py` needs a code map and the C16 kit had no script for one; `kit/c16/test_codemap.py` tests the folding, the sizing and the overlaps, and `kit/skills/c16/tool-plus4emu`, "What ran", says how to use it.
- `kit/skills/c16/steps`: the `page` row names `C16.load`.
- `kit/skills/c16/tool-plus4emu`: a `reset` keeps the server's checkpoints, as a `load` does, so a script that boots again deletes them first; a tape's hand-over is saved by ejecting at the stop, which the server marks `exact: false` and which loaded back the same. Both are facts about the tool, met on this run.
- `kit/template/orientation.md` and `kit/template/work/README.md`: the snapshot's format comes from the platform's `steps` skill instead of naming `.vsf` and `.sna`, which read wrong on a third platform.
- `site/status.json`: the C16 cell for Linux records this run.
- `kit/lessons/2026-10-19-prospector-pete.md`: what a search loop does when nothing is found, and holding a widget that reruns the game's routines to a trace of the game.

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

## Maintainer asks

- #434: Add a TED sound player to site/lib for Commodore 16 and Plus/4 pages.
- #435: Let the kit's 6502 repeat a Commodore 16's 16 KB of RAM through the 64 KB.

## What cost the most time

Holding the pages' engine to the emulator frame by frame cost the most,
and a 6502 that repeats a C16's 16 KB (#435) would have saved the
longest part of it, the level 16 build that differed.

## Operating system and tools

Linux 6.18 x86_64 (Ubuntu 24.04, no display), in a hosted cloud session;
Python 3.13.16, Node 22.22.0, g++ 13.3.0. plus4emu 1.2.11 (git 939e652)
built by the kit with `kit/c16/codemap.patch` and without libsndfile, in
the kit's server, as a 16 KB PAL Commodore 16. regenerator2000 0.9.20 in
its Plus/4 mode. The tape is a raw TOSEC tape file, which the build
without libsndfile reads.
