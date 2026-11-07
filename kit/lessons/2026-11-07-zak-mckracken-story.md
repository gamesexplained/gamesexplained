## next · 2026-11-07 · Zak McKracken and the Alien Mindbenders (C64) · air with Claude

- **Play an adventure's solution to the end screen, and check the
  decoder on that trace.** The opening's scripted play had checked the
  decoder at 869 places. The solution, written as an input file for the
  kit's ScummVM and played from the first morning to THE END, ran
  1,233,386 instructions at 11,244 places in 713 scripts, and the
  decoder agreed at every one. The same run is what the page's
  walkthrough rests on: each step ran, rather than being copied from a
  walkthrough (`kit/skills/cpu/scumm/explore.md`).
- **A recording rests on the exact points it clicks.** A fix that moved
  the kit's edge-of-screen click away from every object changed where
  the kid walked in rooms where nothing had been wrong. The timing
  changed, so the game's random numbers changed after it, and recorded
  routes through a jungle whose paths are picked at random stopped
  matching. Narrowed to the doorways that caused the fault, it kept
  every earlier recording. Replay every recording after any change to
  how clicks are placed (`explore.md`, "The solution, played").
- **Compare what the solution printed with every line the game has.**
  The lines a full playthrough never shows are where an adventure's
  secrets are: a fortune-telling machine that picks the numbers it
  foretells, magic words that read backwards, two teleport pads that
  lead nowhere (`explore.md`, "Secrets").
