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
| Boot: copyright notice, loading picture, then the menu "Single Player League / Multiplayer" | live | `reference/copyright.png`, `loading-picture.png`, `menu.png` |
| Name entry ("NAME?") for each player, RETURN to continue | live | `reference/name-entry.png` |
| League of four divisions, each with three drivers and two tracks; the player starts in Division 4 | live | `reference/league-table.png` |
| Eight tracks: Draw Bridge, Ski Jump (Div 1), Roller Coaster, High Jump (Div 2), Big Ramp, Stepping Stones (Div 3), Hump Back, Little Ramp (Div 4) | live | league table |
| Main menu: Hall of Fame, Practise, Start the Racing Season, Load/Save/Replay | live | `reference/main-menu.png` |
| Practise any track of a division the player can reach; three laps, then the car is repaired and refuelled | open | `reference/practise-divisions.png` |
| Track preview before a race: "steer to rotate view or fire to continue" | live | `reference/track-preview.png` |
| Crane lifts the car over the start line, "DROP START", then lets it fall | live | `reference/crane-lift.png`, `drop-start.png` |
| Crane recovers a car that leaves the track and puts it back at the next suitable place; "PRESS FIRE" to be released | open | wiki |
| Joystick: left/right steer, up accelerates, down brakes (and reverses); fire with up or down is boost, limited by boost fuel | open | wiki; up and up+fire seen live |
| Keyboard: S/D steer, RETURN boost forward, SPACE brake hard, "=" brake; braking cuts the throttle and the car freewheels | open | wiki |
| P pauses, O continues; F1 while paused redefines the keys; C= abandons a race | open | wiki |
| Dashboard: lap count (L), boost left (B), lead or deficit to the opponent, speedometer, current and last lap time, lead flag, best-lap stopwatch | open | wiki; L, B, speed and time seen live |
| Damage: a crack along the top of the frame grows with hard landings; when it reaches the right the car is out and the opponent wins | open | wiki |
| Structural damage: holes in the frame that stay for the season (the wiki says "permanent" across seasons) and make the crack grow faster | open | wiki, Wikipedia |
| One computer opponent on the track in a race; collisions between cars damage | open | Wikipedia |
| Season: each driver races the other two on both tracks (six races, the player in four); two points for a win, one for the fastest lap; ties go to best-lap points | open | wiki, Wikipedia |
| Promotion of the division leader and relegation of the last, each season | open | Wikipedia |
| Super League after winning Division 1: more powerful engines and brakes, "twice as fast" | open | wiki |
| Multiplayer: up to eight players take turns against the computer driver, over up to four seasons; bonus points for fastest lap and shortest race time per track | open | wiki |
| Hall of Fame: records of fastest lap and fastest race per track, set in races only (not practice) | open | wiki |
| Load/Save/Replay: file names starting HALL (Hall of Fame), MP (multiplayer), DIR (directory); Replay restarts the last season; F1 with Replay resets the game | open | wiki |
| Sound: engine and effects only, no music | open | wiki |
| Drawing distance held at `$173E`: 6 shows more of the track and runs slower | open | wiki, "Cheats" |
| Filled 3D view drawn into two bitmaps in turn | live | `$D018` written at line 62 by the interrupt, `$70` and `$78` in turn (orientation) |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
