# Big Trouble In Little China — verified technical facts

Current truth for this game, from reading the code in `work/play-level1.vsf`
(the listing's snapshot), unless marked *live*. Every routine and table
from `$0000` to `$FFFF` that the game uses is in the listing.

## Build

A Trilogic V2.9 crack: one packed program on a D64 that restores a frozen machine and runs from the title loop at `$11FE` (`orientation.md`). The game's own cold start, `$1024`, never runs in this copy: the freezer saved the machine after it.

## Memory layout

| Thing | Where |
|---|---|
| Stack (set to `$3F` by `$1024` and `$10B7`) | `$0100`-`$013F` |
| Jump table into the display code | `$0140`-`$0163` |
| Multiplexer tables, street part colours | `$0164`-`$01F0` |
| Display code: street drawing, sprite multiplexer, figure builder, frame update | `$01F1`-`$0A80` |
| Bitmap shapes of the hazard, shots and bonuses | `$0A84`-`$0D97` |
| Sprite object positions, scroll position | `$0DA1`-`$0DB2` |
| Figure tables: frame lists, body boxes, move lists, striking points | `$0DB6`-`$1023` |
| Game code | `$1024`-`$2B62`, with its tables between the routines |
| Street map, 1800 columns | `$2B66`-`$326D` |
| Street tiles, 29 of 256 bytes | `$326E`-`$4F6D` |
| Frame records, 84 of 12 bytes | `$506E`-`$545D` |
| Sprite parts, 21 bytes each | `$545E`-`$7FFF`, `$8C00`-`$9FFF`, `$CC00`-`$DFFF` |
| Buffer 1: sprite pages, screen, bitmap | `$8000`-`$87FF`, `$8800`-`$8BFF`, `$A000`-`$BF3F` |
| Buffer 2: sprite pages, screen, bitmap | `$C000`-`$C7FF`, `$C800`-`$CBFF`, `$E000`-`$FF3F` |
| Panel icon, score digits, GAME OVER | `$BF40`-`$BFFF`, `$FF40`-`$FF8F`, `$FF98`-`$FFDF` |

The processor port is `$35` in play (`$05F0`): I/O in, both ROMs out, so the interrupt vector is the RAM at `$FFFE`. `$09E2` sets it to `$30` while it builds the enemy's frame from the parts under the I/O area.

## Timing

The game loop (`$117F`) runs about ten times a second (*live*: the energy timer `$228E`, stepped once a loop, fell by 202 in 20 seconds and by 10 in one). Each loop redraws the whole street view into the hidden bitmap (`$0221`) and then shows it (`$0A68`).

Each video frame, the raster interrupt starts on line 0 (`$05F0`/`$060F`) and stops 13 more times (`LDY #$0D` at `$06AD`) to move pairs of sprites down the screen.

## Controls

Title: fire on joystick port 1 (`$11EB`, bit 4 of `$DC01`). Play: joystick port 2 (`$1AE4`, `$DC00` with the low five bits inverted, mapped through the table at `$1AC4`), or the keys Y, H, I, O and P for up, down, left, right and fire (`$1B0D`, *live* for I). B, C and S make Jack, Wang Chi or Egg Shen the active hero, and RETURN the next living one (`$1B3A`, `$1469`, `$2090`; *live* for B, C and S). Fire on port 1 during play pauses the game, and a second press goes on (`$11E0`, *live*).

The stick codes (`$1AC4`): 1 left, 2 up-left, 3 up, 4 up-right, 5 right, 6 down-right, 7 down, 8 down-left, and 9 to 16 the same directions with fire. Fire alone gives 0, which does nothing. Left and right walk all three heroes together (`$1451`, `$1453`); every other code starts a move of the active hero (`$1421`).

## Graphics

The display is a multicolour bitmap, double-buffered: two video banks (bank 2 at `$8000`, bank 3 at `$C000`) are flipped every loop by toggling bit 0 of `$DD00` (`$0A68`), and the interrupt vector is replaced by the handler that belongs to the bank now shown (`$0A73`, tables at `$0165`/`$0167`).

The street is drawn from tiles each loop (`$0221`): the map at `$2B66` holds one tile number for each 16-pixel column, and the 36-character-wide view takes 19 tile columns, half a tile at each edge when the scroll is odd. A tile is 16 character rows of 16 bitmap bytes (`$326E` + (n - 1) × 256). The play area's colours change at four places along the street (`$0A23`: scroll X `$4A60`, `$24E0` and `$03A0`), from the tables at `$01E9` and `$01ED`.

The three heroes and the enemy are sprites: each is two sprites wide and three tall, four objects in all, multiplexed by the raster interrupt (`$0622`, `$0763`) from tables sorted each loop (`$06BA`, `$07FB`). A frame is a 12-byte record (`$506E`-`$545D`) of three part addresses for each of the two sprite columns; `$08A4` copies the 21-byte parts into the object's 256-byte sprite page.

The street hazard, the shots and the bonuses are not sprites: `$283B` draws them into the hidden bitmap after the street, from 19 shapes (`$27EA`, `$27FD`, `$2810`).

## Mechanics

- **The street.** The walk starts at scroll `$6F70` and goes left to `$0020` (`$10CB`, `$1547`). With no enemy on screen the street scrolls with the active hero (`$1607`).
- **Enemies.** One at a time, object 3 (`$127A`). The street is cut into 12 sections of 150 tile columns from `$7080`; after an enemy has gone, the next comes after the section's delay (`$121F`: 10 steps of 14 loops at first, 2 at the end) and is one of the section's four kinds, picked at random (`$122C`). The last 90 columns bring the boss, kind 9, at once (`$12CF`). Each kind has a sprite colour and two hit counters (`$1201`): kinds 3 and 5 fall after 8 blows, kind 4 after 10, kinds 6 to 8 after 16, the boss after 20 (`$1209`, `$1FAD`).
- **Regrouping.** When an enemy appears, and again when it has gone, the controls are ignored while the active hero walks to his fighting place, screen X `$F8` (`$D8` with no enemy), and the other two line up behind him (`$1D76`).
- **Blows.** A hero's blow lands when his move is one of his blows (`$0F99`-`$1004`), on the frame the table names, and his striking point (`$1005`) falls inside the enemy's body box (`$1EF1`). Egg Shen does not fight hand to hand. The enemy's blows on the active hero work the same way (`$290A`); each time the counter that starts at the kind's value (`$1202`) passes `$FF`, the hero loses a point of energy.
- **Energy.** Each hero has 41 points (`$228F`, `$2293`, `$2297`), drawn as a bar 2 pixels to a point (`$2388`). It runs down with time, a point every 512 loops or so (`$23F6`), as well as with blows; at 0 the hero falls (`$2419`). When all three have fallen the game is over (`$1EE2` = 3).
- **Weapons and strength.** Each hero has a weapon box and a strength box beside his portrait. Jack's gun and Wang Chi's sword can be used only with the weapon bonus, 20 uses (`$201E`, `$2598`); Egg Shen can always throw his magic, and with the bonus it fells an enemy at once, without it it counts as one blow (`$29D2`). Strength, 20 blows, makes each blow count twice (`$1FB9`).
- **Bonuses.** Score thresholds bring a bonus to the view's left edge (`$26F8`): strength every 3000 points, a weapon every 1000 for a hero who lacks his, energy every 1500 for a hero below 25 points (`$25F7`, `$2716`). The active hero takes one by touching it (`$21BA`).
- **The street hazard.** At 16 places along the street (`$20B2`) a hazard appears when the active hero comes within 16 pixels; it hurts him, two points, in two of its eight frames (`$20D2`, `$2145`).
- **Points.** An enemy beaten scores by its kind (`$260F`): kind 3 100, kind 4 400, kind 5 200, kinds 6 to 8 2000, the boss 10000. An enemy that walks off the right of the screen takes its points away instead, but never below 0 (`$1C0A`, `$2633`).
- **The end.** Near the end of the street (scroll below `$0300`), once the boss has taken 10 blows (`$1EED`), the prize appears (`$26C6`); taking it sets `$1EE2` to 4 (`$21DB`), and `$11C6` then draws the same GAME OVER as a loss, plays the jingle and starts a new game (*live*, with the boss's blows and the hero's place set by hand).

## Data tables

| Table | Where | Rows |
|---|---|---|
| Enemy kinds: colour, blow counter start, hit counter start | `$120A`-`$121E` | 7 (kinds 3 to 9) |
| Spawn delays by section | `$121F`-`$122A` | 12 |
| Spawn lists by section, four kinds each | `$122C`-`$125F` | 13 (the last unused) |
| Stick codes | `$1AC4`-`$1AE3` | 32 |
| Hazard places | `$20B2`-`$20D1` | 16 |
| Bonus thresholds and points | `$2603`-`$2632` | 12 |
| Sound effects | `$2AFE`-`$2B35` | 8 |

## Sound

There is no music. `$2AA6` plays one of eight sound effects (`$2B06`-`$2B35`) on all three voices at once, slightly detuned, each loop that asks for one (`$2A8C`, priority from `$2AFE`). The jingle at the start and at the win is sound 3 struck 29 times with pauses (`$2B44`).

## Register census

From `census.py` on the play snapshot. Registers not listed are not written by the game.

| Register | What the game does | Routine |
|---|---|---|
| `$D000`-`$D00F` sprite X/Y | Y values set at each raster stop; X from `$0A09`/`$0A0E` | `$0622`, `$0763` |
| `$D010` sprite X high bits | set in the sprite placement | `$09FA`, `$0A03` |
| `$D012` raster | next stop's line written each time | `$0647`, `$0788` |
| `$D015` sprite enable | written once in the placement routine | `$09F5` |
| `$D019` interrupt status | acknowledged | `$0653` |
| `$D020` border | set to black at the last stop | `$065E` |
| `$D025`-`$D02E` sprite colours | set by the cold start; `$D02D` and `$D02E`, the enemy's, by kind | `$1078`, `$132A` |
| `$D400`-`$D406`, `$D418` SID voices and volume | sound effects only | `$2AC1`-`$2AD4`, `$2AA8` |
| `$DC00`, `$DC01` CIA 1 ports | fire on port 1, joystick 2, keyboard | `$11F6`, `$1AE4`, `$1B0D` |
| `$DC04` | timer A low byte read as a random number | `$05EC` |
| `$DD00` | VIC bank select, toggled every loop | `$0A68` |

## The listing's error rate

Sample `sample-2611` (seed 2611): 80 of the listing's 669 comments, drawn in two strata, 20 of the 253 comments written from a template and 60 of the 416 written one by one. One checker agent on claude-opus-5-5, which wrote none of the listing, read each against the code and the snapshot's memory. It found 18 wrong, all in a detail and none in the main claim, and all 18 in the written stratum: 22.5 % of the sample (95 % interval 14.7 % to 32.8 %, Wilson), 18.7 % when the strata are weighted by their sizes. That is over the mark. The wrong details were a second writer or a second case left out (the body-box width of shots and the bonus, the enemy's moves, type 11 for a dead hero, the regroup flag, the street-part marker, the bonus removal path), an address off by three bytes (`$0233`), the boss's step said to be in X when the `ADC` adds it to Y, GAME OVER said to be over the panel when it is in the street at character row 14, the blow test's window, the item boxes' repaint, the bonus widths called drawing sizes, a blank part outside the three stretches of figure parts, and two bitmap shapes numbered wrong (`$BFA0` is shape 9, `$BF40` shape 18). The lead read the findings against the code and every one held. All 18 were corrected, and so were the comments that repeated two of the beliefs: the six follower-script bytes the notes called a gap are the scripts' speed byte (now `follow_speed_1` to `follow_speed_6`, written by `set_follow_speed`, `$14FA`, with `$16B1` and `$1DD0`), and `highlight_portrait` (`$22FB`) repaints only the item boxes a hero lacks. A full audit is recommended.

## Live tests

- Boot and title: reached by following `orientation.md`; fire on port 1 starts play (screenshots in `reference/`).
- Port 2 moves the street: holding left with the stick on port 2 scrolled a lamppost in from the left of the screen.
- Keys B, C and S made heroes 0, 1 and 2 active (`$F9`), and I scrolled the street 40 pixels in 2 seconds.
- Fire on port 1 stopped the energy timers and the scroll; a second press started them again.
- Energy timers: `$228E` fell from 119 to 173 through 0 (202 steps) in 20 seconds with no input; no energy was lost in that time.
- Winning: with `$1EED` set to 10 and the hero placed at the prize, taking it showed GAME OVER and restarted the game.
