# Short Circuit — features

What the game is documented to do, with verification status against the binary. Statuses: **open** (documented, not found yet), **traced** (in the code, could not be exercised), **confirmed** (in the code, consistent with the emulator), **live** (observed directly), **differs** (the code does something else).

Sources:

- C64-Wiki, "Short Circuit", https://www.c64-wiki.com/wiki/Short_Circuit, read 1 November 2026 through a fetch tool that summarised the page (a second-hand reading).
- A web search summary of Wikipedia's "Short Circuit (video game)" and of other pages, 1 November 2026: credits and year only. The search results said the Spectrum version's manual describes two parts; they were not taken as the C64's.
- The game's own screens and text: the credits screen, the high-score table, the stored messages (`facts.md`, "Text").
- Not read: a C64 manual or review (the one page tried, Commodore User on everygamegoing.com, refused the connection).

## Features

| Feature | Status | Where |
|---|---|---|
| Two parts on one disk: an adventure (part one) and a countryside run (part two) | live | part one at `$0400`, part two at `$2624`; F1 and F3 on the attract screen start them |
| Part one: about 36 screens of the Nova laboratory, a side-scrolling map explored with the stick | confirmed | map rows `$4000`/`$4100`/`$4200`, 256 columns each, scrolled by `$087B` |
| Space bar cycles the actions JUMP, LASER, SEARCH, UTILISE | live | `action_select_poll` (`$067D`), labels at `$06E1` |
| Fire performs the selected action; menus are driven by stick and fire | live | `main_loop_frame` (`$04E8`), mode table `$43E8` |
| SEARCH finds objects and lets Johnny TAKE them (hold at most four) | live | `action_search` (`$0BF6`), `mode_search_finish` (`$0C2D`), object table `$1568` |
| UTILISE: HIDE an object in a container, INPUT an object into a terminal or lock, DESCRIBE an object | confirmed | `action_utilise` (`$166A`), modes 5 to 11 |
| Collect the JUMP ROM and LASER ROM to unlock JUMP and LASER | confirmed | `action_jump` (`$192F`) and `action_laser` (`$18FF`) test the inventory for objects 2 and 0 |
| Terminals: log on, link up, override the alarm, switch the sprinklers | confirmed | `input_terminal_computer` (`$1DC3`), puzzle flags at `$0299` |
| Locked drawers and cabinets opened with keys | confirmed | `input_lock_check` (`$1CFA`), container table `$15BC` |
| A thirty-minute clock; running out of time ends the game | confirmed | `check_time_up` (`$24D9`); the clock starts at 3:00 and the limit is 3:30 |
| Build a decoy robot from four objects to finish part one | confirmed | `check_decoy_parts` (`$2219`), `decoy_parts` (`$225A`) |
| Energy and shield bars (E and S) that drain | live | `energy_drain_step` (`$1EE4`), `shield_drain_step` (`$1F28`) |
| Guards and an enemy robot who capture Johnny ("CAPTURED AND DEACTIVATED") | confirmed | `guard_logic` (`$227C`), `capture_ending` (`$238E`) |
| Part two: jump over animals, duck, shoot soldiers' belt buckles with the laser | traced | part-two actors `$2DD4` to `$35B3`; the laser shot `player_fire` (`$3AEC`); no soldier was reached in play |
| Part two: terrain that slows Johnny (mud) | traced | `terrain_type_table` (`$8AFF`) and `look_up_ground` (`$8A8E`); not isolated in play |
| Music by Martin Galway | confirmed | three-voice script driver at `$9EB1`-`$ACA0`; its tune table at `$ACA0` |
| High-score table of ten entries with three-letter initials | live | `$83E8`, `game_over_scores` (`$97F0`) |
| Pause with F7 | live | `pause_check` (`$21CF`): the clock stopped while it was held |
| F5 abandons a game | live | `abort_key_check` (`$9B3A`): the attract mode came back |
| Escape in a truck at the end of part one | open | message 46 says the truck has already left; the ending that uses it was not reached |

## Beyond the documentation

- F1 and F3 on the attract screen start part one and part two directly; fire plays the intro first. The C64-Wiki page says only that cracked copies with a menu can skip to part two (`orientation.md`).
- The game uses undocumented 6502 opcodes (`LAX (zp),y`) in its colour-fill loops at `$0BCF`, `$0BDD`, `$1EC8`, `$1ED6`, `$2AD6`, `$2AF4` and `$2B02`.
- `$3DE0`-`$3FFF` holds an older build of part two's ending sequence that is never run (`facts.md`).
- Part two uses a CIA2 timer NMI as a second scroll driver.

## Open questions

- What each of part two's fifteen events is, by name, and which of the soldiers' behaviours the wiki describes the code implements.
- Whether the Spectrum version's "two independent parts" corresponds to the F1 and F3 starts here.
- What the 1,192 bytes after the title picture's bitmap hold.
