# Ghostbusters — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Silver (claimed)** (30 September 2026). Coverage 100 %, every feature
confirmed, traced or explicitly open (`features.md`), facts verified
(`facts.md`), the Overview, focused tabs and Play tab built. The copy is
`agent-draft`. The steward, unorig, has claimed the Gold pass.

## For Gold

- A human pass over every tab, section by section: rewrite, cut, expand,
  add what the agent missed. Set `copy` to what the pass did.
- A human pass over the Play tab's text in the same way.

## Open

- Which speech phrase says what. Phrase 1 is "Ghostbusters!"; the words
  of phrases 2 and 3 are inferred from when the game plays them; phrase 4
  is unknown. Listening to each on the Play tab or the How it works page
  would settle it.
- After F1 restarts from the end pages, the Play tab's lockstep differs
  for one pass in the sprite X registers `$D000`-`$D00C`: it replays the
  interrupt after `init_game_vars`, where the game ran it before. The
  page is not affected; the lockstep's report is.

- A publisher's original disk or tape, to compare with the two copies
  studied (About, "The copies studied").

## For Platinum

- Reassemble the listing byte for byte to the analysed image and boot it.
