# ACE 2 — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The C64 instructions as transcribed on c64.krissz.hu, "ACE 2 - play online", https://c64.krissz.hu/ace-2/play-online/, read 25 October 2026. The section "Arming The Aircraft" that the text points to, and the instrument panel diagram, are not in the transcription.
- The Amstrad and Spectrum inlay (Gamebusters re-release), text on World of Spectrum, https://www.worldofspectrum.org/pub/sinclair/games-info/a/ACE2-TheUltimateHeadToHeadConflict.txt, read 25 October 2026: the same quick-play guide with other keys.
- Wikipedia, "ACE 2 (video game)", https://en.wikipedia.org/wiki/ACE_2_(video_game), read 25 October 2026: credits and reviews.
- The game's own screens and strings (`$6704`-`$6E96`, stored in a letter cipher that `$6F7F` undoes), from `work/entry.vsf`.

## Features

| Feature | Status | Where |
|---|---|---|
| One or two players, each flying a different fighter; plane one from a carrier, plane two from an airbase | open | manual |
| One player: the computer flies plane two, at a skill level the options set | open | manual; options screen |
| Two games: a close-range dogfight (cannon and heat-seekers, both planes already flying, placed close together at random) and the full-scale aerial and ground attack (spy ship, radar station, airbase) | open | manual; options screen |
| A pilot shot down gets a fresh plane; the game ends when one pilot has none left | open | manual |
| Options: one or two players, the computer's skill level, the scenario, planes each, crash detection on or off, missile hits to kill an aircraft, save the options to disk | live | options screen (`reference/options.png`) |
| Colour code security system: the colour of a square of the grid on the inlay; three wrong answers wipe the game | live | `reference/colour-code-check.png`; strings at `$682D`-`$68FE`; `$37E1` |
| Plane one: joystick in port 1, F more power, S less, X map view, E select weapon, Q flares and chaff | open | manual |
| Plane two: joystick in port 2, H more power, K less, V map view, U select weapon, T flares and chaff | open | manual |
| F3 held: quit the game and restart; F5 held: music on or off during the game | open | manual |
| Stick up and down changes the pitch, left and right banks; a steep bank with the stick pulled back turns quickly; in a steep bank the stick has little effect on pitch | open | manual |
| Above 75 % power the afterburners light: much more thrust, heavy fuel use; needed above Mach 1.0 (about 760 knots) | open | manual |
| Stall speed 140 knots; ceiling 60,000 feet | open | manual; strings "STALL WARNING", "CEILING60000" |
| The plane is faster and more agile in thin air (high altitude) | open | manual |
| Cannon: less than 1 mile | open | manual |
| Heat-seeking missile: less than 8 miles | open | manual |
| Radar-guided missile: less than 25 miles, guided to the target | open | manual |
| Air-to-ground (ship) missile: below 2,000 feet, slower than 500 knots, guided | open | manual |
| Arming the aircraft: the pilots choose the weapon load in the full-scale game | open | manual; hangar's ARM AIRCRAFT |
| Six flares and six chaff pods; the game picks the one that fits the missile; best at about 1 mile | open | manual; strings "FLARE DROPPED", "CHAFF DROPPED", "NO FLARES", "NO CHAFF" |
| A hit leaves the controls dead for a few seconds | open | manual; string "CONTROL LOST" |
| Return to base: plane one off the west edge of the map below 1,000 feet, plane two off the east edge; repaired, rearmed and refuelled | open | manual; strings "REDUCE ALT TO LAND", "OK FOR LANDING" |
| Surface-to-air missiles defend the ground targets | open | manual |
| The planes can collide | open | manual; option "crash detection" |
| Map view: both planes' positions | open | manual |
| Scoring: 20 a cannon hit, 50 a missile hit, 200 a plane destroyed, 2,000 a ground target | open | manual |
| Fuel runs out; "FUEL IS LOW" | open | strings |
| Greatest Aces: the top five scores with names, entered by the pilot, saved to the disk | open | `reference/greatest-aces.png`; strings "YOUR SCORE IS ONE OF THE TOP FIVE", "ENTER YOUR NAME" |
| Demo mode: the computer flies both planes between title pages | live | `reference/demo-mode.png` |
| Title music by Rob Hubbard | open | credits string at `$6BA2` |

## Beyond the documentation

Found in the strings, not in the manual. Each is open until traced.

- A message from the programmer in plain text among the code, `$51B4`-`$53D3`, which nothing prints: "WELCOME TO MY CODE. WHAT ARE YOU DOING IN IT?" It dedicates the game to "THE VERY WONDERFUL TERESA", thanks Ocean "FOR NOT RELEASING TOPGUN FOR THE C64", and says: "IF YOU ENTER THE NAME OF MY HAMSTER ON THE HIGH SCORE TABLE, PLAYER ONE WILL BE IMMORTAL. A REAL HACKER WILL FIND HER NAME FROM THE CODE".
- The hamster's name: the high-score entry compares the first eight letters of the name typed with `$6A30` (`$5634`), which deciphers to "DUSTY BUG", just before "COMMENCE CONFLICT"; a match sets `$0975`, and "IMMORTAL" (`$6BC3`) is a side-panel string.
- "YOU TRAITOR" (`$6CEC`), one of the cockpit messages.
- "PAUSE ON" (`$6E98`).
- "MISSION COMPLETED - PRESS FIRE." and "ALL AIRCRAFT DESTROYED."
- The hangar screen: "TAKE OFF" and "ARM AIRCRAFT" for each pilot, "PRESS FIRE TO TAKE OFF" and "COMPUTER PILOT - STANDING BY."
- The cockpit message table (`$7432` for pilot one, `$7472` for pilot two): STALL WARNING, CRASH WARNING, PLANE CRASHED, CONTROL LOST, FUEL IS LOW, FLARE DROPPED, CHAFF DROPPED, REDUCE ALT TO LAND, ENEMY CLOSE, NO FLARES, NO CHAFF, YOU TRAITOR, ENEMY MISSILE, FLYING OFF MAP, ENEMY PLANE, RANGE, ALT, TARGET LOCKED, LOCK BROKEN, the flare and chaff counts, MISSILE LAUNCH, OK FOR LANDING, CEILING 60000, RADAR STATION (pilot one) or ENEMY SPYSHIP (pilot two), OUT OF RANGE.

## Open questions

- Which colour answers which square: the grid is on the inlay, which is not to hand, but the game holds its own copy at `$FA00` (`$37E1`).
