# Bank 7 — verified technical facts

Bank 7 paged in at `$C000`: the second screen, and the areas' scenery.
Every address here is bank 7's; one below `$C000` is `main`'s. Facts come
from the code that reads each table, in `work/entry.sna`.

- `$C000`-`$DAFF` is the second screen. The view is copied into whichever
  screen is not shown, and the two swap at the interrupt (`main`
  `$9987`).
- `$DB00` holds a word for each area, the address of its scenery record
  (`main` `$8850`). Areas 0 and 1 share one; area 8's lies in `main` at
  `$6859`; the words for areas 12 and 15 (`$0005`, `$3501`) point into the
  ROM.
- A scenery record (`main` `$8A9B`): a count of boxes and their eight
  bytes each for bank 4's list at `$C000`, a count of records and their
  four bytes each for bank 3's at `$C000`, then the area's map of 64 by
  32 blocks, packed: `$FF` is followed by a count and the block to repeat,
  any other byte is one block. It is unpacked into bank 0 `$C000`-`$C7FF`.
