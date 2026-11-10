# R-Type: Stage 1, The encounter (files A, B and C) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- Frame hook `$940A`: while the scroll runs one star character twinkles
  a frame; with the scroll stopped at the boss six stars creep across
  their characters a pixel at a time.
- Attack script `$8382`, the first entry at column `$3B`; after a death
  in the second half play restarts from `$8426`; the last entry starts
  the boss.
- Boss: `boss1_routine` `$8528`, 20 hit points (`$7AD0`), 17 outline rows
  and 7 sprite rows; its tail moves and the outline's rows 9-16 follow it.
- File 3 holds a second character set at `$E000-$E7FF`: characters
  `$00-$AE` are the stage's own set drawn upside down, the rest the same
  as `$C000`. `irq_band2_y` (game) selects it for the lower band through
  `$64 = $38`, so the cave's floor is its ceiling turned over.
- Enemy shapes `$E800-$F97F` (sprite pointers `$A0-$E5`), the boss's
  shapes `$F980-$FD3F` (`$E6-$F4`).
