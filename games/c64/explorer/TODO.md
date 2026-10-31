# Explorer — TODO

Tier: **silver**. Coverage is 100 % and the listing has been sampled once.

## For an audit

- The listing's sample found 8 of 60 hand-written comments wrong (none of
  15 generated), over the mark of two, so an audit of every comment is
  recommended (`kit/skills/core/60-verify`), followed by a second sample.
  The kinds of error found: a detail of a direction or an order turned
  round (the shake's scroll), a table entry left out of a general claim
  (the stick table's entry 3), an exit left out (a blocked step also
  stops the walk), a routine named for the one it resembles (the doorway
  prompt for the destination prompt), a table given one use when
  mirrored drawing swaps it, and picture descriptions taken from a
  renderer that painted keep-colour cells white.

## For Gold

- A human pass over both pages' copy, section by section (`kit/style.md`).

## Open

- Who wrote the C64 version's 6502 code: the credits say Graham Relf,
  GameBase64 says Brian O'Shaughnessy.
- Whether the Spectrum release stores the doorway's energy change.

## Ideas

- A Play tab: the map, the ground view, the instruments and the doorways
  are all small routines, and three of them are already ported and
  tested. The ground view's scenery chain and `draw_image` would be the
  bulk of the port.
