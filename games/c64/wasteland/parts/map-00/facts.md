# Map 0, the world map — verified technical facts

The desert between the places, the map the towns' exits lead out to. No message names it; the blocking squares round its edge say "You see miles and miles of endless wasteland." (message 25). It is 64 x 64 squares, stored on side 1 of the disks as 35 pages from T20/L9 (track 20, logical sector 9), entry 0 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$56FF` and unpacks its tile layer to `$DE00-$EDFF`. It is drawn with tile set 0 (tiles-0). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$3BFF` (a nibble a square) and the number layer `$3C00-$4BFF` (a byte a square). The map record is at `$4C00` because the map's byte in T35/L8 is `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$4C2C`, the size: 64, the width and the height (engine `enter_map`, `$25D3`).
- `$4C30`, the tile set: 0 (engine `$25EE`).
- `$4C33`, the tile drawn off the map: 27 (engine `draw_square`, `$0B5E`).
- `$4C2F`, random encounters: 1 chance in 100 after each step (game `random_encounter`, `$B017`). `$4C31`: monster types 1 to 5 (game `$B047`). `$4C32`: the groups take the first 10 class-15 records (game `$B040`).
- `$4C34`/`$4C35`, the time a step takes: 4 minutes (fraction 0, minutes 4; game `advance_clock` `$AF32`).
- `$4C36`, ticks: 16 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`). Game `health_tick` (`$B795`) runs whenever `$D2` reaches a multiple of 16 (game `$AF75-$AF7B`), here after every step.
- Squares, 4,096: 1,989 of class 0, 1,346 action squares (class 6), 510 blocking squares (11), 163 check squares (2), 36 radiation squares (9), 29 exits (10), 17 message squares (1), 4 remote-change squares (12) and 2 tile squares (4).
- Records, named by the class lists of header words 3-18 (`$4C06-$4C25`, engine `action_record` `$09B8`): 43 exits, 14 check squares, 10 random-encounter slots (class 15), 6 action squares, 4 remote changes, 3 tile squares, 2 message squares, 2 radiation squares and 2 blocking squares.
- Text: messages 0-65, packed from `$5123` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$5090` (header word 1, game `print_monster_name` `$9E5D`) are 1 Desert Dweller, 2 Wasteland Warrior, 3 Radioactive Vermin, 4 Wild Canine and 5 Slithering Iguana; name 0 is empty. The six 8-byte monster records start at `$50F3` (header word 2, game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$4C28`), the NPC list, is $0000.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 1, Quartz: exits 0-5 (`$4DED-$4E0A`) on (28-30,43-44), message 1, "Entering Quartz.".
- To map 8, Desert Nomads: exit 6 on (43,46). To map 9, Agricultural Center: exit 7 on (36,55). To map 10, Highpool: exit 8 on (47,59).
- To map 12, Las Vegas: exits 13-20 on (21-23,16-18). To map 26, Needles: exits 9-12 on (24-25,30-31). To map 21, Darwin Village: exits 28-31 on (57-58,36-37).
- To map 35, Guardian Citadel: exit 27 on (36,48). To map 43, Mine shaft: exit 25 on (32,52). To map 49, Savage Village: exit 26 on (13,58).
- To map 34, Needles, police station, gas station, church: exit 21, at the end of the jeep's road (below).
- To map 7, Sleeper Base, level 1, at (14,1): exit 32 (`$4E91`), message 11, "You come upon a little used trail which leads you to a place that you never knew existed before.", whose change makes its square exit 41 (`$4EC3`), message 28, "Entering Sleeper Base.".
- To map 16, Base Cochise, outside: exit 33 (`$4E97`), message 11, which becomes exit 42 (`$4EC8`), message 27, "Entering Base Cochise.", both at (16,30); and exit 40 (`$4EBD`), to (0,31).
- Both bases are hidden at first: (59,7) and (2,3) are tile square 1 (`$4D4D`), drawn as tile 32. Remote change 1 (`$4F21`), the square (0,63), puts exit 33 on (2,3) and exit 32 on (59,7) and makes the square exit 38 (`$4EB1`), which moves the party to (25,17). Remote change 3 (`$4F35`), the square (1,63), puts exit 33 on (2,3) and makes the square exit 40. Blocking squares close both corner squares off; map 25's exit 11 arrives on (0,63) (map-25 `$3F3A`) and map 42's exit 11 on (1,63) (map-42 `$3D37`).
- After the ending, module 4 makes (2,3) tile square 2 (`$4D50`): tile 43, blocking, message 26, "The debris littered here is the fireblackened ruins of Base Cochise." (module-4 `$CBBA-$CBE2`).
- On this map: exit 39 (`$4EB7`) on (55,62), message 24, "Entering Ranger Center.", turns its square into action square 0, module 3 (`$4D5F`). Remote change 2 (`$4F2E`), the squares (55,61) and (56,62), the only ways onto (55,62), puts exit 39 back on it without a redraw. Exits 34-37 move the party one or two squares on when it fails a check in the water (check squares 2-5, Swim 6, and 13-14, LK 1; message 15, "You are caught by the river's current.", and 1 CON). Exits 22-24 are the jeep's.

## Its own code

The code list, header word 19 (`$4C26`), is at `$4FC9`: entry 0 `$4FCD`, entry 1 `$5072`. An action square whose record byte 0 is below `$80` runs entry n of the list (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). A routine that returns the carry set has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$4FCD` swap_tiles, action 0: exchanges the pictures of the two tiles named in record bytes +3 and +4, their 32 bitmap bytes (tiles-0 `$D000` + 32 × tile) and their 4 colour bytes (tiles-0 `$DC00` + 4 × tile). It writes the four operands of `$5031` (`$5032-$503D`) before each of its two calls, with all RAM banked in (engine `api_all_ram_in` `$04FC`, `api_io_back_in` `$04FF`). Returns the carry clear (`$502F`).
- `$5031` swap_tile_bytes: swaps bytes Y down to 0 of the two tables, Y = 31 for the bitmaps (`$4FF6`) and 3 for the colours (`$5027`).
- `$5042` tile_colour_address: X/Y = tiles-0 `$DC00` + 4 × A, the high bits gathered in its operand `$5055`.
- `$505A` tile_bitmap_address: X/Y = tiles-0 `$D000` + 32 × A, the high bits gathered in its operand `$506D`.
- `$5072` desert_heat, action 1: copies record bytes +3/+4 to +1/+2 when the clock's hour (`$0E`) is 6 to 17, and +5/+6 at other hours (`$5074-$507C`; the copy at `$5088`). Returns the carry clear.

### The jeep

- The broken jeep is tile 86 on (29,41), check square 0 (`$4C82`), message 29, "You see a broken down jeep.". Its flags `$E4` test every conscious member and one pass is enough (game `square_checks` `$8E14`, `$8EF6-$8F28`). Its only pair is skill 38, not one of the 35 skills: Ace's record holds it at level `$FF` in its last skill pair (map-04 `$44B8` + `$BA`/`$BB`; engine `skill_level` `$1392` searches all 30 pairs). So message 30, "Ace fixes the jeep and you're on your way.", needs Ace in the party, and anyone else gets message 31, "You have no idea what is wrong with it.".
- Success makes the square action square 4 (`$4D83`), whose record names tiles 7 and 86: swap_tiles exchanges them, and the party, drawn as tile 7 (game `draw_party_marker` `$AF1D`), shows as the jeep.
- Its change makes the square remote change 0 (`$4EDD`). That turns (29,40) to (29,32) into exit 22 (one square north), (29,31) to (27,31) into exit 23 (one square west), (26,31) into action square 5, and the party's square into exit 24 (one square north), which leaves tile square 0 behind. None of these exits asks, and each runs the next square at once, so the jeep drives the party along the road in one move.
- Action square 5 (`$4D88`) runs swap_tiles again, which puts the two tiles back, and becomes exit 21 (`$4E56`), to map 34 at (1,17).

### The desert heat

- Action squares 1, 2 and 3 run desert_heat: 439, 384 and 523 squares (records `$4D6E`, `$4D75`, `$4D7C`), drawn as tile 27 (438 of 439), tile 29 (375 of 384) and tile 31 (513 of 523).
- Their records make the square check square 7, 8 or 9 by day and 10, 11 or 12 by night (`$4CD0-$4D29`), which the game runs at once.
- Those checks (flags `$E1`) test every conscious member against ST, difficulty 1, 2 or 4, or a Canteen (item 44) carried (game `$8E65`). A member who passes neither loses 2d6, 4d6 or 6d6 CON by day and 1d6, 2d6 or 3d6 by night, armour not counted (flag bit 0, game `$90B2`).
- The messages are 19, "It is very warm.", 20, "It's getting warmer." and 22, "It's VERY hot!", with 21, "You are overcome by heat exhaustion.", on a failure. Either way the square then trades back to the action square (change `$FD`, engine `alter_square` `$0A00`).
