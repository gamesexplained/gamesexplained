# Granny's Garden — TODO

Tier: **Silver** (game.json). Coverage is 100 % in both parts
(`coverage.py games/bbc/grannys-garden`: 44,451 of 44,451 bytes).

## The listing: over the mark after the audit

The run's sample (seed 20261014) found 10 of 60 comments wrong in a
detail. Every comment was then audited, 189 of 189, and 42 were
corrected. A second sample (seed 2026101402) found 4 of 60 wrong, over the
mark of 2 in 60 (`kit/skills/core/60-verify`), and all four were comments
the audit had rewritten (`facts.md`, "The listing's error rate"). All
four were corrected. Next: a fresh check of the comments the audit
rewrote, or of every comment, then a third sample; the Source tab calls
the listing checked only when a sample after an audit is within the mark.

## For Gold

- A human pass over the How it works and Discoveries pages, section by section
  (`kit/style.md`), and `copy` and `tier` set from it (`AGENTS.md`,
  Definition of done).

## For Platinum

A Play tab that is the whole game: every routine ported to JavaScript
and run in lockstep with the game's own code, with `test_play.js`
beside the page (`kit/skills/core/70-minisite/play.md`), and no bug
known that stops a player finishing.

## Open

- Whether this is 4Mation's own disc. The teacher's booklet points to a
  copy of the tape (`orientation.md`, The image), but no disc of
  4Mation's was compared. Both files were saved after a run had turned the
  first line's relocation test into a REM, and Part 2 ends `&0D &81`.
  Comparing 4Mation's disc, or the tape, would say whether any copy 4Mation
  sold has the bug that stops Part 1 at &1900. Retro Granny's Garden for
  the Mac (4Mation) cannot settle it. On 16 October 2026 its program file
  turned out to be the BASIC rewritten in C++, with methods named after the
  procedures and, for routines the BASIC reached by number, after the line
  (`GOSUB3180`, `LINE2890`). All fifteen of those line numbers are lines of
  this disc's GRAN1 doing the same job, so 4Mation's program is numbered as
  this disc's is, but a port has no PAGE to run out of memory at.
- The lake asked for at the lake prints two messages over each other
  (parts/part-2/facts.md, traced); not seen live.

## Ideas

- A Play tab: the game is BASIC from end to end, so a faithful port is
  smaller work than for a machine-code game, and the page's teletext
  renderer and sound player already draw and play it.
- The tape release (£10 against the disc's £12, Acorn User, November 1983):
  whether it is the same two programs, and whether its relocation test is
  intact.
