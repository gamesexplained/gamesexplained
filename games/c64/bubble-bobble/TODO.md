# Bubble Bobble — TODO

**Tier: Silver.** 100 % of the 58,532 bytes the ledger tracks are
described (`coverage.py`). What Gold needs is a person: read the page
section by section, cut what is dull, and say what deserves more.

## The Play tab

- The port's check covers rounds 1 to 3 and round 100 from saved
  moments, with every item and scene driven by the items group's tests;
  rounds 4 to 99 are checked only through the round builder's tests and
  the round-skip sessions, not by play.
- Two players, the super mode and the boss fight were run in the port's
  tests, not by a person at the keyboard.
- The 1.7 % of passes that differ from the C64 are the actor interrupt's
  race (`play.html`, section 01); a port that yields between objects, with
  the cost of each, would land the interrupt closer to where it falls.
- For Platinum, the page needs a `test_play.js` beside it to hold the
  published page in CI (`kit/skills/core/70-minisite/play.md`, "The
  page's test"), and no bug known that stops a player finishing.

## Gold

- The page is ready for the steward's pass. The four sections added for
  it (Controls, Enemy movement, The sound, Discoveries) are agent-draft
  like the rest.
- The Enemies tab loads the whole port (340 KB) from `reference/bb-port.js`,
  as the Play tab inlines it; the two copies could be one.

## The listing

- The comments on tables and variables (767 of the 1,194) were sampled,
  not audited: about one in ten still has a wrong detail (`facts.md`,
  "The listing's comments, sampled"). The routine comments were all
  checked by a second agent.

## Not verified live

- The giant foods (actor state `$15`) are described from the code. They
  can be forced like the other special items (`cheats.md`) and then need
  the round cleared.
- No door was reached by playing to round 20 without losing a life; the
  secret room was entered by forcing its item.
- Rejoining with a credit, and anything else that needs a second stick.
- The boss fight was not played: the beaten state was forced.

## Open questions

- The space key: the C64-Wiki says it switches between one and two
  players; no test of that key was found (`features.md`).
- Characters `$40` and `$41` of the loaded character set.
- Which of the image's bytes are the cracker's beyond the three stubs at
  `$3FB0`-`$3FE5`. An original disk image would settle it.
- The instruments' fields are named from the driver's code and were not
  compared with a recording of the SID.

## Article ideas

- A player for the twelve tunes, with the driver ported to
  `lib/sid.js`: commands, pattern calls and the filter are all in
  `facts.md`. The title tune can be played from the listing even though
  the game loses it after the first round.
- A stepper for the bubble renderer over a real round, showing the nine
  glyphs an object takes each pass and the two buffers.
- The walker's chase rule as a playable diagram: one enemy, one player,
  a round from the browser.
- A Maps / levels tab with all 100 rounds on one sheet.
