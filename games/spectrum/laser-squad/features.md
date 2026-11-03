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
| One or two players; against the computer the second side is the computer's | confirmed | `chooseGame` (`$A211`) sets `$B706`; the computer's half-turn is the scenario's hook at `$B621` (`computerSide`, `$5E40`) |
| Difficulty level chosen per scenario ("WHICH LEVEL ? (PRESS 1 TO 4)"); levels vary between scenarios | live | the count at `$B684`: 4 in The Assassins, 7 in the others |
| Credits per side, depending on the level | confirmed | the first side's by level at `$B6FA`, two players' at `$B6F8` and `$B6F9` (`chooseGame`, `$A211`) |
| Armour types 0-4, each with front, left, right and rear ratings, weight, carry limit and cost | live | armour screen; 7 bytes a type at `$B6C1` (`chooseArmour`, `$9F5E`) |
| Equipment: objects bought per unit, limited by credits, weight and size | live | weapons screen; `buy` (`$A0EE`) refuses on weight (message `$5C`) or room (`$5D`) |
| Weapons loaded when bought; extra ammunition sold | confirmed | `buy` (`$A0EE`) loads a weapon with its kind's rounds (`$10`) or its clip's |
| Deployment on the side's coloured squares, one unit at a time, with a flashing cursor | live | `placeUnits`; the squares at `$B65E` (`clearDeploy`, `$A474`) |
| Options between turns: change controls, save, load, verify | live | `turnMenu` (`$B1F7`) |
| Turn summary: player, turn, turns left, victory points of both sides | live | |
| Turn limit (19 turns left on turn 1 of scenario 1, level 1) | live | the last turn at `$B701` (`checkEnd`, `$A4A4`) |
| Win at 100 victory points; points for eliminating units and destroying installations | confirmed | `checkEnd` (`$A4A4`); a death scores the unit's `$27` (`unitDies`, `$8229`), damage to terrain its `$05` where `$B704` or `$B705` says (`scoreDamage`, `$9201`) |
| Action points per unit per turn, less armour weight, burden and wounds; half when the unit is feeble | confirmed | `halfTurn` (`$5EA6`), `updateLoad` (`$7E92`): half under stamina `$20` |
| Cursor mode: map window, MAP / OBJECT / UNIT / OBJECT IN USE readout under the cursor | live | `squareReadout` |
| Cursor menu: SELECT, INFO, NEXT UNIT, SCANNER, END TURN, CANCEL | live (NEXT UNIT, SCANNER, END TURN, CANCEL seen) | |
| Select mode: turn 45° (1 AP), forward (4 AP + terrain; +2 diagonal), back (6 AP) | differs | a turn costs 1 (`turnRight`, `$6DAF`); a step costs the terrain's byte for the unit's kind (4 on open ground) plus 2 on a diagonal (`stepTarget`, `$6E74`), and a step back doubles the lot, 8 on open ground rather than 6 (`stepCost`, `$6EBF`; `walkBack`, `$6E60`) |
| Moving into impassable terrain attacks it | confirmed | `attackTerrain` (`$7F0B`), `breakTerrain` (`$8030`) |
| Units may cross friendly units but not stop on one; END MOVE puts the unit back on its last empty square | confirmed | `shared` (`$9A16`), `undoMove` (`$7042`) |
| Close combat by moving into an enemy; accuracy from weapon, agility and the side attacked; damage from weapon, strength, 50-150 % random, armour, terrain | confirmed (the damage); the accuracy open | `closeCombat` (`$80CD`), `attackStats` (`$7FC1`), `attackRoll` (`$8095`): a random number up to the strength plus half the strength, 50 to 150 %; armour by side (`armourHit`, `$81A2`) |
| Hidden movement and line of sight: 90° field of view, walls and doors block it | confirmed | `inView` (`$7326`), `seenFrom` (`$7298`), `lineClear` (`$7209`); the other side's units taken off the map (`hideSide`, `$71A8`) |
| Select menu: END MOVE, FIRE, CHANGE (25 %), PICKUP (25 % or 50 %), DROP (10 %, hiding where the terrain allows), LOAD (50 %), PRIME (20 %, timer in half-turns), OPEN and CLOSE (20 %), UNLOCK and LOCK (25 %, needs the key), SCANNER, CANCEL | confirmed | prices in `openDoor` (`$79F7`), `lockDoor` (`$7A19`), `$7A37`, `$7CAC`, `$7C0A`, `$9C42`, `$9D01`, each a share by `divRound` (`$6B19`) |
| Fire mode: line-of-fire map, units as blobs, cross-hair cursor; AUTO (two points, at least three shots), SNAP, AIM, THROW (range strength / weight, accuracy agility, 20 %), INFO, END FIRE, CANCEL | confirmed | the second table of squares at `$E79F`; `aimStart` (`$8C7D`); `autoFire` (`$9232`), `burst` (`$9360`) |
| Ranged accuracy: weapon's by shot type plus skill bonus (half for auto, double for aimed) | traced | `shotHit` (`$9043`): a hit is a number from 0 to 99 below the chance (`$5DCD`), a miss scattered (`scatter`, `$8BD0`); how the chance is made was not compared with the manual |
| Ranged damage: weapon's, 50-150 % random, less armour of the side hit and terrain protection | traced | `shotPath` (`$90E4`), `armourHit` (`$81A2`), which takes the floor's `$06` and the armour of the side hit off the damage |
| Explosions: grenades, explosives, rockets, gas canisters; blast radius damages terrain and units | confirmed | `explode` (`$9696`), `blastRay` (`$980E`), `cellDamage` (`$98AF`), `fuses` (`$9C8B`); terrain with `$08` = 7 catches fire (`spreadFires`) |
| Terrain and furniture can be shot and destroyed | confirmed | `breakTerrain` (`$8030`): the blow at least the terrain's `$03`, it becomes its `$04` |
| Opportunity fire: a unit with half its AP allowance left fires in the enemy's turn when an enemy comes into view | confirmed | `startReaction` (`$755D`): facing the mover, more points left than half its `$05` less one, once a turn |
| Unit characteristics: morale value, movement type, AP allowance, constitution, wounds, wound rate, stamina, morale, weapon skill, strength, agility, unarmed combat, burden, armour by side, victory points | confirmed | the 40-byte records at `$D39F` (`unitPtr`, `$67C2`) |
| Morale: falls when friends die or the unit is wounded, rises when enemies die; panicked units may drop objects; droids' morale never falls | differs | a death moves both sides' morale by the dead unit's `$01` (`moraleShock`, `$829E`); a wound never lowers it, the routine being cut off by a wrong test (`takeDamage`, `$81FB`, bug in facts.md); panic and droids not traced |
| Stamina falls when more than half the APs go on movement; rest restores it | confirmed | `halfTurn` (`$5EF6`, `$5F29`) |
| Scanner: a strategic map of the whole area, own units and spotted enemies | live | |
| Info on any unit | live | |
| Computer opponent; its movement hidden from the player | confirmed | each scenario's copy from `$B732`; `aiTurn`, `findRoute`, `chooseTarget` |
| Scenario 1, The Assassins: kill Sterner Regnix; droids win by killing all assassins | traced | `checkEnd` (`$A4A4`) with the side's points for a wipe-out at `$B65C`; Sterner Regnix's `$27` |
| Scenario 2, Moonbase Assault: databanks 5 VP, analysers 2 VP; Omni wins by killing all the squad | traced | terrain points by `scoreDamage` (`$9201`, `$B704` set); doors that open and shut (`doorOpen`, `$C208`; `doorsShut`, `$C249`) |
| Scenario 3, Rescue from the Mines: free three prisoners (explosive needed) and move them into a lift; Metallix wins by killing five rebels | confirmed | `wayOut` (`$FF88`): a prisoner (units `$91` to `$93`, the only ones whose `$27` is `$18`) stepping onto an ELEVATOR DOOR (`$1A`-`$1D`) leaves the map, 34 points to the first side; `rescueEnd` (`$CC09`), `rescueScore` (`$CC3C`) |
| Scenario 4 (menu 5), The Cyber Hordes: droids must destroy five of seven stabiliser cores; against the computer the rebels need 100 VP, the computer gets reinforcements | confirmed | `terminalAttack` (`$CA41`); `cyberReinforce` (`$FF67`): twelve units sent again three turns after they die |
| Scenario 5 (menu 6), Paradise Valley: the security device carried to the right of the map; aliens placed at random; hidden tunnels | confirmed | `paradiseStep` (`$CB24`): object `$85` carried onto column 79 wins; the lifts between the map's two halves; `paradiseReinforce` (`$FEDF`) |
| Saved games to tape and loaded back | confirmed | `tape` (`$B15C`), flag `$67`; the Play tab saves and loads |

## Beyond the documentation

Found in the code, not in the manual. Each is in `facts.md`.

- The computer's skill is only how long it keeps after a unit it has
  seen (`$5DF8`, `$B63A`).
- Rescue from the Mines' video cameras: a unit holding the video key on
  the vidi-screen gets the VIDEO option, which puts every unit on the map
  and lets the computer know where that unit is (`$CBBB`, `$CBD7`).
- Paradise Valley's Water Dwellers charge from a point above the map
  (`$BE60`).
- When the computer finds no route between two waypoints its unit walks
  the route an earlier search left (`findRoute`, `$B78C`); Officer
  Neilson's round in Moonbase Assault has none either way.
- Damage to terrain moves morale by the side of the last kill (`$9201`).
- Armour is fitted whether or not it is paid for (`$9F5E`).
- Six droids in The Assassins never play; three scenario blocks end with
  part of the ROM's character set.

## Open questions

- The Spectrum Games Database's notes say Paradise Valley's Venemous
  Splurges sit in a corner and do not move unless a unit comes near. Three
  of them arrive in the top right-hand corner and an enemy below row 33 is
  worth nothing to them (`facts.md`, `TODO.md`); whether that is all of it
  is open. The same notes' Cyber Hordes reinforcements, away from the
  squares for placing, are the droids' patch down columns 11 and 12.
