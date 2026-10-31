# Spindizzy — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Spindizzy", https://www.c64-wiki.com/wiki/Spindizzy, read 31 October 2026 (infobox, description, controls, map colours, score screen, elements, inhabitants, displays; its screenshots are `reference/wiki-*`)
- Electric Dreams' instruction sheet (German, French and Dutch; no English page in the scan), "Spindizzy (1986 Electric Dreams) [6082] Instructions" on the Internet Archive, https://archive.org/details/Spindizzy_1986_Electric_Dreams_6082_Instructions, read 31 October 2026
- The game's own screens: the title, its help (H), options (O) and score (S) screens, and the keys in play, each in `reference/`, taken 31 October 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: fire starts, S scores, O options, H help (`reference/title.png`) | live | |
| Help screen naming the world's pieces: lift, switch, water, jewel, ice, clue, trampoline, compass (`reference/help.png`) | live | |
| Options: F1 speed slow or fast, F3 one or two joysticks, F7 back to the title (`reference/options.png`) | live | |
| Two-player mode: one player steers up and down, the other left and right (wiki) | traced: with option F3 set ($77), up and down come from port 1 and left and right from port 2; not played with two joysticks | `read_joystick` $8028 |
| Gerald, a spinning top steered with the joystick in port 2, in eight directions; fire for more speed | live: each direction adds 1 to his speed a pass while he touches a surface, 2 with fire; a push of 0.3 seconds gave a speed of 16 | `main_loop` $8DD4 |
| Space brakes Gerald on a rough surface, and costs time (manual: hold it until the time runs out to abandon the mission) | traced: while he stands, space zeroes his X and Y speeds and takes 1 off the time each pass it is read | `brake` $8F0A |
| F1, F3, F5, F7 choose the view: north, turn clockwise, turn anticlockwise, the opposite side (`reference/play-view-rotated.png`) | live | |
| A compass in the bottom right corner points north | live | |
| M shows the map, which fills in as rooms are visited; yellow mapped, red unmapped, purple holds a jewel, black is not part of the world; time stops while it shows (`reference/play-map.png`) | live | |
| S shows the score: per cent of screens, of jewels and of the game (`reference/play-scores.png`) | live | |
| C switches the colour scheme (wiki and manual: colour or monochrome) (`reference/play-colour-scheme.png`) | live | |
| P pauses; the border flashes until a key is pressed (`reference/play-pause.png`) | live | |
| I changes Gerald's shape: top, ball, pyramid (`reference/play-shape-ball.png`) | live | |
| Q abandons the game and goes back to the title (wiki) | live | `main_loop` $8EA8 |
| TIME counts down; finding a new room or a jewel adds time; falling costs time | live: 1 every 64 passes of the main loop, 8 for a new room, 10 for a jewel, 5 for a restart, never above 150 | `add_to_time` $9533, `add_time_capped` $9C8E |
| TO MAP counts the rooms not yet visited; the start shows 385 | live | |
| JEWELS counts the jewels collected | live | `jewel_piece` $A12C |
| The world: about 386 rooms, each a screen, joined at their edges | confirmed: 386 records in the room directory, counted by the game at each start | `count_rooms` $92BC, `room_directory` $0A00 |
| Ramps, stairs, jumps, bridges, gangways, one-way paths, water, trampolines, ice | live for water (Gerald falls through it and restarts), ice (no friction and no steering; his speed held at 4 across it) and floors; traced for slopes and trampolines | `surface_response` $8F46, `on_ice` $9116 |
| Switches and lifts: a switch turns on a lift or moves a block; a lift and its switch share a symbol and may be in different rooms | traced: 64 lifts and 70 switched blocks, each naming a switch number 0-11 | `press_switch` $916A, `lift_piece` $A37F, `switched_block_piece` $A0FF |
| At most two switches active at once; a "clear" switch turns both off | traced: pad 0 clears both; pads 1-7 leave only themselves on; pads 8-11 share the two slots | `press_switch` $916A |
| The bottom-left box shows the switches that are on, or a clue: the switch a room needs | traced: the box shows the two switches on; a room whose switched block is off shows that switch's symbol in its corner | `draw_switch_box` $91FA, `add_switched_block` $A052 |
| Inhabitants that home in on Gerald and drain time when they touch him | live: in room (65, 66) the time fell from 99 to 27 in under two seconds | `inhabitant_piece` $A622 |
| A beginners' area east of the start where time runs more slowly (manual) | live: the start room and seven rooms east of it run the clock at a quarter speed; 7 ticks in 1,838 passes in the start room | `room_header` $8B57 |
| Every game starts in the same room (wiki) | confirmed: map row 64, column 64 | `new_game_state` $84B7 |
| Game over when the time runs out, followed by the score screen | live: "Mission Aborted", then the score | `game_end` $856D |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| A cheat: "I LIED!" in the RAM at $DF00 when the game starts stops the time going down; the credits screen says there is no cheat mode | live | `check_cheat_password` $6076 |
| RUN/STOP on the title shows a screen of credits and hints, which the title does not mention | live | `credits_screen` $70F0 |
| RESTORE, alone or with RUN/STOP, goes back to the title from anywhere | live | `cbm80_cold_vector` $8000 |
| Inhabitants are drawn from Gerald's two spare shapes, so I changes their shape as well as his | live | `draw_object` $A535, `change_shape` $7223 |
| The clock counts passes of the main loop, not frames, so at the fast speed it runs about twice as fast in real time | live | `main_loop` $8DA1 |
| Gerald stopped dead on ice is restarted, since he could never move again | live | `on_ice` $9116 |
| Inhabitants run faster than their top speed in the minus directions of X and Y: only a top speed of 64 holds both ways | live: in room (55, 73) an inhabitant with a top speed of 24 reached -64 in 0.6 seconds | `steer_speed` $A818 |
| Walls make no sound: the bounce asks for a noise too quiet to play | live: 18 bounces in the start room started no noise | `bounce_speed` $9421 |
| Switch 6 has two pads in the world but no lift or block uses it | confirmed from the world data | `press_switch` $916A |
| Two structures nothing places, and second copies of two structures that the search never reaches | confirmed from the world data | `structure_list` $0400 |
| Survey complete (every room and all 220 jewels) offers to go on exploring with the time at 150 | live, with the counters poked | `survey_complete` $85DB |

## Open questions

None.
