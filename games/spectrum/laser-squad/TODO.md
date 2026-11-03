# Laser Squad — TODO

Tier: Platinum, on 3 November 2026: the Play tab is the whole game, the
engine and all five scenarios, ported routine by routine and run in
lockstep with the game's own code, and `test_play.js` holds the published
page in CI. Coverage is 100 % over the engine and the five scenarios
(`coverage.py`, each part), every feature in `features.md` is live,
confirmed, traced, differs or open with what is missing, and the four
tabs are built and checked in a browser at desktop and phone width. The
copy is `agent-draft`.

## The listing's error rate

A sample of 80 of the listing's 7,482 comments, checked by a checker that
wrote none of them, found 10 wrong (12.5 %, Wilson 95 % interval
6.9–21.5 %), over the mark of one in 30. All 10 were corrected, with the
comments that made the same claims. **An audit of every comment is
recommended**, then a new sample: the Source tab says the listing has not
had one.

## For Diamond

- A human pass over every section of the three tabs (`index.html`,
  `discoveries.html` and `levels.html`), cutting what is dull, expanding
  what is interesting and adding what the agent missed; `copy` in
  `game.json` records what the pass did. Set `steward` to your GitHub
  login when the pass begins; `tier` stays `platinum` until every section
  has had its pass, then becomes `diamond`.

## Open

- How a shot's chance is made from the weapon, the kind of shot and the
  unit's skill (`shotHit`, `$9043`, reads it from `$5DCD`), against the
  manual's half for auto fire and double for aimed; the same for close
  combat's chance to hit.
- Panic (the manual's units that drop what they hold) and the droids'
  morale that never falls: neither is traced.
- The inlay text says scenarios 4 and 5 misbehave at higher levels, the
  computer's reinforcements arriving away from the squares for placing or
  sitting in a corner. The reinforcements come back in the patches their
  records give (`cyberReinforce`, `$FF67`; `paradiseReinforce`, `$FEDF`);
  whether those patches explain it is not checked.
- How often the Water Dwellers' charge picks a different enemy from the
  nearest. A count over 12,000 passes of Paradise Valley with the first
  side placed by the river found no charge at all, which more likely says
  the counting hook missed `aiCanGo` than that no Water Dweller ever saw
  an enemy.
- A step back costs twice a step forward, 8 on open ground, where the
  manual says 6: a candidate for the Discoveries tab.
