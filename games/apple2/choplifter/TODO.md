# Choplifter — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver, on 20 October 2026: 100 % of the 30,193 bytes the ledger tracks,
`facts.md`, one sample of 80 comments (13 wrong, all corrected), every
feature confirmed, traced or found to differ, the minisite built with a
player for every sound effect, copy `agent-draft`.

## Recommended

- **An audit of the whole listing.** The sample's rate, 16.3 % (17.4 %
  weighted by the strata), is well over the mark of one in 30, and every
  wrong comment was hand-written. A fresh checker on a proven model
  should read all 835 hand-written comments and correct them with
  `kit/scripts/accuracy.py` recording the audit (`kit/CHECKING.md`).

## For Gold

- A human pass over every section of the two pages, section by section,
  setting `copy` in `game.json` to what the pass was.

## Gaps

- None in the coverage. The loading screen (`$2000-$3FFF` at the
  hand-over), which the game draws over and keeps the ground and the
  counters' bar from, is screen memory the listing leaves out; the How it
  works page carries it as the picture its demonstration starts from.

## Ideas

- A Play tab: a port of the game, routine by routine, held to its code
  in lockstep (`kit/skills/core/70-minisite/play.md`). The speaker player
  and the attract mode's run already work from the listing.
- The jets' attack scripts, four bytes a step, drawn as the path each
  takes.
