# Death — verified technical facts

The death screen, the end of the game: one page from side 1, T4/L2,
which the game loads to `$7E00`, over its own first page, when no
character is left alive (game `$7ED5-$7F09`). It shows the Grim Reaper
and stays there; it returns to nothing.

## Load

- On every pass of its main loop the game tests the character records 1
  to `$0A`. One that is conscious, or unconscious (condition UNC) with
  the disease byte `+$28` at 0, keeps the game going; so an unconscious
  member with a disease counts as lost. When no record qualifies, or
  `$0A` is 0, the game waits for side 1 and loads T4/L2 with
  `load_program` (game `$7ED5-$7F09`).
- The page begins `JMP $7E06` and the header `$7E00`, one page
  (`$7E00-$7E05`). Side 1 of every disk image holds it at T4/L2; the
  other sides hold other bytes there. The start-up's own load carries the
  same sector at startup `$8C00`.
- `$7E65-$7EFF`, after the text, are bytes `$65-$FF` of T4/L1, the first
  page of the logo font that the start-up reads to `$CA00` (startup
  `$7FA4`); nothing reads them.

## The screen

- It copies the 12 bytes "Grim Reaper " to the picture caption `$F4D0`
  and shows picture `$3B` from the buffer at `$E000` (`$7E06-$7E15`).
  The picture is stored on side 1 only (T35/L10 entry 59, `27 2F 05
  01`), the side the game has just asked for.
- The copy stops before the caption text's zero (`$7E3B`), so the
  caption ends at the zero in `$F4DC`. That byte is 0 in the saved
  state on every disk image, masters included, and in both death
  snapshots, and no copy into the caption in any part writes past
  `$F4DB` (the game, the radio, the start-up and modules 0-4).
- It draws the roster, opens the text window and prints "Your life has
  ended in The Wasteland..." (`$7E18-$7E26`).
- Then it reads keys for ever and drops them (`$7E29-$7E2C`). The
  engine's key wait runs one tick of the picture's animation on every
  poll (engine `$2534`), and picture `$3B` has four animation scripts
  (header words `$E006-$E00D` in `play-death.vsf`, all four channels on
  at `$5BFB-$5BFE`), so the picture keeps moving (traced). Only a reset
  leaves the screen.
- It writes nothing to disk and makes no sound: its only calls are the
  engine's show_picture_e000, roster_show, text_window_open,
  print_string_wrapped and wait_key (`$7E15-$7E29`). The last save
  stays as it was.
