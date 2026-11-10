# R-Type: Stage 4, Fortress at the front (files J, K and L) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- Frame hook `$918D`: six stars in characters `$B3-$C0`, each at its own
  speed (`$91D5`, initial values `$91E1`).
- Boss: `boss4_routine` `$845C`, three parts that live and die apart
  (upper left, upper right, lower), firing from `boss4_fire_a` `$84A8`
  and `boss4_fire_b` `$8503`, moved by `boss4_move` `$91F4` through a
  19-step script at `$94C4`. A destroyed part explodes and goes blank.
- Attack script `$8298`, 152 pairs, the first at column `$2D`, restart
  `$8342`, the last at column `$87` starts the boss.
- Shapes `$80-$BD`, the boss `$AC-$BD`.
