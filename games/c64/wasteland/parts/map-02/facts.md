# Map 2, Quartz, Scott's Bar — verified technical facts

Scott's Bar in Quartz: "Scott's Bar is noisy and smoky with many people and tables." (message 36), and the barkeep says "How-do, Rangers! I'm Scott; this is my place." (message 18). Map 1's exits 18 and 19 lead into it. It is 32 x 32 squares, stored on side 2 of the disks as 36 pages from T25/L4 (track 25, logical sector 4), entry 2 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$57FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 2 (tiles-2). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 2 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 58 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 1 chance in 100 after each step (game `random_encounter`, `$B017`). `$3A31`: monster types 1 to 4 (game `$B047`). `$3A32`: the groups take the first 5 class-15 records (game `$B040`).
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 496 of class 0, 257 message squares (class 1), 233 blocking squares (11), 25 check squares (2), 5 encounters (3), 5 exits (10), 2 question squares (8) and 1 tile square (4).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 53 message squares, 33 check squares, 13 question squares, 9 blocking squares, 9 remote changes, 7 loot bags, 6 encounters, 5 tile squares, 5 random-encounter slots (class 15) and 3 exits.
- Text: messages 0-166, packed from `$4148` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$40DB` (header word 1, game `print_monster_name` `$9E5D`) are 1 Ozoner, 2 Outlaw, 3 New Waver, 4 Punker and 5 Bouncer; name 0 is empty. The six monster records start at `$4118` (game `monster_record` `$9EA4`).
- No code and nobody to hire: header word 19 (`$3A26`), the code list, is $0000, and the map has no action squares. Header word 20 (`$3A28`) holds `$40DB`, the names' address; game `order_hire` reads it only for a peaceful group whose encounter record names an NPC in byte +9 (game `$A418-$A426`), and no encounter record here does.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`). All three lead to map 1, Quartz.

- Exit 0 (`$3F20`) on (12,0), (13,0) and (14,0), to (21,27), and exit 1 (`$3F25`) on (27,29) and (28,29), to (22,30): message 35, "You step out of Scott's bar.".
- Exit 2 (`$3F2A`), to (21,27), message 20, "The thugs snicker and kick you out.": the change that answer B, "Apologize, back off", of question square 0 (`$3E4E`) makes.
