## 0.0.198 · 2026-10-17 · The NeverEnding Story (C64) · air with Claude

- **A port tested over the listing cannot see a gap in the listing.** A
  page's port and its test read the same memory, the committed listing,
  so where the listing leaves bytes out both sides read zeros and agree.
  The NeverEnding Story's coverage stood at 100 % while two room texts
  that cross $4000 ended at that edge in the part listings: a data
  symbol's span stops at every fixed edge of the memory map, and nothing
  started a span after it. The room browser printed one description cut
  off mid-word, and its test passed. `listing.py` had named both stretches
  under "data the ledger does not count" after every build. Resolve that
  list before trusting a figure of 100 %, and before writing a port that
  reads the game's data.
- **Play the restart after a later part, not only the parts in order.**
  A game that loads in parts asks for a part by number, and the loader
  may not load the part it asks for. This copy's crack loads the next
  file by name, whatever the game asked: played in order, every load was
  right, and a restart after Part 2 loaded Part 3 where Part 1 should
  have been. Where a game can go back (a death, a restart, a menu), take
  that path from each later part live, and check what the load put in
  memory against what the game asked for.
