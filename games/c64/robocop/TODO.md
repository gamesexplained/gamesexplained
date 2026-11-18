# RoboCop — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: silver

Coverage 100 % in all four parts on a proven model, sample taken, the
Graphics tab draws every figure, and the reader review is settled. Gold
needs a human's curation pass, section by section.

Reader-review asks left open (work/reports/reader-review.md):

- A scene for the level-three firing bug: a slider for the first enemy
  slot's height and the street's enemies firing as it crosses.
- A player for the leftover tune at `$BBCC`, once its patterns from
  `$B800` are put back together with a tune entry.
- Stage eight's map shown beside stage five's stairs, for the unreached
  stairs code.
- The high-score table and the pickups drawn in the game's own pictures.
- A power-drain demonstration; each sound effect beside its event.
- A two-sprite figure beside a three-sprite one on Graphics.

## Recommended

- **An audit of every comment.** Sample seed 2617 found 12 of 60
  comments wrong in a detail (20 %, interval 11.8 % to 31.8 %), over the
  mark of 2. All 12 are corrected, but the rate says more are wrong.
- Regions typed Undefined in level three's code area (`$8210-$824B` and
  about thirty more) show as bytes in the listing; some are tables, some
  may be code reached through tables, as level two's pickup routines at
  `$A03F` were.
- The C64-Wiki's bug, "the third level sometimes starts with a screen of
  rubbish", is open: it may be the second disk's stage seven.
- Which build of the two disk images came first.
- A Play tab.
