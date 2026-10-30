# Sumo wrestling: facts

File `N` of side 2, unpacked at `$1000`; the travelogue sets it in
Japan. Every fact names the routine or table it comes from, in this
part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$2811` | the code: the interrupts and the sprites, the bout's states, the wrestlers' states, the scores |
| `$2812`-`$2B95` | each pose's next poses, events, moves, feet and sounds |
| `$2B96`-`$2C41` | the random numbers, and the readout nothing calls |
| `$2C42`-`$2FFF` | zeros nothing reads |
| `$3300`-`$3BFF` | the music driver and its tracks |
| `$3C00`-`$3FFF` | the ring's colour RAM, copied to `$D800` at the start |
| `$4000`-`$5F3F` | the multicolour bitmap of the ring and the crowd |
| `$6000`-`$67FF` | the character set of the three text rows |
| `$6800`-`$6BE7` | the screen: the bitmap's colours for rows 0 to 21, then the text rows |
| `$6C00`-`$6FFF` | the sixteen sprites' shapes for the frame: the left wrestler's turned round, the right one's as they are |
| `$7000`-`$7C3F` | the 90 poses: where each is, then its sprites, each a place and a shape |
| `$7C40`-`$B93F` | the sprite shapes |
| `$CC00`-`$CCFF` | the table that turns a multicolour byte round, built at the start |
| `$CD00`-`$CDBF` | the music's frequency table, built at the start |

## The screen

- A multicolour bitmap in VIC bank 1, with the three text rows below
  the ring in character mode from line `$D0` (`su_irq_text`, `$17DD`),
  and the bitmap back at line `$FA` (`su_irq_bottom`, `$1804`).
- Each wrestler is eight sprites, four above and four below. The four
  above of each go to the hardware's eight sprites; the four below wait
  in a list and reuse them, each placed once the line where the sprite
  above ends is passed (`su_place_sprites`, `$12A7`; `su_multiplexer`,
  `$1581`). The game's work for the frame runs after the last of them,
  in the interrupt, with interrupts on (`su_irq_frame`, `$123F`).
- The wrestlers are drawn from the same shapes: the right one's copied
  as they are, the left one's turned round row by row through the
  table at `$CC00` (`su_copy_shapes`, `$10ED`; `su_copy_mirrored`,
  `$119B`). A shape is copied only when it changes.

## The bout

- Both wrestlers start with a strength of `$2000`, the left at x `$54`,
  the right at x `$0192` (`su_setup`, `$182C`).
- Standing (`su_standing`, `$2193`): up is the forearm; down, then left
  or right, the slaps; left or right a push; the button down reaches
  for the belt.
- A push is a change of the stick: right takes the strength's high byte
  off the speed, left adds it, and each push costs 4 of the strength,
  down to no less than `$0400` (`su_push`, `$2495`). Pushing tires a
  wrestler.
- Reaching with the button down, within 12 pixels of the other
  wrestler, a random number below twice the shortfall takes the belt,
  with tune 7 (`su_reaching`, `$226B`). Holding the belt, up or down
  starts a throw: up the utchari, down with right, with left or alone
  the trips (`su_throw`, `$22F9`). Pushing the same way again presses
  the throw on, for `$40` of strength (`su_throwing`, `$2370`); a throw
  that reaches the pose's event 3 fells the other wrestler
  (`su_next_pose`, `$251F`); one that slips back below pose `$31` is
  over without a fall.
- Each frame (`su_ring`, `$1F1F`): a wrestler down (`$FF` in the pose's
  table at `$2A2E`) or with a foot out of the ring, the left one's left
  of x `$44` or the right one's right of `$012C`, loses. Two wrestlers
  too close are pushed apart with their speeds traded and halved; a
  forearm takes half its speed off the other; holding the belt, both
  move as one.

## The computer

The computer (`su_computer`, `$1E95`) keeps each choice for a while:
being thrown, it pushes back; holding the belt, it throws now and then,
one of four throws at random; throwing, it keeps at it; otherwise it
pushes forward, with the button down within 32 pixels.

## The score

- Each frame the wrestlers touch, the force between them, the sizes of
  the two wrestlers' speeds added together, is added to both totals,
  and again to whichever is winning the push; during a throw it counts
  double and the extra goes the other way (`su_score_frame`, `$2615`).
- At the end each total is doubled, its upper 16 bits are divided by
  the bout's length in units of 256 frames, plus one, and the loser's
  is halved (`su_final_scores`, `$26DF`). A short bout of hard pushing
  scores highest.

## Players

- In a competition each player takes the left side in turn; the right
  side is the next player, or the computer with one joystick or none
  left (`su_setup`, `$182C`). The names' rows change every 40 frames
  between the country and "PRESS BUTTON" until a button is pressed
  (`su_choose`, `$1984`).
- In practice port 2's button makes the left wrestler a contestant and
  its second press the right one the computer; port 1's the other way
  round (`$1A3E`). Afterwards "PRACTICE AGAIN? YES", up for yes, down
  for no (`su_result`, `$1BA2`).

## Sound

The title's music driver in a version of its own: its variables in zero
page `$B0`-`$EF`, three entries at `$3300`, and a start that keeps the
registers. Eight tunes, thirteen tracks. Tunes 8 and 1 at the start of
a bout, 7 at a grab of the belt, 2 for the result; each pose may start
a tune of its own (`su_pose_sounds`, `$2AE2`). Command `$D5` plays a
random note, 31 to 95, from voice 3's oscillator.

## Leftovers

A readout for the developers at `$2BC1`-`$2C41` is never called: it
would write, in hexadecimal into the text row at `$6B99`, each
wrestler's pose, stick, state and speed, with its digits at `$2C32`
(`su_debug`).

## Registers

The processor port (`$01` = `$35`); the VIC-II's bitmap and character
modes, two raster interrupts and a multiplexer timed by the raster,
all eight sprites rewritten for the lower halves, and colours; the
SID's voices, filter and volume, and voice 3's oscillator; CIA 1's
ports for both joysticks, its timer A stopped; CIA 2's port A for the
VIC bank.

## Strings

In screen codes, 12 characters each (`su_texts`, `$1CD8`): COMPUTER,
CONTESTANT, WINNER, LOSER, "PRESS YOUR", BUTTON, PRACTICE, "AGAIN?",
YES and NO.
