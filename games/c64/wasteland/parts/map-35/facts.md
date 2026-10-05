# Map 35, Guardian Citadel — verified technical facts

The valley before the Guardian Citadel and the Citadel's first halls. The world map enters it with "Entering the Guardian's Citadel." (map 0's message 9, on its exit 27, to (8,30)), and message square 11 here shows "Carved into the side of a mountain you see a huge black structure you recognize as the Guardian Citadel. Read paragraph 85." (message 49). Exits 4, 5 and 6 lead back with "Back to the desert." (message 48), and exit 3 leads on into the Outer Sanctum, map 36. It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 17, logical sector 0, 34 pages: entry 35 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$55FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 4 draws it (part tiles-4). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 4: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes half a minute: `$3A34` holds 128, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 2 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 35 of the stream directory, T35/L13. The unpack runs on to `$E269`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 79 to 111 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 516 | | | |
| 1 message | 43 | `$3A5C` | 19, 1 null | 18 |
| 2 check | 107 | `$3AAB` | 22, 3 null | 19 |
| 3 encounter | 14 | `$3D0E` | 19 | 19 |
| 4 tile | 0 | `$3E18` | 8 | 8 |
| 5 loot bag | 2 | `$3E40` | 14 | 14 |
| 6 action | 38 | `$3EB2` | 3 | 3 |
| 10 exit | 43 | `$3F16` | 7 | 7 |
| 11 blocking | 261 | `$3F4A` | 17, 1 null | 16 |
| 12 remote change | 0 | `$3F8D` | 6 | 6 |
| total | 1,024 | | | 110 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3EB8`); 1 the map's routine 1 (`$3EBB`); 2 the map's routine 1 (`$3EC5`).
- The code list, header word 19, is at `$3ED2` (`run_action` reads it at game `$885C`): routine 0 `$3ED6`; routine 1 `$3ED9`.
- The text, header word 0, is at `$438E` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 29 group offsets at `$43CA`, and messages 0 to 111 in groups of four, `$4404-$5549`. Message 111 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 182 bytes after it, `$554A-$55FF`. Messages 50 and 62, below it, are named by none of them either.
- 38 monster names at `$4027` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4256`, monster *n* at `$4256` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Brother Raphael, 2 Brother Donatello, 3 Brother Phillip, 4 Brother Juaquin, 5 Brother Thomas, 6 Brother Lucas, 7 Brother Goliath, 8 Sister Theodosia, 9 Sister Lucretia, 10 Sister Ursula, 11 Brother Anthony, 12 Brother Boris, 13 Brother Nathan, 14 Brother David, 15 Brother Akira, 16 Sister Jade, 17 Sister Isolde, 18 Brother Diego, 19 Brother Donald, 20 Sister Marie, 21 Brother George, 22 Sister Grace, 23 Sister Wrath, 24 Brother Austin, 25 Brother Frederick, 26 Brother Broderick, 27 Brother Dominic, 28 Brother Greg, 29 Brother Weez, 30 Brother Joseph, 31 Brother James, 32 Brother Kenneth, 33 Brother Robert, 34 Brother Carl, 35 Brother Richard, 36 Sister June, 37 Sister May and 38 Sister April.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3F16`; `square_exit`, game `$89A3`): to the world map, map 0 (exits 4-6, to (35,48), (36,49) and (37,48), each asking first); to Guardian Citadel, the Outer Sanctum, map 36 (exit 3, to 4 east and 22 south of its square, asking first); 3 within the map (exits 0-2; 2 of them relative to the party's square). No square, and no change the squares lead to, names exit 1.

## Its own code

- `$3ED6` `armory_bomb_blast`, routine 0, run by action record 0 (`$3EB8`: `00 02 15`). It is a `JMP` to `screen_shake` (engine `$044C`), the bomb's sound and shaking screen. It returns with the carry that `random_byte`'s last addition left (engine `$24EC`), so whether `run_action` redraws the view afterwards (game `$8872`) is left to chance. The record then makes the square check square 21, which runs at once (`run_square_action`, game `$ACCE-$ACD1`).
- `$3ED9` `citadel_gear_check`, routine 1, run by action records 1 (`$3EBB`: `01 FF FF FF FF 01 03 28 23 FF`) and 2 (`$3EC5`: `01 FF FF FF FF 01 05 19 1B 1C 1A 1D FF`). For each member from position 1 up to the party's member count, `$07`, it makes the member current (engine `$0335`) and looks for each item number of the record from +7 up to an `$FF` with `find_item` (engine `$0344`) (`$3ED9-$3EFF`). The first item found ends the search and copies the record's pair at +3/+4 into +1/+2; when nobody carries any of them, the pair at +5/+6 is copied (`$3F01-$3F13`). That pair is the change `square_action` makes next (game `$8840`). It returns with carry clear (`$3F14-$3F15`). (run on the map's snapshot, whose four members carry none of the items: record 1 got `$01 $03` and record 2 `$01 $05`; with item 35 put in member 3's first item slot, engine `$F7BD`, record 1 kept `$FF $FF`, and with item 29 in member 2's, engine `$F6BD`, so did record 2)
- `$3EF2` `gear_list_offset` is the operand of the `LDY #` at `$3EF1`: the record offset of the item being looked for, 7 at the start of each member's search (`$3EE1-$3EE3`) and one more for each item (`$3EF3`). `$3EF7` `gear_member`, the operand of the `LDA #` at `$3EF6`, holds the position (`$3ED9-$3EDB`), which is raised by one and compared with `$07` at `$3EF8-$3EFF`. Both are 0 as stored.
- `$3F04` `gear_found`: the branch at `$3EEF`, taken when an item is found, lands inside the `BIT` at `$3F03` (`2C A0 03`), whose operand bytes are a `LDY #$03`, so the pair at +3/+4 is copied. Coming down from `$3F01` the `BIT` hides them, and Y stays 5.

### The gear checks

- Action square 1 lies on (8,24) to (14,24), (15,25), (16,26), (17,27), (18,28) and (19,29) to (26,29). It looks for Pseudo-chitin armor (item 40) or Power armor (item 35). Without either, the square becomes message square 3 (`$3A89`): "This close to the Citadel you realize you've not got the armor it would take to survive an assault on this place." (message 53).
- Action square 2 lies one row up on each of those columns, (8,23) to (14,23), (15,24), (16,25), (17,26), (18,27) and (19,28) to (26,28). It looks for a Laser pistol, Ion beamer, Laser carbine, Laser rifle or Meson cannon (items 25 to 29). Without one, the square becomes message square 5 (`$3A8D`): "Another look at those black obsidian walls also tells you that you don't have the weapons to crack this nut yet." (message 54).
- Both message squares end in `$FD`, which puts the action square back and returns carry clear (engine `$0A38-$0A3C`), so it waits for the next step onto it. With the gear the change is `$FF $FF`, which writes nothing. Neither stops the party.

### The armory bomb

- The armory is message square 8 at (1,8), "Guardian of the Old Order Armory." (message 33). Loot bag 5 (`$3E7F`) at (2,10) holds two Laser rifles, a Meson cannon and 12 Power packs. Emptied, it becomes check square 8 (`$3B95`), which runs at once with "CLICK!" (message 35) and tests every conscious member's Perception 5, one pass enough (flags `$E4`). A pass shows "You notice a pressure plate all around the energy weapon rack. Any movement in here might set off the bomb in back." (message 36), a fail "That click sounded like a booby trap arming itself. Any movement will probably trigger it." (message 39).
- Either way remote-change square 2 (`$3FE0`) follows. It makes (2,9) and (1,10), the two squares beside (2,10) that are not wall, action square 0, and the party's square check square 9 (`$3BA2`).
- Check square 9 runs no check on arrival (flags `$80`). Bomb disarm at difficulty 6 Used on it (`06 18`) shows "It was touch and go but you managed to disarm the bomb." (message 37), and remote-change square 3 (`$3FED`) makes (2,9) and (1,10) plain ground again and the party's square loot bag 6 (`$3E88`, two Plastic explosives). A failed Use makes the square action square 0 (`$3BA8-$3BA9`: `06 00`), which then runs (game `$8CFA-$8D02`, game `$8CBA-$8CC3`; `after_move`, game `$AC72`).
- Action square 0 runs `armory_bomb_blast` and becomes check square 21 (`$3D01`). Its only pair is skill 37 at difficulty 1 (`01 25`), and the first conscious member decides (flags `$50`). Of the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party, only Dan Citrine's holds skill 37 (map-06 `$44A0`; `skill_level`, engine `$1392`). For any other first member the check fails: "*****BOOM*****" (message 38) and 14d6 of CON for every member, less each member's armour roll (`1D 8E`; flag bit 0 clear, game `$90AF-$90B4`).
- The failure then gives remote-change square 4 (`$3FFA`). It makes (1,8), (1,9), (1,10), (2,8), (2,9) and (2,10) tile square 1 (`$3E2B`: "This burned-out shell of a room used to be the Guardian Armory before Rangers remodeled it.", message 41, tile 53), and it puts encounter 13 (`$3DD0`) on (5,12): Brother Frederick, Brother Broderick and Brother Dominic (monsters 25, 26 and 27), one each. A pass makes the square plain ground.
