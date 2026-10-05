# Map 32, Needles downtown, Leroy's — verified technical facts

The west half of downtown Needles. Needles leads in with "Going downtown." (map 26's message 5, on its exits 11 and 22), and the way back says "Leaving Downtown." (message 16, on exits 0 and 5). Leroy's is here ("Entering Leroy's arms counter.", message 1, on exit 6; "Leroy's Place: A boutique.", message 23), and exit 2 leads 30 squares east into the other half of downtown, map 33. It is a map of 32 by 32 squares. It is stored on side 2 of the disks from track 10, logical sector 7, 26 pages: entry 32 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$4DFF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 2 draws it (part tiles-2). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 2: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 50 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 2, `$3A31` (game `$B047`), and one of the first 3 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 32 of the stream directory, T35/L13. The unpack runs on to `$E33F`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 69 to 101 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 386 | | | |
| 1 message | 230 | `$3A5C` | 16, 5 null | 11 |
| 2 check | 16 | `$3A94` | 17 | 17 |
| 3 encounter | 11 | `$3C61` | 17, 6 null | 11 |
| 4 tile | 1 | `$3D07` | 5 | 5 |
| 5 loot bag | 1 | `$3D21` | 20, 4 null | 16 |
| 6 action | 0 | `$3DBC` | 26, 2 null | 24 |
| 8 question | 7 | `$3F49` | 5 | 5 |
| 10 exit | 52 | `$3F78` | 7 | 7 |
| 11 blocking | 320 | `$3FAB` | 17 | 17 |
| 12 remote change | 0 | `$3FEF` | 10, 2 null | 8 |
| 15 random encounter | 0 | `$4080` | 3 | 3 |
| total | 1,024 | | | 124 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 1 a shop, module 1 "Thrift shop" (`$3DF0`); 3 the map's routine 0 (`$3E15`); 4 the map's routine 2 (`$3E19`); 5 the map's routine 2 (`$3E1E`); 6 the map's routine 2 (`$3E23`); 7 the map's routine 2 (`$3E28`); 8 the map's routine 2 (`$3E2D`); 9 the map's routine 2 (`$3E32`); 10 the map's routine 2 (`$3E37`); 11 the map's routine 2 (`$3E3C`); 12 the map's routine 2 (`$3E41`); 13 the map's routine 2 (`$3E46`); 14 the map's routine 2 (`$3E4B`); 15 the map's routine 2 (`$3E50`); 16 the map's routine 2 (`$3E55`); 17 the map's routine 2 (`$3E5A`); 18 the map's routine 2 (`$3E5F`); 19 the map's routine 2 (`$3E64`); 20 the map's routine 2 (`$3E69`); 21 the map's routine 2 (`$3E6E`); 22 the map's routine 2 (`$3E73`); 23 the map's routine 2 (`$3E78`); 24 the map's routine 2 (`$3E7D`); 25 the map's routine 2 (`$3E82`).
- The code list, header word 19, is at `$3E87` (`run_action` reads it at game `$885C`): routine 0 `$3E8D`; routine 1 `$3EB8`; routine 2 `$3F12`.
- The text, header word 0, is at `$422B` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 26 group offsets at `$4267`, and messages 0 to 101 in groups of four, `$429B-$4D6B`. Message 101 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 148 bytes after it, `$4D6C-$4DFF`. Messages 38 and 52, below it, are named by none of them either.
- 6 monster names at `$41AE` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$41F3`, monster *n* at `$41F3` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Jerk, 2 Leather Jerk, 3 Brass Jerk, 4 Jerk Leader, 5 Gambler and 6 Woman.
- Characters who can join: NPC 1, "CHRISTINA" (`$40AE`), hired from encounter 16 (`$3CFB`). The list is at `$40AA` (header word 20; `order_hire`, game `$A3F1`, reads it at game `$A424`), and the character's 256-byte record is copied whole (game `$A42C-$A433`); the NPC number is the high nibble of the encounter record's byte +9.
- Exits (class 10, list `$3F78`; `square_exit`, game `$89A3`): to Needles, map 26 (exits 0 and 5, to (61,30) and (57,36), each asking first); to Needles downtown, Hobo Dogs, map 33 (exit 2, to 30 east and 1 south of its square, asking first); 4 within the map (exits 1, 3, 4 and 6; 1 of them relative to the party's square).

## Its own code

- `$3E8D` `lady_infects_party`, routine 0, run by action record 3 (`$3E15`: `00 0A 01 01`). It is the code of map 24's `sewage_infects_party` (map-24 `$3DD4`) byte for byte but for its own addresses: for each position from 1 up to the party's member count, `$07`, it makes the member current (engine `$0335`) and ORs the bit for disease *n*, *n* the record's byte +3, into the member's byte +$28 through the masks at `$3EB0` (`$3E8D-$3EAC`), then returns with carry clear (`$3EAE-$3EAF`). With +3 = 1 the disease is Wasteland Herpes, bit 1 (module-0 `$CC04`: bit *n* is its message *n*+1). The record's change then makes the square exit 1. (run on the map's snapshot: +$28 of records 1 to 4, engine `$F528-$F828`, went from 0 to 2)
- `$3EB0` `lady_disease_masks`: `$01`, `$02`, `$04` up to `$80`, read at `$3E9A` with X = the record's byte +3.
- `$3EA4` `lady_member` is the operand of the `LDA #` at `$3EA3`: the position, written at `$3E8F`, then plus one and compared with `$07` at `$3EA8`. It is 0 as stored.
- `$3EB8` `unused_bag_refill`, routine 1, is the code of map 21's `refill_antitoxin_bag` (map-21 `$3C86`) byte for byte but for the addresses of its two variables, `$3F10` `unused_template_bag` and `$3F11` `unused_target_bag`, both 0 as stored. Nothing runs it: `run_action` calls routine *n* for an action record whose byte +0 is *n* (game `$885C`), the 24 records of the action list at `$3DBC` hold `$81`, 0 or 2 there, and no instruction of the map's code jumps to it.
- `$3F12` `poker_pot`, routine 2, run by action records 4 to 25 (`$3E19-$3E82`: `02 05 0F nn 00`). It keeps the record's bytes +3 and +4 at `$3F47` `poker_pot_low` and `$3F48` `poker_pot_high` (`$3F12-$3F1F`), saves `$5F/$60` on the stack, finds loot bag 15 (`$3D9D`) through `action_record` (engine `$0428`, A = 15, Y = 5), and writes a cash entry there: `$5E` at +2, then the two bytes at +3 and +4 (`$3F2D-$3F3D`). It puts `$5F/$60` back and returns with carry clear (`$3F3F-$3F46`); the record's change then makes the square loot bag 15. (run on the map's snapshot: with action record 4, `$3DA0` went from 16 to 110; with action record 25, to 5)

### The three-legged lady

- Question square 0 (`$3F53`) at (12,9) and (11,10) asks message 18: "A sexy 3-legged lady leans against the wall. "Interested, cutie? $50!" Do you go for it (Y/N)?". Y (message 19) makes the square check square 7 (`$3B89`); no answer or another key gives message square 14 (`$3A90`: "Too bad, sailor, ya might've had a good time.", message 58), whose `$FD` puts the question back.
- Check square 7 passes only for a party of one (pair `61 01`, game `$8E85-$8E8A`); a larger party hears "Hey, I can only take on one at a time!" (message 21). Passing gives check square 13 (`$3C2D`), whose pair passes when the member's byte +$18, the sex, is 1 (`attribute_check`, engine `$0D0A`), with "Look, I just don't DO ladies." (message 64). Failing it gives check square 5 (`$3B63`): a member with less than 50 in cash passes and hears "Ya can't rip me off, sailor. $50 or forget it!" (message 22); one with 50 or more fails, pays 50 (the effect, `95 B2`) and the square becomes action square 3.
- Each refusal ends in remote-change square 3 (`$402E`), which puts question square 0 back on (11,10) and (12,9).
- After `lady_infects_party`, exit 1 (`$3F8B`) takes the party to (17,1) of this map with message 20, "She brings you into a quiet room, where you have an interesting time. She then walks off, leaving you feeling ... unclean.", and leaves question square 0 behind it. The one character who paid has Wasteland Herpes, which stops natural healing (`con_heal_one`, game `$B854`, gives no point while +$28 is not 0) and costs no CON over time (`health_tick`, game `$B7A2-$B7A8`, takes only bits 4 to 7 for that).

### Poker

- The table is question square 3 (`$3F6A`) at (25,22) and (24,24): "Some gamblers huddling over the table. "We play pretty high stakes poker here, ranger. $50 ante, plus $50 table stakes."" with P)lay a hand and L)eave (message 43). P (message 44) makes the square check square 9 (`$3BA3`).
- Check square 9 passes for a first conscious member with less than 100 in cash (pair `80 64`): "You don't have enough money to play!" (message 45), and the table comes back. With 100 or more the check fails, its effect takes the 50 ante (`95 B2`), and the square becomes check square 12 (`$3BD6`), the hand.
- Check square 12 tests the first conscious member against 19 pairs, Gamble and LK by turns, from Gamble 25 and LK 30 down to Gamble 2 and LK 4, and gives each pair its own change (flags `$C8`, game `$8F4C`). The first pair passed shows "You win back..." (message 62) and makes the square one of action squares 4 to 25, whose amounts run from 110 for the first pair down to 5 for the last in steps of 5. No square and no change names action records 14, 18 and 22, the amounts 60, 40 and 20.
- Loot bag 15 pays 1 to the amount when it is first opened, since opening rolls each byte of an unopened cash entry from 1 to itself (game `$91B8-$91BF`, `loot_roll_next_byte` at game `$92E1`), and, emptied, it becomes question square 3 again (`$3D9D`: `08 03`).
- If no pair passes, the square becomes check square 10 (`$3BB0`): "You lose!" (message 46). Its only pair is skill 37, which, of the 14 NPC records of the 42 maps and the four Rangers of the starting party, only Dan Citrine holds (map-06 `$44A0`; `skill_level`, engine `$1392`), so for any other first member it fails, takes 8d6 of cash (`15 88`) and puts question square 3 back. Its success change names check square 10 itself (`$3BB4-$3BB5`: `02 0A`). With Dan Citrine first, his level `$FF` adds 1,020 to the roll (`times_four`, engine `$087D`, 16 bits) against a target of 20 (15 + 5 x 1, engine `$0C34`), so every roll of 5 or more passes and runs the check again at once (game `$ACCE-$ACD1`), with "You lose!" each time, until a roll under 5, which `skill_check` (engine `$0C29`) fails whatever the level, ends it.
