# Map 24, Las Vegas sewers — verified technical facts

The sewers under Las Vegas: "Before you is a torpid river of raw sewage from the city of Vegas above you." (message 10). The temple of map 38 leads down into them (its exit 1, to (20,1)), and the way back up says "Leaving this scumhole." (message 9, on exit 4). Exits 7 and 22 lead on into the lab, map 25. It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 22, logical sector 0, 29 pages: entry 24 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$50FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 4 draws it (part tiles-4). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 4: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 90, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 70 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 4, `$3A31` (game `$B047`), and one of the first 6 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 24 of the stream directory, T35/L13. The unpack runs on to `$E3A4`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 74 to 106 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 340 | | | |
| 1 message | 26 | `$3A5C` | 15, 4 null | 11 |
| 2 check | 106 | `$3A94` | 40, 14 null | 26 |
| 3 encounter | 19 | `$3C70` | 22 | 22 |
| 4 tile | 1 | `$3DA4` | 8 | 8 |
| 5 loot bag | 0 | `$3DFF` | 14 | 14 |
| 6 action | 7 | `$3DCC` | 1 | 1 |
| 8 question | 0 | `$3E69` | 2 | 2 |
| 10 exit | 5 | `$3E7B` | 23, 7 null | 16 |
| 11 blocking | 519 | `$3F01` | 6 | 6 |
| 12 remote change | 1 | `$3F19` | 25, 5 null | 20 |
| 15 random encounter | 0 | `$40F5` | 6 | 6 |
| total | 1,024 | | | 132 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3DCE`).
- The code list, header word 19, is at `$3DD2` (`run_action` reads it at game `$885C`): routine 0 `$3DD4`.
- The text, header word 0, is at `$4283` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 28 group offsets at `$42BF`, and messages 0 to 106 in groups of four, `$42F7-$50CE`. Message 106 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 49 bytes after it, `$50CF-$50FF`. Messages 1, 3, 4, 8, 29, 31, 34-37 and 67, below it, are named by none of them either.
- 13 monster names at `$4149` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4213`, monster *n* at `$4213` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Tronodile, 2 Tazel, 3 Turbo Cybertrike, 4 Cybertrike, 5 Clawer Leader, 6 Clawman, 7 Cyclon, 8 Centron, 9 Centron Deluxe Model, 10 Tronnosaurus, 11 Cyborg, 12 Hexborg and 13 Boa Tronstrictor.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3E7B`; `square_exit`, game `$89A3`): to Las Vegas sewers, the lab, map 25 (exits 3, 7 and 22, to (1,22), (1,5) and (0,22); exit 7 asks first); to Las Vegas, the Mushroom Cloud temple, map 38 (exit 4, to (1,3), asking first); 12 within the map (exits 0-2, 5, 10-13 and 18-21; 7 of them relative to the party's square). No square, and no change the squares lead to, names exits 3, 6, 8-9, 14-18 and 20-21.

## Its own code

- `$3DD4` `sewage_infects_party`, routine 0, run by action record 0 (`$3DCE`: `00 02 06 03`). For each position from 1 up to the party's member count, `$07`, `select_member` (engine `$0335`) makes the member current, and the bit for disease *n*, *n* the record's byte +3, is ORed into the member's byte +$28 through the masks at `$3DF7` (`$3DD4-$3DF3`). It returns with carry clear (`$3DF5-$3DF6`). (run on the map's snapshot: +$28 of records 1 to 4, engine `$F528-$F828`, went from 0 to 8)
- `$3DF7` `sewer_disease_masks`: `$01`, `$02`, `$04` up to `$80`, read at `$3DE1` with X = the record's byte +3. Nothing checks that the byte is below 8.
- `$3DEB` `sewage_member` is the operand of the `LDA #` at `$3DEA`: the position, written at `$3DD6`, then plus one and compared with `$07` at `$3DEF`. It is 0 as stored.

### The river of sewage

- Action square 0 stands on (24,10) to (30,10), the river. Its record gives every member Sewer rot (+3 = 3) and then makes the square check square 6 (`$3B3C`), which runs at once (`run_square_action`, game `$ACCE-$ACD1`). Its flags, `$E0`, test every conscious member on arrival: ST 5 or Swim 5.
- Passing shows message 6, "Despite the sucking current, you keep your feet and move through the water easily.", and makes the square remote-change square 2 (`$3F6A`), which turns the party's square back into action square 0, so every crossing infects again. Failing makes it exit 5 (`$3EC3`), which moves the party one square east, relative +1,+0, and leaves remote-change square 2 behind it.
- Sewer rot is bit 3 of +$28, message 4 of the doctor's list (module-0 `$CC04`: bit *n* is its message *n*+1). Any disease bit stops natural healing, since `con_heal_one` (game `$B854`) gives no point while +$28 is not 0, but only bits 4 to 7 cost CON over time (`health_tick`, game `$B7A2-$B7A8`), so Sewer rot costs none.
