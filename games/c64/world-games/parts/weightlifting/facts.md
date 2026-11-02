# Weightlifting: facts

File `F` of side 1, unpacked at `$1000`; the travelogue calls it
Russia's event. Every fact names the routine or table it comes from, in
this part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$1F28` | the code: the rounds, the weight, the judges, the interrupts, the scripts, the plates |
| `$1C53`-`$1D34` | the plates' column writer, 75 `STA` instructions in a row (`wl_column_writer`) |
| `$2000`-`$23FF` | the lift's eight scripts (`wl_scripts`, `wl_script_data`) |
| `$2700`-`$27FF` | the bar's height for each of the 97 poses (`wl_bar_heights`) |
| `$2800`-`$32FF` | the music driver, its jump table at `$2800`, and the tracks |
| `$3800`-`$3BFF` | the font of the three text rows (`wl_font`) |
| `$3C00`-`$3FFF` | colour RAM's four pages, copied to `$D800` |
| `$5C00`-`$7F3F` | the arena: the bitmap's colours (`$5C00`) and the multicolour bitmap (`$6000`) |
| `$8100`-`$8E80` | the poses: for each, the number of sprites and four bytes a sprite |
| `$9000`-`$C37F` | the lifter's sprite shapes, 206 of 64 bytes (`wl_shapes`) |

## The lift

- Snatch, then clean and jerk, three attempts each (`wl_round`,
  `$10F4`; `$124F`). The weight is chosen with left and right in 5 kg
  steps from 75 kg to 225 kg (`wl_choose_weight`, `$13B7`), never below
  the round's lowest, which rises 5 kg after each attempt in which
  anyone lifted.
- After a round in which someone lifted, every player starts the next
  at 5 kg above the last good lift (`$122F`, `$124F`), so a good lift at
  225 kg makes the next weight 230 kg. Right on the stick stops raising
  the weight only at exactly 225 kg (`$146C`, `CMP #$2D` and `BEQ`), so
  from 230 kg it raises it with no limit.
- Past 225 kg the factor is read beyond `wl_timing`'s 31 bytes, from
  `wl_kg`'s code (`$14B2`): `$A2` at 230 kg, as easy as about 120 kg,
  then `$00` at 235 kg, one good frame a window. *Live*, 30 October
  2026: `$1482` with the weight at 230 to 250 kg left `$A2`, `$00`,
  `$86`, `$1E` and `$86` in `$4B`.
- At 865 kg (`$38` = `$AD`) the plates halt the processor. `wl_plates`
  (`$1985`) takes 25 kg off, a big plate's 100 and a mark's 50, and
  makes the last plate's offset `$E1` 9 less what is left; below 0 it
  draws the largest last plate instead, but at `$AD` 9 less 138 is
  -129, which a byte holds as `$7F`. The strip then starts on line
  `$B0` (`$2F` = `$31` with the lifter standing), and `wl_strip`
  (`$1C31`), three bytes a line kept to a byte, enters the column writer
  at `$1C63`, the second byte of `STA $67F2,X`: `$F2`, a code that halts
  the processor. *Live*, 30 October 2026: with the game running and the
  weight set to 865 kg, the interrupt's redraw stopped the processor at
  `$1C63`, the text row half drawn; at 860 kg the plates were drawn
  (`live_wl_865.py`; `reference/weightlifting-865kg.png`).
- The lift is a script (`wl_script_step`, `$1894`): poses with their
  lengths, timing windows, tunes, calls, and where a push too early goes.
  During a window a push of the window's direction counts
  (`wl_script`, `$183D`): how far into the window it came, against the
  good part's size.
- The good part of each window shrinks with the weight: the factor in
  `wl_timing` (`$1493`) runs from `$FF` out of 256 at 75 kg to 1 at 225
  kg, where only the window's last frame is good.
- Each player's joystick is learned from the first move in the first
  snatch (`wl_stick_for_player`, `$175C`; `wl_sticks`, `$1779`).
- The score is the best snatch and the best clean and jerk added,
  shown as "nnn KG" (`wl_end`, `$12DF`).

## The judges

- Held overhead, the lift goes to the judges (`wl_judges`, `$14ED`).
  The first votes at once: its delay is the high byte of the pushes'
  average timing, always 0, since each push's timing is below 128
  (`wl_divide`, `$1DF2`; checked in VICE on 30 October 2026 by calling
  it with sums of 64, 381 and 511). The others vote up to 31 frames
  apart.
- A judge votes white while the hold is under 48 frames and red after
  (`wl_vote`, `$1577`). Two white lamps make a good lift.
- The judges first read the stick (`$1502`) in the frame the lift's
  script ends, from `$43` as the interrupt read it that frame. The last
  window of both lifts is down (`$209F`, `$2114`), and a good push
  there ends the script at once, so the stick is still down when the
  judges look: the weight is put down before any vote (`$1536`), three
  red lamps. Left to run out, the window ends the script with result 1
  all the same. *Live*, 31 October 2026, a snatch at 75 kg from
  `play-F.vsf`: a push of down held for one frame in the last window
  started script 4 in the same frame, with three red lamps and `$46` =
  0; with the window left alone, all three judges voted white, the first
  at a hold of 0 (`live_wl_last_window.py`). A push before the good
  part of that window is a failed lift (the script's early target,
  `$2180`), so no push in it gives a good lift: *traced* on the game's
  code in `test_widgets.js`, both lifts at every weight from 75 to 300
  kg, a push at every frame of the window, and the window held through.
- The lifter's colour changes every 64 frames of the hold: light red,
  orange, red, purple, blue (`wl_skin_colours`, `$1572`).
- Held too long, every judge left votes red and one of two endings
  plays: script 6 when a random number is at least `$4F`, script 5 when
  it is below (`$1546`). `$4F` is five times the first byte of the text
  "CURRENT WEIGHT" (`wl_txt_weight`, `$16F5`), the C, `$43`, read as a
  number. Script 5 starts tunes 9, 10, 11 and 7, script 6 tune 7 twice.
  *Live*, 30 October 2026: random numbers `$00` and `$4E` played script
  5, and `$4F`, `$80` and `$FF` script 6. The table of random numbers
  read in one run held 148 different values, 160 of the 256 at least
  `$4F` (`live_wl_random.py`); the odds depend on the table.

## Pictures

- The arena is a multicolour bitmap; the three text rows at the bottom
  are drawn into the bitmap in hires from the font at `$3800`
  (`wl_print`, `$1D35`), multicolour switched off at line 226
  (`wl_irq_text`, `$17A4`).
- The plates are drawn into the bitmap beside the lifter, at the bar's
  height for the pose, a vertical strip of bytes at a time: the column
  writer is 75 `STA` instructions, one for each pixel line, entered at
  the strip's first line with an `RTS` planted after its last
  (`wl_strip`, `$1C31`).
- The lifter's sprites are copied for each pose into VIC bank 1
  (`wl_pose_shapes`, `$1E3A`), each shape's 64th byte giving its colour,
  multicolour and size (`wl_pose_place`, `$1E8B`).
- The random numbers are 256 readings of the SID's voice 3 noise, kept
  at `$0400`-`$04FF`, the screen memory the bitmap does not show
  (`wl_main`, `$1000`; `wl_random`, `$197D`).

## Sound

The events' music driver, with a jump table at `$2800`, and a tick every
`$CF` frames (`$2889`). Tune 13 opens the event.

## Leftovers

"Butch Badorsik (USA)" (`wl_txt_butch`, `$1661`): a name and country
nothing prints.

## Registers

The processor port (`$01` = `$35`); the VIC-II's bank, bitmap mode,
three raster interrupts (lines 0, 160 and 224), sprites and colours;
the SID's voices, filter and volume, and voice 3's oscillator; CIA 1's
ports for both joysticks and its interrupt; CIA 2's port A for the VIC
bank.

## Strings

In ASCII, the last character of each with bit 7 set (`wl_texts`,
`$165C`): "PRACTICE WHICH EVENT?", "SNATCH #", "CLEAN AND JERK #",
"PLEASE SELECT THE WEIGHT.", "CURRENT WEIGHT", "PRESS THE BUTTON TO
START.", "PRESS THE BUTTON TO CONTINUE.", "BEGIN LIFT.", "PRACTICE
AGAIN?", YES, NO and "Butch Badorsik (USA)".
