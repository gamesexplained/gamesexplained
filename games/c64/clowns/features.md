# Clowns — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Commodore, *Clowns* instruction leaflet for the C-64 (©1983 Commodore
  Electronics Ltd.), scan at https://www.mocagh.org/forsale/clowns-manual.pdf,
  read from its OCR text layer on 11 October 2026. Cited as "manual".
- C64-Wiki, "Clowns", https://www.c64-wiki.com/wiki/Clowns, read
  11 October 2026. Cited as "wiki".
- Wikipedia, "Clowns (video game)",
  https://en.wikipedia.org/wiki/Clowns_(video_game), read 11 October 2026:
  the arcade original (Midway, 1978); nothing specific to the C64 cartridge.
- The game's own screens, in VICE, 11 October 2026 (`reference/title.png`,
  `reference/player1-start.png`).

Release year: the title screen says ©1982 (Bally/Midway and Commodore);
the manual's copyright is 1983; the wiki gives 1982.

## Features

| Feature | Status | Where |
|---|---|---|
| Played with paddles in control port 1 (manual: "Plug paddle into Port 1"; wiki: the cartridge works only with paddles) | live | `read_paddle_seesaw` (`$F189`) reads `$D419,Y`, player 1 the first paddle and player 2 the second; the joystick moved nothing in play |
| The see-saw follows the paddle's turn (wiki) | live | the value the game computes at `$F18D`-`$F196` set to 0, 100 and 200 put the see-saw's sprites at x = 41, 146 and 271; smoothed by `smooth_paddle` |
| F1 starts a one-player game, F3 a two-player game (manual, wiki) | live | `read_keys` (`$F4A6`), `player_menu`; the paddles' buttons do the same (button A on the title, button B for two players) |
| Two players take turns (wiki) | live | `fly` passes the turn after each fall while player 2 has jumps; when player 1 runs out first the turns go on and player 1's counter wraps to 255 (`facts.md`, "Two-player turns") |
| Two clowns: one bounces the other up off the see-saw (manual) | confirmed | `launch` (`$E6C2`): the clown landing on the raised end throws the one standing on the other; the see-saw's sprites show the standing clown |
| A clown starts from one of the two platforms on each side (wiki) | confirmed | `new_jump` picks one of four platforms (left or right, upper or lower) at random; `platform_run` |
| The falling clown must land on the free (raised) end of the see-saw, or it falls (wiki) | confirmed | `move_clown`: the 24 pixels at the raised end, from y 176; past y 184 the clown is down |
| A fall costs a jump; the top line shows `JUMPS`. The wiki says the game ends after 3 falls | differs | five jumps each (`new_game`, *live*: `JUMPS 5`); the game ends when both players have none |
| Three rows of balloons: blue on top, green, yellow at the bottom (screens) | live | `scroll_balloons`; top and bottom rows move right, the middle row left |
| Yellow balloon 20 points, green 50, dark blue 100 (manual, wiki) | confirmed | `balloon_row_points` (`$FE5D`), 2/5/10 in tens |
| Each bounce 10 points (manual, wiki) | confirmed | `launch` adds 1 (tens) |
| Clearing all yellow: 200 bonus; all green: 500; all dark blue: 1000 and one bonus jumper (manual, wiki) | live | `pop_balloons`, `row_bonus`: "BONUS 1000", "BONUS 0500"; the bonus jumper makes the next fall free and the next jump says "BONUS PLAY" |
| High score shown on the title screen (screens) | live | `title_screen`, and after each fall in a game (`fall_animation`) |
| Player 1 and player 2 scores in the top line (screens) | live | `show_status_number`; one jump count, the current player's |
| Sounds: bounce and balloon pop; short tunes when a row is cleared, when a game starts and on a fall; no background music (wiki) | confirmed | `sound_bounce`, `sound_pop`, `sound_fall`, `play_tune` tunes 0-2; silent in the attract mode |
| The clown "bounces his partner to the top of the center ring" (manual) | differs | no ring: every character (0-119) and sprite shape in the ROM is accounted for (`font`, `balloon_glyphs`, `seesaw_sprites`, `clown_shapes`) and none draws one; the playfield is walls, a ceiling, four platforms and the balloons (`playfield_layout`) |
| An attract mode: the clowns play on their own on the title screen (screens) | live | `attract_loop`: the program steers the see-saw towards the clown; `reference/title.png` |

## Beyond the documentation

Found in the code, not in the manual.

- No interrupts and no wait for the video frame: the game's clock is CIA 1's
  timer, about 95 ticks a second (`wait_tick`).
- The game speeds up during a jump as balloons are popped (`pop_balloons`)
  and starts every jump slow again.
- An odd number of balloons popped in one tick knocks the clown back; an
  even number lets it fly through.
- The program is compiled from a high-level language, with a hand-written
  machine-code library for the graphics, input and sound (`facts.md`,
  "Build").
- The two-player turn bug (`facts.md`, "Two-player turns").

## Open questions

- Which language and compiler produced `$E000`-`$EFFF`.
- The wiki's POKEs `POKE 3566,255` and `POKE 23789,255` are for other
  versions (this cartridge has no RAM there); its `$0221` = `$FF` is player
  1's jump counter here (`cheats.md`).
