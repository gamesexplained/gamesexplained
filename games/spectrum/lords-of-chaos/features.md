# Lords of Chaos — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Spectrum Computing, entry 2930, `https://spectrumcomputing.co.uk/entry/2930`, read through the ZXInfo API (`https://api.zxinfo.dk/v3/games/0002930`) on 3 November 2026: credits (Julian Gollop, Nick Gollop, Shaun G. McClure; inlay art Steinar Lund), Blade Software 1990, 1 to 4 players turn based, controls (cursor keys, Interface 2, Kempston), the files below
- The manual, `LordsOfChaos(EN).pdf` on that entry (36 pages, a retyped booklet covering the Spectrum, C64 and Amstrad versions), read 3 November 2026: every section below
- Spectrum Computing's running screen (`reference/running-screen-spectrumcomputing.png`) and its fan-made map (`reference/map-scenario-spectrumcomputing.png`), saved 3 November 2026
- The game's own screens and stored text (`work/s1-play.sna`, the scenarios' snapshots)

## Features

| Feature | Status | Where |
|---|---|---|
| Control select at the first start: keyboard, Kempston joystick, Sinclair joystick; Q and A move the bar, SPACE chooses | live | first screen after the hand-over (`reference/select-controls.png`) |
| Keyboard: Q up, A down, O left, P right, SPACE fire | live | Q, A and SPACE driven in the menus |
| The wizard designer's file panel: design, load, save and delete a wizard, load a scenario, load a saved game | live | `reference/designer-panel.png` |
| Load scenario: type its number; the tape loader names each file it passes | live | route in `orientation.md` |
| The scenario file panel: play game, load scenario, load designer, load wizard, load saved game, save wizard | live | `reference/scenario-loaded.png` |
| Load designer: the designer is read again from tape (block 9) | traced | load_designer `$C728`: finds DESIGNER. and loads `$0E45` bytes at `$D3DC` |
| Wizard file names: the first seven letters of the first name plus the level (TORQUEM1) | traced | designer save_wizard_option `$D50B`: cut at the first space within seven letters, so JOE BLOGGS saves as JOE1 |
| Saved games carry the extension `.SVG`; a one-player game may be saved and reloaded at most five times | traced | save_game `$C74D`; end_of_turn_menu `$C8E4` counts the saves in `$D068`, which the saved game carries |
| Number of players, 1 to 4; missing wizards are made at random; scenario 3 is one player only | traced | start_game `$6073` (`$D048` marks a one-player scenario); random_wizard `$C941` names its wizards WIZARD1 to WIZARD4 (`reference/how-many-players.png`); HOW MANY PLAYERS? seen (`reference/how-many-players.png`) |
| A one-player designed wizard must be in the first slot with its level equal to the scenario number | traced | start_game `$6073`: the first wizard's level against the scenario number, the error at `$CC39` |
| Turn sequence: the independent creatures move first, then each wizard | live | INDEPENDENT CREATURES panel, then the turn panel (`reference/independent-creatures.png`, `reference/turn-panel.png`) |
| Game turn panel: whose turn, the turn number, each wizard's victory points; press fire | live | `reference/turn-panel.png` |
| Hidden movement: the other wizards' turns show nothing | traced | computer_turn `$96EB` sets `$D066`, and nothing is drawn while it is set; a human sees only what its own creatures see (work_out_sight `$B1A6`) |
| End of turn menu: continue, save the game, abandon | traced | end_of_turn_menu `$C8E4` |
| Map window, information display on the right, message line at the bottom | live | `reference/play-wizard-house.png` |
| The map wraps round at its edges | traced | cursor_up to cursor_right `$6348`-`$63B1`, draw_map `$A94C`, line_setup `$B045`; drawn wrapped by the How it works page |
| Cursor menu: SELECT-A, SELECT-G, NEXT, INFORM, BIG MAP, END TURN, CANCEL | live | `reference/cursor-menu.png` (no airborne creature, so no SELECT-A) |
| Information display: five icons (undead, flying, mount, fatal wound, invisible) and five bars (action points, stamina, constitution, combat, defence) | live | `reference/play-wizard-house.png` |
| Select mode menu: END MOVE, CENTRE, BIG MAP, RIDE, RIDER, CAST-A, CAST-G, DROP, CHANGE, PICK UP, EAT, DRINK, FILL, USE, THROW-A/G, FIRE-A/G, READ, FLY, LAND, CANCEL; an option shows only when the creature can do it | traced | select_menu `$6B31` offers each option through its own test (can_drink `$73AA`, can_fill `$747E`, can_eat `$74D2`, can_fly_or_land `$6DC2`); READ only in scenario 3 (its hook at `$D02A`); some seen (`reference/select-menu.png`) |
| Movement by moving the cursor next to the creature and pressing fire; fire repeats the step | traced | select_ground `$691F`, classify_step `$CA2B`, move_selected `$B4EB` |
| Engagement: next to an enemy a creature cannot move until it kills it; attack by moving into it | traced | classify_step `$CA2B` (6, free but engaged); select_ground `$691F` says ENGAGED TO ENEMY |
| Return attacks when the defender has action points and stamina left | traced | attack `$84EC`: 4 action points and 4 stamina |
| Combat: attacker's combat against defender's defence with a random factor | traced | strike_hit `$8605`: a random number below twice the combat plus 2, less the defence; `test_combat.js` |
| Fatal wound: a single blow of more than 25 % of constitution; constitution then falls each turn until healed | traced | damage_creature `$7755`; start_of_turn `$7560` takes twice the wound each turn; healing potion clears it (drink `$73D0`) |
| Undead are harmed only by undead, magic weapons or spells | traced | strike_hit `$8605`: an undead attacker, a magic weapon `$60`-`$66` but the magic bow, or a spell |
| Attacking terrain: bumping impassable terrain may destroy it, by its toughness | traced | attack_terrain `$6862`: 6 action points and 6 stamina, toughness against strength |
| Action points spent by almost every action, restored each turn; exhausted creatures get half | traced | start_of_turn `$7560`: halved when stamina is under a sixth of its most |
| Stamina recovered each turn; constitution below 50 % lowers action points, combat and defence | traced | start_of_turn `$7560`, load_figures `$9342`: divided by the times constitution goes into its most, so whole above half |
| Line of sight: 9 spaces on the ground, 11 in the air; roofs, walls, tall grass and trees block | traced | work_out_sight `$B1A6`: under 19 half squares on the ground and 23 in the air, terrain flags at `$D38E`; `test_sight.js` |
| Flying: FLY and LAND, a fixed action point cost per step, over impassable terrain; not under a roof | traced | fly `$6E51`, land `$6E1B`; classify_step `$CA2B`: 4 a step in the air, and bit 3 of byte 4 of a terrain (a roof) shuts it to flyers |
| Riding: unicorn, pegasus, gryphon and elephant carry wizards, pixies, dwarves, goblins and trolls; RIDE and RIDER | traced | ride `$718E`, rider `$71D3`; select_menu checks the rider's type flag 3 and the mount's flag 0 (the creature table on the How it works page) |
| Objects: only creatures with hands carry them; the last picked up is in use; CHANGE picks another; weight limits | traced | pick_up `$706A`, change `$700D`, carry_limit `$78C6`, carried_weight `$712C` |
| Doors and chests: USE opens, closes and unlocks them; keys are used up | traced | use_square `$726C` |
| Weapons add combat and defence; thrown and ranged combat values (weapons table) | traced | load_figures `$9342` (bytes 2 and 3 of the object record), throw_object `$7A28`, fire_missile `$7B3D` |
| Enchant doubles a weapon's values and lets it harm the undead, for a time | traced | enchant `$87F1`: the magic version (type + 7) for the level plus 3 turns; the scenarios give the magic versions twice the figures, the magic Slayer more; enchantments_wear_off `$8BC1` |
| 45 spells, 25 of them summon spells; each cast lowers the spell's level by one; mana cost rises with level | traced | spell_list `$80BF`, pay_for_spell `$82A2`, spell_cost `$81D4`: the base cost times the level plus one (`reference/spell-list.png`); spell list seen (`reference/spell-list.png`) |
| Summon spells: as many creatures as the spell's level, in empty spaces around the wizard | traced | summon_creature `$8342` |
| Mana recovers 4 % of the starting mana each turn; magic mushrooms and apples restore mana | traced | start_of_turn `$7560` adds a 25th of the starting mana (add_mana `$84D5`); eat `$74E5` gives a wizard byte 3 of the food's record |
| Potions: an empty cauldron, the ingredient and the wizard on one space, then the potion spell; level + 3 gulps; seven potions (strength, protection, invisibility, speed, flying, super, healing) | traced | brew_potion `$8465`, potion_ingredients `$84CE` |
| Only one potion in effect; its length depends on level and the creature's potion consumption | traced | drink `$73D0`: (strength x 3 + 10) / potion consumption turns |
| Dragons need a dragon potion (cauldron and dragon herb); flame breath can start fires | traced | summon_dragon `$8320`, fire_missile `$7B3D` (projectile 0) |
| Magic fire: no line of sight needed, spreads or dies each turn, damages enemies only; each cast weakens all the caster's fire | traced | area_spell_at `$86B2`, spread_magic `$7DBD`; start_of_turn `$7560` burns only creatures of other players |
| Gooey blob: spreads over other terrain, harms undead | traced | area_spell_at `$86B2`, spread_magic `$7DBD`; start_of_turn `$7560` (blob_strength) |
| Tangle vine and flood: an area by level; flood puts out fire; drowning risk | traced | area_spell_at `$86B2`, flood_area `$7F09`; step_effects `$7F98`: one time in four for a creature that cannot swim |
| Subversion, curse, magic attack: success by level against magic resistance; magic attack also hits creatures of the same type nearby | traced | subversion `$895C`, curse `$89D4`, magic_attack `$8A13`, magic_resistance `$89CA` |
| Magic bolt and magic lightning: physical attacks against defence; lightning hits the eight spaces around and can destroy terrain | traced | magic_bolt `$885F`, magic_lightning `$88AB` |
| Teleport: inaccurate at range, leaves the wizard with no action points, fails into solid terrain | traced | teleport `$8AE1`, jitter_coordinate `$8BB1` |
| Magic eye: see from a space; reveals invisible creatures for the turn | traced | magic_eye `$8A8A` |
| Magic shield: boosts the wizard's defence for turns by level | traced | magic_shield `$8BEC`: four times the shield plus 12 defence (load_figures) |
| Victory points: killing creatures (doubled when the wizard kills directly), treasure carried through the portal, escaping; 0 for a wizard who dies or fails to escape | traced | damage_creature `$7755` (halved unless a wizard struck), step_effects `$7F98` (treasure and the escape bonus), game_over `$8DD3` (only the final scores count) |
| The portal: appears on a turn in a range per scenario and stays a number of turns (1: 12-15 and 12; 2: 20-24 and 15; 3: 44-51 and 10) | traced | set_up_game `$8CFA`, portal_turn `$8D9D`; each scenario's `$D040`-`$D042` hold the figures |
| Role-playing game: escaping makes a wizard one level higher; victory points become experience points, four to one | traced | game_over `$8DD3`: in a game against the computer, a designed wizard with more points than the computer's goes up a level and keeps its score; the designer gives four experience points a point |
| Wizard designer: NAME (letters and spaces), CHARACTER (raise attributes with experience points, each at a cost, never below the start), SPELLS (levels up to 8), EXIT | traced | designer name_screen `$DEAB`, character_screen `$DD05`, spells_edit `$DBD7`, design_wizard `$E037` |
| The creature table: 25 creatures with action points on the ground and flying, constitution, stamina, combat, defence, magic resistance, potion consumption, carry limit, victory points and flags | traced | each scenario's creature types at (`$D003`), drawn as the table on the How it works page |
| The weapons table: sword, knife, shield, bow, spear, club, axe, ninja star, Slayer, magic Slayer | traced | each scenario's object records `$59`-`$66`; object `$5E` is the club in scenario 1, the Slayer in scenario 2 and the ninja star in scenario 3 |
| Scenario 1, The Many Coloured Land: Torquemada, treasure gold 16, ruby 12, emerald 8 | traced | scenario 1's header and object records; TORQUEMADA is its wizard |
| Scenario 2, Slayer's Dungeon: the Slayer, worth 30 | traced | scenario 2's object records |
| Scenario 3, Ragaril's Domain: one player, puzzles, traps and helpful scrolls; diamond 30 | traced | scenario 3's hooks (floor_traps, deadly_floors, read_scroll) and object records |

## Beyond the documentation

Found in the code, not in the manual. Each is on the Discoveries page
with its test.

| Finding | Status | Evidence |
|---|---|---|
| LOAD takes the first file on the tape whose name starts with the same letter | observed live and traced | find_file `$C675`; test_discoveries.js; `reference/load-*.png` |
| Scenario 2's lava burns only the creatures a human player moves | traced | lava_burns `$E1F0` tests computer_moving `$D063` first; test_discoveries.js |
| Three of scenario 2's routes lead into solid rock (waypoint 28, past the table) | traced | waypoint_square `$9971`, computer_choose_target `$9992`; test_discoveries.js, test_levels.js |
| The strength vials scattered at the start wear off in three turns (strength 255) | observed live and traced | place_object `$FEA7`, drink `$73D0`; test_discoveries.js |
| Leaving the designer throws away up to three experience points | observed live and traced | design_exit `$E17E`; test_discoveries.js; `reference/designer-*.png` |
| A draw goes to the last wizard in the list | traced | game_over `$8DD3` |
| The authors' breakpoint routine is still in the game, with five border-colour alarms | observed live and traced | debug_probe `$96BA`; `reference/debug-probe.png` |
| The tape still carries the testers' wizards | traced | the wizard records `$CEEA`, the designer's names `$D864`, each scenario's player names |
| A trip square wakes its guards when a door or chest there changes, not when a creature steps on it | traced | trip_square `$A716`, called from use_square `$7339` and set_terrain_under `$73A6`; test_levels.js |

## Open questions
