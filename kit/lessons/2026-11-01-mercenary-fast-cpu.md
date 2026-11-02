## 0.0.292 · 2026-11-01 · Mercenary (C64) · air with Claude

- **Follow the machine's pace view by view when the port has a cost model
  of its loop.** Mercenary moves the player a fixed step a pass, and a
  pass takes 4 to 13 PAL video frames, as long as its drawing does. A
  fixed K, the middle of those, would make a busy view faster than the
  C64 and an empty one slower. The Play tab's clock already counts each
  pass's cycles by the cost model it was fitted with, so Fast CPU reads,
  before each of the C64's passes, how many frames the C64 would take
  over the work the last loop did, and spreads that pass's steps over as
  many loops. On the C64's own clock the reading matched the frames the
  pass took in 296 of 304 passes walking and 243 of 306 flying. From the
  crash site, 20 s of walking ended 0.2 % from the C64's distance, 20 s of
  turning one pass's step apart, 10 s of level flight 0.55 % apart, and
  the panel's clock one frame apart.
- **Beat on the line the game waits for before it flips.** Mercenary's
  frame start waits for raster line 224 and then flips its buffers. A
  beat on line 224 of every PAL frame ends that wait at once, keeps every
  flip where the C64's falls against the raster interrupts, and needs no
  plug-in point for the wait. The kit's guide had given the game a 60 Hz
  beat of its own; a 60 Hz beat would have to skip the wait and would
  drift against the interrupts.
- **Ease what the game works out each pass from what changes once a
  pass.** Playing the Dart with Fast CPU, the contributor saw the horizon
  tilt in steps while the rest of the view glided. The game sets the roll
  ($28/$29) every pass from the turn rate ($22/$23), which it damps once a
  pass, so the roll changed on one loop of each shadow pass: in a test of
  banking and levelling out, in 27 of 401 loops, up to 5 units of the
  1,024 in a turn at once. Eased over the pass's loops, it moved in 72 of
  them, 1 unit at most, and stood at the game's value at the end of all
  31 shadow passes.
- **List the bytes that change only on a shadow pass's first loop.** Over
  30 s on foot and 40 s in the Dart, with random moves, 14 bytes did, each
  meant to: the event script, the turn rate, the speed and the attack
  ship's aim. With the bank's easing taken out the same run finds 18
  more, the roll and everything worked out from it (its sines and the
  horizon's step and fill), so the list would have found the bank before
  anyone played it. `games/c64/mercenary/test_fast.js` holds the list.
- **Count a mod's share from its job.** Targ Traffic, the page's mod,
  moves its cars and craft at the top of the main loop, after the game has
  drawn its objects for that loop. Counted from the shadow pass's first
  loop, the first loop drew each vehicle from the last pass's poses, a
  step backwards; counted from the job (`since`), a moving vehicle moved
  in 9,958 of 9,975 loops, where once a pass it moved in 1,006.
- **Hold the followed pace to the one the game plans for.** On the C64 a
  pass took 14 frames with seven keys in view, 11 in low flight over the
  city, 10 at the crash site, 8 in high flight and 6 walking north. The
  game brings the interstellar ship down in 780 passes and its panel calls
  that 2 MINS, 6.5 passes a second, so a pass longer than 8 frames is the
  processor falling behind, and a faster one would not. Nothing in the
  game breaks at a quicker pace, since all its logic runs per pass. With
  the contributor's choice of a cap at 8 frames (`most`), Fast CPU kept
  6.25 C64 passes a second standing at the crash site (the C64 5.05) and
  with the keys in view (the C64 3.60); 20 s of walking north stayed 0.5 %
  from the C64, 20 s of turning at the crash site covered 24 % more and
  10 s of level flight 35 % more, each within 1.2 % of the C64's own
  passes held to 8 frames.
- **Fast CPU for a game like this rests on the whole port.** Mercenary's
  needed the Play tab's cost model, fitted on the game's code for the
  lockstep, to follow its pace; a share at 19 routines that move
  something once a pass and at the moving objects 8 to 15 on each axis;
  and the 14 bytes the game changes once a pass, run once a pace or
  eased. Playing it found one of those, the bank; the test that lists
  every byte changing only on a pass's first loop found them all. The
  contributor's view, on 2 November 2026: Fast CPU for an arbitrary game
  of this kind cannot be done well without a deep dive into its systems
  and the scenes that draw at different rates.
