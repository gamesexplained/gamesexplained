# Map 28, Under the Temple of Blood — verified technical facts

The chamber under the Temple of Blood. None of its messages 0 to 75 names the place; the maps around it do. Map 27's exits 5 and 9 lead down into it, both to (16,30), by a trapdoor ("A trapdoor opens in the floor and you fall through to...", map 27's message 32) and by steps ("You step down the steps into...", map 27's message 58), and this map's exit 0 leads back up to map 27 with "You ascend the stairs." (message 33). The square they arrive on is message square 2 (`$3A66`): "This massive chamber consists of a great body of bloody water surrounding an island in the center. You stand on a small wooden dock at the south end of the chamber. To the north of you across the blood lies the island. You can just barely make out a large structure on the island." (message 32). It is a map of 32 by 32 squares. It is stored on side 2 of the disks from track 12, logical sector 4, 19 pages: entry 28 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$46FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 2 draws it (part tiles-2). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 2: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 50, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 28 of the stream directory, T35/L13. The unpack runs on to `$E4CB`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 43 to 75 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 218 | | | |
| 1 message | 4 | `$3A5C` | 4, 1 null | 3 |
| 2 check | 579 | `$3A6A` | 8, 1 null | 7 |
| 3 encounter | 17 | `$3B29` | 25 | 25 |
| 4 tile | 0 | `$3C87` | 5 | 5 |
| 5 loot bag | 0 | `$3CA1` | 15 | 15 |
| 8 question | 0 | `$3D48` | 2 | 2 |
| 10 exit | 2 | `$3D5A` | 3 | 3 |
| 11 blocking | 203 | `$3D6F` | 11 | 11 |
| 12 remote change | 1 | `$3DA3` | 6 | 6 |
| total | 1,024 | | | 77 |

- No code of its own: header word 19, `$3A26`, holds `$3D48`, the address at which the class 6, 7 and 8 lists begin, and the map has no action records to run code through.
- The text, header word 0, is at `$3EFF` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 20 group offsets at `$3F3B`, and messages 0 to 75 in groups of four, `$3F63-$4652`. Message 75 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 173 bytes after it, `$4653-$46FF`.
- 6 monster names at `$3E74` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$3EC7`, monster *n* at `$3EC7` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Glowing Slime, 2 Sniper, 3 Guard, 4 Auto Laser Turret, 5 Bloodbeast and 6 Blood Priest.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3D5A`; `square_exit`, game `$89A3`): to Temple of Blood, map 27 (exit 0, to (1,2), asking first); 2 within the map (exits 1 and 2; all relative to the party's square).
- Message square 3 (`$3A68`) at (1,1) shows message 4: "Grafitti is scratched into the wall here. It says, "The launch code is MOTEKIM."", the answer that map 27's question square 5 (map-27 `$3CD5`) waits for.

### The water and the island

- The water is check square 0 (`$3A7A`) on the 70 squares next to the island and check square 3 (`$3A94`) on 505 more, with the same bytes. On arrival they test Swim 2 for every conscious member (flags `$E1`), and each member who fails takes 1d6 of CON, armour ignored, with message 1, "You find that inhaling murky moatscum isn't very fun.". Either way the square becomes check square 1 (`$3A87`), which runs at once, since `alter_square` returns carry set for a square it writes (engine `$0A3D`) and `run_square_action` loops on it (game `$ACCE-$ACD1`): LK 3, and 1d6 of CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`) with "The fish are biting today. Ouch!" (message 2) for each member who fails. Its `$FD` change puts the water square back (engine `$0A38-$0A3C`).
- The island's gate is check square 4 (`$3AA1`) at (15,8) and (16,8), "A large wooden gate." (message 11). Its flags, `$08`, run no check when the party walks into it and give each pair its own change (game `$8F4C`). Picklock 5 or ST 7 gives remote-change square 1 (`$3DD0`: message 14, "What SKILL! The gates swing open at your mere touch."); a Plastic explosive, Grenade, LAW rocket, Mangler, Sabot rocket, RPG-7 or TNT gives remote-change square 0 (`$3DAF`: message 13, "BOOM!!! (So much for THAT gate!)"), which also puts encounters 10 and 11 (`$3BD3`, `$3BDF`: message 25, "A patrol spots you.") on (14,9) and (17,9). Both make the gate check square 5 (`$3AD0`) and the two squares behind it, (15,9) and (16,9), remote-change square 3 (`$3E12`), the pressure plate.
- Check square 5 tests Perception 3 for every conscious member on arrival, and one pass is enough (flags `$E4`): "You notice a pressure plate just inside the main gate." (message 3), and remote-change square 2 (`$3DF1`) makes the plate tile square 4 (`$3C9D`, tile 52) and the squares north and south of it question squares 0 (`$3D4C`) and 1 (`$3D53`): "Do you want to jump across the pressure sensitive plate? (Y/N)" (message 17). Y makes the square exit 1 (`$3D65`) or exit 2 (`$3D6A`), which move the party two rows south or north, over the plate.
- Stepping on the plate, remote-change square 3 itself or tile square 4, whose change leads to it, shows message 19, "As you tread on the pressure-plate, a laser turret to the south comes to life and starts blazing away.", and puts encounter 9 (`$3BC7`), one Auto Laser Turret (monster 4), on (15,12) in place of check square 6 (`$3ADD`), the turret at rest: "An automatic laser turret (currently inactive)." (message 21). A Plastic explosive, TNT or LAW rocket used on check square 6 gives remote-change square 4 (`$3E37`: message 22, "BOOM!! Rest assured this turret will never function again."), which makes the six squares of the gate and the plate, (15,8) to (16,10), message square 1 (`$3A64`, which shows nothing) and the turret's square tile square 0 (`$3C91`: "You stomp on the twisted wreckage of the turret", message 24, tile 53). Wiping out encounter 9 leaves the same tile square.
- The building at the centre has one door, check square 7 (`$3AEE`) at (15,18), "A heavy wooden door." (message 29). Picklock 2 makes it tile square 1 (`$3C94`: "The door is open.", message 30); ST 3, a Crowbar, Pick ax or Sledge hammer tile square 2 (`$3C97`) and an explosive tile square 3 (`$3C9A`), both "The shattered remains of a door hang on loose hinges." (message 31).
- Inside it, remote-change square 5 (`$3E58`) at (15,17) shows message 26, "Read paragraph 60.", and puts encounter 20 (`$3C4B`) on (16,14), encounters 21 and 22 (`$3C57`, `$3C63`) on (15,15) and (16,16), and encounters 23 and 24 (`$3C6F`, `$3C7B`) on (16,15) and (17,17). Encounter 20 is one Blood Priest (monster 6): "A robed man wielding a bloodstaff has a thirsty look on his face." (message 28). Encounters 21 and 22 are three lines of 1 to 4 Bloodbeasts (monster 5) each, and 23 and 24 are 1 to 4 Guards (monster 3).
- Four snipers, encounters 5 to 8 (`$3B97`, `$3BA3`, `$3BAF`, `$3BBB`), one Sniper (monster 2) each, stand at the island's corners, (8,23), (23,23), (23,8) and (8,8), seen within 30 feet and engaging within 60 (three and six squares); wiped out, they leave loot bags 11 to 14, each a gun and its clips.
- The chamber's outer walls, 120 squares, are blocking square 3 (`$3D8B`): "Moss covered walls rise into the darkness above." (message 15). Each bump moves a square on to the next of blocking squares 4 to 10 (`$3D8E-$3DA2`, game `$918F`), whose messages 35 to 41 read "You've", "got", "your", "balls", "to", "the", "wall.", and then to blocking square 0, message 15 with no further change.

### The Bloodstaff

- Items 62 and 63 are both named Bloodstaff: engine messages 98 and 99, since `print_item_name` (engine `$0BDC`) prints message *n* + 36 for item *n*. Their eight-byte item records are the same, `DC 05 00 90 01 00 01 00` (game `$32F8`, game `$3300`).
- Wiping out encounter 20 turns its square into loot bag 0 (`$3CBF`: `00 00 BE 01 FF`, game `$BA71-$BA78`), which holds one item 62 and becomes a plain square when emptied.
- Item 63 is in loot bag 8 (`$3D0A`), which a patrol, encounter 17 (`$3C27`) at (21,20), leaves, and in loot bag 13 (`$3D38`), which the sniper of encounter 7 leaves.
