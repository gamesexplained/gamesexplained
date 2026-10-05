# Map 29, Agricultural Center, the Root Cellar — verified technical facts

The cellar under the Agricultural Center. Its own message 1 names it, "After descending a several hundred foot high stairway, you enter the Root Cellar.", though no record of the map shows that message (the text bullet below). Map 9, which the world map enters with "Entering Agricultural Center." (map 0's message 3, on its exit 7), leads down into it: its exit 3 to (30,30), beside this map's exit 0 up the stairs, and its exit 4 to (1,2) with "You descend down a dark tunnel." (map 9's message 47). This map's exit 0 climbs back to map 9 ("You laboriously climb up the long flight of stairs.", message 15), exit 1 walks "back up the tunnel" (message 18), and exit 2 leads out to the desert: "Exiting to desert. (It sure as hell smells better out there.)" (message 19). It is a map of 32 by 32 squares. It is stored on side 1 of the disks from track 12, logical sector 10, 16 pages: entry 29 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$43FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 1 draws it (part tiles-1). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 1: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 0, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 50 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 4, `$3A31` (game `$B047`), and one of the first 6 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 29 of the stream directory, T35/L13. The unpack runs on to `$E3B9`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 28 to 60 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 223 | | | |
| 1 message | 85 | `$3A5C` | 13, 1 null | 12 |
| 2 check | 32 | `$3A90` | 7 | 7 |
| 3 encounter | 18 | `$3AF9` | 18 | 18 |
| 4 tile | 0 | `$3BF5` | 1 | 1 |
| 5 loot bag | 0 | `$3BFA` | 9 | 9 |
| 10 exit | 3 | `$3C39` | 3 | 3 |
| 11 blocking | 663 | `$3C4E` | 4 | 4 |
| 12 remote change | 0 | `$3C5E` | 1 | 1 |
| 15 random encounter | 0 | `$3C71` | 6 | 6 |
| total | 1,024 | | | 61 |

- No code of its own: header word 19, `$3A26`, holds 0.
- The text, header word 0, is at `$3D1E` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 16 group offsets at `$3D5A`, and messages 0 to 60 in groups of four, `$3D7A-$430A`. Message 60 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 245 bytes after it, `$430B-$43FF`. Message 1, below it, is named by none of them either.
- 4 monster names at `$3CC5` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$3CF6`, monster *n* at `$3CF6` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Bunny, 2 Rat, 3 Possum and 4 Prairie Dog.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3C39`; `square_exit`, game `$89A3`): to the world map, map 0 (exit 2, to (37,55), asking first); to Agricultural Center, map 9 (exits 0 and 1, to (18,19) and (2,30), each asking first).
- The storage room, "This area is obviously a storage room, with many old wooden crates and empty boxes." (message 12), holds the check squares among (27,1) to (30,9). Check squares 2 to 5 (`$3AB8`, `$3AC5`, `$3AD2`, `$3ADF`), at (27,8), (28,5), (29,2) and (30,4), test the first conscious member's Perception 1 on arrival (flags `$C0`). Passing shows "Found something!" (message 14) and makes the square loot bag 0, 1, 2 or 3 (`$3C0C-$3C1F`): a Grenade, two VP91Z 9mm pistols, a Plastic explosive or a 9mm clip. Failing shows "Nothing in this box." (message 13). The other 26 squares are check square 1 (`$3AAB`), which shows message 13 whether its check passes or fails, and each of the four bags becomes check square 1 when emptied (its byte +0, game `$92C7`).
- The instrument console at (27,16) is check square 0 (`$3A9E`): "An instrument console with broken gauges, covered by a fine layer of dust." (message 6). It runs no check on arrival (flags `$80`); Perception 1 used on it makes it message square 7 (`$3A83`): "There is a diary under the console! It begins just after the Holocaust. Read paragraph 6." (message 8). A failed Use shows "Nothing happens." (message 7).
- The tunnel from map 9 arrives at (1,2), check square 6 (`$3AEC`): "This area smells very strongly of animals and damp dirt. It's dark and hard to see." (message 16). When any conscious member carries a Match on arrival (flags `$E4`, a charge used, game `$8E65-$8E70`), remote-change square 0 (`$3C60`) makes (1,2) message square 1 (`$3A78`, message 16 alone) and puts loot bag 4, a Fruit, at (11,1) and loot bag 5, a Grenade, at (14,17).
