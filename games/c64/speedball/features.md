# Speedball — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The Speedball manual, a scan at the Internet Archive,
  https://archive.org/details/c64man_speedball (its source given as
  c64sets.com set 108), read 30 October 2026. Eight pages. It is the
  manual of the whole release, not of the C64 version alone: its credits
  are the Amiga and Atari ST team's (code and design by the Bitmap
  Brothers, music by David Whittaker, graphics by Mark Coleman Designs),
  it lists a demo game the C64 menu does not offer, and it names F10,
  which the C64 has no key for.
- Wikipedia, "Speedball (video game)",
  https://en.wikipedia.org/wiki/Speedball_(video_game), read 30 October
  2026: the C64 port exists, and Image Works published it.
- A web search on 30 October 2026, its result summaries only (second
  hand): a SID collection credits the C64 tune to David Whittaker, 1989,
  Image Works. No source named the C64 version's programmer.
- C64-Wiki has no page for the game (`https://www.c64-wiki.com/wiki/Speedball`
  answered 404 on 30 October 2026). Lemon64 refused the fetch (403) and
  the Wayback Machine dropped the connection, the same day.
- The game's own screens, in VICE.

## Features

| Feature | Status | Where |
|---|---|---|
| Menu: one player knockout, two player game, one player league, save game, load league, load knockout, load two player game, continue game | live | SELECT GAME screen; `menu_handler_lo` (`$2283`) |
| Three teams to choose from, differing in skill and stamina (and power, on screen) | live | PLAYER 1 SELECT: Verna (captain Kef), Lacata (Conroy), Draco (Verik); figures at `$B9D6`-`$B9DE` (`side0_attributes_set`, `$3ECD`) |
| Knockout: ten rounds, each the best of three legs; 2 points a win, 1 a draw, 0 a loss; 3 points go through, and two legs that make 3 skip the third | traced | `knockout_round_end` (`$8195`); two legs with no points also put the team out |
| Opposing teams get harder as the knockout rounds go on | differs | The screens name the templates in a shuffled order (`knockout_init`, `$3F05`), and `match_restart` (`$31C2`) loads another record's figures, which fall one template a round from a random start and wrap once from the weakest to the strongest (*simulated*, `facts.md`) |
| League: 11 teams, 100 points a win, 20 a draw, 5 a goal; length chosen from 10 to 100 weeks; 5 matches a week, your team rests in week 11; your team flashes in the table | differs | Points, fixtures and the flashing row traced (`league_record`, `$994A`; `league_week_end`, `$8519`; `league_table_screen`, `$85D6`); the length is eleven weeks more than chosen: TEN WEEKS lasts 22 (*simulated*) |
| Two player game: green team plays up the pitch, red team down; a league of 10 to 100 weeks with the same points | traced | `twoplayer_week_end` (`$81E4`): runs of ten weeks, as many as chosen; `league_record` for the points; side 0 green, side 1 red (`player_colours`, `$370F`) |
| Pitch: steel walls, a goal at each end, a warp tunnel in each side wall that sends the ball out of the other side | traced | `ball_move` (`$380E`), `tunnel_check` (`$3A7D`): only a ball on the ground goes through |
| Ball launcher in the centre rises, rotates and shoots the ball in a random direction at the start | traced | `launcher_sequence` (`$3739`): 16-48 turns, strength 1-4; at every kick-off, after a goal too |
| Bounce domes deflect the ball and not the players, in a different layout for each match | traced | `dome_bounce`, ten layouts (`domes_place`, `$9241`), the next one after every match (`match_over`) |
| Fire throws: a short press at waist height, a held press high over the players, which can go too high for a tunnel or the goal mouth | traced | `player_move` (`$9E45`): the throw leaves at the press, and fire held five passes more sends it high; goals and tunnels take only a ball on the ground |
| Fire without the ball: jump to catch it in the air nearby; otherwise tackle; slide when moving | traced | `player_move`; only a jumping player takes a ball in the air (`ball_pickup_side0`, `$3ADF`) |
| Control passes to one player of your team at a time | traced | `players_update` (`$9B6E`): the outfield player nearest the ball, or the holder |
| Goalkeeper is steered by the stick when on screen; fire with the stick centred jumps and punches; moving sideways dives; he throws the ball out on his own, straight or diagonally by his movement | traced | `ai_keeper_bottom` (`$A116`), `ai_keeper_top` (`$A391`): fire with left or right dives, fire with neither jumps, and he moves only while the camera shows him, sideways across the goal mouth and down to line `$21A`, never up. He throws as soon as he has the ball (`keeper_throw_up`, `$3BCA`; `keeper_throw_down`, `$3BE3`), across by his facing; the computer's keeper throws straight |
| Tackling: success depends on skill; the winner takes the loser's stamina by his strength, and the loser rolls, helpless, for a couple of seconds; a tackled keeper cannot save; a player in the air always loses; no fouls | differs | `tackle_resolve` (`$8EF5`): skill counts only in a slide, and against the side that has it; other tackles go by the two players' facings. The pair table looked up through `$F290` leaves 13 of the 45 pairs, 9 of them opponents, never seen to touch (*simulated*, `facts.md`) |
| Stamina: lower stamina means slower players and shorter, weaker throws; full again at the start of each match; meters bottom left and right | traced | `player_dir_step` (`$9F98`, below 12 a step slower), `player_move` (below 6 a throw a step weaker), `stamina_meters` (`$8C70`), `players_attributes_set` |
| Save-and-collect tokens (rotating discs), spent after each match on: bribe official 2 (an extra minute of the last match, once), extra stamina 3, bribe timer 3 (longer token effects), bribe trainer 4 (duller computer, not two player), extra skill 4, reduce stamina 4, extra power 6, reduce skill 6, bribe ref 6 (one goal start), reduce power 7 | traced | `token_shop` (`$80A3`), prices `$2C23`; extra time is 13 bars of 40, and the skill items work against the buyer (`facts.md`) |
| Immediate-effect tiles by letter: F freeze the opponents but their keeper, R slow them, P you cannot be tackled, S your stamina up, D theirs down, G get the ball, E an electron bolt that tackles, W the ball tackles whoever it hits, M an eight-way electron burst, J reverse the opponent's stick (two player only); each timed by a ten-stage countdown; the computer cannot use them | differs | `tile_choose` (`$A994`), `$BB21`: E and M are never chosen, and their effect entries point at W's routine; W comes up three times as often as the others; the computer collects tokens only (`tile_check`, `$99FA`) |
| Changes to the opponent's attributes last for good in a two player game and for the round in a one player game | differs | Two player: the shop changes the other side's figures at once (`shop_reduce_skill_now`, `$AEA2`). One player: the handicaps `$1ED3`-`$1ED6` apply at the next `opponent_load` and are then cleared (`attributes_handicap`, `$AEF5`); every match, each knockout leg and extra time included, loads the opponent again (`match_restart`, `$31C2`), so they last one match |
| Saving: one each of a knockout, a league and a two player game on a blank disk, formatted if it needs it | differs | `menu_save` (`$3C8A`), `game_save` (`$BD50`): files `0`, `1` and `2` by the KERNAL's own SAVE, replacing the old one; nothing formats a disk |
| Continue game: carry on with a saved game | traced | `menu_continue` (`$3D2E`), after a load (`game_kept`, `$1EE9`) |
| F1 pauses | differs | RUN/STOP pauses until fire (`match_loop`, `$325C`); F1 is not read (`keys_read`, `$8891`) |
| Quit during a match (F10 on other machines) ends the league or knockout with no chance to save | differs | F3 quits the match to the menu with no shop and no result (`match_quit_flag`, `$7A`) and clears `game_kept` (`menu_main`, `$3C26`), so CONTINUE GAME refuses; but SAVE GAME tests only that a game type is set (`menu_save`, `$3C8A`), so the game can still be saved, with the week or leg not played and the tokens taken in the quit match, and loaded back |
| A match clock (TIME bar) and the two scores at the bottom of the screen | live | the panel below the pitch in play; 40 bars, one every 112 passes (`clock_step`, `$3393`) |

## Beyond the documentation

Found in the code, not in the manual.

- The game checks that CIA 2's two timers run, and run in step, three
  ways in every frame of play; a copy that stops them gets a match that
  never ends, sticks that read fire or a direction all the time, a frame
  wait that never ends, or an interrupt chain sent to a slot that does
  not exist (`facts.md`, "Copy protection").
- The menu's credits name Pantheon Software for the conversion, Sam
  Mohabull for the graphics and Dave Whittaker for the music and sound
  effects (`strings_credits`, `$26EE`).
- F5 is read every frame and nothing acts on it (`keys_read`, `$8891`).
- Two saved games ship on the disk, a league and a knockout (`facts.md`,
  "Build").

## Open questions

- Who at Pantheon Software programmed the C64 version: the game's
  credits name the company only.
