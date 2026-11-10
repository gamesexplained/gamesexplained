# Boulder Dash — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

One program file, `BOULDER DASH`, 16,499 bytes, on a disk named `C64.COM`. A BASIC stub (`SYS 2088`) starts a copier at `$0828` that moves `$0870`-`$4870` to `$5000`-`$8FFF` and jumps to `program_entry` (`$8E69`). The title shows "(C)1984 First Star Software Inc."

## Memory layout

| Thing | Where |
|---|---|
| Copier and BASIC stub | `$0801`-`$086F` in the file |
| Cave map, 40 by 22 object codes | `$0850`-`$0BBF` (row `y` from 2, `row_address_table`, `$8406`) |
| Cave header (32 bytes) and object records | `$2400`-`$24EF`, copied from `$582E` + table at `$5804` |
| Text set, copied to `$2000` | `$5000`-`$53AF` |
| Tile set, copied to `$3000` | `$5FE8`-`$63E7` |
| Tables: neighbours, scroll rows, animation frames | `$53B0`-`$5803` |
| Cave offsets and 20 cave descriptions | `$5804`-`$5EA7` |
| Demonstration script | `$5EA8`-`$5EE7` |
| Remap table, object-to-tile table, handler table | `$5EE8`, `$5F28`, `$5F68` |
| Title tune (first 256 bytes of the tile set) | `$5FE8`-`$60E7` |
| Rockford frame tables | `$63E8`-`$66E7` |
| Title map templates | `$66E8`-`$68E7` |
| Frame blocks copied to `$3840` (no reader found) | `$68E8`-`$6E67` |
| Code | `$6E68`-`$8F65` |
| Scroll buffer, 80 by 44 characters | `$4000`-`$4EC2` |
| Variables | `$9800`-`$9DFF` |

## Timing

The raster interrupt (`$8A0C`) runs the frame update (`$7EC3`) in play and the title step (`$87EE`) at the title. The frame clock (`$74A9`) counts 60 frames to a second. The update pass over the cave (`update_pass`, `$8171`) runs from the main loop, and on the easier levels is slowed by a delay loop of 12, 6, 3, 1 or 0 passes per cell row for levels 1 to 5 (`time_delay_table`, `$8065`, `short_delay`, `$806A`).

## Controls

Joystick port 1 (`$DC01`) in play and at the title; port 2 (`$DC00`) for player 2 when two joysticks are chosen (`rockford_handler`, `$762C`). F3 cycles one player, two players on one joystick, two players on two (`menu_keys`, `$880F`). At the title left and right choose the cave in steps of four (A, E, I, M) and up and down the level (`menu_cave_select`, `$884A`). SPACE pauses, RUN/STOP ends the cave, F1 restarts the program (`$8103`). *Live:* fire on port 2 did nothing at the title; port 1 held for about half a second started play.

## Graphics

Multicolour characters. Colours: black, header bytes 19 and 20 (`$D022`, `$D023`) and header byte 21 for the cave's colour (`load_cave_data`, `$8226`). A tile is four characters, code, +1, +$10, +$11 (`$7018`). Object-to-tile table at `$5F28`. The animated tiles (diamond, firefly, butterfly, amoeba) take eight phases of 16 bytes per row from the tables at `$5406`, `$5506`, `$5606`, `$5706` and their `+$80` partners (`build_animation_frames`, `$7C61`).

## Mechanics

- Objects: `$00` space, `$01` dirt, `$02` brick wall, `$03` magic wall, `$04` closed exit, `$05` open exit, `$07` steel, `$08`-`$0B` firefly (left, up, right, down), `$10` boulder, `$14` diamond, `$25` entrance, `$30`-`$33` butterfly, `$38`-`$39` Rockford, `$3A`-`$3B` amoeba by the tile table. The map objects and their handler words are at `$5F68`, indexed by twice the object code (`update_pass`, `$8171`).
- "Handled" twins of the moving objects (for example `$11` and `$13` for the boulder, `$15` and `$17` for the diamond) have no handler, so a moving object is stepped once a pass; the remap table at `$5EE8` turns them back as the scan reaches them (`end_of_object`, `$81AD`).
- Cave build: seed `header[4 + level]`, 16-bit generator (`$7085`) over rows 1 to 21 (21 rows) and columns 0 to 39; a cell takes the last of four header codes (bytes 24 to 27) whose threshold (bytes 28 to 31) its random byte is below, else dirt; then the steel border (`$85A7`); then the records from `$2420` (`$8518`). *Live:* the page's reimplementation matches the emulator's map of cave A level 1 in all but 33 cells, and those are Rockford and boulders that fell during play.
- Records: top two bits of the first byte select a point (3 bytes), line (5 bytes: x, y, length, direction in the eight steps of `$8454`), filled rectangle (6 bytes: x, y, width, height, inner object) or outline rectangle (5 bytes); low six bits are the object. Rows are `y - 2` (`$8436`).
- A boulder is pushed one time in four (`push_succeeds`, `$7543`: random byte AND 3 equals zero).
- A boulder or diamond landing on Rockford or a creature explodes the 3 by 3 cells around the cell below it (`explode_cell_below`, `$70BA`). A firefly explodes to space, a butterfly to diamonds (`explosion_next_table`, `$764F`).
- The amoeba turns to boulders when the previous pass counted 200 of it, and to diamonds when it had no room (`amoeba_handler`, `$7368`).
- Score: each diamond adds header byte 2 before the quota and byte 3 after (`check_quota`, `$74F6`); the time left is counted into the score at level plus one points per second (`time_bonus_tally`, `$8BF0`); a man is added when the thousands and hundreds digits show a new multiple of 500 (`check_bonus_life`, `$73DE`).

## Data tables

Cave offsets `$5804`; cave order `$81FE` (two bytes a cave: the next cave and the intermission flag); cave animation mask `$8740`; scroll speeds `$7833`, `$783F`; direction steps `$8454`.

## Sound

Three SID voices. The title tune alternates two voices through 128 pairs of note numbers from `$5FE8`, indexing the note table at `$86CA` (`music_step`, `$8754`); one pair lasts eight frames. Effects use register tables at `$7522`, `$71E7`, `$713D` and `$7418`.

## The listing's error rate

A sample of 60 of the 358 comments, seed 2611, checked by one agent on `claude-opus-5-5`: 20 wrong (33 %, 95 % interval 23 % to 46 %), all corrected along with the comments that share their templates. An audit of every comment is recommended.

## Live tests

- The game boots from the image in VICE 3.14 and the demonstration runs at the title.
- Fire on joystick port 1 starts cave A level 1; the map at `$0850` was read from the snapshot and compared with the recipe above.
