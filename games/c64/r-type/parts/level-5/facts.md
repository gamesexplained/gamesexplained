# R-Type: Stage 5, The nest (files M, N and O) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- No frame hook: the table names the game's RTS at `$17FA`; file 2 ends
  with the block list at `$90A8`.
- Boss: `boss5_routine` `$82F8`, twenty identical blobs (shapes `$B2`
  and `$B3`), four rows of five sprites that drift together (`$8330`
  across, `$83C4` up and down) and flicker (`$8414`), 211 hit points.
- Attack script `$80EE`, 187 pairs, the first at column `$28`, restart
  `$8200`, the last at column `$7D` starts the boss.
- Shapes `$80-$B3`.
