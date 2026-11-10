# Bruce Lee — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver. Coverage is 100 %, `facts.md` is written, and the listing was
sampled once (seed 2611, 16 of 60 comments wrong, all corrected). The
coverage and verify steps ran on a proven model.

## Recommended next

- **A full audit of the listing.** The sample found 16 of 60 comments
  wrong (26.7 %, 95 % interval 17.1 % to 39.0 %), far over the mark of 2,
  so the rest of the listing very likely holds errors of the same kinds:
  roles described too narrowly, comparisons read the wrong way round, and
  records that start a byte or two away from their label
  (`kit/skills/core/60-verify`).
- Gold: a human pass over every tab, section by section.

## Open questions

- Which bytes the Remember crack and its two trainer options change,
  compared with Datasoft's original disk.
- The C64-Wiki's claim that the second loop takes the safe spots out of a
  safe room was not looked for.
- The contemporary reviews' own words: only scores were found
  (MobyGames). The January 1985 *Commodore User* and the August 1988
  *ZZap!64* are the likeliest to be transcribed somewhere.
- The units of the enemies' per-room waiting times (`$131F`, `$135B`):
  how often `count_enemy_timers` counts them down was not measured.

## Article ideas

- An interactive version of the terrain test: a frame's outline over a
  room's characters, with the flags it sets.
- A room viewer drawn from the packed screens and the colour bands, in
  place of the screenshots on the Maps tab.
- A Play tab.
