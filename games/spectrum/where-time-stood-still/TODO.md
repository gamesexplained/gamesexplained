# Where Time Stood Still — TODO

Tier: Silver. Coverage is 100 % in each of the six parts
(`coverage.py`), every feature in `features.md` is live, confirmed,
traced, or open with what was tried, and the three tabs are built and
checked in a browser. The copy is `agent-draft`.

## The listing's error rate

A sample of 60 comments from `main` and bank 3, checked by
a checker of another provider through the Codex CLI, found 18 wrong in a detail (30 %,
Wilson 95 % interval 19.9–42.5 %), far over the mark of 2; all 18 were
corrected, and the comments that said the same things with them. The
comments of banks 1, 4, 6 and 7 were written after the draw and have not
been sampled. **An audit of every comment is recommended**, then a new
sample: the Source tab says the listing has not had one.

## For Gold

- A human pass over every section of the three tabs (`index.html`,
  `discoveries.html` and `levels.html`), cutting what is dull, expanding
  what is interesting and adding what the agent missed; `copy` in
  `game.json` records what the pass did.

## Open

- The open questions in `features.md`: whether a second game keeps the
  first one's changes to the creatures, what actor `$2D` does to the
  routes when nothing is dropped, whether areas 12 and 15 can be reached,
  what object 15 is for, and a month's end with no capture.
- What the small font draws for code `$2C`, the mirrored O of the
  tribe's speech (`discoveries.html`, 02).
- Which creature is which: the types are named by behaviour, and the
  fan map's names are matched to them by inference.
- The envelope of the AY chip is not modelled in `site/lib/ay.js`. In
  every recording the page plays, no volume has bit 4 set and registers
  11 to 13 are never written, so this game does not need it; a game that
  uses the envelope will.

## Ideas

- A Play tab. The logic is bank 3's and `main`'s Z80 code, and the
  view's renderer, the area loader's output and the sound are already
  held to the game's code; the party, the creatures and the menus are
  what a port would add.
- The plateau overview on the Maps tab with the zones and the
  creatures' routes (bank 3 `$FB1E`, `$ED68`) drawn over it.
