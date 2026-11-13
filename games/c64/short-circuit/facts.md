# Short Circuit — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this understanding developed lives in `agent-history.md`. Every fact names the routine or table it comes from. Unless marked *live*, a fact comes from reading the code in the snapshot named in `orientation.md`. Every claim here was audited by a checker on a proven model (`game.json`, `accuracy`).

## Build

The original Ocean cassette: a boot program at `$0316` in the KERNAL's format, then Ocean's turbo loader reads 275 pages of 256 bytes. The first two are the loader's own (`$0100`-`$02FF`), then come the loading tune (`$A000`-`$AFFF`) and the loading picture, which shows while the rest of memory up to `$FFFF` loads; the last 16 pages are the game's own `$A000`-`$AFFF` (`orientation.md`, `media.json`). Both parts of the game, all graphics and the music are in that one load. A cracked disk version hands the same bytes to the game from `$0334` to `$FFF9`.

## Memory layout

| Thing | Where |
|---|---|
| Zero page: pointers, the stick direction (`$20`), the scroll direction (`$21`), the scroll value (`$22`), the voices' script pointers (`$E0`-`$E5`) | `$0000`-`$00FF` |
| Game variables, the eight sprite slots (nine tables of eight bytes, `$024B`-`$0292`), the message queue (`$02C4`), the inventory (`$02DF`), the score (`$02E7`) | `$0200`-`$03FF` |
| Part one's code, main loop at `$0455`; the action and mode handlers; the message printer; then the frame wait at `$25EB` that all three modes of play use, and the start values at `$2602` | `$0400`-`$2623` |
| Part two's code, entry at `$2624`; its interrupt handlers and the actors | `$2624`-`$3CB2` |
| Raster colour-bar handlers for the attract mode | `$3CDF`-`$3DDF` |
| An older build of `$39C4`-`$3BE3` (the end of the sinking animation to the chase trigger), moved up by `$41C` and calling an older build's addresses; nothing runs it | `$3DE0`-`$3FFF` |
| Part one's map: three rows of 256 tile numbers | `$4000`, `$4100`, `$4200` |
| Part two's start screen, its character colours, and the table of mode handlers | `$4300`, `$43A0`, `$43E8` |
| Part two's map: two rows of 256 tile numbers | `$4400`, `$4500` |
| Part two's 160 tiles (16 characters each) | `$4600`-`$4FFF` |
| Part one's 189 tiles | `$5000`-`$5BCF` |
| Row pointer tables, raster handler table, key masks | `$5BD0`-`$5BFF` |
| The title picture: screen colours, multicolour bitmap | `$5C00`-`$5FE7`, `$6000`-`$7F3F` |
| A copy of message text that nothing reads | `$7F40`-`$7FFF` |
| The credits screen: screen memory of video bank 2 | `$8000`-`$83E7` |
| High-score table | `$83E8`-`$8423` |
| Character colours of part one | `$8448`-`$8547` |
| Title picture colour data | `$8548`-`$892F` |
| Part two's event code and tables (the event numbers, starters, ground lookup and terrain types; then, after the credits font, the sprite frame lists, the jump path and the walk handlers) | `$8930`-`$8BFE`, `$8F90`-`$9007` |
| The credits screen's character shapes (characters `$80`-`$F1` of the set at `$8800`) | `$8C00`-`$8F8F` |
| Panel and picture characters, part two's character colours | `$9100`-`$9547` |
| The start-up and the attract mode | `$9548`-`$9B4E` |
| The music driver's variables (leftover bytes at `$9B4F`-`$9BFF` that nothing uses, then the command tables at `$9C00`) | `$9C00`-`$9EB0` |
| The music driver's code | `$9EB1`-`$AC9F` |
| The tune table, the voices' scripts, note-parameter blocks and a little machine code the scripts call | `$ACA0`-`$BFFE` |
| Video bank 3: screens at `$C000`, the top rows' character shapes in part two at `$C400`, character sets at `$D000` and `$D800`, sprite shapes at `$E000` | `$C000`-`$FFFB` |

## Timing

- The raster interrupt runs three bands a frame in each part. Part one: line `$F3` (`$07A0`), line 0 (`$085E`) and line `$A3` (`$0767`). Part two: line `$A3` (`$2804`), line `$F3` (`$282E`) and line `$61` (`$27CE`).
- The main loops wait for the frame flag at `$02BE`, set by the panel band's handler on line `$A3` (part one, `$04E8`), or the frame counter at `$0306` (part two, `$26F5`): one pass of the game is one video frame.
- The scroll moves two pixels a step in part one (`$087B`). Part two scrolls its colour rows in the CIA2 timer-A NMI, `$2956`, with the timer set to `$0DD0` cycles (`$26A4`, `$26A9`); `$2884` starts the NMI, which shifts eight colour rows and stops the timer.
- The time limit of part one is thirty minutes of the CIA1 time-of-day clock, started at 3:00 (`$0701`, `$24D9`); part two starts the clock at 6:00 (`$2681`). The clock is counted by the CIA, so its pace is real time, not frames.

## Controls

- Joystick in control port 2: `$DC00` read by `read_joystick` (`$2B71`) and decoded through a table of 32 entries at `$1A1B` into the direction codes 1, 2, 4, 5, 6, 8, 9 and 10 in `$20`. Fire is read from the same byte in part one's `$0586`.
- Space bar (key 60 of the matrix) steps the action (`$067D`); F7 pauses (`$21CF`); F5 abandons a game (`$9B3A`). On the attract screen F1 starts part one, F3 part two and fire plays the intro first (`$9561`).
- The census (`$D01E`, `$D01F`): the game never reads the sprite collision registers; it compares sprite positions in software (`$1BD5`, `$2DD4` and the other actors).

## Graphics

- VIC-II bank 3 (`$C000`-`$FFFF`): CIA2 port A is `$94` in play. Screen memory at `$C000` (the playfield rows at `$C050`, the panel at `$C258`, the message window at `$C360`), sprite pointers at `$C3F8`. The playfield takes its character set from `$029C`, which starts at `$04` (from `$2609`), so part one's playfield is drawn from `$D000`; the panel band's handlers (`$0767`, `$2804`) always write `$06` to `$D018`, the set at `$D800`, which the VIC reads from the RAM under the colour memory.
- Part one's world is built from tiles of 4 by 4 characters: the tile numbers of three rows ($4000, $4100, $4200) of 256 columns give a 12-character-high, 1,024-character-wide strip (`$0A92`, `$0AB7`, `$0B3B`).
- Colour of each character from a table indexed by character code (`$8448`), written to colour RAM beside each character (`$0B00`).
- Johnny and the enemy robot are two-sprite pairs (sprites 0 and 1, sprites 2 and 3), an upper half over a lower half; Johnny has a pair for each of eight facings (`$1C60`) and turns through them one step at a time. The guards use sprites 4 to 7; part two's creatures take free slots of the eight-slot table at `$024B` (`$3663`).
- The credits screen is multicolour text in video bank 2 (`$9637`: `$DD00` = `$95`, `$D018` = `$02`): screen at `$8000`, characters at `$8800`. Its chrome stripes are writes to `$D023` on 24 raster lines between 93 and 145 (*live*: one frame recorded in VICE, `test_credits.js`).
- The attract mode cycles three screens, the credits, the title picture and the high scores, each for 500 frames (`$9561`).

## Mechanics

- **Modes.** `$0200` holds the mode, and `$04E8` dispatches on it through `$43E8` (twelve handlers). Mode 0 is walking, 1 and 2 search, 3 and 4 take, 5 the utilise menu, 6 and 7 hide, 8 and 9 describe, 10 and 11 input. When fire is pressed the action's handler returns into the mode dispatch, so both run in that pass.
- **Walking.** Johnny may step only where the character probed ahead and the one to its right are both `$76` (`$1B61`). Every third step up also steps right, and every third step down also steps left (`$0205`). The room is left on the left: scroll column `$FC`, sprite X `$39` or less, facing left.
- **Objects.** 21 objects in `$1568`, four bytes each: map column, layer, object number, description. Their names are messages 53 to 73 and their descriptions 75 onwards (`$0DF5`, `$0DFB`). SEARCH lists the objects whose column equals the player's map column (`$0D62`); at most four can be held (`$0CB4`). Taking an object sets its column to 0.
- **Containers and terminals.** Eight locked containers at `$15BC`, their open flags in `$020B` and their jammed flags in `$020C` (the wrong key jams a lock, `$1D57`); a locked one answers MALFUNCTION and LOCKED (messages 20 and 16, `$0C2D`). Ten places where INPUT does something, at `$15CC`, each with its handler: eight key locks (`$1CB5`, `$1CCC`, `$1CE3`, through the lock check at `$1CFA`), the PASSCARD reader at column `$55` (`$1D95`) and the computer at column `$6B` (`$1DC3`).
- **Terminals' puzzle.** `$0299` starts at `$0C`. Logging on (bit 0) needs the PASSWORD object (15), linking (bit 1) the COMPUTER PROTOCOLS (12); once linked, the SECURITY DOCUMENT (9) toggles bit 2, which is set while the general alarm is armed, and the FIRE SYSTEM MANUAL (11) toggles bit 3, which is set while the sprinklers are on; each change clears bits 0 and 1 again, so the next needs a new log-on and link (`$1DC3`, `$1E88`).
- **The cigarette in the bin.** When the LIGHTED CIGARETTE (object 16) is put down at map column `$F8`, `$1FD8` queues BIN IS ON FIRE and ALARM HAS GONE OFF and sets `$0212`. With the sprinklers on it adds SPRINKLER SYSTEM ACTIVATED and FAULT IN CIRCUITRY; otherwise it zeroes the count of `check_countdown`, which runs whenever `$0212` is set and counts changes of the clock's minutes: at the fourth, three to four minutes later, it sets the guard state `$0219` to 2, sending a guard. `$0212` also lets the main loop run the end-of-part check for the decoy's parts (`$2219`).
- **Score** is six decimal digits at `$02E7`-`$02E9`, added to through `$02EA`-`$02EC` by `$15FB`. Part one awards points for opening a container, passing columns and finishing; part two awards 1,000 points every sixteenth column (`$8936`). Winning part two stores 5 into the top byte of the score (`$39F5`), which makes it 50,000 plus its last four digits.
- **Energy.** Two bars of six cells, `$029A` and `$029B`; each hit drains steps from one or the other (`$32C7`), and the drain takes as many steps as it is given. When either reaches zero `$0206` is set and the game ends (`$26BC`, `$0455`).
- **Part two's events.** `$896E` gives, for each of 256 scroll columns, an event number 0 to 15; `$8936` starts the creature through `$8A6E`, sixteen address-minus-one words of which numbers 0 and 10 are zero; no column holds 10. The fourteen starters allocate a sprite slot (`$3663`). Part two's actors measure X through `$37D4`, which halves it, so their distances are in units of two pixels.

## Data tables

| Table | Address | Notes |
|---|---|---|
| Messages | `$0EBF` | 89 messages, plain ASCII, each ended by `$21` |
| Objects | `$1568` | 21 records of 4 bytes |
| Part one map | `$4000`/`$4100`/`$4200` | 3 rows of 256 |
| Part two map | `$4400`/`$4500` | 2 rows of 256 |
| Mode handlers | `$43E8` | 12 words, address minus one |
| Event numbers | `$896E` | 256 bytes |
| Event starters | `$8A6E` | 16 words, address minus one; 0 and 10 empty |
| Terrain types | `$8AFF` | indexed by character code |
| Hit-effect and creature frames | `$8F90`-`$8FC7` | sprite pointer lists: the hit effect's nine frames (`$8F91`-`$8F99`), then one or two per creature (`$8F9A`-`$8FC7`) |
| High scores | `$83E8` | 10 entries of 6 bytes: score (3), initials (3) |
| Tunes | `$ACA0` | 5 records of 7 bytes |

## Text

Messages are plain ASCII: capital letters, digits and the space as themselves, `$32` ('2') a line break, `$33` ('3') the prompt: the printer at `$0EB2` draws the prompt arrow, `$7B` `$7C`, at `$C360` and ends the message; it is the whole of message 10, which `clear_mode` queues when a mode ends, and `$21` ('!') the end of every message. The printer (`$0E48`) adds `$20` to each character to reach the panel font. `queue_message` (`$0DEF`) adds `$0B` to the number it is given. The system messages are numbered from 11, 45 to 48 are the endings, 49 the copyright line, 50 and 51 the part headings, 52 the high-score prompt, the object names from 53 and the descriptions from 75. The credits are not drawn at all: they are the screen memory at `$8000`, loaded with the game. The high-score heading is copied from its own table at `$99B1`.

## Sound

Martin Galway's three-voice script driver. Each tune is a record of seven bytes at `$ACA0`: three script addresses and, in its last byte, the tempo nibble from which `$9F0B` builds the 32-entry duration table at `$9DD6`. Per voice the interpreter (`$A48B`, `$A5E2`, `$A73B`) reads notes (a byte below `$C0`, then a duration) and commands (`$C0` and above): the command byte minus `$C0` is a byte offset into the voice's table (`$9C00`, `$9C34`, `$9C6C`), stored into the operand of a `JMP (ind)`, so only even command bytes are commands, and voice 2's `$F4` and `$F6` jump to code in the music data (`$B60A`, `$B60D`). Each voice has 29 bytes of note parameters (`$9CA0`, `$9CD5`, `$9D0A`), a script stack of eight returns (`$9CBD`, `$9CF2`, `$9D27`) and 35 working bytes (`$9D65`, `$9D88`, `$9DAB`); `$9D3F`-`$9D64` is the filter sweep the voices share, set by voice 3's command `$E2`. The per-tick effects (`$A898`, `$A9D6`, `$AB48`) sweep pulse width and pitch and the filter. The music is called from the raster interrupt; the speed flag `$031B` makes it run about 2.75 times as fast. Five tunes: attract, intro, ending, part one, part two (`$ACA0`).

## The listing's error rate

Two samples, both read by the model that wrote the comments, so neither is independent: of 60 comments drawn from all 1,110, 12 were wrong (10 of them mechanical, variable comments that named a wrong routine as writer or reader); of 28 comments of code routines, 5 were wrong in a detail. All were corrected.

An audit on a proven model, claude-opus-5-5, then checked every one of the 1,146 comments, range by range, each range by a checker that wrote none of it: 454 were wrong, 424 in a detail and 30 in their main claim, and all 454 were corrected, with 4 more comments that repeated a corrected belief. The commonest errors were writer and reader lists that named the routine whose label came before an instruction instead of the one it belonged to, or missed accesses made through an index; conditions read the wrong way round; and counts and distances off, among them part two's distances read at half their size. A further checker then audited the 126 claims of this file against the corrected listing: 12 were wrong in a detail and were corrected, and 6 could not be checked from the bytes.

## Live tests

- F3 on the attract screen started part two (the clock read 6:00 and the countryside was drawn), 1 November 2026, and again from the cassette, 13 November 2026.
- F7 held the clock: tenths and seconds read the same twice, three seconds apart (1 November 2026).
- F5 returned the machine to the attract mode (`$9561`); the processor was then in `$0586`'s routine at `$0594`, which the attract loop calls.
- The joystick in port 2 moved Johnny in both parts (the walk and the menu both answered it).
- Each of part two's fourteen events, started on the kit's machine model by setting the scroll column to one of its columns, drew the shapes and colours the Graphics tab shows (13 November 2026).
