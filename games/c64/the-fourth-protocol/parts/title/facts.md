# The title and the episode menu: facts

Files `XXXTPAGE` (`$4000`-`$41FF`), `XXXTITLE` (`$6000`-`$7FFF`),
`XXXCOLMAP` (`$4C00`-`$4FFF`) and `XXXMUSIC` (`$C000`-`$CFFF`). The
episode loader calls `title_program` at `$4000`. Every fact names the
routine or table it comes from, in this part's listing.

## What it does

`title_program` (`$4000`) loads the other three files through the OS
(resident `load_file`), shows the picture from where it was loaded (VIC
bank 1, bitmap `$6000`, colours `$4C00`) while it copies it to the OS's
screen at `$2000` and `$0C00`, then switches back to bank 0, starts the
tune (`start_tune`) and waits for SPACE (`wait_for_space`, timed on CIA
1's time-of-day clock, called again every 20 of its seconds, 24 on a PAL
machine). SPACE stops the
interrupts and silences the sound chip, rubs out PRESS <SPACE> TO
CONTINUE (`$3E00`-`$3EFF`), and opens a window for the menu
(`episode_menu`, `$409F`). The answer is one character and RETURN
(resident `input_line`); 1, 2 or 3 is returned to the loader as 0, 1 or
2, and anything else prints the menu again.

## The picture

A hi-res bitmap of 320 by 200 (`title_bitmap`) with one colour pair per
cell (`title_colours`): FREDERICK FORSYTH in white, THE FOURTH PROTOCOL in
yellow, an emblem of a skull in a ring in grey, and PRESS <SPACE> TO
CONTINUE in red on the bottom row.

## The tune

David Dunn's tune, played once a frame from the raster interrupt at line
252 (`title_irq`, `$413F`) by `tune_play` (`$CCF5`):

- The tune is a stream of command bytes from `$C389` (`tune_stream`).
  Each command byte is the low byte of its routine in page `$CD`, and the
  player jumps there by writing it into a `JMP $CDxx` (`tune_dispatch`).
- The commands: `$0E`, `$17`, `$20` set one voice's frequency and start
  its note; `$29` and `$38` two and three voices at once; `$53` ends the
  step; `$5B` the six envelope bytes; `$8D` the three pulse widths;
  `$CB` the step's length; `$D4` the three waveforms; `$E9` the filter;
  `$82` back to the start; `$4D` and `$B4`, which this tune does not use,
  count and stop.
- Every step is 17 frames (`tune_step_length`); the gate goes off three
  frames before its end. Voice 2 switches between its note and the note
  plus `$30` every fifth frame, and voice 3 between its note and the note
  plus `$40` every sixth (`tune_effects`).
- The stream is 438 steps, 7,446 frames: 2 minutes 29 seconds on a PAL
  machine, and then it starts again.
- The first 905 and the last 216 bytes of `XXXMUSIC` are not read, and
  two routines (`$CDC1` and `$CE96`) would hook the player to the
  KERNAL's interrupt vector; nothing calls them.
