# Prospector Pete — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The cassette inlay, "THE GAME" and "GAMEPLAY" (Mastertronic 1986),
  as scanned on Plus/4 World,
  https://plus4world.powweb.com/dl/covers/p/prospector_pete_back.gif,
  read 19 October 2026, kept in `work/web/`.
- Plus/4 World's page for the game,
  https://plus4world.powweb.com/software/Prospector_Pete, read 19 October
  2026: British Software for Mastertronic, November 1986, £1.99, product
  code 2C 0148, 16K, PAL only, code by Doug (Doug Turner on the title
  screen), Novaload serial N103131; its "Controls" note (keys, port 2,
  level select) and its cheats; its screenshots, and two players' high-score pictures from its Hall of
  Fame, of levels 13 and 16, kept in `work/web/`.
- The game's own screens in plus4emu (`orientation.md`), saved in
  `reference/` by state.

## Features

| Feature | Status | Where |
|---|---|---|
| Pete digs a tunnel through the earth wherever he moves (own screens) | live | `move_pete`, `can_enter`; from `play-level1.p4emu`, the joystick held down, right, down, left left a black tunnel behind him |
| Gold, "anything vaguely mineral", gas and coal are worth points (inlay) | confirmed | `score_item` and the table `points_lo`: 5 to 80 points a goodie by kind, a random 0 to 190 for the question mark (`facts.md`, "Goodies"); five sticks' bonus and the kill bonus scored live |
| A stick of dynamite at the bottom of the mine goes off, and then water floods the mine (inlay) | live | `start_level` lights it, `check_big_charge` starts the flood; on level 1 it went off at frame 255 and the flood began at frame 325 |
| Touching the water costs a life (inlay) | confirmed | `can_enter` stops Pete at water and `pete_touches` kills him; `check_death` kills him when water reaches his cell. Deaths themselves were tested live with an explosion poked into his cell |
| Touching a "wandering thing" costs a life (inlay) | live | `creature_touch`; on level 1, left alone at the top of the shaft, Pete was killed by the first creature at frame 613 |
| Fire drops a stick of dynamite where Pete stands; it stops the wandering things (inlay) | live | `dynamite`: 120 frames of fuse on level 1, then 70 of explosion, which kills a creature in it (`creature_blast`) for 150 points (`kill_bonus`) |
| When every goodie is collected a ladder is lowered, and Pete climbs to the minehead to finish the level (inlay) | live | `count_goodie` puts the ladder at the top of the shaft; `main_loop` ends the level when Pete stands in the shaft's top cell with the stick pushed up. With the goodies poked to 0 the level went from 1 to 2 |
| On the title screen, left and right choose the starting level and fire starts the game (inlay; Plus/4 World) | live | `change_level`; right twice and left once changed LEVEL 01 to LEVEL 02; fire on port 2 started the game, fire on port 1 did nothing |
| The joystick goes in port 2 (Plus/4 World) | live | `read_controls`; as above |
| Keyboard play: A left, S right, P up, L down, SPACE dynamite; RETURN on the title switches between joystick and keyboard; ESC quits (Plus/4 World) | live | `read_controls`, `toggle_controls`, `irq_play`; each key tried in play, ESC went back to the title |
| A status line: SCORE, MEN, STICKS, LEVL (own screens) | live | `status_line_text`; MEN 02 and STICKS 05 at the start of level 1 |
| A high-score table of five names on the title screen, all "DOUGGY" at first (own screens) | live | `high_scores`; a game ended at 7,000 went in third and its name was spelled with left, right and fire |
| A message scrolls across the title screen (own screens) | live | `irq_title`, `scroller_text`: the author's greeting, after a game first a verdict on the score (`facts.md`, "The title's verdict") |
| No end: the game goes on until the last man is lost (Plus/4 World, "No end (highscore)") | confirmed | `main_loop` stops counting levels at 16, which then repeats; three lives, a man more every 10,000 points (live) |
| The levels look different: level 16's surface is grey where level 1's is blue and brown (Hall of Fame pictures) | differs | the surface's colours follow a day and night cycle that restarts with every life, not the level (`irq_play`, `sky_background`): level 1 at night is grey and black (`reference/level1-night.png`, the day poked to step 8); the mine looks the same on every level, with more goodies and faster creatures and water (`facts.md`, "Data tables") |
| A "?" and other objects lie in the earth (own screens) | confirmed | `place_goodies`: 19 kinds of goodie; the "?" is worth a random 0 to 190 points (`score_item`); the x2 doubles the rest of the level's points, live on level 8 |
| A cart or lift stands at the top of the central shaft (own screens) | confirmed | it is the pithead, part of the surface drawn by the map's first three rows (`chr_surface`, `map_surface_row1`); it does nothing |
| Cheats: `>1888 00` unlimited lives, `>2C40 00` unlimited sticks, `G 1800` restarts the game (Plus/4 World) | live | `$1888` is the 1 that `main_loop` takes off the men, `$2C40` the 1 `dynamite` takes off the sticks: both poked live (`cheats.md`); `$1800` is `start` |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| A grinning face replaces one of the large goodies from level 6, moving to another every 32 to 47 frames; touching it kills Pete | live | `swap_face`, `score_item`; a face on level 6 in 43 of 300 frames, none on level 5 |
| An x2 goodie from level 8 doubles every point after it in the level, and must be collected too | live | `place_goodies`, `score_item`, `add_score`; level 8's goodies to collect were 27, the tables' 26 plus the x2 |
| Day and night: the sky darkens every 82 seconds or so, and at night the creatures move faster | confirmed | `irq_play`, `sky_background`, `level_creature_night` |
| From level 10 Pete moves twice as fast, and the view scrolls twice as fast | live | `irq_play`; 16 rows in 64 frames on level 10, 8 on level 1 |
| Tunnels are one cell wide: Pete cannot dig a move that would open a two-by-two hole | confirmed | `check_ring`, `can_enter` |
| The creatures cannot pass the debris an explosion leaves, though Pete clears it by walking in | live | `move_creatures`, `can_enter`; a creature climbing the shaft on level 1 turned back at debris poked in its way, until the water rose through it |
| A stick of dynamite under water never goes off | live | `dynamite`; a stick in the shaft with 255 frames of fuse was covered by the flood and left the list without exploding |
| A stick laid at the bottom of the shaft on level 6 boxes the first creature in, and the game freezes for good | live | `move_creatures`; the main loop stopped and never ran again (`facts.md`, "Corner cases") |
| The title's verdict on the score: PATHETIC below 2,000 up to MEGA SCORE from 10,000 | live | `title`; 7,000 gave NOT BAD |
| Where a goodie may go in row 21 depends on the game's own variables: the room check reads past the map into the zero page, which the C16's RAM puts there again | traced | `find_space` at `$2DA7`; the pages' level builder made level 16's mine only with the zero page copied to `$4000` (`facts.md`, "Corner cases") |
| The author's message: four weeks to write, a week more than Fingers Malone, assembled on a CBM 700 with an 8250 drive | confirmed | `scroller_text` |

## Open questions

- Whether the creatures' up-and-down chase was meant to use their row:
  the code subtracts their column (`facts.md`, "Corner cases"). Only
  the author could say.
- Whether the release of the game on other labels or the Plus/4 differs
  from this cassette: only this TOSEC tape was analysed.
