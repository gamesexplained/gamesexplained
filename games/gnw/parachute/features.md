# Parachute — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, read on 19 November 2026:

- The Super Mario Wiki's page on the game,
  <https://www.mariowiki.com/Parachute_(Game_%26_Watch)>: released on 19
  June 1981 in the Wide Screen series; the player rows a boat to catch
  parachutists jumping from a helicopter; a point for each; more
  parachutists, and faster, as the game goes on; one not caught is taken
  by a shark, a miss; three misses end the game; misses removed at 200
  and 500 points; in Game B some parachutists get stuck in a tree.
  German name Sprung in die Hölle, Italian I Paracadute; in Game & Watch
  Gallery, Gallery 2 and Gallery 4.
- The Home Computer Museum,
  <https://homecomputermuseum.nl/en/collectie/nintendo/nintendo-parachute-game-watch>:
  June 1981; land the people in the boat; one in the water is eaten by a
  shark, three and the game is over.
- gameandwatch.ch, <https://gameandwatch.ch/en/game-watch-information/all-60-games/560-parachute-pr-21.html>:
  model PR-21, the ninth game, released 19 June 1981 (the page's text
  did not load beyond its heading).
- Nintendo's "Iwata Asks: Game & Watch", part 4,
  <https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Game-Watch/Iwata-Asks-Game-Watch/4-Absorbed-in-Development/4-Absorbed-in-Development-223140.html>
  (read for Octopus on 15 November 2026): Masao Yamamoto programmed
  Parachute while Takehiro Izushi programmed Octopus, at almost the same
  time. The Super Mario Wiki also lists Mr. Game & Watch's parachute in
  Super Smash Bros. Melee.
- MAME 0.289's driver block for PR-21 (`src/mame/handheld/hh_sm510.cpp`):
  the buttons and their pins; R3 K1 "Infinite Lives (Cheat)",
  unpopulated on the board, "disable after boot", K2 and K3 "same as
  0x01?", K4 "alarm test?"; and that on Parachute, as on Fire, Mickey
  Mouse and Popeye, the controls still work after the game is over.

## Features

| Feature | Status | Where |
|---|---|---|
| A clock with AM and PM, shown at rest, with a demo game playing silently | live | timekeep $0200, clock_screen $06C0, clock_second $001B, demo_step $02E6: the demo moves all three lanes each second, and its boat moves by itself (demo_boat $0325) |
| An alarm, set in the alarm's setting, on and off with each press of Alarm, the bell shown when it is on | live | mode_entered $0526 ($0535), draw_prep $0600 (the bell up, flag_06 bit 0) |
| The alarm rings at its time, for a minute: the monkey rings the bell | live | alarm_minute $0588, alarm_ring $05B0, bell_swing $0625 |
| Setting the time after power on or ACL (every segment lit) | live | pad_pressed $02C0: left an hour, right a minute, held repeating four times a second (read_pad $0380) |
| Game A and Game B, chosen with their buttons; the game starts when the key is let go | live | mode_change $0540, mode_setup $05C0, start_game $056A |
| The boat moves left and right under three lanes of parachutists | live | move_boat $0300, boat_left $0333, boat_right $03F0 |
| Parachutists jump from the helicopter | live | jump_chance $0112: always when none is in the air; otherwise, while fewer than jump_limit are, by a chance from the clock's seconds and the chip's divider |
| A point for each one caught | live | catch $043A, add_point $0085 |
| One missed falls into the water and the shark takes him: a miss | live | miss_anim $0340: a swimmer swims across while a fin circles and the shark leaps; count_miss $0373 |
| Three misses end the game | live | count_miss $0373 (lcd_18 bit 0) |
| Misses removed at 200 and 500 points | live | add_point $0085 ($0093), bonus_step $071C: only when a miss is lit; the misses blink for about 5 seconds, the game held |
| More parachutists, falling faster, as the score grows | live | set_wait $00C0: jump_limit 1 to 10 and the wait from 11 passes down to 5, by the score's hundreds plus tens (plus one for units of 4 to 7) |
| Game B harder than Game A | differs | set_wait $00C0 is the same for both. Game B differs in the tree (right_lane $01C3) and in the jump's chance: with one or two in the air Game A always sends another, Game B asks the divider (jump_chance $0124) |
| In Game B some parachutists get stuck in a tree | live | right_lane $01C3: one leaving the right lane's third place when in_air is even and the tree is empty; tree_release $01E1: he drops when the lane below is clear, the seconds' tens are even, and the swing and the rotor agree |
| A shark | live | timekeep $0239: besides the misses, a fin circles and the shark leaps every ten seconds, in the clock and in a game, silently |
| The best score is remembered | live | best_check $00A3: one for each game, shown while its key is held (game_screen $05F0) |
| "Infinite Lives" test pad on R3 (MAME's driver) | live | power_on $03C0: any key of the R3 row held at power on sets pad_flags bit 2, and misses are not counted (count_miss $0370); the chip waits for it to be let go |
| R3 K4 "alarm test?" (MAME's driver) | live | read_r3 $05A7: rings the alarm at once, and flips the misses' flag each pass it is held |
| The controls still work after game over (MAME's driver) | live | read_keys $0506 reads the buttons once the third miss is lit, and move_boat still moves the boat |
