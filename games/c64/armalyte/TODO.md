# Armalyte — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage over all eleven parts (`coverage.py`: 310,074 of
310,074 bytes), `facts.md` for the game and each part, every feature
confirmed, traced, live or differs, the listings and the How it works
page built, a player for each of the game's four tunes and each of the
music demo's eight, coverage and verify on a proven model, copy
`agent-draft`.

## For Gold

A human pass over the How it works page, section by section, with
`steward` set and `tier` at `silver-claimed` while it runs.

## Missing from the page

- **Sound effects.** 32 effects in fourteen tables (`sfx_tables`, engine
  `$F800`); a player for them would sit beside the music player in
  section 3.
- **The multiplexer.** Section 9 explains how 20 objects share six
  sprites but shows it only in words. The recorded frame has too few
  objects to show reuse; a frame recorded in a busy wave, with the
  sprite positions overlaid, would.
- **Play tab.** No port of the game.
- **The disk menu's second program**, "Loading picture", was not
  followed (`features.md`, Open questions). The third, "Walker's
  Warbles", is section 16.
- **How the menu loads its other two entries.** Neither is a file the
  directory can open, so `cyberdos` fetches them from tracks of its
  own; which tracks was not traced
  (`parts/warbles/facts.md`, "How it is reached").

## Checks the page leaves untested

- The level browser places script events at the screen's right edge;
  the game's scroll position runs a little ahead of it
  (`parts/engine/facts.md`, "The scroll and the map"). The difference
  is not drawn.
