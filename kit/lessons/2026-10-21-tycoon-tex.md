## next · 2026-10-21 · Tycoon Tex (Commodore 16) · air with Claude

- **Sweep a timing from before it can work to after it cannot.** To find
  which breaks in the pipe Tex can jump, the first search tried a jump
  on each frame from when a break was in sight. At the higher speeds the
  break arrived sooner than the first try, so every try was late, and the
  search said that no break could be cleared from speed 3 upwards. The
  truth was the reverse: from speed 4 every break clears, and at speed 1
  none does. A sweep that shows only one outcome has not crossed the
  window. Widen it until it fails on both sides, too early and too late,
  with the successes between, before saying an action never works.
- **Count a loop's passes by running it at its limits.** The page said a
  break has one or two middles before level 4 and one to two after,
  read from a count loop that ends `DEX` / `BPL`, which runs once more
  than the count it starts from. Running the routine on the kit's 6502
  with both of its random bits set built three middles. A count read off
  a loop is a claim to test, and the routine run with the largest and
  smallest inputs tests it in a second.
