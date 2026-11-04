## 0.0.309 · 2026-11-04 · Stunt Car Racer (C64) · air with Claude

- **Time the start-up, or the page runs it in no time.** The Play tab
  starts the port at the loader's hand-over, `$3FFB`, and the lockstep
  times every stretch between two checkpoints, but not the one from where
  the program starts to its first checkpoint. The routines only the
  start-up calls (a checksum of the whole game, the copies of its
  tables) had no row in the pacing fit, so they cost the page nothing,
  and the page reached the menus 13 frames before the game.
  `test_play.js` caught it by comparing when the screen's mode changes on
  the page and on the C64. The lockstep's `entry` option now gives that
  stretch a row (`kit/skills/core/70-minisite/play.md`).
- **Put a checkpoint before a write whose moment the page shows.** The
  fit priced each stretch's total within a few per cent, but routines
  always called together can share their cost in any proportion, and the
  fit chose one. A write in the middle of a stretch, the change of screen
  mode from the menus to the race, then came seven frames early on the
  page while every stretch's total was right. A checkpoint just before
  the write made its time the end of a stretch, which the fit measures
  directly, and the page and the game changed mode within two frames.
- **Name a value by what its reader does with it.** A byte each track's
  data gives to the race was first named for where it is loaded
  (OPP_PICK copies it with the opponent's limits) and shown as a count of
  landings. The routine that reads it, WHEELS_ON_ROAD, adds damage for a
  spring pressed past its line only while a count of those presses is
  below it: it is a limit on presses. Read the reader
  before naming a value, not the routine that stores it.
