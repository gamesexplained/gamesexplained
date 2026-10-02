# Play: a port of the whole game

Read this when you build a Play tab (`70-minisite`, "Play"). The port is
checked against the game itself, not against a reading of it, in one of
two ways: by the game's own demonstration, or by running the game's code
beside the port.

## A demonstration is the test

If the game has a demonstration that replays recorded input, that is the
test for the whole port. Record the real demonstration in the emulator,
one record per pass of the game loop with every variable the port keeps,
then feed the port the demonstration's own input, poll by poll, exactly
where the game reads the controls, and compare every pass. Menus,
movement, fights and spells all come in one run, and a port that
matches it byte for byte is the game's logic, not a likeness of it. For
what the demonstration never does, write short input scripts in the same
format and run them through both the port and the game's code in a 6502
simulator. The port must count polls, not time: the game's delay loops do
not read the controls, so a port paced by the clock drifts off the
recording within a menu or two.

## A whole game, checked against its own code

With no demonstration to replay, run the game's own code beside the port
and compare them pass by pass. On the C64, `kit/c64/machine.js` is the
machine for it: the simulator with a raster interrupt, the keyboard, the
joystick and colour RAM around it, started from the listing's memory,
counting passes where the main loop begins. `kit/c64/lockstep.js` runs a
port beside it and says what the port gives it: the checkpoints it
yields, its raster waits, its polling loops and its interrupt handlers.
Write the port to that from the start. Each file's header is its manual.

- **Port routine by routine, on the game's own memory.** One function per
  listing label, reading and writing the game's variables where the game
  keeps them, self-modified operands included. A routine that waits for
  the raster or for time becomes a generator that yields where time
  passes. Split the routines into groups, one agent each, with the routine
  addresses in the prompt.
- **Test each routine alone first**, against the game's routine run by the
  simulator (`cpu.call`) on thousands of random states made from real
  moments of play. Start calls with the stack pointer at `$FF`: a deep
  call chain started lower can run down into tables the game keeps in the
  stack page, and the failures look like the game's.
- **Then the whole loop in lockstep.** Make the port's main loop yield at
  checkpoints, the address of each call in its body. The lockstep runs the
  game to the same address and runs the interrupts it took on the way in
  the port there. It compares memory at the start of every pass, from
  saved moments of play with recorded input: `onPass` for input held over
  passes, `onFrame` for a key the game waits for in the middle of one. A
  checkpoint the game reaches that the port did not yield stops the run
  with both named. While a group is unfinished, the game's own code stands
  in for its routines (`standIn`). A polling loop in the port yields at
  each turn and the game moves on a raster line, so the port sees the
  line and the flags the game's loop does. A wait for a line yields the
  line, and the game runs to the loop's exit.
- **What lockstep cannot match is the game's own races.** The port runs an
  interrupt between two steps; the machine runs it wherever it falls. The
  lockstep closes most of that gap: each handler runs on the bytes the
  game's read, at the values it read them, and the game's last writer of
  each byte stands. What is left is the main code reading, in the middle
  of a stretch, what an interrupt wrote there: a scratch byte both use, a
  value the interrupt moves on. The results then depend on where the
  interrupt fell. When a difference survives, hook the machine at the
  addresses involved and look for an interrupt between the store and the
  read before calling it a port bug. Leave those bytes out of the
  comparison only once the race is shown, and say on the page what the
  port shows instead. A byte the port does not keep the game's way (a
  register a routine saves, where the port calls it without that
  register) differs now and then; name it and leave it out too.
  A raster wait that reads the line and then `$D011`'s bit 7 in two
  instructions is one such race: an interrupt between the reads makes
  the game leave on a later line than the port.
- **Read what the interrupt writes through one function.** The KERNAL's
  jiffy clock, its key code and its shift flag change under the main
  program, which may read one several times in a stretch between
  checkpoints and see different values. Have the port read each such
  byte through `P.io.irqByte(a)`, and list the bytes in the lockstep's
  `irqBytes`: it hands the port, one read at a time, every value the
  game read from each in the same stretch, in order (`kit/c64/lockstep.js`
  says how, and what it cannot see). On the page, `irqByte` is
  `a => M[a]`. Handing the port only the first value leaves every later
  read stale.
- **Pace it by the machine's clock.** A game that moves a fixed step per
  pass is only the same game at the same passes per second. The port
  executes no instructions, so fit their cost: the lockstep's `timing`
  gives, for each stretch between checkpoints, the cycles the game took
  (its interrupts excluded) and how often the port called each routine.
  Add the pixels drawn and rows filled from the port's own counters, and
  fit each routine's own cycles by non-negative least squares. Check the
  fit on sessions it was not fitted on, and on every kind of play the
  page offers: a scene the fit never saw can run fast by a routine it
  never costed. Then check the pace itself: passes in the same frames from
  the same moment, on the machine and on the page.
  Where one pass's cost follows mostly from the game's state (a state
  byte the main loop dispatches on), measure instead of fitting: hook the
  machine where each pass begins and ends, leave out the interrupt
  handler's own cycles, and take the median per state over the lockstep
  sessions. It needs no model of the routines, and a state the sessions
  never reached shows up as missing rather than as a wrong fit.
- **A level picker leaves the game as playing there would.** Jumping to a
  level by loading its record skips whatever finishing the ones before it
  left behind: items taken, counters, stored screens. Set that state
  first, the way the game's own code would, or the page shows a level no
  player could see (in one game, items left from a skipped level counted
  towards the next).
  A game with no level records can still have a picker: script a player
  through the game's own start (the menus, the name, the purchases) and
  run it faster than real time without drawing, setting by hand only what
  keys cannot reach, and only where the game itself would have set it.
  The state it hands over is then one play reached.
- **A clock, not a frame loop.** Each stretch moves a virtual PAL clock on
  by its cost, running the raster interrupts on their lines as it goes; a
  raster wait moves the clock to its line and the interrupts on the way
  take their own time, not the wait's. Let the page move a target one
  frame per real frame and run the port until the clock reaches it. Never
  "run to the next frame boundary": one long stretch then carries the clock
  frames ahead of real time and the game runs fast.
- **The page's own chips.** The page runs the port on chips of its own,
  not on `machine.js`, so it needs the chip behaviour the game leans on:
  the raster latch (the platform reference), the timers a speech or
  sample player counts on, sprite collisions if the game reads them.
  Run the page's runtime in node from the cold start before opening a
  browser: a game that stalls there (waiting for an interrupt the page
  never raises) stalls in the browser with nothing to say why.
