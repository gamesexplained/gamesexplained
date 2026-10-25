# Kane — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: coverage is 100 %, `facts.md` is written, every feature is
confirmed, traced or open, the listing has had one sample, and the
minisite is built with a player for the game's one tune.

## For a listing the page calls checked

- **Audit the listing.** The one sample (seed 20261025) found 14 of 60
  comments wrong in a detail, 23 % (95 % interval 14 % to 35 %), over
  the mark of one in 30. All fourteen were corrected with about 60
  others that held the same beliefs, but the sample's rate holds across
  the rest (`kit/skills/core/60-verify`). Fresh checkers should audit
  every comment, and a new sample on a new seed should follow.

## For Gold

- A human's pass over each section of the three pages, rewriting,
  cutting and adding (`AGENTS.md`, "Definition of done").

## For Platinum

- A Play tab that is the whole game, every routine ported and run in
  lockstep with the game's code (`kit/skills/core/70-minisite/play.md`).
  The pages already carry ports of the picture unpacking, the rides'
  courses, the music and effects player, the two samples' player and
  `count_score`, held by `test_pictures.js`, `test_music.js`,
  `test_samples.js` and `test_score.js`.

## Open questions

- The older build at `$8010` and `$3F3A` has not been compared
  instruction by instruction with the code that runs; a comparison
  would show what changed late in development.
- One arrow taking two ducks is traced in `move_duck` but was not seen
  live.

## Article ideas

- The ride as a widget: the course scrolling under the horse, with the
  jumps and the time bonus counting as the clock runs down.
- The town's hiding places as a game of chance: how often two gunmen
  share a place, measured over many shoot-outs.
