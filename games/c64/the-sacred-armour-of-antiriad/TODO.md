# The Sacred Armour of Antiriad — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum: a Silver (coverage is 100 %, `facts.md` is written, every
feature is confirmed, traced or open, the listing has had one sample,
and the minisite is built with a player for every tune) whose Play tab
is the whole game, every routine ported and held to the game's code in
lockstep, with `test_play.js` holding the published page.

## For a listing the page calls checked

- **Audit the listing.** The one sample (seed 20261024) found 15 of 80
  comments wrong in a detail, 18.8 % (95 % interval 11.7 % to 28.7 %),
  over the mark of one in 30. All fifteen were corrected with the 14
  others that said the same, but the sample's rate holds across the rest
  (`kit/skills/core/60-verify`). Fresh checkers should audit every
  comment, and a new sample on a new seed should follow.

## For Diamond

- A human's pass over each section of the pages, rewriting, cutting and
  adding (`AGENTS.md`, "Definition of done"), makes the game Gold and,
  with the Play tab, Diamond.

## The Play tab

- The page runs an interrupt's handler whole at the line it comes on,
  so the band that runs `tal_control` reads the stick at line 250 where
  the C64 reads it about line 262. A change of the stick in the twelve
  lines between can put the page's reads a frame apart from the C64's
  (`agent-history.md`). Moving the page's clock through a handler as
  its routines run, so each reaches its line when the C64's does, is
  untried; moving only the chips' clock that way made the page worse.

## Article ideas

- The suit's flight: `suit_vertical`'s acceleration and the sinking of
  a suit with no energy, as a widget.
