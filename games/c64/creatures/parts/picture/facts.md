# The picture — verified technical facts

Side A's `UNCLE CLYDE`, a program of its own that the game never loads:
a packed multicolour bitmap of Clyde pointing at the player under "CLYDE
NEEDS YOUR HELP!" (`reference/clyde-needs-your-help.png`). Unless marked
*live*, a fact comes from the code in `work/entry.vsf`, autostarted on
its own and stopped in its loop at `$3F96`.

- The file loads to `$0801-$1C8E`. Its BASIC line is SYS 2064, the
  unpacker at `$0810`, which unpacks the picture over memory and runs
  `picture_show` (`$3F40`).
- `picture_show` blanks the screen, silences the SID, turns the sprites
  off and makes the border black, then copies the picture's colours to
  colour RAM and its screen to `$0400`. `picture_on` (`$3F82`) shows the
  bitmap at `$2000` in multicolour on a light grey background, and
  `picture_hold` (`$3F96`) jumps to itself with interrupts off, so the
  picture stays until the machine is reset.
- No part of the game refers to the file: the engine's file names are
  two characters (engine `loading_setup`), and the title loads only
  `GAME`.
- *Live*: autostarted in VICE, 14 October 2026, the picture as in
  `reference/clyde-needs-your-help.png`.
