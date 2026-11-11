## 0.0.335 · 2026-11-11 · Alter Ego (C64) · air with Claude

- **A game that rolls its numbers from `$D41B` now rolls a C64's in a
  lockstep.** The kit's machine read `$D41B` as 0, so Alter Ego's
  lockstep had to give the game and the port a generator of its own, and
  the game it checked played numbers no C64 gives it (#786). The machine
  now keeps the three oscillators cycle by cycle (`createOsc` in
  `site/lib/sid.js`): the 24-bit accumulators, the noise register and
  the shift it makes two cycles after accumulator bit 19 rises, the test
  bit, hard sync, ring modulation, the 8580's one-cycle delay on
  triangle and sawtooth, and noise combined with another waveform
  writing back into the register. `kit/c64/sid_osc.py` records what VICE
  reads at `$D41B` for 21 sequences of writes on each chip, and
  `kit/c64/test_sid_osc.js` holds the model to all 980 readings.
- **The port is handed the game's bytes.** A port does not run on the
  game's cycles, so it cannot work out what the oscillator holds at a
  read. It reads `$D41B` through `P.io` where the game does, and the
  lockstep gives it the bytes the game read, in order, the way it
  already gave an interrupt's bytes. A port that leaves out one of the
  game's reads gets the next read's byte, and the stretch fails.
- **How long the chip remembers, measured in VICE.** With the test bit
  held, the noise register starts to fill with ones after 50,000 cycles
  on a 6581 and 986,000 on an 8580, then a step every 15,000 and 314,300.
  With no waveform selected, the last output starts to fade after 54,000
  cycles on a 6581 and 800,000 on an 8580, then a step every 1,400 and
  50,000. These are the emulator's figures (vice-mcp v3.14.0, the reSIDfp
  engine), not a chip's on a bench.
- **A snapshot holds the registers and no oscillator.** x64sc's SID
  module is the 32 register bytes. A machine made from a snapshot starts
  its oscillators as the chip leaves reset and gives them the registers,
  so the numbers it rolls are a C64's from that start, not the ones the
  snapshot's own machine was about to roll. Triangle, sawtooth and pulse
  selected together read as the AND of the three, which is close to the
  chip and not exact; `$D41C`, voice 3's envelope, reads 0.
