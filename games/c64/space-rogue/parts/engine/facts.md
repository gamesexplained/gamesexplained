# The engine: facts

`SR` and the files it loads at start-up: the resident game. Every
address is in this part's listing, built from `work/play-flight.vsf`
(the cockpit, in flight). Every fact names the routine or table it
comes from. The flight overlay at `$A500`-`$BCFF` and the models at
`$E400` are the flight part's.

## Memory

| Range | What |
|---|---|
| `$0002`-`$00D5` | zero page: the keyboard buffer (`$03`-`$15`), the frame counter `$16`, the sound's voice state (`$1D`-`$2D`), the drawing window and pointers (`$38`-`$7C`), scratch (`$80`-`$99`), the model header copy (`$9A`-`$BD`), the AI's working values (`$D0`-`$D5`) |
| `$0400`-`$0402` | `sr_start`, a jump to `sr_init` (`$0DE7`) |
| `$0403`-`$0801` | the game state, the bytes `SAVED` holds: the six ship slots' records, the twenty object slots, the player (name `$0711`, system `$071D`, sector `$071E`/`$071F`, clock `$0720`-`$0725`, bounty `$0726`, credits `$0728`, rank `$072A`, standings `$072E`-`$0731`, missiles `$0732`-`$0734`, the ship's fittings `$0735`-`$073C`, items `$073D`-`$0751`, cargo `$0767`-`$0777`), the rumours (`$0784`) and the 32 plot flags (`$078E`) |
| `$07BC`-`$0831` | `file_names`, the loader's names, `TITLE` to `TALK` |
| `$08D5`-`$0D1F` | the 35 object types' tables (`type_flags` to `type_rank`), the ten tactics' tables, the weapon and flight-mode bytes |
| `$0DE7`-`$3FFF` | `SR`'s code: the main loop, the interrupt, the keyboard, the sound, the loader and disk-block reader, the object slots, the clock, the beam, navigation, the cockpit's instruments and TAC, the ships' AI |
| `$6400`-`$A4FF` | `MAIN`: drawing objects, the camera, collisions and docking, the Malir gate and the wormhole, thrust and movement, gravity, the model drawer and polygon clipper, the span filler, the vector maths, the menus, the text printer and the disk-text decoder |
| `$BD00`-`$BEFF` | `SPB`, the disk text's block counts |
| `$BF00`-`$BFFF` | where a disk text is decoded (`resolve_text`) |
| `$EB00`-`$F1FF` | `EXTERN`: the bitmap row tables, `div8`, the x byte offsets and masks, the colour patterns and palette |
| `$F200`-`$F5FF` | `FONT`, 128 glyphs |
| `$F600`-`$F9FF` | the two disk-text block buffers |

`$0E22` `setup_irq` sets the processor port's low bits to `%01`, the
raster interrupt at line `$32`, and the vectors: `$FFFA` and `$0318` to
the RTI at `$0E9E` (RESTORE does nothing), `$FFFC` and `$0316` to the
RTI at `$0E9F`, `$FFFE` to `irq_entry` (`$0EA0`) and the KERNAL's
`$0314` to `irq_body` (`$0EA5`), so the interrupt runs whether the
KERNAL is banked in or not. `bank_all_ram` (`$0E85`), `bank_io_in`
(`$0E8C`) and `bank_kernal_in` (`$0E95`) set the port around every
stretch that needs a chip or the KERNAL.

## The main loop and timing

- `sr_init` (`$0DE7`) runs `sr_setup` (`$14CB`), which loads `INIT` to
  `$E900` and runs it, then loops for ever. A pass calls
  `frame_update`, `age_objects`, `ship_ai`, `turn_objects`,
  `apply_thrust`, `gravity`, `move_objects`, `do_key` and
  `check_collisions`, then `frame_skip3` (`$A470`); unless that says
  to skip, `update_camera`, `place_particles`, `draw_frame`,
  `sector_hazard`, `draw_target_arrows` and `flip_buffers` follow
  (`$0DED`).
- `irq_body` counts frames in `$16`, held at 255. `frame_skip3` takes
  3 off the lag count `$2E` and restarts `$16` at 1; `draw_frame`
  (`$A488`) adds the frames the drawing took. A pass whose lag reaches 3
  draws nothing, so the world moves at the same rate whatever the
  drawing costs. The wormhole uses 5 (`frame_skip5`, `$A47C`).
- `frame_update` (`$1239`) runs the cockpit's instruments
  (`update_cockpit`) every seventh pass (`$135D`), the message line's
  timer every 16th, and every 256th the target's hail, the clock line
  and a chance of a new ship (`pick_ship_with_chance` with the danger
  level divided by 8, placed at random within 1,250 units, `$04E2`, of
  the Sunracer on each axis by `random_offset`, `$1E73`; ships farther
  than `$0B49`, a log of the distance, about 2,500 units, are removed).
- `enter_sector` (`$15A0`) places each of the sector's objects and an
  encounter's ships at random within eight times its type's radius
  (`type_radius`, `$0A1D`) of the Sunracer on each axis
  (`place_object`, `$167F`): 24 units for a Wasp or a Dart, 88 for a
  Cruiser, 176 for a Titan. The fights on Ships and combat are placed
  the same way (`test_combat.js`).
- `wait_ticks` (`$A317`) waits A ticks of 76 × 256 turns of a delay
  loop, about a tenth of a second each.

## Controls

`do_key` (`$135F`) takes a key from the buffer, as a capital, and finds
it in `key_cmds` (`$145C`); the handler's address less one comes from
`key_handlers` (`$1481`) and is reached by RTS. While the wormhole is
flown (`$0838`) only the first 25 entries count, up to V.

| Key | Routine | Effect |
|---|---|---|
| A, 4, cursor left / D, 6, cursor right | `key_turn_left` `$1386`, `key_turn_right` `$1391` | turn rate `$0516` a step, at most `$46` either way (`clamp_rate`) |
| W, 8, cursor up / X, 2, cursor down | `key_pitch_up` `$139C`, `key_pitch_down` `$13A7` | pitch rate `$0508` |
| Z, 1 / C, 3 | `key_roll_left` `$13BE`, `key_roll_right` `$13C9` | roll rate `$050F` |
| S, 5 | `key_stop_turn` `$13B2` | all three rates to zero |
| minus / plus | `key_slower` `$13DE`, `key_faster` `$13F3` | set speed `$0415` a step, -`$46` to `$46`; nothing in Newtonian flight |
| CTRL-E, F7 | `key_flight_mode` `$1408` | cruise or Newtonian (`$0D02`) |
| V | `key_view` `$142B` | cockpit, chase, cinematic (`$0D3C` counts 2, 1, 0) |
| T, Return | `key_next_target` `$1D82` | the next ship, base, planet or gate in the slots |
| CTRL-T, I | `key_tac_mode` `$1411` | the TAC's data page or the target's picture (`$7C`) |
| L | `key_auto_fire` `$141D` | automatic beam fire, only with the beam lock (`$073E`) |
| space, 0 | `key_fire` `$1DBE` | the selected weapon |
| R, full stop | `key_next_weapon` `$1E5C` | the next weapon down, skipping missiles the ship has none of |
| J | `key_jettison` `$13D4` | the whole hold emptied (`cargo_jettison`) |
| G | `key_surrender` `$392A` | surrender |
| N | `key_navigation` `$1442` | Navigation Control |
| CTRL-S | `key_save` `$154E` | save, after "Save game? Y/N" |
| F1 (the C128's ESC) | `key_escape` `$1438` | waits for a key: a pause |

- `keyscan` (`$0EF5`) reads the eight C64 rows and the C128's three
  extra rows through `$D02F`; a held key repeats after 30 frames, then
  every 6. CTRL with a letter gives its control code. In `key_chars`
  (`$0FEF`) F1 gives `$1B`, ESC, and F7 gives `$1F`, the code
  `key_cmds` lists beside CTRL-E; F3, F5 and the C128's HELP give
  nothing.
- `joystick_flight` (`$2419`): the fire button of the joystick in port
  2 fires; up and down on the joystick in port 1 change the set speed a
  step, refusing to cross zero in one push (`joystick_speed`, `$242C`,
  through `read_joystick1`, `$A44C`); the eased position of the stick in
  port 2 (`joystick_eased`, `$A3B1`) sets the pitch and turn rates
  through `joy_rates` (`$24A3`), while no key has been pressed since.

## Flight

- `cruise_thrust` (`$7540`): in cruise each ship's velocity moves
  toward minus its third orientation row times the set speed / 16, by
  at most its type's thrust a frame. In Newtonian flight
  (`apply_thrust`, `$74D3`) the player's velocity changes only while a
  speed key is held, by the thrust along the ship's axis, up to a speed
  of about 4.4 units a frame. An engine knocked out quarters the thrust
  (`engine_damage`, `$75EE`).
- The player's thrust is the engine's (`$073B`) times 8 / (8 + the
  cargo slots in use) (`frame_update`).
- *Measured*, 15 October 2026, on the engine in `kit/c64/cpu6502.js`
  (`test_combat.js`): one pass of `turn_objects` (`$7634`) with a rate
  of 1 turns the player 1/1024 of a turn (keys reach 70, 24.6 degrees a
  pass; `joy_rates`, `$24A3`, reach 10) and a computer ship its type's
  step from `type_turn` (`$0BE2`): 5.99/1024 for the Wasp, Dart and
  Hunter, 2.99 for the Cruiser, Vulture, Corsair and Scow, 2 for the
  Titan and Tanker. One pass of `apply_thrust` from a standstill toward
  speed 70 adds the type's thrust rounded to 1/256 of a unit: 5/256 for
  a Dart, 4/256 for a Cruiser, 3/256 for a Titan.
- `speed_of` (`$7C21`) is the velocity's length × 16, the number the
  CF readout shows. Docking wants under 21, a Malir gate 20 or more.
- `draw_speed` (`$31B2`) prints "CF" or "NF" and the speed; in
  Newtonian flight the speed shown is the actual speed.

## Combat

- `fire_beam` (`$20EC`): the player's beam goes along the ship's axis,
  a computer ship's toward its target. `trace_beam` (`$2189`) steps it
  50 times and returns the first object within its type's radius
  plus 2. `beam_hit` (`$2222`) takes the damage from `beam_damage`
  (`$2414`) by the beam's power, halved once for each step of the
  player's beam heat `$0D00` (one a shot, up to 8, counted down every
  16 passes).
- `launch_missile` (`$1EAD`): missiles are types 9 (SM-1), 10 (Nova)
  and 11 (plasma torpedo), with contact damage 100, 250 and 75
  (`type_damage`). The player waits `$7E` passes between launches
  (`$0836`). A missile fired at a ship swerves (tactic 4) instead of
  pursuing when a random 0-100 is under the target type's ECM
  percentage (`type_ecm`, `$0C2B`) and its ECM works.
- `damage` (`$6EA0`): the shields cut the damage first
  (`shield_reduce`, `$6F88`): a hit from behind meets the aft shield,
  the low nybble of `type_shields`, from in front the fore shield, the
  high nybble, each step halving it; a beam of power 1-3 and a plasma
  torpedo count one step less, and a power-4 beam is not reduced
  (`beam_hit`, `$2222`, passes A = 1 or `$FF`). A hit of 10 or more knocks out a random system one time in
  five instead of reaching the armour (`$6F4B`, "Laser hit" and the
  rest, `$6FE5`). Armour below zero destroys the ship. A base hit by
  the player sets `$0783`, read on docking.
- `ram` (`$6BC3`): damage is the relative speed's length × 8, low byte
  only, taken by both; then `bounce` (`$6D08`) treats it as an elastic
  collision with the two radii as the masses.
- Hit boxes: `trace_beam` tests each step of a beam against a box of
  the target type's radius (`type_radius`, `$0A1D`) plus 2 each way
  round its centre, and `check_collisions` (`$6AB3`) boxes of the two
  radii added; neither looks at the model. Flying along the axes, the
  Cruiser's nose and the Corsair's reach 16 units against a box of 13,
  the Vulture's wings 16, and the Titan 28.8 against 24 (the models as
  `test_ships.js` holds them to `draw_model`). `check_collisions` tests
  no faction. *Simulated* (a Titan and four fighters, in
  `test_combat.js`): the Titan and the Hunter, both Imperial, ram each
  other four times.
- `hazard_hit` (`$6CC5`): planets and the black hole do 255.
- `kill_reward` (`$1ABF`): a destroyed pirate (faction 0) pays 32 ×
  its type's rank value (`type_rank`) plus a random 0-255 in credits,
  and a Manchi ship (faction 3) 32 × its rank value, with "Bounty
  awarded for kill:"; a Guild or Imperial ship (faction 1 or 2) pays
  nothing and adds (rank value + 2) × 16 to the bounty on the player.
- `key_surrender` (`$392A`): the Imperium (faction 2) asks the bounty
  plus 50 credits; any other faction asks for the cargo; a faction hostile
  to the player refuses, and others ignore it one time in five.
  `merchant_surrender` (`$3A2D`) is the other way round: a merchant
  under a quarter of its armour may offer its cargo.
- `create_object` (`$1949`): a ship or a missile (types below `$0D`)
  takes a free slot from 5 down to 1, a station (`$0D`-`$10`) slot 6
  alone, and anything else, explosion debris among it, one from 19 down
  to 7; with none free it returns `$FF` and makes nothing. So five ships
  leave no slot for a missile: *simulated*, 15 October 2026
  (`test_combat.js`), each fight of five launched its first missile only
  after a ship was destroyed.
- `free_slot` (`$1A8A`): freeing slot 0, the player, is the end:
  `player_destroyed` (`$1B90`) loads `END` and jumps to `game_over` in
  it, which prints the death text and loads `TITLE` again. There is no
  restart from a save.

## The ships' minds

- `ship_ai` (`$3689`) runs every 17th call (`ai_tick` counts 16 down
  to -1); each ship reconsiders its target, attitude and tactic every
  third of those. *Simulated*, 15 October 2026: the engine's own main
  loop run in `kit/c64/cpu6502.js` changed tactics only on passes 17
  apart (`test_combat.js`). Ten tactics
  (`tactic_names`, `$0CAE`): cruise, follow, pursue, close, swerve,
  stand, circle, flee, elude, ram, each with a steering mode, an angle,
  a speed and a speed rule (`$0C86`-`$0CA4`).
- `faction_attitude` (`$387E`): four computer factions stand to each
  other by `faction_table` (`$38B1`); to the player by the player's
  standing with that faction, -2 to 2 (`$072E` + faction: pirates,
  Guild, Imperium). For the Manchi, faction 3, that is `$0731`, the
  weapon count whose `$FE` keeps the beam from running out: always
  hostile, and `change_standing` (`$3C90`) leaves faction 3 alone. A type-`$0C` ship (Hunter) is unfriendly while
  the player has a bounty, and otherwise takes the Imperium's standing;
  the `LDA #0` at `$3899` is overwritten by the next instruction.
- `ai_fight_score` (`$3BE0`), called with A = 0 by `ai_attitude`
  (`$3739`): -4, plus the ship's hit points counted in eighths of its
  type's full count, plus 1 (1 to 9), plus its rank value less the
  target's, halved by an arithmetic shift, plus 1 when its faction is
  hostile (`$FE`) to the target's, plus 2 when the target's `$0439` is
  set, minus 2 when its own is, minus 1 for faction 1, plus 2 for
  faction 2, and exactly 2 for faction 3. Negative: AI state `$FF` and
  tactic 7 (flee); otherwise `$FE`.
- `ai_fire` (`$38C1`): a fighting or fleeing ship whose target is under
  `$08A4` away (a log: about 400 units, the reach of a beam in
  `trace_beam`, `$2189`, 50 steps of 8) fires three times in ten, a
  missile three times in ten of those. A computer ship's beam is aimed
  straight at its target and is drawn only when it hits it (`fire_beam`,
  `$20EC`).
- `steer_toward` (`$3D69`): the two angles to the target are in 1024ths
  of a turn; the tactic's offset (`tactic_angle`, `$0C90`) is taken off
  the size of the first, so a circling ship (192) keeps its target 67.5
  degrees off the nose and an eluding one (255) about 90; each angle
  divided by the type's turning step gives the steps of turn and pitch
  the ship then makes one a pass (`turn_ship`, `$76DD`).
- `pick_ship` (`$2C8C`): a random number spent across the system's five
  class weights picks a class, and `ship_class_types` (`$2D24`) one of
  its four types: one time in four any of them, otherwise a random
  number from 0 to the player's rank value, halved, at most 3, so the
  third and fourth (a Corsair for a Dart, a Titan for a Cruiser, a
  Vulture for a Wasp) come more often as the rank grows.

## Navigation

- `navigation` (`$2543`): Navigation Control loads `NAV.PAC` and
  `NAV.TIL`, draws the system chart and offers CHART, HELM, STATUS,
  QUERY, SCAN and COCKPIT (`nav_menu`, `$25CA`). HELM is offered only
  with no ship near and a course set.
- `plot_course` (`$2880`): the course moves one sector across and one
  down toward the destination at each step, diagonal first.
  `step_hours` (`$29CA`): a step takes 5 hours straight or 7 diagonal,
  doubled through a sector whose kind has bit 7 in
  `sector_kind_flags` and again with the drive knocked out.
  An encounter (`helm_encounter`, `$2991`) prints "Under attack" when
  ships are near, and the trip stops; after "Space craft detected" it
  goes on unless the player presses fire or a key in the two seconds
  that follow. A key between steps stops it too (`helm_step_time`,
  `$290F`).
- `helm_hazard_check` (`$2A15`): on each HELM step, cargo of a kind
  that spoils (`cargo_spoils`, `$0D08`) becomes spoiled cargo, kind 20,
  when a random 0-100 comes out under half the step's hours, or four
  times that in a sector with an ion storm: one slot at a time, the
  last first.
- `next_day` (`$203A`) moves the date. The game starts on 01 MAR 12
  (`clock_year`); the day count turns the planets' orbits
  (`motion_small_orbit`, `motion_large_orbit`).
- `nav_status` (`$2694`) loads `SEG1` over `SEG0` to show the status
  pages, then loads `SEG0` back.

## Malir gates and the wormhole

- `gate_contact` (`$6C54`): the ship must be lined up with the gate's
  axis (the dot product at least 0.8) and moving at 20 or more.
- `gate_jump` (`$7134`): 256 passes of the jump, then "Entering worm
  hole" and the wormhole (`make_wormhole`, `$742C`). Rings come every
  14 units; `wormhole_rings` (`$72C1`) ends the trip when the ship is
  not inside the rearmost ring. Every fourth ring (type `$21`) counts,
  and the gate's map entry says how many must be passed (`gate_dest`,
  `$72BD`): enough gives "Entering" and the new system, too few "Faulty
  jump!" and the old one. `wormhole_step` (`$7278`) takes one off the
  armour every 8th frame unless the null damper (`$0741`) is owned.

## Docking and the bases

- `on_contact` (`$6B22`) and `dock_check` (`$7033`): in the cockpit
  view, touching a model is settled when it is drawn: `facing_face`
  (`$7062`) finds the first group of its faces all turned toward the
  player; group 0 of a base is the docking face, and at under 21 that
  docks (`dock`, `$7094`). Any other face is a collision.
- `dock` (`$7094`): in system 9 the game is won (`load_won`, `$1532`).
  Otherwise `SEG1` is loaded over `SEG0` and `station_run` (`$A49A`)
  runs the base until the player leaves; the ship leaves at speed 1, or
  4 at a base whose map byte `$5610` is `$10`, with a collision
  cooldown of 8.

## Graphics

- The screen is the multicolour bitmap at `$C000` with its matrix at
  `$E000` (`load_resident`, `$EA3E`, in the flight part). The 3D view is
  drawn into one buffer while the other is shown: `flip_buffers`
  (`$8ED3`) shows the buffer just drawn and clears the other's view
  (`view_clear_c000` or `view_clear_4000`, in the flight part).
- `build_draw_list` (`$3E2C`) keeps up to 14 objects in view and draws
  them farthest first. A 3D model (`draw_model`, `$7C61`) is placed,
  its faces tested and its polygons drawn in three passes for a
  painter's order (`draw_polygons`, `$7ED6`); polygons are clipped to
  the wedge in front of the viewer (`clip_polygon`, `$7F7E`), then to
  the window (`fill_polygon`, `$8288`) and filled a row at a time
  (`scan_fill`, `$850E`, `span`, `$8C9C`).
- A model's nose is its -z end and its top its +y side: every ship's
  engine faces (colour `$12`) are at its largest z, the Sunracer's and
  the Hunter's windows (`$51`) toward the smallest, and the Sunracer's
  hull and window stand on its wings, which lie at y = 0. `fill_slot`
  (`$1971`) gives a new object in slots 0-6 the identity orientation
  (`$0DA8`), so it starts nose toward -z, level.
- All of the 3D maths is in logarithms: a number is a 16-bit log2
  (fraction, whole part) and a sign byte. Multiplying adds logs;
  `log_add` and `log_sub` (in the flight part) add and subtract through
  correction tables. `lin_to_log` and `log_to_lin` convert.
- `set_colour` (`$8F80`) picks two fill patterns, alternate rows, and
  the screen matrix nybble from `EXTERN`'s tables: ten drawing colours
  (`$F1C8`-`$F1E6`).
- The window is 251 by 102 pixels from x 34 (`window_view`, `$87FE`).

## Text

- `print_char` (`$A047`) draws from `FONT`; codes below `$20` are
  controls: `$0D` new line, `$0E` wait and clear, `$0F`/`$10` reverse
  on and off, `$11` clear, `$12` fill the line.
- `resolve_text` (`$9BB7`): a text address of `$C000`-`$CFFF` is a disk
  text number. Its 512-byte block is found by subtracting `SPB`'s counts
  (`$BD00`), read from disk blocks `$01AD` + 2 × block on (`read_text_block`,
  `$9CB6`, through `read_block`, `$186F`, a "U1" block read), and the
  text decoded into `$BF00` with the Huffman tree at `$9D66`
  (`decode_char`, `$9CE0`; `$1B` escapes to a 7-bit literal).
- `select_window` (`$9E4C`) has seven text windows: 0 the message line
  at the top, 1 one line near the bottom, 2 the bottom four lines, 3-6
  larger panels (`$9E9C`-`$9EBE`).

## Sound

- `sound_play` (`$1091`) starts one of 14 effects from the tables at
  `$11AD`-`$122B`: voice, frequency and step, envelope, waveform,
  length, gate-off point and repeats. `sound_step` (`$10D2`) runs each
  voice every frame. With voice 1 idle it plays the engine hum: a
  triangle wave at the set speed (`slot_speed`, `$0415`) times 8 in the
  SID's units, under 33 Hz at full speed, with the test bit pulsed and
  the gate turned on and off on alternate frames, unless `$1D` or `$1E`
  masks it.
- There is no music in `SR` or `MAIN`.

## Data tables

- `type_flags` (`$08D5`), bit 0 a base, 1 gravity, 2 a particle, 3 a
  limited life, 4 moves, 5 a missile, 6 a hazard, 7 a 3D model.
- `type_radius` (`$0A1D`): 3 for the small fighters, 11 for the larger
  ships, 60 for a starbase, 1024 for a gas giant.
- `type_name_text` (`$0B3E`): `<Sunracer>`, Wasp, Dart, Cruiser,
  Vulture, Corsair, Titan, Scow, Tanker, Hunter, Planetoid, Terrestrial
  Planet, Gas Giant, Station, Carrier, Outpost, Starbase, Malir Gate,
  Black Hole.
- `model_names` (`$0961`): fourteen model files, MSC to GAT; the
  Sunracer (`$692A`) and the missiles (`$6813`) are built into `MAIN`.
