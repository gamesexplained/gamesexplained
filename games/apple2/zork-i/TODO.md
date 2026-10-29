# Zork I — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % of the 87,182 bytes the ledger tracks, the interpreter's
8,616 (19 October 2026) and the story's 78,566 (28 October 2026),
`facts.md` for each part, a sample of 80 comments on each (7 and 10
wrong, all corrected), the minisite built, copy `agent-draft`.

## Recommended

- **An audit of the whole listing.** The interpreter's sample, 8.75 %
  (4.1 % weighted by the strata), and the story's, 12.5 % (5.8 %
  weighted), are both over the mark of one in 30, and every wrong comment
  was one the run wrote. A fresh checker on a proven model should read
  the 330 comments written on the interpreter and the 728 written on the
  story, and correct them with `kit/scripts/accuracy.py` recording the
  audit (`kit/CHECKING.md`).

## For Gold

- A human pass over every section of the three pages, section by
  section, setting `copy` in `game.json` to what the pass was.

## Gaps

- The Timber Room crash is traced on the Apple II and played only in
  Bocfel: carrying the sack in, on the Apple II in Apple2TS, would show
  the BRK into the Monitor.
- The word `forest` names the forest (object 140, property 18), yet the
  sample's checker saw `I can't see any forest here.` at the Forest Path
  and the Clearing, where `pines` works: why is not traced.
- Whether anything makes the treasures the skeleton's curse sends to the
  Land of the Living Dead visible again: ROB sets attribute 29 on every
  one it moves (`je L02 L02`, story $5DDB).
- Open in `features.md`: whether time passes only on a move, and which of
  the 1983 manual's parser features release 15 has.

## Ideas

- A Play tab would be a port of the whole Z-machine, the interpreter's
  routine by routine, with the story file as data: a page may carry game
  data, but a whole story file is the program, so ask a maintainer first.
- Zork II release 7 uses the same interpreter (`iver2` in a2zip), so most
  of this listing would map onto it.
