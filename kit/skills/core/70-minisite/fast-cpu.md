# Fast CPU: a faster processor, kept playable

Read this when a Play tab offers Fast CPU (`play.md`): the game as its
machine with a much faster processor would play it, kept playable. The
game's own code runs unchanged and only the time it takes changes. The
code is shared (`site/lib/fast-cpu.js`); a game brings a table of its own
facts and the plug-in points in its port. What a machine's clocks are is
in the platform's reference skill.

## Which games

- **A game whose speed rides on its render qualifies.** It moves you, and
  often everything else, a fixed step each loop and spends most of the
  loop rendering, so on its machine its speed rises and falls with the
  view: a faster processor would make it faster, and Fast CPU keeps it
  playable.
- **Time the machine's loops in play before deciding.** Several minutes in
  many places, on the game's own code: a loop of 0.2 to 3 s
  (`games/c64/castle-master`), 4 to 13 video frames
  (`games/c64/mercenary`), 8 to 16.5 loops a second
  (`games/c64/space-rogue`). The same figures set the pace below.
- **A game that waits for its screen or clock still qualifies when it
  falls behind.** A wait for a line of the screen before each flip of the
  buffers (`games/c64/mercenary`) caps the loop at one a video frame,
  but its loops take 4 to 13; a game that leaves the drawing out of a loop when it falls
  behind (`games/c64/space-rogue`) still moves once a loop. A game that
  waits for its clock every loop and keeps up gains nothing.
- **Choose the kind of Fast CPU by the game's pace.** An action game,
  played at its own pace (`games/c64/mercenary`, `games/c64/space-rogue`),
  gets more frames at the same pace: 60 frames a second, the pace fixed
  at the machine's usual one and no Speed to set, because a faster pace
  is another game. A very slow game (`games/c64/castle-master`) gets more
  frames and a faster pace: 60 frames a second and a Speed, because its
  machine's pace is a wait rather than the game.

## Two pieces, and nothing else

Fast CPU adds a **frame limiter** (the loop goes round at most 60 times
a second) and **step scaling** (what the game counts in loops is scaled,
so the pace that is set decides how fast you move, not the frame
rate). When two aims clash the higher wins:

1. **Off means off.** Loaded and off, the machine is the same as without
   it, every byte and every cycle, so the lockstep still proves the port.
2. **The mechanics are the game's.** Everything that happens is something
   the game's code would do, and what the game times by its clock keeps
   its time in seconds.
3. **The keys answer at once.** You stop the moment you let go, and no
   press is lost or taken twice; this beats copying the machine's step,
   and the page states what it changes.
4. **Same keys, same game.** Any display, any refresh rate, a fast or a
   slow computer: the same game.
5. **The pace is set, not the view.** One pace whatever is on screen:
   the machine's usual one, or the Speed's.
6. **Every frame is the game's.** Each frame shown is one the game
   rendered, on the first refresh after its loop.

## The frame limiter

- **Start a loop 60 times a second, never two on one beat.** Sixty is a
  rate the machine's screen shows on some model and most displays
  refresh at, so each frame stays up for one refresh. The loop's own work
  takes no time, as on a processor that finishes it long before the next
  beat.
- **Beat on the game's clock when it ticks 60 times a second.** Then
  loops and ticks line up one to one (`games/c64/castle-master`'s
  timer). A game timed by a slower clock, such as its screen's 50 video
  frames a second (`games/c64/mercenary`, `games/c64/space-rogue`), gets
  a beat of its own counted in the machine's cycles, and its clock goes
  on counting its own ticks, so what it times keeps its time in seconds.
- **A wait for the screen's beam before a flip does not hold the loop.**
  On the machine it keeps the picture whole; the page shows whole frames
  anyway, and the wait would hold the loop to the machine's own frame
  rate. Make it a plug-in point.
- **Run the loops owed each refresh, at most the cap, and drop the
  rest.** The cap is 60 over 15, 4 loops, which keeps real time on a
  15 Hz display and stops one slow refresh setting off a longer one;
  check that four loops fit in a 60 Hz refresh.
- **A wait inside a loop keeps its time in seconds.** The next loop
  starts on the first beat after it, because the game's timing is the
  game. A delay loop that counts the processor's own instructions would
  end at once on a fast one: time it as on the machine.
- **A wait that only keeps something on screen does not hold play.** On a
  fast processor it would freeze play for a time the machine's slow
  render nearly always used up; play goes on, and what it kept up goes
  back after the same time.
- **One command for the clock.** The page's runtime has `runTicks(cycles,
  loop)`: the time owed in the machine's cycles, `loop.start` where a
  loop starts, `loop.work` where the stretches of its own work start,
  `loop.cap`, and `loop.between()` after each loop; it returns the loops
  run, and `rt.ticks` counts the beats. A second way of counting a
  loop's cost makes the game depend on something other than its code
  and the clock.
- **Outside the main loop the machine keeps its own speed.** The title,
  menus and loading are not play.

## Step scaling

- **What the game counts in time stays; what it counts in loops is
  scaled.** Fast CPU makes many loops where the machine made one, so a
  thing counted in loops would happen that many times as often.
- **Each loop takes 1/K of a step.** K is the whole number of beats one
  of the machine's loops takes at the pace that is set. Each share goes
  through the game's own step code, the part of a unit left over carried
  to the next loop while the key is held, so in open space K shares end
  where one step ends.
- **List everything a loop does once, and give each a plug-in point.**
  The player's moves, every other object's move, every chance rolled,
  every count of loops, what is shown for one loop, every script a move
  sets off. A game that moves only the player (`games/c64/castle-master`)
  needs few; one that moves every craft each loop and counts loops in
  its countdowns (`games/c64/mercenary`, `games/c64/space-rogue`) needs a
  share in every mover and a once-a-pace in every count, since 60 frames
  a second needs every move in shares.
- **Take the pace from the machine's timings.** For the same pace, K is
  the middle of its loops in play, or the pace the game itself aims at
  when it has one (a loop it allows a fixed number of frames). For a
  faster pace, put the slowest setting at the machine's quickest loop in
  play, timed while turning and while walking from every saved moment,
  and the others faster still: a faster processor is nowhere slower than
  the machine, and a setting at the middle of its loops is several times
  slower than the machine wherever little is in view
  (`games/c64/castle-master`). A faster setting covers more ground
  between the clock's events, as a faster machine would.
- **Scale each kind of job by what scaling does to it.** A job that ends
  the same however often it runs (a script that shows or hides objects
  by flags) runs every loop; one whose effect adds up with each call (a
  script that counts, a roll of the dice) runs once every K beats; what
  the game shows for one loop is shown for K beats.
- **Read every job a move sets off before letting it run every loop.** A
  job that counts its calls rather than the distance (a wall check that
  cuts each blocked step short, a roll each loop, a count of loops) acts
  K times as often.
- **Measure each difference and say it on the page.** A step the game
  cuts short at a wall throws its rest away a share at a time, so the
  player slides along walls the machine stops them at: count it from the
  port's saved moments against the machine's own walks.

## Controls

- **Sort each key by what the game's code does with it.** A move takes
  its share each loop and nothing once the key is up, so the player stops
  in the loop where it comes up; a switch acts once when the key goes
  down, because a repeat would undo it; a repeat acts at the press and
  every K beats. A modifier that makes a move repeat is read as the game
  reads it.
- **Hold every key for at least three of the machine's video frames.** The
  first loop that reads it counts it, so no press goes missing.
- **A pace of the game's own is kept as the machine's.** Something the
  machine moves in a loop that renders no view (a pointer) takes the same
  time everywhere; measure that loop on the game's code and move it by
  its share.

## Display

- **Render each frame from the draw list the game's loop left, and only
  read it.** Writing into the game's memory makes the game depend on the
  page.
- **The copy to the screen decides what is new.** A game that double
  buffers renders off screen and then copies or flips: read whether the
  3D view is on show from the game's state at that copy, once a loop,
  rather than comparing the screen's bytes each refresh.
- **A share of a turn is a fractional angle.** The game builds its view at
  that angle for every job it uses the view for (what is in sight, what a
  shot hits), so what you see and what happens agree; the renderers draw
  the same draw list at the same angle, and at the game's own angles the
  frame is the game's own.
- **Show each frame on the first refresh after its loop.** Never render
  between two loops or hold a frame back: either shows the game late, in
  frames it never rendered.
- **Fast CPU replaces Smooth motion once it is shown faithful on that
  game.** Its tests pass and the page states each measured difference;
  then it gives the frame rate Smooth motion gave, in frames the game
  rendered. Until then the game keeps Smooth motion beside it (`play.md`,
  "Native resolution and smooth motion").

## The code

- **The clock** is the page's runtime's `runTicks`, written for each port.
- **Fast CPU** is `site/lib/fast-cpu.js`: the kinds of key, shares with
  the leftover carried, once-a-pace jobs, held displays, the pace (one
  setting for the same pace, and the page shows no Speed). Its header
  lists the table's fields; a game's table sits in its port
  (`games/c64/castle-master/port/page/fast-table.js`).
- **Plug-in points** are marked places in the port's routines where Fast
  CPU passes in a value or skips a job. Each gives the game's own value
  when nothing is plugged in, so the lockstep holds the port with them
  (`games/c64/castle-master/port/src/core.js` lists the kinds). Every
  place Fast CPU changes a loop is one.
- **The renderers** are unchanged: each refresh they render the last
  loop's draw list, when it is new.
- **Leave out** copies of the game's routines, code that writes into the
  game's memory and puts it back, anything timed by refreshes, and frames
  rendered between loops.

## Tests

Test every rule on the published page in node
(`games/c64/castle-master/test_fast.js`): off means off, one loop a beat
and the cap, the same keys giving the same memory at different refresh
rates and settings, the clock's jobs at the same moments on and off, K
shares ending where one step ends, the pace at each setting, switches
once a press, stopping in the loop where the key comes up, a wait that only
keeps something up, long random play, and each refresh showing its own
last loop's frame. Count the loops that read the keys rather than the
loops, since a loop can return before it reads them. In a browser, check
that the view stops when a key comes up and that a short press of a
switch acts once at every setting
(`games/c64/castle-master/port/test/fast-browser.js`, run by hand where
CI has no browser).
