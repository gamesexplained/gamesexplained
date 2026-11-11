# Boulder Dash — features

What the game is documented to do, with verification status against the
binary. Statuses: **open**, **traced** (in the code, not exercised),
**confirmed** (in the code, consistent with the emulator), **live**
(observed directly), **differs**.

Sources:

- Wikipedia, "Boulder Dash (video game)", read 10 November 2026
- C64-Wiki, "Boulder Dash", read 10 November 2026
- GameBase64, ZZAP!64 Top 64 text for Boulder Dash, read 10 November 2026

## Features

| Feature | Status | Where |
|---|---|---|
| 16 caves, A to P, each with five difficulty levels | confirmed | 16 descriptions in the table at `$582E`; the five seed, quota and time bytes in each header; level chosen at the title by up and down (`menu_cave_select`, `$884A`); the map of cave A level 1 was checked against the emulator |
| Four bonus caves after D, H, L and P | confirmed | `cave_order_table` (`$81FE`) sends cave 4 to number 17, 8 to 18, 12 to 19, 16 to 20; their descriptions are short and give a time of 10 to 20 seconds |
| Start-menu choice of cave A, E, I or M | traced | `menu_cave_select` steps the cave number by four |
| Collect a quota of diamonds, then the exit opens | confirmed | `check_quota` (`$74F6`), `exit_handler` (`$70EC`) |
| Time limit per cave and level | confirmed | time bytes 14 to 18 of the header (`start_cave_variables`, `$8274`) |
| Diamonds worth more once the quota is met | confirmed | header bytes 2 and 3, `check_quota` |
| Three men and an extra man every 500 points | traced | `new_game` (`$8ADD`), `check_bonus_life` (`$73DE`) |
| Boulders and diamonds fall, roll off rounded objects and crush | confirmed | `boulder_handler` (`$76F8`), `diamond_handler` (`$731F`) and their falling versions |
| Boulders can be pushed sideways | confirmed | `try_enter_cell` (`$7555`); the push works one time in four (`push_succeeds`, `$7543`) |
| Fireflies and butterflies, which explode into space or diamonds | traced | `firefly_handler` (`$7172`), `butterfly_handler` (`$7245`), `explosion_next_table` (`$764F`) |
| Amoeba that grows, and turns to boulders or diamonds | traced | `amoeba_handler` (`$7368`) |
| Magic wall that turns falling boulders into diamonds and back for a limited time | traced | `falling_boulder_handler` (`$7745`), `magic_wall_timer` (`$7E9F`) |
| One or two players, one or two joysticks (F3 on the title) | traced | `menu_keys` (`$880F`) |
| Pause with SPACE, end the cave with RUN/STOP | traced | `pause_and_restart_keys` (`$8103`) |
| Demonstration of play on the title screen | confirmed | `demo_script` (`$5EA8`) read by `demo_play` (`$8CAA`); seen live running at the title |
| Title music | confirmed | `music_step` (`$8754`), tune at `$5FE8` |
| Bonus for time left, added to the score a second at a time | traced | `time_bonus_tally` (`$8BF0`) |
| Game speed depends on level | traced | `time_delay_table` (`$8065`) |
| Joystick port 1 for play | live | fire and directions read from `$DC01` (`read_joystick_1`, `$6EF5`); fire on port 2 did nothing in the emulator |

## Beyond the documentation

- The cave fill is deterministic: a seed byte in the header per level and a 16-bit generator (`cave_random_step`, `$7085`) make each cave and level the same on every play. Confirmed against the emulator's map for cave A, level 1.
- The animated pictures are rebuilt in the character set every step, and only for the creatures a cave has (`build_animation_frames`, `$7C61`, mask at `$8740`).
- The tune's bytes are also the first characters of the tile set in the program file (`$5FE8`).
- The RESTORE key restarts the program through the NMI vector (traced).

## Open questions

- Object `$3A` is drawn as amoeba by the object-to-tile table but is inside the range `$38`-`$3A` that `is_rockford_here` (`$714C`) treats as Rockford. Which one it is in play is unknown.
- Header bytes 22 and 23 (`$D4`, `$20` in cave A) have no use found.
- Eight 192-byte blocks at `$68E8`-`$6E67` are copied to `$3840`-`$3F3F` at start and no routine was found that reads them. Whether the VIC shows them was not checked.
- Twenty-three bytes after the program (`$8F4E`) spell ":SK3A" and ":SK4" in ASCII. Nothing refers to them.
- `check_restart_fire` (`$815B`) ends the cave when fire is pressed in some state. The exact condition was not exercised.
- The C64 programmer at First Star is not named in any source read.
