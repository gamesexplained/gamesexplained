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
| Load designer: the designer is read again from tape (block 9) | open | |
| Wizard file names: the first seven letters of the first name plus the level (TORQUEM1) | open | |
| Saved games carry the extension `.SVG`; a one-player game may be saved and reloaded at most five times | open | |
| Number of players, 1 to 4; missing wizards are made at random; scenario 3 is one player only | open | HOW MANY PLAYERS? seen (`reference/how-many-players.png`) |
| A one-player designed wizard must be in the first slot with its level equal to the scenario number | open | |
| Turn sequence: the independent creatures move first, then each wizard | live | INDEPENDENT CREATURES panel, then the turn panel (`reference/independent-creatures.png`, `reference/turn-panel.png`) |
| Game turn panel: whose turn, the turn number, each wizard's victory points; press fire | live | `reference/turn-panel.png` |
| Hidden movement: the other wizards' turns show nothing | open | |
| End of turn menu: continue, save the game, abandon | open | |
| Map window, information display on the right, message line at the bottom | live | `reference/play-wizard-house.png` |
| The map wraps round at its edges | open | |
| Cursor menu: SELECT-A, SELECT-G, NEXT, INFORM, BIG MAP, END TURN, CANCEL | live | `reference/cursor-menu.png` (no airborne creature, so no SELECT-A) |
| Information display: five icons (undead, flying, mount, fatal wound, invisible) and five bars (action points, stamina, constitution, combat, defence) | live | `reference/play-wizard-house.png` |
| Select mode menu: END MOVE, CENTRE, BIG MAP, RIDE, RIDER, CAST-A, CAST-G, DROP, CHANGE, PICK UP, EAT, DRINK, FILL, USE, THROW-A/G, FIRE-A/G, READ, FLY, LAND, CANCEL; an option shows only when the creature can do it | open | some seen (`reference/select-menu.png`) |
| Movement by moving the cursor next to the creature and pressing fire; fire repeats the step | open | |
| Engagement: next to an enemy a creature cannot move until it kills it; attack by moving into it | open | |
| Return attacks when the defender has action points and stamina left | open | |
| Combat: attacker's combat against defender's defence with a random factor | open | |
| Fatal wound: a single blow of more than 25 % of constitution; constitution then falls each turn until healed | open | |
| Undead are harmed only by undead, magic weapons or spells | open | |
| Attacking terrain: bumping impassable terrain may destroy it, by its toughness | open | |
| Action points spent by almost every action, restored each turn; exhausted creatures get half | open | |
| Stamina recovered each turn; constitution below 50 % lowers action points, combat and defence | open | |
| Line of sight: 9 spaces on the ground, 11 in the air; roofs, walls, tall grass and trees block | open | |
| Flying: FLY and LAND, a fixed action point cost per step, over impassable terrain; not under a roof | open | |
| Riding: unicorn, pegasus, gryphon and elephant carry wizards, pixies, dwarves, goblins and trolls; RIDE and RIDER | open | |
| Objects: only creatures with hands carry them; the last picked up is in use; CHANGE picks another; weight limits | open | |
| Doors and chests: USE opens, closes and unlocks them; keys are used up | open | |
| Weapons add combat and defence; thrown and ranged combat values (weapons table) | open | |
| Enchant doubles a weapon's values and lets it harm the undead, for a time | open | |
| 45 spells, 25 of them summon spells; each cast lowers the spell's level by one; mana cost rises with level | open | spell list seen (`reference/spell-list.png`) |
| Summon spells: as many creatures as the spell's level, in empty spaces around the wizard | open | |
| Mana recovers 4 % of the starting mana each turn; magic mushrooms and apples restore mana | open | |
| Potions: an empty cauldron, the ingredient and the wizard on one space, then the potion spell; level + 3 gulps; seven potions (strength, protection, invisibility, speed, flying, super, healing) | open | |
| Only one potion in effect; its length depends on level and the creature's potion consumption | open | |
| Dragons need a dragon potion (cauldron and dragon herb); flame breath can start fires | open | |
| Magic fire: no line of sight needed, spreads or dies each turn, damages enemies only; each cast weakens all the caster's fire | open | |
| Gooey blob: spreads over other terrain, harms undead | open | |
| Tangle vine and flood: an area by level; flood puts out fire; drowning risk | open | |
| Subversion, curse, magic attack: success by level against magic resistance; magic attack also hits creatures of the same type nearby | open | |
| Magic bolt and magic lightning: physical attacks against defence; lightning hits the eight spaces around and can destroy terrain | open | |
| Teleport: inaccurate at range, leaves the wizard with no action points, fails into solid terrain | open | |
| Magic eye: see from a space; reveals invisible creatures for the turn | open | |
| Magic shield: boosts the wizard's defence for turns by level | open | |
| Victory points: killing creatures (doubled when the wizard kills directly), treasure carried through the portal, escaping; 0 for a wizard who dies or fails to escape | open | |
| The portal: appears on a turn in a range per scenario and stays a number of turns (1: 12-15 and 12; 2: 20-24 and 15; 3: 44-51 and 10) | open | |
| Role-playing game: escaping makes a wizard one level higher; victory points become experience points, four to one | open | |
| Wizard designer: NAME (letters and spaces), CHARACTER (raise attributes with experience points, each at a cost, never below the start), SPELLS (levels up to 8), EXIT | open | |
| The creature table: 25 creatures with action points on the ground and flying, constitution, stamina, combat, defence, magic resistance, potion consumption, carry limit, victory points and flags | open | |
| The weapons table: sword, knife, shield, bow, spear, club, axe, ninja star, Slayer, magic Slayer | open | |
| Scenario 1, The Many Coloured Land: Torquemada, treasure gold 16, ruby 12, emerald 8 | open | |
| Scenario 2, Slayer's Dungeon: the Slayer, worth 30 | open | |
| Scenario 3, Ragaril's Domain: one player, puzzles, traps and helpful scrolls; diamond 30 | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
