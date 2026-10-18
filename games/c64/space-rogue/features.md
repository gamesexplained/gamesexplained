# Space Rogue — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources (every one read on 14 October 2026; the full list with titles is
in the research notes kept with the run, and each claim below carries
its tag). No C64 manual or reference card was found online: the C64 keys
come from C64-Wiki's transcription of the card, and the manual scan is the
platform-neutral Sunracer Owner's Guide.

- [S1] Wikipedia, "Space Rogue": https://en.wikipedia.org/wiki/Space_Rogue
- [S3] textfiles.com review `sprogue.rev` (Apple II, with C64 notes): http://mirror.cyberbits.eu/textfiles.com/games/REVIEWS/sprogue.rev
- [S4] Apple II Player Reference Card, typed in a 1989 BBS file `space.rg`: http://mirror.cyberbits.eu/textfiles.com/apple/DOCUMENTATION/space.rg
- [S5] the HIVE! leaflet, archive.org: https://archive.org/details/space-rogue-hive
- [S6] the Sunracer Owner's Guide (manual), Steam guide scan: https://steamcommunity.com/sharedfiles/filedetails/?id=1944986825
- [S9] Tildes ~games club threads (PC, one C64 player): https://tildes.net/~games/1ti0/cga_2026_04_insert_cartridge_space_rogue and https://tildes.net/~games/1txf/cga_2026_04_remove_cartridge_space_rogue
- [S11] CSDb releases: https://csdb.dk/search/?seinsel=releases&search=space+rogue
- [S12] C64-Wiki (German), "Space Rogue": https://www.c64-wiki.de/wiki/Space_Rogue
- [S16] Zzap!64 #58, February 1990, review p. 8: https://archive.org/details/zzap64-magazine-058
- [S20b] The Games Machine, June 1990, "Cheat Street" solution: https://archive.org/details/thegamesmachine199006
- [S21] QuestBusters vol. 6 no. 11, November 1989: https://archive.org/details/questbusters-v6n11
- C64 screenshots from LaunchBox, C64.COM, GameBase64 and C64-Wiki, saved in `reference/ext-*.png` (source per file in `reference/README.md`)

## Features

### Start-up, title and intro

| Feature | Status | Where |
|---|---|---|
| One double-sided disk: side 1 BOOT, side 2 DATA [S12] | live | `orientation.md`, "The image"; "Insert DATA disk..." and "Insert BOOT disk..." are the loader's prompts |
| Title sequence: Origin logo, the Space Rogue logo, credits; any key skips it [S12] | live | `reference/title.png`; title part |
| "Old or New Game?": N for a new game, O for an old one [S12] | live | `reference/old-or-new.png`; N was tested |
| A new game asks for your name | live | "What is your name?" after N (`reference/name.png`) |
| A password check asks for a word from the manual by page, line and word [S12] | differs | only for an old game, and by page, paragraph, sentence and word in the Sunracer Owner's Guide: one of 32 records picked by the frame counter; only the first four letters are compared (intro `password_check`, `$74D2`; `manual_questions`, `$76C8`). A new game is never asked |
| Intro story: the *Princess Blue*, the derelict *Jolly Roger*, the Manchi attack [S14][S16] | live | `reference/intro-1.png`; intro part |
| You start aboard the derelict and walk to your ship [S1] | live | after the story the engine asked for side 2 and the game began in the derelict's hangar (`facts.md`, live tests) |

### Flight

| Feature | Status | Where |
|---|---|---|
| Filled, clipped 3D polygons, up to about sixteen objects [S19] | differs | `reference/starbase.png`; the draw list keeps at most 14 of the 20 object slots in view, drawn farthest first (engine `build_draw_list`, `$3E2C`); each model's faces in the fixed three-pass order of `draw_polygons` (`$7ED6`), which the Ships section's port matches on all 20 models (`test_ships.js`) |
| Keys W/X pitch, A/D turn, C/Z roll, S stops rotation [S12] | live | A, D, W and S were used to line up on Hiathra; rotation builds while a key is held and S stops it |
| + and - change speed; CF readout shows the set speed [S6][S12] | traced | `key_slower` `$13DE`, `key_faster` `$13F3`, a step at a time from -`$46` to `$46`; `draw_speed` (`$31B2`) prints CF and the set speed, NF and the actual speed |
| Cruise and Newtonian flight, Ctrl-E toggles [S6] | traced | `key_flight_mode` (`$1408`) toggles `$0D02`; F7, which gives the same code, does too. Cruise steers the velocity toward the set speed (`cruise_thrust`, `$7540`); Newtonian thrusts only while a speed key is held (`apply_thrust`, `$74D3`) |
| Camera views: cockpit, chase, cinematic, V cycles [S16][S12] | traced | `key_view` (`$142B`) counts `$0D3C` through 2, 1, 0 |
| T cycles targets; arrowheads at the screen's edges point to the target [S6] | live | `reference/tac-starbase.png`: "Starbase RAN 1972m"; the four arrowheads follow it |
| TAC data mode, five lines for a ship; Ctrl-T switches to the target's picture [S6] | traced | `key_tac_mode` (`$1411`, also I) toggles `$7C`; `tac_data` (`$336F`) prints the name, target, range, tactic, armour and systems |
| Beam weapons recharge; the M/A indicator and L toggles automatic fire [S6] | traced | the beam heat `$0D00` rises a step a shot, up to 8, halving the damage each step, and falls every 16 passes (`beam_hit`, `$2222`); `key_auto_fire` (`$141D`) works only with the beam lock item (`$073E`) |
| Missiles: plasma torpedo, SM-1, Nova; R readies a weapon, Space fires [S6] | traced | types 9 SM-1, 10 Nova, 11 plasma torpedo, contact damage 100, 250 and 75 (`launch_missile`, `$1EAD`); `key_next_weapon` (`$1E5C`, also full stop), `key_fire` (`$1DBE`, also 0) |
| Shields fore and aft, ECM, armour, damage to systems [S6] | traced | `shield_reduce` (`$6F88`): the aft shield for a hit from behind, the fore shield from in front, each step halving the damage; a hit of 10 or more knocks out a random system one time in five (`damage`, `$6EA0`); ECM makes a missile swerve (`launch_missile`) |
| Collision damage grows with the square of the relative speed [S6] | differs | the damage is the relative speed's length × 8, low byte only, to both ships: linear, and it wraps past 255 (`ram`, `$6BC3`) |
| Docking: touch the docking face at 20 m/s or less [S6][S9] | traced | the collision handler (`$7033`) docks when the object is the base and the face is its docking face and the speed is under 21; the docking routine was called directly (`orientation.md`) |
| Shooting a station gets docking refused [S6] | traced | a base hit by the player sets `$0783` (`damage`, `$6EA0`), and `arrival_message` (station `$A584`) refuses docking while it is set; the next day clears it |
| Hazards: asteroids, black holes, ion storms, nebulae, antimatter shard fields [S6][S16] | traced | `hazard_hit` (`$6CC5`): planets and the black hole do 255; a sector's ion storms (map type `$64`) flash and now and then strike the ship (`sector_hazard`, `$24B3`); the shard type `$1B` destroys what it touches (`hit_shard`) |
| Malir gates and wormholes: enter at 21 m/s or more, stay inside the rings [S6] | differs | 20 or more, lined up with the gate's axis (`gate_contact`, `$6C54`); the trip ends when the ship leaves the rearmost ring (`wormhole_rings`, `$72C1`), and the gate's entry says how many rings must be passed |
| Other ships hail, taunt and use ten tactics [S6][S16] | traced | `target_status` (`$1DDF`) prints a hail every 256 passes; ten tactics from `$0C86`, chosen by `ai_tactic` (`$375F`); the opening fight on Ships and combat, run on the engine's main loop, changes tactic and fires only on passes 17 apart (`test_combat.js`) |
| G surrenders, J jettisons all cargo [S12] | traced | `key_surrender` (`$392A`): the Imperium asks the bounty plus 50, others the cargo; `key_jettison` (`$13D4`) empties the hold |
| F1 pauses [S12] | traced | F1 gives ESC (`key_chars`, `$0FEF`), and `key_escape` (`$1438`) waits for a key with the hum off |
| Ctrl-S saves, in space only [S12][S4] | traced | `key_save` (`$154E`) asks "Save game? Y/N" and writes `$0403`-`$0801` as `SAVED` (`save_file`, `$1783`); it is a flight key, and the base and Navigation read their own |
| Death ends the game with no restart [S21] | traced | `player_destroyed` (`$1B90`) loads `END` and its `game_over`, which prints the death text and loads `TITLE`; O there loads the last save |

### Navigation

| Feature | Status | Where |
|---|---|---|
| N opens Navigation Control: CHART, HELM, STATUS, QUERY, SCAN, COCKPIT [S6] | live | `reference/navigation.png` |
| Each system is a 32 by 32 grid of sectors [S6] | traced | `system_grid` (nav `$5100`), 32 × 32 cells |
| CHART moves brackets to a destination; HELM is the autopilot; any key stops it [S6] | live | charted to 13,19 and flew there; "Ship has arrived at destination" |
| QUERY gives a sector's bases, hazards and lore [S6] | traced | `nav_query` (`$2A69`): the system and coordinates, FEATURES, the sector kind's text, SHIPS, then the message of an entry there (`reference/ext-nav-query-log.png`) |
| Eight systems: Karonus, Deneb, Gryphon, Arcturus, Nar'see, Bassruti, Sigure, Zed N27 [S6][S23] | traced | the eight maps `q0`-`q7` carry those names (`$5505`); `q9` is a ninth, Ja-Karn, the Manchi system, reached only by a talk script (station `talk_end`, `$E7C7`) |
| The clock starts at 00:00 HRS, 01 MAR 12 [S13] | traced | `SR`'s clock bytes start at 0, 1, 3, 12 (engine `$0720`-`$0725`; `clock_year`, `$0723`) |

### Bases

| Feature | Status | Where |
|---|---|---|
| Docking switches to a top-down tile view that scrolls as you walk [S16][S19] | live | `reference/hangar.png` |
| Starbases check the cargo for contraband [S6] | live | "We've done a routine check of your cargo hold and found everything in order" (`reference/docking.png`) |
| Commands: talk, inspect, status, done; leave by your ship's hatch [S4][S13] | traced | `base_menu` (station `$AA0C`): TALK, INSPECT, STATUS, DONE; the ship's entry has action 2, embark (`action_routines`, `$AB2E`) |
| Conversations offer replies; OTHER takes a typed keyword [S4][S16] | traced | `talk_menu` (station `$E699`): the last item OTHER... takes a typed line and searches it for each keyword in turn |
| Repair, trading post, outfitter and cantina [S6] | traced | map types `$20` cargo merchant, `$22` outfitter, `$23` repair shop, `$24` bartender (`talk_to`, station `$AB58`) |
| Twelve bases, four kinds [S6] | traced | `l00`-`l70`, of kinds starbase (Hiathra, Denebprime), outpost (MiCon I, Free Guild, Trochal), the carrier ISS Koth and stations (the other six), from each map's `$5610` |
| Pilot's licence quiz at Hiathra [S9][S20b] | traced | Hiathra's map holds talk script 12, Orellian's exam (disk texts `$C303`-`$C320`); the outfitter sells weapons, shields and ECM only with the licence (`$074D`, station `outfitter`, `$B0E2`) |
| Guards throw you out of restricted areas [S9] | traced | `guards_check` (station `$B863`): a guard next to the player ends the visit, bars the base for the day and fines 25 credits for a secured area |

### Trading and story

| Feature | Status | Where |
|---|---|---|
| Buy and sell cargo; prices differ by system; some goods spoil [S6][S9] | differs | prices differ by base, each map with its own (`cargo_price`, station `$B027`), and hold all day; kinds that spoil (`cargo_spoils`, engine `$0D08`) can turn to spoiled cargo on a HELM step (`helm_hazard_check`, `$2A15`) |
| Contraband is confiscated at starbases [S6] | traced | at every base but the outposts and stations, one visit in two (one in eight with forged papers), kinds 0-3 are taken (station `$A62E`); the check itself was seen at Hiathra |
| Reputation with the Imperium, the Merchant Guild, the pirates, the Manchi; repute as a pilot [S6][S15] | traced | four standings, -2 to 2, one for each faction by its number (`$072E` pirates, `$072F` the Guild, `$0730` the Imperium, `$0731` the Manchi: the beam's weapon count, `$FE`, read as hostile, which `change_standing`, `$3C90`, leaves alone), set the factions' attitude (`faction_attitude`, `$387E`); the rank count (`$072A`, `$072B`) grows with kills and surrenders |
| Docking at the Manchi homeworld ends the game [S20b] | traced | the docking routine (`$7094`) jumps to `$1532`, which loads `WON`, when the current system (`$071D`) is 9, the Manchi system on side 2's `q9`: docking at any base there wins; the ending was seen by calling it (`reference/ending-1.png`) |

### HIVE!

| Feature | Status | Where |
|---|---|---|
| An arcade cabinet in the cantinas [S6] | traced | the base's tile-action table at `$AB30` gives a Hive! tile the handler `$AAD6`, which loads `HCODE` |
| "Insert credit" or "Quit game" [own] | live | `reference/hive-menu.png` |
| Collapse a set number of mounds, then run back to the ship [S5] | live | "MOUNDS: 03" on drop 1 (`reference/hive-drop.png`) |
| Three mounds on drop 1, six on drop 2, nine on drop 3 [S21] | traced | 3 × n mounds on drop n (`hive_game`, hive `$57BE`) |
| Five drops win a prize [S5] (four, [S3]) | traced | four drops won, then caught on the fifth, pays 8 credits, and 8 more for each drop after (`hive_game_over`, hive `$57F8`): [S3]'s four |

### Sound

| Feature | Status | Where |
|---|---|---|
| No music, only sound effects [S12] | traced | 14 effects and the engine hum (`sound_step`, `$10D2`); the title plays only the Sunracer's drone, the ending nothing |

## Beyond the documentation

Found in the code, not in the manual.

- The raster interrupt can stop for good, more often on a PAL machine:
  `bitmap_mode` turns the bitmap on with a read-modify-write of `$D011`,
  whose bit 7 reads as bit 8 of the beam's line and writes bit 8 of the
  raster compare. Run while the beam is on line 256 or later, it moves the
  interrupt from line `$50` to `$150`, which no frame reaches. Two clean
  boots out of two hung at "Old or New Game?" (`orientation.md`).
- `END` on side 2 is `INIT` from side 1 under another name, loaded to put
  back the bytes a base overwrites.
- Flight takes two joysticks: the one in port 2 steers and fires, and
  the speed comes from pushing the one in port 1 forward or back
  (engine `joystick_speed`, `$242C`).
- F7 does what CTRL-E does, switching cruise and Newtonian flight: it
  gives the character `$1F`, which the flight keys list beside CTRL-E
  (engine `key_chars`, `key_cmds`).
- Every pause in the title, the intro and the ending is the same length,
  about 0.86 seconds, whatever its caller asks: `pause` clears the key
  first, which sets A to `$FF` (intro `$68D6`).
- HIVE! raises mounds at its fastest rate from the first drop: the wait
  is meant to shorten with the level, but a reversed branch throws the
  longer wait away for every level up to 18, and from level 19 keeps a
  wrapped one (hive `hive_raise_mound`, `$59E4`).
- Picking a lock with anyone in sight always gets the player spotted:
  the half-the-time test reads the random routine's first byte instead
  of calling it (station `pick_lock`, `$B79E`).
- The star field behind "ACCESS DENIED" is not the one shown before the
  manual question: the typed answer lands in the last page of the
  packed star field (intro `line_buffer`, `$BF00`).
- The distress call's Morse spells SOS SOS PLAY ULTIMA SOS SOS (intro
  `morse_text`, `$7397`).
- "Space craft detected" does not stop HELM's trip unless a key or
  fire is pressed in the two seconds after it; "Under attack" does
  (engine `helm_encounter`, `$2991`; `nav_helm`, `$277A`).
- The ending's truce page starts a row lower than the others: it sets
  only the cursor's row (ending `story_truce`, `$78F7`).

## Open questions

Resolved from the code:

- The keyword protection uses the Owner's Guide [S12], not the 16-page
  novella [S21]: the 32 records name pages up to 46 (intro
  `manual_questions`, `$76C8`).
- There is a ninth system: `q9`, Ja-Karn, the Manchi system, danger 85
  and every ship class weight on Wasps and Vultures; the charts and the
  manual leave it out, and only a talk script takes the player there.
