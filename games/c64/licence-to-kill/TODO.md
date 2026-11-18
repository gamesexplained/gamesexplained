# Licence To Kill — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver. Coverage 100 %; one sample (seed 2616) found 11 of 60 comments
wrong, over the mark, and all 11 were corrected.

## Recommended

- A full audit of the listing's 1,314 comments by fresh checkers, then a
  second sample (`kit/skills/core/60-verify`): the first sample's rate,
  18 %, is likely to hold across the comments it did not draw.
- Gold: a human pass over every tab.
- A Play tab.

## Leads not yet on a page

- The first tanker's speed seems to be used for every tanker on level 5,
  `$263B` seems always 0, and the background-colour change in
  `move_enemies` when an enemy slot's edge limit is 0 (`$94EB`): each
  read once during coverage and not checked again.
- Whether the other build's "BOND WILL RETURN." reset screen shows when
  reset (traced from its `$C3` byte, not run).
- What the second build (`license.g64`) changes besides moving the code.
- What the title's "GREAT SCORE. INPUT YOUR NAME." line is for when no
  score has been made.
- From the reader review: assemble the multi-sprite things (helicopter,
  tankers) and animate the turning B-O-N-D letters on Graphics; draw the
  "BOND WILL RETURN." screen; say what level 2's height values mean for
  the oil drums.
