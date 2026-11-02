# Rambo: First Blood Part II — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The game's own instruction pages (`reference/instructions-1.png`,
  `reference/instructions-2.png`), read 2 November 2026
- "Rambo (1985 video game)", Wikipedia,
  https://en.wikipedia.org/wiki/Rambo_(1985_video_game), read 2 November 2026
- ZZAP!64 issue 10's review as reproduced by GB64's Game of the Week,
  https://gb64.com/oldsite/gameofweek/10/gotw_rambo.htm, read 2 November 2026
- The C64-Wiki has no page under the game's title (HTTP 404 on
  2 November 2026); Lemon64 refused the fetch (HTTP 403).

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick moves Rambo; fire uses the weapon in hand ("PLACE YOUR WEAPON INTO PORT TWO") | live | `read_stick` `$1CD0` ANDs both ports, so either port works; `fire_check` `$19F7` |
| Space bar selects the weapon | traced | `weapon_select_key` `$19BD`, key code `$3C`; steps to the previous owned weapon. Pressed in the play session; the change was not measured |
| "S" toggles music and sound effects | traced | `music_toggle_key` `$0CCC`: toggles effects off (`$0D11`) and the voices the music may use (7 or 0) |
| RUN/STOP toggles a pause | traced | `key_pause_toggle` `$09F8` sets `$0A19`; `irq_panel` then freezes input and silences the SID |
| Extra weapons lie in the terrain and the enemy campsite | confirmed | four map items (`$0BB7`-`$0BCB`); `item_pickup_check` `$0A1A` adds weapon bits to `$19ED` |
| Starting weapons (the sources disagree) | traced | weapons 0-2 owned at the start (`$19ED` = 7); which weapon each number is was not tied to a picture |
| An energy bar; death when it runs out | confirmed | `energy_tick` `$0C89`, energy `$0CC3` from `$30`; damage per hit in facts.md |
| Free scrolling in every direction over a jungle map | live | `scroll_jungle` `$1C67`; map of 119 by 16 tiles at `$E770` |
| The POW camp, Banks and the hut opened with the knife | traced | `hut_door_check` `$08D9`: weapon 0 on the hut-door character `$E0`, after the first flight, frees ten POWs (`$0846`). Banks on a cross was not found as a separate object; open |
| A helicopter; once aboard its fuel runs down fast | confirmed | the fuel is the energy bar: `gunship_fire_timer` `$304E` adds a unit of damage every `$3064` frames |
| Inside the helicopter only the rocket launcher fires | traced | `heli_fire_rocket` `$3140` fires only with weapon 5 |
| An enemy gunship harasses the flight north | confirmed | `gunship_update` `$3066`; pursues on the second flight (`$3825`); five hits bring it down |
| Three stages, points for each, the game starts again after the mission | traced | the mission ends on landing from map row `$300` northward with message 4, then `game_start` again (`heli_landing_check` `$356E`) |
| Name-entry wheel and all-time heroes table | live | `name_entry` `$C367`, `attract_pages` `$C827`; 80 entries at `$B000`/`$B0F0` |
| Martin Galway's music; nine tunes counted in play | confirmed | twelve tunes and their effects on the driver at `$8100`, played on the page; tune 28 has no caller |
| Noise draws the enemy | confirmed | explosions and weapon 4 add 5 each to the spawn budget `$119B` |

## Beyond the documentation

Found in the code, not in the manual.

- The loader checks for a cartridge: it writes `$8004` and resets the
  machine if the write does not hold (`orientation.md`).
- Enemies fire more often the further north the screen is (`bullet_fire` `$2586`).
- The helicopter's rotor loop sounds only with the music switched off (`loop_tick` `$8423`).
- The credits are the heroes table's default names (`$B0F0`).

## Open questions

- Which weapon is which picture: the code numbers them 0-5.
- Where Banks is: no object or tile for a captive on a cross was identified.
