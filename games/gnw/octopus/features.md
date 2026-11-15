# Octopus — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, read on 12 November 2026:

- The Super Mario Wiki's page on the game,
  <https://www.mariowiki.com/Octopus_(Game_%26_Watch)>: released on 16
  July 1981 in the Wide Screen series; a point a treasure taken and 3
  for bringing it back to the boat; a miss when the octopus catches a
  diver; misses removed at 200 and 500 points; three misses end the
  game; the arms speed up; Game B faster and harder than Game A.
- The Handheld Museum's page, <https://handheldmuseum.com/Nintendo/Octopus.htm>,
  with a review an owner posted to Usenet's net.games in 1982: the
  boat, the rope and the sunken ship's chest; four tentacles; the left
  tentacle reaching up toward the rope as well as down; three divers in
  the boat; a buzz when a diver is caught; a ticking sound; the clock
  and alarm; "the high score is remembered".
- MAME 0.289's driver block for OC-22 (`src/mame/handheld/hh_sm510.cpp`):
  the buttons and their pins, the "Invincibility" test pad on R2 and
  the R3 row marked "alarm test?".

Sources read on 15 November 2026, for the page's history and photographs:

- Nintendo's "Iwata Asks: Game & Watch", parts 2 and 4
  (<https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Game-Watch/Iwata-Asks-Game-Watch/4-Absorbed-in-Development/4-Absorbed-in-Development-223140.html>):
  Takehiro Izushi wrote Octopus's software and Masao Yamamoto
  Parachute's, at almost the same time; Makoto Kano drew it, and drew
  the alarm's octopus after Tako no Hatchan; about two months to the
  ROM; 5,800 yen; the clock shows AM or PM to save segments.
- The Super Mario Wiki (above): German Schnapp den Schatz, Italian La
  Piovra; Game & Watch Gallery and Gallery 4. The Home Computer Museum,
  <https://www.homecomputermuseum.nl/en/collectie/nintendo/nintendo-game-watch-octopus/>:
  Mysteries of the Sea or of the Deep in Britain. The gameandwatch.ch
  forum: some backs printed "Nintend".
- reference/photo-octopus-unit.jpg: Christoph Bauer, 2008, CC BY-SA 2.0,
  <https://commons.wikimedia.org/wiki/File:Octopus_-_Game%26Watch_-_Nintendo.jpg>.
  reference/photo-fire-wide-screen.jpg: Peer Schmidt, CC BY-SA 4.0,
  <https://commons.wikimedia.org/wiki/File:Nintendo-game-and-watch-wide-screen.jpg>.
  Both re-encoded at 1012 pixels wide.

## Features

| Feature | Status | Where |
|---|---|---|
| A clock with AM and PM, shown at rest, with a demo game playing silently | live | timekeep $0200, time_screen $0680, clock_second $001B, demo_move $0331 |
| An alarm, shown and set with Alarm, on and off with each press of Alarm, the note lit when on | live | keys_mode $0540, note_alarm_on $0620, alarm_screen $06A6 |
| The alarm rings at its time, for a minute, with the octopus in the corner and the bolts | live | alarm_check $0580, alarm_ring $05A4, alarm_buzz $0293 |
| Setting the time after power on or ACL (every segment lit) | live | pad_pressed $02C2, read_pad $0380 |
| Game A and Game B, chosen with their buttons; the game starts when the key is let go | live | keys_mode $0540, mode_setup $05C0, keys_released $0569 |
| The diver goes down from the boat by the rope to the chest in five places, and back | live | move_on $0300, move_back $0334, move_back_chain $0340 |
| Right at the chest takes a piece of treasure: a point | live | take_start $0317, grab_step $005A, add_point $0085 |
| Bringing treasure back to the boat is worth 3 points | live | move_back_chain $0340, deliver_step $0367: counted in one point a step, with the octopus waiting |
| A diver may not climb back into the boat without treasure | live | move_back_chain $0340 ($0359) |
| Four tentacles grow and shrink "at random rates and intervals" | differs | tentacle_turn $0100: they move in a fixed turn, one segment a step; the only chance is the clock's seconds, which decide when an empty tentacle starts, which of T1's branches comes out, and in Game B whether a tentacle comes back from its base |
| The left tentacle can reach up to the rope or down | live | t1_start $0180: the tens of seconds, odd or even, choose |
| A diver touched by a tentacle is caught; the remaining divers move along in the boat | live | catch_check $01C0, caught_show $0700 |
| Three misses end the game | live | caught_end $072B |
| Misses removed at 200 and 500 points | live | add_point $0085, bonus_step $06DC: only when a diver has been lost; the spares blink for about 5 seconds |
| The tentacles speed up as you progress | live | set_wait $00C0: by the score's hundreds plus tens, so the game slows again at each hundred |
| Game B faster than Game A | differs | set_wait $00C0, the tentacles $0100: faster only at 0-19 and 100-109 points; otherwise the same speed, but its tentacles may come back from the base |
| A 24-hour clock (the 1982 review) | differs | add_hour $0240, hours_ampm: 12 hours, AM or PM, the tens of hours one segment that shows a 1 |
| Pressing both buttons makes the diver dance (the 1982 review) | differs | read_pad $0380: both at once count as neither, and the diver stays |
| A ticking sound, and a buzz when a diver is caught | live | click $02A7 each step, caught_sound $02F4, caught_step $00E9 |
| The high score is remembered | live | add_point $0085 ($00A1): one for each game, shown while its key is held (game_screen $062E) |
| Setting the clock erases the high score | confirmed | power_on $03C0: the time is set only after power on or ACL, which clear every cell |
| The diver leaves the boat by himself after a while | live | boat_leave $03EB: after 8 seconds, unless the left tentacle reaches toward the rope |
| "Invincibility" test pad on R2 (MAME's driver) | live | catch_check $01C0: any key of the R2 row skips the check; read_pad $0380: held left or right repeat too |
| R3 "alarm test?" row (MAME's driver) | live | test_row_r3 $059E: K4 rings the alarm, K3 goes back to setting the time |
