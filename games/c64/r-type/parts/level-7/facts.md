# R-Type: Stage 7, A destroyed city (files S, T and U) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- No boss. As in stage 6 the column keeps moving after the map stops,
  one step every 16 frames, and the stage is won at `$9C96`.
- Frame hook `$93B6` (`stage7_frame`): rotates the strips `$B4-$BF`
  every third frame and animates characters `$A8-$B3` through four
  frames (`$949C`); the second tune starts at column `$9B31`.
- Attack script `$8290-$867D`, 503 pairs.
- Shapes `$80-$C3`.
