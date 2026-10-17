## 0.0.174 · 2026-10-16 · Castle Master (C64) · air with Claude

- **Run a gauge's arithmetic over its whole input range, through the
  game's own routines.** Castle Master's spirit meter is the clock times
  the spirits still free, divided by 21, and the earlier run wrote down
  the sum and what it implies: the spirits never win once all 21 are
  destroyed. Calling the game's own multiply and divide for every clock
  value and every count of spirits, 5,632 calls in the simulator, showed
  the multiply is signed and the divide is not: at a clock of 128 the
  meter jumps for 11 or 12 destroyed and the game ends early, and from 13
  it never reaches the end at all (checked live). The formula read from
  the code was right for every value a game reaches in its first 192
  minutes. When a mechanic turns a counter into a threshold through
  arithmetic routines, sweep every value of each input through those
  routines before writing down what the threshold does.
- **Decode every script a data-driven game carries, then read the
  table of what changes each variable.** A game whose rooms and objects
  run a little bytecode keeps most of its rules there, out of reach of a
  code-only reading. Once the castle's 193 scripts were decoded into
  words, a list of every token that writes strength, the score or a
  counter showed a potion that never hides itself and can be drunk 64
  times, a room that regenerates strength, and 13 objects sharing one
  script. Build the decoder early, check it against the game's own
  interpreter (here the area loader and the object finder, called for
  every area and object), and read its output for the rules before
  writing the page.
- **A start call made every frame restarts what it starts.** The raster
  interrupt calls the sound driver's start with the alarm's tune on every
  frame while a sensor is in the area, and the start resets the tune, so
  only its first frame is ever heard. When an interrupt or a main loop
  calls an initialiser under a condition that stays true, check whether
  the initialiser is guarded against what is already running, and listen
  to or record the result live.
