# The Incredible Hulk — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Platinum: the Silver (100 % coverage of 21,750 bytes, `facts.md`, the
listing sampled and every step recorded in `accuracy`, every feature
confirmed, traced or open, copy `agent-draft`; the game has no music, so
it needs no tune player) with a Play tab that is the whole game: the
interpreter, the screen editor, the pictures, the disk and the saved
games ported to JavaScript and held to the game's code by
`test_play.js`, with no known bug in the port. The Maps tab's map is held
to the game's code by `test_map.js`.

## Audit the listing

The one sample found 6 of 80 comments wrong (6 of the 60 written by
hand, none of the 20 generated from the database; about 5 % weighted, a
lower bound), and all six were corrected with every comment that said
the same. That is over the mark of one in 30. A full audit of the 871
hand-written comments by fresh checkers, given the kinds of error the
sample found (a variable's meaning taken from its first use, a detail of
which case a routine covers, an end address off by one), then a new
sample, would let the Source tab call the listing checked
(`kit/skills/core/60-verify`).

## For Gold, and so Diamond

A human curates the pages section by section (`AGENTS.md`, "Definition of
done"): rewrites the copy where it reads as an agent's, cuts what is
dull, and adds what the agent missed. With the Play tab Platinum, that
makes the game Diamond.

## Hand edits for the disassembler project

The comments corrected for the Play tab were edited in `symbols.json` by
hand (`listing.py --recomment`): $56A6, $1F14, $74B5, $61A1, and the
action comments at $944A, $9510 and $9516. The project needs them before
its next export, or the export puts the old text back.

## Open questions

No source found on the web on 31 October 2026 answers these.

- Who published the 1986 disk in the C64 Preservation Project's
  collection (`[gvp_1986]`), which adds a menu program and has save
  areas A to C only.
- What picture 80 was meant to be: command 89 shows it, no action uses
  the command, and there is no file `R01080` on the disk.
- What the three header bytes at `$807F`-`$8081` were for: nothing in
  the program reads them.

## Ideas

- A player for the page-end beep on the How it works tab's sound
  section, through `site/lib/sid.js`.
- The drive's half of the fast loader, track 35 sectors 0 and 1, listed
  once #661 says where it goes.
