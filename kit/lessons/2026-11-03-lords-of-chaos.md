## next · 2026-11-03 · Lords of Chaos (ZX Spectrum) · air with Claude

- **Trace a routine's callers before saying what sets it off.** The
  scenarios' trip squares were annotated as releasing their waiting
  creatures "when a creature steps there", which is what the table looked
  made for. trip_square (`$A716`) has two callers: use_square, after a
  chest is opened, and set_terrain_under, which every change of terrain
  goes through, a door unlocked, opened or closed among them. Stepping
  onto the square does nothing. The comment stood in two places in every
  scenario's listing until the Maps page's test changed each of the
  1,296 squares of each map through the game's own routine and compared
  the groups it woke with the page.
- **Read a table the way the game reads it, with no stop at its end.**
  Scenario 2's routes 0, 2 and 6 name waypoint 28 in a table of 28
  (0 to 27). waypoint_square (`$9971`) adds twice the number to the
  table's start without a check, so the game reads the next table's
  first two bytes, row 8, column 7, a square of rock wall no creature but
  a ghost can stand on, and a creature on those routes never passes it.
  A page that had checked each index against the table, or a decoder
  that stopped at the table's length, would have drawn the routes
  without the bug. Read every index as the routine does, and flag one
  past the table's end.
- **A written list of cases is where hand comments go wrong.** The
  verify sample (seed 7061) found 12 wrong among 60 written comments and
  none among 20 a decoder wrote. Six of the twelve were lists left short:
  what a hook receives "for everything else", the users of a variable,
  the bits a routine clears. Before writing "everything else goes to" or
  "used by", list the branches or the references from the code, not from
  memory of it.
- **Price the routines the port calls, with the time of what it does
  inside them.** The Play tab's pacing was first fitted the way
  `70-minisite/play.md` says, every routine's cost by non-negative least
  squares over the stretches, and then from each routine's own T-states
  measured on the game. Both left time unpriced: 43 small routines the
  game enters (a map address, a line step) the port does inside their
  callers, so their T-states belonged to no call the page makes, and on
  sessions the fit had not seen the waits came out 8 to 9 % short.
  Crediting each instruction's T-states to the innermost routine whose
  frame is open and which the port also calls (`port/scripts/time-stretches.js`,
  `--inlined`) closed most of it. The rest was routines whose cost per
  call varies with the board: see_square, print_message, work_out_sight
  and random_below priced by the work counted inside them (entries
  looked at, words and letters printed, numbers drawn) took the waits'
  mean error from 6 % to 1.5 % on 41 minutes of play held out of the fit.
- **Give the fit rows from every path the page starts on.** The first
  fit had rows only from moments of play and ran a fifth fast from the
  hand-over, where SELECT CONTROLS and the designer's panel spin in tight
  loops it had never timed; a 20-frame HALT pause after some spells was
  in no row until a run of other moments cast them. Rows from the boot,
  the designer and those moments brought every one of 26 replayed
  sessions within 3.2 %.
- **An instant cassette still breaks off with SPACE.** The test machine
  played a block at once wherever the game called LD-BYTES, whatever was
  held. The ROM looks at the keyboard before the first byte and returns
  when SPACE is down, so a player who broke off a search with SPACE and
  kept it held loaded nothing; the instant cassette loaded the next
  scenario over the designer's code, and the lockstep lost step there
  after 15,042 passes. A cassette that stands in for the ROM keeps its
  BREAK test: no byte loaded with SPACE held, and a save cut off after
  its flag byte.
- **Read a constant from the instruction that holds it.** The game's turn
  loop increments the player number through `LD HL,$5B11`. In one game
  against the computer, computer_pick_up's search with no end wrote over
  that operand and the game went round its turn for ever (pass 93,557 of
  a lockstep from the hand-over). A port that used the constant would
  have gone on and lost step; reading the operand from memory, as the
  instruction does, keeps it beside the game into the hang.
- **A loop with no way out must not freeze the page.** random_below
  draws until a byte is below its limit, so a limit of 0 spins for ever.
  On the Spectrum the interrupt goes on; the port's plain JavaScript loop
  locked the browser's tab instead, and a routine test with random
  inputs hung on the first case that gave strike_hit a combat of 255. A
  port throws at such a loop (and at a search with no end that has gone
  round the whole memory), and the page runs only the clock and the
  interrupt from there.
- **Before calling a shape unused, search the code for its number.**
  Following each thing's animation from the things table left frames 165
  to 167 and graphics 1 to 4 unreached in all three scenarios, which
  looked like leftovers. Searching the code for the frame's number found
  show_hit and summon_display writing `$A5` (165) into thing `$4F`'s
  next-frame byte, the sparkle a dying or summoned creature shows; the
  search for writes to the cursor's graphic (`$FF86`) found graphics 1
  to 4 are its four looks. Only three graphics were left that nothing
  shows. A viewer that draws every shape asks the question, and the
  answer is in the immediate operands and the writes, not the tables.
