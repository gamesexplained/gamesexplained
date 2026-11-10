# R-Type: Stage 6, The transport system (files P, Q and R) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- No boss. Once the map stops, the frame hook keeps the scroll column
  moving, one step every 16 frames, so the script's last entries send
  wave after wave; the stage is won when the column reaches `$9C00`.
- Frame hook `$9286` (`stage6_frame`): rotates the strips of characters
  `$80-$8F` one bit left every third frame; starts the second tune at
  column `$9B46`.
- Attack script `$8087-$82CE`, 292 pairs from column `$28`; the last
  pair is never reached.
- Shapes `$80-$93`.
