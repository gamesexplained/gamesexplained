# Radar Rat Race — TODO

Tier: **gold**. Coverage 100 %.

For Platinum: install an assembler (64tass) and prove the exported listing
reassembles byte-for-byte to the snapshot (`regenerator2000 --verify`),
then build a bootable PRG of the steady state.

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
