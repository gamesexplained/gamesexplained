# Fat Worm Blows a Sparky — TODO

The tier, what is missing for the next one, and ideas for the page.

## Tier

`game.json` records `silver`, with the maintainer's check that allows it
(`verification`). Coverage is 100 % of the 39,631 bytes the ledger tracks
(`coverage.py`), every row of `features.md` is live, confirmed, traced,
differs or open with the search described, and `facts.md` lists its live
tests and how it was checked.

## For Gold

Gold is a person going through the page section by section
(`kit/START.md`). Things that person might want:

- **Can the disk be reached with fewer than 50 spindles?** The code that
  ends the game does not test the count; a block the count raises looks
  like the only bridge. Finding or ruling out a route is a search with the
  game's own movement code (`kit/skills/core/60-verify`, "Prove
  reachability with inputs, not pokes").
- **Play the game to the ending.** The ending on the page was reached by
  writing the disk into the worm's path. A recorded run that collects 50
  spindles would show the bridge rising and the drive's arm moving.
- **The worm, the creatures and the spindles in the view.** The page's
  view draws boxes and ramps. The worm (`$851C`), the Crawly's legs
  (`$B36A`) and the picture plotter (`$B7E3`) are described in the listing
  and not ported.
- **A Play tab.** The mechanics are all in `facts.md`.
- **A very high Sputnik passing over a burper.** The manual says it
  survives; no test of a Sputnik's height was found. Open in
  `features.md`.

## Not exercised live

These are simulated or traced only: the eruption pads releasing a Crawly
(`$BE07`), the rippling blocks (`$BDD1`), the disk drive's arm and the
50-spindle block (`$BED1`), trains on the data buses (`$D534`), the
counter on the type `$E0` blocks, a Crawly killed by a sparky, a Sputnik
landing, the larger Crawly after pass 4,352.

## Ideas for the page

- The hand of the ending drawn from its script at `$BAAE` (15 four-sided
  shapes), stepped a frame at a time.
- The rippling row of blocks in cell `$6B46`, animated from the sine table.
- The trapezoid fill stepped a row at a time, showing which of the five
  bodies each edge uses.
- The tune's ten scripts shown as notes, not only as pitch.
