# Chuckie Egg 2 — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: Silver (22-23 November 2026). Coverage 100 %.

## Recommended: an audit of the listing

The 60-verify sample of 22 November 2026 found 18 of 70 comments wrong
(25.7 %, seed 20261122), and all 18 were corrected with five more that
said the same. A rate that high means more wrong comments remain outside
the sample: an audit (`kit/CHECKING.md`) on a proven model, range by
range, is the next step for the listing.

## For Gold (a human's pass)

- Every section read and rewritten where it reads as an agent's draft.
- Graphics: colour the sprites and pick-ups from the game's own tables
  (`$68AD` for creatures, `$8600` with `$57B6` for pick-ups), and show
  each creature's animation with its part in play.
- How it works §06: a player for the footsteps, each sound beside what
  Harry is doing.
- How it works §05: mark the power switch on the generator picture.
- How it works §03: an overlay colour scheme that stays clear of room
  33's own colours.

## Open questions

- Room 106 drew black in one teleport test, though `test_rooms.js` shows
  its drawing matches the game. Not investigated.

## Ideas

- The main loop is not tied to the frame, and creatures move twice for
  each of Harry's moves (`facts.md`): a page on speed and timing.
- The instructions' text beside what the code does, point by point.
- A Play tab, porting the game's movement routines (Platinum).
