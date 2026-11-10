# Bruce Lee — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Bronze. The model that ran it, claude-sonnet-5-5, is not in `kit/models.json`, so the game stays Bronze until a maintainer has sampled its listing on a proven model (`kit/CHECKING.md`), even after full coverage.

## Missing for Silver

- Coverage is 3.9 % (791 of 20,234 tracked bytes). The code, `$0400`-`$4xxx`, `$E000`-`$F1xx` (sound) and the data tables are mostly unnamed: 152 routines still carry the disassembler's own names.
- The game's levels: where the twenty chambers' data is, and how the doors, lanterns, mines and moving walls work.
- Which bytes the two Remember trainer options change, compared with the original release.
- `facts.md`, the verification sample, a Maps tab, a Graphics tab, a Music tab, a Discoveries tab.
