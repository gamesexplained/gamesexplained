# Spy vs Spy — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The manual of the Avantage/Accolade edition (Commodore 64, Apple II and
  Atari, copyright 1985 First Star Software), as scanned on the Internet
  Archive, `https://archive.org/details/Spy_vs_Spy_1984_First_Star_Software`,
  read in its OCR text (`..._djvu.txt`) on 9 October 2026. Where it
  speaks for all three machines, the Commodore's own lines (joystick
  only; F5, RUN/STOP, S, space) are the ones used. Marked "(manual)".
- C64-Wiki, `https://www.c64-wiki.com/wiki/Spy_vs_Spy`, read 9 October
  2026: credits (Michael Riedel, music Nick Scarim), the trap and remedy
  table, fight controls. Marked "(wiki)".
- Wikipedia, `https://en.wikipedia.org/wiki/Spy_vs._Spy_(1984_video_game)`,
  and `https://c64.krissz.hu/spy-vs-spy/play-online/`, read 9 October 2026,
  for release dates and the scoring table, which agrees with the manual.
- Lemon64's transcription of the manual refused automated requests (HTTP
  403), 9 October 2026. A PDF served as the "C64 manual" by
  `api.regvault.org` turned out to be the manual of the sequel, *The
  Island Caper*, and was not used.
- The game's own screens in the emulator (NTSC, `orientation.md`),
  9 October 2026, marked "live".

## Features

| Feature | Status | Where |
|---|---|---|
| Title picture: MAD Magazine's Official Spy vs Spy, by Mike Riedel, First Star Software, 1984 | live | the loader's files `S1`/`S2` (`orientation.md`); `reference/title.png` |
| Options screen: number of players, difficulty level, computer IQ (one player only), airport hidden till the end (manual) | confirmed | `options_screen` `$9F7E`, `options_loop` `$A00B`; `reference/options.png`. Eight levels, IQ 1-5 |
| Up/down moves the option cursor, left/right changes the setting, fire starts (manual; the lower monitor says the same) | live | `options_loop` `$A00B`: walked every row in the code-map sessions. Space is not read: fire only |
| Joystick port 2 drives the white spy, port 1 the black (the options screen's own text) | confirmed | `read_controls` `$94A1` |
| Simulvision: split screen, white spy above, black below (manual) | confirmed | two raster interrupts, `irq_handler` `$8FA6`; `reference/play.png` |
| Simulplay: both spies move at once; in one-player games the computer plays black (manual) | confirmed | `next_spy` `$674E` alternates the spies; `computer_player` `$9A67` |
| Embassy: a maze of rooms, "selectable, yet randomly generated" (manual) | differs | each level's room layout is fixed (`$29BC`-`$2DAB`, `$BCE1`-`$BEC3`); the exit room (one of four), colours, door places, furniture and item places are random (`build_embassy` `$7EF8`) |
| Rooms in 3D; up moves to the back, down to the front (manual) | live | `spy_move` `$6BEA`; depth `$57` grew to 21 holding down (`t2b.py`) |
| Doors on four walls; fire opens a closed door (manual) | confirmed | `search_door` `$725A`, `toggle_door` `$72BE`; doors start closed (`build_embassy`) |
| A room is drawn as a dashed outline first, then filled in | live | `monitor_off` `$7D6A` wipes the monitor in steps; `work/shots/menu1.png` |
| Searching furniture: a short tone and a flash in range; fire opens it (manual) | confirmed | `search_target` `$70B7` (effect 6, `flash_room` `$906C`), `search_furniture` `$7310` |
| Items: passport, money, key, plans, and the briefcase; one of each; never in a remedy's place (manual) | confirmed | items 0-4 at `$0210`-`$021E`; placed only in empty furniture (`build_embassy`). *Live*: one item per room at the start |
| Carrying one thing at a time except inside the briefcase (manual) | confirmed | `take_item` `$73E8`, `add_to_briefcase` `$7425`, `follow_briefcase` `$74F4` |
| Trapulator: clock, six buttons, inventory row (manual) | live | `trapulator` `$98E6`, `place_arrow` `$9142`; `reference/trapulator-arrow.png` |
| Fire twice opens the trapulator; the stick moves the arrow; fire takes the trap (manual) | live | `$68E7`, `trapulator` `$98E6` (`t4.py`, `t5.py`) |
| Traps: bomb and spring anywhere but a door; bucket and gun on a closed door; time bomb anywhere, 15 seconds, cannot be carried or defused (manual) | confirmed | `search_furniture`, `search_door`; the time bomb is a fuse of 200 of its owner's turns (`$022A`), about 12 seconds at the measured pace; not timed live |
| Setting a trap costs time, with beeps (manual) | confirmed | scoring cause 1: −10 s, paid with effect `$11` (`score_event` `$8937`, `tick_clock` `$9362`) |
| A trap victim loses 20 seconds of game time and lies out (manual: 7 + 20) | confirmed | cause 4 (−20 s); stun `$90` passes (`spy_falling` `$6959`) |
| Number of traps limited ("total traps available..12" on level 1) | differs | the trapulator allows 2 × rooms − 1 = 11 on level 1 (it doubles `$0225`, rooms − 1, and refuses once the count is past it); the screen shows 2 × rooms = 12. *Live* (`t4.py`) |
| Remedies: fire bucket (fire box, left wall) for the bomb, wire cutters (tool box, right wall) for the spring, umbrella (coat rack) for the bucket, scissors (first-aid kit, back wall) for the gun (manual) | confirmed | `furniture_contents` `$0900` by type; remedy checks in `search_furniture`, `search_door` |
| Map button: rooms visited filled, a dot where an item is, the spy's room blinking; not the other spy, not the other floor (manual) | confirmed | `show_map` `$8B7F`. *Live*: −70 points, −15 s (`t5.py`) |
| Clock: equal time; losses never come back; red light when time is nearly out (manual) | confirmed | `tick_clock` `$9362`: the light blinks under two minutes with effect 7. *Live*: the clock rate |
| The survivor plays on; the dead spy's traps stay (manual) | confirmed | `$0261` per spy; `main_loop` ends the game when both have finished |
| Hand-to-hand combat in a shared room: one monitor goes blank (manual) | live | `enter_shared_room` `$75C5`, `monitor_off` `$7D6A`; `reference/combat.png` |
| In combat: no searching, no trapulator; doors work (manual) | confirmed | `spy_walk` `$6B3D` sends fire to a swing when `$F8` is set |
| Club: up-down hits the head, left-right jabs; about 7 blows kill (manual) | differs | `spy_move` `$6BEA`: a hit is counted in `$020E`, and ten knock a spy out (`spy_walk` `$6B66`) |
| Items carried into a shared room are dropped (manual) | traced | `drop_object` `$99C0` is called on entering; items hidden in the room, traps and remedies lost |
| Both spies start in the same room (manual) | live | room 0 (`place_spies` `$9705`); `reference/combat.png` |
| Exit: one marked door; the airport guard stops a spy without all four items (manual) | confirmed | `door_or_ladder` `$6F40`, guard cause 4 |
| Airport: the spy who leaves with everything reaches the plane; a ranking is shown | live | `escape_to_airport` `$86BB`, `airport_scene` `$8722`; `reference/airport-ranking.png` |
| Hide airport till end option (manual) | confirmed | the exit door is a wall until a briefcase is full (`build_embassy`, `check_full_briefcase` `$7494`) |
| Split-level embassies: ladders and holes under rugs (manual) | traced | door slots 4 and 5 (`rec_door_opposite` `$BBD4`), `door_or_ladder` `$6F40`, `spy_climb_step` `$6E51`; not played on a two-floor level |
| "Bread crumbs": arrows back, up to 9 rooms, not on the higher levels (manual) | differs | `trail_step` `$8A93`, `draw_trail` `$8AC7`: ten places, levels 1-4 only |
| Scoring: +80, −20, +30, −80, +60, −70, +40 (manual) | confirmed | `score_event` `$8937`, tables `$1D23`; the map's −70 *live* |
| Rank at the end of each game (manual) | live | the thousands digit of the score picks one of ten ranks (`airport_scene`) |
| F5 returns to the options screen (manual) | live | `read_controls` bit 7 of `$0282` |
| RUN/STOP pauses (manual) | live | `main_loop` (`t1.py`) |
| S turns the music off and on (manual) | live | `read_controls`, `music_off` `$0263` (`t1.py`) |
| Music by Nick Scarim (wiki) | confirmed | two-voice driver `play_music` `$954E`, tunes `$245A`, `$24D2`; the name is not in the image |
| Spy sounds and the laugh when a trap goes off (manual) | traced | effects at `$2127`; which effect is the laugh was not identified |
| Computer IQ levels (manual) | confirmed | `cpu_check_route` `$9D01`, `cpu_flee` `$A30F`, `iq_swing_rate` `$1B1E` |
| Difficulty levels change rooms, traps and minutes | confirmed | `level_rooms` `$BC91`, `level_minutes` `$1B0E` |
| Copy protection: read errors 21 and 23 expected, the disk formatted on failure | traced | `S0` at `$6114` (`orientation.md`); not annotated, by policy |

## Beyond the documentation

Found in the code, not in the manual.

- The game runs only on NTSC machines (`wait_ntsc_sync` `$8E38`, *live*).
- An attract demo plays recorded moves at level 5 when the options screen
  is left alone (`options_loop` `$A00B`, `$C000`-`$CFF4`, *live*).
- A build switch at `$6603` would turn on a recording mode that writes both
  joysticks into the demo tables (`$67B0`).
- The computer player knows where every item and trap is, and plans routes
  with a breadth-first search over the rooms (`facts.md`).
- Leftovers of the original assembler's symbol table name the computer's
  fighting code (`$BEC4`, `facts.md`).
- A spy whose clock runs out sees OUT OF TIME..ITS ALL OVER (`spy_falling`).
- Ten ranks, from A KNEE HIGH SPY to GRAND MASTER SPY, by the thousands
  digit of the score.

## Open questions

- The time bomb's fuse is 200 of its owner's turns; at the measured 342
  passes in 600 frames, one turn per spy every 3.5 frames, that is about
  12 real seconds against the manual's 15. Not timed live.
- Which sound effect is the laugh the manual describes was not identified.
