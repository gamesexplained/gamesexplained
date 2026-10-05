# Map 21, Darwin Village — verified technical facts

Darwin Village: the world map enters it with "Entering Darwin Village." (map 0's message 10, on its exits 28 to 31), and this map leaves it with "Leaving Darwin Village." (message 23, on exits 8 and 12 to 18). It is a map of 32 by 32 squares. It is stored on side 4 of the disks from track 14, logical sector 5, 22 pages: entry 21 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$49FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 7 draws it (part tiles-7). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 7: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 35, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 40 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 7, `$3A31` (game `$B047`), and one of the first 8 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes half a minute: `$3A34` holds 128, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 2 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 21 of the stream directory, T35/L13. The unpack runs on to `$E48B`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 78 to 110 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 277 | | | |
| 1 message | 137 | `$3A5C` | 30 | 30 |
| 2 check | 6 | `$3AF3` | 9 | 9 |
| 3 encounter | 0 | `$3B86` | 4 | 4 |
| 4 tile | 2 | `$3BBE` | 3 | 3 |
| 5 loot bag | 0 | `$3BCD` | 5 | 5 |
| 6 action | 0 | `$3BFA` | 5 | 5 |
| 8 question | 2 | `$3CE0` | 6 | 6 |
| 10 exit | 79 | `$3D55` | 23 | 23 |
| 11 blocking | 521 | `$3DFC` | 2 | 2 |
| 12 remote change | 0 | `$3E04` | 4 | 4 |
| 15 random encounter | 0 | `$3E34` | 8 | 8 |
| total | 1,024 | | | 99 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the doctor, module 0 "Patch em up" (`$3C04`); 1 a shop, module 1 "Market" (`$3C17`); 2 a shop, module 1 "Blackmarket" (`$3C2D`); 3 the library, module 2 "Library" (`$3C50`); 4 the map's routine 0 (`$3C7F`).
- The code list, header word 19, is at `$3C84` (`run_action` reads it at game `$885C`): routine 0 `$3C86`.
- The text, header word 0, is at `$4182` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 29 group offsets at `$41BE`, and messages 0 to 110 in groups of four, `$41F8-$4972`. Message 110 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 141 bytes after it, `$4973-$49FF`. 
- 9 monster names at `$40AA` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4132`, monster *n* at `$4132` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Spineless Ghoul, 2 Night Screamer, 3 Desert Scum, 4 Bandit, 5 Biker Thug, 6 Base Policeman, 7 Towny, 8 Mad Dog Fargo and 9 Metal Maniac.
- Characters who can join: NPC 1, "MAD DOG FARGO" (`$3EAA`), hired from encounter 0 (`$3B8E`); NPC 2, "METAL MANIAC" (`$3FAA`), hired from encounter 1 (`$3B9A`). The list is at `$3EA4` (header word 20; `order_hire`, game `$A3F1`, reads it at game `$A424`), and the character's 256-byte record is copied whole (game `$A42C-$A433`); the NPC number is the high nibble of the encounter record's byte +9.
- Exits (class 10, list `$3D55`; `square_exit`, game `$89A3`): to the world map, map 0 (exits 8 and 12-18, to (59,36), (58,38), (56,37), (57,35), (59,37), (57,38), (56,36) and (58,35), each asking first); to Darwin, the base, map 22 (exit 7, to (49,1), asking first); 14 within the map (exits 0-6, 9-11 and 19-22; 4 of them relative to the party's square).
- The shops are reached through exits that move the party nowhere: exits 19 to 22 (`$3DE4-$3DFB`) are relative by 0,0, ask first, show messages 31 to 34 ("Entering the Darwin general store.", "Entering the Black Market.", "Entering Dr. Jekyll's body shop.", "Entering the Darwin Branch Library.") and change the exit square into action square 1, 2, 0 or 3.

## Its own code

- `$3C86` `refill_antitoxin_bag`, routine 0, run by action record 4 (`$3C7F`: `00 05 03 04 03`). It copies one loot bag into another. Record byte +3 names the template bag and +4 the bag to fill; it keeps them at `$3CDE` and `$3CDF` (`$3C86-$3C93`). With the square's record pointer `$5F/$60` saved on the stack, `action_record` (engine `$0428`, Y = 5, class 5) finds the template, whose address goes to `$14/$15` (`$3C9A-$3CA8`), then the bag to fill, left in `$5F/$60` (`$3CAA-$3CAF`). From byte +2 it copies item and count pairs up to and including the item byte `$FF` (`$3CB2-$3CCA`). A cash item, `$5E`, or `$DE` once opened, has its two amount bytes copied after it and ends the copy there, without the `$FF` (`$3CB8-$3CBE`, `$3CCC-$3CD4`). It puts `$5F/$60` back and returns with carry clear (`$3CD6-$3CDD`), so `run_action` does not redraw the view (game `$8872`).
- `$3CDE` `refill_template_bag` and `$3CDF` `refill_target_bag`: the two bag numbers, written at `$3C8A` and `$3C91`, read at `$3C9A` and `$3CAA`. Both are 0 as the map is stored.
- `$3CA9` is the operand byte of the `STA $15` at `$3CA8`, not an instruction. The game's `BIT $3CA9` at game `$81DE` names it only because that instruction's operand bytes are the `LDA #$3C` the game enters at game `$81DF`.

### The antitoxin workbench

- The workbench is check square 6 (`$3B59`) at (21,8). Its flags, `$0A`, refuse a step onto it unless the checks pass (bit 7 clear) and leave its pairs untested on a step (bit 6 clear), so a step shows message 69, "This is a workbench." (`$3B5A`; game `$8E2B`), and fails. A Use aimed at it tests the pairs, and bit 3 gives each passing pair its own change (`$3B68-$3B6B`): a Chemical (item 65) makes it check square 7 (`$3B6C`), Fruit (item 92) check square 8 (`$3B79`). A passing Use and, by bit 1, a failed one both show message 70, "Interesting." (`$3B5B`, `$3B5C`).
- Check square 7 takes Fruit and check square 8 a Chemical. Either success shows message 71, "Ah! What a genius you are.", and makes the square action square 4 (`$3B70`, `$3B7D`); a failure shows message 70 and makes it check square 6 again (`$3B72`, `$3B7F`).
- Action square 4 runs `refill_antitoxin_bag` with +3 = 4 and +4 = 3. Loot bag 4 (`$3BF5`: one Antitoxin, item 59) is copied into loot bag 3 (`$3BF0`), and the record's change, class 5 number 3, makes the party's square loot bag 3 (`$3C80`; game `$8840`). Its handler runs at once, since `run_square_action` runs the new square's handler while the carry is set (game `$ACCE-$ACD1`).
- Emptied, loot bag 3 becomes check square 6 again (`$3BF0`: class 2, number 6; game `$92C7`), so the workbench can make Antitoxin again each time both Uses succeed.
- No square and no change names loot bag 4; only action record 4's byte +3 does, as data. Loot bag 2 (`$3BEB`) also holds one Antitoxin, and no square, change or code names it.
