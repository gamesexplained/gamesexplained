# Laser Squad — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Laser Squad Players Manual (Target Games, English), PDF on Spectrum
  Computing, `https://spectrumcomputing.co.uk/zxdb/sinclair/entries/0002813/LaserSquad(EN).pdf`, read 3 November 2026
- Spectrum Computing's entry, `https://spectrumcomputing.co.uk/entry/2813/ZX-Spectrum/Laser_Squad`, read 3 November 2026 (credits, files)
- The Spectrum Games Database's inlay text, `https://sunsite2.icm.edu.pl/packages/sinclair/docs/game-database/L/LASERSQD.TXT`, read 3 November 2026 (AP costs, the weapon tables, scenarios 4 to 7)
- Philippa Irving's review in Crash 59 (December 1988), `https://crashonline.org.uk/59/lasersquad.htm`, read 3 November 2026
- Wikipedia, "Laser Squad", read 3 November 2026 (release history: the Blade release carries five scenarios)
- Pavero's maps of all seven scenarios (2007, maps.speccy.cz), from Spectrum Computing: `reference/web-maps-all-scenarios.png`, `reference/web-map-paradise-valley.jpg`

## Features

| Feature | Status | Where |
|---|---|---|
| Main program then a scenario loaded from tape, chosen from a menu of six (5 scenarios and a saved game) | live | menu `$A276`; load `$B15C`, `$B1C3` |
| Controls: Sinclair joystick, Kempston, Protek/AGF (cursor keys), keyboard Q A O P SPACE | traced | readers `$B0E8`, `$B0FD`, `$B117`, `$B136` through the table `$B0E0` |
| One or two players; against the computer the second side is the computer's | open | |
| Difficulty level chosen per scenario ("WHICH LEVEL ? (PRESS 1 TO 4)"); levels vary between scenarios | live | |
| Credits per side, depending on the level | open | |
| Armour types 0-4, each with front, left, right and rear ratings, weight, carry limit and cost | live | armour screen |
| Equipment: objects bought per unit, limited by credits, weight and size | live | weapons screen |
| Weapons loaded when bought; extra ammunition sold | open | |
| Deployment on the side's coloured squares, one unit at a time, with a flashing cursor | live | |
| Options between turns: change controls, save, load, verify | live | |
| Turn summary: player, turn, turns left, victory points of both sides | live | |
| Turn limit (19 turns left on turn 1 of scenario 1, level 1) | live | |
| Win at 100 victory points; points for eliminating units and destroying installations | open | |
| Action points per unit per turn, less armour weight, burden and wounds; half when the unit is feeble | open | `$5EA6` loop over 20 units |
| Cursor mode: map window, MAP / OBJECT / UNIT / OBJECT IN USE readout under the cursor | live | |
| Cursor menu: SELECT, INFO, NEXT UNIT, SCANNER, END TURN, CANCEL | live (NEXT UNIT, SCANNER, END TURN, CANCEL seen) | |
| Select mode: turn 45° (1 AP), forward (4 AP + terrain; +2 diagonal), back (6 AP) | open | |
| Moving into impassable terrain attacks it | open | |
| Units may cross friendly units but not stop on one; END MOVE puts the unit back on its last empty square | open | |
| Close combat by moving into an enemy; accuracy from weapon, agility and the side attacked; damage from weapon, strength, 50-150 % random, armour, terrain | open | |
| Hidden movement and line of sight: 90° field of view, walls and doors block it | open | |
| Select menu: END MOVE, FIRE, CHANGE (25 %), PICKUP (25 % or 50 %), DROP (10 %, hiding where the terrain allows), LOAD (50 %), PRIME (20 %, timer in half-turns), OPEN and CLOSE (20 %), UNLOCK and LOCK (25 %, needs the key), SCANNER, CANCEL | open | |
| Fire mode: line-of-fire map, units as blobs, cross-hair cursor; AUTO (two points, at least three shots), SNAP, AIM, THROW (range strength / weight, accuracy agility, 20 %), INFO, END FIRE, CANCEL | open | |
| Ranged accuracy: weapon's by shot type plus skill bonus (half for auto, double for aimed) | open | |
| Ranged damage: weapon's, 50-150 % random, less armour of the side hit and terrain protection | open | |
| Explosions: grenades, explosives, rockets, gas canisters; blast radius damages terrain and units | open | |
| Terrain and furniture can be shot and destroyed | open | |
| Opportunity fire: a unit with half its AP allowance left fires in the enemy's turn when an enemy comes into view | open | |
| Unit characteristics: morale value, movement type, AP allowance, constitution, wounds, wound rate, stamina, morale, weapon skill, strength, agility, unarmed combat, burden, armour by side, victory points | open | unit records indexed by `IX` |
| Morale: falls when friends die or the unit is wounded, rises when enemies die; panicked units may drop objects; droids' morale never falls | open | |
| Stamina falls when more than half the APs go on movement; rest restores it | open | |
| Scanner: a strategic map of the whole area, own units and spotted enemies | open | |
| Info on any unit | open | |
| Computer opponent; its movement hidden from the player | open | |
| Scenario 1, The Assassins: kill Sterner Regnix; droids win by killing all assassins | open | |
| Scenario 2, Moonbase Assault: databanks 5 VP, analysers 2 VP; Omni wins by killing all the squad | open | |
| Scenario 3, Rescue from the Mines: free three prisoners (explosive needed) and move them into a lift; Metallix wins by killing five rebels | open | |
| Scenario 4 (menu 5), The Cyber Hordes: droids must destroy five of seven stabiliser cores; against the computer the rebels need 100 VP, the computer gets reinforcements | open | |
| Scenario 5 (menu 6), Paradise Valley: the security device carried to the right of the map; aliens placed at random; hidden tunnels | open | |
| Saved games to tape and loaded back | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- The inlay text says scenario 4 and 5 misbehave at higher levels (the
  computer's reinforcements appearing away from the deployment squares, or
  sitting in a corner). To check against the code.
