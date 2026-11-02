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

- The won game (`route.json`) replays in VICE from the hand-over
  snapshot, frame by frame. It is not recorded by the game's reads of
  the stick (`kit/skills/core/65-inputs`), so it would not replay on
  another emulator or a port; recording it again by reads would make a
  "Watch the solution" button possible on a future Play tab.
- Whether lost presses depend on the room or on the main loop's load:
  40 presses in each of eight places did not show a difference
  (`facts.md`, "Live tests"); a few hundred a place would.
