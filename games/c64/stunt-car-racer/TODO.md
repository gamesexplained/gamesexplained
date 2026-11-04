# Stunt Car Racer — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum: 100 % coverage, `facts.md`, a checked sample of the listing's
comments, every feature confirmed, traced or open, the minisite built,
and a Play tab that is the whole game ported and run in lockstep with the
game's own code, held in CI by `test_play.js`.

- **Diamond** needs Gold as well: a human curating the copy, section by
  section (`AGENTS.md`, "Definition of done"). When the first pass
  begins, `steward` names them and `tier` stays `platinum`, so the page
  reads platinum (claimed); once every section has had its pass, `tier`
  is `diamond`.
- **An audit of the whole listing** is recommended: the sample found 12
  of 60 comments wrong (20 %, `facts.md`, "The listing's error rate"),
  and a checker misses some (`kit/CHECKING.md`).

## Open questions

The ones in `features.md`, "Open questions": which divisions Practise
offers, whether the opponent is given a race the player's car is wrecked
in, how many seasons a multiplayer game lasts, whether the Super League
is "twice as fast", what five of the race settings' bytes do, and where
the Atari ST text came from.

## Ideas

- A player for the sound effects (seven bytes each, START_EFFECT `$8655`),
  driven by the game's own effect tick.
- The opponent's car on the Graphics tab, turnable by drag, drawn by the
  port's own drawing routines from any angle.
- The car's springs and damage shown live beside the Play tab's view.
- A Hall of Fame tab: the records' layout at `$DE00` and `$DF00`, loaded
  from a saved file.
