# Map 31, Needles, waste pit and ammo bunker — verified technical facts

The town waste pit of Needles and the old ammo bunker beside it. Needles enters the pit with "Entering the town waste pit." (map 26's message 21, on its exit 18, to (6,7)) and the bunker with "It is cool and dark in the ammo bunker." (map 26's message 22, on its exit 19, to (24,11)), where this map's message 40 begins "A heavy musty smell fills the ammo bunker.". The way out of the bunker says "You walk out of the old ammo dump into the fresh dry air of Needles" (message 16, exit 5) and the way out of the pit "Up and out into the fresh air of the desert." (message 13, exit 0). It is a map of 32 by 32 squares. It is stored on side 2 of the disks from track 11, logical sector 6, 20 pages: entry 31 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$47FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 2 draws it (part tiles-2). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 2: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 50, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- Random encounters: 1 chance in 40 after a step, `$3A2F`, which `random_encounter` reads at game `$B017`. The monster is a type from 1 to 4, `$3A31` (game `$B047`), and one of the first 4 class-15 records must be free, `$3A32` (game `$B040`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 31 of the stream directory, T35/L13. The unpack runs on to `$E245`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 53 to 85 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 62 | | | |
| 1 message | 152 | `$3A5C` | 21 | 21 |
| 2 check | 13 | `$3AB4` | 9 | 9 |
| 3 encounter | 1 | `$3B75` | 1 | 1 |
| 4 tile | 0 | `$3B83` | 4 | 4 |
| 5 loot bag | 0 | `$3B97` | 6 | 6 |
| 6 action | 0 | `$3C9D` | 2 | 2 |
| 9 radiation | 1 | `$3BD5` | 1 | 1 |
| 10 exit | 9 | `$3BDA` | 7 | 7 |
| 11 blocking | 785 | `$3C0C` | 6 | 6 |
| 12 remote change | 1 | `$3C24` | 6 | 6 |
| 15 random encounter | 0 | `$3C65` | 4 | 4 |
| total | 1,024 | | | 67 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3CA1`); 1 the map's routine 0 (`$3CA4`).
- The code list, header word 19, is at `$3CA7` (`run_action` reads it at game `$885C`): routine 0 `$3CA9`.
- The text, header word 0, is at `$3D30` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 22 group offsets at `$3D6C`, and messages 0 to 85 in groups of four, `$3D98-$47E6`. Message 85 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 25 bytes after it, `$47E7-$47FF`.
- 5 monster names at `$3CAC` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$3D00`, monster *n* at `$3D00` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Desert Tube, 2 Trash Slitherer, 3 Death Angler, 4 Waste Worm and 5 Pit Ghoul.
- Characters who can join: none. Header word 20, `$3A28`, holds `$3CAC`, the address of the monster names, and no encounter record names an NPC (byte +9, high nibble).
- Exits (class 10, list `$3BDA`; `square_exit`, game `$89A3`): to Needles, map 26 (exits 0 and 5, to (13,55) and (49,15), each asking first); 5 within the map (exits 1-4 and 6; 1 of them relative to the party's square).
- Radiation square 0 (`$3BD7`: `0C 06 FF`) at (26,26) shows "A broken radioactive waste container is lying here buried in the trash." (message 12) and gives 6d6 of CON, less the member's AC rolled in d6 (message 12 is even; game `$90AF-$90B4`), to each member, conscious or not, who is not wearing a Rad suit (item 41), and sets that member's bit 0 of +$28, Radiation poisoning (`square_radiation`, game `$82E0-$8328`).
- The body at (30,5), check square 8 (`$3B68`), shows "A body lays here. You see an incision in his neck." (message 50) and tests the first conscious member's Perception 2 as the party tries to step onto it (flags `$40`; `blocking_check_square`, game `$8DEC`). Passing shows "You find..." (message 51) and makes it loot bag 5 (`$3BCE`: a Ruby ring and a Bloodstaff, item 63); failing shows "You see nothing unusual." (message 52) and refuses the step.

## Its own code

- `$3CA9` `ammo_bunker_blast`, routine 0, run by action records 0 (`$3CA1`: `00 02 06`) and 1 (`$3CA4`: `00 02 07`). It is a `JMP` to `screen_shake` (engine `$044C`), the explosion's sound and shaking screen. It returns with the carry that `random_byte`'s last addition left (engine `$24EC`), so whether `run_action` redraws the view afterwards (game `$8872`) is left to chance. The records then make the square check square 6 or 7, which runs at once (`run_square_action`, game `$ACCE-$ACD1`).

### The blast

- Check squares 6 and 7 (`$3B4E`, `$3B5B`) test the first conscious member and put the effect on everybody (flags `$50`). Their only pair is skill 37 at difficulty 1 (`01 25`). Among the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party, only Dan Citrine's holds skill 37 (NPC 2 of map 6, map-06 `$44A0`; `skill_level`, engine `$1392`), so for any other first member the check fails: "Whoops! You bumped it. Now your ..... BOOOOOOOOOM!" (message 42) and 3d6 of CON for every member, less each member's armour roll (`$3B56-$3B57`: `1D 83`; flag bit 0 clear, game `$90AF-$90B4`).
- Their failure changes give remote-change square 3 or 4 (`$3C4D`, `$3C55`). Each makes the square in front of the shelf, (21,3) or (28,3), message square 0 (`$3A86`), which shows nothing, in place of the shelf's description (message 34 or 35), and the party's square exit 6 (`$3C06`): "You are knocked back by the blast." (message 48), two rows south (relative +0,+2). The shelf becomes tile square 2 (`$3B91`, tile 54): "What a mess, these shelves were hit by a huge blast. Pieces of bloody robes are scattered about. Burned and blackened metal lies all around you." (message 46).

### What sets it off

- The old TNT at (21,1) is check square 3 (`$3B25`). Its flags, `$82`, let the party walk onto it with only "This TNT is so old and unstable that it will blow up if you do anything to it." (message 41). Its only pair is skill 37 as well, so a Use aimed at it fails unless it is of skill 37 or of Perception, which finds no pair and only shows "You see nothing special." (game `$8C32-$8C45`), leaving the square as it is; for any other Use the failure change makes it action square 0 (`$3B2B-$3B2C`), which the party then steps onto (game `$8CFA-$8D02`, game `$8CBA-$8CBC`).
- The explosives at (28,1) are check square 4 (`$3B32`): Perception 3 or Bomb disarm 3 for every conscious member on arrival, one pass enough (flags `$E4`). If nobody passes, the square becomes action square 1 and the blast follows at once. A pass shows "Hold it! This stuff looks boobytrapped, maybe that's why it's still here." (message 43) and makes it check square 5 (`$3B41`): "Someone with the right skill will have to disarm this very dangerous boobytrap." (message 44).
- A Use of Bomb disarm at difficulty 3 on check square 5 shows message 45, "You did it! Gee you are good at that. Maybe you should go adventuring with a skill like that.", and makes it loot bag 2 (`$3BB5`: 1 to 15 Grenades, 1 to 3 Plastic explosives and one TNT). A failed Use makes it action square 1 instead.
- The railing round the central shaft, check square 2 (`$3B18`) at (5,7) and (5,25), has skill 37 as its only pair too. Its flags, `$00`, run no check on a step, so it shows "The railing surrounding the central shaft blocks your way." (message 9) and refuses the step (game `$8DEC-$8E0E`).
