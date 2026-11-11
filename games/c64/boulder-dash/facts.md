# Boulder Dash — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

## Build

One program file, `BOULDER DASH`, 16,499 bytes, on a disk named `C64.COM` (`orientation.md`). A BASIC stub (`SYS 2088`) starts a copier at `$0828` that moves the 16,384 bytes `$0870`-`$486F` to `$5000`-`$8FFF` and jumps to `program_entry` (`$8E69`). The title's logo reads "(C)1984 First Star Software Inc."

## Memory layout

| Thing | Where |
|---|---|
| Copier and BASIC stub | `$0801`-`$086F` in the file |
| Cave map, 40 by 22 object codes | `$0850`-`$0BBF` (row `y` from 2, `row_address_table`, `$8406`) |
| Cave header (32 bytes) and object records | `$2400`-`$24EF`, copied from the cave's description (offsets at `$5806`) |
| Text set, copied to `$2000` | `$5000`-`$53AF` (the copy takes `$5000`-`$53FF`) |
| Tile set, copied to `$3000` | `$5FE8`-`$63E7` |
| Tables: neighbours, scroll rows, animation frames | `$53B0`-`$5805` (the butterfly frames' last two bytes, `$5804`-`$5805`, are also entry 0 of the cave offsets, which no cave uses) |
| Cave offsets (20 words, caves 1 to 20) and the 20 cave descriptions | `$5806`-`$5EA7` |
| Demonstration script | `$5EA8`-`$5EE7` |
| Remap table, object-to-tile table, handler table | `$5EE8`, `$5F28`, `$5F68` |
| Title tune (first 256 bytes of the tile set) | `$5FE8`-`$60E7` |
| Rockford's frame tables, six of 128 bytes | `$63E8`-`$66E7` |
| Title screen templates, text-set screen codes for the big BOULDER and DASH | `$66E8`-`$68E7` |
| Title logo: copied to the bottom six character rows of the multicolour bitmap at `$2000` (`$37C0`-`$3F3F`, `init_graphics`, `$8D46`) | `$68E8`-`$6E67` |
| Code, with texts and tables among it | `$6E68`-`$8F3C` |
| Leftover assembler symbol table, read by nothing | `$8F3D`-`$8FFF` |
| Scroll buffer, 80 by 44 characters | `$4003`-`$4DC2`, with steel-wall padding at `$4000`-`$4002` and `$4DC3`-`$4EC2` (`buffer_edge_fill`, `$7AE5`) |
| Variables | `$9800`-`$9883` |
| Screen-copy code, copied from `$7EF0` and `$7FF0` | `$9E00`-`$9FFF` |

## Timing

The raster interrupt (`$8A0C`) splits the screen at two lines and runs the frame update (`$7EC3`) once a frame in play, and the title step (`$87EE`) at both lines at the title. The frame clock (`$74A9`) counts 60 frames to a game second, and the magic wall's own clock does the same (`$7E9F`). That is a real second at 60 frames a second (NTSC) and 1.2 seconds at 50 (PAL). *Live:* on the First Star PAL disk, which has the same clock, 600 frames took ten off the cave's time. The update pass over the cave (`update_pass`, `$8171`) runs from the main loop, and on the easier levels is slowed by a delay loop of 12, 6, 3, 1 or 0 passes per cell row for levels 1 to 5 (`time_delay_table`, `$8065`, `short_delay`, `$806A`). The animation steps every second frame (`animation_step`, `$7E8F`, reached through the screen copy at `$9F2E`).

## Title and menu

The first title after the program starts shows the First Star Software logo, a multicolour bitmap below raster line `$CA` (`vic_split_title`, `$899C`), while the flag `zpa_A3` is set. `reset_game` sets it at start, after RESTORE (the NMI vector points at `$8E69`) and after F1 in play (`$8E01`). While it is set, `menu_loop` does not read the fire button (`$8918`). F1 clears it and shows the menu with BY PETER LIEPA, WITH CHRIS GREY and PRESS BUTTON TO PLAY (`$88CA`, `build_menu_screen`); otherwise the demonstration starts once the tune has played twice with no F3 or joystick, and the title after it has no logo (`$8F22`). *Live:* on the First Star PAL disk, fire held for two seconds on the first title did nothing; after F1 it started cave A.

## Controls

Joystick port 1 (`$DC01`) in play and at the title; port 2 (`$DC00`) for player 2 when two joysticks are chosen (`rockford_handler`, `$762C`). F3 cycles one player, two players on one joystick, two players on two (`menu_keys`, `$880F`). At the title up and down choose the level, and left and right choose the cave in steps of four (A, E, I, M) at levels 1 to 3; raising the level to 4 sets the cave back to A and right is ignored at levels 4 and 5, so those levels start in cave A (`menu_cave_select`, `$884A`). SPACE pauses; RUN/STOP gives up the cave once its opening countdown is over, costing a man outside the bonus caves; F1 in play restarts the program (`pause_and_restart_keys`, `$8103`). After Rockford dies, fire ends the cave once no Rockford has been handled for 16 passes and the cave's clock has started (`check_restart_fire`, `$815B`).

## Graphics

Multicolour characters. Colours: black, header bytes 19 and 20 (`$D022`, `$D023`) and header byte 21 for the cave's colour (`load_cave_data`, `$8226`). A tile is four characters, code, +1, +$10, +$11 (`$7018`). Object-to-tile table at `$5F28`. The animated tiles (diamond, firefly, butterfly, amoeba) take eight phases of 16 bytes per row from the tables at `$5406`, `$5506`, `$5606`, `$5706` and their `+$80` partners (`build_animation_frames`, `$7C61`), written to `$3100`-`$33AF`. Caves A to P rebuild only the creatures their mask byte at `$8740` names; the bonus caves rebuild all three (mask 7, `$8325`). Rockford's tile, characters `$4C`, `$4D`, `$5C` and `$5D`, is rebuilt from six 128-byte tables at `$63E8` (`build_rockford_frame`, `$7BC2`): blinking for the upper half and foot-tapping for the lower when he stands still, two sets for walking left and two for walking right. In play, sprites 0 to 6, black and doubled in width, form a band across the screen at y `$3A`, just below the status line (`$8D9A`-`$8DC8`, `$8A88`).

## Mechanics

- Objects: `$00` space, `$01` dirt, `$02` brick wall, `$03` magic wall, `$04` closed exit, `$05` open exit, `$07` steel, `$08`-`$0B` firefly (left, up, right, down), `$10` boulder, `$14` diamond, `$25` entrance, `$30`-`$33` butterfly, `$38`-`$39` Rockford, `$3A` amoeba (`$3B` a piece grown this pass). The map objects and their handler words are at `$5F68`, indexed by twice the object code (`update_pass`, `$8171`).
- "Handled" twins of the moving objects (for example `$11` and `$13` for the boulder, `$15` and `$17` for the diamond) have no handler, so a moving object is stepped once a pass; the remap table at `$5EE8` turns them back one row up and one column left of the cell being handled, after the scan has passed them (`end_of_object`, `$81AD`).
- Cave build: seed `header[4 + level]`, 16-bit generator (`$7085`) over rows 1 to 21 and columns 0 to 39; a cell takes the last of four header codes (bytes 24 to 27) whose threshold (bytes 28 to 31) its random byte is below, else dirt; then the steel border (`$85A7`); then the records from `$2420` (`$8518`). The generator adds to each byte of the seed its own bit 0 as bit 7, plus `$13` for the low byte and the old low byte halved for the high byte, each addition taking the carry of the one before. *Live:* the page's reimplementation matches the emulator's map of cave A level 1 in all but 33 cells, and those are Rockford and boulders that fell during play. The game's own builder, run in a 6502 simulator, gives the Maps tab's map for all 20 caves and 5 levels.
- Records: top two bits of the first byte select a point (3 bytes), line (5 bytes: x, y, length, direction in the eight steps of `$8454`), filled rectangle (6 bytes: x, y, width, height, inner object) or outline rectangle (5 bytes); low six bits are the object. Rows are `y - 2` (`$8436`).
- `random_byte` (`$6E68`) mixes the free-running CIA timers. It serves the amoeba, the boulder push, Rockford's blinking and foot-tapping, the glisten, the cave's opening reveal and closing wipe, and the sounds. The fireflies and butterflies make no random choices.
- A boulder is pushed one time in four (`push_succeeds`, `$7543`: random byte AND 3 equals zero).
- A boulder or diamond resting on a boulder, diamond or brick wall rolls off sideways, left first, when the cell beside it and the cell below that are both empty (`$7330`-`$735E`, `$770D`).
- A boulder or diamond landing on Rockford or a creature explodes the 3 by 3 cells around the cell below it (`explode_cell_below`, `$70BA`); on anything else it stops or rolls off. A firefly explodes to space, a butterfly to diamonds (`explosion_next_table`, `$764F`). Explosions spare only steel wall (`explode_neighbour`, `$70AE`). A firefly or butterfly also explodes next to Rockford or the amoeba (`rockford_or_amoeba_adjacent`, `$7159`).
- The amoeba turns to boulders when the previous pass counted 200 of it, and to diamonds when a pass finds no room after a pass that found some (`amoeba_handler`, `$7368`, `end_of_pass`, `$813B`). An amoeba that never had room never changes.
- Magic wall: the first boulder or diamond that falls onto it turns it on (`zpa_8D` 0 to 1). While it is on, the object comes out two cells lower as the other kind if that cell is empty, and is lost if it is not. After the number of seconds in header byte 1 the wall takes the brick pictures back (`$7E84`) but stays object `$03`, and a boulder or diamond that falls onto it is lost (`$72B7`-`$72C9`, `$775F`-`$7775`). The wall's clock stops only while the pause flag `zpa_9B` is 1; the pause screen raises it to 2 on its first flash (`$80D7`), so the wall's time runs on through a pause, while the cave's clock (`$74B5`) and the sound (`$7D0E`) stop.
- A falling boulder that lands on the magic wall, on or off, leaves its handler by `JMP diamond_sound` (`$7775`). Handlers are entered by `JMP (zpa_38)` (`$81AA`), so the `RTS` at `$71E6` ends `update_pass`: the cells after it are not updated in that pass, and the remap, the delay and the key check are skipped.
- Score: each diamond adds header byte 2 before the quota and byte 3 after (`check_quota`, `$74F6`); byte 3 is 0 in caves C, K and L and the four bonus caves. The time left is counted into the score at as many points per second as the level number, 1 to 5 (`time_bonus_tally`, `$8BF0`). A man is added when the thousands and hundreds digits show a new multiple of 500 (`check_bonus_life`, `$73DE`); that test works because no diamond is worth more than 90.
- Bonus caves (17 to 20, after D, H, L and P, `cave_order_table`, `$81FE`): each is a 20 by 12 room walled in steel, the update pass covers only rows 1 to 14 there (`$8175`-`$817D`), entering one gives a man (up to nine, `show_cave_name`, `$83A9`), and losing there costs none (`$8C50`-`$8C57`).
- Two players: the turn passes when a man is lost, and only to a player who still has men (`lose_life`, `$8B05`).
- The opening countdown is 4 game seconds, 6 for two players sharing one joystick, and one more in cave B (`$8305`-`$831F`).

## Data tables

Cave offsets `$5806`; cave order `$81FE` (two bytes a cave: the next cave and the intermission flag); cave animation mask `$8740`, caves 1 to 16; scroll speeds `$7833`, `$783F`; direction steps `$8454`. Header bytes 0, 22 and 23 have no reader: only the copy at `$8248` touches them.

## Sound

Three SID voices. The title tune plays two voices together through 128 pairs of note numbers from `$5FE8`, the first of each pair for voice 2 and the second for voice 1, indexing the note table at `$86CA` (`music_step`, `$8754`); one pair lasts eight frames. Most effects use register tables at `$7522`, `$71E7`, `$713D` and `$7418`, played by `sound_update` (`$7D09`); the explosion, the low-time beep and a few short ticks write the SID directly. Once the low-time beep has sounded, the step and dig notes are silent until the next cave's opening (`$7459`, `$7DD7`).

## Leftovers

`$8F3D`-`$8FFF` hold the tail of an assembler's symbol table: 12-byte entries of a six-character name, `$A8 $00`, the label's value and two flag bytes. Sixteen survive, for `$8A63` to `$8B18`: KEY1 `$8A66`, :SK3A `$8A74`, :SK4 `$8A84`, :EXIT `$8A90`, KEY `$8A9B` (`joystick_overrides_keys`), :SK1 `$8AB8`, SETUP0 `$8AB9` (`set_up_cave`), GMINIT `$8ADD` (`new_game`) with :LOOP1, :LOOP3 and :LOOP5, and NXTPLY `$8B05` (`lose_life`) with :LOOP1, :SK1 and :LOOP2. A last entry, :SK2, is cut off at `$8FFF` with the value bytes `$1F $FF`.

## The listing's error rate

The run's sample of 60 of the 358 comments, seed 2611, checked on `claude-opus-5-5`, found 20 wrong. The maintainer's sample, seed 30830, found 22 of 60 wrong (37 %). Four checkers then audited all 358 comments and corrected 152, and a fifth audited this file, `features.md` and the pages. A second maintainer's sample, seed 51110, found 4 of 60 wrong (6.7 %, 95 % interval 2.6 % to 15.9 %), each a detail: two comments leave out a path the game can reach, and two misquote text. All four were corrected.

## Live tests

- The game boots from the image in VICE 3.14 and the demonstration runs at the title.
- Fire on joystick port 1 starts cave A level 1; the map at `$0850` was read from the snapshot and compared with the recipe above.
- On the First Star PAL disk, in VICE 3.14 as a PAL machine: the first title shows the logo, fire does nothing until F1, and 600 frames take ten off the cave's time.
