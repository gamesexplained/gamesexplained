# Qix — TODO

Tier: Silver (100 % coverage on the ledger, facts and features complete,
the minisite built with a player for all eleven tunes, verify done with
a sample checked by a second agent). Copy is `agent-draft`.

## For Gold

- A human pass over the page, section by section (`kit/style.md`).
- The 375 generated comments ("part of a table, referred to by a routine",
  "variable N of game_vars") are true but thin: describe the variables of
  `game_vars` ($1550-$15D2) and `music_vars` ($E009-$E071) one by one.
- The sample found 13 % of hand-written comments wrong in a detail; the
  six were fixed and the edge-walk names audited, but no second sample
  has been drawn since. Draw one before calling the listing measured.

## Open questions

- What the 500 points for trapping a Spritz are: no such constant was found.
- What `TITLE1` and `TITLE2` are (both loaded at `$7F00` during boot and
  overwritten by `ALIEN` before the game starts).
- Why the game loads `TAITO` between levels when nothing runs it.
- The purpose of the unreferenced bytes at `$B6A8` and `$C853`-`$C9FF`.
- Which tune is which in play (title is tune 10; the end-of-level tunes
  are shuffled): a name for each would help the music section.

## Ideas for the page

- A Qix you can watch: run the game's own `qix_step` on the page's 6502
  core, with the pull towards the marker shown as an arrow.
- The Sparx's edge walk, stepped on a small drawn field, showing the
  junction choice towards the Qix.
- The spiral death trap from the attract demonstration, replayed from
  `demo_spiral_dirs`/`demo_spiral_len`.
- A Play tab: the drawing, filling and claim rules are all known.
