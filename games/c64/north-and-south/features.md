# North & South — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The manual, `Instructions.pdf` in the contributor's archive folder
  (27 scanned pages; English on pages 3 to 16), read 29 October 2026.
- C64-Wiki (German), https://www.c64-wiki.de/wiki/North_%26_South, read
  29 October 2026: credits, release, and a list of differences from the
  Amiga original.
- Wikipedia, https://en.wikipedia.org/wiki/North_%26_South_(video_game),
  read 29 October 2026: the original's release (Amiga and Atari ST,
  September 1989), the writers, Jeroen Tel for the C64's music.
- The English C64-Wiki has no page for the game (404 on 29 October 2026);
  Lemon64 and MobyGames refused the fetch (HTTP 403).

## Features

Where: the part that does it (`parts/<id>/facts.md`); an address is that
part's.

| Feature | Status | Where |
|---|---|---|
| Menu: one or two players, by clicking the flag behind each side's character; a computer appears when the computer plays that side, and both can be computers | live | menu `$114D`, `$11A6`; menu.vsf, menu-1864-cc.vsf |
| Menu: difficulty by clicking the character's head (corporal hardest, sergeant, captain easiest) | traced: the head steps the side's level 0 to 2 (menu `$1193`, resident `$0380`). What a level changes depends on where it is read: the computer's chance to act in the battle (battle `$9D14`: level 2 always), the fort's and train's length and guards when that side defends (fort `$89B7`, train `$8B50`), the strategic odds (map `$2DBB`, `$32B0`) and the computer's noise on the map (map `$3ECA`) | menu, map, battle, fort, train |
| Menu: start year 1861 to 1864 by clicking the calendar; each year has its own armies and territories | live (the calendar steps 1861 to 1864; the map shows each year's text); traced (map `$28D3`) | menu, map |
| Menu: three disasters to turn on: Indians (with the Mexican), storms, European reinforcements | traced (menu `$1204`, `$1223`, `$1242`; map `$2678`, `$178B`, `$1547`, `$227A`) | menu, map |
| Menu: arcade or strategic mode; in strategic mode a battle, a train or a fort is decided by chance weighted by the two sides' strength | traced: by chance against the levels (map `$2DBB`, `$36D7`) and, for a battle, in rounds until one side has nothing left (map `$321C`) | menu, map |
| Menu: keyboard or joystick for one player against the computer, by clicking the joystick panel; the panel goes when no person plays | live (the panel goes); traced (menu `$1280`) | menu |
| Menu: GO starts with the defaults: captain level, Stark against a computer corporal, 1861, no disasters, North first | live; traced (menu `$1878`) | menu |
| Cursor on the map moved by joystick or P L Z X; space or fire clicks | live (joystick, space); traced (map `$24A2`, `$24DD`) | map |
| H pauses; the Commodore key ends the computer's control (computer against computer) | differs: H pauses the battle, the fort and the train (battle `$8907`, fort `$8046`, train `$8046`) but not the map, where no instruction compares a key with H; the Commodore key ends a game the computer plays on both sides, and no ending loads (map `$1162`) | map, battle, fort, train |
| Turns: each player moves some or all armies to a neighbouring territory; clicking the month and year band ends the turn | traced (map `$2B26`, `$2BE8`) | map |
| Moving: the territories an army may enter flash; clicking a territory that does not flash cancels the move | live; traced (map `$280B`, `$2846`) | map |
| Conquering a territory: six cases (unowned; enemy's and empty; enemy army: battle; own; town with enemy army: battle then fort; town without army: fort) | traced (map `$2BA3`, `$2BB4`, `$2C1A`, `$2C75`, `$2DA6`, `$3011`) | map |
| Fusing armies, up to 18 infantry, 9 cavalry and 3 cannon | traced (map `$2CCF`, `$2D5B`) | map |
| Attacking with several armies at once | traced: the battle's set-up adds each of the attacker's other armies next to the battle that may still move, while the totals stay within 18, 9 and 3 (map `$2EBF`, `$2FB3`) | map |
| Retreat: E (joystick or keyboard player 1) or the quote key (joystick 2 player); the retreating army loses a cannon | differs: E for the Union, the up-arrow for the Confederacy (battle `$888C`, `$8785`); a side that falls back loses all its cannons once its infantry and cavalry have left (battle `$A891`) | battle |
| Supply: gold for each territory owned, if two of the player's towns are joined by a railway through the player's own territory; the train carries it to the bank | traced: a bag for every five territories owned or occupied, and one more (map `$35C3`, `$3B55`, `$3896`) | map |
| A new army (6 infantry, 3 cavalry, 1 cannon) for five bags of gold, placed on a flashing territory on the player's own railway | traced (map `$38D5`, `$3413`) | map |
| Taking the enemy's taxes: cutting the railway between two enemy towns; once only the enemy train tries to get through, and that is the train sequence | traced: the train is intercepted in a territory of the enemy's on its way (map `$36D7`); in arcade mode that is the train sequence (map `$0C98`) | map, train |
| Indians attack armies in neighbouring territories after smoke signals; the Mexican bombs Texas | traced: the Indians attack an army that stays two passes in territory 3 or 8, after ten smoke signals; the Mexican an army in territory 19 (map `$2678`, `$178B`) | map |
| A storm cloud travels above the map; an army under it cannot move | traced: the cloud is put on a random territory of the first 25, whose army is left off the list that may move (map `$1547`, `$2E20`) | map |
| European reinforcements: whoever owns South Virginia gets a ship with 1 cannon, 3 cavalry, 6 infantry | traced: every fourth pass, territory 18 with an army or an owner (map `$227A`, `$3413`) | map |
| Surrounding: enemy territories with no army and no town, surrounded by the player's armies, change sides | traced (map `$32CF`) | map |
| The army's soldier on the map has more or fewer cannon balls at its feet by the size of the army | differs: the map draws an army as one of two soldiers, by side (map `army_pictures`, `$8410`); `draw_army` (map `$3BE7`, called from `$3BB8`) builds the picture's address from the army's side alone ($8410 or $844C), and the army's counts are not read there. `draw_army` is called only from `$3BB8`, inside `draw_changes` (`$3B97`) | map |
| Battle: each player picks the unit to move or fire (player 1 RUN/STOP, player 2 F5); the unit's symbol shows top left (Union) or top right (Confederacy) | traced (battle `$96F7`, `$9176`) | battle |
| Battle: artillery moves only up and down; holding fire fills a gauge for the range; nine cannon balls, then it leaves the field | traced (battle `$9978`, `$8EFE`, `$A567`) | battle |
| Battle: cavalry starts facing the enemy, cannot move back; fire charges, further presses slash; reaching the far edge it goes round and back; turning against the charge changes formation | traced: pulling back forms file, or rears (battle `$98C5`, `$A0AA`); a charge off the far edge comes back from its own side (battle `$A462`, `$A495`) | battle |
| Battle: infantry move in any direction; first press takes the firing position, further presses fire; turning against the march changes formation | traced (battle `$9805`, `$A376`, `$A384`, `$9F69`) | battle |
| Battle field: a river with a bridge (the cannon can destroy bridges, says Wikipedia), houses | live (battle-play.vsf); traced: three fields at random, the open field, a canyon with a wooden bridge and a river with a stone bridge; three balls break a bridge (battle `$90A5`, `$A6A5`, `$A794`) | battle |
| Train: climb onto the passing wagons (P or up), move along the roof (Z X or left right), jump wagon to wagon (P or up); knives (limited by difficulty) or punches in hand to hand combat; reach the locomotive before the clock, shown by a boot; pushed off, climb back before the train leaves | differs in one detail: the attacker has four knives at every level (train `$8112`); the rest traced (train `$9433`, `$95AA`, `$95FE`, `$8955`, `$8D4D`, `$8BB7`) | train |
| Train, two players: the defender sends men onto the roof (up or down) and fires | traced (train `$9A8F`, `$9937`) | train |
| Fort: run through the fort to the enemy flag at its far end before the clock; ladders, guard dogs, boxes of explosives that stun | traced (fort `$8A26`, `$8945`, `$93BA`, `$92EF`, `$9968`, `$96B2`) | fort |
| Fort, two players: the defender brings soldiers in at ground level (down) or on the ramparts (up) | traced (fort `$9D02`) | fort |
| Winning: eliminating all the enemy's armies | traced (map `$0F51`, `$0CCF`) | map |
| Year texts between turns ("The Southern States have opened hostilities by taking Fort Sumter...") | live | resident `$09EC` |
| C64-Wiki: no language choice or national anthems on the C64; Indian and Mexican attacks scripted rather than random; the train takes about twice as long a trip; no bodies or cannon wrecks left on the field | traced in part: the Indians and the Mexican attack fixed territories (map `$2678`, `$178B`); a fallen soldier and a wrecked cannon are taken off the field after their pictures (battle `$9519`, `$966E`). The train's trip was not compared | map, battle |

## Beyond the documentation

Found in the code, not in the manual.

- The battle picks one of three fields at random, and the canyon is as
  likely as the river (battle `$90A5`).
- In the fort and the train a duck lets a knife pass (fort `$9A63`), and
  the computer's guards never run out of knives (fort `$9BAA`).
- Riders falling back are drawn with the other side's pictures, which face
  the other way (battle `$95A0`).
- The Confederacy's unit choice reads the Union's cannon reserve (battle
  `$9748`).
- The ending names the player's rank from the level chosen on the menu and
  counts the war in months (ending `$847B`-`$86E3`).
- The battle file holds a monitor that talks over the user port, which
  nothing calls (battle `$CE00`).
- The levels count two ways: in the arcade parts and the map computer's
  thinking a captain (2) is the strongest, in the strategic odds the
  weakest (map `$2DBB`, `$32B0`; game `facts.md`, "Mechanics").
- The computer's plan 2, for South Virginia when the reinforcements are
  on, changes no score and plays as plan 4 (map `$3D09`, `$3E11`).

## Open questions

- Whether the canyon's bottom rows, which have no hazard in the table
  (battle `$8780`-`$8784`), are a way round the canyon the picture shows.
