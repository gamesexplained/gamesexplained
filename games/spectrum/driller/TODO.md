# Driller — TODO

Tier: Platinum, on 2 November 2026: the Play tab is the whole game, ported
routine by routine and run in lockstep with the game's own code, and
`test_play.js` holds the published page in CI. Coverage is 100 %
(`coverage.py`), every feature in `features.md` is live, confirmed,
traced, differs or open with what was tried, and the four tabs are built
and checked in a browser. The copy is `agent-draft`.

## The listing's error rate

A sample of 75 of the listing's 262 comments, checked by a checker that
wrote none of them, found 14 wrong in a detail (18.7 %, Wilson 95 %
interval 11.5–28.9 %), over the mark of one in 30. All 14 were corrected.
**An audit of every comment is recommended**, then a new sample: the
Source tab says the listing has not had one.

## For Diamond

- A human pass over every section of the three tabs (`index.html`,
  `discoveries.html` and `levels.html`), cutting what is dull, expanding
  what is interesting and adding what the agent missed; `copy` in
  `game.json` records what the pass did. Set `steward` to your GitHub
  login when the pass begins; `tier` stays `platinum` until every section
  has had its pass, then becomes `diamond`.

## Open

- Whether the disc version prints "TAPE OR DISC ?" (`$C838`): this tape
  version holds the text and never prints it.
- Whether Trachyte's tour of seven areas, which its script starts once 18
  sectors are safe, is ever seen: the 18th safe sector is also the one
  that ends the game, and the run did not play to that end in the game.
- Kit issue #729: the lockstep's record of the interrupt's writes, which
  the port works around with a checkpoint at each end of every beam wait.
