## 0.0.315 · 2026-11-07 · Balloon Fight (NES) · Zihe Jia with Claude

- **Start a recorded game from the console's power-on, not from the
  listing's RAM.** The kit's NES built from `loadListing` holds the RAM
  of the snapshot the listing was made from, and a page starts with its
  RAM clear. A route searched on the first parted from the page in the
  bonus round, because the game reads `balloons_popped` before it first
  clears it. With the RAM cleared on the kit's NES too, the page and
  the kit agreed at all 8,220 reads but one, a scratch byte read mid
  frame. `games/nes/balloon-fight/route/find_route.js` and
  `test_route.js` clear it.
- **An emulator's power-on RAM is a second place for a replay to part.**
  jsnes fills the NES's RAM with `$FF` and MesenCE with 0. The recorded
  game agreed on MesenCE and, for 124 of 150 milestones, on jsnes, then
  popped a bonus balloon two reads early there. jsnes with its RAM
  cleared agreed to the end, and a bisection over the RAM, all clear
  but one range left at `$FF`, took six runs of six seconds to name the
  byte: the balloon spawn timer, `$05CC`, which the game counts down
  and never sets. The replay script takes `--clear-ram` for this
  (`games/nes/balloon-fight/route/check_emulator.py`), and a milestone
  on a byte the game only counts up is kept for a rise alone, since its
  reset shows only where the RAM held something else.
