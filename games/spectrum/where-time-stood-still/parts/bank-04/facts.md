# Bank 4 — verified technical facts

Bank 4 paged in at `$C000`: data only, read by `main`. Every address here
is bank 4's; one below `$C000` is `main`'s. Facts come from the code that
reads each table, in `work/entry.sna`.

- `$C000` is the area's list of scenery pieces, eight bytes each: shape,
  first and last column, first and last row, and where it stands across,
  down and how high. It is filled when an area loads, from bank 7's
  record and from the scenery objects placed in the area (`main` `$8A9B`,
  `$8879`), and read to hide the parts of sprites that stand behind
  scenery (`main` `$A879`, `$A8F3`).
- `$CD40` holds 1,319 characters of eight bytes, the pictures the map's
  blocks are drawn with (`main` `$9C4D`): a block's character numbers are
  added to the base that bank 0's table at `$E840` gives for its
  definition (`$E864` for a block numbered over the area's split,
  `main` `$9C10`).
- The shapes of the scenery: 85 words at `$FE28` point to shape records,
  most in this bank from `$FED2` and the rest in `main` (`$69B4`-`$6FED`,
  `$7B68`). A record is four times the shape's width in blocks, then its
  blocks row by row; a block (`$C2C0`, 168 of them) is four rows of four
  mask characters (`$F678`, 246 of them), 0 for none.
