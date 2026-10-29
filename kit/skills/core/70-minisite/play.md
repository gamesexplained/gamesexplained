# Play: a port of the whole game

Read this when you build a Play tab (`70-minisite`, "Play"). The port is
checked against the game itself, not against a reading of it, in one of
two ways: by the game's own demonstration, or by running the game's code
beside the port. The game's code runs only there, in the tests: the page
runs the port (`SKILL.md`, "Play").

## A demonstration is the test

If the game has a demonstration that replays recorded input, that is the
test for the whole port: record it, feed the port its input and compare
every pass, as `kit/skills/core/65-inputs` says. Menus, movement, fights
and spells all come in one run, and a port that matches it byte for byte
is the game's logic, not a likeness of it. Run the input scripts for what
the demonstration never does through both the port and the game's code
in the kit's simulator for the machine's processor
(`kit/skills/<platform>/steps`, "simulator").

## A whole game, checked against its own code

With no demonstration to replay, run the game's own code beside the port
and compare them pass by pass. The machine for it is the kit's simulator
with the machine's interrupt, its keyboard and its other inputs around
it, started from the listing's memory or a snapshot of play, counting
passes where the main loop begins (`kit/skills/<platform>/steps`,
"machine"). The platform's lockstep runs a port beside it and says what
the port gives it: the checkpoints it yields, its waits for the display
(a raster line on the C64, a `HALT` on the Spectrum), its polling loops
and its interrupt handlers (`kit/skills/<platform>/steps`, "lockstep").
Write the port to that from the start. A game that reads whole typed
lines through the machine's ROM, or loads from disk as it plays, may
need a different harness, and the same row says which. Each file's
header is its manual. A platform with no machine yet has no lockstep:
build one in `kit/<platform>/` first, or check the port by its
demonstration.

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
  stack page, and the failures look like the game's. A routine that waits
  for a frame is tested the same way with `checkGen` on the C64
  (`kit/c64/lockstep.js`): the port's generator and the game's routine
  run side by side, each to its next poll, the frame counter moves on in
  both, and their memories are compared at every poll.
- **Then the whole loop in lockstep.** Make the port's main loop yield at
  checkpoints, the address of each call in its body. The lockstep runs the
  game to the same address and runs the interrupts it took on the way in
  the port there. It compares memory at the start of every pass, from
  saved moments of play with recorded input: `onPass` for input held over
  passes, `onFrame` for a key the game waits for in the middle of one. A
  checkpoint the game reaches that the port did not yield stops the run
  with both named. While a group is unfinished, the game's own code stands
  in for its routines (`standIn`). On the C64 a routine that waits stands
  in as a generator (`standInGen`), which yields at each turn of the
  game's polling loop, so the whole program runs in lockstep with one
  group ported. A polling loop in the port yields at
  each turn and the game moves on a raster line, so the port sees the
  line and the flags the game's loop does. A wait for a line yields the
  line, and the game runs to the loop's exit; a HALT yields that it
  halts, and the game runs through its interrupt to the instruction
  after.
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
  fit each routine's own cycles by non-negative least squares. Leave a
  polling loop's cycles out of what is fitted: the page's clock runs its
  turns for itself, a line at a time, so a cost that holds the wait pays
  it twice and the page runs late. Check the
  fit on sessions it was not fitted on, and on every kind of play the
  page offers: a scene the fit never saw can run fast by a routine it
  never costed. Then check the pace itself: passes in the same frames from
  the same moment, on the machine and on the page. Count the page's pass
  once its clock reaches the checkpoint, the stretch that leads there
  paid, not when the port yields it: the yield comes before the clock
  moves, so a long stretch (a room drawn) counts the pass early by its
  own length, and the check passes a page that is slow.
  Give the lockstep every key the game reads (a pause key, a key a
  prompt waits for) and every way out of play, forcing each in turn
  where play seldom reaches it, then drive the page's runtime alone the
  same way and fail on a stretch it meets with no cost: a stretch no
  session measured costs the page nothing, and a loop along it that
  waits on the interrupt, such as a pause waiting for its key, stands
  the page's clock still for good. Give a yield that names no cycles of
  its own a line when its stretch has no cost, so that a path no session
  reached runs slow instead of stopping.
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
  frames ahead of real time and the game runs fast. A turn of a polling
  loop moves the clock to the start of the next line, not a line on from
  wherever it stands: with a read of the raster that takes cycles of its
  own, a whole line a turn steps over a line every few turns, and a loop
  waiting for that line misses its frame. Draw the frame due at the
  target, not the newest one finished: a stretch that carries the clock
  past the target (an interrupt that holds the main program back)
  finishes a frame early, and showing it skips one.
- **The page's own chips.** The page runs the port on chips of its own,
  not on `machine.js`, so it needs the chip behaviour the game leans on:
  the raster latch (the platform reference), the timers a speech or
  sample player counts on, sprite collisions if the game reads them.
  On the C64 the collisions are `site/lib/collide.js`, the model
  `machine.js` runs with `collide: true`, held against VICE: give it
  the page's clock at each read and write of the chip, take its
  interrupts when the game enables them, and never write a model of
  your own.
  Run the page's runtime in node from the cold start before opening a
  browser: a game that stalls there (waiting for an interrupt the page
  never raises) stalls in the browser with nothing to say why.
- **Memory as the beam meets it.** The page draws the last whole frame
  while the port runs the next, so a frame needs memory of its own:
  `C64.videoMemory` (`site/lib/c64.js`) keeps memory and colour RAM as
  each frame began and puts each later change in the frame's writes
  where the game made it, for `renderFrame` to apply as the beam gets
  there. Call its `at` each time the clock moves and its `begin` as each
  frame starts, and give it the `keep` the page draws with. Drawn over
  memory as it stood at either end of the frame, a game that moves text
  a character in memory and a pixel in the fine scroll, or fills a row
  just before the beam reaches it, shows the text a character out for a
  frame (in two games, two scrolling lines and a car steered across a
  road). Hold every line that scrolls with a test that draws the page's
  frames in node, as the page does, and allows each line only the moves
  the game makes from one drawing to the next
  (`games/c64/storm/test_screen.js`): the lockstep compares memory and
  never the picture, so it passes a page that draws a change a frame
  late.

## Native resolution and smooth motion

A 3D game's Play tab can offer two switches: the 3D view drawn at the
screen's own resolution, and moved at the screen's frame rate from one
of the game's pictures to the next (`port/page/modern.js`). They are
views of the port, never changes to it. Smooth motion shows the game
behind its own frames, so Fast CPU (`fast-cpu.md`) replaces it in a game
once Fast CPU is shown faithful there.

- **Read, never write.** Watch the port's routines and read the game's
  memory. Hold that with two machines side by side, one with the view
  attached and asked for a smooth view several times a frame: every
  byte the same at every frame.
- **Read the scene where the game builds it.** By the time the game
  draws, what it drew from can be painted over (a game can keep its
  objects' bounds in the view's own buffer) or old (a redraw with no
  rebuild before it draws the last rebuild's objects).
- **Take the game's choices.** Draw the objects the game queued for the
  picture, sorted by its own sort on its own bounds, and leave a face
  out by the game's own test on its corners as the game rounds them. A
  sort that is not a strict order moves the others when the page keeps
  one object more: in one game a sliver a pixel across reordered one
  view in sixty until the page read the game's queue.
- **Pace the glide by when the next picture is known and when it is
  shown.** The page's machine runs a pass when its clock reaches it, so
  the next picture is known only from then. Glide from that moment to
  the first frame that shows it; paced by the blits alone, the view
  stalls or jumps at every picture.
- **Test it against the game's drawing.** At each picture the game
  draws, the same objects in the same order, the same faces, corners
  within the rounding and, in the C64's pixels, the game's own buffer
  but for a pixel at the edges; the smooth view never moving back and
  arriving as the C64 shows each picture.

## Fast CPU

A game whose speed rides on its render can offer Fast CPU: the game as
its machine with a much faster processor would play it, at 60 frames a
second, kept playable. Read `fast-cpu.md` beside this file before you
start one.

## The page's test

`test_play.js` (or `test_play.py`) beside `play.html` runs the page as it
is published, on a clean checkout: beside the game's own code in the
lockstep when the listing holds what that needs, or else against what the
port's own tests measured on the game. `test_kit.py` finds it, so CI holds
the published page. Platinum needs it, and `build.py` stops on a Platinum
game without one.

## What the port finds in the listing

Porting a routine means reading every instruction of it, and the
lockstep shows where that reading was wrong. Correct each comment the
port shows wrong in `symbols.json`, rebuild the listing, and keep count.
When the port is done, add a `play` row to `accuracy` in `game.json`,
after whatever came before it, with that count as `fixed` and the models
that wrote the port (`60-verify`, "What the repository keeps"). The row
says the port happened and what it corrected; it is not an audit, since
the port reads the code it needs and not every comment, so it changes
nothing the page says about whether the listing is checked.
