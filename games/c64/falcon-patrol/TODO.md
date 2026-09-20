# Falcon Patrol — what is left

## For Gold

Every other Gold requirement is met: coverage is 100 % (`coverage.py`), the
article is interactive, and several findings beyond the documentation are
verified live, including the forged input byte, the altitude ceiling and
the wave size following the score.

The one thing missing is the last line of the tier: **a human has read the
copy.** `game.json` says `copy: agent-draft`, which is the honest value
until someone reads the page. Read `index.html`, and if the writing stands
up, set `copy` to `agent` and `tier` to `gold`. If you change a word, set
it to `human-edited`.

## Open questions worth a second run

- **`flight_flags` bit 4.** Preserved carefully by `$4404` and `$5778`,
  never tested anywhere that was read. Something sets it for a reason.
- **`$22` bit 0.** Set at `$53BE` when the aircraft reaches the pad and
  cleared when the fuel hits zero, so "engine running" fits, but nothing
  observed turns on it.
- **`$6400`–`$65FF`.** `$5220` fills it with glyph `$0B` and writes three
  tagged records, and **nothing in the tracked image ever reads a byte of
  it**. Two agents checked independently, including every absolute,
  indexed and indirect access. Probably a buffer whose consumer was
  removed, possibly by the crack. The third record is also written at
  `$6627` where the `$50` spacing of the first two implies `$6527`, which
  looks like an original off-by-one.
- **Tank empty, `flight_flags` bit 7, is not verified live.** The
  aircraft was destroyed before the tank emptied on every attempt. The
  code at `$5582` is clear; an unattended run with the crack's
  no-collision poke applied and the fuel burn left alone would settle it.
- **The `AND #$00` gates** at `$5422`, `$5872` and `$5980` make their
  guard branches unreachable. They look like patches with the mask zeroed,
  but Remember's scroll text admits only to the interrupt and the
  high-score routine. Comparing against an original image would settle
  both this and the `NOP` runs at `$5470`, `$575E` and `$577C`.
- **`$4F` and `$53`**, two of the six per-enemy arrays, have their writers
  and readers recorded but no established meaning.

## For Platinum

Not attempted. It needs the listing to reassemble byte-for-byte to the
analysed image and the result to boot. `listing.json` is built from
`symbols.json` and passes `check_listing.py`, which is the starting point,
but no assembler has been run against it.
