# Power Drift — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki (German), "Power Drift – C64-Wiki",
  https://www.c64-wiki.de/wiki/Power_Drift, read 30 October 2026: credits
  (programming and graphics Chris Butler, SID music Dave Lowe after Hiroshi
  Miyauchi's arcade score, Activision 1989), the controls, the rules, the
  64'er review of March 1990, and the screenshots saved in `reference/` as
  `wiki-*.png`. The English C64-Wiki has no page for the game.
- Wikipedia, "Power Drift", https://en.wikipedia.org/wiki/Power_Drift,
  read 30 October 2026: the arcade original (Sega, 1988, Yu Suzuki) and the
  1989 Activision ports.
- No manual scan was found on archive.org on 30 October 2026; Lemon64's
  Wayback copy did not answer through this session's proxy. The game's own
  screens and stored text are the other source.

## Features

| Feature | Status | Where |
|---|---|---|
| Joystick in port 2 | live | the select screen and the race answer port 2 |
| Left and right steer | live | `move_player` slides the road ±3 a race frame and turns the kart's picture; bends photographed while steering (`work/bendcheck.py`) |
| Up accelerates | live | the speed read-out climbs with up held (`work/play-a1.vsf`) |
| Down brakes | traced | `move_player`: with down held the kart slows twice a race frame |
| Fire changes gear, low and high (`LO`/`HI` on the panel) | traced | `gear_change`: low gear tops out at 126 km/h, high at 224 |
| Space pauses | traced | `pause_on_space`: hold, let go, press and let go again |
| Twelve drivers to choose from; fire picks the one under a cursor that runs along the row of faces | traced | `driver_cursor_loop`: the cursor moves by itself every 21 frames |
| Five courses, A to E, chosen with the stick on the select screen | live | left and right move the highlight between the five pictures |
| Each course has five stages: 25 races in all | traced | `course_table`, `stage_won`, `course_complete` |
| A place in the first three moves the player on to the next stage | traced | `place_finisher`: when three karts have finished before the player, `game_over` |
| Each stage of a course changes the scenery: road markings, obstacles, night | traced | each stage's record gives its own scenery list, character blocks, colours and horizon (`course_a`-`course_e`) |
| The track rises and falls like a roller coaster, and the kart can fall off it, losing time | traced | `piece_climb`, `piece_crest`, `piece_descent`, `piece_jump`; `drop_kart_back` |
| Collisions with the other karts | traced | `place_rivals`: a slower rival at distance 1 in front makes the kart spin (`kart_spin`) |
| Race panel: the eleven rivals' faces, time, score, gear, stage, lap, speed in km/h, high score, the player's place | live | `work/shots/play-04.png` |
| The player's driver turns to look back at a kart just overtaken (64'er review) | traced | `head_looking_back`, from `show_place` when the place improves |
| Podium with three karts stacked after a race (wiki screenshot "Auf dem 3. Platz gelandet") | traced | `place_finisher` puts each finisher in a sprite band with its face from the front and a 1st, 2nd or 3rd label |
| Title screen "POWER DRIFT / PRESS ANY KEY", credits Chris Butler and Dave Lowe (wiki screenshot) | differs | not in the game's code after the hand-over: the loader calls code at `$C800` and `$6800` while it loads, later overwritten (`facts.md`, Build) |
| High-score table on the select screen: seven names of three letters and seven scores | live | `work/shots/cm-select.png`; the names and scores are stored at `$0BEA` |
| Name entry for a new high score ("NAME ENTRY" and an alphabet at `$0B8D`) | traced | `high_score_check`, `name_entry` |
| "GAME OVER" (`$0A56`) | traced | `game_over`, `show_game_over` |
| "CONGRATULATIONS" (`$10A3`) | traced | `congratulations`, after the fifth stage of a course |
| Music by Dave Lowe on the SID | traced | the driver at `$B800`, two tunes (`tune_table`): the race's and the name entry's |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| The time bonus is counted down in binary after being worked out in decimal, so it pays more than it shows, and shows letters A to F while it counts | live | `count_bonus`, `draw_score`'s `CLD`; `work/bonus_live.py`, `reference/bonus-hex.png` |
| The bonus ignores the minutes: seconds 46 to 59 wrap to a bonus of 99 to 86, and exactly 45 pays 256,000 | traced | `show_bonus`; the kit's simulator (`work/bonus_test.js`) |
| The race clock counts race frames, so it runs about 1.4 times as fast as real time | live | `race_clock`; `work/clock_live.py` |
| Effects 1 and 4 (an engine hum) are in the driver but never started | traced | references to `sound_effect`; `sound_engine_off` called by nothing |
| The select screen is silent: its interrupts never call the sound driver | traced | `select_irq_top`, `select_irq_mid`; `sound_play`'s two callers |
| The chequered marker sprite shares eight bytes with the panel's text, hidden under the top border | live | `sprite_83`; `$D017` read in a race |
| A rival is solid only at one distance, and only when slower than the player | traced | `place_rivals` |

## Open questions

- Can a fast enough kart pass through a slower rival without a spin? The
  test in `place_rivals` looks only at distance 1, and a kart closing
  faster than one distance a race frame could skip it. Not tried.
- Does the panel's sprite 0 pointer, written into byte 56 of sprite `$8F`
  (`$E3F8`), show on the third driver's face on the podium? From the code
  it must; not seen.
