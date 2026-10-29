## 0.0.258 · 2026-10-28 · Green Beret (C64) · air with Claude

- **Leave a polling loop's cycles out of the costs the page pays.**
  Green Beret's main loop ends each pass in `frame_wait`, which polls a
  flag the interrupt sets. Measured instruction by instruction on the
  kit's C64, the stretch from the sound driver's call to the next
  checkpoint cost some 16,500 cycles, nearly all of them turns of that
  loop. The page paid them as the stretch's cost and then ran the loop's
  turns on its clock as well, a line each, so it was 8 frames behind the
  C64 by the end of the intro. With the two instructions of the loop
  left out of the measured stretch, the page reached the main loop on the
  C64's frame (406) and lost the first two lives on the C64's frames.
  Mr Puniverse's and Shadowfire's fits had each left such stretches out
  on their own. The rule is in `kit/skills/core/70-minisite/play.md`,
  "Pace it by the machine's clock".
