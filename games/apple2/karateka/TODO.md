# Karateka — TODO

Tier: Silver. Coverage is 100 % in all six parts (84,224 bytes).

## For Gold

- A human curates the three pages section by section: rewrites what reads
  as clichéd, cuts what is dull, expands what is interesting and adds
  what the run missed. Set `tier` to `silver-claimed` and `steward` when
  the first pass begins.

## For Platinum

- A Play tab that is the whole game: every routine of the engine and the
  five stages ported to JavaScript and run in lockstep with the game's
  own code (`kit/skills/core/70-minisite/play.md`). The guards' brain
  (`reference/brain.js`) and the tune player are a start.

## The listing

- An audit is recommended: the sample found 8 of 80 comments wrong, over
  the mark of one in 30 (`kit/skills/core/60-verify`). All 8 and the 23
  comments that said the same were corrected, but the rate says more
  remain.

## The pages

- Side B is on no page: that the game upside down is side A with two
  tables of 192 row addresses reversed and one picture stored upside
  down, and the piece of a patched DOS 3.3 left in a sector the game
  throws away (`orientation.md`, "Side B"). Both belong on Discoveries.
- The castle picture (tracks 4-6) is drawn on no page; the Graphics tab
  could show it.

## The media

- `kit/apple2/media.py` lists a disk by its tracks. A DOS 3.3 or ProDOS
  disk's files are not listed by name.

## Open questions

- Whether Brøderbund's side B had the three sectors that do not read on
  tracks 17-19 of this copy, or the copy got them (`orientation.md`,
  "Side B"). Another copy of side B would say.

- Which key, if any, once ran the handler at engine $7742 that leaves the
  opponent one arrow.
- Whether the brain's fourth table was meant to be longer, or the stage's
  entry was moved onto its end.
