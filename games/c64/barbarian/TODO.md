# Barbarian — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage on both parts (115,620 bytes), a sample of 60
comments checked and corrected, every feature confirmed, traced or live,
and the minisite built with players for the title tune and every effect.

The sample found 6 wrong in 60 (10 %, weighted by stratum 6.5 %). An
audit of the whole listing by another model is recommended before the
page is relied on (`kit/CHECKING.md`).

## For Gold

- A human edit pass over How it works, Discoveries and Maps, section by
  section (`kit/style.md`).
- Decide whether Discoveries should draw Mariana's unused figure (scene
  record 3); it is described in words only, and the C64-Wiki's screenshot
  of it was kept out of `reference/`, which the site publishes.

## For Platinum

- A Play tab: a port of the fight to JavaScript, routine by routine, held
  in lockstep with the game (`kit/skills/core/70-minisite/play.md`). The
  moves widget, the computer's picks and the hit rules are the seed: each
  already has a port or runs the game's routines and a test.

## Article ideas

- Watch the computer's 6.4-second cycle: a widget that plays a whole bout
  against a fixed stick pattern and shows where each pick lands.
- The idle taunt (move `$9A`) was not seen in VICE; a screenshot would
  settle the feature row.
