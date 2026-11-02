# Driller — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Spectrum Computing, entry 1521, `https://spectrumcomputing.co.uk/entry/1521/ZX-Spectrum/Driller`, read 2 November 2026: credits, controls, awards, the files below
- The manual, "Federation Briefing", Incentive Software 1987, as `Driller.pdf` on that page (a re-typeset of the 32-page booklet with its page numbers), read 2 November 2026: pages 24 to 32 are the mission, the console, the information screen, drilling, the probe, the jet, laser beacons and Skanners, energy and hints
- The Spanish instructions of the Musical 1 re-release, `Driller(Musical1S.A.).txt` on that page, read 2 November 2026: the key list and the security station
- Crash, March 1988, page 42, the map `games-maps/Driller.jpg` on that page, read 2 November 2026: the sectors, the Spectrum keys
- The game's own screens and stored text (`work/play-start.sna`)

## Features

| Feature | Status | Where |
|---|---|---|
| Security input station: a page, line and word of the Federation Briefing to type before play | live | answered with IMPROVE for page 17, line 4, word 1; the table of 128 words is at `$ABC1`, checked against the manual; `security`, `$CB7A` |
| Three wrong answers end the game | confirmed | the counter at `$CAA6`; on 3 it clears memory and jumps to `$0000`; the Play tab's port wipes its machine the same way (`test_play.js`) |
| Control options: keyboard, Sinclair, Kempston or Cursor joystick | live | menu text at `$C932`; `control_options`, `$C9C6`, puts each joystick's keys in the table at `$8FC8` |
| Move forward, back (O, K), turn left, right (Q, W) | live | commands 3-6 in the key table at `$8FC8` (also 7, 6, 5, 8 and the stick); `move_command`, `$A279`; driven in the recorded sessions and by `test_play.js` |
| Fire laser at the cursor (0); in movement mode only to the centre, with the cursor on | confirmed | 0 and the stick's fire give command `$16` (`$8FEC`); `aim_command`, `$A95C`, fires only while the crosshair is shown (`$88A2`): four lines from the view's edges to it, then `pick_object` |
| Space toggles movement and attack mode; in attack mode the keys move the cursor | live | SPACE gives `$1E`, which flips `$88AC`; the direction keys then give `$17`-`$1A` (`$8FC8`, third byte); `test_play.js` |
| Look up, down (P, L) | live | commands 7 and 8; `test_play.js` |
| Angle of turn, 5 to 90 degrees (A, Z) | confirmed | commands `$0B`, `$0C` step through 1, 2, 3, 6, 9 and 18 seventy-seconds of a turn (`$88C9`) |
| Step size, 1 to 250 units (S, X) | confirmed | commands `$11`, `$12` step through 1, 2, 5, 10, 25, 50, 100 and 250 (`$88BE`), times the area's scale |
| Rise, fall (R, F): the probe's body up to a fixed height; the jet flies | confirmed | commands 1 and 2: walking, the probe stands up or crouches by the area's scale, up to `$8771`; flying, it moves by its step (`move_command`) |
| U-turn (U) | confirmed | command `$0D` |
| Tilt left, right (N, M) | confirmed | commands 9 and `$0A`, the roll (`$876E`) |
| Cursor on and off (+) | differs | the key is B, command `$15` (`$8FEC`); `+` is in no key table. It acts only while the keys move the probe |
| Drill (D): a rig is teleported in front of the probe; costs energy | confirmed | `drill`, `$BEFA`: 5 of energy, in front of the probe by its heading, on the floor or a block, clear of every object |
| Collect the rig (C) | confirmed | command `$2A` in `drill`: 5 of energy; the score the rig earned is taken back |
| Information screen (I): area, rig status, gas found, % tapped, gas tapped, total and safe sectors; L load, S save, 1 abort | live | `info_screen`, `$C3DC`; opened, closed and abandoned (1) in the scenarios and in `test_play.js`; S and L traced |
| Load and save a position to tape (or disc) | traced | the save is 333 bytes from `$8762` and the area flags, in two blocks under a name; the question "TAPE OR DISC ?" at `$C838` is never printed, so this version saves to tape only |
| 18 sectors to make safe; a sector is safe when its rig taps 50 % or more of the gas | confirmed | `drill`: 50 or more makes the sector safe (`$877B` = 3); the 18th safe sector ends the game won (`$8BF2` = 5) |
| The closer the rig to the gas centre, the more gas tapped | confirmed | 100 less the rig's distance from the field's centre times 100 over the field's size (`$87A0`-`$87A2`, from the area's record) |
| A flame at the apex of a rig that drilled successfully | confirmed | `place_rig`, `$CD3B`, shows the last two of the rig's five objects only when it struck gas |
| Rigs cannot be placed from the jet ("NOT IN PROBE") | confirmed | `drill` refuses with the message at `$8C66` while `$877A` is set |
| One rig per sector | confirmed | `drill` refuses with "ALREADY PLACED" (`$8C9E`) when the sector's state is not 0 |
| Countdown to the meteor strike; the game ends at zero | live | the clock starts at 4:00:00 (`$CFF2`) and the interrupt takes a second every 50 frames; run out in the scenario `time` (`$8BF2` = 2) |
| Success rating (score) | confirmed | 24 bits at `$8872`: a rig's strike adds the sector's gas times its percentage times 10; scripts add the rest (opcode 1) |
| Energy and shield bars; the game ends when either runs out | live | `bar`, `$BA1E`; run out in the scenarios `energy` and `shield` (`$8BF2` = 3 and 1) |
| Energy and shield crystals: shoot one to absorb it | confirmed | a shot runs the object's script: opcode 2 adds energy, `$13` shield (`run_script`, `$B320`). In the Stores (area 19) the energy crystals are objects of type 7 and the shield ones of type 6 |
| Laser beacons fire at the player in range and never miss | confirmed | sensors (type 2): `draw_sensor`, `process_sensors` and the interrupt; each shot that comes round takes a unit of shield, with no chance of missing |
| Skanners orbit Mitral and are likely armed | differs | no object moves. Eight minutes after the probe enters any area a shape with a sensor in it appears high over the area's middle, and a minute later it goes (the shared scripts at `$D04C`, objects 248-250 at `$87FE`) |
| A Ketar reconnaissance jet: dock by driving under it; land on the probe to go back | confirmed | walking into object 15 of the Ketar hangar (area 27) swaps to the jet (opcode `$15`), object 34 back |
| The jet is lightly armoured and flies; it cannot drill | confirmed | it starts with 29 of energy and 34 of shield against the probe's 48 and 50 (`$CF44`-`$CF47`); `drill` refuses in it |
| A fall from too high ends the game | confirmed | `step_to`, `$9DCF`: a fall of more than `$8777` cells ends the game (`$8BF2` = 4), "NASTY FALL" |
| Teleports to the opposite side of the moon | confirmed | objects whose script goes to another area (opcode `$12`), some hidden until a switch shows them; an area's edge takes the probe into its neighbour at the opposite edge (entrance 0, `set_start`) |
| Switches that open doors and make buildings disappear | confirmed | objects whose script shows, hides or toggles others, in its area or another (opcodes 3-8), often with a flag so it pays once |
| Mines and danger zones | confirmed | flat rectangles that take 3 of energy each time the probe walks on them (Graphite, area 17) |
| Plan view and side view indicators on the console | confirmed | the heading's and the pitch's dials, redrawn by `update_panel`, `$B72B` (the heading's not in areas 13 and 18) |
| X, Y and height co-ordinates on the console | confirmed | `update_panel`, each coordinate over the area's scale |
| Message display: defaults to the sector's state | confirmed | `update_panel`'s message line: the area cannot be drilled, a rig is in place, or the area is safe |
| Area names | confirmed | 29 records from `$CF3E` (`maps/areas.js`): the 18 sectors, the two Stores, the K1 to K4 complexes, the Linker, the Ketar hangar, Mitral, an area named UNKNOWN AREA and the game over's view |
| Freescape: solid 3D, any position, look any way | live | the play view; `draw_view`, `$6B12` |

## Beyond the documentation

- The security check accepts only capital letters (`$41`-`$5A`) and at
  most ten of them. A right answer also writes `$DD` and `$E5` over the
  two bytes at `$6B12`, which the tape holds as `JR $6B12`, a jump to
  itself: a copy that skips the question hangs there (`orientation.md`).
- Y and T are in the key table, with commands `$5E` and `$5B`, which
  `take_commands` passes over: they do nothing.
- An area named UNKNOWN AREA (31), a small room behind a doorway in
  Basalt (15), holds a switch that one of the shared scripts tests.
- Walking off the moon's outer edge sets flag 21, and a shared script then
  takes the vehicle to Mitral (32): the jet to entrance 6, the probe on to
  entrance 7, rolled a quarter turn. Mitral has no edges and no doors, and
  its floor takes 2 of energy and 2 of shield at every step (walked through
  the port: 48 and 50 became 42 and 44 in three steps), so a game that goes
  there ends there unless a position is loaded.
- A block high over Amethyst (object 28, 36 cells up) fills the energy and
  the shield to 63 when the probe walks into it, and is destroyed.
- Obsidian's north wall carries a 17 (objects 36 to 38). Its own script, at
  17 safe sectors (`$889E`, variable 32), hides it and shows a panel with a
  switch (39, 40 and 42); that switch, one in UNKNOWN AREA (11), one in
  Ochre (16) and one in Graphite (15) shown together make a shared script
  take down Obsidian's north wall (30) and show its edge (51), the only way
  into Trachyte. Run through the port's `run_scripts` at 16 and 17.
- Trachyte (18): four pyramids and a shape in a frame behind an invisible
  wall (objects 5 and 6, no colour on any face). Shot in the order lower
  pyramid, middle shape, right pyramid, floor, all five are hidden and the
  area's script destroys the frame and adds 1,000,000 (`$0F4240`); 21
  arrangements are reachable and four shots is the shortest. Run through
  the port's `run_scripts`. Its other script, once 18 sectors are safe,
  takes the view through seven other areas one after another.

## Open questions

- Whether the disc version prints "TAPE OR DISC ?" (`$C838`): this tape
  version holds the text and never prints it.
- Whether Trachyte's tour of seven areas, which its script starts once 18
  sectors are safe, is ever seen: the 18th safe sector is also the one
  that ends the game. Not played to that end in the game.
