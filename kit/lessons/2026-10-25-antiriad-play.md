## next · 2026-10-25 · The Sacred Armour of Antiriad (C64) · air with Claude

- **Cost a routine by the calls the port makes, and a loop inside it by
  a counter.** The Play page moves its clock by each routine's own
  cycles, measured on the game from its entry to its return. The game's
  `add_weight` (`$AC1C`) adds a weight X times by branching back to its
  own first instruction, and the measure took each turn for a new call
  of one turn's cost, where the port runs the whole loop in one call. A
  return to a routine's entry with the stack as it was is now a turn of
  the call under way, and the port counts the turns (`P.N.weights`, the
  instruction at `$AC1F`) for the clock to pay each at its measured
  cost.
- **Look at a routine's longest call, not only its mean.** `colour_panel`
  (`$89C2`) returns at once on all but one of its 418,131 calls on the
  route, and on that one, the first time the armour is worn, recolours
  the panel in 109,820 cycles. Costed by its mean, 13 cycles, the page
  lit the panel eight frames before the C64 did. Its looks in the list
  of colours are now counted and paid a row at a time, so the rows
  change colour when the C64's do, and `time-routines.js` names any
  routine costed by its mean whose longest call is more than 1,000
  cycles over it.
- **Count a frame task's work past its first test.** A task the game
  runs every frame, such as moving the sprites or rolling the score,
  returns after a test or two on most frames and works on the rest.
  Costed by its mean over the route, each idle call was charged a share
  of the busy ones, and the page fell behind the C64 while a room was
  built: in the game's first room it reached `clear_room_objects` 177
  lines after the C64. Counting each task's turns past its first test
  (the slots it moves, the scores it rolls) brought that to 10 lines.
- **Time the work inside a routine that waits.** The ending's
  `victory_sequence` (`$8AD9`) ANDs the playfield's character set with a
  mask, 2,048 bytes, then waits ten frames, nine times over. A routine
  that waits takes what time the game gives it, so it had no cost of its
  own, and the page ran its 18,432 ANDs in no time: the last message
  came 65 frames before the C64's. Each turn of the loop is now timed on
  the route from its first instruction to the next turn's, 41.04
  cycles, and the port counts the turns. The note on long calls cannot
  find this, since every call of a wait is long.
- **Take interrupts inside a sound driver that runs on its own 6502
  core when the handler around it clears I.** The game's music handler
  stops CIA 1's timer A, clears I, runs the driver and starts the timer
  again, so a raster or collision interrupt taken inside it lengthens
  the stop, and every sound interrupt that timer drives falls later from
  then on. The page ran the driver whole and took the interrupt after
  it, so its stop was shorter than the C64's each time an interrupt came
  inside it, and the timer's phase against the frame drifted. The
  driver's core now asks the page between its instructions whether an
  interrupt is due, and the page takes it there. Of 56 moments of play
  on 25 October 2026, 43 held Tal in step with the C64 for 300 frames,
  where 40 had.
- **Read the chips at the clock, not at an estimate of where a running
  routine would be.** The port runs a handler whole and its time passes
  afterwards, so the clock stands at the handler's start while its
  routines read the chips. Moving each read on by the cycles the
  handler's routines had cost so far put a band's last read of the
  interrupt flags after interrupts the clock had not yet raised, and the
  handler cleared flags that should have come as interrupts of their
  own: 29 of the same 56 moments held for 300 frames, against 43 without
  it. Within the sound driver, whose cycles the core counts as it runs,
  the chips are read at the core's own count.
- **Compare the page's frames as it draws them.** A routine that runs
  whole moves the page's clock past several frames in one call, so the
  page's memory read after the clock reaches a frame's end can be frames
  ahead of it. The frame the page draws keeps its memory as the frame
  began, and that is the page's state to hold beside the C64's at the
  same cycle. Compared on the route's frames, the clock's frames drift
  too: the kit's machine runs each frame on to the end of an
  instruction, and the route's 17,681 frames ended 71,390 cycles, over
  three frames, after the clock's.
