# Map 43, Mine shaft — verified technical facts

The mine shaft: "Some pre-holocaust miner has hewn a tunnel into the living rock of the mountain. Now the smell tells you it is home for many desert creatures." (message 1). The world map enters it with "Entering a mine shaft." (map 0's message 7, on its exit 25, to (23,30)), and exit 0 leads back to the world map, map 0, at (32,53). It is a map of 32 by 32 squares. It is stored on side 1 of the disks from track 11, logical sector 15, 22 pages: entry 43 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$49FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 1 draws it (part tiles-1). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 1: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 50, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 70 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 13, `$3A31` (game `$B047`), and one of the first 3 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 43 of the stream directory, T35/L13. The unpack runs on to `$E30B`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 44 to 76 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 483 | | | |
| 1 message | 14 | `$3A5C` | 7 | 7 |
| 2 check | 13 | `$3A79` | 21 | 21 |
| 3 encounter | 12 | `$3C16` | 21, 2 null | 19 |
| 4 tile | 4 | `$3D24` | 10, 1 null | 9 |
| 5 loot bag | 0 | `$3D54` | 20, 2 null | 18 |
| 6 action | 0 | `$3E0C` | 4 | 4 |
| 10 exit | 1 | `$3EA2` | 3 | 3 |
| 11 blocking | 497 | `$3EB9` | 4 | 4 |
| 12 remote change | 0 | `$3EC9` | 6, 2 null | 4 |
| 15 random encounter | 0 | `$3F04` | 6 | 6 |
| total | 1,024 | | | 95 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3E14`); 1 the map's routine 1 (`$3E17`); 2 the map's routine 2 (`$3E1A`); 3 the map's routine 2 (`$3E1F`).
- The code list, header word 19, is at `$3E24` (`run_action` reads it at game `$885C`): routine 0 `$3E2A`; routine 1 `$3E39`; routine 2 `$3E48`.
- The text, header word 0, is at `$410D` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 20 group offsets at `$4149`, and messages 0 to 76 in groups of four, `$4171-$49AA`. Message 76 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 85 bytes after it, `$49AB-$49FF`. Messages 24, 36 and 37, below it, are named by none of them either.
- 18 monster names at `$3F58` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4075`, monster *n* at `$4075` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Rad Rat, 2 Cave Critter, 3 Slithering Lizard, 4 Naked Molerat, 5 Blind Minecrawler, 6 Tunnel Lizard, 7 Shaft Slider, 8 Shadowclaw, 9 Rubble Fanger, 10 Dark Viper, 11 Little Person, 12 Undergrounder, 13 Drool, 14 Gecko, 15 Skink, 16 Shell Cougar, 17 Scav and 18 Glowviper.
- Characters who can join: none. Header word 20, `$3A28`, holds `$3F58`, the address of the monster names, and no encounter record names an NPC (byte +9, high nibble).
- Exits (class 10, list `$3EA2`; `square_exit`, game `$89A3`): to the world map, map 0 (exit 0, to (32,53), asking first); 2 within the map (exits 1 and 2).

## Its own code

- `$3E2A` `mining_draws_attacks`, routine 0, run by action record 0 (`$3E14`: `00 06 02`). It takes the map record's +$2F (`$3A2F`), the N of the 1 in N chance of a random encounter after a step (`random_encounter`, game `$B017`), subtracts 2 and writes the result back only when it is above 0 and below 128 (the `BMI` and `BEQ` at `$3E31` and `$3E33`). It returns with carry clear (`$3E37-$3E38`), so `run_action` does not redraw the view (game `$8872`). From the 70 the map stores, N goes down by 2 each time to 2 and stays there. The record's change then makes the square action square 2, which runs at once (`square_action`, game `$8840`; `run_square_action`, game `$ACCE-$ACD1`). (run on the map's snapshot: 70 became 68; 2 and 130 were left as they were)
- `$3E39` `mining_wakes_monsters`, routine 1, run by action record 1 (`$3E17`: `01 06 03`). It adds 1 to the map record's +$31 (`$3A31`), the highest monster number a random encounter picks from (game `$B045-$B04F`), and writes the sum back only up to 16 (`CMP #$11` at `$3E40`); a sum of 17 leaves through `$3E37`, the tail it shares with routine 0. Otherwise it returns with carry clear at `$3E46-$3E47`. The record's change then makes the square action square 3, which runs at once. (run on the map's snapshot: 13 became 14; 16 was left as it was)
- `$3E48` `refill_silver_bag`, routine 2, run by action records 2 (`$3E1A`: `02 02 0C 12 09`) and 3 (`$3E1F`: `02 02 0E 13 0A`). It takes the record's byte +3, the template bag, into `$3EA0` `silver_template_bag` and +4, the bag to fill, into `$3EA1` `silver_target_bag` (`$3E48-$3E53`), and keeps `$5F/$60` on the stack. It finds the template through `action_record` (engine `$0428`, Y = 5) and points `$14/$15` at it (`$3E5C-$3E6A`), finds the bag to fill the same way (`$3E6C-$3E71`), and copies item and count bytes from +2 up to an `$FF`, which it copies too (`$3E74-$3E8C`). A cash entry, `$5E` or `$DE`, has its two amount bytes copied and ends the copy, so the bag's own `$FF` after them is relied on (`$3E8E-$3E96`). It puts `$5F/$60` back and returns with carry clear (`$3E98-$3E9F`). Record 2 copies loot bag 18 into bag 9 and makes the square check square 12 again; record 3 copies bag 19 into bag 10 and makes it check square 14. (run on the map's snapshot: with bag 9 emptied, `$3DD4` = 0 and `$3DD5` = 4, record 2 wrote back `$5E` and 10, and record 3 did the same for bag 10 at `$3DDA-$3DDB`)
- `$3EA0` `silver_template_bag` and `$3EA1` `silver_target_bag` are data bytes, written at `$3E4C` and `$3E53` and read at `$3E5C` and `$3E6C`. Both are 0 as stored.

### The veins

- The silver veins are at (26,21), check square 11 (`$3B92`), and at (2,3), check square 13 (`$3BAC`). Each shows "There is a lot of rubble on the floor as if someone has been chipping at the walls recently. The rocks look strange." (message 25) on arrival and runs no check (flags `$80`). Metallurgy 2 Used on it (`02 1C`) shows "There is a vein of silver here! Someone with a pickaxe could chip out a lot of money." (message 26) and makes it check square 12 (`$3B9F`) or 14 (`$3BB9`); a failed Use shows "All you see are strange looking rocks." (message 27).
- A Pick ax (item 53) Used on check square 12 or 14 (`20 35`) shows "You get to work and chip out quite a bit of silver." (message 38) and makes the square loot bag 9 (`$3DD2`) or 10 (`$3DD8`), which then opens (game `$8CBA-$8CC3`; `after_move`, game `$AC72`): 1 to 10 in cash, rolled when the bag is first opened (game `$91B8-$91BF`). Anything else Used on it shows "All you scrape out is a little bit of dust." (message 39; flags `$82`, bit 1, game `$8DC8-$8DD3`). The Pick ax is not used up: one taken from a loot bag has a count of 0 (game `$32B4`), from which `use_item_charge` takes nothing (engine `$14B0-$14B2`).
- Emptied, bag 9 becomes action square 0 and bag 10 action square 1 (`$3DD2`: `06 00`; `$3DD8`: `06 01`), and then action square 2 or 3 refills the bag and puts the pick-ax check back, so each vein can be mined again and again.
- Each emptying of bag 9 makes random encounters more frequent: 1 in 68, then 1 in 66, and so on down to 1 in 2.
- Each emptying of bag 10 adds one monster to those random encounters pick from, from monsters 1 to 13 as stored up to 1 to 16. No encounter record of the map names monsters 14, 15 and 16, the Gecko, the Skink and the Shell Cougar (its 19 encounter records, class 3, name monsters 1 to 9, 11, 13, 17 and 18, and its six class 15 records, `$3F10-$3F57`, are empty slots), so they appear only after the vein at (2,3) has been mined.
- The template bags 18 (`$3E00`) and 19 (`$3E06`) hold the same contents as bags 9 and 10 as stored, 10 in cash. No square, change or code of the map names them except through records 2 and 3.
