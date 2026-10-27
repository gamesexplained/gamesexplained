# Mr Puniverse — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum, on 27 October 2026: the Play tab is the whole game, ported
routine by routine and held to the game's own code by
`port/test/lockstep.js`, and `test_play.js` holds the published page in
CI. It is Silver underneath: 100 % coverage, `facts.md`, one sample of 80
comments (4 wrong, all corrected), the minisite built (How it works,
Discoveries, Maps / levels), copy `agent-draft`.

## Recommended

- **An audit of the whole listing.** The sample's rate, 4 in 80, is over
  the mark of one in 30. A fresh checker on a proven model should read
  all 269 comments and correct them, with `kit/scripts/accuracy.py`
  recording the audit (`kit/CHECKING.md`).

## For Diamond

- A human pass over every section of the four pages, section by section,
  setting `copy` in `game.json` to what the pass was. Set `steward` to
  your GitHub login when the pass begins; `tier` stays `platinum` until
  every section has had its pass, then becomes `diamond`.

## Gaps

- Open in `features.md`: the older version of the game, which Plus/4
  World says has a different ending, was not examined.
- Whether a player can reach the gaps in the floors of rooms 18 and 19
  that lead to room 0 (Discoveries, "five exits lead off the map").
- The scripted player of the lockstep reaches 2,905 of the 2,996
  instructions. Besides the code nothing calls, it misses a stretch of
  `update_bridge` (`$2CE4`-`$2D09`) and a few branches of `player_move`,
  `player_pass`, `draw_switch_on`, `collect_vitamin` and `update_crusher`
  (`port/scripts/code-reach.js` lists them). Those routines are tested
  alone against the game's code on saved moments, but not in lockstep.

## Article ideas

- Read from the code, `update_bridge` (`$2CE4`) would loop for ever on a
  bridge whose timer is even. Whether any room's bridge can get there is
  unchecked: a Discoveries entry, once shown on the machine.
