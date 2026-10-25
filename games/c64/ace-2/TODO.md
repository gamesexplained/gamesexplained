# ACE 2 — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: coverage is 100 %, `facts.md` is written, every feature is
confirmed, traced or differs from the manual with the reason, the listing
has had one sample, and the minisite is built with a player for the one
tune.

## For a listing the page calls checked

- **Audit the listing.** The one sample (seed 2510251) found 12 of the 60
  hand-written comments wrong in a detail, 20 % (95 % interval 11.8 % to
  31.8 %), and none of the 20 generated ones; weighted, about 17.7 %, over
  the mark. All twelve were corrected with the seven others that said the
  same, but the sample's rate holds across the rest
  (`kit/skills/core/60-verify`). Fresh checkers should audit every
  comment, and a new sample on a new seed should follow.

## For Gold

- A human's pass over each section of the two pages, rewriting, cutting
  and adding (`AGENTS.md`, "Definition of done").

## For Platinum

- A Play tab that is the whole game, every routine ported and run in
  lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
  The pages already carry a port of the map's sea-or-land lookup
  (`$14AF`, held by `test_map.js`) and run the music driver
  (`test_sound.js`). Two pilots on one keyboard, the computer pilot and
  the cockpit views' horizon and enemy drawing are the large parts.

## Article ideas

- The cockpit view: how `$6225` draws the horizon, the enemy plane by
  range and the ground targets into a character set each pass, as a
  widget stepping through the range pictures.
- The computer pilot's manoeuvres (`$5D30`) as a picker that shows each
  move's stick and throttle over time.
- The loader: six runs of raw sectors read by block number and EORed
  with `$FD`, beside five directory entries that are decoys
  (`orientation.md`).
