# Armalyte — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver: 100 % coverage over all ten parts (`coverage.py`: 293,145 of
293,145 bytes), `facts.md` for the game and each part, every feature
confirmed, traced, live or differs, the listings and the How it works
page built, coverage and verify on a proven model, copy `agent-draft`.

## For Gold

A human pass over the How it works page, section by section, with
`steward` set and `tier` at `silver-claimed` while it runs.

## Missing from the page

- **Music.** The page has no tune player. The driver (`music_play`,
  engine `$C059`; four tunes from `tune_headers`, `$C765`) is annotated
  but not ported to `site/lib/sid.js`, so the title, demo, high-score
  and loading tunes cannot be heard. This is the biggest gap: the music
  is Martin Walker's and the manual names it.
- **Sound effects.** 32 effects in fourteen tables (`sfx_tables`, engine
  `$F800`); a player for them would sit beside the music.
- **The multiplexer.** Section 8 explains how 20 objects share six
  sprites but shows it only in words. The recorded frame has too few
  objects to show reuse; a frame recorded in a busy wave, with the
  sprite positions overlaid, would.
- **Play tab.** No port of the game.
- **The disk menu's other two programs**, "Loading picture" and
  "Walker's Warbles", were not followed (`features.md`, Open
  questions).

## Checks the page leaves untested

- The level browser places script events at the screen's right edge;
  the game's scroll position runs a little ahead of it
  (`parts/engine/facts.md`, "The scroll and the map"). The difference
  is not drawn.
