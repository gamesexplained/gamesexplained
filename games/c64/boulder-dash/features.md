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
| Four bonus caves after D, H, L and P | confirmed | `cave_order_table` (`$81FE`) sends cave 4 to number 17, 8 to 18, 12 to 19, 16 to 20; each is a 20 by 12 room walled in steel, the update pass covers only rows 1 to 14 there (`update_pass`, `$8171`), and their headers give a time of 10 to 20 seconds |
| Start-menu choice of cave A, E, I or M | traced | `menu_cave_select` steps the cave number by four at levels 1 to 3; at levels 4 and 5 only cave A can be chosen |
| Collect a quota of diamonds, then the exit opens | confirmed | `check_quota` (`$74F6`), `exit_handler` (`$70EC`) |
| Time limit per cave and level | confirmed | time bytes 14 to 18 of the header (`start_cave_variables`, `$8274`) |
| Diamonds worth more once the quota is met | confirmed | header bytes 2 and 3, `check_quota`; in caves C, K and L and the four bonus caves byte 3 is 0, so diamonds past the quota score nothing |
| Three men and an extra man every 500 points | traced | `new_game` (`$8ADD`), `check_bonus_life` (`$73DE`) |
| Boulders and diamonds fall, roll off rounded objects and crush | confirmed | `boulder_handler` (`$76F8`), `diamond_handler` (`$731F`) and their falling versions |
| Boulders can be pushed sideways | confirmed | `try_enter_cell` (`$7555`); the push works one time in four (`push_succeeds`, `$7543`) |
| Fireflies and butterflies, which explode into space or diamonds | traced | `firefly_handler` (`$7172`), `butterfly_handler` (`$7245`), `explosion_next_table` (`$764F`) |
| Amoeba that grows, and turns to boulders or diamonds | traced | `amoeba_handler` (`$7368`) |
| Magic wall that turns falling boulders into diamonds and back for a limited time | traced | `falling_boulder_handler` (`$7745`), `falling_diamond_handler` (`$729D`), `magic_wall_timer` (`$7E9F`); after its time the wall looks like brick and destroys what falls onto it, and its time runs on through a pause |
| One or two players, one or two joysticks (F3 on the title) | traced | `menu_keys` (`$880F`) |
| Pause with SPACE; give up the cave with RUN/STOP, which costs a man, once the opening countdown is over | traced | `pause_and_restart_keys` (`$8103`) |
| Demonstration of play on the title screen | confirmed | `demo_script` (`$5EA8`) read by `demo_play` (`$8CAA`); seen live running at the title |
| Title music | confirmed | `music_step` (`$8754`), tune at `$5FE8` |
| Bonus for time left, added to the score a second at a time | traced | `time_bonus_tally` (`$8BF0`) |
| Game speed depends on level | traced | `time_delay_table` (`$8065`) |
| Joystick port 1 for play | live | fire and directions read from `$DC01` (`read_joystick_1`, `$6EF5`); fire on port 2 did nothing in the emulator; on the first title fire is not read until F1 or the demonstration has taken the logo away (`$8918`), seen live on the First Star PAL disk |

## Beyond the documentation

- The cave fill is deterministic: a seed byte in the header per level and a 16-bit generator (`cave_random_step`, `$7085`) make each cave and level the same on every play. Confirmed against the emulator's map for cave A, level 1.
- The animated pictures are rebuilt in the character set every step; in caves A to P only for the creatures the cave has (mask at `$8740`), while the four bonus caves rebuild all of them (mask 7, `$8325`) (`build_animation_frames`, `$7C61`).
- The tune's bytes are also the first characters of the tile set in the program file (`$5FE8`).
- The RESTORE key restarts the program through the NMI vector (traced).
- The first title screen shows the First Star Software logo, a multicolour bitmap from `$68E8`-`$6E67`, and ignores the fire button while it is up (`$8918`); F1 or the demonstration takes it away for good (live, on the First Star PAL disk).
- The game second is 60 frames (`$74A9`), so on a PAL machine the cave clock runs 20 % slow (live, on the First Star PAL disk).
- The magic wall's clock runs on through a pause (`$7E9F`, `$80D7`), and a falling boulder that lands on the wall ends the update pass early (`$7775`).
- An amoeba that never had room never turns to diamonds (`end_of_pass`, `$813B`).
- `$8F3D`-`$8FFF` hold the tail of the programmer's assembler symbol table, with names such as SETUP0, GMINIT and NXTPLY.

## Open questions

- Header bytes 0, 22 and 23 have no reader: only the copy at `$8248` touches them. What they were for is unknown (cave A has `$D4`, `$20` in bytes 22 and 23).
- The last entry of the symbol table scrap, :SK2, reads `$1F $FF`; why the high byte is `$FF` is unknown.
- The C64 programmer at First Star is not named in any source read.

## Answered

- Object `$3A` is the amoeba: its handler word points to `amoeba_handler` (`$7368`), and the caves that place it (G and M) are the two whose mask has the amoeba bit. The test at `$714C` (`is_rockford_or_amoeba`) covers Rockford (`$38`, `$39`) and the amoeba, so a firefly or butterfly explodes next to either.
- The eight 192-byte blocks at `$68E8`-`$6E67` are the title screen's logo: `init_graphics` (`$8D46`) copies them into the last six character rows of the bitmap at `$2000` (`$37C0`-`$3F3F`), and the VIC shows them in multicolour bitmap mode below raster line `$CA` while the logo flag `zpa_A3` is set (`vic_split_title`, `$899C`).
- The bytes from `$8F3D` to `$8FFF`, after the program's last instruction, are an assembler's symbol table left in memory: 12-byte entries of a six-character name, `$A8 $00`, the label's value and two flag bytes, such as "KEY1" = `$8A66`, ":SK3A" = `$8A74` (at `$8F4E`) and "SETUP0" = `$8AB9`. Nothing refers to them.
- `check_restart_fire` (`$815B`) ends the cave when fire is pressed once no Rockford has been handled for 16 update passes (`zpa_96`) and the cave's clock has started (`zpa_AF`): after Rockford is killed, fire moves on, which costs a man outside the bonus caves.
