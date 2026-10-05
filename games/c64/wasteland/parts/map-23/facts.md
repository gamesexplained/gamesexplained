# Map 23, Finster's mind maze — verified technical facts

The maze inside Finster's mind. The party enters it through the Mindlink of map 22, whose exit 21 shows "The real world fades from your sight." (map 22's message 50) and leads here, to (10,16); Finster calls the place his mind ("How are you in my mind when I am dead?", message 30; "Don't play tricks on me in my mind.", message 37). It is a map of 32 by 32 squares. It is stored on side 4 of the disks from track 11, logical sector 8, 38 pages: entry 23 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$59FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 8 draws it (part tiles-8). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 8: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 75, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 23 of the stream directory, T35/L13. The unpack runs on to `$E2D6`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 122 to 154 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 640 | | | |
| 1 message | 36 | `$3A5C` | 37, 8 null | 29 |
| 2 check | 23 | `$3AEC` | 26 | 26 |
| 3 encounter | 7 | `$3CBE` | 8 | 8 |
| 4 tile | 0 | `$3D2E` | 10 | 10 |
| 5 loot bag | 0 | `$3D60` | 4 | 4 |
| 6 action | 0 | `$3D7E` | 2 | 2 |
| 8 question | 6 | `$3DAD` | 8 | 8 |
| 10 exit | 11 | `$3E0F` | 33, 1 null | 32 |
| 11 blocking | 286 | `$3EF6` | 20 | 20 |
| 12 remote change | 15 | `$3F47` | 26 | 26 |
| total | 1,024 | | | 165 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3D82`); 1 the map's routine 0 (`$3D89`).
- The code list, header word 19, is at `$3D90` (`run_action` reads it at game `$885C`): routine 0 `$3D92`.
- The text, header word 0, is at `$4301` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 40 group offsets at `$433D`, and messages 0 to 154 in groups of four, `$438D-$59F9`. Message 154 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 6 bytes after it, `$59FA-$59FF`. Message 15, below it, is named by none of them either.
- 8 monster names at `$423E` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$42B9`, monster *n* at `$42B9` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Night Terror, 2 Lie Spider, 3 Android, 4 Psychopathic Android, 5 Irwin John Finster, 6 Finster Sinister, 7 Finster Dexter and 8 Finster Leviathan.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$3E0F`; `square_exit`, game `$89A3`): to Darwin, the base, map 22 (exits 0, 28 and 31, to (26,12), (25,9) and (26,12); exit 0 asks first); 29 within the map (exits 2-27, 29, 30 and 32; 17 of them relative to the party's square). No square, and no change the squares lead to, names exits 1 and 17.

## Its own code

- `$3D92` `maze_throw_out_if_fainted`, routine 0, run by action records 0 (`$3D82`: `00 00 00 FE FE 0A 1F`) and 1 (`$3D89`: `00 00 00 0A 0C 0A 1F`). It asks whether the party's first member is conscious (`member_is_conscious` through engine `$02BA`, A = 1: carry clear for 1 CON or more) and copies the record's pair at +3/+4 (conscious) or +5/+6 (not) into +1/+2 (`$3D97-$3DA9`), the change that `square_action` makes once the routine returns (game `$8840`). It returns with carry clear (`$3DAB-$3DAC`). Only member 1 counts, whoever failed the check. As stored, +1/+2 of both records hold `00 00`. (run on the map's snapshot: with member 1's CON at 0 the record got `$0A $1F`, exit 31; otherwise `$FE $FE` in record 0 and `$0A $0C`, exit 12, in record 1)
- `$3DA9` `maze_store_class` is the `STA ($5F),Y` that writes the class byte into +1. The game's `BIT $3DA9` at game `$8DB8` names it only because that instruction's operand bytes are the `LDA #$3D` the game enters at game `$8DB9`.

### What leads to it

- The EEG is the block (1,1), (1,2), (2,1) and (2,2). Remote-change square 18 (`$4166`) puts check square 20 there; IQ at difficulty 1 Used on check square 20 (`$3C66`) puts check square 21 there (remote-change square 21, `$41B4`); IQ at difficulty 2 on check square 21 (`$3C73`) puts check square 22 there (remote-change square 22, `$41CA`); and IQ at difficulty 3 on check square 22 (`$3C80`) makes it exit 30 (`$3EE5`, to (26,6)). Messages 98 to 104 are the voices at the EEG, from "Look, the EEG is flat! The android won!" on.
- A failed Use on check square 21 or 22 costs 1 or 2 CON, armour ignored (flags `$81`, bit 0 set; `$3C7B`, `$3C88`) and makes the square action square 0. With member 1 conscious, its `$FE` puts the check square back; without, exit 31 (`$3EEB`) takes the party out of the maze to Darwin, the base, map 22, at (26,12).
- Action square 1 is what two of Finster's traps become when a party fails them on arrival (flags `$C0`): check square 23 (`$3C8D`) at (25,8) to (28,8), the fire (AGL 4, SP 4 or Acrobat 3; message 108, 12 CON), and check square 25 (`$3CAD`) at (25,11) to (28,11), the blade storm (AGL 5, less than 16 in cash, or Acrobat 4; message 114, 8 CON); each cost comes less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`). With member 1 conscious, exit 12 (`$3E88`) moves the party one square south, as passing does; without, exit 31.
