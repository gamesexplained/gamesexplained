## 0.0.231 · 2026-10-24 · Shadowfire (C64) · air with Claude

- **Give a byte an interrupt saves and puts back to the port.** The
  lockstep runs each interrupt the game took in the port at the port's
  next yield, on the bytes the game's handler read, and kept what the
  handler wrote. Shadowfire's interrupt pushes 24 of the main program's
  zero-page bytes at its start, uses them as its own and pulls them back
  before it returns. Replayed at a yield in the middle of a drawing, its
  writes of those bytes were taken as its own changes, so the port's
  main program got back the pointers the game had when the interrupt
  fell and drew on with them until the next checkpoint. A byte a handler
  read and left as it read it now goes back to the port's value.
  `kit/c64/test_lockstep.js` case 19 fails without it.
- **Count a wait's exit only after a poll.** The game's portrait roll
  sets X, waits for raster line `$64`, and the instruction after the
  poll, `$49AE`, is the head of the copy loop that follows. The lockstep
  stopped there on every turn of the copy and reported that the game had
  left its wait on line 103. The copy of the machine that the lockstep
  runs on ahead, to find what the game's main program will read of a
  byte an interrupt writes (`irqBytes`), stopped there too, so the port
  read the music's step count before the interrupt had moved it. An
  exit now counts, in both, only when the main program has read
  `$D011`, `$D012` or `$D019` since its last stop. Case 20 fails
  without either.
- **Pass over a yield that is only a place to stop.** Shadowfire's long
  routines (a screen's drawing, the view map, the frame round an icon)
  yield `{ cycles: 0 }` every few pixels, so that the Play page's clock
  can stop there and take the player's input while they run. The
  lockstep took each as a stretch of the game's work, ran the game on
  with the joystick as it stood, and the explorer's next press reached
  the game frames before it reached the port. Such a yield is now passed
  over: the game waits for the next real stop, and so does its input.
  Case 21 fails without it.
