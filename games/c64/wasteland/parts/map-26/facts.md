# Map 26, Needles — verified technical facts

The town of Needles: the world map enters it with "Entering Needles." (map 0's message 5, on its exits 9 to 12), and this map leaves it with "Leaving Needles." (message 1). From it lead the Temple of Blood, the waste pit and ammo bunker, the two halves of downtown and the police station, gas station and church. It is a map of 64 by 64 squares. It is stored on side 2 of the disks from track 15, logical sector 0, 34 pages: entry 26 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$55FF` and unpacks its tile layer to `$DE00-$EDFF`. Tile set 3 draws it (part tiles-3). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$4C00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$4C00-$4C2B`), 11 setting bytes (`$4C2C-$4C36`) and 37 combat phrase numbers (`$4C37-$4C5B`).
- 64 by 64 squares: `$4C2C` holds 64, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 3: `$4C30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 35, `$4C33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 80 after a step, `$4C2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 6, `$4C31` (game `$B047`), and one of the first 8 class-15 records must be free, `$4C32` (game `$B040`).
- A step takes half a minute: `$4C34` holds 128, in 256ths of a minute, and `$4C35` 0 whole minutes (`advance_clock`, game `$AF32`). `$4C36` adds 2 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$EDFF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 26 of the stream directory, T35/L13.
- The combat phrases, `$4C37-$4C5B`, name messages 30 to 62 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$3BFF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3C00-$4BFF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$4C06-$4C25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 3,126 | | | |
| 1 message | 144 | `$4C5C` | 8 | 8 |
| 2 check | 75 | `$4C7D` | 4 | 4 |
| 4 tile | 2 | `$4CBD` | 5 | 5 |
| 6 action | 0 | `$4CDA` | 8 | 8 |
| 8 question | 0 | `$4D52` | 2 | 2 |
| 9 radiation | 54 | `$4D66` | 2 | 2 |
| 10 exit | 281 | `$4D70` | 27 | 27 |
| 11 blocking | 414 | `$4E31` | 3 | 3 |
| 12 remote change | 0 | `$4E3D` | 8, 2 null | 6 |
| 15 random encounter | 0 | `$4E85` | 8 | 8 |
| total | 4,096 | | | 73 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$4CEA`); 1 the map's routine 0 (`$4CEF`); 2 the map's routine 0 (`$4CF4`); 3 the map's routine 0 (`$4CF9`); 4 the doctor, module 0 "Old Doc Bob" (`$4CFE`); 5 the library, module 2 "New Thought" (`$4D11`); 6 the map's routine 1 (`$4D40`); 7 the map's routine 1 (`$4D49`).
- The code list, header word 19, is at `$4EF5` (`run_action` reads it at game `$885C`): routine 0 `$4EF9`; routine 1 `$4F9E`.
- The text, header word 0, is at `$5052` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 17 group offsets at `$508E`, and messages 0 to 62 in groups of four, `$50B0-$55D3`. Message 62 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 44 bytes after it, `$55D4-$55FF`.
- 6 monster names at `$4FC3` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$501A`, monster *n* at `$501A` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Sand Bum, 2 Desert Nomad, 3 Lost Soul, 4 Jerk, 5 Leather Jerk and 6 Brass Jerk.
- Characters who can join: none. Header word 20, `$4C28`, holds `$4FC3`, the address of the monster names, and no encounter record names an NPC (byte +9, high nibble).
- Exits (class 10, list `$4D70`; `square_exit`, game `$89A3`): to the world map, map 0 (exits 0-7, to (24,29), (25,29), (26,30), (26,31), (25,32), (24,32), (23,31) and (23,30), each asking first); to Temple of Blood, map 27 (exits 12 and 15, to (16,30) and (30,27), each asking first); to Needles, waste pit and ammo bunker, map 31 (exits 18 and 19, to (6,7) and (24,11), each asking first); to Needles downtown, Leroy's, map 32 (exits 11 and 22, to 30 west and 16 north of its square and 36 west and 5 north of its square, each asking first); to Needles downtown, Hobo Dogs, map 33 (exits 20, 21, 23 and 24, to 35 west and 16 north of its square, (22,30), 20 west and 24 north of its square and (10,30), each asking first); to Needles, police station, gas station, church, map 34 (exits 8-10, to (27,27), (1,6) and (3,30), each asking first); 6 within the map (exits 13, 14, 16, 17, 25 and 26; all relative to the party's square). No square, and no change the squares lead to, names exit 21.

## Its own code

- `$4EF9` `train_swap_tiles`, routine 0, run by action records 0 to 3 (`$4CEA`, `$4CEF`, `$4CF4`, `$4CF9`). It swaps two tiles of the tile set, numbers +3 and +4 of the record: their 32 bitmap bytes (`$4EF9-$4F27`) and then their 4 colour bytes (`$4F2A-$4F58`). For each table it writes the two tiles' addresses into the four operands of `train_swap_bytes` and calls it with all RAM banked in (engine `$04FC`, then engine `$04FF`), since the set lies under the I/O area. It returns with carry clear (`$4F5B-$4F5C`). It is the code of map 0's `swap_tiles` (map-00 `$4FCD`) at this map's own addresses. (run on the map's snapshot: action record 0 exchanged tiles-3 `$D0E0-$D0FF` with tiles-3 `$DBE0-$DBFF` and tiles-3 `$DC1C-$DC1F` with tiles-3 `$DD7C-$DD7F`, tiles 7 and 95)
- `$4F5D` `train_swap_bytes` exchanges bytes Y down to 0 of the two tables: `LDX`, `LDA`, `STA` and `STA`, each abs,Y, whose operands `$4F5E-$4F69` (`train_load_a`, `train_load_b`, `train_store_a`, `train_store_b` and their high bytes) `train_swap_tiles` writes before each call; as stored they hold `$FF` bytes. It returns with Y = `$FF`.
- `$4F6E` `train_tile_colour_address` returns X/Y = tiles-3 `$DC00` + 4 × A, and `$4F86` `train_tile_bitmap_address` X/Y = tiles-3 `$D000` + 32 × A. Each shifts A left (twice, five times), rotating the bits shifted out into the operand of its `LDA #` (`$4F81` `train_colour_hi`, `$4F99` `train_bitmap_hi`), which it then adds to `$DC` or `$D0` for the high byte.
- `$4F9E` `train_at_terminus`, routine 1, run by action records 6 (`$4D40`: `01 FF FF 06 01 0C 01 33 28`) and 7 (`$4D49`: `01 FF FF 06 03 0C 04 0B 28`). When the party stands at the column and row of the record's bytes +7/+8 (`$57`, `$58`), it copies the pair at +3/+4 into +1/+2, the change `square_action` makes next (game `$8840`); elsewhere the pair at +5/+6 (`$4F9E-$4FBF`). It returns with carry clear (`$4FC1-$4FC2`). (run on the map's snapshot: with the party at (51,40) record 6 got `$06 $01`, elsewhere `$0C $01`)

### The train

- Tile 7 is the marker the game draws on the party's square (`draw_party_marker`, game `$AF1D`). While it is swapped with a station's tile, the party is drawn as the train.
- As stored, the train stands at the west station, (12,40): tile square 1 (`$4CCA`), which shows tile 95 and becomes question square 0 (`$4D56`) when the party steps on it: message 7, "The train engineer yells, "All aboard!" Get on (Y/N)?". Y, message 8, makes the square action square 0 (tiles 7 and 95); no answer or another key gives remote-change square 6 (`$4E77`): message 9, "I'm always here to give you a ride. Just ask for old Ed the engineer.", and tile square 1 again.
- Each step east is remote-change square 1 (`$4E4D`). It makes the square behind the party message square 0, which draws the layer's own tile, and the square ahead tile square 3 (`$4CD2`, tile 7), and turns the party's square into exit 13 (`$4DE7`), which moves the party one square east and leaves tile square 0 (`$4CC7`, tile 94) where it stood. Tile square 3 becomes action square 6 when the party arrives, and `train_at_terminus` gives remote-change square 1 again, or at (51,40) action square 1 (tiles 95 and 7 swapped back).
- Remote-change square 2 (`$4E5A`) then ends the ride: tile square 2 (`$4CCE`, tile 93) at (50,40), the east station, and tile square 0 on the party's square.
- Westward the same chain runs from the east station: question square 1 (`$4D5E`), action square 2 (tiles 7 and 93), remote-change square 4 (`$4E62`), exit 14 (`$4DED`, one square west), tile square 4 (`$4CD6`) and action square 7, which stops at (11,40) with action square 3 and remote-change square 5 (`$4E6F`), putting tile square 1 back at (12,40).
