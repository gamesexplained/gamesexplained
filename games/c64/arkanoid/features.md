# Arkanoid — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The contributor said yes to looking the game up, but this run's
  network refused every page fetch on 5 October 2026: C64-Wiki
  (`https://www.c64-wiki.com/wiki/Arkanoid`), the Wayback Machine,
  the Internet Archive, Wikipedia (`https://en.wikipedia.org/wiki/Arkanoid`)
  and `c64online.com`. What could be read were the result summaries of a
  web search engine, 5 October 2026, which quote or paraphrase C64-Wiki,
  Lemon64 (`https://www.lemon64.com/game/arkanoid`), Wikipedia, GameFAQs
  and the VGMPF wiki. Rows marked "(search)" come from those summaries:
  second-hand, and many describe the arcade original, not this
  conversion. Each is a claim to check against the code like any other.
- The game's own screens, read in the emulator, 5 October 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Title picture: IMAGINE / TAITO, the ship Arkanoid and the Vaus, signed "Jones" | live | `show_title_picture` `$B480`; `reference/title.png` |
| Input menu: Neos mouse, joystick, keyboard or paddles; 1 or 2 devices; 1 or 2 players; chosen by first letter (N J K P D 1 2); fire starts | live | `input_menu` `$B557`, keys `$B5BD`; `reference/menu.png` |
| Joystick: fire on port 1 starts the game from the menu | live | `$B5AC`; player 1's stick is port 1, player 2's port 2 with two devices (`read_joystick` `$FDA2`) |
| Story text before round 1 | live | `story_text` `$B7FE`, printed by `$B672`; `reference/story.png` |
| Attract mode: the game plays itself | confirmed | `attract_mode` `$9500`: rounds 5, 14, 21, 24 in turn, the Vaus following the ball. *Live*: round 5 seen |
| Two players, alternating, each with score, lives and round in a panel | traced | `$9BE0`-`$9C31`, saved walls `$0459`/`$04F9`; the simulator ran a two-player keyboard game, not checked on screen |
| The Vaus moves left and right; the ball bounces off it, the walls and the bricks | live | `bat_collision` `$ABB3`, `move_ball` `$B334`, `ball_vs_bricks` |
| The bounce angle depends on where the ball meets the Vaus (search, arcade) | confirmed | three zones a side, `$ABB3`; the inner two are swapped between the sides (`facts.md`) |
| Ball speed rises as the round goes on (search, arcade) | traced | per brick hit `$AF5F`, and with time since the life began `$ADE7` |
| 33 rounds; round 33 is DOH, the boss, hit about 25 times (search) | differs | 33 rounds, confirmed live; Doh takes 23 hits by its counter (`$95F4`, `$B11E`, `$9637`), not tried live |
| 32 rounds of bricks (search) | live | `$8000`-`$93FF`; rounds 2, 3, 4, 10 and 18 drawn live |
| Bricks of several colours; silver bricks take several hits; gold bricks cannot be destroyed (search, arcade) | confirmed | `$F40E`; silver 2 to 5 hits by round group (`$F52A`); gold never counted (`$B010`). silver bricks seen live in round 3 (`reference/round03.png`) |
| Capsules fall from broken bricks; catching one gives its power (search) | live | `choose_capsule` `$B2E6`, `update_capsule` `$A995`; a green type 2 capsule, letter C, seen falling in round 1, and the `$0237` capsule type read live |
| S: slow the ball (search) | traced | `$A8BA`: speed − 1, at least 1 |
| E: enlarge the Vaus (search) | traced | `$AA44`, `$AD4B`: width 4 to `$0C` |
| D: disruption, the ball splits into three (search) | traced | `$A8CD`, and speed + 1 |
| L: laser, the Vaus fires (search) | traced | `$A870`, `fire_laser`, two shots |
| C: catch, the ball sticks to the Vaus until fire (search) | traced | `$A8AC`; released by fire or after frame `$80` (`$AA76`) |
| B: break, an exit opens on the right and passing through it ends the round, with a bonus (10,000 in the arcade) (search) | differs | `$A868`, `$A41F`: the exit opens and ends the round, but no bonus is added on that path |
| P: an extra Vaus (search) | traced | `$A882`: lives + 1, capped at 99 |
| Enemies drift down from gates in the top wall and are destroyed by the ball or the Vaus (search, arcade) | confirmed | `update_enemies` `$9F5E`; destroyed by ball, laser or Vaus; only the gate at X `$47` is ever used. Enemies seen live in round 1 |
| Score, high score, lives and round shown beside the playfield | live | `draw_side_panel` `$F2B5`, `update_scores_display` `$FAFE` |
| Four lives at the start (this game's panel) | live | `$F1D2` |
| Music by Martin Galway; the C64 theme played samples on a fourth voice, the first published sampled sounds on the C64 (search) | confirmed | the driver `$2615`-`$3429`; drum samples written to the volume register by a sequencer `$FEF4` and six drum routines. The composer's name is not in the image |
| Code by David A. Collier, graphics by Mark Kevin Jones (search) | open | no names in the image; the title picture is signed "Jones" |
| Cheat: `POKE 39801,189` then `SYS 4096` for unlimited lives (search, source page not read) | live | `$9B79`: `STA $0936,X` becomes `LDA`; lives kept live. `SYS 4096` (`$1000`) is unused leftover code in this image, so the poke works only in a running game |
| Paddles, Neos mouse and keyboard control (search; also the menu) | traced | `$FE09`, `$FE43`, `$FD7B`; the simulator ran the menu with each, not tried live |
| High-score table with name entry (Galway's "High Score Music") (search) | differs | the game keeps one high score (`$0941`-`$0943`, `$FB28`) and has no name entry: no writer of a name buffer was found, and the words NAME, ENTER, HALL, FAME, BEST and TOP appear in the image under no constant offset except as chance matches inside code and sound data (`$FFC7`, `$223B`, `$59B7`; `work/scripts/textsearch.py`) |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Extra life every 20,000 points | live | `check_extra_life` `$FAA5` |
| Brick values differ by colour: 70 to 130 | traced | `brick_points` `$B2C4` |
| The joystick's Vaus moves faster as the ball speeds up | traced | `joystick_step` `$FDBF` |
| A capsule is worth 1,000 points, an enemy 100 | traced | `$A9DD`, `$9F45` |
| Sampled drums play on the title screen | traced | `drum_play` `$FEE0` |
| A copy-protection check through CIA 1's serial port | live | `$5F42`; `$BA0A` |


## Open questions

- Which release is this? The upload's name says 1988; the menu says
  "© TAITO 1986 © IMAGINE 1984", and Zzap!64 reviewed the C64 version in
  April 1987 (search).
- C64-Wiki (`https://www.c64-wiki.com/wiki/Arkanoid`, read 7 October
  2026) gives a cheat, "Itsmybirthday" typed in the high-score list after
  finishing a game, and a trainer mode for player 2 at 20,000 points. The
  word is not in this image under any constant offset or as KERNAL key
  numbers under any XOR or added constant, and no name entry was found
  (`work/scripts/textsearch.py`). The VGMPF wiki's track list includes
  "Name Entry". Whether another release of the game has a high-score
  table, and whether this image's unplayed tune 7 is that track, is open.
