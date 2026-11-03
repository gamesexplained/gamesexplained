## next · 2026-11-03 · Driller (ZX Spectrum) · air with Claude

- **A sound the processor plays itself holds the loop, so count a repeat in
  loops.** The Spectrum's beeper is the processor's own work: while an
  effect plays the game does nothing else, and the page keeps each effect
  its Spectrum time with the interrupts off. The laser's sound holds the
  loop that fires about 12 ticks. With `site/lib/fast-cpu.js` counting a
  repeat every K ticks, at 1× (K 8) every loop fired, the view moved only
  once in 12 ticks, and over 10 s a walk with the laser held took 96 ticks
  a step, where the Spectrum took 51 for a step and a shot, and 21 with
  the repeat counted every K loops. Counted so,
  the laser held fires a shot each 0.317 s at 1× against the Spectrum's
  0.334 s, 0.250 s at 2× and 0.217 s at 4×, and a step keeps its K loops.
  The jobs run once a step count loops too. Castle Master's,
  Mercenary's and Space Rogue's tests pass unchanged with loops counted.
- **A clock of 50 a second gets ticks of its own at 60.** The game counts
  its time by the frame interrupt, 50.08 a second. The guide gave as its
  reason for 60 a rate the machine's screen shows on some model, which no
  48K Spectrum does, and named as its example of ticks of its own a game
  that ticks once a video frame, at 50. The ticks here are
  60 a second, tick k at T-state ceil(k × 3,500,000 / 60); with a turn
  held 66 s the clock changed 66 times at the same T-states with Fast CPU
  on and off.
- **A loop that waits for a key inside itself starts at the key read.**
  Driller's main loop waits in `take_commands` until a key is down, so with
  no key down there are no loops and no frames, and a key is taken at the
  next poll. Two bugs the tests found there: switched on during that wait,
  Fast CPU let the waiting loop's step through whole (the runtime decided
  the loop's own work only at a checkpoint; it now takes it from the last
  checkpoint passed), and the keys-read plug-in point, run before the
  check for the clock's minute, let a held switch act again after the
  loop that runs the scripts for the minute.
- **A delay loop that sets a pointer's speed is a speed of the game's own.**
  The crosshair moves a pixel a pass with a delay loop in it; its pass
  takes 37,250 T-states wherever it is. Timed as on the machine, the delay
  would hold each loop for the pixel and the crosshair would go 60 pixels
  a second against the Spectrum's 94. Shared by the pass's time instead,
  it went 60 pixels in 0.609 s against the Spectrum's 0.633 s. The guide's
  rule for a delay loop and its rule for a speed of the game's own give
  opposite answers here.
- **Measure walls from the saved moments and the scripts' own jumps.** Of
  201 walks of three steps (174 from 144 moments of play in three areas,
  27 from the nine places the scripts send the probe, four ways each),
  186 ended exactly where the Spectrum's ended, 4 more than 64 units away,
  none at another height. The moments came from three areas only; the
  entrances the scripts name were the cheapest way to reach eight more.
  Entrance numbers found by searching an area's objects are not
  entrances: their angle bytes read 127, and a random run left with them
  failed and once hung for ten minutes.
- **Headless Chromium draws the CRT at 6 frames a second.** With the CRT
  on, the page ran at 0.44 of real time, Fast CPU on or off; with it off,
  61 refreshes and 60 loops a second. Time Fast CPU in node.
