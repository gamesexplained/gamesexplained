# Short Circuit — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this understanding developed lives in `agent-history.md`. Every fact names the routine or table it comes from. Unless marked *live*, a fact comes from reading the code in the snapshot named in `orientation.md`. Nothing here has been checked by a second model (`game.json`, `accuracy`).

## Build

A G64 of a cracked original on a 1541 disk: a boot program at `$0316`, a second stage `F` at `$4000` and the game `SHORT` at `$0400` of 64,508 bytes, loaded whole by a fast loader (`orientation.md`). Both parts of the game, all graphics and the music are in that one load.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: pointers, the stick direction (`$20`), the scroll direction (`$21`), the scroll value (`$22`), the voices' script pointers (`$E0`-`$E5`) | `$0000`-`$00FF` |
| Game variables, the eight sprite slots (`$024B`-`$028B`), the message queue (`$02C4`), the inventory (`$02DF`), the score (`$02E7`) | `$0200`-`$03FF` |
| Part one's code, main loop at `$0455`; the action and mode handlers; the message printer | `$0400`-`$25EB` |
| Part two's code, entry at `$2624`; its interrupt handlers and the actors | `$2624`-`$3CB2` |
| Raster colour-bar handlers for the attract mode | `$3CDF`-`$3DDF` |
| An older copy of part two's ending that is not run | `$3DE0`-`$3FFF` |
| Part one's map: three rows of 256 tile numbers | `$4000`, `$4100`, `$4200` |
| Part two's start screen, its character colours, and the table of mode handlers | `$4300`, `$43A0`, `$43E8` |
| Part two's map: two rows of 256 tile numbers | `$4400`, `$4500` |
| Part two's 160 tiles (16 characters each) | `$4600`-`$4FFF` |
| Part one's 189 tiles | `$5000`-`$5BCF` |
| Row pointer tables, raster handler table, key masks | `$5BD0`-`$5BFF` |
| The title picture: screen colours, multicolour bitmap | `$5C00`-`$5FE7`, `$6000`-`$7F3F` |
| High-score table | `$83E8`-`$8423` |
| Character colours of part one | `$8448`-`$8547` |
| Title picture colour data | `$8548`-`$8935` |
| Part two's event code and tables | `$8930`-`$9007` |
| Panel and picture characters, part two's character colours | `$9100`-`$9547` |
| The start-up and the attract mode | `$9548`-`$9B4E` |
| The music driver's work area, then its code | `$9B4F`-`$ACA0` |
| The tune table and the voices' scripts | `$ACA0`-`$BFFE` |
| Video bank 3: screens at `$C000`, character sets at `$D000` and `$D800`, sprite shapes, character data | `$C000`-`$FFFB` |

## Timing

- The raster interrupt runs three bands a frame in each part. Part one: line `$F3` (`$07A0`), line 0 (`$085E`) and line `$A3` (`$0767`). Part two: line `$A3` (`$2804`), line `$F3` (`$282E`) and line `$61` (`$27CE`).
- The main loops wait for the frame flag at `$02BE` (part one, `$04E8`) or the frame counter at `$0306` (part two, `$26F5`): one pass of the game is one video frame.
- The scroll moves two pixels a step in part one (`$087B`). Part two scrolls in the CIA2 timer-A NMI, `$2956`, with the timer set to `$0DD0` cycles (`$26A4`, `$26A9`).
- The time limit of part one is thirty minutes of the CIA1 time-of-day clock, started at 3:00 (`$0701`, `$24D9`); part two starts the clock at 6:00 (`$2681`). The clock is counted by the CIA, so its pace is real time, not frames.

## Controls

- Joystick in control port 2: `$DC00` read by `read_joystick` (`$2B71`) and decoded through `$1A1B` (`facts` below). Fire is read from the same byte in part one's `$0586`.
- Space bar (key 60 of the matrix) steps the action (`$067D`); F7 pauses (`$21CF`); F5 abandons a game (`$9B3A`). On the attract screen F1 starts part one, F3 part two and fire plays the intro first (`$9561`).
- The census (`$D01E`, `$D01F`): the game never reads the sprite collision registers; it compares sprite positions in software (`$1BD5`, `$2DD4` and the other actors).

## Graphics

- VIC-II bank 3 (`$C000`-`$FFFF`): CIA2 port A is `$94` in play. Screen memory at `$C000` (the playfield rows at `$C050`, the panel at `$C258`, the message window at `$C360`), sprite pointers at `$C3F8`. Part one's playfield uses the character set at `$D800` (the VIC reads RAM under the colour memory), the panel band `$D000` while a picture is drawn.
- Part one's world is built from tiles of 4 by 4 characters: the tile numbers of three rows ($4000, $4100, $4200) of 256 columns give a 12-character-high, 1,024-character-wide strip (`$0A92`, `$0AB7`, `$0B3B`).
- Colour of each character from a table indexed by character code (`$8448`), written to colour RAM beside each character (`$0B00`).
- Johnny and the enemy robot are two-sprite pairs (sprites 0 and 1, sprites 2 and 3); guards and part two's creatures use sprites 4 to 7 and the eight-slot table at `$024B`.

## Mechanics

- **Modes.** `$0200` holds the mode, and `$04E8` dispatches on it through `$43E8` (twelve handlers). Mode 0 is walking, 1 and 2 search, 3 and 4 take, 5 the utilise menu, 6 and 7 hide, 8 and 9 describe, 10 and 11 input.
- **Objects.** 21 objects in `$1568`, four bytes each: map column, layer, object number, description. Their names are messages 53 to 73 and their descriptions 75 onwards (`$0DF5`, `$0DFB`). SEARCH lists the objects whose column equals the player's map column (`$0D62`); at most four can be held (`$0CB4`).
- **Containers and terminals.** Eight locked containers at `$15BC`, their open and key flags in `$020B` and `$020C`; ten terminals at `$15CC` with an INPUT handler each (`$1CB5`-`$1DC3`).
- **Terminals' puzzle.** Logging on needs the PASSWORD object (15), linking the COMPUTER PROTOCOLS (12), overriding the alarm the SECURITY DOCUMENT (9), switching the sprinklers the FIRE SYSTEM MANUAL (11) (`$1DC3`).
- **Score** is six decimal digits at `$02E7`-`$02E9`, added to through `$02EA`-`$02EC` by `$15FB`. Part one awards points for opening a container, passing columns and finishing; part two awards points for each column of the scroll (`$8936`).
- **Energy.** Two bars of six cells, `$029A` and `$029B`; each hit drains steps from one or the other (`$32C7`); when either reaches zero `$0206` is set and the game ends (`$26BC`, `$0455`).
- **Part two's events.** `$896E` gives, for each of 256 scroll columns, an event number 0 to 15; `$8936` starts the creature through `$8A6E`. Fifteen event routines allocate a sprite slot (`$3663`).

## Data tables

| Table | Address | Notes |
|---|---|---|
| Messages | `$0EBF` | 89 messages ended by `$21` |
| Objects | `$1568` | 21 records of 4 bytes |
| Part one map | `$4000`/`$4100`/`$4200` | 3 rows of 256 |
| Part two map | `$4400`/`$4500` | 2 rows of 256 |
| Mode handlers | `$43E8` | 12 words, address minus one |
| Event numbers | `$896E` | 256 bytes |
| Terrain types | `$8AFF` | indexed by character code |
| High scores | `$83E8` | 10 entries of 6 bytes: score (3), initials (3) |
| Tunes | `$ACA0` | 5 records of 7 bytes |

## Text

Messages are plain text in screen-code-like letters: `A` to `Z` are 1 to 26, digits and space are ASCII, `$32` ('2') is a line break, `$33` ('3') a pause marker and `$21` ('!') ends a message. The printer (`$0E48`) adds `$20` to each character to reach the panel font. Every message is listed in `$0EBF`/`$12A1`; the system messages are numbered from 11, the object names from 53, the descriptions from 75. The screens' text (the credits, the high-score heading) is drawn from separate tables.

## Sound

Martin Galway's three-voice script driver. Each tune is a record of three script addresses (`$ACA0`); per voice the interpreter (`$A48B`, `$A5E2`, `$A73B`) reads notes (a byte below `$C0`, then a duration) and commands (`$C0` and above, through the tables at `$9C00`, `$9C34` and `$9C6C`); the per-tick effects (`$A898`, `$A9D6`, `$AB48`) sweep pulse width and pitch and the filter. The music is called from the raster interrupt, once or four times a frame by the speed flag `$031B`. Five tunes: attract, intro, ending, part one, part two (`$ACA0`).

## The listing's error rate

Two samples, both read by the model that wrote the comments, so neither is independent: of 60 comments drawn from all 1,110, 12 were wrong (10 of them mechanical, variable comments that named a wrong routine as writer or reader); of 28 comments of code routines, 5 were wrong in a detail. All were corrected. This run was made on a model that `kit/models.json` does not list as proven, so the listing awaits a maintainer's sample (`kit/CHECKING.md`); expect about one routine comment in five to be wrong in a detail.

## Live tests

- F3 on the attract screen started part two (the clock read 6:00 and the countryside was drawn), 1 November 2026.
- F7 held the clock: tenths and seconds read the same twice, three seconds apart (1 November 2026).
- F5 returned the machine to the attract-mode code at `$0594`.
- The joystick in port 2 moved Johnny in both parts (the walk and the menu both answered it).
