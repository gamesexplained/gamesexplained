# Wasteland — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 462,622 of 462,622 bytes explained in 64 of 64 parts, every
feature confirmed, traced, live or marked as differing, the comment
samples checked (`facts.md`, "Comment sample"), and the copy
`agent-draft`.

## For Gold

A human pass over every section of the authored tabs, from the
Overview to Disks and saves, and of the facts, rewriting, cutting and
adding; `copy` then records what the pass did, and `steward` names
whoever starts it (`silver-claimed` while it runs).

## For Platinum

A Play tab that is the whole game: every routine ported to JavaScript
and run in lockstep with the game's own code, with `test_play.js`
beside the page (`kit/skills/core/70-minisite/play.md`), and no
known bug in the port.

## Traced, not tried live

`features.md` holds 50 features traced in the code and not exercised in
play. The ones a reader is likeliest to ask about:

- Start's N, which loads the side with the latest autosave (startup
  `$8228-$827C`).
- The Ranger Center's entrance coming back after module 3 has saved it
  away (`parts/module-3/facts.md`).
- The radio's promotion points after Base Cochise (radio `$7EBC-$7EFD`).
- Map 23's blade storm, which a party passes with less than 16 in cash
  (`parts/map-23/facts.md`).

## Article ideas

- The Paragraphs tab's finds, tried in the emulator: AZRAEL at Ugly's
  hideout, PHOENIX at Faran Brygo's door, ATOM in the Temple of Blood,
  and PASTEL to the bishop. `test_paragraphs.js` runs each on the game's
  code outside the emulator.
- Whether a party can reach map 4's "Read paragraph 35." (check square
  41) and map 36's "Read paragraph 162." (message 67): no square and no
  change that was walked leads to either.
- Map 11's wall square with no record, which may be the "buggy wall
  square" of Per Jorner's guide.
- The rules on The party tab, tried in the emulator: a Ranger at −15
  with and without Rabies, timed to death; a second visit to a doctor
  asking for a cure without a new exam; the three squares that read a
  Ranger's sex; and Control with R at the Ranger Center's skill list on
  an Apple II.
- The older start-up on side 3, its credits and the sounds it does not
  make, beside side 1's.
- The parties: how splitting the group keeps each party's square, map and
  return point (game `$9C17`).
- Pictures 37 and 75, which the disks hold and no code in the listings
  shows.
- The Bestiary tab's finds, tried in the emulator: three digs at the
  mine's north-west vein and a walk; a failure at the reactor's light
  plates; a Night Terror attacked until one runs with full hit points.
  `test_bestiary.js` runs each on the game's code outside the emulator.
- The Items tab's finds, tried in the emulator: a pack sorted with a
  RETURN before the Power armor and the suit traded on; a sale in Quartz
  looked for in Needles; the machine reset after leaving the sell list.
  `test_items.js` runs each on the game's code outside the emulator. The
  stock counts of item-table files 1, 2 and 4 are in no listing: a part
  for each file would let the test hold them.
