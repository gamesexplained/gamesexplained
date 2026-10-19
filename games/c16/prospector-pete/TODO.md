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

- The sound section lists the seven effects and plays none: the site
  has no player for TED's sound (#434).
- The creatures are left out of the mine on How it works: it runs the
  level builder, Pete, the dynamite and the water, and not
  `move_creatures`, the scoring or the deaths.
- Open in `features.md`: whether the up-and-down chase was meant to use
  the row, and whether other releases of the game differ from this tape.

## Ideas

- A Play tab would be a port of the whole game in JavaScript, routine by
  routine, held to the game in lockstep (`kit/skills/core/70-minisite`,
  "Play"). The page's engine and its traces in `work/trace/` are a start
  on the tests.
- The freeze could get a recording: plus4emu's frames from the stick
  being laid to the creature coming out, as a strip or a GIF.
