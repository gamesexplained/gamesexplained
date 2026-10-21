# Tycoon Tex — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay, "Instructions for Play" (front and inside),
  Plus/4 World's large cover scans,
  https://plus4world.powweb.com/dl/covers/t/tycoon_tex_side_large.jpg and
  https://plus4world.powweb.com/dl/covers/t/tycoon_tex_front_large.jpg,
  read 21 October 2026 (saved as `reference/web-cover-side.jpg` and
  `reference/web-cover-front.jpg`)
- Plus/4 World, "Tycoon Tex - Software Details",
  https://plus4world.powweb.com/software/Tycoon_Tex, read 21 October
  2026: credits, 16K, PAL only, the undocumented pause and quit keys, the
  cheats, and the Hall of Fame screenshots (`reference/web-hiscore-*`)
- Home Computing Weekly 113, page 11, review signed M.W., from Plus/4
  World's PDF of the issue,
  https://plus4world.powweb.com/pubs/home_computing_weekly/113/home_computing_weekly_113.pdf,
  read 21 October 2026
- Retro Gamer 113, page 78, "Minority Report" by Rory Milne, from Plus/4
  World's scan,
  https://plus4world.powweb.com/pubs/retro_gamer/113/retro_gamer_113_78.jpg,
  read 21 October 2026
- The game's own screens in plus4emu, 21 October 2026 (`reference/*.png`)

## Features

| Feature | Status | Where |
|---|---|---|
| Follow the pipeline from left to right; the ground and skyline scroll as Tex moves (inlay; HCW) | live | `move_tex`, `set_speed`, `scroll_pipe`, `scroll_skyline`; holding right scrolls the scene and adds to the score |
| The faster Tex moves, the quicker the oil pressure builds (inlay) | differs | the pressure never rises in a level: it falls an eighth every 24, 19 or 14 main-loop passes (`main_loop`, `drain_rates`). Speed raises % COMPLETED (`completed_rates`) and the score |
| A break in the pipeline must be jumped; falling in costs a life (inlay; Retro Gamer) | live | `check_hole`, `tex_death`; running right into the first break, Tex lies down and a life goes (`reference/level1-fallen.png`) |
| Jumping a break makes the pressure drop quickly; at zero the game ends (inlay) | differs | jumping costs nothing: the pressure falls with time and when a bomb or a crash explosive breaks the pipe, 4 eighths (`lose_pressure`, `break_pipe`). At zero the game ends, whatever the lives (`pressure_out`; live) |
| A completed pipeline moves on to the next level; a "% completed" bar (inlay; the HUD) | live | `add_completed`, `level_complete`; running right from the start of level 2 filled the bar and completed the level after 5,462 frames on EASY |
| 99 levels (inlay) | differs | the level is two decimal digits (`next_level`); after 99 it becomes 00 and play goes on, with nothing to end the game (live, level 99 completed with the `$9D` poke) |
| Desert, ice and surface pipe scenes (inlay; HCW names desert and "the frozen north") | live | `next_level`, `scene_colours`: the desert on levels 1, 4, 7..., the ice on 2, 5, 8..., the grey surface pipe on 3, 6, 9... (levels 2 to 4 seen) |
| Parallax: parts of the screen scroll at different rates (HCW) | confirmed | `pipe_speeds`, `skyline_speeds`: the skyline moves at about half the pipe's speed, in its own band of the raster interrupt (`irq_skyline`, `irq_pipe`) |
| Enemies: jet plane and its bombs, bouncy bomb, crash explosives, arrows; "surface missiles" on the cover | confirmed | `enemy_mask` has four kinds and nothing else: arrow, bouncy bomb, jet (with its bomb) and crash explosive (`next_level`, `move_arrow_and_jet`, `move_bombs`). Nothing in the code matches the cover's surface missiles beyond these. Jet, bouncy bomb, crash explosive and arrow seen on levels 1 to 4 |
| Shoot with the sixgun (inlay) | live | `fire_bullet`, `move_bullet`; fire puts a bullet in front of Tex |
| Scores: jet plane bombs 250, crash explosive 200, bouncy bomb 50, arrow 25 (inlay) | confirmed | `move_bullet` adds exactly these. The jet itself flies above the highest row the gun reaches and cannot be shot |
| Score goes up as Tex moves right | live | `main_loop`: 1 point every 24 passes while his speed is above 0 (15 points in 1,500 frames on EASY) |
| End-of-level bonus: the oil pressure left (inlay) | live | `level_complete`: a point for each eighth of pressure left, and one more; 207 points after an immediate finish of level 1 |
| 6 lives (inlay); the menu offers "NO. OF LIVES" | differs | the menu counts 1 to 6 and round, 3 as loaded (`menu_choose`, `lives_setting`); a life comes every 10,000 points, up to 9 (`add_score`) |
| Keys: K or J chooses keyboard or joystick; Z left and slow down, X right and speed up, ; up and jump, / down (also used to enter a name in the high-score table) (inlay) | live | `menu_keys`, `read_keys`: K, J, Z, X and `;` tested; RETURN is fire. Down is read only at the menu and in name entry (`menu_input`, `enter_hiscore`): in play nothing tests it |
| Joystick: right moves on, up jumps, fire shoots | live | `read_controls`: port 2, or port 1 when port 2 shows nothing; tested on port 1 |
| Sound on and off (inlay; menu "SOUND: OFF" by default) | confirmed | `menu_choose`, `sound_on`: every sound routine returns at once while it is off |
| Selection screen: up and down bring an option into the highlighted window, FIRE executes (inlay) | live | `menu_input`, `menu_choose`; fire or RETURN starts the game |
| Menu: PLAY THE GAME, WATCH THE DEMO, difficulty (EASY, HARD and IMPOSSIBLE in the Hall of Fame pictures), NO. OF LIVES, SOUND | confirmed | `menu_items`, `difficulty_text`; the difficulty sets the main loop's pace and the pressure's drain (`next_level`, `loop_paces`, `drain_rates`) |
| High-score table "THE TYCOONS!", 8 entries, with name entry (inlay; the menu) | live | `check_hiscore`, `enter_hiscore`, `draw_hiscores`; a score of 207 went in eighth, 200,000 went in first |
| A scrolling message along the bottom of the menu and the play screen | live | `scroll_message`, `message_text`: TYCOON-TEX (C) 1985, ANOTHER CLASSIC FROM GREMLIN GRAPHICS BY THE TYCOONS AT MICRO-PROJECTS LTD. ** TRY OUR OTHER GAMES - XARGON WARS AND THE PETALS OF DOOM. ** AS USUAL THANKS TO MATTHEW,JASON,MARK,IAN AND EVERYONE AT GREMLIN ! ** HI TO KATH,JOHN,CHRIS,DAVE AND THE OTHERS ! |
| "GO!" in large letters at the start of play, "THE END" at game over | live | `countdown`, `the_end`; `reference/level1-go.png`, `reference/game-over.png` |
| Pause with SPACE, continue with C=; quit the game with ESC (Plus/4 World, "Undocumented Options") | live | `check_play_keys`; the score stood still for 100 frames while paused |

## Beyond the documentation

Found in the code, not in the manual.

- **A life every 10,000 points**, up to 9 lives, each time the score's
  ten-thousands digit changes (`add_score`). *Live.*
- **The pressure is the real clock.** It falls whatever Tex does, and
  when it runs out the game ends with BAD NEWS ! however many lives are
  left (`main_loop`, `pressure_out`). A full bar lasts about six minutes
  standing still on EASY, three on HARD and 72 seconds on IMPOSSIBLE.
  *Live.*
- **The difficulty is the main loop's speed.** EASY, HARD and IMPOSSIBLE
  change only the main loop's pause and the drain: the bouncy bomb and
  the crash explosive, which the main loop moves, get faster, and the
  arrow and the jet, which the interrupt moves, do not (`loop_paces`,
  `drain_rates`, `move_bombs`). *Live: the passes.*
- **The enemies come in by level**: one kind on each of levels 1 to 3,
  two at random on 4 to 6, three on 7 to 9, all four from 10, coming
  back sooner from level 20, 40 and 60 (`next_level`, `enemy_delays`).
  *Live.*
- **Levels 80 to 99 are easier than 60 to 79.** The level is decimal,
  and the delay group is read from two of its bits, which give levels 80
  to 99 the slow enemies of levels 1 to 19 (`next_level`). *Live.*
- **There is no level 100.** After 99 the level reads 00 and play goes
  on, with two kinds of enemy at random (`next_level`). *Live, by poke.*
- **A six-digit high score loses its first digit** when a better score
  pushes it down the table, since the copy stops a byte short
  (`enter_hiscore`). *Live.*
- **RETURN fires** in keyboard mode, and the joystick works in either
  port (`read_keys`, `read_controls`). *Live.*
- **A 3, 2, 1, GO! countdown** in big block letters starts every game
  (`countdown`). *Live.*
- **The demo starts by itself** after 255 turns of the menu, however
  many settings were changed meanwhile (`menu`); its Tex jumps at the edge of a break and fires at random
  (`demo_controls`).
- **The sixgun's sound misses its register.** The routine that sweeps
  the shot's pitch down writes the high bits to voice 2's register, so
  voice 1 only sweeps within its top quarter (`tick_shot_sound`).
- **A telephone number** after the high-score table, TEL 0727 34566 in
  PETSCII, which no instruction reads (`phone_text`).

## Open questions

- The cover names "surface missiles"; the code has four enemies, and
  none of them is called that on screen. Which one the cover means, if
  any, is not settled.
- How control first reaches Novaload's stub in the stack page was not
  traced (`orientation.md`, "The loader"); the loader is not annotated,
  by policy.
