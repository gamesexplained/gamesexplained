# Stunt Car Racer — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Stunt Car Racer", https://www.c64-wiki.com/wiki/Stunt_Car_Racer, read 4 November 2026 (last edited 22 May 2022)
- Wikipedia, "Stunt Car Racer", https://en.wikipedia.org/wiki/Stunt_Car_Racer, read 4 November 2026 (raw wikitext)
- The game's own screens, played in VICE on 4 November 2026 (screenshots in `reference/`)
- No manual scan was found on archive.org (search for "stunt car racer", 4 November 2026); the cracked releases that carry the manual are disk images and were not opened.

## Features

| Feature | Status | Where |
|---|---|---|
| Boot: copyright notice, loading picture, then the menu "Single Player League / Multiplayer" | live | `reference/copyright.png`, `loading-picture.png`, `menu.png`; CHOOSE_PLAYERS `$3052` |
| Name entry ("NAME?") for each player, RETURN to continue | live | `reference/name-entry.png`; NAME_ENTRY `$ED7F` |
| League of four divisions, each with three drivers and two tracks; the player starts in Division 4 | live | `reference/league-table.png`; three places a division (`place_division` `$381D`, DIVISION_RANGE `$E8C2`), the player is driver 11 (`player_driver` `$31A4`) |
| Eight tracks: Draw Bridge, Ski Jump (Div 1), Roller Coaster, High Jump (Div 2), Big Ramp, Stepping Stones (Div 3), Hump Back, Little Ramp (Div 4) | live | league table; their order at `track_order` `$3728`, each built from its description (BUILD_TRACK `$EA34`) |
| Main menu: Hall of Fame, Practise, Start the Racing Season, Load/Save/Replay | live | `reference/main-menu.png`; MAIN_MENU `$EF3A` |
| Practise any track of a division the player can reach; three laps, then the car is repaired and refuelled | traced | PRACTICE_TRACK `$98A2` offers a division and one of its two tracks; which divisions it lets the player pick was not traced. Every race is four crossings of the start line (`$C354` = 4, CLEAR_RACE), the first just after the start (live), so three laps. After a practice race the damage is put back (RACE_END `$3DAB`, `$C719` from `$C37E`), and every race starts with the track's boost (`$C76A`, CLEAR_RACE) |
| Track preview before a race: "steer to rotate view or fire to continue" | live | `reference/track-preview.png`; ROTATE_VIEW_PROMPT |
| Crane lifts the car over the start line, "DROP START", then lets it fall | live | `reference/crane-lift.png`, `drop-start.png`; CRANE `$EC11` |
| Crane recovers a car that leaves the track and puts it back at the next suitable place; "PRESS FIRE" to be released | traced | a car wrecked on the road is put back at piece `$C309` once its count `$C368` runs out (`$3D69`, CAR_ON_ROAD `$3CC6`, START_PLACE `$F488`, which steps back to a piece a car may start on); the crane lowers it again (CRANE) |
| Joystick: left/right steer, up accelerates, down brakes (and reverses); fire with up or down is boost, limited by boost fuel | confirmed | CONTROLS `$1C64`, BOOST `$F60F`; up and up with fire seen live, and the whole-game lockstep drives the stick every way |
| Keyboard: S/D steer, RETURN boost forward, SPACE brake hard, "=" brake; braking cuts the throttle and the car freewheels | traced | READ_CONTROLS `$F79E` reads the five keys at `$F807` (`=`, SPACE, S, D, RETURN): RETURN is forward with fire, SPACE back with fire, `=` back alone. Back stops the drive (CONTROLS) |
| P pauses, O continues; F1 while paused redefines the keys; C= abandons a race | differs | PAUSE `$3EE0` (key P, then O) and REDEFINE_KEYS `$97AF` (F1 held in the pause) are as documented; C= ends a race only while the car is off the road or the race is lost (RACE_OFF_ROAD `$3D95`). F1 held at the panel before a league race skips that race (SKIP_RACE_KEY `$3B5F`) |
| Dashboard: lap count (L), boost left (B), lead or deficit to the opponent, speedometer, current and last lap time, lead flag, best-lap stopwatch | traced | DASH_LABELS `$129A`, BOOST, CAR_GAP `$F585` and SAME_LAP `$F5E9`, SPEED_TO_BAR, DRAW_TIME `$121F`, SHOW_BEST_LAP `$0F9C`, BEST_LAMP `$1144`; L, B, speed and time seen live |
| Damage: a crack along the top of the frame grows with hard landings; when it reaches the right the car is out and the opponent wins | traced | WHEELS_ON_ROAD `$0A97` adds damage for a spring pressed past its line, OPP_BUMP `$209C` for a bump; CRACK `$1B88` grows the crack to match, and when it reaches the far side, or the damage `$80`, the car is wrecked. That the opponent then wins was not traced |
| Structural damage: holes in the frame that stay for the season (the wiki says "permanent" across seasons) and make the crack grow faster | differs | a bump of 20 or more takes one of the car's ten whole parts (`$C719`, DAMAGE_BAR `$F6A6`), and a crack that steps into a hole adds damage instead of length (CRACK). The holes stay from race to race in the league, but the car has all ten parts again after a season that ends with the player in the bottom division or winning the top one (CHANGES `$375D`) |
| One computer opponent on the track in a race; collisions between cars damage | traced | OPPONENT_MOVE `$1E85` drives it, OPP_BUMP `$209C` adds the pushes' size to each point's damage |
| Season: each driver races the other two on both tracks (six races, the player in four); two points for a win, one for the fastest lap; ties go to best-lap points | differs | six races (`season_races` `$31A3`), the pairs from `$E920`/`$E926` (RACE_PAIR `$E8E5`), two points a win and one a fastest lap (SORT_DIVISION `$E9A3`); a tie on points goes to the driver with more wins, then to a coin |
| Promotion of the division leader and relegation of the last, each season | traced | CHANGES `$375D`; out of Division 1 only the player goes up |
| Super League after winning Division 1: more powerful engines and brakes, "twice as fast" | traced | the race's settings come from `$BFF5` in place of `$BFEA` (CLEAR_RACE, `race_start_bytes`): the car's drive `$0140` against `$00F0`, the opponent's engine `$013A` against `$00EC`, a unit of boost every 13 passes against 17, the damage line one higher; the opponents' limits from a second set (OPP_PICK `$1F06`). Whether that makes it twice as fast was not measured |
| Multiplayer: up to eight players take turns against the computer driver, over up to four seasons; bonus points for fastest lap and shortest race time per track | traced | CHOOSE_PLAYERS `$3052` takes up to eight names; each round every player races once (ROUND_RESULTS `$91B4`) and BONUS_LINES `$91CF` gives one more win to the fastest race and one more fastest lap to the fastest lap. The number of seasons was not traced |
| Hall of Fame: records of fastest lap and fastest race per track, set in races only (not practice) | traced | HALL_OF_FAME `$98D2`; the records are read and written by TRACK_RECORDS `$9319`, called only from NEXT_RACE and SEASON_RACE, so a practice race neither shows nor sets them |
| Load/Save/Replay: file names starting HALL (Hall of Fame), MP (multiplayer), DIR (directory); Replay restarts the last season; F1 with Replay resets the game | live | FILE_NAME_CHECK `$9448`, SAVE_OR_LOAD `$2AAE`, Replay at `$EF67`; a save and a load to a blank disk in VICE (orientation) |
| Sound: engine and effects only, no music | traced | the SID is written by the start-up, START_SOUNDS `$3F27`, the interrupt's engine note (`$CF0F`) and the effects (START_EFFECT `$8655`, EFFECT_TICK, CUT_EFFECT); a search for every store to `$D400`-`$D418` finds no other writer |
| Drawing distance held at `$173E`: 6 shows more of the track and runs slower | live | `$173E` is the count in `LDA #$02` at `$173D` (DRAW_VIEW): poked to 6, 8.2 pieces were drawn a pass against 4.0, and a pass took 8.8 frames against 7.1 |
| Filled 3D view drawn into two bitmaps in turn | live | `$D018` written at line 62 by the interrupt, `$70` and `$78` in turn (orientation); REQUEST_FLIP and FLIP_DONE `$3F70` |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
