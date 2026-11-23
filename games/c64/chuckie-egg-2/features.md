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
  milk into the cocoa vat, for example (`drop_vat_check` `$746B`). Milk,
  cocoa and sugar are counted as their own kind (`ingredient_in` `$76FF`);
  a toy part in any vat but the toy maker counts nowhere and stays gone
  until the next egg or game (`game_state_init` `$49CA`), so that egg
  cannot be finished. Confirmed in VICE: a toy part dropped into the milk
  vat in room 33 left all four counts at 8.
- Creatures choose with a random number seeded the same way every game
  (`rnd` `$64D2`).
- Some creatures throw Harry into a jump instead of killing him
  (`collide_check` `$7A00`).
- Dying returns what Harry carried to where it came from, except the toy
  and the egg (`lose_life` `$7875`).

- **The green ladder sinks into the floor** (reported by the contributor;
  traced and confirmed in VICE). `drop_item` reads the item's shape
  through `(work1),y` at `$73AD` with only `work2` set (`drop_size`
  `$73A9`); `work1` is left at `$27`, `$28` or `$29` by power_on and
  other routines, so the item is measured with another item's picture.
  The ladder (5 rows) is measured as 2 rows and placed 3 rows low, over
  the one-cell block in room 118 and the floor; taking it back clears five
  cells and leaves a hole. With `work1` at `$27` a milk bag also sank one
  row and a toy part could not be dropped. `LDA $8500,Y` and three NOPs
  at `$73A9` (`B9 00 85 EA EA EA`) fix it: with the fix Harry climbs the
  ladder from the block, jumps to the fixed ladder and leaves room 118.
  The copy with the room 76 fault has the same drop code; from the
  contributor's save of it (power off, `work1` 0) the ladder stood on the
  block, and with `work1` set to `$27` it sank to rows 19-23.

- **Room 76 in other copies** (reported by the contributor, who sent a
  snapshot of another copy). In many copies the five bytes at `$9FFB`
  (`room_076_ceiling`) read `43 45 32 2D 42` ("CE2-B" in ASCII) instead
  of `2C 3A 02 00 20`. The ceiling run then starts at row 50: no ceiling,
  and its cells land at `$0801-$0842`, `$1B01-$1B42` and `$DC01-$DC42`.
  CIA 1's timer controls get `$03`, keyboard columns 6 and 7 read low, and
  the left key (comma) reads as held: Harry walks left without stopping.
  Players report (the contributor, and and https://www.bagshot-row.org/chuckie-egg/commodore642.html, which
  he cites; it could not be fetched from the cloud session)
  that the game cannot then be finished; not tested here.
  Confirmed in VICE with this copy's room 76 given those bytes. That
  other copy also uses `$B0-$B5` for the print routines' temporaries
  (this one `$90-$95`), and differs in two tape constants and the loader.

## Open questions

- Room 106 drew as a black screen when entered by the restart-point
  teleport used for testing; not yet known whether the room itself or the
  test was at fault.
