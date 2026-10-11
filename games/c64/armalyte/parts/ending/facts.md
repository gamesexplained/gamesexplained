# The ending — verified technical facts

File M on side 2. Addresses are the ending's, in `listing.json`;
routines named with an address above `$8800` are the engine's
(`parts/engine`). Unless marked *live*, a fact comes from the bytes of
`work/entry.vsf` (stopped at `$B3CC` just after the load) and
`work/start.vsf` (stopped at `$0801`).

## How it is reached

- Finishing level 8 adds one to the count of completed games (`$B02D`,
  at `$AE49` in `level_complete`, when the level number `$B002` is 7)
  and moves the level number on to 8, so the front end loads file M,
  ninth in the table of names at `$B3E1`. It arrives like a level,
  through the unpacker and the mover, into the same three ranges.
- `after_level_load` (`$B3CC`) shows "PRESS FIRE TO START" as for a
  level, and with `$B002` = 8 runs the ending at `$0801`
  (`ending_start`) instead of starting play.
- *Live*: reached from level 1 with `$B002` set to 7 and the program
  counter at `$AE42`, the game loaded file M and ran the ending
  (`orientation.md`, "The parts").

## What it does

- It takes the machine over: interrupts off, the stack at `$0112`,
  `$01` = `$35`, the screen and sprites off, zero page `$02-$FF`
  cleared. The engine does not run while it plays; only the engine's
  music driver is called (`$C059`, once a frame).
- A frame picture, yellow pipes and panels drawn as a multicolour
  bitmap, is moved up by `$1000` (`frame_move_up`, `$0859`) so that the
  bitmap sits at `$6000`, the message font at `$7800` and the frame's
  screen colours at `$7C00`. A second pass through the ending finds the
  move done (the destination's high byte stops at `$5F`) and skips it.
- The display is split by a raster interrupt of two stages
  (`ending_irq_stage`, `$09AF`): at line `$20` bitmap mode, and at line
  `$CA` text mode for the six rows of text, with each picture's three
  text colours (`message_colours`, `$0E7B`).
- Five pictures are shown in turn in a window of 20 by 12 cells
  (columns 10-29, rows 3-14). For each, `ending_show_picture`
  (`$097D`) fades the window to black, copies the picture's bitmap in,
  types its message one character a frame, fades the window up to
  white and then puts the picture's own colours in, which makes it
  appear (`picture_reveal`, `$0B01`). Each picture is 2,280 bytes:
  1,920 of bitmap, 240 of screen colours and 120 of colour-RAM colours
  packed two to a byte.
- A picture stays about fifteen seconds (`$08` = 3, three times 256
  frames), or until fire on joystick 2; RUN/STOP skips to the fifth
  (`ending_wait_input`, `$08D1`).
- The pictures play tune 2, the high-score page's (`ending_screen_on`,
  `$088C`). After the fifth, tune 0, the title's, is started again
  whenever it ends, until RUN/STOP is pressed (`ending_wait_runstop`,
  `$0923`).
- RUN/STOP then fades the music out, sets the level number to 0 and
  clears `$B004`, and enters the front end (`$B030`). The front end
  loads level 1 and, because `$B004` is clear, stops at "PRESS FIRE TO
  START" rather than the title: the game goes on with the score and
  lives it had. The title, which clears the count of completed games
  (`$B0D8`), is not visited, so every event's enemy speed below 3 is
  one higher for the next round (`level_script`, `$A970`).
- `$097B` is an `STA $06` that no path reaches: the code before it ends
  with `JMP $B030`, and the branch at `$08FE` goes past it.

## The pictures and messages

The messages are in the ending's own font (`$6800`, moved to `$7800`),
whose characters sit at their ASCII codes; `$11` starts a new row and
`$10` ends a message.

| Picture | Shows | Message |
|---|---|---|
| 0 (`$0F00`) | two ships flying right along a corridor of machinery | DELTA PROBE TO WOODWARD, / OUTER DEFENCES NEUTRALIZED, / RESISTANCE IS LIGHT ... |
| 1 (`$17E8`) | a space station with a ship in its window and an explosion at its lower right | APPROACHING DOCKING BAY 12, / H'SIFFAN RESISTANCE ANTICIPATED ... |
| 2 (`$20D0`) | a ship landed by a wall marked 12, and a figure running from it with a gun | DOCKING SUCCESSFUL, / NO H'SIFFAN RESISTANCE ENCOUNTERED, / THE COMPLEX IS DESERTED ... |
| 3 (`$29B8`) | a pilot's face in a blue helmet | CERBERUS NOW UNDER OUR CONTROL. / WOODWARD TO DELTA PROBE: / THANKYOU, TEN BILLION CYBER CREDITS / HAVE BEEN TRANSFERRED TO YOUR ACCOUNT. |
| 4 (`$32A0`) | the Armalyte logo over "Cyberdyne Systems" | CONGRATULATIONS, / DELTA II MISSION COMPLETE, / PREPARE FOR TEMPORAL SHIFT ! / (PRESS RUN/STOP TO CONTINUE YOUR GAME) |

*Live*: pictures 0 to 3, in the frame with their messages typed below,
were seen in turn in the emulator (`work/boot/c-end-*.png`, not
committed); picture 4 was drawn from its bytes.
