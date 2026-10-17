# Bank 1 — verified technical facts

Bank 1 paged in at `$C000`: data only, read by `main`. Every address here
is bank 1's; one below `$C000` is `main`'s. Facts come from the code that
reads each table, in `work/entry.sna`.

## The ground

- `$C000`-`$CFFF` is the ground of the area loaded, 64 by 64 cells
  (`main` `$90DE`). It is unpacked from `$D000` when an area loads (`main`
  `$87CF`): four bytes for each area, the address of its packed ground and
  two offsets across and down; in the packed data a byte with bit 7 is a
  count for the byte after it. Areas 0 and 1 share their ground.
- A cell under `$72` is a height; `$72` to `$7E` are special ground, each
  with a routine (`main` `$9267`): `$72` the way out (area 5), `$74` where
  Clive falls (area 10), `$75` and `$76` where the rope is used (area 14),
  `$7A` and `$7B` swamp, `$7D` where the bottle is filled and `$7E`
  water.
- Area 15's word would be the first bytes of the packed data that follows
  the table, an address of `$00FF`; no route, record or object is in area
  15.

## Animations

- Which animation an actor plays is chosen by `$E2F2` from its action and
  animation state (`main` `$8FDA`); the byte two after (one after, played
  backwards) is its next state.
- Four lists of scripts (`$E412`, `$E442`, `$E454`, `$E4D0`) serve the
  actor classes. A script is a count of frames, three bytes and an event
  number for its end (`main` `$9052`), then four bytes a frame: the moves
  across, down and in height, signed, and the sprite frame shown, whose
  low nibble also steps the scrolling when the actor is the leader
  (`main` `$98FF`). The scripts at `$E628`, `$E650` and `$E784` to
  `$E79F` are in none of the lists.

## Sprites

- Jarret's (`$E960`), Dirk's (`$F537`), those of types `$14` to `$17`
  (`$F27A`, drawn in two pieces from `$F26A`) and of type `$2D` (`$FE18`):
  frame lists of six bytes, the width (3 for 16 pixels, 4 for 24), the
  rows, and the addresses of the picture and the mask (`main` `$A493`).
  Pictures that share blank rows overlap, and many frames share a mask.
- 136 bytes at `$FC46`, among Dirk's pictures, are named by no frame.
