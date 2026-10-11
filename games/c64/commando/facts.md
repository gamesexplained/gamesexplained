# Commando — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names the
routine or table it comes from. Unless marked *live*, a fact comes from
reading the code in the snapshot named in `orientation.md` (`work/entry.vsf`,
the machine stopped at the game's entry, `$0850`).

## Build

The disk is REMEMBER's crack of Elite's 1985 game, released in June 1997 as
"Commando +5HD" (CSDb release 40672), with the directory header `once upon
a time` and two files: `COMMANDO+5HI/REM`, the packed program, and
`COMMANDO HI /REM`, the saved high-score table. The crack shows
instructions, offers five trainer options and saves the high scores to
disk. Everything it added is named below ("REMEMBER's changes"); the rest
is the 1985 game, whose title screen credits Elite, Chris Butler
(programming), Rory Green and Chris Harvey (graphics), Rob Hubbard (sound)
and Japan Capsule Computers UK (`$1143`).

The 1985 release it is compared with below is Elite's PAL disk in the C64
Preservation Project's 10th Anniversary Collection
(`commando_elite_1985_pal`, a G64), stopped as it hands over to the game
at `$0850` (`work/orig1985/entry1985.vsf`).

## Memory layout

| Thing | Where |
|---|---|
| Zero page | pointers into the current area's tables (`$22-$2B`), the sprite sort order (`$4B-$5B`), music and screen pointers (`$F7-$FE`) |
| Variables | `$0400-$0512`, under the screen REMEMBER's menu used: the random state, scroll, sixteen slots of per-sprite tables, score, lives, grenades, area counter |
| Unused | `$0800-$083C`, zeros |
| REMEMBER's file name | `$083D-$084F`, `@S:COMMANDO HI /REM` |
| Start-up, main loop, death, game over, name entry | `$0850-$0F47`, with the high-score table at `$0ECE-$0F47` |
| Title, collision, area message, score display, area tables | `$0F48-$14E3` |
| Map stamps and gate pictures | `$14E4-$1710` |
| Terrain classes, four tables of 256 | `$178B-$1B8A` |
| Spawner and spawn lists | `$1B8B-$1E2F` |
| Spawn handlers | `$1E30-$24D3` |
| Enemy behaviours | `$24D4-$35D8` |
| The player's shots and grenade | `$35D9-$3A2D` |
| The player, the walk out, the ending | `$3A2E-$3D28` |
| Slot movement, life set-up, sort, playfield, random numbers, video set-up | `$3D2A-$40E7` |
| Raster interrupts and sprite multiplexer | `$40E8-$44DF` |
| REMEMBER's saver, menu, loader and instructions | `$44E0-$4FFF` |
| Rob Hubbard's music driver, tunes and effects | `$5000-$5F5F` |
| REMEMBER's key hook and menu texts | `$5F6A-$5FFF`, `$7F60-$7FAF` |
| Area maps, 200 rows of 40 characters | area 0 `$6000`, area 1 `$8000`, area 3 `$A000` |
| Character sets | area 0 `$C000`, area 1 `$C800`, text `$D000`, area 3 `$D800` |
| Screen and sprite pointers | `$E000-$E3FF` |
| Sprite blocks `$90-$FF` | `$E400-$FFFF` |

The VIC-II looks at bank 3 (`$C000-$FFFF`, CIA 2 port A, `$358F`), so the
character sets at `$D000` and `$D800` lie in the RAM under the I/O area and
the screen and sprites under the KERNAL ROM. The processor port reads `$36`
in play: BASIC out, KERNAL and I/O in. Two routines change it: `$0A57`
clears CHAREN to copy the name-entry gunsight into `$D040`, and `$0AFA`
clears HIRAM to read the screen at `$E000`.

The game is one load. All three maps, the character sets and the sprites are
in memory from the start; nothing is read from disk during play.

## Timing

The machine is a PAL C64. The raster interrupt at `$4119` counts a frame
at `$040B`, and the main loop (`$08CB`) waits for that count to change
(`$400C`), so the game runs one pass a frame and a pass that overruns the
frame waits for the next count. *Live:* 497 passes of the loop in 500
frames walking up the first area; 60 of them, one for each map row the
screen moved, skipped the game logic, because the loop does the row's
redraw instead (`$08CB`). Music and sound effects run from the interrupt
at `$416A`, every frame.

## Controls

- Joystick in port 2: eight directions and fire. Fire alone starts a game
  from the title (`$0F48`).
- Space throws a grenade (`$38A5`). The game reads the keyboard row at
  `$DC01` itself, because it stops CIA 1's timer and with it the KERNAL's
  keyboard scan (`$40E8`). In this copy the read goes through REMEMBER's
  hook at `$5F6A`.
- RESTORE does nothing: the NMI vector points at an RTI (`$0A4D`).

## Text

The game writes with its own alphabet in the text character set: space
`$20`, digits `$21-$2A`, letters A-Z `$5B-$74`, the grenade and equals signs
of the score line `$3C` and `$3F`, and the name entry's marks, rub-out and
END `$75-$78`. Its strings: the credits (`$1143`), the score line (`$40C0`),
the four lines of the message between areas (`$12B8`), their ordinals
(`$1306`), the ranks of the high-score table (`$0ECE`) and the letter grid
of the name entry (`$0D09`). REMEMBER's texts are in the standard screen
codes (`$4660`, `$46D8`, `$4800`, `$5F80-$5FFF`, `$7F60`).

## Graphics

- **Screen.** Multicolour characters, 24 rows (`$4049`): 21 rows of
  playfield copied from the area's map (`$3F75`) and the score line under
  them in the text character set. Background brown, the shared colours
  black and grey; the playfield's own colour is green, blue in area 1
  (`$40BC`).
- **Scrolling.** The map scrolls down a pixel a frame while the player
  pushes up near the top of his zone (`$3A8C`, `$0404`). Every eighth step
  the map moves a character row (`$0403`) and the whole playfield is
  redrawn from the map.
- **Areas.** The area counter's low two bits pick the map, the character
  set (`$D018` = area x 2, `$1427`), the spawn list and the terrain table.
  Each map is 200 rows; a new area starts near the bottom and the gate or
  fortress is at row 0.
- **Terrain.** Each area has a class for each of its 256 characters
  (`$178B`, `$188B`, `$1A8B`): bit 0 a wall, which stops the player, turns
  soldiers aside and stops bullets; bit 1 scenery the sprites pass behind;
  bit 2 water, a pit or a trench, which the player falls into.
- **Sprites.** Sixteen slots share the eight hardware sprites. On each pass
  of the game logic (`$08F7`) `$3F06` sorts the slots by y (a Shell sort, gaps 7, 3 and 1, over
  `$4B-$5A`), and a chain of raster interrupts places them: `$41A7` at line
  `$1E` puts the first eight on sprites 7-0, `$4266` reuses sprites 7-4 for
  sorted slots 8-11 below the fourth, and `$436B` reuses sprites 3-0 for
  slots 12-15. `$4119` at line `$D5` blanks the screen for the score line
  and `$416A` at line `$DE` shows it.
- **Map changes.** Grenades that destroy a bunker gun put a ruined bunker
  into area 1's map (`$14B5`, `$37B1`), and every life puts the three whole
  bunkers back (`$3DE0`). The gate at the top of areas 0 and 1 is drawn
  shut at each life's start and open when its row comes up (`$15BC`).

## Mechanics

**Slots.** Slot 0 is the player, 1-3 his bullets, 4 his grenade (an empty
slot 4 can carry a bullet too), and 5-15 the enemies. Their tables run from
`$040D` (x-high), `$041D` (x), `$042D` (y), `$043D` (behind scenery),
`$044D` (colour), `$045D` (sprite block), `$046D` and `$047D` (speeds) and
`$048D` (type or behaviour), sixteen bytes each; the enemies also have a
parameter (`$04A1`), a facing (`$04AC`) and a timer (`$04B7`).

**The player.** Up moves him a pixel a frame until he reaches y `$A4`,
and above that scrolls the map instead; at the top of the map (row 0)
nothing scrolls and he walks on up to y `$6E`. Down goes to y `$C1`, and
left and right two pixels a frame between x `$17` and `$141` (`$3A8C`). His facing
turns a sixteenth of a circle a frame towards the stick (`$35B0`), and
his bullets fly in the facing, so a reversal takes a few frames to come
round.

**The gun.** Each press of fire gives two bullets (`$39C3`): a counter
(`$04DF`) set to `$FF` while fire is up counts, on each pass of the game logic
(`$08F7`), once for each empty shot slot, and a bullet goes when it reaches 0 and again at 8, where it
stops: two frames after the first with all four shot slots empty, three
with three. *Live:* four presses held for 40 frames each made two bullets each.
A bullet lives 15 frames, at up to eight pixels a frame across and six up
or down (`$35D9`, `$35E9`), and stops at walls (`$3917`).

**Grenades.** A new game gives five grenades and five lives (`$0883`), and
every life tops the grenades up to five (`$3DE0`). Space throws one
straight up the screen; it flies 40 frames, then blasts for 20 frames,
killing anything a grenade can hurt within 18 pixels across and 22 up or
down (`$365C`, `$371E`). A box of grenades adds three and 1,000 points
(`$2A5A`); the count is two BCD digits and the add keeps no carry, so 98
plus a box makes 01. *Live:* poked to 98 under a box, the count read 01.
The pickup's effect requests return with X = 0 (`$5F56`), and when the
1,000 points carry into a new 10,000 the extra life's request comes before
the box's slot is freed (`$3570`): enemy slot 0 is freed instead, the enemy
loop goes on from enemy 1 (`$2495`), and a box in any later slot is picked
up again, for six grenades, 2,000 points and the life. *Live:* a box in
enemy slot 2 at 9,500 points made 11 grenades from 5, 11,500 points and a
life, and the rifle soldier in enemy slot 0 vanished; at 1,000 points the
same box paid once.

**What hurts what** (`$2526`). Bullets and grenades kill the walking
soldiers. Only a grenade kills a soldier lying in wait, in a trench or
foxhole, a bunker's gun, the lorry, the sniper or the mortar man. Only a
bullet counts against the guards. Prisoners, vehicles, jeeps and doors are
never hit. The player dies on touching an enemy whose behaviour is marked
in `$1074`: soldiers on the move, enemy bullets, bombs and the bunker
guns' shells, explosions, the leading half of a crossing vehicle, the lorry
and the jeep; not guards, soldiers in cover, the stopped motorcycle, or
grenades and mortar bombs in flight. `$100F` compares positions: the same
x-high half, the enemy's x from 3 pixels left of the player's to 4 right,
its y from 7 above to 8 below. Walking into water or a pit is the other
death (`$3C10`).

**Enemies.** Each of the eleven enemy slots runs one of 41 behaviours
(`$24D4`). They come from two places:

- the area's spawn list, an entry for a map row, started when that row
  reaches the top of the screen (`$1B8B`), by one of 28 handlers
  (`$1BE8`);
- an empty slot, which now and then starts a rifle soldier from the top
  of the screen or a grenade thrower from a side (`$2D63`).

Three kinds have handlers but no entry in the lists in use: the doors that
let soldiers out (handlers 23 and 24), the mortar man (26) and one grenade
thrower (10). The doors and the mortar man are in the unused fourth list
(`$1D42`); handler 10 is in none.

The fourth list has 25 entries, the last the end of the area (handler 27):
six doors of handler 24 and three of 23, a box (7), a motorcycle (4), a
grenade thrower (12), two walking soldiers (8, 9), two lorries (20), three
vehicles crossing (22) and one more (19), a trench soldier (3), the mortar
man (26), the gate opening (11) and a green soldier (13). Its first rows,
198 and 196, are below the start of every area (rows 175 and 166, `$3EBC`).
Drawn over each map at the rows and x its entries give, with each handler's
starting y (doors `$28`, `$1E55`; the box `$26`, `$2111`; the trench
soldier and the mortar man `$21`, `$221E`): eight of the nine doors stand
in open ground on all three maps, and the ninth (row 157, x 56) on the left
gate of area 3's first wall. On area 3's map the trench soldier and the
mortar man (row 9) stand in the fortress's two windows, a row above the
two soldiers area 3's list puts there (row 10, `$1DA7`). Its two walking
soldiers (both at row 94, with x 80 and x-high 99) have the x and x-high of
area 1's two (rows 97 and 94), and its grenade thrower is at area 1's row
104 (`$1CC1`).

A rifle soldier fires only on frames where his timer AND the fire mask
`$0504` is 0, and only when he already faces the player's direction
(`$33B2`). The fire mask is set at each life from the area counter's low
three bits (`$3EB4`): a shot every 64 frames at most in the first area, 32
in the second and 16 in the third. Each gate soldier sent out sets it back
to 64 for the rest of the life (`$2CD1`).

The direction is one of eight, from a box 30 pixels to either side of the
soldier and 20 above and below (`$33C7`; `$310A` turns him to face it, a
rifle soldier on frames where the frame counter's low five bits are 0,
`$3219`). Inside the box he neither turns nor fires. The x test adds 30
to the low byte of the soldier's x and drops the carry, so a soldier at x
226-255 (x-high clear) takes a player to his left, past the wrapped sum,
for one on his right: he faces right and fires right. *Live:* a rifle
soldier held at x `$E8` with the player held level at x `$64` faced right
(heading 4) and fired every bullet at +2 pixels a frame; at x `$C8` he
faced left (12) and fired at -2.

**The gate.** At the top of each map twenty soldiers come out of the gate
or the fortress: each free enemy slot has one chance in 128 a frame of
sending one while any remain (`$2CBB`, `$04EF`). The area is won when all
twenty have come and none was counted alive that frame (`$3A8C`, `$04F4`,
counted afresh each frame by the gate soldiers' behaviour, `$31D2`). A
soldier entering area 1 from a side is not counted on his first frame
(`$2D08`), so if the twentieth comes that way with no other gate soldier
alive, the area ends as he appears. The gate opens (`$3A2E`), the player walks
himself to x `$AF` and up through it (`$3A3B`), and at y `$5A` the area
ends with 1,400 points (`$0923`).

**Areas.** The area counter (`$04F3`) skips every value whose low two bits
are 2 (`$0939`), so the areas played are 0, 1 and 3, and area 2's
character set (`$D000`) only ever shows text: the title, the name entry
and the messages set the counter to 2 while they run (`$0F53`, `$0C9E`,
`$1270`). Area 2's entries in
the per-area tables are area 1's map (`$3EB0`) and restart rows (`$3ED0`),
area 3's spawn list (`$1485-$14A4`) and terrain table (`$14A5`), and a
copy of area 3's ordinal (`$1306`). After area 3 the ending runs
(`$3CB2`, eleven flickering red bursts across the fortress for 255
frames), the message says CONGRATULATIONS and MISSION COMPLETE (`$1222`),
and play starts again at area 0 with the counter at 4. The fire masks for
counters 4, 5 and 7 are all 16 frames, and counter 8 begins again at 64,
so the loops alternate between the first loop's rising rates and a loop
fired at full rate. *Live:* the counter went 0, 1, 3, 4 with fire masks
`$3F`, `$1F`, `$0F`, `$0F`, and the messages read BROKE THE 1ST AREA,
BROKE THE 2ND AREA and CONGRATULATIONS.

**Death and restart.** A hit shows the player struck and then lying, 79
frames; a fall shows him sinking, 65 frames (`$0953`). A life restarts at
the first checkpoint at or below the row the screen had reached
(`$3DE0`): rows 19, 61, 97 and 131 in every area, and 175 in area 0 or
166 in areas 1 and 3 (`$3EBC`). A new area parks the map at row 165, so
play itself starts at that last checkpoint. *Live:* areas began at rows
`$AF`, `$A6`, `$A6` and `$AF`. A restart brings back everything in the
spawn list within 21 rows of the top (`$109B`) and sets the gate's twenty
soldiers again.

**Score and lives.** The score is two BCD bytes counting hundreds
(`$04F8`, `$04F9`), shown as four digits and two fixed zeros (`$136F`).
Each carry out of the low byte, every 10,000 points, gives a life
(`$134F`). Points per enemy are in `$254F`: 200 for a foxhole, 300 for most
soldiers, 500 for a trench soldier, bomb thrower, sniper or mortar man,
1,000 for a guard or either half of a lorry; a bunker gun's 1,000 comes
from the grenade's own path (`$37B1`). The green soldier leaves a sprite reading 2000
but adds 1,400 (`$23E7`). The lives (`$0500`) are a binary count printed
as two hex digits (`$13F1`), so from ten the second digit is not a digit.
*Live:* 9,900 plus an area's 1,400 made 11,300 and five lives from four;
999,900 plus 1,400 made 001,300; ten lives showed as 0 and a block
graphic.

**High scores.** At game over the score is ranked into the eight-entry
table (`$09A4`). A place in it starts the name entry (`$0C88`): the player
stands at the foot of a grid of letters and shoots them with a gunsight he
steers, up to eight letters, with rub-out and END. The table is shown
until fire, and in this copy REMEMBER's saver writes it to disk and
restarts the game (`$0A4A`, `$44E0`).

## Data tables

| Table | Where |
|---|---|
| Spawn lists: trigger row, x, x-high, handler | area 0 `$1C20`, area 1 `$1CC1`, area 3 `$1DA7`; pointers `$1485-$14A4` |
| An unused fourth spawn list | `$1D42` |
| Terrain classes | `$178B`, `$188B`, `$1A8B` (areas 2 and 3 share it); an unused fourth `$198B` |
| Spawn handlers, enemy behaviours | `$1BE8`, `$24D4` |
| What hits each behaviour, its points, whether it kills by touch | `$2526`, `$254F`, `$1074` |
| Headings to speeds | `$32AF`, `$32BF` |
| Bullet speeds and muzzle offsets by facing | `$35D9`, `$35E9`, `$3517`, `$3527`, `$35F9`, `$3609` |
| Walk frames by direction | `$3C82`, `$3CA2` |
| Checkpoints | `$3EBC`, pointers `$3ED0` |
| Fire masks | `$3EB4` |
| Map stamps (bunkers whole and ruined) and gate pictures | `$14E4-$15BB`, `$1603`, `$168A` |
| High-score names and scores | `$0EEE`, `$0F36` |

## Sound

Rob Hubbard's driver sits at `$5000` behind a row of jumps (`$5000` start
tune, `$500F` request effect, `$5012` play a frame). Three tunes, listed at
`$56FF`:

| Tune | Use | Length |
|---|---|---|
| 0 | title and play, restarted at each area (`$0883`, `$08B8`) | 3,936 ticks at three frames a tick, about 3 min 56 s, then repeats |
| 1 | name entry (`$0C88`) | 768 ticks at four frames a tick, about 1 min 01 s, then repeats |
| 2 | between areas (`$0939`) | 128 ticks at three frames a tick, about 7.7 s, then stops |

Notes come from 45 patterns, each voice's track a list of pattern numbers
(`$5711`). There are thirteen instruments of eight bytes (`$5591`) with
drum, vibrato, pulse-sweep and octave-trill effects (`$519B-$5390`). The
note table holds 96 frequencies (`$5428`). Sixteen sound effects
are defined (`$55F9`) and eight are used: grenade box, grenade thrown,
bunker destroyed, player hit or fallen, the jeep, the last area won, a
letter shot and an extra life. An effect takes the SID's first two voices
while it sounds; the third voice always plays the music (`$538F`).

## I/O registers

| Register | Use | Routine |
|---|---|---|
| `$D000-$D00F`, `$D010` | sprite positions and x-high, three times a frame | `$41A7`, `$4266`, `$436B` |
| `$D011` | screen on, 24 rows, the blanking mode at the score line | `$0850`, `$4049`, `$4119`, `$416A` |
| `$D012`, `$D019`, `$D01A` | raster interrupt lines and acknowledges; `$D012` also seeds the random numbers | `$40E8`, the handlers, `$3FFF` |
| `$D015`, `$D01C`, `$D025`, `$D026` | all sprites on and multicolour, shared colours | `$4049`, `$0F48` |
| `$D016`, `$D018` | multicolour, fine scroll, character set per area | `$4049`, `$41A7`, `$4119`, `$1427` |
| `$D017`, `$D01D` | sprite expansion, for the title's logo only | `$0F48`, `$0883` |
| `$D01B` | sprites behind scenery | the handlers |
| `$D020-$D024` | border, background and shared colours | `$4049`, the handlers |
| `$D027-$D02E` | sprite colours | the handlers |
| `$D400-$D412`, `$D418` | three voices, volume | `$5000-$5F5F` |
| `$DC00` | joystick port 2 | `$3A8C`, `$39C3`, `$0F48`, `$0A2B`, the name entry (`$0C0A`, `$0D59`, `$0E60`) |
| `$DC01` | keyboard row: space, and REMEMBER's C= key | `$5F6A` |
| `$DC0E` | CIA 1 timer A stopped for play and around `$0A57` | `$40E8`, `$0A57` |
| `$DD00`, `$DD02` | VIC bank 3 | `$358F` |

Never touched: the sprite collision registers `$D01E` and `$D01F` (the game
compares positions itself), the light pen, the SID's filter (`$D415-$D417`)
and its read-back registers, and CIA 2 apart from the VIC bank.

## REMEMBER's changes

- **Added code:** the saver (`$44E0`), the menu and trainer (`$4531`), the
  table loader (`$463D`), the instructions viewer and its two pages of text
  (`$4710`, `$4800`), the key hook (`$5F6A`) and their texts.
- **Hooks into the game:** the jump after the name entry goes to the saver
  (`$0A4A`), and the space-bar read at `$38BE` calls `$5F6A`.
- **Removed:** the 1985 release's reset trap at `$085C-$0868`, replaced by
  LDA #$1B / STA `$D011` and eight NOPs, and the nine bytes it copied
  (`$0A4E`), zeroed.
- **The bug fix:** the high-score walk starts at the eighth entry (`$09A5`,
  `$0A0D` = 7) where the 1985 release starts at the seventh (6).
- **The trainer** (`$4531`) patches the game: unlimited lives turns the
  DEC at `$0996` and the INC at `$1363` into LDAs; unlimited grenades zeroes
  the box's 3 at `$2A8F` and the throw's 1 at `$3909`; no falling fills
  `$3C10-$3C5E` with NOPs; no collisions fills `$1056-$106D` with NOPs; the
  level skip turns the RTS at `$5F6D` into a CMP, so C= ends the area.
  Choosing the trainer also points the save jump back at the title, so a
  trained game saves no scores.
- **The high scores** on disk are loaded over `$0EED-$0F47` before the game
  starts; the 91 bytes of `COMMANDO HI /REM` are that range.

## The 1985 release

Both copies stopped at the hand-over to the game (`$0850`) and compared
byte for byte (`work/scripts/diff1985.py`): of the game's 19,450 bytes,
`$0850-$44DF` and `$5000-$5F69`, 29 differ. Every byte that differs from
`$0850` up, 4,298 of them, is in this table:

| Where | The 1985 release | This copy |
|---|---|---|
| `$085C-$0868` | LDX #$00 / LDA $0A4E,X / STA $8000,X / INX / CPX #$09 / BNE: the reset trap | LDA #$1B / STA $D011 and eight NOPs |
| `$09A5`, `$0A0D` | 6 | 7 |
| `$0A4B-$0A4C` | `$0883`, the title | `$44E0`, the saver |
| `$0A4E-$0A56` | `$50 $08 $50 $08 $C3 $C2 $CD $38 $30` | zeros |
| `$38BE-$38C0` | LDA $DC01 | JSR $5F6A |
| `$44E0-$4FFF` | a fill of `$FF` and `$00` that no code reads | REMEMBER's code and text |
| `$5F6A-$5FFF` | two routines nothing calls (`$5F6A-$5FB1`), then the same fill | REMEMBER's hook and text |
| `$7F41-$7FFF`, `$9F40-$9FFF`, `$BF40-$BFFF` | leftovers, after each map | zeros, and REMEMBER's text at `$7F60` |
| `$C71E-$C71F` | `$FF $FF` | `$00 $0A` |
| `$D041-$D07D` | leftovers | zeros |
| `$E000-$E3FE` | leftovers | leftovers, two of REMEMBER's menu lines among them |
| `$FFC1-$FFFF` | the fill | leftovers |

The maps, character sets and sprites are the same apart from `$C71E-$C71F`,
the last two rows of glyph `$E3` in area 0's character set, which area 0's
map never uses. The screen, the gunsight's sprite block (`$D040`) and the
blank sprite block are written before they are shown (`$3F75`, `$0A57`,
`$3E93`). The
high-score table at `$0EED-$0F47` is the same in both: REMEMBER's file on
this disk holds the 1985 release's own starting table.

**The bug fix.** `$09A4` walks the table from entry X up. With 6, a score
that does not beat entry 6 (the seventh) stops the walk at once and is
stored in entry 7 (the eighth), over its score and under its name, and the
test at `$0A0C` (CPX #$06) sees that the walk never moved and goes back to
the title without a name entry. With 7, such a score goes into the spare
ninth entry. `test_table.js` runs the game's walk with both values over
820,000 cases against the page's port (`index.html`, the commando-table
block).

**The reset trap.** `$085C` copies `$0A4E-$0A56` to `$8000-$8008`: `$0850`
as the cold and warm starts, then CBM80 with bit 7 set, so the KERNAL's
reset jumps to `$0850`. RESTORE does nothing in either copy, because `$0850`
points the NMI at an RTI (`$0A4D`). After a reset the processor port's
direction register `$00` is 0, the game's writes to `$01` change nothing,
and the gunsight copy (`$0A57`) writes its 64 bytes into the video chip's
registers: `$D011` gets `$20` (from `$0A90`) and the display goes off.
Nothing sets the display bit again: the game's other writes to `$D011`
(`$404E`, `$40F2`, `$411F`, `$4133`, `$4152`, `$4171`, `$418B`, `$41B7`,
`$424E`, `$4353` and `$4451`) each keep the bit as they read it. The reset
also leaves CIA 1's port A all inputs (`$DC02` = 0), so it reads `$EF` with
fire, and the title's test for fire alone (`$0FB2`, CMP #$6F) never
passes: the restarted game cycles its title and attract views and cannot
be started. The processor port's lines, all inputs, read high, so the
BASIC ROM stays in view over area 3's map at `$A000`, and the attract
views of area 3 are drawn from it. The copy also overwrites the first nine
bytes of area 1's map, row 0's columns 0-8.

**The original's music routines.** `$5F6A` points `$0314` at `$5F81`,
which acknowledges a raster interrupt, sets the next at line `$80`, writes
`$1B` to `$D011`, plays the music (`$5012`) and goes on to `$EA31`. `$5F96`
puts `$EA31` back, silences the SID (`$D418` = 0), restarts CIA 1's timer
and turns the raster interrupt off. No word in memory points at either,
and neither ran from the boot to the hand-over
(`work/scripts/boot1985_music.py`).

## The listing's error rate

Two random samples, each checked against the bytes by an agent that wrote
none of the comments. The first (seed 20261010) drew 60 of the 837
comments written by hand and 10 of the 24 on map data, and found 12 wrong,
17.1 % (Wilson 95 % interval 10.1-27.6 %): a frame count given for a
random chance and for a pass of the game logic, a caller list too broad,
one sprite block taken for another, `$D018`'s low nibble given as the
register, two counts off by one frame, and four map descriptions with a
row or a terrain class wrong. Those twelve were corrected, and four further agents
audited every comment in four disjoint ranges and corrected 137 of 897
(15.3 %), with the same kinds of error. The second sample (seed 20261011),
drawn after the audit from 868 comments by hand and 29 on map data, took
60 and 10 and found 1 wrong, 1.4 % (Wilson 95 % interval 0.3-7.7 %; 1.6 %
weighted by the strata's sizes): `$2495` said the enemies run every frame,
where they run on every pass of the game logic, which misses the frame on
which the map moves a whole row. That comment and fifteen others making
the same claim about routines the logic pass calls were corrected.

## Live tests

All from `work/entry.vsf`, the game's entry, in VICE with the joystick on
port 2 through the emulator's own control.

- After fire on the title: five lives, five grenades, area 0, twenty gate
  soldiers to come, fire mask `$3F`.
- Four presses of fire, each held 40 frames and released for 40: two
  bullets each (a checkpoint on the bullet's set-up at `$3A13`). Stepping
  through `$39E8` showed the counter reach 8 and stop.
- With REMEMBER's own no-collision and unlimited-lives pokes, setting the
  gate soldiers to come (`$04EF`) to 0 three times: the counter went 0, 1,
  3, 4; each area added 1,400 points; the fire masks were `$3F`, `$1F`,
  `$0F`, `$0F`; the map started at rows `$AF`, `$A6`, `$A6`, `$AF`; the
  screen showed BROKE THE 1ST AREA, BROKE THE 2ND AREA, then
  CONGRATULATIONS.
- Score 9,900 and an area won: 11,300 and a life more. Score 999,900 and an
  area won: 1,300 and a life more.
- Grenades poked to 98 and a box put under the player in slot 5: 01
  grenades, 1,000 points, the box gone.
- A box in enemy slot 2 under the player and a rifle soldier in enemy slot
  0 (`work/scripts/boxbug.py`): at 9,500 points, 11,500, grenades 5 to 11,
  a life, and both slots free; at 1,000 points, 2,000 and 8 grenades, the
  soldier still there.
- Lives poked to eleven and one lost: the count read 0 and glyph `$2B`.
- 500 frames walking up: 497 passes of the main loop, 437 of them running
  the game logic, against 498 passes of the bottom raster interrupt.
- With REMEMBER's unlimited-lives patch, lives held at five through the
  area tests' deaths (`work/scripts/live.py unlimited`).
- The attract mode, stopped as each view was set up (`$0FD8`): seven views
  of 255 frames (area 0 rows 83 and 124, area 1 rows 58 and 1, area 3
  rows 169, 110 and 54), then an eighth set up from one byte past each
  table (row `$A0`, counter `$53`) and drawn over at once by the title,
  which showed 60 frames later (`work/scripts/attract.py`).
- A rifle soldier and the player held in place every frame
  (`work/scripts/aimbug.py`): at soldier x `$E8`, player x `$64`, level,
  the soldier faced right and his bullets moved at +2; at x `$C8`, left
  and -2.
- The 1985 release, one life and a score of 2,500 at the game over
  (`work/scripts/live1985.py table orig 0025`): no name entry (`$0C88` did
  not run), and the eighth entry read DILK 002500. This copy, the same:
  the name entry ran, the eighth entry took 002500 and DILK 002000 went to
  the ninth. At 0, the 1985 release's eighth entry read DILK 000000 with no
  name entry, and this copy's table did not change. At 250,000 both ran the
  name entry and put the score first.
- At `$0869`, the 1985 release's `$8000-$8008` read `50 08 50 08 C3 C2 CD
  38 30`, and this copy's nine `$CC` (`live1985.py trap`).
- A soft reset at the title (`work/scripts/reset1985.py`): the 1985 release
  stopped at `$0850` with `$00` = 0, and 300 frames on the processor read
  the BASIC ROM at `$A000` (`94 E3 7B E3`). A hard reset, which clears the
  RAM, and either reset of this copy went to BASIC.
- After that reset, the first write to `$D011` was the gunsight copy's at
  `$0A6A`, with `$20`, and `$D011` read `$07` 300 frames on
  (`work/scripts/reset_d011.py`, `reset_regs.py`).
- After that reset, six presses of fire 100 frames apart never reached the
  game's start (`$0FEB`, `$08B8`): the attract views went on changing,
  and `$DC02` read 0. With `$DC02` = `$FF` and `$DC00` = `$7F` written
  first, the first press started a game with five lives
  (`work/scripts/reset_fire.py`, `reset_fire.py cia`).
- The attract view of area 3 at row 169, with and without that reset and
  with `$D011` = `$1B` written just after the gunsight copy (`$0A70`): the
  map drawn as usual without it, scrambled characters with it, and the
  processor reading `94 E3 7B E3` (BASIC) at `$A000` against `35 30 30 30`
  (`work/scripts/attract1985.py`; the two pictures are in `reference/`).
- Area 1 walked to its top with REMEMBER's pokes
  (`work/scripts/walk1985.py`): the screen's row 0 began `50 08 50 08 C3 C2
  CD 38 30` in the 1985 release and `CC` in this copy, and the two
  screenshots differed only in two pixel lines at the top.
- REMEMBER's unlimited-grenades patch (`$2A8F` and `$3909` = 0): four
  throws (`$3903` ran four times) and a box left the count at 5; the same
  run without the patch went 5 to 1, and the box added 3
  (`work/scripts/live.py grenades`).
