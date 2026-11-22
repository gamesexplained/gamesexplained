# Chuckie Egg 2 — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own instruction pages (I on the title screen), read from the
  emulator on 22 November 2026, and the strings at `$E4BC`-`$E9E4`.
- Web search result summaries, 22 November 2026 (second-hand: the hosted
  session's page fetches needed an approval nobody was there to give):
  Wikipedia's Chuckie Egg 2 page (A&F Software, 1985; ZX Spectrum, C64,
  Amstrad CPC first; the egg made of sugar, milk and cocoa powder with a
  toy inside, delivered to the dispatch lorry, the quest restarting with
  more monsters and another toy); c64online.com's page (120 screens in a
  10 by 12 grid; points for each new screen and for pick-ups); GameBase64
  entry 1475 (joystick in port 2; a crack by Pugsy with trainers);
  spectrumcomputing.co.uk (Crash 17, June 1985: save game and save
  scoreboard, for the competition).

## Features

| Feature | Status | Where |
|---|---|---|
| Make an egg: eight each of cocoa, milk and sugar dropped into the right vats | confirmed | `drop_vat_check` `$746B`, counts `$10`-`$12` |
| Eight cyan toy parts dropped into the toy maker make the toy | confirmed | `drop_fall_end` `$764C`, `toy_made` `$76C0`, count `$0F` |
| Take the finished egg to dispatch, then start the next egg | confirmed | `check_egg_delivered` `$4A55`, `egg_delivered` `$5A00` |
| More monsters on each later egg | confirmed | `creature_counts` `$5D58`: 155, 180, 205, 230, 255, then all 256 entries of the creature list |
| A different toy for each egg | confirmed | `pickups_init` `$7B75`, four sets, the fifth egg repeating the first |
| Joystick in control port 1 | differs | the instructions say port 1; `read_input` `$8750` reads port 2 (`$DC00`). Live: the stick in port 1 presses keys instead (its lines are the keyboard's rows; right is F7, save) |
| Redefinable keys | live | `redefine_keys` `$E9F3`; defaults A, Z, comma, full stop, SPACE, CTRL, F1, F7 (`default_keys` `$ECB6`), read from the play snapshot |
| Save the game at any time on a platform, ladder or chain | differs | `main_loop` `$4A87` lets the save key through only in state 1 (platform) or 3 (ladder); on a chain (state 4) it is ignored |
| Save and load the high-score table (S, L) | traced | `save_table` `$F113`, `load_game` `$F1CB`; tape not exercised |
| Items can be moved from place to place | live | `take_item` `$7034`, `drop_item` `$7300`; the ladder taken in room 109 and dropped in rooms 1, 109 and 118 |
| Factories need power | confirmed | `power_switch` `$6C64` in room 115; the train and lifts move only with `$B0` set |
| Only two hands, "unless" (the basket) | confirmed | `basket_take` `$723C`: four baskets each count what goes in |
| Some pipes more slippery than others | confirmed | property bit `$20`; `state_pipe` `$4E96` drops Harry when he stands still on one |
| Points for each new room | live | `room_visit_bonus` `$4803`; 1,000 on entering room 2 in the recorded session |
| Pick-ups score, by egg | confirmed | `take_or_collect` `$6AB2`: the shape's value times the egg number |
| 120 rooms in a 10 by 12 grid | confirmed | `exit_right`/`exit_left`/`exit_up`/`exit_down` `$4CDA`-`$4D68`; `room_table` `$9000` |
| Lives, an extra life for each vat filled, toy made and egg | confirmed | `lives` `$D7`; `vat_full` `$7755`, `power_on` `$6C84` |

## Beyond the documentation

- Rooms 80 and 71 are joined: leaving room 80 to the right leads to room
  71 and back (`exit_right` `$4CDA`). The train's track loops the same way
  (`train_next_room` `$6F70`).
- The room records keep their colours as ZX Spectrum colour numbers, mapped
  to C64 colours as they are drawn (`spectrum_colour` `$4088`).
- A fall of fifteen steps kills (`land_check` `$5111`).
- The vats take the ingredients that come before their own: toy parts and
  milk into the cocoa vat, for example, each counted as its own kind
  (`drop_vat_check` `$746B`).
- Creatures choose with a random number seeded the same way every game
  (`rnd` `$64D2`).
- Some creatures throw Harry into a jump instead of killing him
  (`collide_check` `$7A00`).
- Dying returns what Harry carried to where it came from, except the toy
  and the egg (`lose_life` `$7875`).

## Open questions

- **The green ladder "sinks into the floor"** (the contributor). Tested on
  22 November 2026 with the game's own take and drop: taken in room 109 and
  dropped on the floor there and in room 1, it stands on the floor with its
  bottom row on the row of Harry's feet (rows 18-22 above a floor at row
  23). In room 118, dropped standing on the one-cell block, it stands at
  rows 16-20 in column 25, beside the block; the fixed ladder above ends
  at row 13 in column 24, so two rows and a column separate them. Not yet
  seen: the ladder sinking, or a fall through the floor.
- Room 106 drew as a black screen when entered by the restart-point
  teleport used for testing; not yet known whether the room itself or the
  test was at fault.
