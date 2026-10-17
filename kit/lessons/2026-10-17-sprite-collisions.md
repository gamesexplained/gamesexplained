## 0.0.195 · 2026-10-17 · Jet Set Willy and Chiller (C64) · air with Claude

- **Take the sprite collisions from the kit, and read them in the
  access's own cycle.** Two Play tabs had written a model of `$D01E`
  and `$D01F` each, one a line at a time and one checked against
  nothing, and the one that went by the cycle read the registers four
  cycles late: inside `machine.js`'s `ioRead` and `ioWrite` the
  processor's count already stands at the instruction's end, so the
  access is in cycle `cpu.cycles - 1`, not three on from it. The
  collisions are now measured in VICE scene by scene and read to the
  cycle (`frame.py collide`), and `site/lib/collide.js` gives the same
  answers, for the page and for `machine.js` with `collide: true`. A
  model of a chip that a game's logic reads gets the same treatment:
  record the emulator's answers and hold the model to them before a
  port leans on it.
