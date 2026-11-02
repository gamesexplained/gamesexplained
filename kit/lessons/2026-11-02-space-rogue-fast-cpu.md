## next · 2026-11-02 · Space Rogue (C64) · air with Claude

- **The game's own frame budget is its planned pace.** Space Rogue's main
  loop allows three PAL video frames a pass: it counts the frames each
  drawing took ($2E) and leaves the drawing out of the passes after a
  slow one until it is back to three (`frame_skip3`). Timed on the page's
  cost model over 20 s from each saved moment, the C64 made 12.4 to 16.5
  passes a second in nine of flight, 11.0 to 13.5 in six near a base and
  8.1 to 10.3 in eight fights, where it fell behind the budget. Fast
  CPU, held to three frames a pass (`most: 3`), made 16.7 in every one
  of them, 50.12 / 3: the C64's pass came to two and a half frames or
  more in 13,789 of 13,800 refreshes, so its shadow pass was three passes
  nearly everywhere.
- **Beat just after the interrupt.** The game waits for no screen line:
  its raster interrupt at line 50 counts the frame, scans the keyboard
  into a buffer and steps the sound. A beat on line 60 of every frame runs
  each pass with the keys the interrupt has just read. The view key then
  showed on screen 24 ms after the press on average, where the C64 took
  299 ms over 12 presses. A turn of the stick took 193 ms against the
  C64's 254: the game eases the stick an eighth of the way a pass, once a
  C64 pass with Fast CPU too, so the first turn waits for the easing.
- **Share a logarithm by its logarithm, and keep a decision for the
  pace.** The game keeps a computer ship's turning angle as a logarithm
  and makes no turn below 2^-8 radians. Its share is the logarithm less
  log2 K, and a share that falls under that floor is given whole once a
  pass, or a slow ship would never turn. Whether a ship turns, which way,
  and the change a cruising ship's thrust makes toward its wanted
  velocity are worked out on a shadow pass's first pass and kept for the
  others (`keep`): taken again each pass, the thrust would close the gap
  to the wanted velocity in one pass of the three, not shared over them.
  The player's rates, in whole 1,024ths of a turn a pass, take integer
  shares with the leftover carried. Flying straight, each of 99 shadow
  passes moved the ship by exactly its velocity.
- **Keep the game's calls at a plug-in point.** The page's clock charges
  a stretch of the port for the routines called in it. The first version
  moved each object by its share with its own sum, leaving out the
  game's `vec_add_lin`, and with Fast CPU off the clock was 463 cycles
  short of the page before it after the first passes of flight; the
  routine lockstep passed, since it compares memory, not time. With the
  share taken inside `vec_add_lin`, behind an argument the game never
  passes, 2,400 frames from power-on matched the old page's memory and
  clock at every frame.
- **Draw the beam again before each flip.** The game draws the player's
  beam on the buffer on show, so the C64 shows it while the next pass is
  drawn, about three frames. A pass that flips at once would never show
  it. Through the plug-in points `shown` and `again` it is drawn on each
  remaining pass's buffer just before that pass's flip: 30 beams fired
  with the stick were each drawn on the three passes of their shadow
  pass. A ship's beam, the window's flash and the hazards' triangles,
  drawn on the buffer being drawn, are drawn again on the later passes
  of their pace in the same way.
- **Show the screen as the pass leaves it.** A pass run at line 60 flips
  the buffers there, so the frame the video chip draws would show the old
  buffer above line 60. The game splits nothing within a frame, so the
  page renders the screen from the memory and registers as they stand
  after the refresh's last pass (`rt.fastFrame`), and 501 of 501
  refreshes showed the bank their last flip put up.
- **Leave flight in the C64's time.** Navigation Control, a save, the
  pause, a merchant's offer, docking with the stations and the gate's
  jump are called from inside the main loop. The runtime counts them
  (`AWAY`) and gives the port the game's own plug-in points while one
  runs: in 3 s of Navigation Control no pass of Fast CPU's started, and
  COCKPIT brought back 151 passes in the next 3 s.
- **List the state a save keeps, at a followed pace too.** Over all of
  memory, the bytes that changed only on a shadow pass's first pass were
  mostly the renderers' scratch, set by the cockpit's display every
  seventh pass. Scoped to the save ($0403-$0801) and to bytes that did so
  in a quarter of the shadow passes, 12 bytes did in 2,004 shadow passes
  of flight and four fights, each in a range meant to: the ships' minds,
  the turn rates, the lifetimes and the slots.
