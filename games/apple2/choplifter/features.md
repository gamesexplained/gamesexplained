# Choplifter — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The instruction card, archive.org's OCR text of item
  `ChoplifterManualAppleII`,
  https://archive.org/download/ChoplifterManualAppleII/Choplifter%20Manual%20Apple%20II_djvu.txt,
  read 20 October 2026
- The instructions and the folder from a boxed copy, archive.org item
  `broderbund-choplifter-a2-ph`,
  https://archive.org/details/broderbund-choplifter-a2-ph, OCR text of
  `components/choplifter instructions` and `box/choplifter folder`, read
  20 October 2026
- Wikipedia, "Choplifter", https://en.wikipedia.org/wiki/Choplifter, read
  20 October 2026 (its Gameplay section mixes versions; only claims it
  makes of the Apple II are listed here)
- The game's own title screen and play in the emulator. Every picture in
  `reference/` was taken from the emulator during this run.

## Features

| Feature | Status | Where |
|---|---|---|
| Any key starts play | live | SPACE from the attract mode started the first sortie (`orientation.md`, step 5); `read_keys` (`$0D92`) returns carry set for any key but the game's own |
| The helicopter answers the joystick: up, down and sideways | live | paddle 1 through `read_stick_y` (`$7663`), paddle 0 through `read_stick_x` (`$769C`), both by the Monitor's `PREAD`; pushing the stick up lifted the helicopter off the pad (`play-sortie1.json`) |
| A sustained push of button 1 reverses the helicopter's direction | confirmed | `turn_button` (`$0E3B`): held until the pose passes the front, it carries on round to the other side |
| A short push of button 1 turns it to face the player ("tank attack" posture) | confirmed | `turn_button`: released before the pose passes the front, the helicopter stops facing the viewer ($72F9 = 0) |
| Button 0 fires | live | `fire` (`$0E0F`): one shot a press, none on the ground or after a hit, at most five in flight (`$7310`); five was the most seen in flight (`facts.md`, "Live tests") |
| The helicopter can fly one way while facing another (Wikipedia) | confirmed | the pose (`$08`) and the speed (`$00/$01`) are separate; `scroll_view` (`$9CD1`) treats flying backwards as its own case |
| Hostages are locked in barracks, 16 to a barracks | confirmed | `refill` (`$9A47`) puts 16 in each of the four and 64 in all; *live*, `play-sortie1.json` |
| One barracks has been blown open at the start | live | `open_fourth` (`$9EA9`) opens the fourth and lets 8 of its 16 out; at the start of play the states were 0, 0, 0, 1 and 8 were out |
| The other barracks must be freed (by shooting them, Wikipedia) without killing the hostages | confirmed | a blast at a closed barracks opens it (`barracks_blasted`, `$8B4B`); the same blast kills hostages within about 10 dots (`blast`, `$881D`) |
| All 16 of a barracks must be rescued or killed before the next | differs | `release` (`$62F2`) lets hostages out of the barracks the helicopter is over, or else any open one with some left: nothing waits for a barracks to be emptied |
| Land near the hostages and they climb in | confirmed | `boarding` (`$6139`): 8 or 9 dots right of the helicopter or 10 or 11 dots left, with the helicopter level on the ground |
| The helicopter seats 16 | confirmed | `boarding` turns a hostage away when `$730E` holds 16 |
| Landing on hostages kills them | confirmed | `crush` (`$62D7`): a hostage from 7 dots right to 9 dots left of a helicopter sitting level is crushed |
| Landing tilted crushes boarding hostages (Wikipedia, of the Apple II and Atari 7800 versions) | differs | the crush and the boarding both need the door open (`$0D`), which needs the helicopter level (`ground_check`, `$770D`): tilted, it neither boards nor crushes. |
| Land on the pad by the post office and they scramble out | live | `let_out` (`$6359`), 13 to 63 dots right of the base; an unloading counted a hostage home (`facts.md`, "Live tests") |
| Three counters at the top: killed (red), aboard (blue), returned (green) | confirmed | `print_counter` (`$7AB4`) draws the digits at X 63, 141 and 219; `draw_counter_icons` (`$9951`) draws the third little hostage in the other colour group |
| The most that can be saved is 64 | live | `sortie_loop` (`$0C13`) ends the game with the crowns at 64 home; *live*, `facts.md` |
| Three helicopters a game | confirmed | `next_sortie` (`$0B9B`) ends the game after the third ($731C = 3) |
| The game ends with the third helicopter lost, or every hostage dead or rescued | live | `sortie_loop`: home and killed making 64 ends it; *live*, 63 home and 1 killed showed "THE END" |
| Sorties are announced: FIRST SORTIE, SECOND SORTIE | live | seen at the start of play and after a crash (`reference/`); `next_sortie` picks the message from `$A0FA` |
| The last message is "The End", not "Game Over" (Wikipedia, from Gorlin) | live | `game_over` (`$0C92`) draws "THE END" (`$A0F6`); all 64 home draws three crowns instead (`$A0F8`) |
| Jet fighters come out of the background and fire air-to-air missiles; they can be shot down | confirmed | `jet` (`$8006`) and its manoeuvres at `$6C00`; `jet_missiles` (`$8B5F`); `shot_hits` (`$868A`) destroys a jet that has come forward |
| Jets bomb a helicopter on the ground (Wikipedia) | confirmed | `jet_swoop` (`$8201`) starts manoeuvre 4, the bombing run, at a helicopter on the ground; `jet_bomb_impl` (`$8BF2`) |
| Tanks amble along, kill hostages and destroy a helicopter on the ground | confirmed | `tank_impl` (`$65C3`); a shell's blast (`blast`) hits a helicopter on the ground within 11 dots and kills hostages; a tank seen on the first sortie |
| Only a helicopter facing forward can shoot back at tanks | confirmed | `blast` hits tanks only in front of the ground's depth, and only shots fired facing the viewer or turning come forward (`shot_depth_table`, `$7FBC`) |
| Drone air mines home in on the helicopter, the only enemy on the post office's side of the barrier | confirmed | `drone` (`$8C42`) homes on the helicopter and has no test of the fence: tanks stop short of it (`tank_right`, `$6785`) and jets leave once the helicopter is over its block (`jet_cruise`, `$8115`). Drones only appear while the helicopter is two blocks short of the fence (`spawn_drone`, `$653A`), so one gets there by following it |
| ESC pauses | confirmed | `read_keys`: ESC waits for a second ESC |
| CTRL-S toggles the sound | confirmed | `read_keys` flips `$72F6`, which every sound routine tests |
| The sound goes to the cassette port too, for an external speaker | confirmed | every click of `$C030` is followed by a read of `$C020` (`click_impl`, `$78AB`; `tone_impl`, `$78C2`; `noise_impl`, `$76CD`) |
| CTRL-V and CTRL-A reverse the joystick's up and down, left and right | confirmed | `read_keys` flips `$72F5` on CTRL-V and `$72F4` on CTRL-A, which `read_stick_y` and `read_stick_x` test |
| "Francis Scott Key plays piano at the post office", "Boris Spasskey plays chess at the post office" (the card's jokes) | differs | the card's jokes only: the game draws the post office (`$A0B2`) and the hostages walk in at its door (`$700A`), and nothing more happens there |
| An attract mode: "your mission: RESCUE HOSTAGES" and a demonstration sortie | live | after the title, with nothing pressed; `demo_loop` (`$0A04`) flies a 32-step script (`$0ADF`), then the same flight mirrored |

## Beyond the documentation

- CTRL-L, then a key, sets the level (`$731D`) to the key's low two bits
  (`$0DED`), which sets how many tanks, jets and drones may be in play,
  how many jets are bold, and whether drones drop shells (*live*: CTRL-L
  then 3 set it to 3). A new game puts it back to 0.
- The level goes up by one at each unloading that follows a boarding, to
  3 at most: it counts trips, not time (*live*, `facts.md`).
- Every tank meant to appear on the helicopter's right is put at the far
  left of the world by a slip at `$6440` and dropped at once, unless the
  helicopter is in the first 128 dots of its range (X `$02D0`-`$034F`),
  where the tank is kept and drives in from the left. So tanks come from
  the left (Discoveries; *live*, `facts.md`).
- The disk runs on the Apple II and II Plus only: the loader checks the
  Monitor ROM and stops with `M` on the enhanced IIe (`orientation.md`).
- RESET during play shows `R`, beeps and erases memory
  (`orientation.md`).
- The planet is drawn by code, 66 stores a page, not from a shape
  (`draw_planet`, `$9411`).
- Two routines are never called: `build_screen` (`$9ADD`) and `multiply`
  (`$7F0E`).

## Open questions

- None of the features is left open.
