# The engine — verified technical facts

The code and the status panel that stay in memory through every level.
Every address here is this part's. Unless marked *live*, a fact comes
from the code in `work/entry.vsf`, stopped on `MachineSetup` (`$0E00`)
after the trainer's F7.

- `MachineSetup` (`$0E00`) runs once, the first time a load reaches it
  through the vector at `$3FF6`: it maps RAM with the I/O (`$01` = `$35`),
  stops the interrupts and timers, silences the SID, clears page 2, the
  first sprite buffer (`$0C00-$0DFF`; the second, `$0E00-$0FFF`, is where
  it runs) and the zero page from `$02`, tells PAL from NTSC by waiting for a
  raster interrupt at line 304 (`$AB`), points both NMI vectors at the
  `RTI` at `$1582` (so RESTORE does nothing) and sets up the state the
  first level starts from (`$0EAF`): four lives, the lock code 1111, score
  and clock at zero, level digit 1. From the first level load on, its
  bytes are overwritten by the copies of page 2 and page 3 that
  `CoordinateLevelLoad` keeps at `$0E00` and `$0F00`.
- `CoordinateLevelLoad` (`$16AD`) keeps pages 0 to 3 at `$0C00-$0FFF`
  during a load and puts them back after, stores the level's digit into
  the file name `0n*` (`$117D`), asks for side two before level 3
  (`HandleDiskSidePrompt`, `$172B`: INSERT SIDE TWO, PRESS SPACE) and
  calls the loader.
- `LoadAndExpandLevelFile` (`$1000`) unpacks a level file backwards from
  its end: an eight-byte header gives the top and bottom of the segment
  and the last three of the 16 offset widths (`offset_bit_widths`,
  `$17E6-$17F5`); literal runs come straight from the disk, matches from
  bytes already written. It changes the border colour as it reads. The
  first segment ends with the title card drawn (the loader calls `$4E00`
  at `$1108`) and the tune started (`$4000`); the loader then plays it
  once a frame until Space or fire on either port is pressed
  (`$1113-$112D`), turns the volume down and unpacks the level, and the
  coordinator goes on through `$3FF3`.
- `RenderInlineTextRecord` (`$1583`): the column, the row, two colour
  bytes and glyph codes follow the `JSR`, up to a zero; each code is
  masked to six bits and its eight rows copied from `$1AE8` plus eight
  times the code into the bitmap. Rows of the screen and of the bitmap are
  looked up in `$1631` (`$0400` + 40 × row) and `$1663` (`$2000` + 320 ×
  row). The 41 glyphs are a space, A to Z, 0 to 9, two unused and the two
  halves of the copyright sign.
- Score: six digits as glyph codes in the text record at `$1C9C`, added
  to by `AddPackedScoreAtDigitX` (`$1189`) with decimal carries, and drawn
  when `$0292` is set. The clock: three text records from `$1C73`, hours,
  minutes and seconds; the interrupt adds a second every 50 frames and
  carries at the limits in `$1D45`.
- `GameplayIrqDispatcher` (`$1E15`) answers both interrupts: CIA 1's
  timer counts the tick (`$E2`, `$F0`, `$B0`) and the pause stops it; the
  raster interrupt sets the sprites (`CommitGameplaySpritesToVic`,
  `$1DAD`, or the status panel's raster-timed ones, `$1CA8`), restarts the
  tune when `$3FF9` asks, plays it through `$4003` (five frames in six on
  NTSC), moves each energy spiral a half-cell toward its value
  (`$1E67-$1EC0`) and keeps the clock.
- The two energy spirals: 44 half-cells each, the enemy's in columns 2 to
  6 and the player's in columns 8 to 12 of rows 19 to 23, the cells in
  order at `$1D4B` and `$1D78` as offsets from `$06FA`; the first 22 are
  coloured once and the next 22 a second time with a brighter colour in
  the other nibble.
- Two mirror tables: `$1200-$12FF` reverses the four pixel pairs of a
  byte and `$1300-$13FF` its eight bits, for drawing scenes and sprites
  facing the other way.
- Left over, called by nothing: a copy of the colour-copy routine at
  `$0F0E` (named only by a `BIT` at `$0F07`, where a `JSR` would call it,
  and by the routine at `$FFE8`), that routine, which nothing calls, a
  `JMP $16AD` at `$1180`, and 60 bytes at `$FFA9` that match the KERNAL's
  keyboard table in all but six places.

## Live tests

- The mirror tables: all 256 entries of each match the formulas above.
- The row tables: all 25 entries of each match `$0400` + 40 × row and
  `$2000` + 320 × row.
