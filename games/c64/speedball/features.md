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
| Menu: one player knockout, two player game, one player league, save game, load league, load knockout, load two player game, continue game | live | SELECT GAME screen |
| Three teams to choose from, differing in skill and stamina (and power, on screen) | live | PLAYER 1 SELECT: Verna (captain Kef), Lacata (Conroy), Draco (Verik), with height, weight, stamina, power, skill |
| Knockout: ten rounds, each the best of three legs; 2 points a win, 1 a draw, 0 a loss; 3 points go through, and two legs that make 3 skip the third | open | KNOCKOUT ROUND screen shows round and leg |
| Opposing teams get harder as the knockout rounds go on | open | |
| League: 11 teams, 100 points a win, 20 a draw, 5 a goal; length chosen from 10 to 100 weeks; 5 matches a week, your team rests in week 11; your team flashes in the table | open | |
| Two player game: green team plays up the pitch, red team down; a league of 10 to 100 weeks with the same points | open | |
| Pitch: steel walls, a goal at each end, a warp tunnel in each side wall that sends the ball out of the other side | open | |
| Ball launcher in the centre rises, rotates and shoots the ball in a random direction at the start | open | |
| Bounce domes deflect the ball and not the players, in a different layout for each match | open | |
| Fire throws: a short press at waist height, a held press high over the players, which can go too high for a tunnel or the goal mouth | open | |
| Fire without the ball: jump to catch it in the air nearby; otherwise tackle; slide when moving | open | |
| Control passes to one player of your team at a time | open | |
| Goalkeeper is steered by the stick when on screen; fire with the stick centred jumps and punches; moving sideways dives; he throws the ball out on his own, straight or diagonally by his movement | open | |
| Tackling: success depends on skill; the winner takes the loser's stamina by his strength, and the loser rolls, helpless, for a couple of seconds; a tackled keeper cannot save; a player in the air always loses; no fouls | open | |
| Stamina: lower stamina means slower players and shorter, weaker throws; full again at the start of each match; meters bottom left and right | open | bars at the bottom of the play screen |
| Save-and-collect tokens (rotating discs), spent after each match on: bribe official 2 (an extra minute of the last match, once), extra stamina 3, bribe timer 3 (longer token effects), bribe trainer 4 (duller computer, not two player), extra skill 4, reduce stamina 4, extra power 6, reduce skill 6, bribe ref 6 (one goal start), reduce power 7 | open | |
| Immediate-effect tiles by letter: F freeze the opponents but their keeper, R slow them, P you cannot be tackled, S your stamina up, D theirs down, G get the ball, E an electron bolt that tackles, W the ball tackles whoever it hits, M an eight-way electron burst, J reverse the opponent's stick (two player only); each timed by a ten-stage countdown; the computer cannot use them | open | |
| Changes to the opponent's attributes last for good in a two player game and for the round in a one player game | open | |
| Saving: one each of a knockout, a league and a two player game on a blank disk, formatted if it needs it | open | |
| Continue game: carry on with a saved game | open | |
| F1 pauses | open | |
| Quit during a match (F10 on other machines) ends the league or knockout with no chance to save | open | |
| A match clock (TIME bar) and the two scores at the bottom of the screen | live | the panel below the pitch in play |

## Beyond the documentation

Found in the code, not in the manual.

- The interrupt handler reads CIA 2's control register B on every raster
  interrupt and sets `$76` to `$FF` when its timer is not running
  (`$86F0`); the loader leaves the timer set. What `$76` does is open.

## Open questions

- Who programmed the C64 version. The game's own credit screens are the
  place to look.
- What the files `0` and `1` on the disk hold: they are not loaded at
  boot, and their size and address are those of a saved game.
