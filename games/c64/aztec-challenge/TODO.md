# Aztec Challenge — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver, on 8 November 2026: 100 % coverage, every feature confirmed, live
or traced, a sample of the listing checked (11 of 60 comments wrong in a
detail, 18 %, all corrected), the minisite built with a music player and a
Graphics tab.

## Recommended next

- **An audit of the listing.** The sample found 18 % of comments wrong in
  a detail, well over the mark (2 in 60). A later run, when the
  contributor or a maintainer asks, should audit every comment and draw a
  new sample (`kit/skills/core/60-verify`).

## For Gold

A human pass over every section of the four authored pages
(`AGENTS.md`, "Definition of done").

## For Platinum

A Play tab: the seven levels ported to JavaScript and run in lockstep with
the game's code (`kit/skills/core/70-minisite/play.md`). Each level is a
small program of its own, so the port can grow a level at a time; the
music player already runs the game's interrupt.

## Open questions

- How many passages across the Piranha's lake a win takes in practice
  (the code says every second passage is a stage and stage 9 wins).
- The spears' whoosh in the Gauntlet is made across many calls of the
  level's loop, so it is not in the effects player; it would need the
  level's own loop run on the kit's machine.

## Questions for the contributor

None open.

## Ideas

- A recorded run through one level that the page replays.
- The night palette side by side with the day for the four levels it
  changes.
