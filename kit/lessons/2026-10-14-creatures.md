## 0.0.163 · 2026-10-14 · Creatures (C64) · air with Claude

- **A port test checks only the state it set up.** Creatures' creature
  gallery ran 144 animation scripts through a port and the engine side by
  side, frame for frame, and passed while the page animated two creatures
  wrongly. The test started every object with its animation running; the
  game starts an object stopped when its spawn record's hit response has
  both low bits set, and each shot then gives its script one step. Both
  sides of the test agreed because the test, not the game, had chosen the
  starting state. Before trusting a port's test, list what the routine
  reads that the test sets, and take each value from where the game sets
  it.
