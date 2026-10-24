# Paradroid — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage, `facts.md`, one sample of the listing's comments
checked and recorded, every feature confirmed, traced or explicitly
open, and the minisite built (How it works, Discoveries, Maps / levels,
Source code), with a player for the title tune and every sound effect.

## Recommended next: an audit of the listing

The one sample (seed 20261024, 60 of the listing's 740 comments) found
14 wrong, 23.3 %, over the mark of 2 in 60. All 14 were corrected, with
the 4 other comments that said the same things, and drawing the deck
against a recorded frame corrected 3 more; but the rest of the listing
is likely to hold errors at about the same rate: correcting what a
sample found does not bring a listing under the mark. An audit by fresh
checkers, every comment in its own range, then a second sample with a
new seed (`kit/skills/core/60-verify`), would let the Source tab call
the listing checked. The kinds of error to give the auditors, from
`facts.md`, "The listing's error rate": readers or callers left out of a
comment, an index register misread, counts of waits, paths missed (a
second caller, a wrap in a subtraction), and a table named by one of its
uses rather than what it holds.

## For Gold

A human pass over the copy, section by section, on all three article
pages (`index.html`, `discoveries.html`, `levels.html`), setting `copy`
in `game.json` to what the pass did.

## For Platinum

A Play tab that is the whole game, ported routine by routine and run in
lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
The pieces already ported and tested against the game's code are a
start: the deck builder (`build_deck`), the droid pictures
(`droid_picture`), the enquiry text (`unit_line`, `field_value`,
`describe`), the ship roll (`build_ship`) and the sound driver
(`sound_frame`).

## Open questions

- Whether the disruptor really blows up an explosion a second time and
  scores 100 (`features.md`): traced in the code, not seen live.
- Whether an energiser costs nothing at a score of 0: traced in
  `score_tick`, not seen live.
- The 1986 Hewson disk is a different build (`orientation.md`): which
  code bytes differ and what each change does.
