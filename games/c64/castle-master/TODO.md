# Castle Master: what the next tier needs

## Gold

- A human pass over every section of How it works, Discoveries and Maps /
  levels: rewrite or cut the copy, and add what the run missed. Set `tier`
  to `silver-claimed` and `steward` when it starts.

## Open in the code

- Header parameters `$9D4D` and `$9D4E`, after the turning step: what
  reads them is not traced.
- The render buffers' capacity and overlap limits, and the boundary of
  the dynamic face index at `$1374-$1378`.
- Tape saving and loading: traced, not exercised.
- Effects 6 and 9 and message 9 are requested by nothing the run found;
  a later search with another method would make the claim stronger.

## Platinum

The Play tab and `test_play.js` are in place. Platinum needs the rest
of the bar in `AGENTS.md` confirmed: that the port is the whole game,
and that no bug known stops a player finishing.
