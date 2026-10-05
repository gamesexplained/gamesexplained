# Map 22, Darwin, the base — verified technical facts

The base outside Darwin Village, where the village sends the party ("I think you should look into these problems at the base.", map 21's message 38) and where map 21's exit 7 leads, to (49,1). Finster's office (message 25) and the Mindlink machine (message 45) are on it. It is a map of 64 by 64 squares. It is stored on side 4 of the disks from track 13, logical sector 4, 38 pages: entry 22 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$59FF` and unpacks its tile layer to `$DE00-$EDFF`. Tile set 8 draws it (part tiles-8). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$4C00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$4C00-$4C2B`), 11 setting bytes (`$4C2C-$4C36`) and 37 combat phrase numbers (`$4C37-$4C5B`).
- 64 by 64 squares: `$4C2C` holds 64, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 8: `$4C30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 0, `$4C33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 30 after a step, `$4C2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 7, `$4C31` (game `$B047`), and one of the first 4 class-15 records must be free, `$4C32` (game `$B040`).
- A step takes half a minute: `$4C34` holds 128, in 256ths of a minute, and `$4C35` 0 whole minutes (`advance_clock`, game `$AF32`). `$4C36` adds 2 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$EDFF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 22 of the stream directory, T35/L13.
- The combat phrases, `$4C37-$4C5B`, name messages 61 to 93 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$3BFF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3C00-$4BFF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$4C06-$4C25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 1,326 | | | |
| 1 message | 748 | `$4C5C` | 9 | 9 |
| 2 check | 347 | `$4C86` | 18, 4 null | 14 |
| 3 encounter | 0 | `$4DFA` | 8, 1 null | 7 |
| 4 tile | 4 | `$4E5E` | 6, 1 null | 5 |
| 5 loot bag | 0 | `$4E79` | 3, 1 null | 2 |
| 6 action | 0 | `$4E92` | 3, 2 null | 1 |
| 8 question | 3 | `$4EB0` | 9 | 9 |
| 10 exit | 26 | `$4F1B` | 25, 1 null | 24 |
| 11 blocking | 1,637 | `$4FCE` | 10 | 10 |
| 12 remote change | 5 | `$4FF6` | 13, 1 null | 12 |
| 15 random encounter | 0 | `$50F9` | 4 | 4 |
| total | 4,096 | | | 97 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 2 the map's routine 2 (`$4E98`).
- The code list, header word 19, is at `$4E9B` (`run_action` reads it at game `$885C`): routine 0 null; routine 1 null; routine 2 `$4EA1`.
- The text, header word 0, is at `$5215` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 24 group offsets at `$5251`, and messages 0 to 93 in groups of four, `$5281-$59D9`. Message 93 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 38 bytes after it, `$59DA-$59FF`. Messages 11, 30, 37 and 55, below it, are named by none of them either.
- 8 monster names at `$5131` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$51CD`, monster *n* at `$51CD` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Spawn Wolf, 2 Rodento Grosso, 3 Spineback Puma, 4 Shadow Panther, 5 Carapaced Coyote, 6 Humongous Coyote, 7 Spawnmaster and 8 Irwin John Finster.
- Characters who can join: none. Header word 20, `$4C28`, holds `$4EB0`, the address at which the class 8 and 9 lists begin, and no encounter record names an NPC (byte +9, high nibble).
- Exits (class 10, list `$4F1B`; `square_exit`, game `$89A3`): to Darwin Village, map 21 (exit 22, to (15,28), asking first); to Finster's mind maze, map 23 (exit 21, to (10,16)); 22 within the map (exits 0-17, 19, 20, 23 and 24; 4 of them relative to the party's square). No square, and no change the squares lead to, names exits 18 and 20.

## Its own code

- `$4EA1` `seal_hatch_fewer_encounters`, routine 2, run by action record 2 (`$4E98`: `02 04 02`). It adds 10 to the record's random-encounter chance, `$4C2F`, and writes the sum back only when it is below 200 (`CMP #$C8` at `$4EA8`), then returns with carry clear (`$4EA1-$4EAF`). The record's change then makes the party's square tile square 2 (`$4E70`: message 39, "The hatch has been sealed shut.", tile 72), whose own change, `$FF`, writes nothing, so a sealed hatch stays sealed. (run on the map's snapshot: 30 became 40; 190 and 195 stayed)
- Routines 0 and 1 of the code list at `$4E9B` are null, and no action record names them.

### The hatches

- The three floor hatches are check squares 6, 7 and 8 (`$4D0B`, `$4D3A`, `$4D69`) at (50,29), (61,29) and (50,39). Their flags, `$88`, let the party walk on (bit 7) without testing the pairs (bit 6 clear): arriving shows message 38, "A small closed hatch is in the floor.". A Use aimed at a hatch tests them, and each passing pair has its own change (bit 3).
- Plastic explosive, TNT, a LAW rocket, a Mangler, a Sabot rocket or an RPG-7 (items 7, 8, 11, 9, 10 and 12) makes the hatch action square 2, which seals it. ST at difficulty 3, a Crowbar (item 45) or a Sledge hammer (item 56) opens it instead (the last three changes, `$4D34-$4D39` and the same offsets in the other two): hatch 6 becomes encounter 5 (`$4E3A`: 1 to 7 Spawn Wolves), hatch 7 encounter 6 (`$4E46`) and hatch 8 encounter 7 (`$4E52`), each one Spawnmaster. All three show message 40, "As you open the hatch mutants attack.".
- Wiped out, each of the three encounters makes its square check square 15 (`$4DC7`; game `$BA71`), the open hatch: walkable, message 42, "An open hatch is in the floor.", and the same six explosives Used on it make it action square 2.
- Sealing all three hatches turns 1 chance in 30 of a random encounter into 1 in 60. The change goes back to the disk with the map: `save_map` (engine `$2856`) writes the map's pages, the record among them, back to its sectors before `enter_map` loads another map (engine `$25C3`).
