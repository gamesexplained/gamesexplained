# Wizball — TODO

Tier: Silver (100 % of 60,134 tracked bytes explained; facts, features,
listing and minisite built; copy `agent-draft`).

## For Gold

A human pass over the How it works page, section by section: cut what is
dull, expand what is interesting, rewrite the clichés, add what the agent
missed. Set `steward` and `tier: silver-claimed` when the pass begins, and
record the outcome in `copy`.

## Open questions

- What the twelve bytes the initialisation copies to `$001D` are for;
  nothing traced calls them.
- The 16 bytes at `$0B32`-`$0B41`, the frame list at `$3C47` and sprite
  blocks `$4A`, `$4B`, `$63`, `$64` and `$7F`: nothing found refers to them.
- The one pixel on line 239 where the rebuilt frame differs from the
  emulator's (section 01).
- Whether the pipe copy's one-byte offset (`$831D`) shows in the tube
  sequence, and whether the finished level scrolls past in colour.
- Which of the special droplets the thresholds (`$A763`) make most often in
  a real game.

## Ideas for the page

- A Play tab: the Wizball's movement is ported and checked; the aliens'
  movement modes, the scenery bounce and the landscape scroll would make a
  playable level 1.
- A stepper for the watchdog: one frame of `$85` through the NMI, the
  bands and the check.
- The sound effects: the 26 records at `$3C5F` in a player of their own.
