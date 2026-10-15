# Storm — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": every widget runs the game's own routines on a 6502 in the page, and four tests beside the pages hold that code to `kit/c64/cpu6502.js` byte for byte; one of them showed the page's 6502 and the kit's starting each call with different registers, which a delay routine that saves Y gave away.
- `60-verify`: "A wrong comment is usually one belief written down more than once": for each of the checker's eight wrong comments I named the belief and searched the listing for it, and corrected the comments that repeated it with the eight.
- `70-minisite`: "Sweep the whole input space, not a few plausible values": the energy calculator's test runs `lose_energy` over 21,060 cases (both players, every armour from 0 to 12, 18 drains, 15 energies, three warning states) rather than the hunger tolls and the six monsters' touches.
- `10-orient`: "Save the hand-over too": comparing the hand-over at `$75AC` with play showed the start-up writing the ROM font over `$0D00-$0EC9`, so the listing was built from the hand-over; it also showed that room 0's taken objects and removed walls are in the file as loaded, not left by play.
- `70-minisite`: "Check, at least: every canvas has drawn something": checking each section in Chromium found the spell stepper showing its reference picture over its canvas.

## What was changed in the kit

- `kit/skills/core/60-verify`, "What a test lets through": a value the start of a new game leaves alone is read at every test of it with what the last game can leave there. The other game is games/c64/wizball, whose shield timer survives a quit into the next game. Lesson `kit/lessons/2026-10-15-storm.md`.
- `kit/skills/core/70-minisite/play.md`, "Memory as the beam meets it" (after the Play tab), with `C64.videoMemory` in `site/lib/c64.js`: the page drew the last whole frame's registers over the memory of the frame being run, and the title's message, which `panel_band` moves a character in memory at line $FF, flickered a character ahead. The other game is games/c64/ghostbusters, whose Play tab drew the same way: its car jumped while steered on the drive, and drawn over memory as each frame began, its title's bottom row, written at line $B8 and shown from $F3, came a frame late. Both pages, and games/c64/bubble-bobble's, now use it. The same skill's "A clock, not a frame loop" now says a polling loop's turn moves the clock to the next line: the Ghostbusters runtime moved it a whole line on after the raster read's own 7 cycles, stepped over line $28 in two frames of every 45, and the title lost its top split there.

## What the run met

- C64-Wiki had no page for the game, Lemon64 answered 403 and web.archive.org was refused from the cloud container; the manual (MOCAGH's scan on archive.org), the Mastertronic Collectors Archive's review and CSDb's SID entry were enough.
- `c1541 -read storm-a` found nothing: the directory name has trailing spaces. `-read "storm-a*"` worked.
- `vice_registers_set` wants `{"register":"PC","value":...}`; `{"PC":...}` gave "Invalid parameter types".
- `vice.py`'s `frames()` raises `ViceError` when a checkpoint stops the machine before the frames are done; a script that expects the stop has to catch it.
- A full-page screenshot in Chromium draws nothing below the first screen, since the game pages skip off-screen sections (`content-visibility`); screenshots taken section by section, each scrolled into view, showed every canvas.

## Candidates

- `kit/skills/core/70-minisite`, the order of the calls a test makes. The monster widget's test drove the page and the kit's simulator through the same sequence, spawn then move, and agreed on every byte; the game's main loop clears the drains and calls `move_monster` before `spawn`. Both sides took the order from the page, so the test could not see it; it was put right on reading the main loop again. "Start each case where the game starts it" covers values a test sets; it would add the order of the routines, taken from the loop that calls them. Only this game shows it so far.

## Maintainer asks

- #366: Add a 6502 to `site/lib` for pages that run a game's own code.

## What cost the most time

A 6502 in `site/lib` for pages: this run wrote three (the widgets' block and one inside each of the two sound drivers) and then had to make their calls start the way the kit simulator's do before the tests agreed.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04 container, no display); VICE x64sc, vice-mcp v3.13.2; regenerator2000 0.9.20; node 22; Chromium from Playwright for the page check.

## The Play tab (a follow-up)

### What was changed in the kit

- `kit/c64/lockstep.js`, raster waits: after a wait's exit, a second wait
  with no checkpoint between is a second stop at the same exit, as a
  routine that waits makes it when called twice running. Before, the
  machine ran on past that exit to the stop after it, and the two sides
  fell out of step. `test_lockstep.js`, test 12.
- `kit/c64/lockstep.js`, interrupt replay: the bytes set back to what the
  game's handler saw now include its instructions' operands, through the
  CPU's `executed` hook. A handler whose operand the main program patches
  (an address stored into it) ran in the port on the patched value.
  `test_lockstep.js`, test 13.

### Candidates

- `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's
  clock": measure each routine's own cycles on the game's code (hooks at
  its entry and its RTS, the interrupts left out) rather than fitting
  them to the stretches. Here the measurement brought the page within
  half a per cent of the game's pace. Two more things it needed: costs
  keyed by what a routine is given where its work follows from it (a
  block's width and height), and the video chip's bad lines on both
  clocks, since a cost measured on a machine without them is short.
  Only this game shows it so far.
- `play.md`, the pace check: passes stay in the same frames for a few
  passes only, wherever mean costs leave a pass near a raster wait, so
  the check that holds is the average over the passes of play, with
  waits for input (a title answered by the frame) left out.
