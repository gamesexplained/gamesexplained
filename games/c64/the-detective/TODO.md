# The Detective — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: Silver

100 % coverage; `facts.md`; a sample of 60 comments checked (14 wrong,
all corrected, `facts.md`, "The listing's error rate"); the minisite with
the two tunes, the cast's scripts and every room drawn.

## Recommended next

- An audit of every comment in the listing, then a fresh sample
  (`kit/skills/core/60-verify`): the first sample found 23 % wrong, so
  the rest of the listing very likely has errors of the same kinds.
- Gold: a human pass over the three pages (`AGENTS.md`).

## Questions for the contributor

- Which icon picture is which action? The handlers are known
  (`$87ED`); the pictures were not matched to them on screen.
- Is the second tune heard anywhere besides the first visit to a room
  where someone has died?

## Ideas

- Draw the doors and the objects over the room pictures on the Maps tab
  (door table `$1F00`, door drawing `$3993`).
- A stepper for the menu pointer's momentum (`$315F`), ported and
  tested against the game's code.
- A recorded route through the winning moves (swap the bullets, fill the
  envelopes, accuse Dingle), replayed on the page (`kit/skills/core/65-inputs`).
- A timeline of the murders: which script waits for what (`$B09C`).
