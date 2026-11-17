# RoboCop — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: bronze

Coverage is 100 % in all four parts (154,005 bytes), on a proven model,
and the listing has had its first sample. Silver is missing:

- **A Graphics tab that draws the sprite shapes.** `graphics.html`
  explains the screen split, the scrolling, the tiles and the
  three-sprite figures with diagrams, but does not draw the 192 sprite
  shapes of each level. They show RoboCop, ED-209 and the film's other
  characters, and this run left drawing them for the contributor to
  decide.
- **The reader review** (`kit/skills/core/75-review`), by an agent that
  wrote none of the pages.

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
