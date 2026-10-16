# Castle Master — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Castle Master manual (Domark, 1990), Commodore 64 page and introduction,
  https://mocagh.org/miscgame/castlemaster-alt3-manual.pdf, read 16 October 2026
- C64-Wiki, https://www.c64-wiki.com/wiki/Castle_Master, read 16 October 2026

## Features

| Feature | Status | Where |
|---|---|---|
| Language: English, French or German | live | `RUN_TITLE_AND_CHARACTER_MENUS` `$9B1C`; `play.py` chose English |
| Play as the prince or the princess, to rescue the twin | live | `$9B1C` stores the choice in `$246E`; `INITIALIZE_NEW_SESSION` `$4E05` makes it game bit 32; `play.py` chose the prince |
| Move forward and back, turn left and right | live | `DISPATCH_PLAYER_MOVEMENT` `$5DD8`, actions 3-6 from `↑`/`*`, `=`, `Z`, `X` and the joystick (`$1382`); a turn is 3 steps of 5° (`$9D4C`); `turn.py`: X took the heading `$2411` from 28 to 31, a turn to the right |
| Commodore key with a turn: 90° | traced | `$6072-$6091`: 18 steps when the Commodore key's flag `$1380` is set, 3 otherwise |
| U-turn | traced | action 13, `U`: `$6156-$616C` adds 36 steps (180°) to the heading |
| Look up, look down, face forward | traced | actions 7, 8 and 12 (`P`, `L`, `F`) in `$5DD8`; pitch is kept within 90° of level (`$60EF-$60F7`) |
| Crawl, walk, run | traced | actions 9-11 (`C`, `W`, `R`); step lengths 30, 60 and 240 (`$9D46-$9D48`); messages 13-15 |
| Throw a rock | traced | Shift or fire: action 22 to `DISPATCH_AIM_FIRE_ACTIVATE` `$62E8`; a hit sets the shot event `$04` (`$646D`) |
| Action: eat, drink, read, push, collect, open, unlock | traced | `A`, action 27, in `$62E8`; scripts react through their event bits |
| Space switches between moving and the pointer | traced | action 30; with the pointer on, `$4901-$490C` turns the direction keys into pointer moves; sprites placed by `$65A6` |
| Centre sights on and off | traced | `+`, action 21: `$633E-$6346` flips `$246B`, which decides whether `$3672` draws the reticle (`$827A`) |
| Information screen: score, strength, keys, spirits destroyed | traced | `I`, action 41, opens `RUN_INFORMATION_MENU` `$77FE`; fields formatted at `$7A80-$7AF3` |
| Save and load a position, tape or disk | traced | `S` and `L` in `$77FE`, `PROMPT_SAVE_DEVICE_AND_NAME` `$7B03`, `LOAD_SAVE_DISPATCH` `$0423`; 106 bytes of state then one flag byte per object. Not exercised on this disk |
| Music or sound effects | live | `F` in `$77FE` (`$79C3`); `alarm.py` ran the game both ways |
| Show the keys collected | traced | `K` in `$77FE` |
| Quit | traced | `Q` in `$77FE` sets end reason 6 (`$7808`) |
| Strength, falls and the three potions | live | `$2455`, from 16, capped at 24 by script opcode `$13`; a fall costs 5 (`$8142`); `drain.py` saw a sensor take a point every 10 seconds; `potion.py` saw the potion of revitalisation give a point every 10 seconds, and `stores.py` the potion of strength give a point and 6,250 for each of 64 drinks; the potion of rock travel sets flag 30 (traced) |
| Ten keys | traced | each new key adds 125,000 (`$70EE`); message 16 NEED TEN KEYS is printed by a script |
| Guardian spirits | live | 21 to destroy (`$9D49`): 19 shared spirits raised by global scripts 1-3 over sensors 125-127, the Courtyard's and the Dragon's Lair's; the spirit meter `$246A` ends the game at 64 (`$72A9`); `meter.py` ended games at the expected clocks |
| Riddles | confirmed | nine panels at `$18AE-$1B76`, printed by script opcode `$22` with the high bit set; all nine parse to their ends |
| Drawbridge, locked doors, secret tunnels, caverns | confirmed | scripts in the database `$9D00`; the 34 areas, 546 objects and 809 script tokens parse exactly |
| Rescue and escape | live | `ending.py`: the Magister's object 5 adds 3,000,000, prints YOU DID IT ! and plays tune 1 |
| Lightning | traced | `$484F` requests effect 8; the lightning band in the sky is drawn by `$4D90` |

## Beyond the documentation

- The sensors' alarm in effects mode restarts its tune on every frame, so
  only the tune's first frame is ever heard, 50 times a second (`$73A1`;
  `alarm.py`). With music on there is no alarm at all.
- An area with a sensor that is not hidden drains a point of strength
  every 10 seconds, whether or not the sensor can see the player
  (`$7545`; `drain.py`).
- The spirit meter ends the game 64 minutes after the start if no spirit
  is destroyed. Its multiply is signed, so a clock of 128 overflows: with
  11 or 12 destroyed the game ends at 192 minutes, earlier than the sum
  says, and with 13 or more it never ends (`$7286-$72AF`;
  `test_meter.js`; `meter.py`).
- The potion of strength in the Stores never hides itself: it can be
  drunk 64 times, for a point of strength and 6,250 each (`stores.py`).
- The escape's tour enters the Hospital without a redraw, so it is never
  shown (`tour.py`).
- The escape replays a tour of ten areas, and each first visit pays
  17,500, the Wilderness included, which the start never marks as
  visited (`ending.py`).
- Tunes 7 and 10 (effects 6 and 9) are in the driver and requested by
  nothing; message 9, CHOMP CHOMP AHH, is printed by nothing.
- The music driver's start leaves voices 2 and 3 with their test bits
  set, because it decrements write-only registers (`$CF1B`).

## Open questions

- The bytes `$9D4D` and `$9D4E` of the database header: `opcodes.py
  --refs` finds only `$5F13`, `LDA $9D46,X` with X the movement mode,
  which would have to be 7 or 8 to reach them. Their role is unknown.
- Tape saving and loading were not exercised.
