# A View to a Kill — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Silver** (30 September 2026). All five programs at 100 % coverage
(`python3 kit/scripts/parts.py games/c64/a-view-to-a-kill`), every
feature confirmed, traced, differs or explicitly open (`features.md`),
facts verified (`facts.md` and each part's), the Overview and focused
tabs built. The copy is `agent-draft`.

## For Gold

- A human pass over every tab, section by section: rewrite, cut, expand,
  add what the agent missed. Set `copy` to what the pass did.
- A Play tab, which no tier requires: for example a Paris chase with the
  police following the player's route, or a City Hall floor to walk.
  Each section is a separate program, so a level select is the menu the
  game already has.

## Open

- Which tune is the Bond theme and which the title song, and the words
  of Paris's three speech samples: listening would settle both.
- What the mine's panel meter measures (`$3000`, mine).
- Whether the code prompts and end screens are the original's or the
  crackers'. An original disk, or another crack, compared byte for byte,
  would settle it.
- The mine's digit overflow (`$38AA`, mine) and hazard freeze
  (`$2BAB`, mine), and City Hall's `AND $03E9,Y` (`$95AD`) and
  over-full energy gauge (`use_energy`): traced, not tried.
- Paris: the stuck start seen once after holding fire, not reproduced.
- The review texts of Zzap!64, Commodore User and Your Commodore, which
  could not be read from the session; and the manual.

## Article ideas

- The chain of codes as a picture: which program shows which code, and
  which end test reads the flag.
- The police in Paris following the player's own turns, shown on the map.
