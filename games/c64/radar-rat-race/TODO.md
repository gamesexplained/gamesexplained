# Radar Rat Race — TODO

Tier: **gold**. Coverage 100 %.

For Diamond: a Play tab that is the whole game, every routine
ported to JavaScript and run in lockstep with the game's own code, with
`test_play.js` beside the page (`kit/skills/core/70-minisite/play.md`),
and no bug known that stops a player finishing.

Article: retitle and re-edit the copy under `kit/style.md`; the page was
written before the style guide existed. Set `copy` in `game.json` once a
human has read it.

Open questions are listed at the end of `features.md`.

## Open from building the maps page

- `$FF26`–`$FF56` hold an alternating `$00`/`$FF` pattern with no symbol.
  `facts.md` says the tables end at `$FF25`; the ledger attributes these
  bytes to `round_to_paramset`'s span only because a data symbol's span
  runs to the next boundary or 64 bytes. Whether anything reads them is
  unknown. Cross-reference them and either name them or mark them unused.
