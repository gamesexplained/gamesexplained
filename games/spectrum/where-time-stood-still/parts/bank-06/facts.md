# Bank 6 — verified technical facts

Bank 6 paged in at `$C000`: data only, read by `main`. Every address here
is bank 6's; one below `$C000` is `main`'s. Facts come from the code that
reads each table, in `work/entry.sna`.

## Sprites

- Gloria's frames (`$C000`), and those of five classes of creature: types
  `$10` to `$13` (`$DF88`), `$18` to `$1B` (`$E34F`, drawn in two pieces
  from `$E2EF`), `$1C` to `$1F` (`$F5FB`), types 4 to `$0F`, the tribe
  among them (`$F866`), and `$20` to `$27` (`$FC5B`). A frame is six bytes:
  the width (3 for 16 pixels, 4 for 24), the rows, and the addresses of
  the picture and the mask (`main` `$A493`).
- The objects' pictures: the menus' pointer (`$F197`) and seventeen
  objects (`$F1B1`), used both by menu 2's icons (bank 3 `$CF42`) and as
  sprites on the ground (bank 3 `$F6D6`). The jewel's frame is rewritten
  each pass with one of three pictures (`$F25B`, bank 3 `$FAFF`), so it
  glints.
- Several frame lists borrow their masks from bytes that are something
  else: four of Gloria's frames use the start of the area object table,
  and eight objects use the frame list at `$F5FB`.
- 58 bytes at `$C16E` and 22 at `$F4A9` are named by no frame, and nothing
  reaches `$FEFA`-`$FFFF`.

## Scenery objects

- `$C76A` has a word for each area, the address of its list of scenery
  objects (`main` `$87CF`): a count, then for each its place in the map
  (column and row), an optional height (a byte with bit 7) and its type.
  None of them is an object the party can carry.
- A type's shape (`$D482`, 128 words) lists boxes for bank 4's scenery
  pieces (from `$DDD4`, eight bytes each), records for bank 3's area boxes
  (from `$DF24`, four bytes each) and a piece of map: the area whose block
  numbers it is drawn in, its width and height in blocks, and the blocks.
  The piece is stamped into the area's map at the object's place, cells
  of 0 left alone, its blocks translated when they are another area's
  (`main` `$899B`, `$8B31`).
- 28 bytes at `$D582` are laid out as a shape that no word names.
