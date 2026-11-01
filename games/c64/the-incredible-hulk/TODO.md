# The Incredible Hulk — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage (21,750 bytes), `facts.md`, the listing sampled
and every step recorded in `accuracy`, the minisite built (How it works,
Discoveries, Rooms, Source code), every feature confirmed,
traced or open, copy `agent-draft`. The game has no music, so it needs
no tune player.

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

## For Gold

A human curates the pages section by section (`AGENTS.md`, "Definition of
done"): rewrites the copy where it reads as an agent's, cuts what is
dull, and adds what the agent missed.

## For Platinum

A Play tab that is the whole game: the parser, the action interpreter,
the conditions and commands, the room drawing and the save format ported
to JavaScript and held to the game's code in lockstep
(`kit/skills/core/70-minisite/play.md`). The parser and the pictures are
ported already.

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
- A map of the twenty rooms on the Maps tab, drawn from the exits table
  and the actions that move the player.
- The drive's half of the fast loader, track 35 sectors 0 and 1, listed
  once #661 says where it goes.
