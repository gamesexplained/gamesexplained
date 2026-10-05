# Map 27, Temple of Blood — verified technical facts

The Temple of Blood in Needles: "You are in the entryway to the Temple of Blood!" (message 1) and "Leaving the Temple of Blood." (message 2, on exit 0). Needles enters it with "Entering the Temple of Blood." (map 26's message 6, on its exits 12 and 15). It is a map of 32 by 32 squares. It is stored on side 2 of the disks from track 13, logical sector 8, 25 pages: entry 27 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$4CFF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 2 draws it (part tiles-2). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 2: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 80 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 4, `$3A31` (game `$B047`), and one of the first 6 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 27 of the stream directory, T35/L13. The unpack runs on to `$E35A`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 75 to 107 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 160 | | | |
| 1 message | 295 | `$3A5C` | 25, 4 null | 21 |
| 2 check | 29 | `$3ABE` | 14 | 14 |
| 3 encounter | 2 | `$3BC2` | 5, 1 null | 4 |
| 4 tile | 10 | `$3BFC` | 15 | 15 |
| 5 loot bag | 0 | `$3C4C` | 6 | 6 |
| 6 action | 0 | `$3C81` | 3 | 3 |
| 8 question | 5 | `$3CA2` | 6 | 6 |
| 10 exit | 9 | `$3CE3` | 12 | 12 |
| 11 blocking | 509 | `$3D3C` | 7 | 7 |
| 12 remote change | 5 | `$3D58` | 15, 1 null | 14 |
| 15 random encounter | 0 | `$3F9A` | 6 | 6 |
| total | 1,024 | | | 108 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3C87`); 1 the map's routine 1 (`$3C89`); 2 the map's routine 2 (`$3C8B`).
- The code list, header word 19, is at `$3C8E` (`run_action` reads it at game `$885C`): routine 0 `$3C94`; routine 1 `$3C97`; routine 2 `$3C9F`.
- The text, header word 0, is at `$4174` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 28 group offsets at `$41B0`, and messages 0 to 107 in groups of four, `$41E8-$4C68`. Message 107 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 151 bytes after it, `$4C69-$4CFF`. Message 27, below it, is named by none of them either.
- 6 monster names at `$40F2` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$413C`, monster *n* at `$413C` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Silicon Sniper, 2 Hunter, 3 Killer, 4 Guard, 5 Executioner and 6 Hobo.
- Characters who can join: NPC 1, "RALF" (`$3FF2`), hired from encounter 4 (`$3BF0`). The list is at `$3FEE` (header word 20; `order_hire`, game `$A3F1`, reads it at game `$A424`), and the character's 256-byte record is copied whole (game `$A42C-$A433`); the NPC number is the high nibble of the encounter record's byte +9.
- Exits (class 10, list `$3CE3`; `square_exit`, game `$89A3`): to Needles, map 26 (exits 0, 6 and 8, to (9,9), (12,7) and (12,11), each asking first); to Under the Temple of Blood, map 28 (exits 5 and 9, to (16,30) and (16,30); exit 9 asks first); 7 within the map (exits 1-4, 7, 10 and 11).
- Two exits lead down to map 28, both to (16,30): exit 5 (`$3D17`), "A trapdoor opens in the floor and you fall through to..." (message 32), and exit 9 (`$3D2C`), "You step down the steps into..." (message 58).

## Its own code

- `$3C94` `robes_missing_encounters`, routine 0, run by action record 0 (`$3C87`: `00 FD`). It loads 30; the `BIT` at `$3C96` (`2C A9 64`) hides routine 1's `LDA #100` in its operand bytes, so the code goes on at `$3C99` into routine 1's store with A still 30: the record's random-encounter chance, `$3A2F`, becomes 30. It returns with carry clear. (run on the map's snapshot: 80 became 30)
- `$3C97` `robes_worn_encounters`, routine 1, run by action record 1 (`$3C89`: `01 FD`): the same store with 100, so `$3A2F` becomes 100, and carry clear (`$3C97-$3C9E`). (run on the map's snapshot: 80 became 100)
- `$3C9F` `self_destruct_blast`, routine 2, run by action record 2 (`$3C8B`: `02 02 0D`): a `JMP` to `screen_shake` (engine `$044C`), the explosion's sound and shaking screen. It returns with the carry that `random_byte`'s last addition left (engine `$24EC`), so whether `run_action` redraws the view afterwards (game `$8872`) is left to chance.

### The robes

- The robe check is check square 4 (`$3B40`) on 13 squares: (26,14), (24,16), (4,17), (29,17), (2,19), (26,19), (4,22), (23,22), (12,24), (17,24), (4,27), (6,30) and (12,30). Its flags, `$E0`, test every conscious member on arrival for a Robe (item 42) carried (game `$8E65-$8E70`). When every one carries one, the square becomes action square 1 and encounters come 1 time in 100; otherwise action square 0, 1 in 30. The map's own value is 80.
- Both action records' change is `$FD`, which puts check square 4 back and returns carry clear (engine `$0A38-$0A3C`), so `run_square_action` does not run it again at once (game `$ACCE-$ACD1`); the robes are checked again on the next robe square.

### The launch code

- Question square 5 (`$3CD5`) at (14,3) and (15,4) asks message 55, "Please help me! I have been trying to figure out the launch code for months. If you know what it is, please tell me.", answered with a typed line.
- MORTAR or ATOM (messages 72 and 73) makes the square action square 2: the blast, then check square 13 (`$3BB5`). Its flags, `$D0`, test the first conscious member on arrival and put the effect on everybody: 20d6 of CON less each member's armour roll (`$3BBD-$3BBE`; flag bit 0 clear, game `$90AF-$90B4`), with message 74, "You've entered the self destruct code by mistake.". Its failure change gives remote-change square 3 (`$3E36`), which changes (15,3), (15,4), (14,3) and (16,3) and makes the party's square message square 0.
- Check square 13's only pair is skill 37 at difficulty 1 (`$3BBF-$3BC0`). Among the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party (Hell Razor, Angela Deth, Thrasher and Snake Vargas), only Dan Citrine's holds skill 37: NPC 2 of map 6 (map-06 `$44A0`), in his last skill pair at level `$FF`, which `skill_level` (engine `$1392`) finds by searching all 30 pairs. So the check fails unless he is the first conscious member.
- MOTEKIM (message 56) makes the square remote-change square 14 (`$3F57`): message 59, "The man shouts, "Free at last!" and runs out.", tile square 11 on (25,4), (25,5), (26,4), (26,5) and (15,3), blocking square 6 on (25,2), (26,2), (25,3), (25,6), (25,7) and (26,7), and message square 0 on (15,4) and (14,3). Any other answer gives message square 19 (`$3AB2`: message 61, "No, that's not it."), whose `$FE` puts the question back.
