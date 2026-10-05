# Map 1, Quartz — verified technical facts

The town of Quartz: map 0's exits 0-5 enter it with "Entering Quartz.", and its own exits to the world map say "Leaving Quartz." (message 4). It is 32 x 32 squares, stored on side 2 of the disks as 20 pages from T26/L6 (track 26, logical sector 6), entry 1 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$47FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 3 (tiles-3). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 3 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 35 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 1 chance in 30 after each step (game `random_encounter`, `$B017`). `$3A31`: monster types 1 to 7 (game `$B047`). `$3A32`: the groups take the first 8 class-15 records (game `$B040`).
- `$3A34`/`$3A35`, the time a step takes: half a minute (fraction 128, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 2 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 8th step (game `$AF75-$AF7B`).
- Squares, 1,024: 626 of class 0, 185 blocking squares (class 11), 144 exits (10), 31 check squares (2), 30 message squares (1), 6 question squares (8) and 2 encounters (3).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 92 exits, 32 message squares, 8 random-encounter slots (class 15), 6 question squares, 3 check squares, 2 encounters, 2 action squares, 2 blocking squares, 1 tile square and 1 loot bag.
- Text: messages 0-98, packed from `$400B` (header word 0, engine `select_map_text` `$1E4F`). Messages 35-51 are street names, from "Quail Trail" to "Ryson Drive".
- Monsters: the names from `$3F51` (header word 1, game `print_monster_name` `$9E5D`) are 1 Biker Scum, 2 Rib Cracker, 3 Cutthroat, 4 Leather Thug, 5 Deserter, 6 Gunsel, 7 Gunman and 8 Shambler Ghoul; name 0 is empty. The nine monster records start at `$3FC3` (game `monster_record` `$9EA4`). The random encounters use types 1-7; type 8 fills encounters 0 and 1 (`$3B96`, `$3BA2`), the cemetery's "Spirits pop out from a grave." (message 22).
- The two action squares run location modules: action 0 (`$3BC1`, byte `$80`), module 0, the doctor, "Q Emergency"; action 1 (`$3BD4`, byte `$81`), module 1, the shop, "Q. Emporium" (game `run_action`, `$8849`).
- No code and nobody to hire: header words 19 and 20 (`$3A26`, `$3A28`) hold `$3F51`, the names' address. Game `run_action` reads word 19 only for an action below `$80` (game `$8847-$885E`), and no action record here has one; game `order_hire` reads word 20 only for a peaceful group whose encounter record names an NPC in byte +9 (game `$A418-$A426`), and no encounter record here does.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 0, the world map: exits 1, 5, 6 and 85-91, on 106 squares round the town's edges, message 4, "Leaving Quartz.".
- To map 2, Scott's Bar: exit 18 on (21,28), message 6, "Entering Scott's Bar.", and exit 19 on (22,29), message 15, "Entering from the rear of Scott's Bar.".
- To map 3, the Stagecoach Inn: exit 16 on (16,15), message 2, "Entering Stage Coach Inn.".
- To map 4, Ugly's hideout: exit 17 on (26,14), message 10, "This doesn't look like a safe place to enter.", and exit 92 on (24,15).
- To map 6, the courthouse: exit 20 on (23,19), message 16, "Entering the Courthouse.".
- To map 5, the abandoned buildings: exits 21-84 (`$3D6F-$3EAE`), one each for the map numbers `$80-$BF` (record byte 3). Engine `load_map_pages` replaces a number of `$80` or more with its byte in T35/L8 (engine `$261C-$2624`), which is 5 for all of these on the four sides. 30 of them are on squares; the other 34 are named by no square, by no change in a record and by no code. Their messages are 3, "An old abandoned shack.", 8, "It looks dark in here.", and 10.
- On this map: exit 3 on (7,8), message 1, "Entering Dr. Quack's emergency clinic.", and exit 4 on (1,26), message 33, "Entering Quartz Emporium.", are relative exits to the square itself whose changes make it action square 0 or 1 (game `$89B5`).
- Exits 7, 8, 10, 11, 13 and 14 are where the manholes lead: the answers of question squares 2, 3, 5, 6, 8 and 9 (`$3C0D-$3C4E`), "This manhole leads S)outh and E)ast." and the like, make the square one of them, with message 32, "You crawl through the slimy underground.". Exits 2, 9, 12 and 15 lead to squares beyond the map's 32 columns ((62,62), (58,10), (57,33), (57,56)), and no square, change or code names them.
