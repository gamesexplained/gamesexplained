# Shadowfire — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum: the Silver requirements, and a Play tab that is the whole game,
ported routine by routine and run in lockstep with the game's code, with
`test_play.js` holding the published page.

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
The Play tab's port corrected 15 more comments in the code it read (the
`play` row in `accuracy`): tests read the wrong way round (the frame's
early return, `frame_mode`), steps given in the wrong order (the
portrait's colours, the demonstration's fire), and a rule stated for
every case that holds only for some (the time lock, the view map's
flashing).

## For Gold, and so Diamond

A human pass over the copy, section by section, on all five pages
(`index.html`, `play.html`, `discoveries.html`, `levels.html`,
`solution.html`), setting `copy` in `game.json` to what the pass did.
With the Play tab Platinum, that pass makes the game Diamond.

## Open questions

- Two features stay open in `features.md`: Syylk's hatred of Zoff, which
  the manual says "could prove a weakness" and the code never compares,
  and the Phantom, Zoff's invisible pet, which its makers called a bug
  they had taken out (`discoveries.html#pet`). A copy of the first C64
  release with the bug in it would show which mnemonic was wrong.
- The phantom enemies (`discoveries.html`, section 02) are traced and
  were run on the simulator; a live test in the emulator of a retreat
  refused towards location `$80` would add the observation.
- The Load and Save game icons were not run: saving to tape or disk, and
  what a saved position holds, are traced only.
