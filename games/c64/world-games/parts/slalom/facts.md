# Slalom: facts

Files `I` (packed, unpacked at `$1000`) and `J` (loaded at `$A000` and
copied by the shell to `$E000`-`$FEFF`), both on side 1; the travelogue
sets it at Chamonix, France. The entry is at `$8000`. Every fact names
the routine or table it comes from, in this part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$3CAF` | the course, 176 rows of 65 characters (`sl_course`) |
| `$3FA7`-`$3FFA` | stubs nothing runs, and the interrupt's entry at `$3FCC` |
| `$4000`-`$47FF` | the character set: snow, scenery, flags, banner and the status rows' letters |
| `$4800`-`$4FFF` | the two screens the course is drawn into in turn |
| `$5000`-`$7CFF` | the sprite shapes: skiing, the bending flag, the stops; `$7000`-`$7CFF` swapped with `$E000` |
| `$8000`-`$8F65` | the code: the runs, the interrupts, the stick, the drawing |
| `$9000`-`$BCAF` | the course's colours, a byte for each character |
| `$BE80`-`$C59F` | more code: the finish banner's split, the flags' placing, the order of sections |
| `$C600`-`$CC85` | the sprite frames, 67 of them (`sl_frame_records`) |
| `$E000`-`$ECFF` | the falls' shapes, swapped into `$7000` once the skier is away |
| `$ED00`-`$EFFF` | the course's edges and the gates' flags |
| `$F000`-`$F0BF` | the music's frequency table, built at the start (`sl_freqs`) |
| `$F100`-`$FEFF` | the stick, the timer, the results, the gates and flags, the music driver (`$F5E2`) and its tracks |

## The course

- The course has seven sections of 25 rows, from rows 0 (the start),
  25, 50, 75, 100, 125 and 150 (the finish) (`sl_course`, `$1000`). A
  run takes twenty sections in the order at `$C543`: 0, 25, 75, 100, 125,
  75, 50, 25, 125, 75, 100, 75, 125, 50, 25, 75, 125, 100, 50, 150.
- 65 columns wrap round: the course is drawn 21 rows at a time, 65
  columns round (`sl_draw_view`, `$8795`).
- 39 gates, 78 flags, at `$EF00` and `$EF80`, placed by the 8-bit row
  counter (`$62`): 20 gates in the first 256 rows, 19 in the next. The
  flags are written into the map as each section comes (`$C42D`) and
  cleared as rows leave the top (`$C4EB`). The flags are blue, blue,
  red, red, a gate's colour at a time.

## Skiing

- The top speed depends on the stance and the turn: skiing straight,
  1.125 pixels a frame with the stick up, 1.875 with neither, 2.125
  with fire held; in a turn of 3 with fire held 1.875, out of line with
  the speeds either side of it. Acceleration is `$0340`/65536 of a
  pixel a frame, and a speed over the top is slowed by 1 to 6 256ths a
  frame.
- Turning: the stick held left or right for so many frames a step
  (`sl_turn_frames`, `$8714`, by stance and speed); the turn stays when
  the stick is let go. Fire held turns fastest, stick up slowest.
- The faster the skier goes, the lower on the screen the skier is drawn,
  8 lines for each pixel a frame.

## Gates, flags and falls

- A gate is missed when, at its right flag's row, the skier is on the
  same side of both flags (`sl_gate_check`, `$F2E5`): "MISSED", tune
  14, 5 seconds added and the count shown at row 2.
- A flag in the skier's column is a head-on hit: a fall when the frame
  counter, `$70`, is below 100, so 100 frames in 256; otherwise the flag
  bends. One column to either side, the flag bends (`sl_flag_hit`,
  `$F371`). *Live*, 30 October 2026: called with the counter at 0, 50
  and 99 it fell; at 100, 150 and 255 the flag bent; one column off it
  bent; two off was no hit.
- The off-course edges (`$ED00`, `$EE00`) are a fall too. A fall
  disqualifies, "DISQUALIFIED", and no result is kept. The fall's
  pictures follow the turn: left, straight or right (`sl_fall_seq_lo`,
  `$8736`).
- `$F41C` loops on itself when the top colour cell of a flag being bent
  is already 1 (`CPX #$01`, `BEQ` to itself).

## Timing and results

- The timer adds 2 hundredths a frame, 50 frames a second, so it keeps
  time on a PAL machine; tune 3 ticks each second. At 10 minutes the
  run restarts (`$8024`) with no result.
- FIRST HEAT and FINAL HEAT, every player in each. A result is kept at
  `+$10` of the player's record (the time as text, to tenths) and
  `+$16`-`+$18` (99 less the hundredths, seconds and minutes, in
  binary-coded decimal, so a faster time is a higher score)
  (`sl_keep_result`, `$F20C`).
- In the final heat the kept score is compared with the new time digit
  by digit (`$F24D`): the old one stays only when some digit of the old
  time and the same digit of the new add up to more than 99. Which heat
  counts depends on the digits, not on which is faster. *Live*, 30
  October 2026: first 0:45.30 and final 0:50.10 kept 0:50.10; 0:45.60
  and 0:44.50 kept 0:45.60; 0:52.40 and 0:58.70 kept 0:52.40; 0:50.10
  and 0:45.30 kept 0:45.30; 1:05.00 and 0:55.00 kept 0:55.00.
- The best time of the load is kept at `$0B`-`$0D` and as text at
  `$0FF0`, shown as BEST TIME. Its colour is written to `$DC47`, an
  address of CIA 1, where `$D847` in colour RAM was meant; the write
  lands on a mirror of CIA 1's timer B.
- Each player's joystick is the first port to move in the first heat,
  kept for the final heat (`$F2DD`).

## The screen

- A raster interrupt at line `$30` shows the status rows; at `$4C`,
  timed to the cycle, extended colour and multicolour are set together,
  a mode the VIC-II draws black, to hide the half-scrolled top row of
  the course until line `$52` (`sl_irq_course`, `$852A`).
- The finish banner (rows 156 and 159, the finish line at row 157): the
  sprites go behind the course for 12 lines at the banner's line, only
  while the view's top is in rows `$45`-`$4A` of the section before the
  finish.
- The music pauses during the two frames of each coarse scroll
  (`$8601`).

## Sound

The events' music driver, from `$F5E2`. The ski hiss is tune 6, track 7,
which loops forever; its filter's cutoff (`$FB84`) is written each frame
from the turn and the speed, and `$FF` at `$FB85` ends it when the skier
stops. Tune 5, a flag hit, has no end byte and runs on into the hiss.
Tune 11 then tune 4 for a fall.

## Leftovers

- A second bend of the flag (frames `$16`-`$1C`, `$F5D2`, shapes
  `$6140`-`$633F`) is never played: `$9E` always starts at 0.
- Stubs at `$3FA7`-`$3FFA` never run: a write to `$DE02` on the
  expansion port, an NMI handler, a test for BRK and an interrupt's exit
  (`sl_unused_3FA7`).

## Registers

The processor port (`$01` = `$35`); the VIC-II's scrolls, extended
colour mode, raster interrupts timed to the cycle, sprites, priority and
colours; the SID's voices, filter and volume, and voice 3's oscillator;
CIA 1's ports for the joysticks, its timer A stopped, and the `$DC47`
write above; CIA 2's port A for the VIC bank; `$DE02` in the stub nothing
runs.

## Strings

In screen codes with `$C0` added (`$C1` is A): "SWISS TIME 0:00:00"
(`sl_str_time`, `$8264`), FIRST HEAT, FINAL HEAT, BEST TIME, MISSED,
DISQUALIFIED, "TRY AGAIN", YES and NO.
