# Bull riding: facts

File `K` of side 2, unpacked at `$1000`; the travelogue sets it in the
American West. Every fact names the routine or table it comes from, in
this part's listing.

## Memory

| Range | What |
|---|---|
| `$1000`-`$2331` | the code: the ride, the three-frame chain of interrupts, the bulls' moves |
| `$2332`-`$29ED` | the bulls' odds, the random numbers, the scores and the music driver |
| `$29EE`-`$2ED6` | the tunes and their tracks |
| `$2ED7`-`$2FF0` | the hidden credits screen and its two names |
| `$301D`-`$33FF` | each frame's sprite offsets, facing left and facing right |
| `$4000`-`$47FF` | the arena's character set |
| `$4800`-`$4BFF` | the letters of the text rows |
| `$4C00`-`$53FF` | the two screens the arena is drawn into in turn |
| `$5400`-`$55FF` | the eight sprites' shapes for the frame shown, copied or mirrored |
| `$5600`-`$85FF` | the bull's and rider's sprite shapes |
| `$9400`-`$95FF` | a copy of the offsets table nothing reads |
| `$9600`-`$9FFF` | the poses, 33 bytes each |
| `$A000`-`$B3FF` | the sky's rows, the arena's map (120 columns a row, `$A0A0`) and its colours (`$AA28`) |
| `$C100`-`$C2FF` | the tables that mirror a sprite, built at the start (`br_mirror_tables`, `$29C2`) |

## The ride

- Five bulls: FERDINAND, ELMER, BOB, TORNADO, EARTHQUAKE; in practice
  a sixth, "JOYSTICK (PORT 1)", the bull moved by the other joystick
  (`br_choose_bull`, `$190A`). Up and down choose, fire takes it.
- The bull's moves are bucks, runs and spins. After the first, chosen
  by the bull's place, each move is a random number against the bull's
  five thresholds (`br_bull_odds`, `$2332`; `br_choose_move`, `$222C`).
- The sixth bull follows the other joystick: nothing pressed, the next
  move as the bulls choose it; up a spin, up with fire a turn while
  spinning, down a buck (`br_joystick_bull`, `$22E3`).
- The rider must hold the stick the right way at one frame of each
  move: the bull facing left, left at frame 3 of a run (towards the
  head), right at frame `$0D` of a buck (towards the tail), down at
  frame `$21` of a spin; facing right, the same with left and right
  swapped (`br_stick_left`, `$17A1`; `br_stick_right`, `$17C8`). It is
  checked on the frames the move list reaches (`br_check_stick`,
  `$1766`). The wrong way, or nothing, throws the rider
  (`br_thrown`, `$12B6`): a fault, score 0.
- Points for each move: a buck 5, sometimes 6; a run 3 to 5; a spin 3,
  sometimes 4; a turn 3 (`br_choose_move`, `$222C`). The score is shown
  up to "100" (`br_digits`, `$1F6E`); the record keeps it at no more than
  99 (`br_keep_score`, `$2390`).
- The clock runs from the chute and is counted twice in every three
  frames, a hundredth each time (`br_clock`, `$1C9F`), so the clock's
  second is 150 frames, three seconds on a PAL machine. At 8 on the
  clock, 1200 frames or 24 seconds, the ride is over and the rider jumps
  off (*live*, 30 October 2026: 10 hundredths in 15 frames).
- A competition has three attempts; the best is kept.
- Each player's joystick is the first port with fire or a move on the
  first attempt; the event writes the port into eight joystick reads
  and the other port into the bull's (`br_set_ports`, `$1DF6`).

## The arena

- Two screens in turn: the arena (120 columns of map, 40 shown) is
  drawn into the one not shown, and they swap with the colours
  (`br_draw_arena`, `$1AE2`; `br_swap_screens`, `$1BDF`).
- The view's column runs from 0 to `$4C`; the top band, the sky and the
  stands' top, scrolls a pixel for every 11 of the view's columns
  (`br_top_band`, `$1CF9`).
- The pennants on the stands flip at random between a space and
  character `$FF` every third frame (`br_pennants`, `$1721`).
- Three frames make one chain of interrupts (`br_irq_top_a`, `$10EB`, to
  `br_irq_text_c`, `$11A3`): the top band, the arena band, the sprites
  behind the scenery from line `$C1`, the text rows from line `$E1`; the
  bull and rider are drawn in the third frame.

## The sprites

The bull and rider's shapes are copied for each frame into `$5400`
(`br_copy_shapes`, `$288B`). Facing right, each row is mirrored on the
way through two tables built at the start: `$C100` reverses the pairs
of bits of a multicolour byte, `$C200` the bits of a single-colour one,
and the row's first and third bytes change places.

## The hidden credits screen

With the first two players named AUTHOR and OFTHEGAME, in either
order (`br_hidden_check`, `$2ED7`), the event shows a yellow screen,
"WRITTEN BY / CHRIS PESTERLING", with the bull standing by the thrown
rider (frames `$1C` to `$1E`), until the fire button on port 2; then
`practice` (`$081D`) is set to `$FF` and the game goes back to the shell
(`br_credits`, `$2F08`). The title screen spells the name Oesterling.
*Live*, 30 October 2026.

## Sound

The events' music driver. Tune 10 at the start, 2 when the ride is
over, 1 and 4 to 9 at some of the bull's frames (`br_tunes`, `$29EE`).
Tune 3 is never started.

## Leftovers

The copy of the offsets table at `$9400`, and two spin lists at `$2210`,
are never read.

## Registers

The VIC-II's bank, two screens, fine scroll, sprite priority, raster
interrupts at lines 0, `$51`, `$72`, `$C1`, `$D9` and `$E1`, and
colours; the SID's voices, filter and volume, and voice 3's
oscillator; CIA 1's ports for both joysticks, rewritten per player;
CIA 2's port A for the VIC bank.

## Strings

In screen codes: "SCORE:", "PRACTICE AGAIN? YES", NO, "ATTEMPT 3 2 1",
"BULL:" with the six names, and the hidden screen's AUTHOR,
OFTHEGAME, "WRITTEN BY" and "CHRIS PESTERLING".
