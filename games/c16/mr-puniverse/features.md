# Mr Puniverse — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay, "The Aim of the Game", "CONTROLS" and "KEYBOARD"
  (Mastertronic 1985, design by Word & Pictures Ltd.), as scanned on
  Plus/4 World, read 27 October 2026, kept in `reference/web-cover-back.jpg`
  and `reference/web-cover-front.jpg`.
- Plus/4 World's page for the game,
  https://plus4world.powweb.com/software/Mr_Puniverse, read 27 October
  2026: Mastertronic, February 1986, £1.99, product code 2C 0103, 16K,
  produced by Mr. Chip Software, code by Tony Kelly; "has an end, game
  ends"; an older version "that looks almost the same, but has a
  different ending"; its controls note (Z, X, SHIFT, D); its cheats; its
  title and play screenshots, kept in `reference/web-title.gif` and
  `reference/web-play.gif`.
- The game's own screens in plus4emu (`orientation.md`).

## Features

| Feature | Status | Where |
|---|---|---|
| Mr Puniverse searches 25 locations for the vitamins that keep him alive (inlay) | live | `room_ptr_lo` and `room_ptr_hi` point at 25 room records, each with one vitamin, laid out as a map five rooms by five (`facts.md`, "The rooms"); all 25 were drawn in the emulator and match a port of `draw_room` cell for cell. In room 0 the player, put in the shaft above its vitamin, fell past it: VITAM1 went from 00 to 01 and the room's bit in `vitamins_got` was set |
| Joystick (inlay); it goes in port 2 | live | `read_input` reads port 2 only: from `play-room1.p4emu`, right on port 2 for 40 frames moved him right, port 1 did nothing |
| Keyboard: Z left, X right, SHIFT jump (inlay; Plus/4 World) | live | `read_input` with `keyboard` set: X moved him right, Z left, and SHIFT started a jump |
| D, "suicide" (Plus/4 World) | live | `player_pass`: D in play cost a life (8 to 7) |
| The game has an end (Plus/4 World) | live | `collect_vitamin`: with the count poked to 24, the 25th vitamin set his lives to 1, started the tune and waited at $2838 for a key; a key ended his game, GAME OVER showed and the title came back |
| A menu: one or two players, each with the joystick or the keys (own screens) | live | `new_game`, `show_menu`: F1, F2, F3 and HELP each started a game |
| Two players take turns, each with his own TIME, VITAM and lives on the panel (own screens) | live | `death`: in a game started with F3, D cost player 1 a life and player 2's turn began |
| A TIME clock for the player in play (own screens) | live | `clock_tick`: TIME1 poked to 3.99 ticked to 4.00, his lives became 1 and he died, which ended his game |
| An EGY bar along the foot of the panel (own screens) | live | `energy_tick`: in most rooms it drains, in some it refills, at a rate the room sets; poked one step from empty, it ran out and he died |
| Eight lives, shown as little men (own screens) | live | `new_game` gives each player 8, `draw_lives_row` draws them; 8 men at the start, 7 after D |
| Cannons and their shots (own screens) | live | `make_cannon`, `update_cannon`, `move_shot`; in room 1, put in the line of the cannon's shots, he died twice in 800 frames |
| Crushers, which Plus/4 World's cheats call "pulverisers" (own screens) | confirmed | `make_crusher`, `update_crusher`; they move in all the rooms that have them, and `player_pass` kills him when one is in his column |
| Switches that turn force fields and bridges on and off (own screens) | live | `switch_off`, `update_field`: in room 2 he touched switch 1, its state went from 1 to 0 and the force field at column 36 went away |
| Cheats: `>3367 BD` unlimited lives, `>33AB AD` unlimited energy, `>25C5 60` invulnerability, `>281E C9 ##` the vitamins needed to finish, `>2172 39` "jump left through walls", `G 1AF4` restart (Plus/4 World) | live | each poked in play (`cheats.md`): D cost no life, the bar stayed one step from empty, a force field poked into his cell did not kill him, one vitamin finished the game, and left took him through room 0's wall |
| Cheat `>15F3 B9`, "takes out a cannon which levels out 6 pulverisers" (Plus/4 World) | traced | `$15F3` is the low byte of the address of room 14's first object, a cannon; the poke moves it from the right of row 9 into the wall at the left of row 10, where its shots end at once. Its record is changed, as poked in the emulator, but room 14 was not played |
| Two versions with different endings (Plus/4 World) | open | this tape is the later one: Plus/4 World's cheats for it fit its code and those for the older version do not (`orientation.md`). The older version was not examined |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| P pauses the game, and P again goes on | live | `pause_check`: PAUSED printed in red under the play area, the program looping at $27BF-$27C3 until P was pressed again |
| K and M make "up" and "down" from the keyboard, and nothing reads them | live | `read_input` builds the bits; in keyboard mode K and M did nothing |
| Crumbling floor wears away under him in eight stages, then he falls | live | `crumble_step`: in room 1 the floor under his feet went $A8, $AC, $AE, $B2, $B6 and then blank, in about 30 frames |
| Conveyor belts carry him left | live | `player_move`: in room 3, put on the belt, he went six columns left in 60 frames |
| Room 2's pit drops him into room 0, at the top left of the map, not into room 7 below it | live | `leave_room`, room 2's exit bytes: put above the pit, he fell into room 0 |
| Room 24's ladder climbs into room 14, two rooms up, not into room 19 | live | room 24's up exit byte is 14; put on the ladder, he climbed into room 14 |
| A room that refills the EGY bar stops one cell short of the right end, so after any drain the last cell stays empty until the next turn | live | `energy_tick` stops refilling when `bar_pos` reaches 33 without filling that cell; in room 6 the cell before it filled and the last stayed empty |
| Shots, force fields and crushers kill only in the middle cell of the column he stands in, or in its bottom cell when he is low in his block | traced | `player_pass` reads two of the six cells of his block, the left column's facing right and the right column's facing left, and the bottom one only with `player_y` 3 or more |
| Room 24's corridor along the foot of the screen leads left into room 0 | live | room 24's left exit byte is 0; walking left along it, he came out at the right of room 0. The corridor runs along the foot of rooms 20 to 24, and room 22's vitamin lies in it: walking right from room 22 he took the vitamin and went on through room 23 to the foot of room 24's ladder |
| Rooms 18 and 19 also have "down" exits to room 0, with a wall or a ladder above each | traced | their exit bytes and the drawn rooms: each gap in room 18's floor lies under a block of wall, and room 19's under the foot of a ladder, which holds him when he lands on it. No way down to them was found |
| An unused title: the dotted title routine has a second path that spells WIMPO | live | `wimpo_path`: with `title_dot_step`'s four operands pointed at it, the title drew WIMPO where MR PUNIVERSE goes. The inlay calls the weaklings "Wimps" |
| A lift, coded and animated, that no room places | confirmed | `player_move` raises him on character $BC and `animate_chars` scrolls its glyph, but none of the 25 room records draws one |
| Switch 8 is always on: the always-on cannons and crushers read the first object's type as their switch | confirmed | `object_timer` reads `switch_state` + 8, which is `obj_type` |
| A second tune player that nothing calls, reading room data as its tune | traced | `old_music_tick` |
| The tune's first six frames read past the tune, and three of its notes past the frequency tables | traced | `music_tick`, `tune_voice1`, `note_freq_lo` (`facts.md`, "The tune") |

## Open questions

- What the older version's different ending is.
