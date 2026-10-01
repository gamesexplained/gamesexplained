# Delta — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor allowed looking the game up online, but on
  1 October 2026 this session's network policy refused every page fetch
  (c64-wiki.com, en.wikipedia.org, lemon64.com via web.archive.org,
  archive.org, zzap64.co.uk: HTTP 403 at the proxy). What follows from
  the web is what a web search engine's result summaries quoted from
  these pages on that date, so it is second-hand and kept to plain claims:
  - C64-Wiki, "Delta", https://www.c64-wiki.com/wiki/Delta
  - Wikipedia, "Delta (video game)", https://en.wikipedia.org/wiki/Delta_(video_game)
  - Lemon64, "Delta", https://www.lemon64.com/game/delta, and its review
    https://www.lemon64.com/review/delta/37
  - Zzap!64 review, https://www.zzap64.co.uk/c64/gow8.html
  - CSDb, "Delta Mix-E-Load", https://csdb.dk/sid/?id=14300
- The game's own screens, captured in the emulator on 1 October 2026
  (`reference/`). No manual was read.

## Features

| Feature | Status | Where |
|---|---|---|
| Horizontally scrolling shoot 'em up: the ship flies right through space, starfield behind | live | `reference/wave1-start.png`; the stars are three parallax layers of single-pixel characters (`stars_update` `$1DB9`) |
| Enemies come in waves (formations) | confirmed | `wave_spawn_step` `$8010`, `wave_records` `$AB00`; `reference/wave1-formation.png` |
| Shooting a whole formation usually earns a credit | confirmed | a group that carried a credit adds one when none of its enemies escaped (`$80B5`); most records carry one. Seen indirectly: the shop's icons turned light blue only with credits poked; no formation was cleared by hand |
| A group of icons appears ("a corner shop in space"); blue icons are bought by flying over them, spending credits | live | the shop is a group whose sprites are the icons (`$1288`, record `$45`, the second group of stage 1); price = icon number; `shop_try_buy` `$2261`. Bought icon 4 with the ship placed on it: `facts.md`, The shop |
| Grey icons kill the ship on contact | live | an icon costing more than the credits counts as a hit (`shop_try_buy`); touching icon 5 with 2 credits set the hit flag. Grey = unaffordable (`icons_update` `$0808`); `reference/grey-blocks.png` is the shop with no credits |
| Only one extra can be chosen per shop | confirmed | a second touch in the same shop counts as a hit (`$12F7` stays set while the shop is up) |
| Power-ups: higher speed, faster rate of fire, among others | confirmed | seven: speed, fire rate, extra weapon (three-way), double laser, orbiter, slow-down, shield (`facts.md`, Weapons); all seven poked on and seen firing (`reference/weapons-poked.png`) |
| The icon of the skill being improved animates for a while in the bottom row | live | 14 blinks of 8 frames between its two frames (`icons_update`), seen on icon 4 |
| Named sections of the region, with hazards at the top and bottom matching the name | live | 32 stages named by three words each (ENTERING ROCKS OF DEATH ...), `stage_banner_table` `$F880`; the ENTERING stages bring rows of rocks, bubbles or machinery along the top and bottom (`stage_hazard_table` `$F900`); `reference/stage2-banner.png`, `stage2-rock-rows.png` |
| 32 levels | confirmed | `stage_advance` `$91EF`: after stage 32 the game shows DELTA MISSION COMPLETE and starts again, harder (`difficulty_set` `$9D35`) |
| One or two players | live | F1 on the title; turns pass at each death (`swap_players` `$1650`) |
| Three lives; "Fasten your seatbelt Player 1" before each life | live | `game_start_scores` `$1600`; `reference/fasten-seatbelt.png` |
| Game over, then high-score entry by name | live | eight letters with the joystick (`hiscore_entry_step` `$1E52`); `reference/game-over.png`, `high-score-entry.png` |
| Title, top-scores table and a demo in turn | live | three title pages (`$0FA9`); the demo replays recorded joystick input (`demo_input` `$9F40`) |
| Music by Rob Hubbard | confirmed | a Hubbard-style driver with 13 tunes (`music_play` `$BDE4`); the title music plays at start-up; in play the music replaces the effects when F5 is pressed on the title |
| Mix-E-Load: remixing the loading music while the game loads | open | not in this image, which was loaded by the crack's own depacker; the SID register census finds only two players, the effects (`$0406`) and the music (`$BDE4`), neither with remix controls. It belonged to the original loader, which this copy does not have |
| Published in the US as "Delta Patrol" by Electronic Arts | open | not a feature of this image; nothing in it says Delta Patrol (string sweep in the game's alphabet and PETSCII) |
| Pause | live | RUN/STOP; fire resumes; T quits to game over (`pause_check` `$9A30`) |

## Beyond the documentation

Found in the code, not in the sources read.

- **Keyboard control** (F3 on the title): W, X, A, D and RETURN instead
  of the joystick (`read_keys` `$0C40`). *Live* toggle.
- **Sound choice** (F5 on the title): effects in play by default, the
  in-game tune instead. *Live* toggle.
- **Either joystick port works**: both are read and ORed
  (`read_joysticks` `$3375`).
- **The shop keeps the change as points**: buying spends every credit;
  those beyond the price are worth 100 points each (`shop_spend_step`
  `$2298`). *Live*.
- **Speed wraps**: buying speed at its top level puts the ship back to
  the slowest.
- **Extra life every 10,000 points** (`extra_life_check` `$9CD6`). *Live*.
- **Shooting the leader destroys the escort**: in waves where slot 1 is
  indestructible, destroying slot 7 makes the whole wave explode
  (`enemies_wave_timers` `$9024`).
- **Enemies have hit points and forms**: some take several hits, some
  cannot be destroyed, some turn into something else when their hits run
  out (`enemy_move_1` `$82CC`).
- **Three kinds of enemy fire** within a budget: aimed shots, homing
  bombs and eight-way bullets; owning the shield brings the bombs
  (`enemy_fire_decide` `$9208`, `enemy_fire_setup` `$9100`).
- **All hits are found by reading the screen**: every shot is drawn with
  characters, and a sprite is hit when one of the cells under it holds a
  shot (`enemies_hit_by_weapons` `$2B0A`, `ship_hit_by_fire` `$2BBC`).
- **RESTORE does nothing**: the NMI vector points at an RTI. *Live*.
- **A trainer in the code** that nothing calls (`unreached_cheat` `$BA00`).
- **The random numbers are the game's own code**, read as a table from
  `$3000` (`enemy_ai_step` `$99AC`).

## Open questions

- The Mix-E-Load loader: only an original disk or tape would show it.
- Which enemies carry the "take a credit away" flag (bit 6 of the
  record's byte 3) in practice; none was seen.
