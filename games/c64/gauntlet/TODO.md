# Gauntlet — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: coverage 100 %, `facts.md` with the listing's error rate, every
feature confirmed, traced, live or marked as differing, the minisite with
a player for all three tunes, coverage and verify on a proven model.

## For Gold

A person's pass over the page, section by section (`AGENTS.md`,
"Definition of done"); `copy` is `agent-draft` until then.

## Open work

- A full audit of the listing's 1,064 comments, then a second sample of 60
  with a new seed, checked by a model that wrote none of them: the first
  sample measured 13 % wrong (`facts.md`), and two partial audits have
  checked 72 comments between them.
- The Elf's and Wizard's play: only the Warrior and the Valkyrie were
  played live; their shots, colours and magic values are traced only.
- Whether the level jingle is a short form of the title music
  (`features.md`, the one row left traced).
- The monster colour routines compare cell_pos_x twice (monster_colour,
  monster_colour_wrapped): whether a vertically wrapping maze shows a
  wrong colour at its bottom edge was not tried.
- The selection and title programs (`spic`, `moded option`) are not
  analysed: the play program only.

## Article ideas

- A replay of a level's opening seconds: the generators filling the maze.
- A sound-effects player for the 18 effects in OBJDIS (`$F000`), with the
  voice 3 ending bug made audible.
- A widget for the idle timer: seconds without firing, and the maze
  changing.
