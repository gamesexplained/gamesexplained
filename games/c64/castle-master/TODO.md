# Castle Master: what the next tier needs

Platinum, on 22 October 2026: the Play tab is the whole game, and
`test_play.js` holds the published page in CI.

## Diamond

- A human pass over every section of How it works, Discoveries and Maps /
  levels: rewrite or cut the copy, and add what the run missed. Set
  `steward` to your GitHub login when the pass begins; `tier` stays
  `platinum` until every section has had its pass, then becomes
  `diamond`.

## Open in the code

- Header parameters `$9D4D` and `$9D4E`, after the turning step: what
  reads them is not traced.
- The render buffers' capacity and overlap limits, and the boundary of
  the dynamic face index at `$1374-$1378`.
- Tape saving and loading: traced, not exercised.
- Effects 6 and 9 and message 9 are requested by nothing the run found;
  a later search with another method would make the claim stronger.
