# Storm — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: Platinum, on 22 October 2026: the Play tab is the whole game, and
`test_play.js` holds the published page in CI.
Coverage is 100 %, and the sample of 80 comments found 8
wrong (10.0 %, over the mark of one in 30), all corrected with the
comments that repeated them.

## For Diamond

- A human pass over `index.html`, `discoveries.html` and `levels.html`,
  section by section: rewrite or cut the agent's copy, expand what is
  interesting, add what it missed. Set `steward` to your GitHub login
  when the pass begins; `tier` stays `platinum` until every section has
  had its pass, then becomes `diamond`.
- An audit of every comment in the listing on a proven model, then a
  second sample with a new seed (`kit/skills/core/60-verify`), since the
  first sample was over the mark and its rate is a lower bound.

## Open questions

- Which door the manual calls gold (`features.md`, "Open questions").
- Whether the release as sold had room 0 untouched: a second copy of
  the disk would settle it.

## Ideas

- A choice of steering on the Play tab: an arrow key that turns the
  character to face its way, then walks, for players who find the
  rotational controls hard on a keyboard.
- Two players on the monster widget, with the monsters choosing the
  nearer of them as `move_monster` does.
- The low-energy warnings and the death's border flash, from their own
  code.
