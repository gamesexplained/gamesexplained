# Map 25, Las Vegas sewers, the lab — verified technical facts

The second section of the sewers under Las Vegas ("Although cleaner than the first section of sewer, this area is still refuse-strewn and forbidding.", message 58), with a metal door marked "LAB" (message 34) and an "Android assembly unit" (message 45). Map 24's exits 7 and 22 lead in, to (1,5) and (0,22), and exit 8 leads back. It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 20, logical sector 9, 29 pages: entry 25 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$50FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 4 draws it (part tiles-4). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 4: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 90, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 70 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 4, `$3A31` (game `$B047`), and one of the first 6 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 25 of the stream directory, T35/L13. The unpack runs on to `$E20D`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 89 to 121 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 433 | | | |
| 1 message | 25 | `$3A5C` | 48, 8 null | 40 |
| 2 check | 59 | `$3B3B` | 23, 3 null | 20 |
| 3 encounter | 18 | `$3C8F` | 21 | 21 |
| 4 tile | 1 | `$3DB5` | 3 | 3 |
| 5 loot bag | 0 | `$3DC4` | 15 | 15 |
| 6 action | 15 | `$3FA1` | 2 | 2 |
| 8 question | 4 | `$3E31` | 13 | 13 |
| 10 exit | 6 | `$3EF4` | 12, 2 null | 10 |
| 11 blocking | 461 | `$3F40` | 7 | 7 |
| 12 remote change | 2 | `$3F5C` | 4 | 4 |
| 15 random encounter | 0 | `$4015` | 6 | 6 |
| total | 1,024 | | | 141 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3FA5`); 1 the map's routine 1 (`$3FA8`).
- The code list, header word 19, is at `$3FAC` (`run_action` reads it at game `$885C`): routine 0 `$3FB0`; routine 1 `$3FEA`.
- The text, header word 0, is at `$41A1` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 31 group offsets at `$41DD`, and messages 0 to 121 in groups of four, `$421B-$50FD`. Message 121 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 2 bytes after it, `$50FE-$50FF`. Messages 4, 9, 11-13, 27 and 70, below it, are named by none of them either.
- 13 monster names at `$4069` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4131`, monster *n* at `$4131` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Tronodile, 2 Tazel, 3 Clawer Leader, 4 Clawman, 5 Clawer Leader, 6 Clawman, 7 Cyclon, 8 Centron, 9 New and Improved Centron, 10 Tronosaurus, 11 Cyborg, 12 Hexborg and 13 Boa Tronstrictor.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3EF4`; `square_exit`, game `$89A3`): to the world map, map 0 (exits 3, 4 and 11, to (28,18), (25,17) and (0,63); exits 4 and 11 ask first); to Las Vegas sewers, map 24 (exit 8, to (30,24), asking first); 6 within the map (exits 0-2, 7, 9 and 10; all relative to the party's square). No square, and no change the squares lead to, names exits 5-6.

## Its own code

- `$3FB0` `android_ready_check`, routine 0, run by action record 0 (`$3FA5`: `00 01 2F`). It reads the squares (19,9), (19,10) and (19,11) through `map_square_at` (engine `$042B`: X = column, Y = row; A = class, X = number) and needs each to be class 4, number 2 (`$3FB0-$3FDB`). When all three are, it writes `$0C $03`, remote-change square 3, into its own record's +1/+2, `$3FA6-$3FA7`, in place of the `$01 $2F` stored there (`$3FDD-$3FE6`). It returns with carry clear either way (`$3FE8-$3FE9`). (run on the map's snapshot: with the squares as stored the record stayed as it was; with the three squares set to class 4 number 2, `$3FA6-$3FA7` became `$0C $03`)
- `$3FEA` `sludge_infects_party`, routine 1, run by action record 1 (`$3FA8`: `01 02 05 03`). It is the code of map 24's `sewage_infects_party` (map-24 `$3DD4`) byte for byte but for its own addresses: for each position from 1 up to the party's member count, `$07`, it makes the member current (engine `$0335`) and ORs the bit for disease *n*, *n* the record's byte +3, into the member's byte +$28 through the masks at `$400D` (`$3FEA-$4009`), then returns with carry clear (`$400B-$400C`).
- `$400D` `sludge_disease_masks`: `$01`, `$02`, `$04` up to `$80`, read at `$3FF7`.
- `$4001` `sludge_member` is the operand of the `LDA #` at `$4000`: the position, written at `$3FEC`, then plus one and compared with `$07` at `$4005`. It is 0 as stored.

### The android

- The assembly unit is the column of stations (19,8) to (19,11), question squares 10, 5, 3 and 0 as stored, each with the menu of message 45 ("Android assembly unit", 1 Diagnostic function, 2 Initiate repairs, 3 Prep for assembly). A station whose repairs are done becomes tile square 2 (`$3DC1`: message 66, "All repairs needed at this station are complete.").
- At the head station, (19,8), the menu is question square 12 (`$3EE7`) once that station's own repairs are made, and its answer 3 makes the square action square 0 (`$3EF1`).
- Not ready, the record's stored change makes the square message square 47 (`$3B38`: message 83, "Operation of this unit is impossible until all assembly operations are complete."), which puts question square 12 back.
- Ready, remote-change square 3 (`$3F7B`) makes (19,8) to (19,12) tile square 0, (16,7) blocking square 6 and (19,13) exit 11, and the party's square message square 46 (`$3B36`: message 85, "The android awakens. Read paragraph 15.").
- Exit 11 (`$3F3A`), asking first, leads to the world map at (0,63). That square is map 0's remote-change square 1 (map-00 `$4F21`), which makes (2,3) of the world map its exit 33 and (59,7) its exit 32, each "a little used trail" (map 0's message 11), to Base Cochise, outside (map 16) and the Sleeper Base, level 1 (map 7), and the party's square its exit 38, to (25,17) of the world map. Exit 11 itself then becomes exit 4 (`$3F3E`), to the same (25,17).
- The written change is kept. The map's code has no other write to those bytes, and `save_map` (engine `$2856`) writes the map's pages back to the disk, the record among them, before `enter_map` loads another map (engine `$25C3`).

### The sludge

- Action square 1 stands on 15 squares of sewage: (7,21), (8,21), (23,21) to (28,21), (6,22), (23,22), (24,22), (7,23), (8,23), (23,23) and (24,23). Its record gives every member Sewer rot (+3 = 3, bit 3 of +$28, message 4 of the doctor's list, module-0 `$CC04`) and makes the square check square 5 (`$3B96`), which runs at once (`run_square_action`, game `$ACCE-$ACD1`): flags `$E0`, ST 4 or Swim 4 for every conscious member.
- Passing shows message 6 and makes the square remote-change square 0 (`$3F64`), which turns the party's square back into check square 5; failing makes it exit 1 (`$3F11`), one square east, which leaves remote-change square 0 behind it. Neither path makes the square action square 1 again, so each sludge square infects once.
- Sewer rot stops natural healing (`con_heal_one`, game `$B854`, gives no point while +$28 is not 0) but costs no CON over time, since `health_tick` takes only bits 4 to 7 for that (game `$B7A2-$B7A8`).
