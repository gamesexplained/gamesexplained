# Prospector Pete — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver, on 19 October 2026: 100 % of the 10,395 bytes the ledger tracks,
`facts.md`, one sample of 60 comments (5 wrong, all corrected), the
minisite built (How it works, Discoveries, Maps / levels), copy
`agent-draft`.

## Recommended

- **An audit of the whole listing.** The sample's rate, 8.3 %, is over
  the mark of two in 60. A fresh checker on a proven model should read
  all 202 comments and correct them, with `kit/scripts/accuracy.py`
  recording the audit (`kit/CHECKING.md`).

## For Gold

- A human pass over every section of the three pages, section by
  section, setting `copy` in `game.json` to what the pass was.

## Gaps

- The creatures are left out of the mine on How it works: it runs the
  level builder, Pete, the dynamite and the water, and not
  `move_creatures`, the scoring or the deaths.
- Open in `features.md`: whether the up-and-down chase was meant to use
  the row, and whether other releases of the game differ from this tape.
- Three bytes the game reads are missing from `listing.json`: the table
  at $2970-$2972 beside each earth character (2, 1, 4), untyped in
  `symbols.json`. Typing them as bytes and rebuilding the listing from
  the snapshot fills the gap; the Play tab adds them meanwhile
  (`port/corrections.md`). It needs the contributor's snapshot, which
  the run that built the Play tab did not have.

## Ideas

- The freeze could get a recording: plus4emu's frames from the stick
  being laid to the creature coming out, as a strip or a GIF.
