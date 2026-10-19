# Zork I — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver, on 19 October 2026: 100 % of the 27,048 bytes the ledger tracks,
`facts.md`, one sample of 80 comments (7 wrong, all corrected), the
minisite built, copy `agent-draft`.

## Recommended

- **An audit of the whole listing.** The sample's rate, 8.75 % (4.1 %
  weighted by the strata), is over the mark of one in 30, and every wrong
  comment was hand-written. A fresh checker on a proven model should read
  all 330 hand-written comments ($0000-$2BFF) and correct them with
  `kit/scripts/accuracy.py` recording the audit (`kit/CHECKING.md`).

## For Gold

- A human pass over every section of the three pages, section by
  section, setting `copy` in `game.json` to what the pass was.

## Gaps

- The story's high memory, story $476C-$13FFF (routines from $4859 and
  strings from $E926), is read from the disk a page at a time and is in
  no snapshot whole, so the listing does not hold it and the coverage
  figure does not count it. The Discoveries page disassembles the one
  routine it needs (story $898C) from the story file.
- The meaning of the dictionary's data bytes for a word of two kinds is
  read from the words that carry them; the story's parser, which reads
  them, was not traced.
- Open in `features.md`: whether time passes only on a move, and which of
  the 1983 manual's parser features release 15 has.

## Ideas

- A Play tab would be a port of the whole Z-machine, the interpreter's
  routine by routine, with the story file as data: a page may carry game
  data, but a whole story file is the program, so ask a maintainer first.
- Zork II release 7 uses the same interpreter (`iver2` in a2zip), so most
  of this listing would map onto it.
