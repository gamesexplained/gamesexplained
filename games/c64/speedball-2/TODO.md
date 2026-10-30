# Speedball 2 — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: both parts at 100 % coverage (87,102 bytes), `facts.md`, the
listing sampled and every step recorded in `accuracy`, the minisite built
with a player for both of the intro's tunes, copy `agent-draft`.

## Audit the listing

The one sample found 21 of 80 comments wrong (about 28 % weighted by
stratum, a lower bound), and all 21 were corrected along with every
comment that said the same. A rate that high means more wrong comments
remain. A full audit, every comment checked by fresh checkers given the
kinds of error the sample found (counts off by one, conditions turned
round, steps left out, "nothing reads" claims, uses with no support),
then a new sample, would let the Source tab call the listing checked
(`kit/skills/core/60-verify`).

## For Gold

A human curates the pages section by section (`AGENTS.md`, "Definition of
done"): rewrites the copy where it reads as an agent's, cuts what is
dull, and adds what the agent missed.

## For Platinum

A Play tab that is the whole game: every routine of the game part ported
to JavaScript and held to the game's code in lockstep
(`kit/skills/core/70-minisite/play.md`).

## Open questions

No source found on the web on 30 October 2026 answers these.

- Why the cheat code is BRADFORD-ON-AVON. Aaron's reading, on the
  page: the author's favourite football team. The town's senior club,
  Bradford Town F.C., was founded in 1992, a year after the game
  (https://en.wikipedia.org/wiki/Bradford_Town_F.C.), so a source naming
  the team would settle it.
- Whose face the MARTIN picture shows. Aaron's reading, on the page:
  Martin Walker, who wrote the C64 version's music and sound effects. A
  source showing his photograph would confirm it.
- Which armour picture on the pitch is which of the gym's eight names
  (`features.md`, "Open questions").

## Article ideas

- The boot's copy protection: the key is the drive's own error message
  for a sector that cannot be read.
- The message to anyone reading the code, which the game never prints.
