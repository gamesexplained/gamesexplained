# Storm — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own screens: the title, the menus and the twelve pages of
  instructions (`reference/instructions-*.png`), and the text the game
  stores (`facts.md`, "Strings"), read 14 October 2026.
- Mastertronic's manual for Storm, the US printing ("Mastertronic Limited
  1987", C64/128 and PC), scanned by MOCAGH:
  https://archive.org/details/vgmuseum_mastertronic_storm-alt-manual,
  read 14 October 2026.
- Warren Pilkington, "Game Review: Storm (Commodore 64, Mastertronic)",
  Mastertronic Collectors Archive, 21 November 2025:
  https://mastertronic.co.uk/game-review-storm-commodore-64-mastertronic/,
  read 14 October 2026. Its companion review of the Commodore 16 version
  names Jim Baguley as the programmer of both conversions.
- CSDb's entry for the tune, `Storm` by David Whittaker, Mastertronic
  1986 (HVSC `/MUSICIANS/W/Whittaker_David/Storm.sid`, load and init
  `$9000`, play `$911B`): https://csdb.dk/sid/?id=30438, read 14 October
  2026.
- C64-Wiki has no page for the game (https://www.c64-wiki.com/wiki/Storm
  was empty on 14 October 2026), and Lemon64 answered every fetch with a
  browser check (HTTP 403).

## Features

| Feature | Status | Where |
|---|---|---|
| Two characters: Storm the warrior (blue) and the wizard Agravain Undead (red); two joysticks for a two-player game | confirmed | two player records copied in and out of one work copy (`load_a`, `load_b`, `save_a`, `save_b`); the colours were not checked |
| Agravain on joystick 1, Storm on joystick 2 (the game's own instructions; the manual says the opposite, and the review says the game is right) | confirmed | `load_a` reads `$DC01` (port 1), `load_b` reads `$DC00` (port 2) |
| A one-player game is always Agravain (review) | live | `game_init` gives player B no energy in a one-player game; every live test played Agravain alone |
| Rotational controls: left and right turn the character, forward moves it the way it faces | confirmed | `joystick`, `walk`; a turn at most every two passes (`turn_delay`) |
| Fire shoots, for both characters | confirmed | `control`: fire without down, one shot each in flight (characters `$FE` and `$FF`) |
| Storm: down and fire fires an amulet | confirmed | `joystick` |
| Agravain: down uses a mask, down and fire uses a scroll | live | `joystick`; a scroll was cast with the joystick in the magic test (`facts.md`, "Live tests"); the mask is traced |
| Mask magic removes generators and is very powerful; amulets and scrolls destroy every monster | differs | a mask removes every generator; a scroll or amulet clears only the slots from 0 up to the count of monsters out, so after a kill some survive (*live*; `facts.md`, "Bugs and oddities") |
| Generators produce monsters; shooting removes them for a while; they reappear when the room is entered again | confirmed | `spawn`, `shot_hit` (five hits, `GENERATORS REAPPEAR IF THE ROOM IS RE-ENTERED`), `draw_generators` on every entry |
| Two kinds of generator (review) | confirmed | `draw_generators`: two looks, chosen by the record's high nibble; each makes one kind of monster (six kinds) |
| Energy for each player, shown in the panel; it runs down; food and bottles of restorative fluid raise it | live | energy fell with the hunger toll in the armour test; food adds 200, fluid 500 (`obj_effect`) |
| Armour protects against Una Cum's minions (manual) | live | armour greater than a drain stops it entirely, so a little armour makes a player immune to hunger (`lose_energy`; armour test) |
| A score for each player, shown in the panel | confirmed | one point a monster (`shot_hit`), 1000 a chest (`obj_effect`) |
| A jewel-filled chest to find (stored message) | confirmed | object type `$13`, eight in the rooms, 1000 points |
| Cabbala symbols trigger traps, helpful or not; some are false (manual); a trap can open something a screen or two away (review) | differs | 47 traps (`trap_fire`): most remove walls; some remove food or scenery; those in rooms 17 and 41 remove only themselves. A trap changes only its own room, so nothing a screen away |
| Doors: standard, mauve and gold, each opened with its own kind of key (manual); keys are saved to open doors | confirmed | three locked doors in `touch_object`: type `$0D` takes a key (ten of them), `$0F` needs special key 7 and `$1A` special key 8 (one of each). `$1A` is drawn with purple; `$0F` has the standard door's colours, so which the manual calls gold is open |
| A special key that opens only one door (stored message) | confirmed | special key 7 in room 92 opens room 77's door; special key 8 in room 11 opens room 46's; neither is used up (`touch_object`) |
| Three snake brooches open the door to the wizard's laboratory, where Corrine is | confirmed | door type `$1B` in room 3 needs three brooches; exactly three can be taken (rooms 11, 44 and 63) |
| Finding Corrine ends the game (`YOU HAVE FOUND CORRINE SHE IS GLAD TO SEE YOU WELL DONE`) | live | `enter_room`, room 99: the message, sound 14 six times over 1,280 frames, then the title (room 99 entered with `map_index` set to `$55`) |
| A message line under the panel scrolls a description of each room on entry, and a line for each thing picked up | live | `panel_band`, `enter_room`; room 69's test |
| The first player to leave a room closes all the other doors (stored hint) | confirmed | `edge_check` closes every other doorway with character 3 |
| Flick-screen rooms, about a hundred of them (review) | confirmed | 100 rooms on a 16-by-12 map (`room_map`) |
| Warnings when energy is low: `AGRAVAIN IS ABOUT TO DIE..`, `STORM NEEDS FOOD BADLY` | confirmed | `lose_energy`: under 1000 and under 500, with sound 14 |
| Game over when energy runs out (`PLAYER GAME OVER` stored) | live | `main_loop`, `game_over`; the carry-over test ran a game to its end |
| Title tune by David Whittaker; sound effects for pick-ups and shots | confirmed | `music_init`, `music_play` on the title only; fifteen effects (`sfx_start`) |
| Title screen with a scroller of credits; menus for the number of players and the instructions, both answered with the joystick | live | `reference/title.png`, `select-players.png`, `instructions-prompt.png` |
| Twelve pages of instructions, each left with fire | live | `reference/instructions-*.png` |
| The status panel uses the C64's own character set | live | `work/frame-play.json`: `$D018` = `$15` above line 89 |

## Beyond the documentation

Found in the code, not in the manual. Details in `facts.md`.

| Discovery | Status | Where |
|---|---|---|
| Keys, special keys, brooches, amulets, masks and scrolls carry over into the next game; the file starts the first game with 3 keys and 2 scrolls | live | `game_init` |
| Brooches carry over too, and the laboratory door needs exactly three, so brooches picked up in a later game can lock it until the game is loaded again | live | `touch_object`, `game_init` |
| A spell after a kill misses monsters in higher slots; shooting the survivor sends the count below zero, which stops the generators until the room is re-entered; a second spell then freezes the game | live | `joystick`, `shot_hit`, `spawn` |
| Armour greater than a drain cancels it, so Storm's first piece of armour, or Agravain's second, ends hunger | live | `lose_energy`, `obj_effect` |
| A monster's touch costs four times its kind byte, animation bits included: kind 5 costs 20, 60, 1 or 41 by frame | live | `mon_damage` |
| Room 69's description has no end and runs into room 70's | live | `desc_69` |
| A reset that keeps the memory returns to the title, through a cartridge signature at `$8000`; RESTORE does nothing | live | `cbm80`, `restart`, `nmi` |
| No sprites: every figure is built from characters over the floor | confirmed | `game_init` (`$D015` = 0), `compose` |
| A new monster's direction is cleared at the generator's index | traced | `spawn` |
| The room's border takes the style of its last wall record | traced | `draw_border` |
| The file was saved after play: room 0's walls and objects are marked gone until the first game resets them | traced | `reset_walls`, `reset_objects` |
| Sound effect 5 is never played | traced | `sfx_start`'s 24 calls |

## Open questions

- Which door the manual calls gold: types `$0D` and `$0F` share their
  colours, and `$1A` has purple in it.
- Whether the release as sold had room 0 untouched: the image read here
  holds a game in progress (`facts.md`, "Bugs and oddities"), which
  `game_init` hides, but whether the original files did too was not
  checked against a second copy.
