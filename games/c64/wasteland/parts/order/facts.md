# Party order — verified technical facts

The program behind the game's Order command, which puts the members of
a party in a new order. The game reads it from T34/L15, one page, to
`$CA00` and jumps there (game `$BF46-$BF5C`); it ends with the game's
screen redraw and returns to the game's menu.

## Load

- The Order command returns at once for a party of one, then asks
  "Order (Y/N)?" (game message 106); N or back-arrow redraws the screen
  and ends it (game `$BF33-$BF44`, `$B90D`).
- Y sets `$0505` to `$FF`, since the program lands in the `$CA00`
  picture buffer, and reads one page from T34/L15 with the engine's
  `read_pages`, which checks no side (game `$BF46-$BF5C`, engine
  `$284A`). T34/L15 is the same on all 24 disk images of the run, all
  four sides among them, so Order works with any side in the drive.
- The page begins `JMP $CA06` and a header, `$CA00` and one page, that
  this route never reads (`$CA00-$CA05`).
- `$CAA2-$CAFF`, after the program's last instruction, the `RTS` at
  `$CAA1`, is bytes `$A2-$FF` of the game's first sector as stored, side
  1's T31/L9; nothing reads or runs it.

## The program

- It copies bytes 0-7 of the party table at `$68/$69` to `$80-$87` and
  zeroes them, then draws the roster with the party size `$07` set to 0,
  which clears every member line (`$CA06-$CA22`). It works on whatever
  table `$68/$69` points at and does not set it.
- Each round prints "Pick a player:" (game message 15) and the members
  not yet placed, each under its old number, and waits for a number from
  1 to `$07` (`$CA24-$CA2C`, `$CA77-$CAA1`). A member already placed is
  ignored (`$CA35`); any other goes to the next position, and that
  roster line is drawn (`$CA37-$CA46`).
- When one member is left it goes to the last position by itself
  (`$CA49-$CA5D`). Then the game's screen redraw and the roster
  (`$CA5F-$CA62`).
- Back-arrow before the first pick puts the eight bytes back and leaves
  through the game's screen redraw alone, as N does, so the roster stays
  hidden (`$CA65-$CA74`, game `$AC8C`, `$AEF0`). After a pick back-arrow
  is ignored: an order once begun must be finished.
- Run on the 6502 simulator with the picks fed in: a party of four
  picked 3, 1, 4 becomes the old members 3, 1, 4, 2; picking a placed
  member again changes nothing; a back-arrow after a pick is ignored; a
  party of seven picked 7 down to 2 is reversed.
- Byte 0 of the table is zeroed with the others and put back only on a
  cancel (`$CA06-$CA12`, `$CA6A-$CA72`); it is 0 in every snapshot taken
  in play.
