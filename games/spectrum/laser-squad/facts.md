# Laser Squad — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is six parts (`parts/`): the engine, loaded once, and five
scenarios, each loaded over the same 18,911 bytes at `$B621-$FFFF`. An
address below `$B621` is the engine's; one from `$B621` up is a
scenario's, and each scenario's copy of a routine sits at its own
address (the tables at the top of `port/src/g-ai.js` give them all). An
address given for a scenario's routine without a part is The Assassins'.

## Build

Blade Software's 48K tape of 1988 (`orientation.md`): a BASIC loader,
the loading screen, the engine `LCODE` (22,521 bytes at `$5E28-$B620`)
and five headerless blocks, one for each scenario, flagged `$64`,
`$65`, `$66`, `$68` and `$69`. The flag is `$63` plus the scenario's
number in the main menu; 4 in that menu is a saved game, `$67`
(`mainMenu`, `$B1C3`; `tape`, `$B15C`).

## Memory layout

| Thing | Where |
|---|---|
| The screen | `$4000-$5AFF`, cleared by the main menu (`clearScreen`, `$602C`) |
| The engine's variables | `$5B00-$5E25`, cleared by `start` (`$5E28`); lists and tables reused by many routines, such as the list of units in sight from `$5B97` and the table of units at `$5C50` (four bytes a unit: its side, 3 for none, its row, its column and the floor under it) |
| The stack | set to `$5E39` at every restart; it grows down over `start`'s own first bytes (`$5E28-$5E38`) once the game is going |
| The engine | `$5E28-$B620`: the turns, the screen and text, movement, sight, combat, fire, blasts, the scanner, the shop, the placing of units, the controls, the tape |
| The engine's messages | 110 at `$A64E`, its dictionary of words at `$AC06` (`printMessage`, `$6557`) |
| The font | 8 bytes a character from `$B139` + 8 x the code (`printChar`, `$6072`), its first glyph at `$B239` for the space |
| The sound effects | 13 of 10 bytes at `$B531` (`sound`, `$B5BE`) |
| A scenario | `$B621-$FFFF`: eight hooks the engine calls, its header, its own copy of the computer player, its tables, its units at `$D39F`, its map at `$D6BF`, its tables of squares at `$E65F` and `$E79F`, its tiles at `$E8DF` |

A scenario's header, the same addresses in all five: the number of its
objects (`$B639`), the computer's memory of each unit (`$B63A`, 20
bytes), the tiles of a blow (`$B64E`) and of a hit (`$B653`), the
computer's skill at each level (`$B655`), the points for wiping out a
side (`$B65C`), the squares for placing units (`$B65E`), which units play
in each mode (`$B670`), the number of levels (`$B684`), each side's price
list (`$B685`, `$B6A3`), the five types of armour (`$B6C1`), each unit's
flags (`$B6E4`), the credits (`$B6F8`, and the first side's by level at
`$B6FA`), the last turn (`$B701`), the sides' colours (`$B702`), who
scores for damage to terrain (`$B704`), whether the computer plays
(`$B706`), the two sides' views (`$B707`), the victory points (`$B70F`),
the turn (`$B711`), the side (`$B712`), and from `$B716` to `$B72B` the
pointers to the table of squares, the unit tiles, the falling bodies,
the messages, the dictionary, the terrain, the kinds of object and the
objects.

## Timing

The interrupts are off for the whole game (`start`, `$5E28`, is a `DI`,
and nothing turns them on again), so nothing runs at the frame's rate.
The game paces itself with delay loops: `delay3` (`$62DA`) waits three
turns of 255 `DJNZ`, 3,351 T-states a turn, and `delay40` and `delay200`
forty and two hundred turns. The cursor blinks by counts of reads of the
controls (`cursorStep`, `$61C3`: 255 on, 140 off), not by time.

## Controls

The four options (`chooseControls`, `$B0AD`): the Sinclair joysticks,
the Kempston, the cursor keys (5 to 8 and 0, with SPACE) and Q A O P
with SPACE. `readControls` (`$B0C8`) reads the one chosen through the
table at `$B0E0` into `$5D2A`, a bit each, clear when held: fire 0, up 1,
down 2, right 3, left 4. The menus read the keyboard through the ROM's
`KEY-SCAN` (`$028E`), called directly.

## Graphics

The view is 11 squares by 11 of the 80 by 50 map, each square a tile of
two characters by two (`drawView`, `$612A`; `drawTile`, `$60AF`), drawn
from the scenario's table of squares: two bytes for each map byte, its
colours and its tile (`drawSquare`, `$616E`). The map's bytes are terrain
below `$6E`, an object from `$6E` to `$8B` and a unit from `$8C` to `$9F`
(`mapSquare`, `$6112`). A unit's tile is set by its kind, what it holds
and its facing (`setUnitTile`, `$6D10`). Fire mode draws through a
second table of squares, at `$E79F`, in which units are blobs, and moves
its crosshair by pixels, sixteen to a square (`aimStart`, `$8C7D`).

## Mechanics

**Action points.** At the start of a side's half-turn each of its units
gets its most action points (`$05`): its own (`$1B`) less what its load
costs (`$19`); and its points (`$06`) are those less its wounds' share
and its armour's cost (`$11`) (`halfTurn`, `$5EA6`). The load's cost is
half the unit's own most points times the weight it carries over its
strength (`updateLoad`, `$7E92`). Stamina (`$0A`) gets back the points
the unit did not spend last turn, short of half its most, and loses those
it spent beyond half; under `$20` the unit has half its points, and never
fewer than a tenth of its most (`$5EF6`, `$5F29`).

**Steps.** A step costs the terrain's byte for the unit's kind (the
terrain's 12-byte record, the byte picked by the unit's `$04`; `$FF` is
impassable), plus an object's cost, plus the step's extra from the table
at `$6EA7` (diagonals cost more), doubled for a step back (`stepCost`,
`$6EBF`; `stepTarget`, `$6E74`). A unit cannot end its move on a square
another of its side stands on: with no points left there it goes back to
where it was (`shared`, `$9A16`; `undoMove`, `$7042`).

**Menus' prices.** Opening or closing a door costs a fifth of the unit's
most action points, locking or unlocking a quarter (`openDoor`, `$79F7`;
`lockDoor`, `$7A19`), changing what it holds a quarter (`$7A37`), picking
up a quarter or a half with its hands full (`$7CAC`), dropping a tenth
(`$7C0A`), priming a fifth (`$9C42`), reloading a half (`$9D01`). A share
is worked out by `divRound` (`$6B19`), which rounds to the nearest.

**Close combat.** A step into an enemy attacks it (`moveDir`, `$7ECB`;
`closeCombat`, `$80CD`). Armed, the strength is the weapon kind's `$06`
plus the unit's strength over the kind's `$07`; bare-handed it is the
unit's `$13` (`attackStats`, `$7FC1`). The blow is a random number from 0
to the strength plus half the strength (`attackRoll`, `$8095`). The floor
the defender stands on takes its `$06` off; then the armour of the side
it lands on (front, right, rear or left, by `inView`) takes its value off
the damage, and the armour loses half of the damage left, which goes on
to the defender's health whole (`armourHit`, `$81A2`). A step into
impassable terrain attacks the terrain (`attackTerrain`, `$7F0B`), which
breaks into the next terrain type while the blow lasts (`breakTerrain`,
`$8030`).

**Shots.** A shot hits when a random number from 0 to 99 is below its
chance; a miss moves the line's end by up to the distance times half the
miss plus one, scattered (`shotHit`, `$9043`; `scatter`, `$8BD0`). The
shot flies dot by dot along the line, its range sixteen times the
weapon's `$12` in pixels (`shotRange`, `$8FE2`), and hits what it stops
at (`shotPath`, `$90E4`). Auto fire picks two points and fires from 3
rounds to as many as the points pay for along the line between them
(`autoFire`, `$9232`; `burst`, `$9360`).

**Blasts.** An explosion of strength S fills a box five squares round its
centre with the strength reaching each square, along a line from the
centre to every square of the box's edge, each straight step costing two
sixteenths of S, each diagonal step three, and each terrain on the way
its `$05` (`explode`, `$9696`;
`blastRay`, `$980E`). Each square then takes its blow: the terrain
broken and the first unit there hit (`cellDamage`, `$98AF`). Primed
objects go off at the end of the half-turn their timer names, where they
lie or where their carrier stands (`fuses`, `$9C8B`).

**Sight.** A unit sees what lies in front of it, a quarter of the way
round (`inView`, `$7326`, by its facing, 0 up to 7 clockwise), along a
line clear both ways (`seenFrom`, `$7298`; `lineClear`, `$7209`, testing
each square's flags from the table at `$D2FF`).

**Reaction fire.** When a unit moves in sight of enemies, each enemy that
faces it, has more action points left than half its `$05` less one, and
has not reacted this turn may fire: the computer's through the hook at
`$B624`, a player's through fire mode (`startReaction`, `$755D`).

**Deaths and morale.** A unit left with no health dies; its square
becomes its body, what it carries drops, the other side scores its `$27`
in victory points, and each side's morale moves by the dead unit's `$01`:
the scoring side's up, the other's down (`unitDies`, `$8229`, which keeps
the scoring side in `$5DA0`; `moraleShock`, `$829E`). Damage to terrain
in the scenarios that score it shakes morale the same way, by `$5DA0`
as the last kill left it (`$9201`).

**The end.** A side with 100 victory points, or the last turn played,
ends the game; a side with no units left gives the other the scenario's
`$B65C` or `$B65D` (`checkEnd`, `$A4A4`).

**Random numbers.** `random` (`$80B1`) adds the refresh register R, the
byte at a pointer (`$5D9D`) that moves on a byte at every try and walks
through the whole of memory, and `$5D9C`, a count of the turns of the
waits for a key, and tries again until the sum is below its limit.

**The computer player.** Each scenario carries its own copy (`$B732` to
about `$C21C` in The Assassins). Its half-turn (`aiTurn`, `$B89F`) takes
each of its units in turn: an empty weapon reloaded, an enemy in sight
fired at (`aiFire`, `$BECA`) and cover taken after (`peek`, `$BDDE`),
otherwise an enemy hunted along the cheapest route between waypoints
(`chooseTarget`, `$BFD6`; `findRoute`, `$B78C`) or the unit's orders
walked (`nextPoint`, `$BA88`). A unit's orders are ten bytes at `ORDERS`:
waypoints to walk round, flags and a row of area values. The map is cut
into rectangles (`AREAS`) and strewn with waypoints (`POINTS`) joined by
links with their costs (`LINKS`). The five copies differ: a route is never
deeper than 9 waypoints in Rescue from the Mines, 15 in The Cyber Hordes
and 20 in Paradise Valley (`findRoute`); The Cyber Hordes' aliens go for
the seven terminals in `TERMINALS` and shoot them (`terminalAttack`,
`$CA41`); Paradise Valley's Water Dwellers run at an enemy in sight
(`aiCanGo`, `$BE26`) and fight it hand to hand. The skill (`$5DF8`, from
`$B655` by level) is the number a unit's byte at `$B63A` is set to when
the computer sees it in its own turn (`showSeen`, `$7422`), sees its shot
(`shotSeen`, the hook at `$B627`) or, in Rescue from the Mines, when it
turns on the video cameras (option `$0D`, `$CBD7`); the player's
half-turns count each byte down (`halfTurn`), the computer hunts a unit
only while its byte is not 0 and adds it to the unit's score as a target
(`chooseTarget`). Nothing else reads the skill.

**Bugs.** Four, each read in the code and run in the port:

- `takeDamage` (`$81FB`) never lowers morale for a wound: after `BIT
  4,(IX+$25)` an `OR A` sets the flags again from the damage, which is
  not 0 there, so the `RET NZ` at `$8212` is always taken and the 22
  bytes from `$8213` (morale less morale x damage / most health) never
  run.
- Paradise Valley's charge (`$BE60`) stores A (`$FF`) at `$A54B` where
  HL, the unit's square, was meant (`$32` for `$22`), so `distance`
  (`$A550`) measures from row 255, which its signed test reads as row
  -1, and the column left at `$A54C`: with two or more enemies in sight
  the Water Dweller runs at the one nearest that point.
- `scoreDamage` (`$9201`) puts the side that scores for terrain damage
  in `$5D4D`, which `moraleShock` does not read: the morale goes by
  `$5DA0`, the side that made the last kill, never cleared for a new
  game (0 at the engine's first instruction).
- `chooseArmour` (`$9F5E`) fits the armour before `payCredits` (`$9E27`)
  and never tests its carry: armour the credits do not cover is fitted
  free. `buy` (`$A0EE`) tests it.

**Leftovers.** Six of The Assassins' twenty units (all COMBAT DROID)
have no bit at `$B670`, so `gameMode` (`$A2BA`) takes them out of every
game. Rescue from the Mines ends with 61 bytes, Paradise Valley with 18
and The Cyber Hordes with 11 that are the 48K ROM's character set (part
of the letters N to U); only `random`'s walk reads them.

## Data tables

| Table | Where | Form |
|---|---|---|
| Units | `$D39F` | 20 of 40 bytes, `$8C` to `$9F` on the map (`unitPtr`, `$67C2`) |
| Terrain | from the pointer at `$B726` | 12 bytes a type (`terrainPtr`, `$67F7`) |
| Kinds of object | from `$B728` | 20 bytes a kind, `$6E` on (`objectPtr`, `$67DF`) |
| Objects | from `$B72A` | 6 bytes each: kind, row, column, floor, ammunition, carrier (`carriedPtr`, `$688B`) |
| Squares | `$E65F`, `$E79F` in fire mode | 160 of 2 bytes: colours and tile |
| Tiles | `$E8DF` | 32 bytes a tile |
| Messages | from `$B722`, dictionary from `$B724` | each ended by `$7C`; message k is the (k+1)-th (`scenarioText`, `$68A3`) |

## Sound

The beeper only. Each of the 13 effects is ten bytes at `$B531` + 10 x
its number: how many times, how many passes, and four tones, each a wait
of its pitch byte between clicks of the speaker (`sound`, `$B5BE`;
`playSound`, `$B5D5`). A shot's flight has a sound of its own, clicks
closer each time and a noise from the refresh register (`shotSound`,
`$8F2C`).

## The listing's error rate

A sample of 80 of the listing's 7,482 comments over its six parts, drawn
with seed 3112026 (`kit/scripts/sample.py`): 20 of the 5,551 comments
made from the game's tables (the maps' rows, the units, the waypoints
and their links, the words) and 60 of the 1,931 written by hand, marked
by a checker on claude-opus-5-5 that wrote none of them. None of the 20
was wrong. Of the 60, 9 were wrong in a detail and one wrong outright:
12.5 % (95 % interval 6.9 % to 21.5 %), 4.3 % weighted by the two
groups' sizes. The wrong one read a word of the engine's dictionary as
the letters ED, where its bytes are two colour codes round the arrow
the font draws for `$3E`. The details: the tiles of a hit are drawn for
a blow in close combat too, not only for a shot; findRoute's depth
counts the links on a route, one less than its waypoints, and
visiblePoints uses it too; the line's `$70AF` is the range of a shot or
a throw, not unused, and `$70A5` and `$70A7` the straight step along the
major way; the blow lands on any of four sides, the left (`$10`) too;
`$B718` is the cursor's limit in the view, not part of the table of
squares; `$5DA0` is the side that scored the last kill, not the side of
the unit killed; a blast's step costs two sixteenths of its strength,
or three on a diagonal, not one; sound effect 0 is played by the menus
and waitFire as well as waitKey; and the computer keeps points in hand
when its side is alerted as well as when the orders say so. All 10 were
corrected, with every other comment that made the same claims (seven
more words of the dictionary, read as letters where they hold codes)
and the same claims in this file. One more comment guessed that a
`NOP` was left where an instruction was taken out, which the bytes
cannot show; it now says only what they do. The listing has not had a
full audit.

## Live tests

- The port in `port/` was run beside the game on the tests' 48K machine
  (`port/test/lockstep.js`, `kit/spectrum/lockstep.js`), compared at every
  read of the controls: two-player games of 20,000 passes in each of the
  five scenarios, identical; one-player games against the computer of
  8,000 passes at every level in each scenario and of 25,000 passes at
  level 4 in The Cyber Hordes and Paradise Valley, identical.
- The Water Dwellers of Paradise Valley charge only when an enemy is near
  the river, which the units' own placing squares never are. With the
  first side's placing squares moved to the marsh at rows 3 to 15, columns
  70 to 75 (`port/test/charge.js`), games of 6,000 passes at levels 1 to 4
  ran identical: the computer set a charge 7 times at level 3 and 11 at
  level 4, and its units fought hand to hand 3 and 7 times.
