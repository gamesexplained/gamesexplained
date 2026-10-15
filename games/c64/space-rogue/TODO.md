# Space Rogue — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: Silver. Coverage is 100 % over all eight parts (142,169 bytes),
and the sample of 60 comments, checked by Codex, found 9 wrong (15 %),
all rewritten with the comments that shared their mistakes. Running the
pages' ports against the game's code found three more, also corrected
(`facts.md`, "The listing's error rate").

## For Gold

- A human pass over `index.html`, `discoveries.html` and `levels.html`,
  section by section: rewrite or cut the agent's copy, expand what is
  interesting, add what it missed. Set `tier` to `silver-claimed` and
  `steward` to your GitHub login when the pass begins.
- An audit of the listing on a proven model (`kit/CHECKING.md`): the
  sample's 9 in 60 is over the mark of one in 30, so the listing does
  not count as checked until every comment has been read again.

## Checks the run did not make

- `60-verify` gained a paragraph on values a new game leaves alone after
  this run's verify step. The variables play changes that the new-game
  routine does not set have not been listed and read.

## Ideas

- A player-flown fight on Ships and combat: the page already runs the
  engine's loop on the bytes it carries, with no key pressed; feeding
  the keys of the Controls table to `do_key` (`$0E02`) would let the
  reader fly the Sunracer in it.
- The flight engine's 3D maths, which works in logarithms
  (`parts/engine/facts.md`), as a widget that runs one projection step
  by step.
- A Play tab for HIVE!, which is one load of 7,680 bytes over the
  engine.
- The talk scripts as a browser: who says what at which base.
