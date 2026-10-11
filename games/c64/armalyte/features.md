# Armalyte — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The manual (two-page inlay, "Mission Briefing", "The Scoreboard", "Ship
  Enhancements", "Controls"), scan at
  https://archive.org/details/Armalyte_1988_Thalamus, read 7 October 2026.
  Its OCR text is empty; the pages were read from the PDF scan.
- C64-Wiki, "Armalyte", https://www.c64-wiki.com/wiki/Armalyte (revision
  of 23 July 2024), read 7 October 2026.
- Wikipedia, "Armalyte", https://en.wikipedia.org/wiki/Armalyte, read
  7 October 2026.
- Hardcore Gaming 101, "Armalyte" by Willem Elbers (5 July 2023),
  http://www.hardcoregaming101.net/armalyte/, read 7 October 2026.
- The game's own title screens (credits, "Ship Enhancements", "Keyboard
  Controls", high scores), disk menu and the music demo behind the
  menu's third entry, from the emulator, 7 October 2026.

## Features

Addresses are the engine's (`parts/engine`) unless a part is named.

| Feature | Status | Where |
|---|---|---|
| Disk menu on side 1: 1 Armalyte, 2 Loading picture, 3 Walker's Warbles | live | menu at boot (`reference/disk-menu.png`); the first loads the engine, the third a music demo (`parts/warbles`, section 16), and the second was not followed |
| The third menu entry is a music demo of Martin Walker's, dated 1988, with eight tunes in it and four on keys | live | `parts/warbles/facts.md`; its screen is `reference/warbles.png`, and the page plays all eight through a port of its driver that `tests/warbles.js` checks against it |
| "Turn disk to side B & press fire" after the first load | live | `wrong_disk` (`$B5CC`): the engine asks for level 1's file, does not find it on side 1 and shows the prompt (`reference/turn-disk-side-b.png`) |
| Title screen cycles credits, high scores, ship enhancements and keyboard controls | live | seven pages, `title_pages` (`$B953`) (`reference/title-*.png`) |
| Fire starts the game (title) | live | fire on either joystick, `title_start_keys` (`$B58A`) |
| F1 on the title: one- or two-player mode | live | `title_function_keys` (`$BC55`), `$B026`; left and right on the stick choose too |
| F3 on the title: switch between three starfields | live | `$B02F` steps 2, 0, 1; `stars_animate` (`$F72F`) |
| F7 on the title: demo mode | live | `$B01A`: both ships out of play, tune 1 plays, and fire or the tune's end goes back to the title (`joysticks_read`, `$ABD9`) |
| The ship follows the joystick | live | cell to cell on an 8-pixel grid, gliding between cells (`ships_move`, `$E59C`; `ships_glide`, `$E90B`) |
| A short press of fire fires the normal weapon; holding fire "for a few seconds" (wiki: about 1.5 s) fires the super weapon | differs | the super weapon fires once fire has been held for 15 frames, 0.3 seconds (`ship1_fire`, `$EC87`; *live*: the charge fell at the fifteenth frame); pressing fire and letting go each fire the normal weapons |
| Player 1 changes super weapon with a key: the manual and the wiki say the Commodore key, this build's title screen says `@` | live | the Commodore key (`keys_play`, `$AB53`): the title draws it as character `$2A` of its font, a C with a bar through it, not `@`; it steps A, B, C and round |
| `?` changes player 2's super weapon | live | the `/` key, which carries `?` on the keyboard (`keys_play`) |
| Space toggles the remote (drone) tracking on and off, one-player mode only | live | `$74`, only with the drone (`keys_play`) |
| RUN/STOP pauses; fire restarts | live | the pause starts at the end of a scroll step; fire on either stick ends it (`pause_and_fire`, `$AF7E`) |
| Q quits (from the pause, per the wiki) | live | only while paused, to the front end (`keys_play`) |
| S in the pause goes to the next level | differs | *live*: S held in the pause does nothing; `keys_play` reads only RUN/STOP, Q, the Commodore key, `/` and SPACE |
| Eight levels, each with a mid-level boss and an end boss; the scrolling stops for the end boss | differs | levels 5 and 7 have no mid-level boss and level 8 meets its mid-level boss twice, at tile columns 167 and 242 (each level's script, `$9754`); every boss, mid-level ones too, is fought with the scroll stopped, and blows up by itself when its time runs out (`level_script`, `$A93E`; *live* in level 1) |
| Scenery destroys the ship on contact | traced | characters `$21-$F5` under the ship's nose (`players_hit_scenery`, `$9E05`) |
| Munitions pods change shape each time they are shot, to show the enhancement they would give; the more shots, the better the weapon | traced | a pod moves on to the next of seven enhancements after 11, 11, 11, 11, 17, 17 and 32 hits, five fewer in a two-player game (`pod_next_type`, `$A5F4`); the order is fixed (forward fire, tail gun, vertical cannon, trident, converge, generator, battery), not from worse to better |
| Collecting a pod before it has changed makes the ship invulnerable for five seconds (the ship flashes) | traced | 255 frames, 5.1 seconds, flashing through six colours (`p1_collect_pod`, `$9A94`; `ship1_invulnerable`, `$EA77`); a full enhancement, converge, a generator and a battery give the same |
| Invulnerable from a pod, the ship can fly through walls that block the way | traced | the scenery test only looks at a ship in normal play, state 2, and an invulnerable ship is state 3 (`players_hit_scenery`, `$9E05`) |
| Extra forward fire: two forward shots at the start of each level, increased to four | traced | `$4B` + 1 shots in flight: 2 at the start, 4 with two pods, 6 with converge (`ship1_normal_fire`, `$F1C3`) |
| Tail fire: backward-firing bullets | traced | a pair, a row above and below the ship, backwards (`$4D`) |
| Vertical cannon: fire up and down | traced | a pair, up and down (`$4F`) |
| Trident: two flanking guns beside the main weapon | traced | a pair one column behind, a row above and below, firing forwards (`$47`) |
| Converge: two more shots to the main guns, diverting the tail gun's ammunition; needs two extra forward-fire enhancements first | traced | needs the tail gun as well as forward fire at 3; it adds two forward shots in the tail gun's slots (`p1_collect_pod`, `$9A94`; `$B2`) |
| Battery: one more energy cell, at most four, each storing six charges | traced | four slots, `$B010-$B013` (player 2 `$B014-$B017`) (`generators_recharge`, `$EB00`) |
| Generator: stores six energy charges and rebuilds to full after firing; energy beyond that goes to a battery (Wikipedia: increases the recharge rate) | confirmed | both hold: each generator, up to four, shortens the rebuild tick from 61 frames to 51, 41, 31 and 19; eight ticks fill one battery at a time and, once none is left to fill, the generator's own charge of six (`generators_recharge`, `$EB00`; *live*: from empty, the charge reached 6 after 488 frames with no generator and 152 with four) |
| Super weapon A: long sustained blast through solid matter, two charges, low availability | live | ten shots across the ship's row, starting beyond any wall; two charges (`super_weapon_patterns`, `$F07D`; *live*: a full generator dropped by 2) |
| Super weapon B: swarm of laser fire around the craft, from two directions, one charge, medium availability | differs | costs two charges, not one (costs at `$F486`; *live*: a full generator dropped by 2); five shots, two ahead, one back and two from behind |
| Super weapon C: rapid burst of pulsed energy, one charge, very high availability | live | two shots side by side, one charge (*live*: a full generator dropped by 1) |
| One-player mode: the second ship is an automatic drone that follows the ship, fires as it does and shields against most enemy shots; it does not hurt enemies (wiki) | differs | the drone's shots kill: hits are read from the shot characters on the screen, whoever fired them (`enemies_hit_by_fire`, `$A54C`); it absorbs enemy shots, is never hit by an object and collects nothing (`p2_hit_by_shot`, `$9CD3`; `drone_fire`, `$F0C4`) |
| Detached, the drone "glides along its own trajectory" (manual) or "stays stationary" (wiki) until recalled | differs | from the manual: *live*, the detached drone stays where it is on the screen, as the wiki says (`drone_follow`, `$9E78`) |
| The drone sits a short distance from the ship on the side opposite its last movement | live | opposite the way the stick is pushed, stepping a cell at a time; with the stick released it stays where it is (`drone_follow`, offsets at `$9EF8`/`$9F03`) |
| Two players at once: the second ship is red, of a different design, and controllable | confirmed | two-player games started *live* (F1); ship 2 reads joystick port 1 (`joysticks_read`, `$ABD9`); its colour and design were not checked |
| Two-player mode has more pods (manual: "additional"; Wikipedia: doubled) | traced | 174 pods in every game and 123 more only in a two-player game, across the eight levels (type 6 entries, `waves_spawn`, `$E3FF`; the levels' `facts.md`): additional, not doubled |
| Players push each other when they collide | live | a ship that moves into the other pushes it a cell (`ships_relative`, `$E531`) |
| A destroyed ship respawns at once and keeps its enhancements; the next level takes them all away except batteries and generators | differs | a hit ship comes back where it was, invulnerable, keeping its enhancements (`ship1_hit_sequence`, `$E9BD`); each load takes every weapon (zero page, cleared by `level_setup_vars`, `$A1DE`) and also two batteries and two generators from each player (`next_level_losses`, `$B723`, run twice by `after_level_load`, `$B3CC`) |
| Scoreboard: battery status, score, generator status, generator type, converge status, super weapon indicator, craft in reserve | traced | the eight hardware sprites in the lower border, redrawn one item a frame (`panel_update`, `$99FA`) from the front-end font's glyphs: batteries, score, the generator's rebuild box and count, weapon-level bars, the super weapon's letter, and each player's lives at either end |
| Three craft in reserve at the start | live | three lives each (`title_start_keys`, `$B58A`; `reference/level-1-start.png`) |
| High-score table of six entries with three-letter names | live | `high_score_check` (`$BA72`), names entered with the stick (`high_score_name_entry`, `$BB3C`) (`reference/title-high-scores.png`) |
| Music on the title and loading screens only; sound effects in play | traced | tunes 0 title, 1 demo, 2 high scores and the ending's pictures, 3 loading screen (`tune_headers`, `$C765`); in play only the 32 effects (`sfx_voice_step`, `$FA3C`); the How it works page plays the four tunes through a port of the driver that `tests/music.js` checks against it |
| Exploding enemies carry on along their path | traced | `enemies_follow_paths` (`$EE8D`) moves exploding objects too |
| More than 30 sprites on screen at once, without flicker, at 50 frames a second | differs | at most 30 in a frame: 20 objects multiplexed on six sprites, the two ships, and eight scoreboard sprites in the border (`multiplexer_start`, `$A305`); *live*, the main loop made one pass a frame through all of level 1 |
| Cheat: `POKE 59891,173` ($E9F3) "cheat mode" | differs | it turns the `DEC` of player 1's life into an `LDA`, and `anti_cheat_check` (`$F77D`) notices and hangs the machine (*live*: frozen within five frames) |
| Cheat: `POKE 53792,96` ($D220, an `RTS`) "unlimited energy" | differs | with the I/O chips in, `$D220` is a mirror of the border colour register, so 96 (`$60`) sets the border to black, which it already is (*live*: a 5 there turned the border green); the RAM under it holds a level's characters (`$60-$7F`), copied once at the level's start, and no code runs there (level `$D200`) |

## Beyond the documentation

Found in the code, not in the manual.

- Every boss fight is timed: when the scroll stop ends, the boss blows
  up by itself and pays as if it had been shot (`level_end`, `$AC20`;
  *live* in level 1). The limits run from 29 seconds (level 8's first
  mid-level fight) to 245 (`facts.md`, "Timing").
- After the ending the game carries on from level 1 with the score and
  lives kept, and every event's enemy speed below 3 is raised by the
  number of completed games, to at most 3 (`level_script`, `$A970`; ending `$0923`).
- A ship starting a level is invulnerable for 102 frames, and ship 2 for
  204, where the code means 255 for both: the music driver has just left
  its pointer in the two timers (`level_setup_vars`, `$A260`; *live*: 103
  and 205).
- Each level file ends in a message about the game's producer that no
  code reads (each level's `$98F0`).
- The title holds the credit "PRODUCED BY: PAUL COOPER AND JOHN HARRIES"
  but no page shows it (`title_pages`, `$B953`).
- A pod shot past its last enhancement, the battery, shows forward fire
  but gives only an unshot pod's invulnerability, until another 11 hits
  (6 with two players) make it the real forward fire: the wrap sets its
  type to 0 and takes its look from forward fire's entry
  (`pod_next_type`, `$A5FE`; traced).
- Shooting an enemy that belongs to a group destroys the whole group
  for 5,000 points (`group_destroyed`, `$A62F`); a kill scores 100 to
  500 by the enemies' speed, plus 300 in a two-player game
  (`kill_points_by_speed`, `$A9DE`).
- An extra life at every 100,000 points (*live*) and one for each player
  at each completed level (`level_complete`, `$AE25`).
- Three checks against tampering: the life-taking code (`$F77D`), the
  stack page against freezer cartridges (`stack_check`, `$AFAE`) and the
  PAL frame time on the title (`timing_check`, `$BDC8`).
- Level 7 starts halfway along its map, so it is half as long
  (`level_setup_vars`, `$A2AC`; *live*).
- Levels 4 and 7 have no scenery: every entry of their maps is tile 0,
  which is all gaps (each level's `$3934`; `parts/level-4/facts.md`,
  `parts/level-7/facts.md`).
- Space is drawn, not left as background: black star characters, with
  the stars and scenery coloured by the three shared colours each
  script event sets (`facts.md`; *live*).

## Open questions

- The disk menu's second program, the loading picture on its own, was
  not followed.
- How the menu loads its second and third entries. Neither is a file
  the directory can open, so `cyberdos` must fetch them from tracks of
  its own; which tracks was not traced
  (`parts/warbles/facts.md`, "How it is reached").
