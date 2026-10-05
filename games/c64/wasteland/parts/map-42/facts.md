# Map 42, Guardian Citadel, the Inner Sanctum — verified technical facts

The Inner Sanctum of the Guardian Citadel: "The gray marble stairs lead from the Inner Sanctum down to the Outer Sanctum below." (message 5). The Outer Sanctum's exit 5 (map 36) leads up into it, 10 columns east and 6 rows south of its square, and this map's exit 5 leads back down, 10 columns west and 7 rows north. Its helicopter flies out one way: question square 4 (`$3CC8`) asks "One-way only: A) Base Cochise B) Junkyard Village C) Sleeper Base D) Vegas E) Quartz F) Needles Choose one." (message 40), and each letter makes the party's square one of exits 11 to 16, to the world map, with "The helicopter rises through the open roof and rockets off toward your destination." (message 33). It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 7, logical sector 17, 23 pages: entry 42 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$4AFF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 5 draws it (part tiles-5). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 5: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 43, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 42 of the stream directory, T35/L13. The unpack runs on to `$E289`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 52 to 84 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 335 | | | |
| 1 message | 0 | `$3A5C` | 2 | 2 |
| 2 check | 28 | `$3A64` | 18 | 18 |
| 3 encounter | 7 | `$3BA6` | 7 | 7 |
| 4 tile | 0 | `$3C08` | 7 | 7 |
| 5 loot bag | 6 | `$3C2B` | 12 | 12 |
| 8 question | 1 | `$3C9F` | 5 | 5 |
| 10 exit | 16 | `$3CDE` | 17 | 17 |
| 11 blocking | 631 | `$3D5B` | 5 | 5 |
| 12 remote change | 0 | `$3D6F` | 2 | 2 |
| total | 1,024 | | | 75 |

- No code of its own: header word 19, `$3A26`, holds 0.
- The text, header word 0, is at `$3EC0` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 22 group offsets at `$3EFC`, and messages 0 to 84 in groups of four, `$3F28-$4A17`. Message 84 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 232 bytes after it, `$4A18-$4AFF`.
- 14 monster names at `$3D8D` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$3E48`, monster *n* at `$3E48` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Master Dalis, 2 Adept Flora, 3 Adept Nadine, 4 Sister Phaedra, 5 Adept Tara, 6 Sister Violet, 7 Mistress Ginger, 8 Mistress Zenobia, 9 Cardinal Chano, 10 Brother Darren, 11 Brother Harper, 12 Brother Jude, 13 Weez and 14 Adept Dale.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3CDE`; `square_exit`, game `$89A3`): to the world map, map 0 (exits 11-16, to (1,63), (13,59), (60,7), (22,19), (29,45) and (25,32)); to Guardian Citadel, the Outer Sanctum, map 36 (exit 5, to 10 west and 7 north of its square, asking first); 10 within the map (exits 0-4 and 6-10; 2 of them relative to the party's square).
- The door at (6,13) is check square 0 (`$3A88`). A step onto it shows "The door blocking your path is stout and constructed of thick wood bound by iron. It is locked." (message 1) and is refused (flags `$08`). Its ten pairs each have their own change: a Plastic explosive, LAW rocket or TNT Used on it makes it tile square 0 (`$3C16`, message 10, tile 66), Picklock 1 tile square 4 (`$3C22`: "Open doorway.", message 12, tile 51), and ST 3, a Crowbar, Sledge hammer, Ax or Proton ax tile square 2 (`$3C1C`, message 11, tile 72). The record holds nine changes for the ten pairs (`$3AA7-$3AB8`), so the tenth pair, a Pick ax, takes its change from the two bytes after the record (`check_change_offset`, game `$9108`), the flags and first message of check square 1 (`$3AB9-$3ABA`: `00 04`), and a Pick ax makes the door plain ground.
