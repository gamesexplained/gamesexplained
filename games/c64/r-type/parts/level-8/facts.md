# R-Type: Stage 8, The heart of the Bydo empire (files V, W and X) — facts

Every stage part has the same three files' layout: file 1 at `$6370`
holds the music driver (`$6370-$6D3F`, the same code in every stage), the
stage's music data (`$6D40`), the boss record (`$7AC0`), the enemy types
(`$7AD6-$7E39`) and the attack script; file 2 at `$86AC` holds the
stage's characters (`$86AC`), colours (`$8CAC`), background flags
(`$8D6C`), block tables (`$8E6C`/`$8ECF`) and blocks, the block list, and
the stage's own code; file 3 at `$E000` holds the sprite shapes. The
resident code that reads them is in the game part (`../../facts.md`).

Traced from this part's snapshot (`work/play.vsf`), unless marked *live*.

- No frame hook (`$17FA`, the game's RTS).
- Boss: `boss8_routine` `$814C`, 211 hit points; it comes in with the
  scenery, opens a hatch (`boss8_hatch` `$81F8`) to show its core
  (`boss8_core` `$81C1`, shapes `$BC-$C9`, the weak row 7 open and `$64`,
  out of reach, shut) and throws a three-by-three block of characters
  `$AA-$B2` along rows 8-10 (`boss8_throw` `$8270`). The boss's outline
  and widths tables overlap (`$80BE-$80CC`, `$80CD-$80DB`).
- Leftovers: `$832F-$867D` is an exact copy of stage 7's script bytes, and
  `$9086-$961B` of the tail of stage 7's file 2, compared byte for byte
  with files S and T.
- Attack script `$7F30`, 199 pairs, the last at column `$F0` starts the
  boss.
- Shapes `$80-$C9`.
