# R-Type: Stage 3, The huge battleship (files G, H and I) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- The screen is a window on `battleship_map` (`$8E6C`, built into the map
  at `$9A00`, 130 bytes wide) moved in four directions by the game's
  `scroll_battleship` (`$3702`).
- Frame hook `$9586`: starts the second tune at column `$9Cxx`; the stage
  is won once the across script is past step 21 (`$3AD7` at least `$16`),
  no switch is pending and all fifteen sprite slots are empty.
- Attack script `$7FE2-$8051`: 55 pairs ending `$09 $00`, no boss entry;
  the battleship's parts are the boss (game, `boss3_parts`).
- Block list `$9585` is empty (`$FF`).
- Shapes `$80-$B9`.
