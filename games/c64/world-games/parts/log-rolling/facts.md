# Log rolling: facts

File `M` of side 2, unpacked at `$1000`; the travelogue sets it in
Canada. Every fact names the routine or table it comes from, in this
part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$3656` | the code: the bouts, the interrupts and the sprite bands, the balance, the computer, the clock and points |
| `$3657`-`$3EE8` | the music: the tunes' tracks (`lr_tune_tracks`), fourteen tracks, the driver (`lr_start_tune`, `$39F3`) |
| `$7000`-`$73FF` | the text row's character set |
| `$7400`-`$77FF` | the screen (`lr_screen`), with the sprite pointers at `$77F8` |
| `$7800`-`$7FFF` | the picture's character set: trees, crowd, flags, shore, the log and the meters |
| `$8D80`-`$8FFF` | the crowd's four pictures for its cheer |
| `$9000`-`$9C90` | the standing lumberjacks, packed: shapes and pictures' records |
| `$AC00`-`$AFFF` | the screen's colours, later the music's frequency table and the unpacker's tables |
| `$B000`-`$C813` | lumberjack 1's fall, packed |
| `$E000`-`$F9A4` | lumberjack 2's fall, packed |

## The lumberjacks

- Lumberjack 1 (`$0C`, `$0E`-`$10`, `$0F70`) stands on the right,
  further away and higher on the screen; it is the computer when there
  is one, and the second name in the text row. Lumberjack 2 (`$0D`,
  `$11`-`$13`, `$0F71`) stands on the left, nearer; it is the first
  player, whichever port pressed fire at "PRESS YOUR BUTTON".
- Each change of the stick between left, right and both is a step: the
  feet's speed goes up by 7 the way the lumberjack runs (`lr_step`,
  `$2183`). Running forwards it is held at 127. Running backwards, a
  step taken at -122 or below wraps round, and the speed is set to
  `$FFFF`, -1/256, so the feet all but stop. *Live*, 30 October 2026:
  `lr_step` called with -121 gave -128, with -122 and -128 gave `$FFFF`;
  forwards, 122 and 127 gave `$7FFF`.
- The feet slow by `$50`/256 a frame (`lr_slow_feet`, `$21D2`). Fire
  reverses the way the lumberjack runs. Left or right with a lean of 16
  or more flings the arms out.
- The stick held unchanged pushes the log: an eighth of the frames it
  was held, signed by the way the lumberjack runs (`lr_push_log`,
  `$2209`). A step or a turn hands the push to the log's spin (`$0F5D`,
  ±31), which falls by 1 every 16 frames. The log's speed is the spin
  and both pushes, ±31 (`lr_log_speed`, `$2234`).

## Balance and falling

- The lean is the feet's speed over 4 less the log's speed, with 4
  times the wobble (`$0F66`) added in its own sign (`lr_lean`, `$2297`).
  The wobble grows by 1 at each of the log's steps while the lumberjack
  stands still (the feet's speed exactly 0) on a turning log; otherwise
  it falls by 1 a frame.
- A lean of 24 or more either way is a fall; the one leaning further
  falls, lumberjack 1 on a tie. The meters at the bottom show each lean
  (`lr_meters`, `$1CB2`), from the middle out, a character filled for
  every three of lean, towards the side of the lean. *Live*, 31 October
  2026, in a bout played with the stick: leans of 1, 13 and 23 (`$0F70`)
  showed 0, 4 and 7 cells, and at 24 the lumberjack's arms went up as
  the fall began (`reference/log-rolling-lean-*.png`).
- The fall plays in stages (`lr_fall_step`, `$29E4`): 1 the standing
  pose for a frame; 2 (leaning forward) or 3 (back), with the splash;
  4, the second splash; 5 both lumberjacks in turn and the crowd's
  cheer. Fire cuts it short from stage 4.

## Points and the clock

- Every 16 frames, d = the log's speed less the lean, both as sizes,
  and at least 0: before 0:30 on the clock the points go up by
  `$3490`[d], 0 to 9; after, down by `$34B0`[d], 9 to 0, not below 0
  (`lr_points`, `$33D0`).
- At a fall the loser's points are quartered and kept below the
  winner's, the winner gaining one if needed (`lr_fall_points`,
  `$34D0`). A player's best is kept in the record at `$0813`-`$0817`,
  never the computer's.
- The clock's hundredths go up by 1 and 2 on alternate frames, and at
  98 or more a second goes on, so a second on the clock is 65 or 66
  frames, about 1.3 seconds on a PAL machine; it shows M:SS:T and stays
  at 9:59 (`lr_clock`, `$3323`). *Live*, 30 October 2026: 65 or 66
  calls to a second; from 9:59.90, twenty calls on it read 9:59.91.

## Bouts

- A competition plays every pair three times, "TRY 1" to "TRY 3";
  practice plays once, then "TRY AGAIN? Y", up for Y and down for N.
- With one joystick every player meets the computer; otherwise the
  players are paired at random, the computer filling an odd place
  (`lr_draw_pairs`, `$3133`).
- The computer (`lr_computer`, `$2DC9`) picks a style for each bout,
  one of 16 patterns of bits at `$2EB8` saying, for each lean from 0 to
  15, whether to step or hold (`lr_computer_style`, `$2E5C`). It holds
  while it wobbles, turns round (fire) when its lean is the way it
  runs, does nothing when its lean is the way the log turns, and
  otherwise follows its style.

## Pictures

- Up to 15 sprites, from the two lumberjacks' pictures (records at
  `$8000` + 2n, offsets at `$8100`), sorted by height (`lr_sort_sprites`,
  `$25D2`); the first eight at the top, the rest in up to three raster
  bands that reuse the hardware sprites already drawn
  (`lr_split_bands`, `$26DF`). Each band count has its own handler.
- The game's logic runs inside the interrupt after the last band, with
  interrupts allowed again; `lr_wait_bands` (`$159A`) waits on a flag
  cleared at line `$DD`.
- The pictures are packed by byte pairs, as the shell's files are
  (`lr_unpack`, `$292A`), in three sets: standing (`$9000`, `$9B00`),
  lumberjack 2's fall (`$E000`, `$F464`) and lumberjack 1's fall
  (`$B000`, `$C279`), each unpacked to shapes at `$4000` and records at
  `$8000`. At a fall the shapes on screen are copied to `$6D00`, so the
  frame holds while the next set unpacks.
- The log is four frames of characters drawn from `$75D4`, a step every
  table+1 frames: 12 at speed 1, 2 at speed 31 (`lr_draw_log`,
  `$1D57`).
- The crowd, rows 3 to 6, is redrawn every 8 frames while it cheers, in
  six steps from four pictures, the arms up at every other step
  (`$8D80`-`$8FFF`). The four flags flutter every 16 frames, from random
  characters at `$11A8` (`lr_crowd`, `$1139`).
- The colours are copied from `$AC00` to colour RAM only the first time
  the event runs (`$100D` rewritten from `LDA #0` to `LDA #1`), since the
  unpacker's tables then overwrite `$AD00`-`$AFFF`.

## Sound

- The events' music driver, its frequency table at `$AC00` tuned for
  a machine of NTSC speed: the top C, `$861E`, is 2093 Hz at 1.0227 MHz,
  so on a PAL machine the music plays about 65 cents flat.
- Tune 7, the music, plays only on the join screen. Tune 4 is the log's
  rumble on voice 2: track 3 loops forever, and `lr_log_sound`
  (`$1C56`) writes its filter cutoff, `$90` plus the speed, and its
  sweep's lengths, 10 down to 2, into the track. Tune 8 stops it. Tune 3
  is a foot tapping the log; tune 5 the teeter; tunes 1 and 9 the
  splashes; tune 2 the crowd's roar.
- Lumberjack 2's teeter writes tune 6's step (`$3723`) but starts tune
  5 (`$1FB9`), so tune 6, the teeter as a pulse wave on voice 3, is
  never heard.

## Leftovers

`$1A21`, the handler for a band of two sprites from the second set, is
never chained, and reads the first set's x positions (`$64`, `$65`).

## Registers

The processor port (`$01` = `$35`); the VIC-II's character sets for
the picture and the text row, raster interrupts for the sprite bands
and the text row, all eight sprites' positions, colours and sizes
rewritten for each band, and colours; the SID's voices, filter and
volume, and voice 3's oscillator for the music's random notes; CIA 1's ports for
both joysticks; CIA 2's port A for the VIC bank.

## Strings

In screen codes: "PRESS YOUR BUTTON", COMPUTER, "0:00:0" and "TRY
AGAIN? Y".
