# R-Type: Stage 2, The living cave (files D, E and F) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- Frame hook `$943B` (`stage2_frame`): every third frame rotates the
  strips of characters `$B4-$BF` one bit right so the walls crawl; at
  column `$9B4A` switches the play area to the second set at `$E000`
  (`$64 = $38`).
- The boss is part of the map: an eye at screen cells `$CD79-$CD7C` that
  takes 8 hits (`$95DA`), run by `stage2_frame`, not by `start_boss`; the
  boss record's routine is zero.
- Attack script `$84B5`, from column `$29`, no boss entry; restart entry
  `$85A9`.
- Shapes `$E800-$F9FF` (`$A0-$E7`); a second character set `$E000`.
