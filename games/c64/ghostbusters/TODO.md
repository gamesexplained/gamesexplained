# Ghostbusters — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Platinum (claimed)** (22 October 2026): the Play tab is the whole game,
and `test_play.js` holds the published page to the game's code in CI.
Silver since 30 September 2026: coverage 100 %, every feature confirmed,
traced or explicitly open (`features.md`), facts verified (`facts.md`),
the Overview, focused tabs and Play tab built. The copy is `agent-draft`.
The steward, unorig, has claimed the curation pass.

## For Diamond

- A human pass over every tab, section by section: rewrite, cut, expand,
  add what the agent missed. Set `copy` to what the pass did.
- A human pass over the Play tab's text in the same way.
- `tier` stays `platinum` until every section has had its pass, then
  becomes `diamond`.

## Open

- After F1 restarts from the end pages, the Play tab's lockstep differs
  for one pass in the sprite X registers `$D000`-`$D00C`: it replays the
  interrupt after `init_game_vars`, where the game ran it before. The
  page is not affected; the lockstep's report is.

- A publisher's original disk or tape, to compare with the two copies
  studied (About, "The copies studied").
