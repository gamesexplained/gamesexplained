# Aztec Challenge — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum, on 10 November 2026: the Play tab is the whole game, ported
routine by routine (`reference/az-*.js`) and held in lockstep with the
game's own code by `test_play.js`, which also holds the page's pace. It
rests on the Silver of 8 November 2026: 100 % coverage, every feature
confirmed, live or traced, a sample of the listing checked (11 of 60
comments wrong in a detail, 18 %, all corrected), the minisite built with
a music player and a Graphics tab.

## Recommended next

- **An audit of the listing.** The sample found 18 % of comments wrong in
  a detail, well over the mark (2 in 60). A later run, when the
  contributor or a maintainer asks, should audit every comment and draw a
  new sample (`kit/skills/core/60-verify`).

## For Gold

A human pass over every section of the five authored pages
(`AGENTS.md`, "Definition of done"). Gold with the Play tab kept is
Diamond.

## The port's limits

- The kit's machine does not run the SID's voices, so in the lockstep
  voice 3's noise is a seeded sequence of bytes. The page's noise model
  (reSID's shift register) is held by nothing but its source. Hopaztec's
  20 trap lists recorded in VICE (Discoveries) could hold it, if the
  page's clock were started at the same moment as VICE's.
- The four light grey cells of the Stairs (`$D8FF`, `$D9FF`, `$DAFF`,
  `$DBE7`) are in the port and the listing; whether they show on the
  screen was not looked at.

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
- A level picker on the Play tab, setting `$03` on the scorecard as the
  test does.
