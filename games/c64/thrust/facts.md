# Thrust — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

TCI's crack of the Firebird release, one packed file on a D64
(`orientation.md`). There is no version string. The crack's marks are
the "TCI" added to the title picture, "SYNDICATE" in all eight places of
the high score table (`high_score_table_start`, `$B867`), the BASIC line
`SYS 2082 THE SYNDICATE 1986`, and the line "Cracked By The Syndicate
For TCI !" at the end of `bbc_keys_text` (`$B9DD`).

This copy has no music. The calls a music player would answer are
there: `raster_handler_0` calls `$3000` every frame, and `restart_ship`
and `clear_play_area` call `music_hook` (`$A951`) with a tune number in
A and Y. `music_hook` is an `RTS`, and `$3000` holds `$60`, an `RTS`
left there in the relocator's source. No instruction anywhere in the
hand-over or play snapshot stores to the SID at `$D400`-`$D41C` (a byte
search for every store opcode with that operand); the only SID writes
are the sound effects', through the mirror at `$D500`. Whether
Firebird's release had a player at `$3000` is not known from this copy.

## Memory layout

As `play.vsf` holds it, with `$01` = `$36` and the video chip in bank 1.

| Thing | Where |
|---|---|
| Game code and its tables | `$8280`-`$BE95`, moved there from `$3000` by the crack's relocator (`$6C16`) |
| Start-up code | `startup_code`, `$B773`-`$B866`, copied to `$0400` and run there by `copy_startup_to_0400` (`$B70B`); it refers to nothing at `$0400`-`$06FF`, so it decodes the same in place |
| High score table | `$0100`-`$017F`, eight entries of 16 bytes; the player's score and name at `$0180`-`$018F` |
| Walls of the level around the camera | `left_wall` `$0400`, `right_wall` `$0500`: a ring of 256 rows each |
| Shots and debris | `$0600`-`$07BF`: 32 entries in 13 lists of 32 bytes |
| Direction tables | `$0880`-`$09BF`, copied from `direction_tables` (`$B8E7`) |
| Messages | `$0900`-`$097D`, copied from `messages_start` (`$B967`) |
| Sprite and raster lists | `$0C00`-`$0FFF` |
| Sprite shapes | `$4000`-`$4C3F`, copied from `$6C47` by `game_start` |
| Rod sprites | `$5300`-`$53FF`, drawn by `draw_rod` |
| Colour screens | `$5400` (walls black) and `$5C00` (walls coloured) |
| Status bar character set | `$5800`-`$5AFF`, copied from `status_bar_chars` (`$BB96`) |
| Bitmap | `$6000`-`$7FFF`; the play area from `$6280` |
| Level data | `wall_runs_1`-`6` (`$A03C`), `level_objects_1`-`6` (`$A1EE`), `restart_points` (`$A879`), level tables `$A873`-`$A999` |

Left from loading and never read by the game (each listed with its
reason in `game.json`): `$0FA0`-`$2FFF`, `$3001`-`$3FFF` (the rest of
the relocator's source, a stale copy of the program), `$4D00`-`$52FF`,
`$8200`-`$827F`, `$BE96`-`$CFFF` (the relocator itself and bytes it
never wrote), TCI's loading picture under the I/O and the KERNAL.

## Timing

- One interrupt handler, `irq_handler` (`$8943`), through the KERNAL's
  IRQ entry and `$0314`. A raster interrupt goes to `raster_dispatch`,
  which follows the raster list at `$0E01` (three bytes an entry:
  handler, end mark, next line) to one of five handlers. A CIA 1 timer
  interrupt decrements `pass_timer` (`$B46B`).
- The start-up code sets CIA 1's timer A to `$276A` cycles: about 98
  interrupts a second at PAL speed.
- The main loop (`main_loop`, `$B19F`) waits in `wait_pass` (`$B44C`)
  until three timer ticks have gone. *Live*: over 250 frames from
  `play.vsf`, `raster_handler_0` ran 250 times and `main_loop` 131
  times, so a pass took about 1.9 frames, about 26 passes a second; a
  pass often needs longer than its three ticks. Comments in the
  listing say "frame" for a video frame and "pass" for the main loop.
- `raster_handler_0` (`$89C4`) runs once a frame: it counts frames in
  `$1A`, scans the keyboard and runs the sound effects.

## Controls

- `read_keyboard` (`$9DE2`) scans the matrix into `key_rows` once a
  frame; `key_pressed` (`$B476`) tests a key by its matrix number,
  except that while the demo flag `$63` is set it answers from the demo
  pilot's keys (`demo_bits`, `$B4C6`) instead, for every key but
  RUN/STOP.

| Key | Number | Read by | Effect |
|---|---|---|---|
| A | `$0A` | `rotate_ship` | turn anticlockwise, *live* |
| S | `$0D` | `rotate_ship` | turn clockwise, *live* |
| either Shift | `$34`, `$0F` | `thrust_keys` | thrust, *live* |
| Return | `$01` | `fire_keys` | fire, one shot a press, *live* |
| Space | `$3C` | `ship_and_shield` | shield and tractor beam, *live*; starts a game from the title, *live* |
| F5, F7 | `$06`, `$03` | `pause_keys` | pause, continue, *live* |
| F1, F3 | `$04`, `$05` | `sound_keys` | sound off, on |
| RUN/STOP | `$3F` | `end_of_pass`, `wait_frames` | leaves the game for the title |

- The ship has 32 directions (`$0D`, 0 = nose up, clockwise). It turns
  one step on three passes in four (`rotate_ship` skips a pass when
  `$19` AND 3 is 0).
- `pause_keys` runs once a pass and needs `$27` = 0 (shield off).

## Graphics

- The status bar is two text rows at the top; each of its 80 cells is a
  character of its own (codes 0-`$4F`), so the character set at `$5800`
  is a small bitmap. `print_char` (`$8F4E`) writes the figures into it
  with `status_font` (`$8E52`), a 5-line font of 37 characters, and
  writes every message onto the play area's bitmap the same way.
- The play area is a multicolour bitmap at `$6000`. The cave's walls
  are filled spans: `draw_walls` (`$828B`) EORs, on every second pixel
  line, the pixels between where each wall was drawn last
  (`left_wall_drawn`, `right_wall_drawn`) and where it is now.
- The level is drawn with two colour screens. `$5C00` gives the walls
  their colour; `$5400` has the same bitmap colours with the walls
  black. `choose_colour_screen` (`$B3A8`) shows `$5400` on an
  invisible landscape while the shield is down (*live*: walls black,
  then visible with Space held).
- Sprites: the ship is hardware sprite 7, the pod sprite 6, and
  everything else (guns, fuel tanks, reactor, the pod's stand, switches,
  the tractor beam, the rod) goes through a multiplexer
  (`queue_sprite`, `build_sprite_lists`, `raster_handler_1`) into
  sprites 0-5, up to 31 a frame, in bands sorted by y. A band of more
  than six rotates which of its sprites are shown each frame.
- The rod between ship and pod is a line drawn each pass into a pair of
  sprites (`draw_rod`), alternately at `$5300` and `$5380`.
- The ship and pod appear and leave inside a cross that grows or
  shrinks in six steps (`materialise`, `$AEAE`), drawn with EOR on the
  bitmap.

## Mechanics

- **Physics.** `ship_physics` (`$9588`) acts on 6 passes in 16 (the
  low four bits of `$19` at 0, 3, 5, 8, 11 or 13) and returns at once
  on the rest. On those passes it adds the level's gravity
  (`level_gravity`: 5, 7, 9, 11, 12, 13 for levels 1-6, negated when
  reversed) to the vertical speed; thrust adds the direction's vector
  divided by 16, or by 32 while the pod is towed, and costs one unit
  of fuel; and friction takes a 64th of the horizontal speed and a
  256th of the vertical. *Live*: 25 frames of thrust cost 5 units.
- **The pod.** With the tractor beam on (Space), coming within a
  distance of `$75` of the pod and then moving out to `$84` attaches it
  (`pod_pickup`, `$9926`; the distance is `approx_distance`, three times
  the larger difference plus the smaller). From then on the physics
  moves the pair's centre (`$07`-`$0C`), and the ship and pod sit at
  either end of the rod, which turns about it (`$1B`-`$20`).
- **Shots.** Up to four of the player's at once (slots 0-3), each
  living 40 passes and inheriting the ship's velocity (`fire_keys`).
  Gun shells hurt the ship unless the shield is up (`shot_hits_ship`).
  A shot that enters the rock ends (`move_shots`).
- **Guns** fire at random: a gun fires on a pass when a random byte is
  below `gun_rate` (`$A3`), which is 1 for the first two missions and
  then `$AF89`, raised by one each mission to at most `$23`, plus 8 for
  the mission after a planet was destroyed without the pod
  (`next_level`). They hold fire while `guns_silent` (`$3D`) counts
  down.
- **The reactor.** Each hit adds a random 0-31 to `reactor_damage`
  (`$3E`, 50 at the start of a level) and silences the guns for that
  long. When the sum passes 255 the countdown starts at 10
  (`countdown`, `$6A`), shown twice on the status bar and beeping every
  33 passes; at 0 the planet blows up and a ship still on it is lost
  (`countdown_tick`, `update_objects`).
- **Fuel.** 1000 at the start (`$93FF`, BCD). Thrust takes 1 on each
  pass `ship_physics` acts, the shield 1 a pass on two frames in four. Hovering over
  a fuel tank with the tractor beam adds 11 a pass (`tractor_beam`);
  after 26 passes the tank is empty and goes, for 300 points
  (`update_objects`). Out of fuel, thrust and the shield stop working
  and the game ends when the ship is lost or leaves.
- **Score.** Kept in BCD at `$0180`-`$0182` and shown with a trailing
  zero that is part of the status bar's picture (the cell at `$5A51`
  holds a fixed "0"), so every value is ten times the stored one: a gun
  750 (`hit_points`), a fuel tank shot 150, a drained tank 300. An
  extra life comes when the score passes each 10,000 (`add_score`).
- **Leaving the planet.** Rising above row `$120` ends the mission
  (`above_planet`, `main_loop`): with the pod, "Mission <n> Complete"
  and a bonus of 400 for each of (level + 5) steps, 5 more steps if the
  planet was destroyed too (`mission_complete`); without the pod,
  "Mission Incomplete" and the same level again; with the planet
  destroyed and no pod, "Planet Destroyed", "Mission <n> Failed", "No
  Bonus" and the next level.
- **Levels.** Six levels (`$A6A4`, 0-5), then round again. Each round
  of six alternates normal and reversed gravity; every second round
  toggles the invisible landscape (`next_level`): rounds 1-4 are
  normal, reversed, invisible, invisible and reversed, then again.
  "Reverse Gravity" and "Invisible Landscape" are each shown once a
  game. No other message marks a round.
- **Doors.** Levels 4, 5 and 6 have a door with a switch: shooting a
  switch sets `door_timer` (`$6B`) to 255, and `move_doors` (`$917D`)
  opens the door by rewriting rows of `left_wall`, holds it while the
  timer runs, and closes it again.
- **Restart points.** A lost ship restarts at the last of the level's
  restart points above where it was lost (`restart_ship`,
  `restart_points`): 1, 1, 3, 3, 4 and 5 points on levels 1-6. With the
  pod already taken, it restarts towing the pod.
- **Lives.** Three at the start; `lose_life` takes one when a life ends.
- **The demo.** After a game ends, `title` shows the high score table
  over level 1; after about 280 passes the demo pilot flies the level
  from `demo_steps` and `demo_times`, three of whose times are chosen at
  random for each life.

## Data tables

| Table | Where | What |
|---|---|---|
| `level_objects_1`-`6` | `$A1EE`-`$A351` | five lists a level: x, row low, row high, type, flags. 4, 5, 13, 12, 19 and 17 objects |
| `object_state` | `$A352` | bit 1 alive, bit 0 shown |
| `hit_width`, `hit_height` | `$84F1`, `$84FA` | hit box by type 0-8 |
| `hit_points` | `$8508` | `$75` for a gun, `$15` for a fuel tank (BCD, shown ×10) |
| `wall_runs_1`-`6` | `$A03C`-`$A1ED` | run lengths and slopes of each level's two walls |
| `restart_points` | `$A879`-`$A8DE` | six lists a level |
| `level_gravity`, `level_colours`, `level_wall_pointers` | `$A8F7`-`$A950` | per level |
| `level_object_lists` | `$A95E`-`$A999` | addresses patched into `update_objects` and `object_on_screen` |
| `direction_tables` | `$B8E7`-`$B966` | 32 directions, vertical and horizontal, signed |
| `demo_steps`, `demo_times` | `$B4EE`, `$B500` | the demo pilot's 18 steps |
| `status_font` | `$8E52` | 5 lines × 37 characters |
| `status_bar_chars` | `$BB96` | the status bar's 80 characters |

Object types: 0-3 a gun facing one of four ways, 4 a fuel tank, 5 the
pod on its stand (always object 0), 6 the reactor (always object 1), 7
and 8 door switches.

## Text

The game's texts are plain ASCII. The level messages are at `$9515`
(`level_messages`): "Mission ", "In", "Complete", "Bonus ", "Failed",
"No Bonus", "Planet Destroyed", "Reverse Gravity", "Invisible
Landscape", each with its bitmap address. The others are at `$B967`
(copied to `$0900`): "Game Over", "Top Eight Thrusters",
"Congratulations", "Please enter your name", "Press SPACE BAR to
start", "Out of fuel". FUEL, LIVES and SCORE are drawn into
`status_bar_chars`, not stored as text.

`bbc_keys_text` (`$B9DD`) is the BBC Micro version's MODE 7 key page
(VDU 22,7 and teletext codes). `show_bbc_keys_page` (`$B74B`) would
print it through the KERNAL and then run the start-up code, but no
instruction calls it and no table holds its address.

## Sound

Sound effects only (see Build). `sound_tick` (`$9B58`) runs once a
frame from `raster_handler_0`, unless the demo is running; every write
goes to the SID through its mirror at `$D500`-`$D518`. Voice 1 carries
the explosion (50 frames) and thrust; voice 2 the shield, the player's
shot and a gun's shot; voice 3 the beep of the countdown, a drained
fuel tank and the pod taken. F1 sets the volume to 0.

## Code that is never run

- `print_hex` (`$A004`): prints a byte in hexadecimal; nothing calls it.
- `test_shot` (`$AA8C`): puts a shot at a fixed place; nothing calls it.
- `show_bbc_keys_page` (`$B74B`): see Text.
- `random_slot` (`$9FFB`): after `free_shot_slot`'s search, both
  branches at `$9FF7` return, so it is never reached.
- `unreached_print` (`$B5EC`).

## Hardware register census

From `kit/cpu/census.py` over `play.vsf`: the sprite registers, the
screen splits (`$D011`, `$D012`, `$D016`, `$D018`), the collision
latches `$D01E` and `$D01F` (`sprite_collisions`), the background
colours, the SID through `$D500`, CIA 1's keyboard ports, and both CIAs'
interrupt registers. The start-up code writes `$DD00`, `$DD02`,
`$D01A`, `$D020`, CIA 1's timer and its control registers.

## The listing's error rate

Sample `sample-20261108`: seed 20261108, 60 of the listing's 652
comments, checked by claude-fable-5-1 against the code, every finding
read again against the code by the run. 10 of the 60 were wrong in a
detail or more (16.7 %; 95 % interval 9.3 % to 28.0 %), over the mark
of 2: the pen routines' directions (`$ADDD`-`$AE21`, up and down
swapped with right and left), a variable used as scratch outside the
routine it was named for, the pod's colour, `$893C` taken for the play
area's colour when it is the status bar's, the raster list's end mark,
the places that set `$AF8F`, "alternate frames" where the shield works
on two frames in four, the angle search's seven passes and what it
computes, what clears `restart_with_pod`, and which sprite
`rod_next_sprite` queues. All ten were corrected, and with them every
other comment that said the same (the pen's names and the diagonal, the
status bar's colour in three comments, `shield_shown`). A full audit is
recommended; the rate is a lower bound.

## Live tests

- From `entry.vsf`, run with no keys: the game starts at once with
  `$63` = 0 and three lives; the ship falls and is lost three times;
  after about 35 seconds the high score table and the demo come up,
  with `$63` = `$FF` (`work/s2/boot63.py`).
- From `play.vsf`, 250 frames with execute checkpoints counting:
  `raster_handler_0` 250, `irq_handler` 1667, `main_loop` 131
  (`work/s2/live1.py`).
- `countdown` poked to 10: after a beat the status bar showed 9 twice
  and the reactor blinked.
- `invisible` (`$A5`) poked to `$FF`: the walls went black; with Space
  held they showed again (`$AF8E` 0, then `$FF`).
- Controls from `play.vsf`, 25 frames each (Bronze run,
  `work/scripts/controls.py`): S and A turned the ship 11 steps each
  way; thrust cost 5 units of fuel; the shield 8.
- Pause: F5 held for 10 frames paused the game, F7 continued it
  (`work/scripts/pause_test2.py`).
