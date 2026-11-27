# Fire — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, read on 25 November 2026:

- The Super Mario Wiki's page on the game,
  <https://www.mariowiki.com/Fire_(Game_%26_Watch)>: released in the
  Silver series on 31 July 1980 and in the Wide Screen series on 4
  December 1981; first sold in North America as "Fireman Fireman".
  People jump from a burning building, and two firemen with a life net
  bounce them across the screen to an ambulance. A point for each
  catch; a caught person bounces and must be caught again. The fall's
  speed depends on where the person is; as time passes more people jump,
  and faster. One who is missed is hurt and runs away, a miss; three
  misses end the game. At 200 and 500 points the misses are cleared,
  and the falling people stop for a moment. In Game B people jump from
  two floors of the building. Angels are the miss marks. In the Silver
  version points came only when a person reached the ambulance. In Game
  & Watch Gallery, Gallery 3 and Gallery 4.
- Arcade History, <https://www.arcade-history.com/game/100938/>: released
  4 December 1981 in Japan; 3 points for each person who reaches the
  ambulance; the speed rises with the score, drops back to the start at
  each hundred points and rises again; at most 9 people on the screen at
  once. Mr. Game & Watch's stage in Super Smash Bros. Brawl (Flat Zone
  2) has the firemen's net.
- A web search on 25 November 2026 summarised a database's text
  (not opened): in Game A the people jump from the fourth floor, and in
  Game B the speed is fixed while up to 9 are on the screen; the best
  score shows when Game A or Game B is held, and is lost when the
  batteries are changed or ACL is pressed.
- MAME 0.289's driver block for FR-27 (`src/mame/handheld/hh_sm510.cpp`):
  the Sharp SM5A, labelled FR-27 523B; the buttons and their pins; R2 K1
  "Infinite Lives (Cheat)", a factory test pad unpopulated on the board,
  K2 "same as 0x01?", K3 "reset?", K4 "alarm test?"; R3 "lcd test?".
  It says this is a complete rewrite of the Silver version, the last
  Game & Watch on the SM5A, and that the Elektronika Kosmicheskiy Most
  (Space Bridge, 1989) runs the same ROM with different graphics.

Sources read on 25 November 2026, for the page's history and photographs:

- Nintendo's "Iwata Asks: Game & Watch", part 2
  (<https://iwataasks.nintendo.com/interviews/clubn/game-and-watch-ball-reward/0/1/>):
  the chip was the kind used in calculators; Ball's chip could show 72
  segments; Makoto Kano: "Not a single segment went to waste."
  Part 3
  (<https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Game-Watch/Iwata-Asks-Game-Watch/3-Test-Models-with-Little-Bulbs/3-Test-Models-with-Little-Bulbs-223069.html>):
  Masao Yamamoto and Takehiro Izushi first worked closely on the series
  with Fire, the fourth game; its prototype was made with a soldering
  iron; test models about A4 size with grain of wheat bulbs behind
  acrylic; the "Yokoi standard"; at times one game a month.
- Wikipedia's "Game & Watch": the alarm came to the units from 1981.
- SmashWiki, <https://www.ssbwiki.com/Fire>: Mr. Game & Watch's up
  special, Fire, in Melee, Brawl, Super Smash Bros. 4 and Ultimate.
- The Super Mario Wiki (above): Gallery 3 uses the Silver design with
  the Wide Screen scoring.
- reference/photo-silver.jpg (cropped) and reference/photo-wide-off.jpg:
  Xabi Vazquez, 2008, CC BY 2.0,
  <https://commons.wikimedia.org/wiki/File:Game_%26_Watch_fire_silver.jpg>,
  <https://commons.wikimedia.org/wiki/File:Game_%26_Watch_Fire_Wide_Screen.jpg>.
  reference/photo-wide-lit.jpg: Peer Schmidt, 2014, CC BY-SA 4.0,
  <https://commons.wikimedia.org/wiki/File:Nintendo-game-and-watch-wide-screen.jpg>;
  its screen matches reference/power-on.png. All re-encoded at 1000
  pixels wide, without their metadata.
- MAME's screen drawing for FR-27 has 67 segments of the chip's 72
  outputs; the five without one are 0.0.1, 0.2.0, 0.3.0, 0.3.1 and
  3.0.0 (lcd_18 bit 0, lcd_08 bits 2 and 3, lcd_18 bit 3, lcd_03 bit 0).

## Features

| Feature | Status | Where |
|---|---|---|
| A clock with AM and PM, shown at rest, with a demo game playing | live | timekeep $0200, clock_screen $06C0, demo_step $031E: the demo moves every part of the path each second, and its firemen move once a second toward the net of the first person about to land (demo_firemen $0340) |
| An alarm, set, switched on and off, and ringing at its time | live | mode_change $0540 (each press of Alarm flips it, except the first after power on), alarm_minute $0580, the ambulance man's bell (draw_prep $0603) and the buzz (play_sounds $0280) |
| Setting the time after power on or ACL | live | pad_pressed $02C7: left an hour, right a minute, held repeating every quarter second, in the alarm's setting too (read_pad $03D6) |
| Game A and Game B, chosen with their buttons | live | mode_change $0540, mode_setup $05C0; the game starts when the key is let go |
| The firemen move left and right between three places under the arcs | live | firemen_left $034F, firemen_right $0364 |
| People jump from the building, more and faster as the game goes on | live | jump_chance $00C0, jump_limit $0088: up to four in the air, a step from 0.205 s down to 0.124 s |
| A caught person bounces and must be caught at each of the three places | live | window_arc $0158, arc2_move $01C3, arc3_move $0100, arc4_move $0180, catch_check $0300 |
| The points: one for each catch, or three at the ambulance (the sources disagree) | differs | add_point $0040: one for each catch, so three for a person carried all the way; with an R3 test key down, two at the ambulance and none for catches |
| A person missed is hurt and runs away, a miss, an angel at the top right | live | miss_start $03C4, miss_timer $00DD, count_miss $0197: the hurt figure lies under the net and goes out after seven steps |
| Three misses end the game | live | count_miss $0197: the third angel (lcd_10 bit 2), five beeps |
| Misses cleared at 200 and 500 points, the falling people stopped for a moment | live | new_hundred $005A, bonus_hold $071C: only with an angel shown; about six seconds |
| The speed drops back at each hundred points | live | jump_limit $0088: the limit drops to 1 at each hundred, but the wait between steps also grows shorter with each hundred |
| At most 9 on the screen at once | differs | jump_limit $0088: jumps stop at four in the air (in_air), though a fifth can be on the path after an odd hundred (new_hundred) |
| Game B: people jump from two floors | live | arc2_move $01C3 and lower_drop $0117: a second window at 2.0.1, whose jumper drops onto the first arc |
| The best score of each game, shown while its button is held | live | best_check $006A, draw_prep $0617; cleared only by power_setup |
| R2 K1: a test pad that turns the misses off | live | count_miss $0197: held when a miss is counted, no angel is added |
| Sounds: a catch, a miss, the bonus, the alarm | live | play_sounds $0280, play_tone $02B0, tone_beep $00A6 |

## Beyond the documentation

- A late catch: someone above a net with the firemen elsewhere is not
  missed until that arc's next turn, so a press in between still
  catches (catch_check $0300, turn_0_2 $0140).
- No one jumps while the clock's seconds end in 8 or 9, unless no one
  is on the path (jump_chance $00D3).
- One fewer is counted in the air at each odd hundred (new_hundred
  $005A).
- R3 K3 or K4, with no pads on the board: catches score nothing and each
  person who reaches the ambulance scores 2 (catch_check, arc4_move).
- R2 K3 puts the unit back to setting the time; R2 K4 rings the alarm
  (test_pads $059D). An R3 key at power on shows 888 (clock_screen).
- A second person uncaught at the moment a miss begins is let off at
  that net, and must be caught at the next: the miss clears every net's
  due flag (miss_start $03C4).
- 256 seconds after a game is over the unit goes back to the clock
  (timekeep $0200).
