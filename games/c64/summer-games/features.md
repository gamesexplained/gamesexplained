# Summer Games — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The instructions as transcribed for the Spectrum release, https://worldofspectrum.org/pub/sinclair/games-info/s/SummerGames.txt, read 17 November 2026 (the events and controls match the Commodore 64's; the Spectrum's skeet round of 32 targets does not)
- C64-Wiki, https://www.c64-wiki.com/wiki/Summer_Games, read 17 November 2026
- Wikipedia, https://en.wikipedia.org/wiki/Summer_Games_(video_game), read 17 November 2026
- MobyGames credits and trivia, https://www.mobygames.com/game/13022/summer-games/credits/, read 17 November 2026
- GameBase64's Game of the Week, after Zzap!64 issue 3 (July 1985), https://gb64.com/oldsite/gameofweek/3/arcadesfeature/gotw_summergames.htm, read 17 November 2026
- The game's own screens, from the PAL G64 in the emulator

Addresses name the part that holds them (`parts/<id>/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen naming seven designers, then an opening ceremony: a torch-bearer climbs the steps, lights the flame, and doves fly | live | `reference/title.png`, `reference/ceremony.png`, `reference/ceremony-flame.png`; front `ceremony_start` `$7600`, `cer_flare` `$7830`, `cer_doves` `$773B` |
| Main menu: compete in all events, compete in one event, practise one event, number of joysticks, world records, opening ceremonies | live | `reference/menu.png`; resident `main_menu` `$0C1F`, jump table `$0CF6` |
| Up to eight players, each types a name and picks a country from a scrolling chart of flags | live | `reference/flags.png`; resident `registration` `$3280`, `choose_flag` `$35BF`, `type_name` `$347F` |
| Eighteen countries, Epyx among them, each with its own anthem played when picked and at a gold medal | confirmed | resident `country_codes` `$3577`, `tune_offsets` `$1E58`, `frame_flash` `$375D`, `victory` `$1384` |
| Medals score 5, 3 and 1 points; standings shown between events | confirmed | resident `count_points` `$10D8`, `standings` `$1051` |
| World records kept on the disk and updated when beaten | confirmed | resident `world_records` `$0B00`, `check_record` `$1403`, `save_records` `$1563`; `reference/world-records.png` |
| Pole vault: grip forward high, left or right medium, back low; fire to run, back to plant, forward to kick up, fire to let go | differs | pole-vault `pv_state3` `$C157`: the grip starts at medium and up and down step it one place (keys H, M and L choose directly), so from high, down gives medium; `pv_vault` `$B7F7` (down plants), `pv_swing` `$B95E` (up swings, fire lets go) |
| Pole vault: three tries a height; a player may pass a height | confirmed | pole-vault `pv_tries` `$C9A2`, `pv_state1` `$C0E9` ("TRY THIS JUMP?" below 5.00 m) |
| Pole vault heights | confirmed | pole-vault `height_m` `$C91C`, `height_dm` `$C92D`: 4.0, 4.5, 4.8, then 5.0 to 6.2 m by tenths |
| Platform diving: four dives, forward, backward, reverse and inward; fire takes off | confirmed | diving `dive_flags` `$BA40`, `start_dive` `$A929`; `reference/diving-menu.png` |
| Platform diving: right tuck (fastest), back pike, left half-pike, forward layout (slowest) | confirmed | diving `read_position` `$ABA6`, `spin_rate` `$B902` |
| Platform diving: seven judges, high and low dropped, sum times difficulty | live | `reference/diving-score.png`; diving `split_judges` `$B293`, `high_low` `$B2D9`, `mult_difficulty` `$B381` |
| Platform diving: a perfect entry is vertical and fully extended, head or feet first | confirmed | diving `judge_entry` `$B261`, `entry_base` `$B82A`: only the layout scores, 100 at the vertical frames |
| Platform diving: difficulty from 1.0 to 4.1, by rotations and positions | differs | diving `dive_setup` `$A816`, `read_position` `$ABA6`, `half_turn_bonus` `$ABF7`: it starts at 0.0 to 0.3 by dive (`start_diff` `$BA44`), adds 0.1 for each of the first three frames in each new position and 0.3 (0.4 with a carry) for each half-turn, with no cap in the code; the forward dive in `reference/diving-score.png` rated 1.1; 4.1 was not tried |
| 4 x 400 m relay: right sprints, centre runs, left coasts; an energy bar; fire hands over the baton | confirmed | running `read_sticks` `$6527`, `drain_energy` `$5925`, `energy_bars` `$605C`, `baton_pass` `$64DF` |
| Relay and dash: two false starts disqualify | confirmed | running `false_start` `$5D41` |
| Relay and dash: a computer pacer runs in a lane nobody takes | live | `reference/dash.png`; running `introduce_heat` `$5B69`, `pacer` `$657C` |
| 100 m dash: waggle the stick left and right | confirmed | running `dash_move` `$63E6`, `waggle_ring` `$63C3` |
| Gymnastics (the vault): fire to get set, release to run, fire to jump on the springboard, left or right to twist, fire to push off the horse, forward tuck, centre layout, back to land | confirmed | gymnastics `wait_set` `$426E`, `run_up` `$42C0`, `on_board` `$43E6`, `on_horse` `$44BE`, `flight` `$457C`, `landing_pose` `$4641` |
| Gymnastics: two vaults, scored for execution and difficulty | confirmed | gymnastics `final_score` `$4BB2`, `save_score` `$4C1B` |
| Freestyle relay and 100 m freestyle: right dives in, fire as an arm enters the water for a power stroke, left for the kick-turn, right to hand over | confirmed | swimming `dive_start` `$F9D8`, `stroke` `$FB99`, `wall_check` `$FB06`, `swimming` `$FA96` |
| Swimming: three false starts disqualify | confirmed | swimming `check_false` `$E646` |
| Skeet shooting: 25 targets from eight stations, one shot for a single, two for a double; fire pulls and fires; the sight droops | confirmed | skeet `sk_station_list` `$7A64`, `sk_fire` `$71AA`, `move_sight` `$72F2`; `reference/skeet.png` |
| Skeet shooting: the same pattern of targets every time | confirmed | skeet `sk_station_list` `$7A64`, a fixed table |
| Practice mode: one event, the player is "CONTESTANT" | live | `reference/pole-vault.png`; resident `practice` `$0D15`, `contestant_name` `$11B3` |
| RESTORE with RUN/STOP leaves an event for the menu | confirmed | resident `nmi_restore` `$0906`; running `restore_key` `$68B8`; swimming `sw_nmi` `$E5C8` |
| "Bummer Games II": F3, DEL and cursor down before the title changes its words | open | the title screen is shown while the boot loader runs, outside every part studied; no "BUMMER" text is in any file, packed or unpacked |
| Linking with Summer Games II for one Olympics | open | needs the second game; nothing in these parts asks for its files |

## Beyond the documentation

Found in the code, not in the manual.

- A copy-protection check before every event reads track 35, sector 1 and expects the drive's error 29; a copy without it halts the processor (resident `protection_check` `$3AEA`, `jam` `$0F01`).
- The registration line is stored as "B.B.MCGHIE PICK YOUR COUNTRY", a designer's name that the player's name always covers (resident `country_prompt` `$354F`).
- The ceremony holds "COPYRIGHT (C) 1983 EPYX", which nothing prints (front `cer_copyright` `$7E61`), and a second tune it never starts (front `tune_unused` `$7C6F`).
- In diving only the layout scores at entry: any bent position enters the water for zero (diving `entry_base` `$B82A`).
- The relay and dash module keeps a debug display of four bytes in hex that the main loop no longer calls (running `rn_debug_hex` `$6756`).
- The swimming module leaves in a timing probe (swimming `probe_line` `$BFFF`).
- The engine's table of modules names a twelfth module, file L, that nothing asks for; file M, a copy of its screen in other colours, is not named at all (resident `module_letters` `$0AF3`; `media.json`).

## Open questions

- How the title screen is drawn, and the "Bummer Games II" keys: both belong to the boot loader, which no part covers.
- Whether the difficulty can reach the manual's 4.1.
