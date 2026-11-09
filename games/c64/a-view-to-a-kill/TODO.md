# A View to a Kill — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Gold** (8 November 2026). Next: a Play tab, for Platinum. Steward
unorig went through every tab, page by page, with the agent; `copy` is
`human-edited`. Silver since 30 September 2026 (the original disk from
8 October 2026): all five programs at 100 % coverage
(`python3 kit/scripts/parts.py games/c64/a-view-to-a-kill`).

## For Platinum

- A Play tab: for example a Paris chase with the police following the
  player's route, or a City Hall floor to walk. Each section is a
  separate program, so a level select is the menu the game already has.

## Listing

- The mine's listing calls object 50 "the key item" and the rock-clearing
  object (type 16) "detonator"; the pages use the names from the
  steward's notes (detonator and lighter). Rename the symbols and
  comments to match, then rebuild the mine's listing.

## Open

- What the mine's panel meter measures (`$3000`, mine).
- The mine's long digit overflow (the 14th digit on the pause flag, the
  46th on the code flag, `$38AA`, mine) and City Hall's `AND $03E9,Y`
  (`$95AD`): traced, not tried. A sixth digit and the helmet count were
  tried in VICE (About, notes 13 to 15).
- The mine walkthrough's walks after the plank are planned with a movement
  model, not played; play them in VICE and replace the plan with the
  recording (the tools are described in `agent-history.md`).
- Why Paris's map ovals do not sit on May Day's landing points.
- Which release the cracked copy came from: its credits, Paris damage
  limit, music tempo, City Hall gauge and mine pace all differ from this
  disk.
- The review texts of Zzap!64, Commodore User and Your Commodore, which
  could not be read from the session; and the manual.

## Article ideas

- The chain of codes as a picture: which program shows which code, and
  which end test reads the flag.
- The police in Paris following the player's own turns, shown on the map.
