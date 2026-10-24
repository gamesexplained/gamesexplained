# Shadowfire — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Shadowfire operator's manual (Beyond, 1985, both machines in one
  booklet), scanned with the tape in the Ultimate Tape Archive,
  https://archive.org/download/uta_Shadowfire_1985_Beyond_2440/Extras/Instructions_text.pdf,
  read 22 October 2026. The text layer is OCR; the keyboard table is
  garbled in it.
- Shadowfire (video game), Wikipedia,
  https://en.wikipedia.org/wiki/Shadowfire_(video_game), read 22 October 2026.
- Screenshots of the tape loading, Ultimate Tape Archive item
  `uta_Shadowfire_1985_Beyond_2440`, and of a cracked copy's play
  (`Shadowfire_1985_Beyond_Software_cr_Yak_Society`), archive.org, read
  22 October 2026. Saved in `reference/` as `web-*.png`.
- A feature on Denton Designs, with Steve Cain interviewed, Sinclair
  User 40, July 1985, page 58, https://archive.org/details/sinclair-user-magazine-040/page/n57,
  read 24 October 2026: the Phantom as a C64 bug, taken out.
- "Shadowfire: the solution", Crash, June 1986, as kept in the Spectrum
  game database, https://sunsite.icm.edu.pl/packages/sinclair/docs/game-database/S/SHADFIRE.TXT,
  read 24 October 2026: a route through the game on the Spectrum.
- C64-Wiki has no page for the game (`Shadowfire` and `Shadow_Fire` on
  c64-wiki.com and c64-wiki.de were empty on 22 October 2026). Lemon64
  refused the fetch (a browser check).

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen shown while the tape loads ("Beyond © 1985, Shadowfire by Denton Designs") | live | the loader's blocks 2-5 put it up (`orientation.md`); the game never shows it |
| Control menu: F1 keyboard, F3 digital joystick, F5 analog joystick (paddles), F7 light pen | live | `restart` (`$40A3`) at `$41BD`; `fkey_codes` `$42CE`, `input_handlers` `$42C6`. Any key on the same keyboard row line as an F key chooses it too |
| Keyboard control: keys by row move the cursor; F7 or any top-row key enters a command | traced | `input_keyboard` `$5630`: the joystick's code with keyboard row-line masks (`input_masks` `$6825`) |
| Joystick moves the cursor over the icons; fire enters | live | `input_joystick` `$562C`, control port 1 only; a held direction speeds up from 2 to 6 |
| Analog joystick (paddles) moves the cursor | traced | `input_paddles` `$5526`: paddle 1 the row, paddle 2 the column |
| Light pen moves the cursor; its button or any key enters | traced | `input_lightpen` `$54F1`: any key is fire |
| Self-display (demonstration) mode starts after the first screen; any key leaves it | live | starts when the title music reaches tune 2 (`$4216`); `input_demo` `$5570`, `demo_script` `$1571`; it ends by clicking Quit twice |
| Scrolling welcome message in the command panel ("Welcome ally of the Empire...") | live | queued by `restart`; the ticker `$5FEF`, `ticker_shift` `$63D7` |
| Start menu: Old game, New game, Load game, Save game | live | `start_menu` `$74B9`, screen 7's icons at `$7C78` |
| Start menu summary: surviving Enigma Force, enemy killed or captured, mission status, Kryxix rescued or not | live | `summary_text` `$CF4B`, filled by `start_menu`; SUCCEEDED and FAILED shown by poking `$CA05` |
| New game starts the real-time countdown: one hour forty minutes | live | the clock starts at 99:58 and counts down a second each 50 frames (`$CA00`) |
| Save and load to cassette or disc, with a file name spelt with on-screen letters, a RUB icon and a carriage-return icon; Run/Stop on a tape failure | traced | `name_screen` `$765E`, `add_letter` `$7717`, `rub_out` `$772D`, `start_file` `$773E`: saves `$CA00`-`$CFFE` through the KERNAL. Not run live |
| Enigma team screen: the surviving characters, chosen with the cursor | live | `team_screen` `$6DCB`, screen 0's icons at `$78AE` |
| Up and down arrows on the team screen turn the background music on and off | differs | `music_up` `$7884`, `music_down` `$7891`: they step the in-game tune's pulse width (`$1603`) between 0 and `$40`, a step for every pass of the loop while fire is held, so the music fades in and out. It starts at 0, silent. *Live* |
| Four screens per character: Status, Objects, Movement, Battle, reached by green, yellow and red monitor icons; Quit goes back or cancels | traced | screens 1, 2, 4 and 5 (`$789C`); `quit_choice` `$7106` cancels a two-step choice |
| Status screen: agility, strength, stamina and weight bars; weight bar red when overloaded; weakened characters may recover | traced | bars at `$5761`; the weight is drawn red and the strength figure green over it, so red shows the excess; recovery `$58F8` |
| Objects screen: objects in the location (left), carried (middle), weight bar; Pick-up, Drop, Ready for use, Activate | traced | `list_objects_here` `$4CFA`, `list_objects_carried` `$4E77`, `pick_up` `$6FD9`, `drop` `$7011`, `ready` `$7056`, `activate` `$7063` |
| Weapons fire automatically in combat, but only one held "ready for use"; otherwise bare hands | traced | combat `$5BFF` reads the object held ready (+8) through `weapon_strength` `$CF15`; `$20` for bare hands |
| Manto's transporter: Pick-up, Transporter, Activate, Ballistic control beams Manto to the Fighter Bay or the top or bottom Shuttle Bay | traced | `activate_ballistic` `$7406`: locations `$16` (FIGHTER LAUNCH TUBE ONE), `$08` and `$A0` (both SHUTTLE BAY) |
| Beaming the rest of the team: Drop, Transporter, Activate, Transporter, then the character | traced | `activate_beacon` `$734D`: someone at one beacon goes to the other in a second |
| Movement screen: filled arrows show the directions possible; a text description of the location | traced | `build_directions`; the description icon at `$79E8` |
| A character refuses to move at a locked door without a key card, or when about to be attacked | traced | a locked exit's arrow cannot be chosen; a defender, or an attacker off the battle screen, gets "YOU CANNOT MOVE IN COMBAT MODE" (`move_by_exit` `$6E65`) |
| Battle screen: Location scan (characters in this or the next location), Attack, Defend, Retreat | traced | `battle_screen` `$7119`, `location_scan` `$7166`, `attack` `$71D2` |
| Battles in the same location or between adjacent ones; weapons differ in strength and range; "the computer will tell you if a battle cannot be resolved" | differs | combat `$5BE6`: each weapon has a strength for its own location (high nibble of `weapon_strength`, `$CF15`) and one for adjacent ones (low nibble), but only the first is ever applied (`damage`, `$68D7`, read with X 0 at `$5CB3`), so range makes no difference. Simulated on the game's code; "NO ENEMY TO ATTACK IN THAT DIRECTION" |
| A successful attacker advances into the enemy's location | traced | `$5D54` |
| Mission command panel above every screen: status icons, view screen, character in play | live | rows 0-12 of the bitmap as loaded, `panel_row_0` `$2000` onwards |
| Status icon colours: white inactive, blue moving, purple attacking, orange defending, yellow retreating, green picking a lock; grey when weak, black when dying | traced | `status_colours` `$68B7`, `$5896`; grey below strength `$80`, black below `$40` (`$58CB`) |
| View screen: an iris opens on the chosen character; icons flash for each other character in the location | traced | `iris_open` `$45E2`; the map icons from `entity_pictures` `$6CFE`, one cell updated each frame; several in one location take turns, blank between them, and one alone stays lit (`$60CF`) |
| Six characters with different speed, strength, stamina and carrying: Zark Montor, Syylk, Sevrina Maris, Torik, Maul, Manto | traced | strengths at `$CA0E`, `agility_base` `$CFB7`, `strength_factor` `$CF85` |
| Zark Montor is the translator: Kryxix follows only him (Wikipedia) | traced | `$5B9A`, `$5D93` |
| Syylk's hatred of Zoff "could prove a weakness" | open | nothing found: no comparison of entity 0 with Zoff in the combat (`$5BE6`), the triggers or the arrival code, and Zoff can be harmed by nobody |
| Sevrina picks locks (with the tool kit) | traced | `activate_tool_kit` `$7301`, `$5A08`: about 32 seconds a lock |
| Torik is the fastest; Maul slow and well protected; Manto the only transporter | traced | agility base `$FF` for Torik, `$40` for Maul (`$CFB7`); Maul's strength and factor are `$FF`; nothing reduces the damage he takes. Only character 2, Manto, gets the beacons' and the transporter's flags (`list_objects_here`) |
| Enemies: General Zoff (purple icon), Captain Chur (white or grey), Marshalls, Squad leaders ("Targs"), Troopers ("Eugs"), humanoid and robotic | traced | 42 enemy records (`$CA9E` onwards) with seven kinds of figure (`entity_pictures` `$6CFE`); the names are not in the game's text, except Marshalls Cavns and Xator in location names |
| Ambassador Kryxix appears as a green icon; he must be located and beamed off | traced | `map_icon_kryxix` `$0AE3`; rescue at `$5A68` |
| The Phantom, Zoff's invisible pet, attacks characters at random. Steve Cain of Denton Designs (Sinclair User 40, July 1985, page 58) says it was a bug in the C64 version, one wrong mnemonic, since taken out | open | every attacker is one of the 50 entities, which the interrupt runs in turn (`irq_entity` `$66D1`, `$6197`); each has a map icon and shows in the list of people in a location, and combat (`$5BE6`) runs only for one attacking, defending or retreating. Nothing found that attacks unseen. Six C64 copies hold the same program: Beyond's tape and disk, and the Yak Society (dated 30 April 1985), TBC, Radwar and TCI cracks (two more, cracks by Tuerk and FCG, were not compared). The only search past the end of the people, `enemy_at` (`$7250`), makes phantoms that never attack (`discoveries.html#phantoms`) |
| Objects: projectile pistol, lazer rifle, rocket launcher, grenade, smoke bomb, tool kit, colour-coded key cards, self-destruct card, self-destruct unit, time delay unit, transporter beacon | traced | 54 object records at `$CD98`: 18 other objects and 36 weapons in 18 pictures. The game names none of them |
| Rocket launcher best fired into an adjacent location; grenade and smoke bomb in the same location | differs | `weapon_strength` `$CF15` has an adjacent strength in its low nibble, which combat never uses (`$68D7`): every weapon hits adjacent locations with its same-location strength. Which picture is which weapon is not in the game |
| Time delay unit: the character who activates it is the only thing not held in a time lock | traced | `activate_time_delay` `$7282`: 120 seconds, once |
| Self-destruct unit, armed with the self-destruct card, counts down four minutes to the end of Zoff V | differs | `activate_destruct_unit` `$747F`: 256 seconds. *Live*. The card only makes the unit usable, and only in the unit's location, `$A2` (`$746C`) |
| Transporter beacon: only Manto operates it, and only after it is dropped in a location | traced | `list_team_beacon1` `$50E0`: a carried beacon's list is blank |
| Objectives in any order: rescue Kryxix, capture Zoff, capture or destroy Zoff V | live | `mission` `$CA05`, read by `start_menu` |
| Music by Fred Gray | traced | the music driver at `$1606` and nine tunes; the credit is the manual's |

## Beyond the documentation

Found in the code, not in the manual.

- Kryxix and Zoff can never be hurt: neither side's combat list holds
  entities 6 and 7 (`$5BFF`).
- Patrols walk back to their start four times as fast as they walk out
  (`$5E22`).
- Guard `$27` is meant to patrol but never moves, its patrol byte missing
  bit 7 (`$CCCC`). *Live*.
- The clock goes past 00:00 into a count up, and past 99:59 back to a
  countdown (`$629F`, `clock_wraps` `$6473`). *Live*.
- The in-game music starts silent: the team screen's arrows fade it in
  (`$1603`). *Live*.
- The self-destruct takes 256 seconds, not four minutes. *Live*.
- The demonstration has no end mark; it ends by clicking Quit twice.
  *Live*.
- A screen of icons, screen 3, that nothing draws (`$789C`).
- Weapons with the same picture have different strengths (`$CF15`).
- Every weapon hits the next location as hard as its own: the adjacent
  strength is worked out and never read (`damage`, `$68D7`).
- The portraits never show the top pixel line of their cells: the
  monitor repeats line 1 there (`show_portrait`, `$48B1`). *Live*.
- `enemy_at` (`$7250`) reads eight records past the entity table, which
  puts living "enemies" in locations `$80`, `$0C`, `$A2`, `$08` and
  `$54` as loaded: nobody can retreat into them.
- The view map looks for locations in sixteen of its seventeen cells
  (`find_view_locations` `$6BB7`).
- When Zoff V explodes, the screen shake takes its random numbers from
  the bytes of the game's own code (`shake_screen` `$4AD7`).
- `enemy_at` (`$7250`) scans fifty records from entity 8, so its last
  eight are the object records read as if they were people.
- Leftover text of a text-to-speech program's pronunciation rules sits in
  three unused corners of memory (`$0FE8`, `$13E8`, `$15DF`).

## Open questions

- The Phantom: which mnemonic the first C64 release got wrong, and what
  it did; no copy that shows it has been found (see the table).
- Syylk's weakness against Zoff: nothing found.
