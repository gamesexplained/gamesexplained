# Map 33, Needles downtown, Hobo Dogs — verified technical facts

The east half of downtown Needles, with the Hobo Dogs stand: "This is a fast food stand. A girl behind the counter says, "Welcome to Hobo Dogs. Items are $5 each. Would you like to order (Y/N)?"" (message 12). Needles leads in with "Going downtown." (map 26's message 5, on its exits 20, 23 and 24), and the way back says "Leaving Downtown." (message 34, on exits 2, 3 and 5). Map 32's exit 2 leads in from 30 squares west, and exit 0 leads back. It is a map of 32 by 32 squares. It is stored on side 2 of the disks from track 9, logical sector 2, 35 pages: entry 33 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$56FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 2 draws it (part tiles-2). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 2: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 50 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 2, `$3A31` (game `$B047`), and one of the first 3 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 33 of the stream directory, T35/L13. The unpack runs on to `$E272`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 107 to 139 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 421 | | | |
| 1 message | 71 | `$3A5C` | 25, 1 null | 24 |
| 2 check | 19 | `$3ACA` | 22, 2 null | 20 |
| 3 encounter | 1 | `$3C6A` | 1 | 1 |
| 4 tile | 128 | `$3C78` | 17 | 17 |
| 5 loot bag | 2 | `$3CCE` | 9, 1 null | 8 |
| 6 action | 0 | `$3D0F` | 16, 1 null | 15 |
| 8 question | 4 | `$3EBE` | 4 | 4 |
| 10 exit | 26 | `$3F03` | 8, 1 null | 7 |
| 11 blocking | 333 | `$3F37` | 30 | 30 |
| 12 remote change | 19 | `$3FB3` | 25, 6 null | 19 |
| 15 random encounter | 0 | `$4400` | 3 | 3 |
| total | 1,024 | | | 148 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 1 the map's routine 1 (`$3D2F`); 2 the map's routine 0 (`$3D34`); 3 the map's routine 2 (`$3D37`); 4 the map's routine 2 (`$3D47`); 5 the map's routine 2 (`$3D65`); 6 the map's routine 2 (`$3D81`); 7 the map's routine 2 (`$3D91`); 8 the map's routine 2 (`$3DBB`); 9 the map's routine 0 (`$3DE3`); 10 the map's routine 0 (`$3DE6`); 11 the map's routine 0 (`$3DE9`); 12 the map's routine 0 (`$3DEC`); 13 the map's routine 0 (`$3DEF`); 14 the map's routine 0 (`$3DF2`); 15 the map's routine 1 (`$3DF5`).
- The code list, header word 19, is at `$3DFA` (`run_action` reads it at game `$885C`): routine 0 `$3E00`; routine 1 `$3E03`; routine 2 `$3E5D`.
- The text, header word 0, is at `$4475` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 36 group offsets at `$44B1`, and messages 0 to 139 in groups of four, `$44F9-$56DB`. Message 139 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 36 bytes after it, `$56DC-$56FF`. Messages 74 and 75, below it, are named by none of them either.
- 3 monster names at `$442A` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4455`, monster *n* at `$4455` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Jerk, 2 Leather Jerk and 3 Brass Jerk.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3F03`; `square_exit`, game `$89A3`): to Needles, map 26 (exits 2, 3 and 5, to 20 east and 24 south of its square, (40,36) and 35 east and 16 south of its square, each asking first); to Needles downtown, Leroy's, map 32 (exit 0, to 30 west and 1 north of its square, asking first); 3 within the map (exits 1, 6 and 7; 1 of them relative to the party's square). No square, and no change the squares lead to, names exit 4.

## Its own code

- `$3E00` `howitzer_blast`, routine 0, run by action records 2 (`$3D34`: `00 02 09`) and 9 to 14 (`$3DE3-$3DF4`: `00 0C 13` to `00 0C 18`). It is a `JMP` to `screen_shake` (engine `$044C`), the shell's sound and shaking screen. It returns with the carry that `random_byte`'s last addition left (engine `$24EC`), so whether `run_action` redraws the view afterwards (game `$8872`) is left to chance.
- `$3E03` `refill_bar_bag`, routine 1, run by action records 1 (`$3D2F`: `01 05 06 05 06`) and 15 (`$3DF5`: `01 05 08 07 08`). It is the code of map 21's `refill_antitoxin_bag` (map-21 `$3C86`) byte for byte but for the addresses of its two variables: record byte +3 names the template bag and +4 the bag to fill, kept at `$3E5B` `bar_template_bag` and `$3E5C` `bar_target_bag` (both 0 as stored), and the template's item and count bytes are copied from +2 up to its `$FF`, a cash item ending the copy after its two amount bytes (`$3E03-$3E52`). It returns with carry clear (`$3E59-$3E5A`); the record's change then makes the square the bag it filled. (run on the map's snapshot: with loot bag 8's first entry cleared, `$3D0C-$3D0D`, action record 15 wrote `$BE $01` there, one item 62; with loot bag 6's, `$3D02-$3D03`, action record 1 wrote `$B9 $01`, one Snake squeezin)
- `$3E5D` `other_party_in_blast`, routine 2, run by action records 3 to 8 (`$3D37`, `$3D47`, `$3D65`, `$3D81`, `$3D91`, `$3DBB`). For each party from `last_party` (`$0B`) down to 0 except the current one (`$08`), it points `$68/$69` at the party's 14-byte table (`party_table_ptr` through engine `$029F`) and, when the table's +$0A is this map (`$09`), compares its column and row, +8 and +9, with each (column, row) pair of the record from +7 up to an `$FF` (`$3E5D-$3EA4`). A match copies the record's pair at +3/+4 into +1/+2, and no match the pair at +5/+6 (`$3EA6-$3EB4`): the change `square_action` makes next (game `$8840`). It points `$68/$69` back at the current party's table and returns with carry clear (`$3EB6-$3EBC`). Nothing in it changes the other party. (run on the map's snapshot: with no other party on the map, record 3 got `$0C $10`; with party 1 put on map 33 at (20,3), a square of record 3's list, it got `$01 $02`, and at (20,6), outside it, `$0C $10`)
- `$3EBD` `blast_list_offset` holds the offset of the pair being compared, from 7 (`$3E71-$3E73`, read back at `$3E98`). The operands of the `CMP #` at `$3E89` and `$3E90`, `$3E8A` `blast_column` and `$3E91` `blast_row`, are written with the pair at `$3E7C` and `$3E82`, and the operand of the `LDA #` at `$3E9F`, `$3EA0` `blast_party`, holds the party being looked at (`$3E5F`). All are 0 as stored.

### The howitzer

- The howitzer at (28,2) is check square 12 (`$3BE0`): "This is a working howitzer. You don't see any shells around, though." (message 7). It runs no check on arrival (flags `$80`); a Howitzer shell (item 33) Used on it makes it check square 6 (`$3B7A`), which the party then steps onto (game `$8CBA-$8CBC`).
- Check square 6 tests IQ 5, Demolitions 4 or AT weapon 2 for every conscious member, one pass enough (flags `$E4`). A pass shows "The shell slides into place with a "click!"" (message 67) and makes the square question square 3 (`$3EED`), which asks message 87: "You can fire the shell:" west, southwest or south, each with a low or high trajectory, A to F (messages 15 to 20).
- Each answer makes the square one of action squares 9 to 14, which run `howitzer_blast` and then make it remote-change square 19 to 24 (`$412D`, `$4180`, `$4200`, `$4235`, `$42E2`, `$4371`): "BOOM! The shell arcs high and impacts with an explosion!" (message 90). Each impact changes the squares of its target area, mostly to rubble: tile square 1 (`$3C9D`: "The wall has collapsed into impassable rubble.", message 79, a blocking tile) and check square 21 (`$3C3B`: "Rubble blocks you.", message 100). Shot C's impact leaves craters instead, message square 14 ("You walk through the crater.", message 88). Each also makes the party's square action square 3 to 8.
- Action squares 3 to 8 run `other_party_in_blast`, and each lists the squares of its target area that its impact makes check square 21 or, for shot C, message square 14. A match gives message square 2 (`$3A93`): "Your other party is swamped in rubble from the explosion!" (message 89), then remote-change square 16 (`$410F`); no match gives remote-change square 16 at once. It makes the party's square check square 12 again, ready for the next shell.
- If nobody passes check square 6, the square becomes action square 2: `howitzer_blast`, then check square 9 (`$3BB3`), whose only pair is skill 37 (`01 25`), which, of the 14 NPC records of the 42 maps and the four Rangers of the starting party, only Dan Citrine holds (map-06 `$44A0`; `skill_level`, engine `$1392`). For any other first member it fails: "You screw up somehow and the shell explodes!" (message 49), 5d6 of CON for every member, less each member's armour roll (flags `$D0`, bit 0 clear, game `$90AF-$90B4`; `1D 85`), and the howitzer becomes tile square 0 (`$3C9A`: "A howitzer, blown to bits because of mishandled shell loading!", message 86).

### The snake squeezin vendor

- The vendor at (27,26) and (26,27) is question square 2 (`$3EE5`): "A vendor has bottles on a bandolizer around his chest. "Want some snake squeezins? Best around, for $15!" (Y/N)" (message 50). Y makes the square check square 11 (`$3BD3`), which a first conscious member with less than 15 in cash passes: "You don't have the cash!" (message 40), and remote-change square 5 (`$3FFB`) puts the vendor back on both squares.
- With 15 or more the check fails, its effect takes the 15 (`95 8F`), and the square becomes action square 1: `refill_bar_bag` copies loot bag 5 (`$3CFB`, one Snake squeezin) into loot bag 6 (`$3D00`), and the square becomes bag 6. Emptied, it becomes question square 2 again (`$3D00`: `08 02`). No square and no change names loot bag 5; only action record 1's byte +3 does.

### The Bloodstaff verification table

- The table at (3,3) is check square 10 (`$3BC0`): "A sign above the table says, "Bloodstaff verification table. Place bloodstaff to be verified on table."" (message 103). A step onto it only shows the sign and is refused (flags `$0A`), and anything but a Bloodstaff Used on it shows "Bloodstaffs only, please." (message 105; game `$8DC8-$8DD3`). Each of its two pairs has its own change (`$3BCF-$3BD2`).
- Item 62 Used on it gives message square 23 (`$3AC4`): "Verification ok. Please remove bloodstaff." (message 104), then action square 15, which copies loot bag 7 (`$3D05`, one item 62) into loot bag 8 (`$3D0A`) and makes the table bag 8. Emptied, the bag becomes exit 6 (`$3F2C`), which moves the party one square west and puts check square 10 back. No square and no change names loot bag 7; only action record 15's byte +3 does.
- Item 63 Used on it gives message square 24 (`$3AC7`): "Crunch crunch. Verification failed." (message 106), then exit 6, with no bag.
- A Bloodstaff taken from a loot bag has a count of 1, the item record's byte +4 (game `$32FC`, game `$3304`), which `loot_pick_member` gives the new item (game `$928C-$929B`). A Use that matches a pair takes a charge (game `$8FAD`), and the last charge removes the item (`use_item_charge`, engine `$14A5`), so the table takes either staff and gives item 62 back through bag 8.
