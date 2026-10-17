# The main part — verified technical facts

What the CPU sees at the hand-over: bank 5 at `$4000`, bank 2 at `$8000`
and bank 0 at `$C000`. Every address here is this part's; an address in
another bank names it ("bank 3 `$FB7C`"). Unless marked *live*, a fact
comes from the code in `work/entry.sna` (stopped at `$8521`). Live tests
are listed in the game's own `facts.md`.

## Start-up and new game

- `start` (`$8521`) sets interrupt mode 2 through the table at `$8400`
  (257 bytes of `$BE`, I = `$84`, so every interrupt goes to `$BEBE`),
  asks the sound driver for tune 14, runs the control selection screen
  (`$AE10`), builds the bit-reversal table at `$8000` and draws the play
  screen's frame (`$8549`). New game (`$85E2`) then copies 80 bytes of
  bank 0 over the start-up code: it runs only once.
- `new_game` (`$85E2`), also reached from the menu's new-game icon, moves
  bank 0's starting values (`$FE05`-`$FEDA`) to bank 3's records
  (`$EB05`, `$EC5D`), objects (`$ECD8`), the clock (`$BF29`) and the view's
  place (`$9633`), fills the party's needs, sets the area to 13 and enters
  the main loop with the stack reset.
- New game sets records 0 to 7 and `$2B` and `$2C` from bank 0
  (`$FE05`-`$FE54` go to bank 3 `$EB05` and `$EC5D`); records 8 to `$2A`
  and `$2D` keep what the last game left in them.

## The main loop

- `main_loop` (`$86A2`): one pass for each view drawn. In turn, with the
  bank each needs paged in: the needs (bank 3 `$D603`), the actors leaving
  and entering (bank 3 `$DCB9`, `$DC0B`), the records off the screen (bank
  3 `$E187`, twice), the actors (bank 3 `$DED5`), the leader's input
  (`$8B81`), the zones (bank 3 `$FB9B`), the animations and the scroll
  (`$8ED8`, `$98FF`), the shimmer (bank 0 `$F5DD`), day and night
  (`$8C47`), the rope and the shots (bank 3 `$E6B3`, `$C21B`), the actors
  drawn (`$A6F4`), the panel (bank 0 `$F2AB`), the menus (bank 3 `$C8D4`)
  and the windows (`$AA94`).
- When the leader dies for the first time, `$FB7C` is asked about
  character 1 and message 32 is queued: "<leader> IS DEAD. WHAT ARE WE
  GOING TO DO NOW".

## Areas

- `load_area` (`$87CF`) unpacks bank 1's packed ground (`$D000`, four
  bytes an area) into bank 1 `$C000`-`$CFFF`, a byte with bit 7 being a
  count for the byte after it; writes the area's two offsets into the
  instructions at `$90E2`, `$90F0`, `$9237` and `$9244`; copies the area's
  list of block definitions from bank 0 `$E8A3` to bank 0 `$C800`; loads
  bank 7's scenery record (`$8A9B`); and places bank 6's scenery objects
  (`$8879`), each stamping its piece of map into the area's map
  (`$899B`), translated into this area's block numbers when it is drawn in
  another's (`$8B31`).

## Actors and the ground

- An actor is 32 bytes at `$8300` (eight of them). `animate_actors`
  (`$8ED8`) plays each one's animation from bank 1: a new action starts a
  script chosen through bank 1 `$E2F2` (`$8FDA`); each frame moves the
  actor by three signed steps, and the move is kept only if `try_move`
  (`$9097`) allows it: not into an area box (`$9546`), not into another
  actor (`$9440`), and not where the ground forbids (`$9104`). The last
  frame's event (`$9052`, table `$9073`) calls into bank 3.
- The ground is a grid of 64 by 64 cells, 16 units square, in bank 1
  (`$90DE`). Under `$72` a cell is a height: a step of two or more is
  refused, down for anyone and up for the four characters. `$72` to `$7E`
  are special ground with a routine each (`$9267`): `$72` ends the game
  for the leader, `$74` drops Clive through, `$7A` and `$7B` are swamp
  that sinks whoever stands still in it (`$A03F`), `$7D` fills the bottle
  and `$7E` is water.

## The view

- A buffer of 152 rows of 28 bytes (`$AE10`-`$BEAF`) holds the view, one
  character row more than the 144 shown. It scrolls a pixel row at a
  time up and down and half a character across (`$9693`, `$96D9`,
  `$9711`, `$972C`); the scroll steps follow the fourth byte of the
  leader's animation frame through the 18 steps at `$9963` (`$98FF`).
- Each character of the view comes from bank 0's map (64 by 32 blocks,
  `$9A6D`), a block's definition (`$9C10`, 16 character numbers) and bank
  4's characters (`$9C4D`). At half a character across, columns and rows
  are drawn from halves of two characters (`$9C89`, `$9DF5`, `$9E52`).
- `show_frame` (`$9987`) waits for the interrupt, flips the screen shown
  (bit 3 of `$7FFD`) and copies the buffer into the other screen
  (`$963B`) with interrupts off, using the stack to read the row table.

## Sprites

- `set_up_sprite` (`$A493`) pages in the actor's bank (+`$1F`) and reads
  its frame from its list (+`$19`): width 3 (16 pixels) or 4 (24),
  rows, picture and mask. The 24-pixel drawer (`$A079`) uses the mask; the
  16-pixel one (`$A277`) makes its mask from the picture with the tables
  at `$8100` and `$8200`, which give each sprite an outline. Mirrored
  frames reverse their bytes through `$8000`.
- The sink count of the actor's type (`$A03F`) takes rows off the sprite,
  so it sinks into the ground; one with no rows left is removed.
- The visibility mask (`$8521`, 4 bytes by 48 rows) is cut by every
  scenery piece of bank 4's list that overlaps the sprite and stands in
  front of it (`$A879`, `$A8F3`): the scenery hides the parts of a sprite
  behind it.
- Types `$14` to `$1B` are drawn as two sprites (`$A725`), from bank 1
  `$F26A` or bank 6 `$E2EF`.

## Windows and the title

- Two menu windows (bank 3 `$C899`, `$C8A6`) and a conversation window
  (`$AA7E`) open from their middles and close again a step a pass
  (`$AA94`), drawn into the screen not shown (`$ABBB`); what a window
  covers is redrawn from the cell map at `$6505` or the view (`$ACEC`).
- The control selection screen (`$AE10`) is drawn into the view buffer's
  room before play. Its keys 1 to 4 light an option, 0 picks it after
  CONFIRM? Y OR N (`$AF0F`), and KEYBOARD goes on to CHOOSE KEYS
  (`$AFEC`), which refuses a key taken already, SPACE included.

## Sound

- `snd_frame` (`$7000`) is called by the interrupt and once more after
  each copy of the view (`$968E`). It takes a request from `$7002`
  (`$707E`), steps the tune's sections through `$70BF` at the speed of
  `$794C`, and for each channel plays the volume envelope (`$766D`),
  vibrato (`$7693`) and pitch slide (`$761C`) before writing the AY
  (`$7B05`). Pitches are 48ths of an octave, four to a semitone, turned
  into periods from the lowest octave's table at `$7AA5`.
- Tune 14 sets the instruments (`$775C`) and chains sections 15 to 26;
  26 goes back to 14 (`$7339`), so the music loops. Section 23 sets the
  transposition (`$7992`) from its notes' high nibbles and leaves it at
  one semitone, and nothing clears it until the next request, so from
  the second time round sections 15 to 21 play a semitone higher. Tune 4 is sound-effects mode
  (`$76D3`): an effect number in a channel's +3 byte (`$7006`, `$701F`,
  `$7038`) starts one of the instruments at `$7795`.
- The drum (`$7591`) is noise on channel A and a click of the beeper.
- Tunes 1 to 3 are a second tune of 192 steps, each channel's notes at
  `$733F`, `$7405` and `$74CB`, which no instruction requests.

## The panel (bank 0)

- `panel_pass` (bank 0 `$F2AB`) keeps the leader's portrait, the score's
  five digits, the three bars, the light and the calendar up to date in
  the cell map at `$6505`, and draws each part that changed into both
  screens on the passes after the change.
- Each bar is the product of a pair of the leader's need bytes divided by
  1024 (bank 0 `$F3C2`); it grows or shrinks a pixel a pass.
- The calendar turns its page at midnight (bank 0 `$F465`): the day of
  the month (`$8D14`) goes up, and after the 31st (the 30th in month 1)
  the month (`$8D15`) moves on to one more, kept to 0 to 3: MAY, JUN, JUL
  and AUG (bank 0 `$F57E`). Play starts on MAY 1 with `$8D15` at `$FF`
  (`$865E`), so the month after May is month 0, May again. *Live*: from
  `work/play-start.sna` with the day poked to 31 and the clock to just
  before midnight, the panel showed MAY 1 and `$8D15` was 0.
- `$8D15` is also bank 3's count for the ceremony at the altar (bank 3
  `$FEC8`), which runs from 0 and stops at `$FF`. A month's end in the
  middle of a ceremony starts its count again from 0 to 3, and the month
  shown is chosen by the count; a ceremony's end sets the month to
  `$FF`, so the next month is May.
- Three areas, 1, 5 and 10, have a rectangle of the view that shimmers
  with a moving pattern of bright cells (bank 0 `$F5DD`, `$F706`,
  `$6903`).
