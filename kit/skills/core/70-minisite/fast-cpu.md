# Fast CPU: a faster processor, kept playable

Read this when a Play tab offers Fast CPU (`play.md`). Fast CPU plays the
game as its machine would play it with a much faster processor. It keeps
the game playable. The game's own code runs unchanged. Only the time that
code takes changes. The code is shared: `site/lib/fast-cpu.js`. Each game
brings a table of its own facts and the plug-in points in its port. The
platform's reference skill says what the machine's clocks are.

## Words

- **Loop**: one run of the game's main loop. The machine's loops are
  slow. Fast CPU makes several loops in the time the machine made one.
- **Tick**: a moment at which Fast CPU may start a loop. "The frame
  limiter" says how often the ticks come.
- **Step**: what one of the machine's loops does to the game, such as
  how far it moves you. Fast CPU spreads each step over K loops, a share
  in each. "Once a step" means once every K ticks.
- **K**: the whole number of ticks one step takes. The game's table fixes
  it for each Speed setting, or the page's cost model gives it afresh for
  each step.
- **Speed**: how fast the game plays, in steps a second. The **Speed
  setting**, on a page that has one, chooses it.
- **Frame**: the view one loop renders.
- **Refresh**: one refresh of the player's display.
- **Video frame**: one frame of the machine's own screen.

The picture puts the machine and Fast CPU on one time scale, with K = 4.
The step ties the two together: one loop does it on the machine, and K
loops share it under Fast CPU.

```
THE MACHINE  (slow processor)
video frame  |.....|.....|.....|.....|.....|.....|     its screen, here 50 a second
loop         [========== one loop =========]           here 5 video frames
             \_______ does one STEP _______/           e.g. moves you 1 unit

FAST CPU  (same code, fast processor), K = 4
tick         ^    ^    ^    ^    ^    ^    ^    ^      60 a second
loop         L    L    L    L    L    L    L    L      at most 1 a tick
share        1/4  1/4  1/4  1/4  1/4  1/4  1/4  1/4    1/K of a step each
             \___ one STEP ____/ \___ one STEP ____/
frame        F    F    F    F    F    F    F    F      the view a loop renders
refresh      R    R    R    R    R    R    R    R      player's display: shows
                                                       the newest frame

SPEED = steps a second = 60 ticks / K = 15 here
        (the machine made 10)
```

The picture shows a 60 Hz display, so each refresh has one tick. A slower
display runs the loops owed at each refresh, up to the cap, and shows the
last one's frame ("The frame limiter").

## Which games

- **A game whose speed rides on its render qualifies.** It moves you a
  fixed step each loop, and often everything else too. It spends most of
  each loop rendering. So on its machine, its speed rises and falls with
  the view. A faster processor would make it faster. Fast CPU keeps it
  playable.
- **Time the machine's loops in play before deciding.** Time several
  minutes of play, in many places, on the game's own code. One game's
  loops took 0.2 to 3 s (`games/c64/castle-master`). Another's took 4 to
  13 video frames (`games/c64/mercenary`). A third made 8 to 16.5 loops a
  second (`games/c64/space-rogue`). The same timings set the speed (see
  "Step scaling").
- **A game that waits for its screen or its clock still qualifies if it
  falls behind.** One game waits for a line of the screen before each
  flip of its buffers (`games/c64/mercenary`). That wait caps it at one
  loop a video frame. Its loops take 4 to 13 video frames all the same.
  Another game leaves the drawing out of a loop when it falls behind
  (`games/c64/space-rogue`). It still moves once a loop. A game that waits
  for its clock every loop, and keeps up, gains nothing.
- **Choose the kind of Fast CPU by the game's speed.** An action game is
  played at its own speed (`games/c64/mercenary`, `games/c64/space-rogue`).
  It gets more frames at the same speed. It renders a frame each tick.
  Its speed stays the machine's own. It has no Speed setting, because a
  faster action game is another game. A very slow game
  (`games/c64/castle-master`) gets more frames and a faster speed. It
  renders 60 frames a second and has a Speed setting. It can go faster
  because its slowness on the machine is a wait, not part of the game.
- **Where a loop's length rides on the view, build Fast CPU on the whole
  port.** Following the machine's speed view by view needs a cost model
  of the loop. Fit the model on the game's own code. Giving each step in
  shares needs every routine that moves something once a loop. Each
  count or value the game changes once a loop must then run once a step,
  or be eased. A lockstep Play tab has that port and that clock
  (`play.md`). So build them first. Without them, the speed is a guess in
  every view nobody timed. A missed once-a-loop job shows only when
  someone plays there. A game that moves only the player, at a speed that
  is set, needs far less (`games/c64/castle-master`).

## Two pieces, and nothing else

Fast CPU adds two pieces. The **frame limiter** lets the main loop go
round at most 60 times a second. **Step scaling** scales what the game
counts in loops. Then the speed that is set decides how fast you move,
and the frame rate does not. Fast CPU has six aims, highest first. When
two aims clash, the higher one wins.

1. **Off means off.** With Fast CPU loaded and off, the machine is the
   same as without it. Every byte and every cycle match. So the lockstep
   still proves the port.
2. **The mechanics are the game's.** Everything that happens is something
   the game's code would do. What the game times by its clock keeps its
   time in seconds.
3. **The keys answer at once.** You stop the moment you let go. No press
   is lost or taken twice. This aim outranks copying the machine's step
   exactly. The page states what that changes.
4. **Same keys, same game.** The same keys give the same game on any
   display, at any refresh rate, on a fast or a slow computer.
5. **The speed is set, and the frame rate is not.** The speed is the
   machine's usual speed, or the Speed setting's. Or it follows the
   machine's own speed view by view, held to the speed the game plans
   for. It is never how fast the page draws.
6. **Every frame is the game's.** Each frame shown is one the game
   rendered. It is shown on the first refresh after its loop.

## The frame limiter

- **Tick 60 times a second, and start at most one loop a tick.** Sixty is
  a rate the machine's screen shows on some model. Most displays refresh
  at it too. So each frame stays up for one refresh. A loop's own work
  takes no time. A processor that fast would finish it long before the
  next tick.
- **Tick on the game's own clock when that clock runs 60 times a
  second.** Then the loops and the clock line up one to one
  (`games/c64/castle-master`'s timer). Some games time play by a slower
  clock, such as the screen's 50 video frames a second
  (`games/c64/space-rogue`). Such a game gets ticks of its own, counted in
  the machine's cycles. Its own clock goes on counting at its own rate.
  So what it times keeps its time in seconds.
- **Put such a tick just after the interrupt that reads the keys**
  (`games/c64/space-rogue`, a line after its interrupt's). Each loop then
  takes the keys the interrupt has just read. Its frame shows in the
  refresh that runs it.
- **A game that waits for a line of its screen before each flip can tick
  on that line, once a video frame** (`games/c64/mercenary`). Its wait
  then ends at once. Its flips fall where the machine's do against the
  interrupts. A display at the machine's frame rate shows every frame for
  the same time. A 60 Hz display shows one frame in five twice.
- **Otherwise, a wait for the screen's beam before a flip does not hold
  the loop.** On the machine, the wait keeps the frame whole. The page
  shows whole frames anyway. The wait would hold the loop to the
  machine's own frame rate. Make it a plug-in point.
- **Each refresh, run the loops owed, up to the cap, and drop the rest.**
  The cap is 60 over 15: 4 loops. It keeps real time on a display as slow
  as 15 Hz. It also stops one slow refresh setting off a longer one. Check
  that four loops fit in one 60 Hz refresh.
- **A wait inside a loop keeps its time in seconds.** The next loop starts
  on the first tick after the wait. The game's timing is part of the
  game. A delay loop that counts the processor's own instructions would
  end at once on a fast processor. Time such a delay as on the machine.
- **A wait that only keeps something on screen does not hold play.** On
  the machine, the slow render nearly always used that time up. On a fast
  processor, the wait would freeze play. So play goes on. What the wait
  kept on screen still comes down after the same time.
- **The clock has one command.** The page's runtime has
  `runTicks(cycles, loop)`. `cycles` is the time owed, in the machine's
  cycles. `loop.start` is where a loop starts. `loop.work` is where the
  stretches of the loop's own work start. `loop.cap` is the cap.
  `loop.between()` is called after each loop. The command returns the
  number of loops run. `rt.ticks` counts the ticks. A second way of
  counting a loop's cost would make the game depend on something besides
  its code and the clock.
- **Outside the main loop, the machine keeps its own speed.** The title,
  the menus and loading are not play. So do the routines the loop calls
  that leave play for a while, such as a menu, a dialog or docking. Count
  them while they run, and give the port the game's own plug-in points
  meanwhile (`games/c64/space-rogue/port/page/runtime.js`, `AWAY`). Their
  waits and counts are the machine's.

## Step scaling

- **What the game counts in time stays. What it counts in loops is
  scaled.** Fast CPU makes many loops where the machine made one. Without
  scaling, anything counted in loops would happen that many times as
  often.
- **Each loop takes 1/K of a step.** Each share goes through the game's
  own step code. The part of a unit left over is carried to the next loop
  while the key is held. So in open space, K shares end where one step
  ends.
- **Share a number the game keeps as a logarithm by its logarithm.** Take
  log2 K from it (`parts`). A share can fall below the least the game acts
  on, such as a turn too small to make. Then give the whole step once a
  step instead, or the move stops.
- **Work out once a step what the game works out from where things stood
  as its loop began.** One example is a change toward a target, such as
  an engine closing a craft's velocity on a wanted one, the rest of the
  way in one go. Another is a decision, such as whether a craft turns.
  Taken again each loop, either would act K times, or change partway
  through the step. Keep the first loop's value for the step's other
  loops, and give it in shares (`keep`).
- **List everything a loop does once, and give each a plug-in point.** The
  list holds the player's moves and every other object's move. It holds
  every chance rolled and every count of loops. It holds what is shown
  for one loop, and every script a move sets off. A game that moves only
  the player needs few (`games/c64/castle-master`). Another game moves
  every craft each loop and counts loops in its countdowns
  (`games/c64/mercenary`, `games/c64/space-rogue`). It needs a share in
  every mover. It needs every count run once a step. At 60 frames a
  second, every move must go in shares.
- **Follow the machine's speed when the page has a cost model of its
  loop.** Before each step, the model gives K: the ticks the machine
  would take over the work the last loop did. That many loops make one
  step, and each takes its share of it. So every view moves at the
  machine's speed. A busy view is slow and an empty one quick
  (`games/c64/mercenary`, the table's `follow`). The jobs that run once a
  step run on the first of its loops. Each carry keeps its share of a
  unit when K changes.
- **Hold the followed speed to the speed the game plans for.** A loop
  slower than that is the processor falling behind in a crowded view. A
  faster processor would not fall behind. So that slowness is no part of
  the game. A game that does all its logic once a loop keeps working at a
  steadier speed. What a quicker speed changes is the time a player has
  to react. Find the planned speed in the game's own words: a countdown
  of so many loops that the game or its manual calls so many seconds. Or
  find it in the game's code: a loop that leaves out its drawing until it
  is back to so many video frames a loop plans that speed
  (`games/c64/space-rogue`).
  Time the machine's loops in its busiest and its emptiest views. Set the
  most ticks a step may take (the table's `most`). Make it the nearest
  whole number of ticks that is no quicker than the planned speed. Views
  quicker than that limit keep the machine's speed.
- **Ease what the game works out each loop from a value that changes once
  a step.** The moves glide a share each loop. A value set from a
  once-a-step value still jumps once a step. A craft's bank is one: the
  game sets it from a turn rate that it damps once a step. Among frames
  that glide, the jump shows. Give such a value a plug-in point
  (`ease`). It moves the value to the game's value over the step's loops.
  It reaches the game's value on the last of them. The page's own code
  may also move something once a step, such as a mod's traffic. Draw that
  thing the share of a step gone since it moved (`since`). Count the share
  from the job that moved it. The game may draw before that job runs in
  the same loop.
- **Find what still jumps once a step by listing it, not by playing.** Run
  Fast CPU in every way the player moves. List the bytes that change only
  on the first loop of a step. Each is a count meant to run once a step,
  or a value to ease. The test holds the list, with the reason for each
  byte. A byte that joins the list fails the test
  (`games/c64/mercenary/test_fast.js`).
- **At a fixed speed, list the state that changes in most steps.** At a
  fixed speed, no loop is the first of a step. Look only at what the game
  carries from loop to loop: what a saved game keeps. In it, list the
  bytes that change in a good share of the steps. Keep the bytes whose
  changes are nearly always a whole number of steps apart. The renderers'
  own bytes follow a steady move at steady rates. Some of those rates are
  a whole number of steps. But a view drawn afresh from the state jumps
  only where the state does. Break a move on purpose: give a walk whole,
  once a step. Check that the listing finds it
  (`games/c64/castle-master/test_fast.js`).
- **Take the speed from the machine's timings.** Without a cost model, a
  game kept at the machine's speed takes K from the middle of the
  machine's loops in play. When the game aims at a speed of its own, K
  comes from that speed instead: the fixed number of video frames the
  game allows a loop.
  For a faster speed, put the slowest Speed setting at the machine's
  quickest loop in play. Time that loop while turning and while walking,
  from every saved moment. Make the other settings faster still. A faster
  processor is nowhere slower than the machine. A setting at the middle
  of the machine's loops would be several times slower than the machine
  wherever little is in view (`games/c64/castle-master`). A faster setting
  covers more ground between the clock's events, as a faster machine
  would.
- **Scale each kind of job by what scaling does to it.** Some jobs end
  the same however often they run, such as a script that shows or hides
  objects by flags. These run every loop. Other jobs add up with each
  call, such as a script that counts or a roll of the dice. These run once
  a step. What the game shows for one loop is shown for a whole step.
- **Read every job a move sets off before letting it run every loop.** Some
  jobs count their calls, not the distance. A wall check that cuts each
  blocked step short is one. A roll each loop and a count of loops are
  others. Run every loop, such a job acts K times as often.
- **Measure each difference and state it on the page.** The game cuts a
  step short at a wall. Under Fast CPU, the rest is thrown away a share at
  a time. So the player slides along walls that the machine stops them
  at. Measure it from the port's saved moments, against the machine's own
  walks.

## Controls

- **Sort each key by what the game's code does with it.** A move takes its
  share each loop. It takes nothing once the key is up. So the player
  stops in the loop where the key comes up. A switch acts once, when the
  key goes down. Repeating it would undo it. A repeat acts at the press
  and then every K ticks. A modifier key can make a move repeat. Read that
  modifier as the game reads it.
- **Hold every key down for at least three of the machine's video
  frames.** The first loop that reads the key counts it. So no press goes
  missing.
- **A key the game's interrupt puts in a buffer is taken once from it.**
  The interrupt's repeat keeps its time in seconds. So such a key needs
  no entry as a switch or a repeat.
- **A speed of the game's own stays the machine's.** The machine may move
  something in a loop that renders no view, such as a pointer. That loop
  takes the same time everywhere. Measure it on the game's own code. Each
  of Fast CPU's loops moves the thing by its share of that time.

## Display

- **Render each frame from the draw list the game's loop left, and only
  read it.** Writing into the game's memory would make the game depend on
  the page.
- **The copy to the screen decides what is new.** A game that double
  buffers renders off screen. Then it copies or flips the result onto the
  screen. Read whether the 3D view is on show from the game's state at
  that copy, once a loop. Don't compare the screen's bytes each
  refresh.
- **A share of a turn is a fractional angle.** The game builds its view at
  that angle for every job that uses the view, such as what is in sight
  and what a shot hits. So what you see and what happens agree. The
  renderers draw the same draw list at the same angle. At the game's own
  angles, the frame is the game's own.
- **Show each frame on the first refresh after its loop.** Never render
  between two loops. Never hold a frame back. Either would show the game
  late, in frames it never rendered.
- **A game that splits nothing within a video frame can be shown as its
  memory stands after the loop** (`games/c64/space-rogue`, `rt.fastFrame`).
  A loop run on a tick inside the video frame flips its buffers there. The
  video frame the machine draws would show the old buffer above that line.
- **Draw again what the game draws for one loop.** The machine keeps a
  drawing on the buffer on show until its loop's flip, such as a beam
  drawn between two flips. It keeps a drawing on the buffer it is drawing
  for one loop's frame, such as a flash. A loop that flips at once would
  hide the first and show the second for one tick. Keep each for the rest
  of the step. Draw it again on each loop's buffer where the game would,
  the first before the flip (`shown` and `again`).
- **Fast CPU replaces Smooth motion once it is shown faithful on that
  game.** Shown faithful means its tests pass and the page states each
  measured difference. Then Fast CPU gives the frame rate Smooth motion
  gave, in frames the game rendered. Until then, the game keeps Smooth
  motion beside Fast CPU (`play.md`, "Native resolution and smooth
  motion").

## The code

- **The clock** is the page's runtime's `runTicks`, written for each port.
- **Fast CPU** is `site/lib/fast-cpu.js`. It handles the kinds of key,
  the shares with their leftovers carried, the once-a-step jobs, the held
  displays and the speed. A game kept at its own speed has one setting,
  and its page shows no Speed setting. The file's header lists the
  table's fields. A game's table sits in its port
  (`games/c64/castle-master/port/page/fast-table.js`).
- **Plug-in points** are marked places in the port's routines. At each,
  Fast CPU passes in a value or skips a job. With nothing plugged in, each
  gives the game's own value. So the lockstep holds the port with them in
  place. `games/c64/castle-master/port/src/core.js` lists the kinds. Every
  place where Fast CPU changes a loop is a plug-in point.
- **A plug-in point keeps every call the routine makes.** The page's
  clock may cost a stretch of code by the routines called in it. A share
  worked out in place of the game's routine would then move the clock
  with Fast CPU off. Put the share inside that routine, behind an
  argument the game never passes
  (`games/c64/space-rogue/port/src/g-vec.js`, `vec_add_lin`). Check "off
  means off" against the page as it was before the plug-in points went
  in, frame by frame, memory and clock. Check it against the page with
  Fast CPU unloaded too.
- **The renderers** are unchanged. Each refresh, they render the last
  loop's draw list, when it is new.
- **Leave out** copies of the game's routines, code that writes into the
  game's memory and puts it back, anything timed by refreshes, and frames
  rendered between loops.

## Tests

Test every rule on the published page, in node
(`games/c64/castle-master/test_fast.js`). The tests cover:

- off means off;
- one loop a tick, and the cap;
- the same keys giving the same memory at different refresh rates and
  Speed settings;
- the clock's jobs at the same moments with Fast CPU on and off;
- K shares ending where one step ends;
- the speed at each Speed setting;
- a switch acting once a press;
- stopping in the loop where the key comes up;
- a wait that only keeps something on screen;
- long random play;
- no state that jumps once a step;
- each refresh showing its own last loop's frame.

Measure what decides between Fast CPU and Smooth motion, in node.
Simulate refreshes at 50, 60 and 144 Hz. Measure the delay from pressing
a key to the first frame that moves. Measure the delay from letting go
to the last frame that moves. Compare both with the machine's delays and
Smooth motion's. Measure in node, because a headless browser's timing is
its renderer's, not the game's. Count the loops that read the keys, not
every loop. A loop can return before it reads them.

In a browser, check that the view stops when a key comes up. Check also
that a short press of a switch acts once at every Speed setting
(`games/c64/castle-master/port/test/fast-browser.js`). Run that check by
hand where CI has no browser.
