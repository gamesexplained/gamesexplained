# Doctor Who And The Mines Of Terror — TODO

Tier: **Silver** (100 % coverage, 56,533 tracked bytes; facts, features,
minisite; copy `agent-draft`).

For Gold, a human pass over `index.html`, section by section.

Worth doing, found in the run and not done:

- A Maps / levels tab: the map renderer on the How it works page draws the
  whole mine; a page with every zone's own glyph set (`$ABCF`, `$2E00`), the
  restart points (`$9059`), the lift and carrier stops and the object
  start positions would show the whole game world.
- The music: five tunes at `$1F00`-`$2D3F`, a two-voice driver at `$74EA`.
  Port it to `sid.js` and check it register by register against the game.
- Live tests not run: the lift and carrier exact-match boarding (`$A395`,
  `$A294`); the code lock; the madrag; oxygen outside; what happens at
  `$E8` = 8 (rising level); a real end of the game and its bonus.
- Who object `$0C` is (the Master?), and where tile `$23`, the only floor
  that allows the save menu, is in the map.
- The web sources could not be read in this run's environment (every game
  site was refused); a run that can read the C64-Wiki page and the manual
  should check `features.md` against them.
