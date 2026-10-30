## 0.0.271 · 2026-10-30 · Power Drift (C64) · air with Claude

- **The decimal flag is whatever the last routine called left it.** The
  stage bonus is a BCD number, two decimal digits in one byte, counted
  down once a frame by a loop that turns decimal mode on, adds to the
  score, calls the routine that draws the score and then subtracts 1 from
  the bonus. The drawing routine ends with `CLD`, so the subtraction is
  binary: a bonus shown as 25 counts 37 times, the panel shows the
  letters A to F on the way down, and a bonus of 00 counts 256 times. The
  first reading took the `SED` at the top of the loop to cover the whole
  loop, and the listing said the bonus counted in decimal. Running the
  two routines on the kit's 6502 for every second of the clock showed
  the binary count, and the emulator agreed. Before writing what `ADC` or
  `SBC` does to a BCD value, find the last `SED` or `CLD` on every path
  to it, inside the routines called on the way too.
