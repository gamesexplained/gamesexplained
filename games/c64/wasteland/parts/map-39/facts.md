# Map 39, Las Vegas, Faran Brygo's hideout — verified technical facts

Faran Brygo's hideout in Las Vegas: "Leaving the hideout." (message 1, on exit 0) and "This must be Brygo's vault." (message 60). Las Vegas enters it with "Entering a small beat up building." (map 12's message 55, on its exit 51), which leads to the door at (16,31), and exits 0, 1, 2 and 7 lead back to Las Vegas, map 12. It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 12, logical sector 2, 21 pages: entry 39 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$48FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 4 draws it (part tiles-4). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 4: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes 2 minutes: `$3A34` holds 0, in 256ths of a minute, and `$3A35` 2 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 4 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 39 of the stream directory, T35/L13. The unpack runs on to `$E391`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 67 to 99 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 327 | | | |
| 1 message | 25 | `$3A5C` | 14 | 14 |
| 2 check | 9 | `$3A99` | 7 | 7 |
| 3 encounter | 8 | `$3B32` | 15 | 15 |
| 4 tile | 21 | `$3C04` | 6 | 6 |
| 5 loot bag | 0 | `$3C23` | 4 | 4 |
| 6 action | 0 | `$3C46` | 2 | 2 |
| 8 question | 4 | `$3C83` | 7 | 7 |
| 10 exit | 3 | `$3CDF` | 8 | 8 |
| 11 blocking | 621 | `$3D1C` | 9 | 9 |
| 12 remote change | 6 | `$3D40` | 13 | 13 |
| total | 1,024 | | | 85 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3C4A`); 1 the map's routine 1 (`$3C4D`).
- The code list, header word 19, is at `$3C51` (`run_action` reads it at game `$885C`): routine 0 `$3C55`; routine 1 `$3C58`.
- The text, header word 0, is at `$3EC5` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 26 group offsets at `$3F01`, and messages 0 to 99 in groups of four, `$3F35-$483F`. Message 99 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 192 bytes after it, `$4840-$48FF`. Message 2, below it, is named by none of them either.
- 3 monster names at `$3E81` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$3EA5`, monster *n* at `$3EA5` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Guard, 2 Lunatic and 3 Faran Brygo.
- Characters who can join: none. Header word 20, `$3A28`, holds `$3E81`, the address of the monster names, and no encounter record names an NPC (byte +9, high nibble).
- Exits (class 10, list `$3CDF`; `square_exit`, game `$89A3`): to Las Vegas, map 12 (exits 0-2 and 7, to (43,11), (43,11), (43,11) and (44,8); exits 0 and 7 ask first); 4 within the map (exits 3-6).

## Its own code

- `$3C55` `trapped_room_blast`, routine 0, run by action record 0 (`$3C4A`: `00 02 03`). It is a `JMP` to `screen_shake` (engine `$044C`), the explosion's sound and shaking screen. It returns with the carry that `random_byte`'s last addition left (engine `$24EC`), so whether `run_action` redraws the view afterwards (game `$8872`) is left to chance. The record then makes the square check square 3, which runs at once (`run_square_action`, game `$ACCE-$ACD1`).
- `$3C58` `infect_every_character`, routine 1, run by action record 1 (`$3C4D`: `01 0A 03 01`). For each character record from 1 up to `records_in_use`, `$0A`, it makes the record current (`select_character`, engine `$0338`) and ORs the bit for disease *n*, *n* the record's byte +3, into the record's +$28 through the masks at `$3C7B` (`$3C58-$3C77`). It returns with carry clear (`$3C79-$3C7A`). With +3 = 1 the disease is Wasteland Herpes (module-0 `$CC04`: bit *n* is its message *n*+1). It counts character records, not party positions, so every character in use gets it, those of the other parties too (`$0A` counts all parties together). The record's change then makes the square exit 3. (run on the map's snapshot, where `$0A` holds 4: +$28 of records 1 to 4, engine `$F528-$F828`, went from 0 to 2)
- `$3C7B` `herpes_disease_masks`: `$01`, `$02`, `$04` up to `$80`, read at `$3C65` with X = the record's byte +3.
- `$3C6F` `infect_record` is the operand of the `LDA #` at `$3C6E`: the record, written at `$3C5A`, then plus one and compared with `$0A` at `$3C73`. It is 0 as stored.
- Wasteland Herpes stops natural healing (`con_heal_one`, game `$B854`, gives no point while +$28 is not 0) and costs no CON over time (`health_tick`, game `$B7A2-$B7A8`, takes CON only for bits 4 to 7).

### The password

- The door at (16,31) is question square 0 (`$3C91`): ""What's the word?"" (message 5), answered by typing. Map 12's exit 51 brings the party onto it, and an exit returns with carry set (game `$8A34`), so the question is asked at once.
- PHOENIX or CLOVER (messages 65 and 66) gives action square 1: `infect_every_character`, then exit 3 (`$3D00`), which takes the party in to (16,28) and puts question square 0 back on (16,31). KESTREL (message 3) gives exit 3 at once, with no disease.
- No answer, or any other word, gives exit 1 (`$3CF4`): ""What do you think you are trying to do? Get the hell out of here."" (message 4), back to Las Vegas at (43,11), and the door becomes question square 1 (`$3C9F`): ""Not you again? You better have the password this time."" (message 6). It takes the same three words with the same results; no answer gives exit 1 again.
- Any other word at question square 1 gives check square 0 (`$3AA7`), which runs at once. Its only pair is skill 37 (`01 25`), and the first conscious member decides (flags `$50`). Of the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party, only Dan Citrine's holds skill 37 (map-06 `$44A0`; `skill_level`, engine `$1392`), so for any other first member it fails: ""Wrong again!" You are thrown out into the street." (message 7), 1 CON from every member, less each member's armour roll (`9D 81`; flag bit 0 clear, game `$90AF-$90B4`), and exit 2 (`$3CFA`) to Las Vegas at (43,11), which leaves question square 1 behind.

### The trapped room

- The door at (28,24) and (29,24) is check square 2 (`$3AC1`): "This door looks incredibly strong." (message 48). It refuses a step (flags `$02`; game `$8DEC-$8E0E`). Picklock 6, ST 9, a Plastic explosive, LAW rocket, Mangler, Sabot rocket or RPG-7 Used on it shows "This door is open." (message 49) and makes that square tile square 2 (`$3C16`, tile 58); a failed Use shows "Still closed." (message 50).
- A step onto tile square 2 makes it action square 0: `trapped_room_blast`, then check square 3 (`$3ADA`), whose only pair is skill 37 as well (flags `$50`). For any other first member than Dan Citrine it fails: "As you walk into the room you are caught in the middle of an explosion." (message 51) and 9 CON from every member, less each member's armour roll (`9D 89`; flag bit 0 clear, game `$90AF-$90B4`).
- Remote-change square 9 (`$3DFA`) follows. It puts encounters 13 and 14 (`$3BEC`, `$3BF8`), one Guard (monster 1) each, ""You'll never get out of here alive."" (message 52), on (28,26) and (29,26), and makes both door squares tile square 3 (`$3C1A`, tile 54). A pass makes the square plain ground.
