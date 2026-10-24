# The Sacred Armour of Antiriad — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: coverage is 100 %, `facts.md` is written, every feature is
confirmed, traced or open, the listing has had one sample, and the
minisite is built with a player for every tune.

## For a listing the page calls checked

- **Audit the listing.** The one sample (seed 20261024) found 15 of 80
  comments wrong in a detail, 18.8 % (95 % interval 11.7 % to 28.7 %),
  over the mark of one in 30. All fifteen were corrected with the 14
  others that said the same, but the sample's rate holds across the rest
  (`kit/skills/core/60-verify`). Fresh checkers should audit every
  comment, and a new sample on a new seed should follow.

## For Gold

- A human's pass over each section of the three pages, rewriting,
  cutting and adding (`AGENTS.md`, "Definition of done").

## For Platinum

- A Play tab that is the whole game, every routine ported and run in
  lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
  The pages already carry ports of `build_room`, `place_room_sprites`,
  the title and the sound driver, held by `test_rooms.js` and
  `test_music.js`.

## Article ideas

- A walk through the ending: the countdown message, the nine dissolve
  steps and the border flashes, drawn from `victory_sequence`.
- The suit's flight: `suit_vertical`'s acceleration and the sinking of
  a suit with no energy, as a widget.
- The machine gunner and the dragons as tile scripts (`$83`, `$86`,
  `$89`): how a picture made of characters is animated.
