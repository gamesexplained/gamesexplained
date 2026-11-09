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

- The Temple ignores a touch on the runner's upper half (`$79F0`): read in
  the code, not tried live. A snapshot in a room with falling spears and
  the runner stopped would settle it.
- Hopaztec's floor: how the tile numbers lie on the screen. The edge
  tables at `$5BE8`-`$5C20` do not fence a simple grid when walked with
  the hop rules; a live walk round the floor's edge, recording the
  hopper's position and `$16`, would draw the map.
- How many passages across the Piranha's lake a win takes in practice
  (the code says every second passage is a stage and stage 9 wins).
- The sound effects (the spears' whoosh, the falls) are written by the
  levels' own code, not by a driver; a player for them would record the
  SID in the emulator.

## Questions for the contributor

None open.

## Ideas

- A floor map of Hopaztec with the trapped tiles of a roll marked on it,
  once the tile layout is measured.
- A recorded run through one level that the page replays.
- The night palette side by side with the day for the four levels it
  changes.
