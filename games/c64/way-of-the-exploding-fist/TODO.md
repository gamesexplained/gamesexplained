# Way of the Exploding Fist — TODO

Current tier: **Silver** (2 October 2026). Coverage 100 % of 56,996
tracked bytes; every feature in `features.md` confirmed, traced or open
with its search described; the minisite built and checked in a browser;
copy `agent-draft`.

## For Gold

A human curates the How it works page section by section (`kit/START.md`):
cut what is dull, expand what is interesting, rewrite what reads as
agent-written, and set `copy` in `game.json` honestly.

## The listing's accuracy

Measured, audited once and measured again (`facts.md`, "The listing's
error rate"; `game.json`, `accuracy`): the sample after the audit found 4
of 60 comments wrong, over the mark of 2 in 60, so the About tab says
"Audited & high error rate". To reach "Audited & low error rate", the next
step in `kit/skills/core/60-verify` is another audit and a new sample by a
checker that took no part. Both samples found every hand-written stratum's
errors and almost none in the template families (2 of 20, then 0 of 19),
so an audit of the 605 hand-written comments alone, recorded as "605 of
884", is the cheaper way in. The kinds to brief the auditor with: lists
of writers, callers or readers with places missing; cited addresses that
are a load where the store is meant, or off by an instruction; claims
true on one path stated as general; and lines added by an audit that
cite code nothing calls (the clearing loop at `$12ED`).

## Open questions worth a look

- What Melbourne House called each move: the game stores no names, and
  the names on How it works describe each move's frames.
- Why `blow_reaction` tests CIA 2's timer A (`$2CAE`).
- Whether a gap of exactly `$15` lines between the fighters makes a
  sprite row a frame late (`$32EA`, `$32FD`).
- What `m.tsound` and `m.spchtbl` are: not in the game's memory as they
  stand on disk; perhaps the loader's shout.
- What the sprite images at `$D200`-`$D3BF` and `$E5C0`-`$E63F` are for;
  nothing found points at them.
- Keyboard controls were traced, not typed live.

## Article ideas

- A Play tab: the fight loop is small enough to port, and the computer
  opponent's tables are all read.
- Shape frames `$4D` and `$4E`: a standing figure built from sprite
  pointers `$40`-`$47` and `$4F` under the I/O chips, which no animation
  list uses. Graphics left in the game and never shown, for Discoveries.
- The bull round as a stepper: the bull's distance frame by frame, with
  the one window where move 7 lands.
