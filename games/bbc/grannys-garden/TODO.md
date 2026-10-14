# Granny's Garden — TODO

Tier: **Silver** (game.json). Coverage is 100 % in both parts
(`coverage.py games/bbc/grannys-garden`: 44,451 of 44,451 bytes).

## The listing: an audit is recommended

The run's sample (seed 20261014) drew 60 of the 189 comments, from both
parts, and a checker found 10 of them wrong in a detail: 17 %, a 95 %
interval of about 9 % to 28 %. That is over the mark of 2 in 60
(`kit/skills/core/60-verify`). All ten were corrected, with the other
comments that said the same, but a sample this far over the mark says
more are wrong than it found. The next step is a full audit of every
comment by fresh checkers, then a second sample, as `60-verify` says; the
Source tab calls the listing checked only after that.

## For Gold

- A human pass over the How it works page, section by section
  (`kit/style.md`), and `copy` and `tier` set from it (`AGENTS.md`,
  Definition of done).

## For Platinum

- Rebuild each part from its `listing.json` as a tokenised BBC BASIC file
  and compare it byte for byte with `GRAN1` and `GRAN2`, then boot the
  rebuilt disc.

## Open

- The teacher's booklet (features.md): not part of the program, and not
  found online.
- Whether this is 4Mation's own disc. Both files were saved after a run
  had turned the first line's relocation test into a REM, and Part 2 ends
  `&0D &81`. Comparing another copy of the disc, or the tape, would say
  whether every copy has the bug that stops Part 1 at &1900.
- The lake asked for at the lake prints two messages over each other
  (parts/part-2/facts.md, traced); not seen live.

## Ideas

- A Play tab: the game is BASIC from end to end, so a faithful port is
  smaller work than for a machine-code game, and the page's teletext
  renderer and sound player already draw and play it.
- The tape release (£10 against the disc's £12, Acorn User, November 1983):
  whether it is the same two programs, and whether its relocation test is
  intact.
