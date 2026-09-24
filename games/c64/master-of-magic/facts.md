# Master of Magic — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`; the live
tests are listed at the end.

Numbers: objects and creatures share one numbering, 0 to 63, called
*entries* here. Entry 0 is the player, `$01`–`$20` are the 32 objects and
`$21`–`$3F` the 31 creatures. Tables indexed by entry sit at the addresses
given; a table used only for creatures keeps its bytes at base + `$21` to
base + `$3F`.

## Build

Remember's crack of the 1985 Mastertronic tape (release 15; `orientation.md`
has the image, the loader and the trainer). The game proper starts at
`$07F9`; nothing of the crack is called after it. No version string or
build identifier was found in the game's text.

`$8000`–`$8008` holds `18 08 18 08` and `CBM80` (`C3 C2 CD 38 30`): the
signature the KERNAL looks for on a reset and on RESTORE, with both its
cold and warm start vectors set to `$0818`, the game's restart.

The file was saved from a memory image of the game that had already run:
the creatures' home addresses (`$4CCF`–`$4D0C`) are loaded in the state the
new-game set-up leaves them in (below, under **Creatures**), and `$A477`–`$A47D`,
`$4F06`–`$4F45` and `$41D9`–`$4587` hold leftovers of other programs.

## Memory layout

| Thing | Where |
|---|---|
| Entry: stack, `$00`/`$01`, KERNAL screen clear, BASIC RAM init | `$07F9` |
| Restart (the `CBM80` vectors), title, new game, main loop | `$0818`, `$0924`, `$0824` |
| Engine code: menu, movement, sight, pictures, verbs, creatures, combat, interrupt | `$0802`–`$2F52` |
| Top band character set: letters, map tiles, figures, doors | `$3000`–`$37FF` |
| Top band sprite shapes: the player's dot, seven view figures | `$3800`–`$39FF` |
| Sprite register images for the top and bottom bands | `$3A00`, `$3A20` |
| Spell upkeep, spell hits, creature death, wanderers | `$3A40`–`$3BCA` |
| Line-of-sight ray tables | `$3BCB`–`$3CBA` |
| The view's 121-cell arrays; the 64-entry object arrays | `$3D45`–`$3EAF`, `$3EB0`–`$412F` |
| Menu verbs | `$4130`–`$41C7` |
| Leftover monitor code, never run | `$41D9`–`$4587` |
| Nouns, messages | `$4588`–`$4946` |
| Creature movement tables, object and creature property tables | `$4947`–`$5080` |
| Distance grid, play-screen frame, EXAMINE texts, spells | `$5081`–`$57E2` |
| Picture-strip tables, the ending | `$57E3`–`$5B26` |
| Title, story scroller, demonstration start, controls and instructions | `$5B27`–`$5E4D` |
| Picture sheet: 30 pictures as one multicolour bitmap | `$6000`–`$7F3F` |
| `CBM80`, title scroller text, controls screen, five instruction pages | `$8000`–`$8F99` |
| The dungeon map, four levels | `$9000`–`$9FFF` |
| Tile tables: creature exits, glyph addresses, colours | `$A000`–`$A4FF` |
| The DEAD sprite; the recorded demonstration and its seed | `$A500`, `$A540`–`$A7FF` |
| Bottom band screen matrix, sprite pointers, colour images | `$A800`–`$AFFF` |
| Bottom band bitmap: the pillars and the twelve picture slots | `$B400`–`$BF3F` |
| Music driver and three tunes | `$C000`–`$CBE6` |
| Title picture: screen matrix, bitmap under the KERNAL | `$CC00`–`$CFE7`, `$E000`–`$FF3F` |

## Start, restart and reset

- `$07F9` runs once: stack to `$FF`, `$00` = `$2F`, `$01` = `$37`, the KERNAL's
  screen clear (`$E544`) and the BASIC RAM initialisation (`$E3BF`), `$CC` = 1
  (no cursor), the NTSC counters. It falls into `$0818`.
- `$0818`, the restart, clears bit 0 of `$01`, so the game runs with `$01` =
  `$36`: BASIC out, KERNAL and I/O in. It is where every game over returns
  and where both `CBM80` vectors point. It does not reset the stack.
- RESTORE and the reset both restart the game (*live*). RESTORE keeps the
  machine's state. A reset does not: it clears the 6510's data direction
  register `$00`, and nothing on the way to `$0818` sets it again, so the
  write of `$36` to `$01` changes nothing and BASIC stays visible at
  `$A000`–`$BFFF` (*live*: `$00`/`$01` read `$2F`/`$36` in play and `$00`/`$17`
  after a reset; the CPU then reads BASIC ROM at `$A000` where it read the
  game's tables). The title's colours, copied from `$AC00`, come out
  scrambled, and in the game the view window stays empty, because the
  line-of-sight and colour tables at `$A200`–`$A4FF` read as ROM
  (`reference/reset-title.png`, `reference/reset-play.png`).

## The play screen

The screen is split into three bands by the raster interrupt `$2653`,
entered through `$0314` (`$2627` installs it).

| Band | From raster | Mode | Holds | Set up at |
|---|---|---|---|---|
| 0 | `$28` (40) | multicolour text, VIC bank 0, screen `$0400`, characters `$3000`; sprites from `$3A00` | view window, status line, message window | `$2675` |
| 1 | `$8E` (142) | the same text, background colour 8 | the menu, rows 12–15 | `$275E` |
| 2 | `$B6` (182) | multicolour bitmap, VIC bank 2, bitmap `$A000`, matrix `$A800`; sprites from `$3A20` | the picture strip, rows 17–24 | `$27AE` |

- Only band 0 goes on to the KERNAL (`$EA31`), so the keyboard is scanned
  and the jiffy clock runs once a frame. The other bands and any CIA
  interrupt leave through `$265D`, which reads `$DC0D`.
- Band 2 counts frames in `$03A0` and ORs `$D01F` into `$038D`: the player's
  walls (below).
- **View window**: rows 0–10, columns 0–10, 11 × 11 cells; the player's
  cell is the centre, `$04CD`. **Status line**: row 0, columns 11–39: the M
  bar `$040D`–`$0414` and B bar `$0417`–`$041E` (`$2BDE`) and the clock
  `$0420`–`$0427` (`$2C50`). **Message window**: rows 2–9, columns 12–38
  (`$03B0`–`$03B5`); text goes on the bottom line and scrolls up (`$28DD`).
  The frame is printed once through CHROUT from `$50FA` (`$0A39`).
- **Bars** (`$2BDE`): glyphs `$21` (empty) to `$29` (full) in eighths of a
  cell; M shows 2 × mind, B shows 2 × (body + 1). Both start at 30, the
  maximum, so neither overflows its eight cells.
- **Clock** (`$2C50`): HH:MM;SS, one second per 8 world passes (the first
  after 4, `$03BC`), wrapping after 99 hours. It is called only from the
  pass loop (`$08ED`), so it stands still while the menu waits (*live*).
- Band 2 begins at raster `$B6`, inside character row 16, so only rows 16–24
  of its bitmap are ever shown; `$A000`–`$B3FF` of that bank is never
  displayed and holds tables.

## Main loop and the menu

`$0824` redraws the bars, then, while `$03C7` is zero, builds and runs the
main menu (`$11A2`), which returns an option 1–17. The option indexes
`$4C3A` for an even offset into `$4C03`, and the handler's address is
written into the operand of the `JSR` at `$0846` (`$0847`/`$0848`): the
dispatch is self-modifying code. `$4C27` gives `$03AF` the action's time in
world passes, and `$08CC` runs them after the handler returns, whether the
handler did anything or not. When `$03C7` becomes non-zero the game is
over; `$7B` is the win.

| Option | Verb | Handler | Passes | Offered when (`$11A2`, counts from `$128F`) |
|---|---|---|---|---|
| 0 | WALK | `$08B0` | until fire | never |
| 1 | RUN | `$08B9` | until fire | always |
| 2 | PICK UP | `$195C` | 5 | an object lies on the player's cell |
| 3 | PUT DOWN | `$1AED` | 4 | a hand holds something (`$4C01`, `$4C02` not `$FF`) |
| 4 | INVENTORY | `$1A30` | 12 | always |
| 5 | OPEN | `$1B9D` | 8 | the player's cell `$04CD` shows a shut door |
| 6 | CLOSE | `$1C31` | 8 | it shows an open door |
| 7 | WEAR | `$1D00` | 10 | a wearable object (`$4A81`) is carried and not worn |
| 8 | TAKE OFF | `$1D8B` | 10 | something is worn (`$4AC1` = 2) |
| 9 | PUT IN | `$1E21` | 5 | a container is carried and a hand holds something |
| 10 | TAKE OUT | `$1F15` | 5 | a container is carried |
| 11 | LOOK IN | `$1FCB` | 10 | a container is carried |
| 12 | ATTACK | `$29FC` | 10 | a creature, living or dead, is on the player's cell |
| 13 | SWAP | `$20A5` | 3 | a hand holds something |
| 14 | EXAMINE | `$2CD4` | 10 | always |
| 15 | DRINK | `$2D5E` | 10 | a potion (`$4B41`) is held |
| 16 | CAST | `$2E23` | 20 | no spell is in force (`$57D2` = `$FF`) |
| 17 | UNCAST | `$2F22` | 10 | a spell is in force |

- **The door test is signed** (`$11E5`: `CMP #$F0` / `BMI`), so codes `$00`–`$6F`
  pass as doors as well as `$F0`–`$FF`. The map holds some of them where
  a player can stand: the edge of level 2's pool (`$52` at `$9BAA`/`$9BAB`,
  floor but for a row of water), its fringe cells `$61`/`$63` and the wall
  mark `$60`. On `$52` or `$60` the menu offers OPEN, on `$61` or `$63` CLOSE.
  Choosing it prints "OPEN DOOR." or "CLOSE DOOR." and costs its 8 passes;
  `$1BBF` and `$1C85` act only on the door codes, so nothing opens (*live*:
  the player walked onto `$9BAA` from the floor to its left, the menu read
  RUN, INVENTORY, OPEN, ATTACK, EXAMINE, CAST, and OPEN printed OPEN DOOR.;
  `reference/pool-edge-open-door.png`).
- **WALK is never offered**: `$11A2` adds only options 1–17, and nothing
  prints the verb at `$4130`. Its handler sets a pixel every second pass
  (`$039A` = 2) where RUN's sets one every pass.
- Live agreement: the first menu reads RUN, INVENTORY, EXAMINE, CAST
  (`reference/play-first-menu.png`); holding the amulet it reads RUN, PUT
  DOWN, SWAP, INVENTORY, EXAMINE, CAST (`reference/play-menu-holding.png`).
- **The chooser** (`$1320`, every menu): waits for fire to be released,
  starts on slot 0, blinks the slot black for 20 and white for 10 of its
  rounds; the stick moves one slot sideways (wrapping across rows) or one
  row; a diagonal moves sideways only; a move onto an empty slot is
  refused; fire returns the slot's value from `$41C8` after fire is
  released (`$146C`). Nothing in it advances the clock.
- **Layouts**: 16 slots of 10 characters, four a row, in rows 12–15
  (`$3A79`); CAST's spell list uses 8 slots of 20, two a row (`$3A93`).
  Every submenu ends with `-NOTHING-`, which cancels; the verb's passes
  still run.
- **Fire ends only WALK and RUN.** `$0904` returns to the menu when fire is
  down and the player's dot is not touching a wall (`$091C`), but inside
  the pass loop only the movement tick `$0ABF` polls the controls, and it
  runs only for WALK and RUN. A timed verb always runs its full count
  (*live*: INVENTORY ran 12 passes with fire held during them and 12
  without).

## World passes

One pass of `$08CC`: six times one ray of the view (`$0B25`) and one call of
the creature clock (`$2205`); every 50th pass new destinations for the
wanderers (`$3B87`); the bars; the clock; the spell's upkeep (`$3A40`); for
WALK and RUN the player's movement tick (`$0ABF`) and the picture strip
(`$1695`); the view figures (`$0FEF`); the staircases (`$20BC`).

- While running, the clock advanced 21 seconds in 17.6 real seconds on
  PAL (*live*): about 9.5 passes a second, so the player runs about 1.2
  cells a second (one pixel a pass, 8 pixels a cell).

## The dungeon map

- `$9000`–`$9FFF`: 32 rows of 128 cells, one byte per cell, the character
  code the view window shows (colour from `$A400`). Cell (row r, column c)
  is `$9000` + 128r + c. Every position the game keeps is an address in
  this map. Loaded, not drawn; only OPEN, CLOSE and the new-game door reset
  write to it.
- **Four levels of 32 columns side by side**: columns 0–31, 32–63, 64–95
  and 96–127. Row 0 carries the digits 1, 3 and 4 over the first, third
  and fourth, sealed in rock where no ray reaches. Level 1 is rooms and corridors; level 2 one
  hall with free-standing walls and a large pool; level 3 rooms behind
  seven doors and a hall with a pool; level 4 caves with the small pool and
  the pedestal.
- **Staircases** (`$20CC`, for every creature and then the player, once a
  pass): stepping onto `$B1`, the east half of a `$B0 $B1` staircase, adds
  32 to the map address, the same row one level east; `$B2`, the west half
  of `$B2 $B3`, subtracts 32. All seven `$B1` cells land on a `$B3` and all
  seven `$B2` on a `$B0`. The links: level 1 ↔ 2 in row 24; 2 ↔ 3 in row
  11; 3 ↔ 4 in rows 1, 2, 3, 11 and 19. `$A3` at `$9718` (level 1) is a
  one-way drop to `$9738` on level 2.
- **Start and goal**: the player starts at `$947B` (level 4); the amulet
  lies at `$961F`, the dead end of a winding corridor at the east edge of
  level 1; the pedestal is the cell `$9677` (level 4, code `$70`) beside the
  2 × 2 pool `$95F5`/`$95F6`/`$9675`/`$9676`. The riddle scroll near the
  start (`$95F4`) says "GO UP AND EAST TO FIND YOUR TREASURE", so level 1
  is presumably the top; the code has no notion of up.
- **Doors** `$F0`–`$FF`: 17 doors, each two cells facing each other across
  a wall (all 34 cells checked). Bit 0 = open; bit 3 clear = the other half
  is one row away, set = one cell across; bit 1 = the other half is
  below/right (clear) or above/left (set); bit 2 changes only the glyph.
  Level 1 has 9 (three side by side at `$9603`–`$9605`), level 2 none,
  level 3 has 7, level 4 one. OPEN (`$1BBF`) sets bit 0 on the cell the
  actor stands on and its other half; CLOSE (`$1C85`) clears it and puts the
  player back in the middle of his cell if he stands on either half
  (`$1C50`). A new game closes every door (`$09AE`).
- **Tiles**: in the top band's multicolour characters pixel pair `01` is
  the floor (`$D022`, dark grey), `10` the walls (`$D023`, mid grey), `11` the
  tile's colour from `$A400`. `$7E` is rock (1,565 of the 4,096 cells); `$7F`
  is solid too, the view's "not seen" fill; `$80`–`$B9` floors and wall
  lines; `$50`–`$53`, `$61`, `$63`, `$70`–`$73` the pools; `$60` a yellow wall mark;
  `$F0`–`$FF` doors.

## Line of sight

- `$0B25` casts one ray per call, six calls a pass. 28 rays fan out
  clockwise from north (ray 7 east, 14 south, 21 west). Each follows a
  seven-step pixel pattern (`$3BF7` + `$3BCB`[ray]: up, down, left, right or
  pause) repeated for up to 56 steps; the pauses keep every ray within 40
  pixels, five cells, so the seen area is a rough circle and never leaves
  the 11 × 11 window.
- Each step tests the pixel on the glyph of the map cell it is in
  (`$A200`/`$A300` point into `$3000`; masks `$3BE7`/`$3BEF`): a `10` pair stops
  the ray, and a `11` pair stops it where the tile's colour byte is exactly
  `$0F` (the shut doors and the wall mark).
- Cells reached go into three 121-entry arrays: map address `$3D45`/`$3DBE`
  and tile `$3E37` (`$7F` = not seen). Every 29 rays (`$039F`) the view is
  drawn (`$0F58`), the entries in sight are found (`$0FAA`, into `$3EB0`, with
  their distance `$5041` from the grid `$5081`) and the arrays are cleared.
  Moving into another cell scrolls the window at once and restarts the
  sweep (`$038B`).
- Every entry in sight gets the player's current cell in `$4C4F`/`$4C8F`: a
  creature's "where I last saw him" (`$0FD2`).
- `$0C77` does not record the player's own cell when the previous ray used
  all 56 steps. Simulating `$0B25` over the whole map, that happens on only
  11 standable cells, in the strip of level 4 at column 96, and none of
  them can be reached from the start (flood fill over the cells the player
  can stand on).

## The player's movement

- The player is sprite 0 of band 0, a 4 × 4 yellow dot (`$3800`, `$0D1F`),
  moved one pixel per movement tick (`$0D44`) by the stick; crossing a cell
  edge moves the map address by 1 or 128 and scrolls the window
  (`$0DA0`, `$0DF6`, `$0E51`, `$0EC3`).
- **Walls are found by the video chip.** Band 2 collects `$D01F` into
  `$038D`; when bit 0 is set, the player's dot has touched a foreground pixel
  (wall, rock, a shut door, the water) and `$0AD3` calls `$0F95`, which
  reverses the direction of travel for the next step. Fire cannot end a run
  while the dot touches a wall (`$091C`).
- **Narrow passages fit the dot exactly.** The dot is 4 pixels wide (rows
  `.##.`, `####`, `####`, `.##.`) and spans in-cell x − 2 to x + 1. The
  narrow north-south corridors and doors (`$84`, `$86`, `$88`, `$F4`–`$F7`)
  have wall pixels at x 0–1 and 6–7, a gap of 4, so only in-cell x = 4
  passes; east-west corridors (`$83`) have one-pixel walls top and bottom
  and let y = 3, 4 or 5 through (*live*: pushing up the corridor at level
  3's column 64 from in-cell x = 2, 3, 4, 5 and 6, only x = 4 moved; the
  others bounced in place).
- From the start, with every door shut, the player can walk to 609 cells:
  292 on level 4 and 317 on level 3; levels 1 and 2 are behind doors (flood
  fill with the page's movement port, which matches the game's).
- Controls (`$0CC6`): joystick port 2 (`$DC00`) into `$0387` fire, `$0388` x and
  `$0389` y; then SHIFT alone (`$028D` = 1) is right, the Commodore key alone
  (2) is left, H (`$C5` = `$1D`) is up, B (`$1C`) is down, SPACE (`$3C`) is
  fire. M (`$24`) toggles the music (`$0C94`). CHROUT `$08` at `$0A40` locks the
  KERNAL's SHIFT + Commodore case switch.

## Objects and what the player carries

| Entries | Objects |
|---|---|
| `$01` | armour |
| `$02` | helmet |
| `$03`–`$06` | daggers: two plain, the dagger of wood (`$05`), the Dagger of Death (`$06`) |
| `$07` | backpack, the only container |
| `$08`–`$09`, `$0A` | swords, axe |
| `$0B`–`$0F` | potions |
| `$10`–`$14` | rings: blue stone (`$10`), Protection from Evil (`$11`), Dexterity (`$12`), two plain |
| `$15` | the Amulet of Immortality |
| `$16`–`$17` | maces (the picture is a flail) |
| `$18`–`$1D` | scrolls |
| `$1E`–`$20` | shields |

- **Where**: `$3F70`/`$3FB0` hold each entry's map address. A high byte of 0
  means held, and the low byte is the holder: 0 the player, 7 the backpack,
  a creature's number; `$FF` a drunk potion. `$3FF0`/`$4030` are the pixel
  position in the cell. `$4AC1` says more: 0 loose or in a hand, 1 in the
  backpack, 2 worn. The start places `$3EF0`/`$3F30` are copied in by every
  new game (`$094C`).
- **Hands**: `$4C01` right, `$4C02` left, `$FF` empty. PICK UP, TAKE OFF and
  TAKE OUT fill the right hand first; "NO FREE HAND." (`$47C1`) with both
  full. SWAP exchanges them. WEAR takes a wearable object from a hand; there
  is no limit on what is worn. PUT IN, TAKE OUT and LOOK IN work on a
  carried backpack.
- **Weight** (`$4A01`; PICK UP `$19E9`–`$1A05` with `$2883`): the object, what is
  inside it, and everything the player holds or wears with everything
  inside those, together below 70, or "YOU CANNOT CARRY THAT MUCH WEIGHT."
  (*live*: wearing 60, a shield of 10 was refused; a mace of 8 and then a
  potion of 1 were taken, to 69).
  Weights: armour 40, helmet 5, daggers 3, backpack 2, swords 6, axe 8,
  potions 1, rings 0, amulet 1, maces 8, scrolls 0, shields 10; 131 in all.
- **Starting places** (`$3EF0`/`$3F30`): the backpack at `$976C`, a healing potion
  at `$9B7B` and the riddle scroll at `$95F4`, all on level 4 near the start;
  the other potions, rings and scrolls on the other levels or with
  creatures. The armour starts with orc `$21`, the helmet with skeleton `$2A`,
  the dagger of wood with orc `$25`, the Dagger of Death with vampire `$3E`,
  the Ring of Dexterity with skeleton `$29`, a sword with the minotaur. The
  scroll `$19` starts inside the backpack.
- A creature's death drops everything it held on its cell (`$3B63`).
- The amulet and rings `$13` and `$14` have no code of their own beyond the
  tables every object has: the amulet matters only to PUT DOWN's win test.

## The win and the end of a game

- PUT DOWN (`$1AED`, test at `$1B82`–`$1B96`): putting down object `$15` while the
  player's map address is `$9677` sets `$03C7` = `$7B` (*live*: the ending
  printed, `reference/ending.png`). The main loop prints the ending (`$5A5C`,
  "WITH A SUDDEN FLASH OF CRIMSEN LIGHT THELRIC APPEARS...") and starts tune
  2.
- Death: a creature's hit that takes body strength below 0 prints "YOU+RE
  DEAD..." and sets `$03C7` = 1 (`$24D9`–`$24E7`); the main loop starts tune 1.
  0 is still alive (*live*: with body 0 and the minotaur put on the
  player's cell, "THE MINOTAUR ATTACKED YOU WITH ITS SWORD. HE HIT. YOU+RE
  DEAD...", body `$FE`, tune 1 started; `reference/death.png`).
- Afterwards `$0876` waits: fire returns to the title, and so does the wait
  running out after 655,360 polls of the controls (`$0880`–`$08A7`). The end
  of a demonstration skips the wait.

## Creatures

| Entries | Kind | Body | Defence | To hit | Strength | Speed | Chases for | Fights with |
|---|---|---|---|---|---|---|---|---|
| `$21`–`$25` | orcs | 15, 15, 13, 12, 12 | 20, 20, 25, 25, 30 | 15, 20, 20, 20, 25 | 10–18 | 6–9 | 6 | hands, or a held weapon |
| `$26` | wizard | 20 | 40 | 20 | 30 | 25 | 60 | FIREBALL SPELL |
| `$27`–`$2C` | skeletons | 20 | 15–25 | 15–28 | 15–19 | 5–6 | 20 | hands, or a held weapon |
| `$2D`–`$30` | hellhounds | 10, 10, 12, 15 | 20, 20, 15, 20 | 22, 22, 22, 25 | 5 | 3–4 | 1 | teeth |
| `$31`–`$37` | bats | 1–6 | 10–15 | 18–21 | 2 | 5–10 | 0 | teeth |
| `$38`–`$3A` | spiders | 10, 12, 15 | 35 | 30, 33, 35 | 10 | 4–6 | 10 | sting |
| `$3B`–`$3C` | snakes | 20 | 50 | 20 | 3 | 14 | `$3B` flees; `$3C` 0 | sting |
| `$3D`, `$3E` | vampires | 50 | 60, 25 | 36, 38 | 40 | 5 | 30 | teeth, or a held weapon |
| `$3F` | minotaur | 50 | 133 | 45 | 21 | 3 | 60 | a held sword |
| `$00` | the player | 30 | 40 | 25 | 18 | — | — | the right hand |

Body `$4E85` (copied to `$4EC5` at a new game), defence `$4DC7`, to hit `$4E05`,
strength `$4D89`, speed `$4B81`, pursuit `$4D49` AND `$7F`, natural weapon `$4F66`.

- **Overlapping tables**: `$4D89`, `$4DC7` and `$4E05` are indexed up to `$3F` but
  lie only `$3E` apart, so entries `$3E` and `$3F` of each are entries 0 and 1
  of the next. The second vampire's defence is the player's to-hit, 25,
  where the first's is 60; the minotaur's defence is `$4E06`, 133; the
  second vampire's strength is the player's defence, 40.
- **The clock of the creatures** (`$2205`, six calls a pass): a live creature
  takes one sub-step, one pixel, every `$4B81` calls; a cell costs nine
  sub-steps (a decision and eight moves). So a creature covers 6/(9 × speed)
  cells a pass against the running player's 1/8: the minotaur and two
  hellhounds (speed 3) are nearly twice as fast as the player, the wizard
  (25) a quarter as fast. Every creature moves whether in sight or not;
  dead ones stop.
- **Deciding** (`$2308`, at each cell centre): in sight, a creature re-arms
  its pursuit (`$2367`) for its "chases for" count of decisions. Then it
  attacks if it stands on the player's cell; otherwise it chases towards
  where it last saw him and, once there, carries straight on (`$2381`); the
  one timid creature, snake `$3B` (`$4D49` bit 7), flees instead and never
  attacks (`$23AF`); a creature neither chasing nor fleeing goes home
  (`$23D5`).
- **Home is broken.** The home addresses `$4CAE`/`$4CCD` were meant to be each
  creature's start (the loaded low bytes match `$3EF0`), but the new-game
  loop clears `$4CEC` and `$4D0B` for 64 entries (`$0965`, `$0968`), and with the
  31-byte packing the first store also zeroes every home's high byte and
  both bytes of `$3E` and `$3F`. Home is then an address in page 0, north of
  the map, so an idle creature heads towards its start column and then due
  north, and paces back and forth under the northernmost wall it can
  reach (staircases carry some to other levels). In
  play-run, 53 seconds into a game, 17 of the 24 creatures that do not
  wander were north of their start row, nine of them in map rows 0–1.
  Seven wanderers (`$22`, `$23`, `$2A`, `$2B`, `$2E`, `$33`, `$35`) get a random
  destination anywhere in the map every 50 passes (`$3BBA`) and roam.
- **Moving** (`$2566`): the wanted direction (`$219B`: straight when within
  about 26.6° of an axis, otherwise diagonal) is tried first, then one
  step either side, then two, then three anticlockwise (`$4978`–`$49B7`), never
  back the way it came unless nothing else is open. The exits of each tile
  come from `$A100` (bit n = may leave in direction n, north clockwise), or
  from `$A000` for creatures that open doors (`$5001`: orcs, wizard,
  skeletons, vampires, minotaur): `$25A7` is the operand byte that switches
  them. The two tables differ only at the shut doors. A door-opener opens
  a shut door it passes (`$2600` → `$1BBF`) and closes it at its next decision
  (`$25F4` → `$1C85`). Hellhounds, bats, spiders and snakes never pass a shut
  door.
- Every door closed, by the player or a creature anywhere in the dungeon,
  ends with a full recast of the player's view (`$1CF9`: `$1C50`, then
  `$0B05`, 30 rays). The recast leaves the shared pointer `$9B`/`$9C` in
  screen memory, so a door-opener that closes one door and has to open
  another in the same decision (`$25F4`, then `$2600`) opens nothing: `$1BBF`
  reads a screen byte, and the creature walks on through the shut door
  (traced; it did not happen in 300,000 passes of the page's port).
- **Footsteps**: orcs, the wizard, skeletons, hellhounds, vampires and the
  minotaur (`$59DC`) make a footstep every third sub-step while in sight;
  bats, spiders and snakes are silent.

## Combat

- **The player's blow** (ATTACK, `$29FC`): the target is a living creature on
  the player's own cell; the weapon is the right hand's object, the fist
  when it is empty; a non-weapon refuses ("-NOTHING IN RIGHT HAND TO FIGHT
  WITH-"). Roll = (random AND 31) + 25, + 8 while the Ring of Dexterity is
  worn (`$4AD3` = 2); it hits when roll − defence has bit 7 clear (`$2AE5`).
  Damage = (random AND the weapon's mask `$4E45`) + 18/8: fist 2–3, dagger
  2–5, sword, axe or mace 2–9 (`$2AFF`–`$2B15`).
- **Special weapons** (`$2B5F`, `$2B1F`–`$2B3F`): the Dagger of Death against the
  minotaur makes the roll equal his defence, a certain hit, and does 30;
  the dagger of wood does 30 to either vampire. Two more cases can never
  happen, because each asks one register to equal two values in turn: a
  mace would add 8 against skeletons and hellhounds (`CMP #$16` / `BNE` /
  `CMP #$17` / `BNE`, `$2B63`), and the dagger of wood would make its roll the
  first vampire's defence (`CPX #$3D` / `BNE` / `CPX #$3E` / `BNE`, `$2B7F`).
- **The player's chance to hit**, counted over the random routine's
  256-number cycle: every creature with defence 25 or less always; the
  last orc (30) 87 %; spiders (35) 68 %; the wizard (40) 47 %; snakes (50)
  18 %; the first vampire (60) never, 13 % with the Ring of Dexterity; the
  minotaur never, except with the Dagger of Death. (A game started before
  the first demonstration uses the loaded seed's cycle: 82, 63, 45 and
  18 %.)
- **A creature's blow** (`$23F9`–`$24ED`): roll = (random AND 31) + its to-hit −
  8 while the Magical Shield is up (`$57D3`) + the player's protection
  (`$24F1`); it hits when roll − 40 has bit 7 clear. Damage = (random AND
  mask) + its strength/8, the mask from the highest-numbered weapon it
  holds, else its natural weapon (`$4FDE`: hands 1, teeth 3, sting 3,
  fireball 15; CLAWS exists but no creature has it). The wizard's fireball
  does 3–18, the most of any attack. Messages: "THE <creature> ATTACKED YOU
  WITH ITS <weapon>." and "HE MISSED." or "HE HIT.". A creature on the
  player's cell attacks once per nine of its sub-steps.
- **Protection** (`$24F1`): armour −5, helmet −2, the blue-stone ring +8
  (monsters hit more), Protection from Evil −4. Each test reads the
  object's constant "can be worn" flag (`$4A82`, `$4A83`, `$4A91`, `$4A92`) where
  the worn state `$4AC1` was surely meant, so the object counts whenever the
  player holds it, in a hand or worn, and not in the backpack. The two
  shield tests (`$2541`, `$2553`) compare one register with `$1E`, `$1F` and `$20` in
  turn and never pass: a shield protects nothing.
- A kill: body strength below 0, which leaves bit 7 set (a spell stores
  `$FF`); bit 7 means dead everywhere. The creature's possessions drop and
  "YOU KILLED IT." is printed (`$2B51`).

## Magic

| Spell | Cost | Effect | Power (`$57D4`) |
|---|---|---|---|
| MAGIC MISSILE | 6 | 15 off one creature in sight | 20 |
| FIREBALL | 10 | 15 off every creature in sight closer than 17 on the distance grid (its own cell, the 8 around, 4 two cells away straight) | 60 |
| MAGICAL SHIELD | 1 | 8 off every creature's attack roll, until UNCAST; 1 mind every 100 passes | — |
| ENERGY DRAIN | 5 | 7 off one creature in sight | 60 |

- `$2E23`: costs `$57D5`, paid before the target is chosen, so `-NOTHING-` or an
  empty view wastes them (*live*: at the start, with no creature in sight,
  choosing MAGIC MISSILE took mind from 30 to 24 and offered only
  `-NOTHING-`); with too little mind, mind goes to 0 and "THE
  SPELL DID NOT WORK PROPERLY BECAUSE YOU DID NOT HAVE ENOUGH MIND POWER".
- **Spells never roll** (`$3AC7`): the random number is fetched and then
  overwritten by `LDA #$1F` (`$3AD6`), so a spell hits exactly when 31 + power
  − defence has bit 7 clear. MAGIC MISSILE (51) always hits everything but
  the first vampire (60) and the minotaur (133), which it always misses;
  FIREBALL and ENERGY DRAIN (91) miss only the minotaur (*live*: the same
  results from six random states: a skeleton 20 → 5, the first vampire
  50 → 50, the second 50 → 35, the minotaur 50 → 50). A miss prints nothing;
  a kill prints "YOU KILLED THE <creature>".
- The shield is the only spell that stays in force (`$57D9`); while it does,
  the menu offers UNCAST instead of CAST, so no other spell can be cast.
  Its upkeep (`$3A40`) takes 1 mind per 100 passes and uncasts it when mind
  would go below 0.
- ENERGY DRAIN takes body strength from its target only; nothing gives it
  to the player.

## Potions

DRINK (`$2D5E`) lists the potions the player holds (not those in the
backpack); the potion is gone afterwards (`$3F70` = `$FF`).

| Potion | Label (EXAMINE) | Effect |
|---|---|---|
| `$0B`, `$0F` | "POTION OF HEALING" | body + 8–15, at most 30 |
| `$0C` | "ALUMROF ECNEGILLETNI ARTXE" (EXTRA INTELLIGENCE FORMULA backwards) | mind + 8–15, at most 30 |
| `$0D` | "IT SMELLS PUNGENT, THERE IS NO LABEL" | body halved |
| `$0E` | "POTION OF ORCANIAN INTELLECT" | mind halved |

Nothing else raises body strength or mind: every write to `$4EC5` and `$4F46`
was listed.

## Text

- The game's text is upper-case PETSCII, zero-terminated. The top band's
  character set keeps the letters and punctuation at their screen-code
  places, so there is no private alphabet; `+` is the apostrophe ("YOU+RE
  DEAD..."). The digits `$30`–`$39` are drawn inverted for the status line.
- A byte below `$20` in a message sets its colour (`$29AD`): `$10` black (the
  verbs), `$11` white, `$12` red (descriptions), `$15` green, `$16` blue.
- Nouns: 65 pointers at `$4588`/`$45C9`, one name per kind, so a DAGGER or an
  ORC never says which one; entry `$40` is the PEDESTAL, which EXAMINE lists
  on `$9677`.
- EXAMINE (`$2CD4`) lists what the player holds (hands and worn, not the
  backpack's contents) and everything on the cell, dead creatures too, and
  prints one of 28 descriptions (`$571E` → `$575F`/`$577B`, texts `$51D0`–`$5704`).
  Two are never shown: no entry maps to text 3 ("THE SAPPHIRE IS CURSED, IT
  BRINGS BAD LUCK") or text 5 ("IT HAS A SHARP EDGE AND A LONG BLADE"), and
  the table is never written.
- **Misleading texts**: scroll `$1B` says "THE KIND OLD WIZARD LEGGOLESS WILL
  HEAL YOUR WOUNDS", and the wizard (EXAMINE: "A SHORT HARMLESS LOOKING
  WIZARD") hits hardest of all; scrolls `$1A` and `$1D` say the Dagger of Death
  "WEAKENS HIS MIND", where it forces a hit and does 30 to the body; the
  Orcanian potion halves the mind; the maces are "GOOD FOR CRUSHING BONES"
  and their bonus against skeletons can never apply.
- Unused strings: " = " (`$46AD`), "POWER" (`$493A`), " " (`$4945`), and the "N" of
  noun 0.

## Pictures

- **The sheet** `$6000`–`$7F3F` is one multicolour bitmap, 30 pictures of
  6 × 4 cells in five rows of six: bitmap `$6000`, screen colours `$7900`,
  colour-RAM nybbles `$7C20`. `$582B` gives each entry its picture; four
  daggers, five potions, five rings, six scrolls, three shields, two
  swords, two maces, five orcs, six skeletons, four hellhounds, seven
  bats, three spiders, two snakes and two vampires each share one.
- Seven are twice as tall, 6 × 8 cells, their lower half the picture below
  in the sheet (`$586F`): armour, orc, minotaur, vampire, skeleton, door,
  staircase.
- **The strip** (`$1515`, `$14C3`): twelve slots of 6 × 4 cells, six across in
  character rows 17–20 and six in 21–24 (columns 2–37); a tall picture takes
  a column's two slots. Skull-and-snake pillars fill columns 0–1 and 38–39.
  With no free slot a picture is not shown.
- `$1695` shows every entry in sight, dead or alive, after each step and at
  every menu. Doors and staircases are not objects: `$16DA` counts door
  characters and `$B0`/`$B3` staircase characters in the view window, and `$1741`
  shows one door picture (9) or staircase picture (10) for each, as the
  pseudo-entries `$40`–`$43`. A shut door's two halves count twice, an open
  door once.
- **DEAD**: a creature whose body strength has bit 7 set gets one of the
  bottom band's eight sprites over its picture (`$156C`): all eight point
  at `$A500` (pointer `$94` in bank 2), a 24 × 7 shape that spells DEAD, light
  red (`$0A`) and doubled both ways (`$2858`–`$287D`). A ninth dead creature in
  the strip gets no label. (*Live*: a skeleton left with 10 and hit by
  MAGIC MISSILE: "YOU KILLED THE SKELETON.", body `$FF`, DEAD over its picture
  and its dagger beside it, `reference/dead-skeleton.png`.)
- **View figures** (`$0FEF`): up to seven entries in sight become sprites 1–7
  of band 0, each showing its own map glyph (`$4070`, copied from the
  character set into `$3840`–`$39FF`) in its tile colour; with more than seven
  in sight they take turns (`$0394`).

## The title, the demonstration and the recorder

- **The title picture** is a multicolour bitmap in VIC bank 3: bitmap
  `$E000`–`$FF3F`, in the RAM under the KERNAL, matrix `$CC00`, colour RAM copied
  from `$AC00` by `$5CC5` (`$5E44`). Rebuilt from those three it matches
  `reference/title.png` exactly in character rows 0–23; rows 23–24 are blank.
- **The title interrupt** `$5D08`: at raster `$30` the bitmap and two steps of
  the story; at `$EE` bank 0 text (screen `$0400`, characters `$3000`), 38
  columns with fine scroll, one music frame (`$1949`), then `$EA31`. A CIA
  interrupt returns without reading `$DC0D` (`$5D12`), so once the CIA's
  timer has run out the handler is entered again and again until the
  KERNAL exit at `$EE` acknowledges it (*live*: in 100 frames of the title
  the handler was entered 12,685 times, 12,586 of them leaving through
  `$5D12`, against 99 entries of each raster half).
- **The story** (`$5DAC`): `$8009`–`$838D`, the story, "PRESS FIRE OR SPACE TO
  BEGIN. PRESS M FOR MUSIC ON/OFF." and the credits "PROGRAMMED BY RICHARD
  DARLING, ART BY JAMES WILSON, MUSIC BY ROB HUBBARD." (`$831D`), between 40
  spaces; 861 positions at 2 pixels a frame, 69 seconds a pass on PAL.
- **Controls and instructions**: fire or SPACE on the title shows the
  controls screen (`$838E`); B or the stick pulled down shows five pages
  (`$84B7` HOW TO CONTROL THE GAME, `$86E7` THE DISPLAY, `$8893` TO PLAY THE GAME,
  `$8B1B` USING MAGIC, `$8DB1` MAGICAL OR PHYSICAL COMBAT), each ended by fire
  (*live*); fire starts the game.
- **The demonstration is recorded input.** After one pass of the story
  (`$5DED`) the title starts a game with `$03D3` = 2, and the input routine
  `$179D` replays the bytes at `$A543`–`$A7FF` in place of the controls
  (`$1888`): high nybble the stick (1 right, 2 left, 4 down, 8 up, `$F` fire,
  `$E` end), low nybble the number of polls − 1. The random seed is reset
  from `$A540`/`$A541` (`$F8`, `$18`) at that moment (`$5DF2`), so the replay repeats
  exactly. Real fire ends it. The shipped recording is 700 records, 7,724
  polls with 46 fire presses; its last 151 records are idle and it ends
  with `$EF` at `$A7FF`, the byte the recorder writes when its buffer runs out.
- **The recorder is still in the game** (*live*): CTRL alone with R on the
  title (`$5BBA`: `$028D` = 4, `$C5` = `$11`) saves the current seed at `$A540` and
  starts a game with `$03D3` = 1, in which `$179D` writes every input into the
  same buffer, a fire press as `$FA`; F (`$C5` = `$15`) ends the recording and the
  game. The next demonstration replays it, until the game is loaded again
  (*live*: a walk up, left and down recorded from the start was replayed
  by the next demonstration through the same cells to the same cell and
  pixel, from the same seed).

## Random numbers

- `$2B9E`: A = ROM[`$F000` + ROM[`$E000` + i]] EOR ROM[`$E800` + j], then i + 1 and
  j − 3 (`$0383`, `$0384`). The bytes come from the KERNAL ROM, which is banked
  in during play; the three pages it reads are identical in KERNAL
  revisions 901227-01, -02 and -03.
- j + 3i (mod 256) never changes, so the sequence repeats every 256
  numbers, on one of 256 separate cycles. The demonstration's seed has
  j + 3i = 0; the seed in the loaded file (`$07`, `$AA`) has 191.
- The seed is set only when the demonstration starts, so the first game
  after loading, started before the demonstration has run, uses the
  loaded seed, and any later game continues from where the last one left
  it. The title, the controls screen and the new-game set-up take no
  random numbers.

## Sound

- **Driver** `$C000`–`$CBE6`: `$C000` starts tune A (`JMP $CBC3`), `$C003` stops,
  `$C006` plays one frame. Tunes: 0 the main theme (the title `$5B8C`, every
  game start `$0A94`, M), 1 death and the demonstration's end (`$086E`), 2 the
  win (`$0861`). They are HVSC songs 1–3; HVSC's rip is `$C000`–`$CBE6`
  with a short stub in front.
- Tempo (`$C41B`) is 1, never written: a tick every two frames, 25 a second
  on PAL; `$1949` skips one call in six on NTSC (`$03DB`), so the tempo is the
  same.
- **Data**: a pattern entry is a flags-and-length byte (bits 0–4 length − 1
  in ticks, bit 5 tie, bit 6 rest, bit 7 an instrument byte follows) and a
  note; `$FF` ends a pattern. A track lists pattern numbers; `$FF` loops it and
  `$FE` stops the music. 41 patterns, 9 tracks, 17 instruments of 8 bytes
  (pulse, control, envelope, vibrato, pulse speed, effects: drum, slide,
  octave arpeggio); instrument 2 is never used. Patterns 37 and 40 start
  inside patterns 32 and 1, so tunes 1 and 2 reuse those phrases with
  another instrument.
- **Notes** (`$C32F`): 96, C0 to B7, tuned for PAL: A4 is `$1D46`, 440.1 Hz,
  and notes 0–94 are within 3.2 cents of equal temperament; the last entry,
  `$FD2E`, is exactly B7 on the NTSC clock.
- **Lengths**, by running the driver in a 6502 simulator on the snapshot's
  memory, at PAL's 50.12 frames a second (312 lines of 63 cycles): tune 1
  stops after 578 frames, 11.53 s, and tune 2 after 1,154, 23.02 s (HVSC
  0:12, 0:24). Tune 0 sets the master volume from voice 3's position in
  its track (`$C3F5`), which fades it from volume 14 at 4:27.8 to silence
  at 5:21.1 (HVSC 5:21); it loops after 16,800 frames, at 5:35.2.
- Starting a tune does not reset the tempo counter `$C41A`, the pulse
  timers `$C414`–`$C416` or the pulse directions `$C417`–`$C419`, so the exact
  sound of a tune depends on what played before it. The ring-modulated
  instruments 14 and 16 are only ever played on voice 2, so voice 1 is
  always their modulator.
- The page's player is a JavaScript port of the driver that matches the
  6502 code on every sound-chip register after every frame: 34,000 frames
  of tune 0, all of tunes 1 and 2, no difference.
- **Footsteps**: with the music off (M, `$03D1` = 0), band 1 plays a noise
  burst on voice 1 (`$2782`–`$27A2`: volume 15, frequency `$1000`, attack/decay
  `$00`, sustain/release `$53`, gate on and off) whenever `$03CF` is set: every
  third pixel the player moves (`$0D5D`) and every third sub-step of a
  footstep creature in sight (`$222E`) (*live*: ten bursts in 2.5 s of
  walking, none standing still). With the music on, the steps are silent.
- The filter registers `$D415`–`$D417` are never written.

## Hardware registers

From every code block (`$0802`–`$2F52`, `$3A40`–`$3BCA`, `$5B27`–`$5E43`,
`$C000`–`$C32E`, `$CBC3`–`$CBE6`).

| Register | Use | Where |
|---|---|---|
| `$D000`–`$D010`, `$D015`, `$D017`, `$D01B`–`$D01D`, `$D027`–`$D02E` | sprite registers, written by the play interrupt from `$3A00` (band 0) and `$3A20` (band 2) | `$26A5`–`$275B`, `$27ED`–`$287D` |
| `$D011`, `$D012`, `$D016`, `$D018` | the bands and the title's halves: mode, next raster line, bases | `$2632`–`$27E2`, `$0A18`–`$0A22`, `$5B3B`–`$5DA0` |
| `$D019`, `$D01A` | raster interrupt acknowledge and enable | `$2653`, `$5D08`; `$263F`, `$5B32`, `$5B9F`, `$5C4B` |
| `$D01F` | sprite-to-background collisions, read in two bands, collected into `$038D` in band 2 | `$267D`, `$27BB` |
| `$D020`–`$D023` | border, backgrounds, band 1's colour 8 | `$0A27`–`$0A36`, `$269F`, `$2770`, `$27E7`, `$5B54`–`$5C65` |
| `$D400`–`$D406`, `$D418` | voice 1 and volume, set directly for a footstep | `$2782`–`$27A2` |
| `$D400`–`$D406` per voice, `$D40B`, `$D412`, `$D418` | the music driver | `$C030`–`$C325` |
| `$D415`–`$D417` | never written: no filter | |
| `$D800`–`$DBFF` | colour RAM: the title's fill, the scroller row | `$5B6A`–`$5B73`, `$5E1A` |
| `$DC00` | joystick port 2 | `$0CC6` |
| `$DC0D` | read to acknowledge a CIA interrupt in play | `$265D` |
| `$DD00`, `$DD02` | VIC bank per band and per title half | `$268D`–`$269A`, `$27C4`–`$27D3`, `$5C3B`–`$5C48`, `$5D35`–`$5D70` |

The keyboard comes from the KERNAL's scan (`$C5`, `$028D`); `$DC01`, the CIA
timers and `$D01E` are never touched.

## Leftovers

- `$41D9`–`$4587`: 943 bytes of a machine-code monitor, never referenced and
  unable to run in this layout (its own `JSR`s land in the game's tables).
  Its remains also fill the unused object entries of several creature
  tables, among them an Apple II disassembler's format table at
  `$4F06`–`$4F45`.
- `$A477`–`$A47D` and `$A4DB`–`$A4EF`, inside the tile colour table, hold 6502 code
  bytes in entries no tile uses.
- `$9FFC`–`$9FFF`, the map's last four cells, hold `5A 4F 4F 4D` sealed in rock.
- Code that cannot take effect: WALK's handler (never offered), the fire
  test after a timed verb, the mace and wooden-dagger roll bonuses, the
  shields' protection, and two `JMP $C328` in the music driver that follow
  unconditional jumps (`$C074`, `$C09B`).

## Live tests

Run on VICE via vice-mcp (build in `game.json`), from the snapshots in
`orientation.md`.

| Test | Result |
|---|---|
| RESTORE with a stopping checkpoint on `$0818` | stopped there; the title came back |
| Reset, then `$00`/`$01` and the CPU's view of `$A000` and `$AC00` | `$00`/`$17`, BASIC ROM bytes where play shows the game's tables; title colours scrambled, empty view window |
| M in the menu | the music stopped; a second M started it |
| B and stick down on the controls screen | the five instruction pages |
| Amulet poked into the right hand, player onto `$9677`, PUT DOWN | `$03C7` = `$7B`, the ending |
| RUN with the music off | ten noise bursts in 2.5 s of walking, none standing still |
| RUN for 17.6 s | the clock advanced 21 seconds |
| CTRL+R on the title, a walk, then F | `$03D3` = 1; the buffer at `$A540` took a new seed and the walk's records; F ended the game with the end mark `$EF` at `$A561` |
| A second recording (up, left, down from the start), then the title left to run | the next demonstration started from the saved seed and walked the same cells, `$947B` to `$9479`, ending at the same pixel |
| MAGIC MISSILE at a skeleton, both vampires and the minotaur, from six random states | the same four results every time: 20 → 5, 50 → 50, 50 → 35, 50 → 50 |
| INVENTORY with fire held during its passes, and without | 12 passes both times (checkpoint count on `$08E1`, with the interrupt as a control) |
| The view window against the map in play-run | cell for cell, centred on `$93F8` |
| Non-stopping checkpoints on the title interrupt for exactly 100 frames | `$5D08` 12,685 entries, `$5D12` 12,586, the two raster halves 99 each |
| The player in level 3's narrow corridor (`$93C0`) at in-cell x = 2 to 6, stick up for 2.5 s | only x = 4 moved (to `$91C0`); the others stayed where they were, bouncing |
| The player placed on the floor left of the pool edge `$9BAA` (level 2), then the stick right | he entered `$52`; the menu offered OPEN; OPEN printed OPEN DOOR. and changed no map byte |
| Body 0, the minotaur put on the player's cell, RUN | "THE MINOTAUR ATTACKED YOU WITH ITS SWORD. HE HIT. YOU+RE DEAD..."; `$24DE` and the tune-1 call `$086C` each ran once |
| A skeleton with body 10, MAGIC MISSILE | "YOU KILLED THE SKELETON.", body `$FF`, a band-2 sprite enabled (`$3A30` = 1): DEAD over the picture |
| The trainer's two patches (cheats.md) | body 5 kept through twelve of the minotaur's hits; MAGIC MISSILE left mind at 30 (24 without) |
| Wearing armour and two shields (60), PICK UP a shield, a mace, a potion | the shield refused with the weight message; the mace (68) and the potion (69) taken; PUT DOWN, SWAP and DRINK then offered |
