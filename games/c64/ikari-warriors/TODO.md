# Ikari Warriors — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

Tier: Silver (coverage 100 %, every media item answered, sample checked,
pages built and reviewed). The next tier is Gold, which is a human's
pass over every page.

## Recommended

- **A full audit of the listing.** Sample 1117 found 16 of 80 comments
  wrong (20 %), all in the hand-written comments, and all were fixed; the
  sample is over the mark, so the Source tab says so. An audit of the 385
  written comments and a second sample would let it say "Audited & low
  error rate" (`kit/skills/core/60-verify`).

## Open

- Where the C64-Wiki's "attacks from behind" come from: soldiers that
  enter from the bottom of the screen were not looked for
  (`features.md`).
- The soldiers' sprite colours: the Graphics page draws them in one
  chosen colour; each group sets its own.
- The Maps page shows the scenery only. Marking the soldiers, mines and
  tanks needs the link between the scroll position in `route_list` and
  `tank_list` and the route row, which was not measured.
- The loading picture is a screenshot: its bytes are on tracks 15 to 17
  and in no listing. Drawing it from them needs the bitmap, screen and
  colour bytes embedded in the Graphics page.
- From the reader review: draw the eighth token and the 25 unused tile
  shapes on Discoveries; animate the sprites and show the figures built
  from several sprites assembled; say who the ending's eight figures are.
- A Play tab (Platinum): every routine ported and run in lockstep.

## Article ideas

- The 26 tile-set loads: what each set is, drawn as a strip.
- A step-through of one map object calling another with a repeat count.
