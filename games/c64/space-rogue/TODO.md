# Space Rogue — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: Platinum, on 22 October 2026: the Play tab is the whole game, and
`test_play.js` holds the published page in CI.
Coverage is 100 % over all eight parts (142,169 bytes),
and the sample of 60 comments, checked by Codex, found 9 wrong (15 %),
all rewritten with the comments that shared their mistakes. Running the
pages' ports against the game's code found three more, also corrected
(`facts.md`, "The listing's error rate").

## For Diamond

- A human pass over `index.html`, `discoveries.html` and `levels.html`,
  section by section: rewrite or cut the agent's copy, expand what is
  interesting, add what it missed. Set `steward` to your GitHub login
  when the pass begins; `tier` stays `platinum` until every section has
  had its pass, then becomes `diamond`.
- An audit of the listing on a proven model (`kit/CHECKING.md`): the
  sample's 9 in 60 is over the mark of one in 30, so the listing does
  not count as checked until every comment has been read again.

## Checks the run did not make

- Two labels in the engine's listing sit on the wrong byte, and moving
  them needs a build from a snapshot (`listing.py`, not `--recomment`):
  `arccos_rad` belongs at $997B, not on the SBC operand at $9977, and
  `saved_cursors` at $9E90 labels save_cursor's RTS, which should be
  code. Their comments already say so (`port/corrections.md`).

- The Play tab's pace was checked against the game in flight and in
  fights (`port/test/t-page.js`). Navigation, the bases and HIVE! were
  not: their waits are the game's delay loops, whose cycles the port
  counts exactly, but the work between them is costed by the fit made
  on flight, fights and docking.
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
- The Play tab's second pass: the 3D view drawn at the browser's own
  resolution and frame rate, as Mercenary's Play tab does, with the
  game's pace kept.
- The talk scripts as a browser: who says what at which base.
