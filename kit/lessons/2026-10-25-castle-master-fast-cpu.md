## next · 2026-10-25 · Castle Master (C64) · air with Claude

- **Give Fast CPU one clock and plug-in points, and nothing else.** The
  first Fast CPU on Castle Master's Play tab counted a loop's cost a
  second way, rendered the view between loops to smooth it, and showed
  the game a tick behind. Rebuilt from the spec, it is a frame limiter in
  the page's runtime (one loop on each tick of CIA 1's timer A, 16,422
  cycles, at most four a refresh, the rest dropped) and step scaling
  through nine kinds of plug-in point at 22 places in the port. With
  nothing plugged in the lockstep matched the game on all 199 moments,
  the same frames as before the points went in, and `test_fast.js`
  holds the rules in
  `kit/skills/core/70-minisite/play.md`, "Fast CPU", on the published
  page: 1,500 loops of the same keys leave the same memory at 60 and 144
  refreshes a second, 4 to 40 ms apart and a quarter second apart, at
  1× and 5×.
- **Count the loops that read the keys, not the loops.** The loop that
  shows the lightning's streak returns before it reads the controls, on
  the C64 and with Fast CPU, and the flash after it waits two ticks. A
  test that held a key for K loops came up a share short whenever the
  lightning fell inside it, and a walk timed over 1,200 units came out
  three ticks long. Tests now hold a key until K loops have read it, and
  put the lightning's countdown off while they time a move.
- **Measure a pace on the game's code, not the page's fit.** The pointer
  moves a pixel in a loop that draws no view. On the game's own code
  (`kit/c64/machine.js` with its video chip's fetches and CIA 1) it took
  12,560 cycles a pixel over 48 runs (median 12,587); the page's fitted
  cost model gave about 13,137. Fast CPU's table holds the game's figure,
  and the pointer then moves 30 pixels within 3 % of the page's C64.
- **The page's C64 serves an interrupt late.** Without Fast CPU the
  page's runtime runs an interrupt at the end of the stretch of the
  game's code it falls in, so the ten-second timer and the drain on
  strength came up to 4.3 ticks later than with Fast CPU, where the
  loop's work takes no time. A test that compares the clock's jobs with
  Fast CPU on and off allows a tenth of a second, and holds Fast CPU's
  own events to 600 ticks apart.
- **Walls are where shares of a step part from the machine.** From the
  199 moments, facing four ways, 780 walks of three steps with Fast CPU
  at 1× against the C64's three: 265 (34 %) ended more than 64 units
  apart, 45 (6 %) at another height, 28 of them lower
  (`games/c64/castle-master/port/test/fast-walls.js`). In open space
  K shares end exactly where one step ends, at every Speed.
- **Two kinds of Fast CPU, chosen by the game's pace.** Aaron's call on
  the first one: an action game wants 60 frames a second at its own
  pace, with no Speed to set; a very slow game wants 60 frames a second
  and a faster pace. A message's wait never holds play, sliding along
  walls is a fair price for keys that answer at once, and Fast CPU
  replaces Smooth motion in a game once it is shown faithful there.
- **Read against two more games, the guide needed a beat of its own.**
  Neither `games/c64/mercenary` nor `games/c64/space-rogue` has a clock
  that ticks 60 times a second: both count the raster interrupt's video
  frames, 50.12 a second, so `fast-cpu.md` gives such a game a beat of
  16,422 cycles of its own and leaves its clock to count its time. The
  first waits for raster line 224 before each swap of its buffers, which
  would hold a fast loop to 50 a second, and takes 4.4 to 13 video
  frames a pass by its facts; the guide makes that wait a plug-in point.
  The second has no wait at all and leaves the drawing out of a pass
  once it is three frames behind, 8.4 to 16.5 passes a second. Both move
  every craft each pass, and the second counts passes for its
  instruments and its chance of a new ship (every 7th, 16th and 256th),
  so each mover and each count needs a plug-in point. Their tables would hold that beat, a cap
  of 4 and one setting: about 10 beats a step for the first (8 frames a
  pass in the middle) and 4 for the second (it allows 3 frames a pass).
