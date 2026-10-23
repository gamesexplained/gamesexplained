# Shadowfire — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage, `facts.md`, one sample of the listing's comments
checked and recorded, every feature traced, observed or explicitly open,
and the minisite built with a player for every tune.

## Recommended next: an audit of the listing

The one sample (seed 20261023, 80 comments) found 14 wrong, 17.5 %, over
the mark of 2 in 60. All 14 were corrected, with the 15 other comments
that said the same things, but the rest of the listing is likely to hold
errors at about the same rate: correcting what a sample found does not
bring a listing under the mark. An audit by fresh checkers, every comment
in its own range, then a second sample with a new seed
(`kit/skills/core/60-verify`), would let the Source tab call the listing
checked. The kinds of error to give the auditors, from `facts.md`, "The
listing's error rate": readers or callers left out of a comment, signs
and fractions misread, counts that ignore a path, and a table described
by what writes it rather than what reads it.

## For Gold

A human pass over the copy, section by section, on all three pages
(`index.html`, `discoveries.html`, `levels.html`), setting `copy` in
`game.json` to what the pass did.

## For Platinum

A Play tab that is the whole game, ported routine by routine and run in
lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
The pieces already ported and tested are a start: the pictures
(`draw_picture`), the view screen's map (`draw_view_map`) and the music
driver. Still to port: the icon screens and their handlers, the
interrupt's per-person second (walking, combat, lock picking,
recovery), the patrols, the transporter, the clock, the ticker and the
iris.

## Open questions

- Two features stay open in `features.md`: Syylk's hatred of Zoff, which
  the manual says "could prove a weakness" and the code never compares,
  and the Phantom, Zoff's invisible pet, which nothing in the code
  matches.
- The phantom enemies (`discoveries.html`, section 02) are traced and
  were run on the simulator; a live test in the emulator of a retreat
  refused towards location `$80` would add the observation.
- The Load and Save game icons were not run: saving to tape or disk, and
  what a saved position holds, are traced only.
