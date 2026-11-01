# The Detective — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: Silver

100 % coverage; `facts.md`; a sample of 60 comments checked (14 wrong,
all corrected, `facts.md`, "The listing's error rate"); the minisite with
the two tunes, the cast's scripts, every room with its doors, the menu
pointer and the order of the murders.

## Recommended next

- An audit of every comment in the listing, then a fresh sample
  (`kit/skills/core/60-verify`): the first sample found 23 % wrong, so
  the rest of the listing very likely has errors of the same kinds.
- Gold: a human pass over the three pages (`AGENTS.md`).

## Questions for the contributor

- Is the second tune heard anywhere besides the first visit to a room
  where someone has died?
- Does anyone have the original inlay or instructions? None was found
  online on 1 November 2026 (`features.md`, "Sources"), so the features
  list rests on the game, Zzap!64, Wikipedia and the author's interview.
- Is there an uncracked copy? Three cracks agree, but a change made
  before all of them cannot be ruled out (`orientation.md`).

## Ideas

- A recorded route through the whole game to the promotion, played from
  the start with stick input only (`kit/skills/core/65-inputs`). The
  ending is tested live from a state set by hand (`facts.md`, "Live
  tests"); the route itself needs a bot that also walks Snide through
  doors, opens the safe (the keyboard), names the library book, and waits
  for each murder by being in the right rooms. `work/bot.py` already
  drives the menus and the lists through the stick.
- The doors' depth on the Maps tab: only their columns are marked; the
  furniture's nearest and farthest depth (`$1B40`, `$1B60`) are not drawn.
- How the lost fire presses depend on the room: measured only in the hall.
