# North & South — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names the
routine or table it comes from, and every address its part. Unless marked
*live*, a fact comes from reading the code in the part's snapshot named in
`orientation.md`. What is true of one part is in that part's
`parts/<id>/facts.md`; this file holds what spans the parts, the error
rate and the live tests.

## Build

The PAL cassette release on four sides with the Cyberload fast loader, as
the Ultimate Tape Archive V4.0 has it (entry 7562), checked against
`orientation.md`'s table of files. No version string was found; the
loader carries the text "HACKERS, FUCK OFF AND DIE..." (at `$F2CC` while the menu
runs, outside every part's files).

## Memory layout

| Thing | Where |
|---|---|
| The boot left in the cassette buffer: the banner, the header's code | resident `$02A7`-`$03FD` |
| The settings and results the parts hand to each other | resident `$037E`-`$039B` ("How the parts connect") |
| The script, the tape prompt and the Cyberload loader | resident `$0800`-`$0BFF` |
| The title | title part, `$1800`-`$9FFF` |
| The menu, and the sound player the later parts share | menu part, `$1000`-`$ABFF` and `$F632`-`$FFF9` |
| The strategic map, with that sound player at `$F128` | map part, `$0C00`-`$C4FF` and `$E000`-`$FFF9` |
| The battle | battle part, `$3000`-`$CFFE`, entered at `$8000` |
| The fort | fort part, `$2000`-`$9FFF`, entered at `$8000` |
| The train | train part, `$2000`-`$9FFF`, entered at `$8000` |
| The ending | ending part, `$2800`-`$AF3F`, entered at `$8000` |

## How the parts connect

The resident's script (`$0806`) loads every file through one routine,
`load_file` (`$0803`, A the file's number, 0 to 13, the names at `$0912`:
OC OM M1 M2 M3 S1 S2 TP BS T1 T2 T3 T4 CS). It shows the rewind prompt
(`$092E`) before the first file of a side (`$0904`), with the cassette and
side from `$08F6` and `$08E8`. The order: the title (TP, `$8000`); then for
ever the menu (OC, OM, `$1000`), the start year's text (T1 to T4 by
`$0389`, shown by `$09EC`), the map (M2, M1, M3, `$0C00`), and when the map
returns with `$039B` at 0, the ending (CS, `$8000`).

The map calls each arcade sequence itself: the battle loads file 8
(`$0CA6`), the fort file 5 (`$0C8A`), the train file 6 (`$0C98`), each
called at `$8000`; afterwards the map reloads M2 (`$0CB1`), which the
sequence overwrote, and sets itself up again (`$0CF8`).

The parts hand values to each other in the resident's page 3:

| Address | What |
|---|---|
| `$037E` | the start year, kept for the menu's calendar |
| `$037F` | 0 until the menu has run once (it then sets the defaults, menu `$1878`) |
| `$0380`, `$0381` | each side's level, 0 to 2 (corporal, sergeant, captain) |
| `$0382`, `$0383` | 1 when the computer plays the Union, the Confederacy |
| `$0384`-`$0386` | the Indians, the storm, the European reinforcements on |
| `$0387` | the arcade sequences on (0: the strategic game decides them) |
| `$0388` | the keyboard instead of the joystick, when one person plays |
| `$0389` | the start year 0 to 3, and the year as the war goes on |
| `$038A`-`$038F` | the two sides' infantry, cavalry and cannon for a battle, and what is left after it |
| `$0390`, `$0391` | each side's territory to fall back to, `$FF` for none |
| `$0392`-`$0395` | who fell back, who is out of the battle |
| `$0396`, `$0397` | the attacker of a fort or train, and its result (1 won) |
| `$0398` | the side that won the war |
| `$0399`, `$039A` | the months the war has lasted, two digits |
| `$039B` | 1: no ending (the Commodore key stopped a game the computer played on both sides, map `$1173`) |

## Timing

Every part's work runs from raster interrupts, once a frame (PAL, 50 a
second); each part's timers count frames ("the battle's fifteen timers",
battle `$87A7`; the fort's thirteen, fort `$8934`). The fort's clock moves a
pixel every 14 frames from x `$24` to `$132`, 3,780 frames, about 76
seconds (fort `$8945`); the train's every 8 frames, 2,160 frames, about 43
seconds (train `$8ADE`).

## Controls

| Where | Controls |
|---|---|
| Menu | joystick 2 or P L Z X and space, a cursor clicking the panels (menu `$19B9`) |
| Map | joystick 2, or with two people the Union on joystick 2 and the Confederacy on joystick 1; one person may use P L Z X and space (map `$24A2`); the Commodore key stops the computer's game when it plays both sides (map `$1162`); no pause: no instruction of the map compares a key with H |
| Battle | each side's stick; RUN/STOP (the Union) or F5 (the Confederacy) chooses the unit; E (the Union) or the up-arrow (the Confederacy) falls back; H pauses; one person on the keys: Z X P L and space (battle `$888C`, `$979D`) |
| Fort and train | the attacker's and the defender's sticks, the same keys for one person; H pauses (fort `$8219`, `$8236`) |
| Ending | space or fire ends it (ending `$815D`) |

## Graphics

Multicolour bitmaps in video bank 1 for the title's scenes, the menu, the
map, the battle and the ending (bitmap `$4000`, screen `$6000`);
multicolour characters with a 38-column scroll for the fort and the train
(characters `$4000`, screen `$4800`). The title and the ending put a text
band at the top of a bitmap by changing `$D011`/`$D018` at a raster line.
The soldiers on the battlefield are masks cut into the bitmap, black
figures (battle `$91B1`); everything else that moves is a sprite,
multiplexed to more than eight on the map (`$11C1`), in the battle, the
fort and the train.

## Mechanics

The rules are in the parts' facts: the war in `parts/map/facts.md`, the
battle, fort and train in theirs. What each part reads from the others is
in "How the parts connect".

The levels (resident `$0380`, `$0381`) count two ways. Where the arcade
parts and the map's computer read them, level 2 is the strongest for the
side that has it: the computer acts on every pass of a battle (battle
`$9D14`), a defender's fort and train are the longest with the most guards
and the dog runs most (fort `$89B7`, `$92EF`; train `$8B50`), and the
computer's map scores get no noise (map `$3ECA`). The strategic odds read
the defender's level for a fort or a train and the firing side's for a
battle's round, and there level 0 is the strongest: a defender at level 0
loses with a random number from `$7F` up, at level 2 from `$3F` (map
`$2DBB`); a side at level 0 makes the other lose a unit with one from `$3F`
up, at level 2 from `$7F` (map `$32B0`). The manual calls the corporal,
level 0, the hardest.

The computer's plan (map `$3C98`) is 0 to 4, but only plans 0, 1 and 3
change anything: `ai_plan_scores` (map `$3D09`) returns for 2 and 4, and
the only other reader of `$0F10`, `ai_occupied` (map `$3E11`), tests for 3.
Plan 2, set when the European reinforcements are on and South Virginia is
not the computer's, plays as plan 4.

## Data tables

The parts' own: the map's territories and railway (`parts/map/facts.md`),
the battle's fields and hazards, the fort's and train's tile maps.

## Sound

Two drivers. The tune driver of the title (title `$9000`) and its later
build in the ending (ending `$3000`): three voices read order lists and
patterns, with instruments of eight bytes, vibrato, pulse, waveform and
note programs and arpeggios; the ending's adds a glide (pattern byte `$FD`)
and an arpeggio base (order bytes `$50`-`$5F`), and uses its detune byte.
The sound player of the menu, the map and the arcade parts (map `$F128`,
entry points `$F128` init, `$F12B` start sound A, `$F12E` play a frame,
`$F134` fade), whose sounds the arcade parts start by number (battle
`$A8EE`, fort `$9E9D`, train `$9C15`), with a flag so the interrupt does
not play while a sound is being started.

## Text

| Where | Encoding |
|---|---|
| The tape prompt (resident `$0981`), the loading banner (resident `$02EE`) | screen codes, the ROM's upper-case set |
| The year texts (files T1-T4) | left at `$0400` by the file, shown in the ROM's lower- and upper-case set (resident `$09EC`) |
| The title's credits (title `$8584`) | screen codes, in the title's own font (title `$7800`) |
| The month names on the map's band (map `$BF96`) | letters less `$40` as an index into the band's font (map `$B7A0`), digits from map `$B878` |
| The ending's messages (ending `$847B`-`$86E3`) | screen codes, in the same font as the title's (ending `$7800`, the same bytes) |
| The key tables (each part) | PETSCII |

The rest of the words the player sees (the menu's panels, the battle's
icons, the fort's and train's bars) are pictures. The string sweep
(`kit/cpu/strings.py`, every part) found no other text.

## Hardware registers

From the census of every part (`kit/cpu/census.py`, each part's snapshot).

| Register | What the game does with it | Where |
|---|---|---|
| `$D000`-`$D010`, `$D027`-`$D02B` | sprites placed directly (title, menu, the fort's and train's bars) or by a multiplexer | map `$11C1`, battle `$8A2B`/`$8A9A`, fort `$83A8`/`$8485`, train `$83AA`/`$84DE` |
| `$D011`, `$D012`, `$D019`, `$D01A` | raster interrupts in every part, several a frame | each part's interrupts |
| `$D016` | the fort's and train's fine scroll, set by line; 38 columns | fort `$844C`, train `$8445`-`$849B` |
| `$D018`, `$DD00`, `$DD02` | video bank 1 and its memory in every part but the resident's text screens | each part's set-up |
| `$D01C`, `$D017`, `$D01D` | sprites multicolour, never stretched | each part's interrupt start |
| `$D020`-`$D024` | border, background, multicolours; the train's background changes at line `$44` | each part |
| `$D025`, `$D026` | sprite multicolours | each part |
| `$D400`-`$D418` | the SID, through the two drivers ("Sound") | |
| `$DC00`-`$DC03` | joysticks and the keyboard matrix, every part | |
| `$DC04`, `$DC05`, `$DC0D`, `$DC0E` | CIA 1's timer A for the tape's pulses, the loader only | resident `$0A91`, `$0ACB` |
| `$DD01`, `$DD03` | the user port, read and written only by code nothing calls | battle `$8110`, `$CE00` |

Never named by any instruction: the light pen (`$D013`, `$D014`), sprite
priority (`$D01B`), the sprite collision registers (`$D01E`, `$D01F`),
the paddles and voice 3's oscillator and envelope (`$D419`-`$D41C`), CIA
1's timer B, time-of-day clock and serial port. Every hit in the arcade
parts is a box test of the game's own coordinates, and every random
number comes from the software generator (title `$82BC`, map `$0F1F`,
battle `$9073`, fort `$8ADE`, train `$8C6F`), whose seed bytes start as
the text "random".

## Leftovers in the files

Several files carry bytes of other files, saved with them from the
developers' memory and never read: the battle file a monitor that talks
over the user port (battle `$CE00`-`$CFDD`, reached only from battle
`$8110`, which nothing calls); the fort file the battle's packed canyon
(fort `$3540`-`$3FFF`) and an earlier build of the battle's code (fort
`$9EB2`-`$9FFF`, 326 of its 334 bytes the battle's `$9EC8`-`$A015`); the
train file the fort's map and code (train `$2E28`-`$3FFF`,
`$9C2A`-`$9FFF`); the ending's tunes the bytes of a picture after them
(ending `$3BE9`-`$3FFF`). Where these files hold nothing else, they hold a
C64's power-on pattern (`$00 $00 $FF $FF`).

## The listing's error rate

- Sample, seed 20261029: 65 of the 2,946 line comments of the eight
  parts, in two strata: 45 of the 2,195 written by hand and 20 of the 751
  a script wrote from templates (`work/draw.py`). The checker, on
  claude-fable-5-1, found 6 wrong in a detail and none wrong outright, all
  six hand comments: `attacker_climb` (fort `$910A`) put the fine scroll
  before the climb, where the two run together; `map_rnd` (map `$0F1F`)
  left out the carry the second add takes from the first, as the title's
  `title_rnd` (`$82BC`) did; `bag_fall` (map `$3816`) described the bag
  moving, which it never does; `ai_plan_scores` (map `$3D09`) said a large
  army's score wraps to 0, where the loop leaves it as it was, and no army
  is that large; `pic1_after` and `pic2_after` (title `$3F40`, `$5F40`)
  described bytes as one fill where they are not. All six were corrected,
  with `title_rnd`, which said the same as `map_rnd`. The checker also
  found `save_window`'s two registers swapped (map `$331A`) beside a
  comment it marked right, and two callers that store A where they had
  just loaded X (map `$23CF`, `$2422`); those were corrected too.
- The plain rate is 6 in 65, 9.2 % (95 % interval 4.3 % to 18.7 %); the
  hand comments' is 6 in 45 (6.3 % to 26.2 %) and the templates' 0 in 20
  (0 % to 16.1 %), so the rate weighted by the strata's sizes is 9.9 %.
  That is over the mark of 2 in 60. A checker misses some, so these are
  lower bounds. An audit of every comment is recommended (`TODO.md`).

## Live tests

All in VICE v3.13.2 (barryw/vice-mcp build), 29 October 2026, through
`kit/c64/vice.py`, on the four tape images.

- The game boots from `main.tap` through the title to the menu, and asks
  for each side in turn (`orientation.md`).
- The menu's calendar steps 1861 to 1864, and each year's text shows
  before the map (`reference/year-text-1861.png`,
  `reference/year-text-1864.png`); clicking both flags puts a computer on
  each side and takes the joystick panel away
  (`reference/menu-1864-computers.png`).
- On the map the cursor follows joystick 2, space clicks, and an army's
  neighbouring territories flash when it is picked
  (`reference/map-army-selected.png`).
- With the computer on both sides of 1864 the battle and the fort load
  and play (`reference/battle.png`, `reference/fort.png`); the train was
  loaded by asking for its file (`orientation.md`) and plays
  (`reference/train.png`).
- The map of January 1861 that the map's own code draws for year 0 in the
  kit's simulator (`$23DC`, `$23E7`, `$28D3`, `$3B97`) is the emulator's
  picture (`reference/map-1861.png`) in all but the 184 pixels under the
  cursor sprite, once the month band's three routines (`$39B3`, `$3B0D`,
  `$1E84`) are run too: the How it works page's map widget, held by
  `test_map.js`.
