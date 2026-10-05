# Map 36, Guardian Citadel, the Outer Sanctum — verified technical facts

"The Outer Sanctum of the Guardians' Citadel is massive and decorated with items from the time before the holocaust." (message 8). Map 35's exit 3 leads in, 4 columns east and 22 rows south of its square, and this map's exit 3 leads back the same distance; exit 5 leads on to the Inner Sanctum, map 42, 10 columns east and 6 rows south. It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 15, logical sector 8, 32 pages: entry 36 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$53FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 4 draws it (part tiles-4). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 4: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 0, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 36 of the stream directory, T35/L13. The unpack runs on to `$E30A`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 70 to 102 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 439 | | | |
| 1 message | 42 | `$3A5C` | 18 | 18 |
| 2 check | 53 | `$3AAD` | 22, 1 null | 21 |
| 3 encounter | 18 | `$3C8A` | 20 | 20 |
| 4 tile | 6 | `$3DA2` | 26, 11 null | 15 |
| 5 loot bag | 4 | `$3E09` | 24 | 24 |
| 6 action | 0 | `$3EFB` | 5 | 5 |
| 10 exit | 9 | `$3F2F` | 8 | 8 |
| 11 blocking | 453 | `$3F69` | 5, 1 null | 4 |
| 12 remote change | 0 | `$3F7B` | 1 | 1 |
| total | 1,024 | | | 116 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the library, module 2 "Technical" (`$3F05`); 1 the map's routine 0 (`$3F1E`); 2 the map's routine 0 (`$3F21`); 3 the map's routine 0 (`$3F24`); 4 the map's routine 0 (`$3F27`).
- The code list, header word 19, is at `$3F2A` (`run_action` reads it at game `$885C`): routine 0 `$3F2C`.
- The text, header word 0, is at `$436B` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 27 group offsets at `$43A7`, and messages 0 to 102 in groups of four, `$43DD-$53C6`. Message 102 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 57 bytes after it, `$53C7-$53FF`. Message 10, below it, is named by none of them either.
- 33 monster names at `$4098` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$425B`, monster *n* at `$425B` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Warden Nicholas, 2 Jailer Corbett, 3 Jailer Patrick, 4 Brother Andrew, 5 Brother Mark, 6 Brother Matthew, 7 Warden Jethro, 8 Master Bruce, 9 Mistress Jennifer, 10 Monk Petall, 11 Monk Johan, 12 Mistress Krys, 13 Monk Russ, 14 Master Imaro, 15 Mistress Kerin, 16 Adept Roxanne, 17 Adept Mandisa, 18 Priestess Elexa, 19 Sister Faith, 20 Cardinal Scott, 21 Master Ciro, 22 Adept Kate, 23 Brother Nuris, 24 Master Griffin, 25 Sister Tracy, 26 Adept Alina, 27 Master Tomas, 28 Brother Dick, 29 Brother Harold, 30 Master Paz, 31 Brother Jackson, 32 Brother Nobel and 33 Redhawk.
- Characters who can join: NPC 1, "REDHAWK" (`$3F98`), hired from encounter 19 (`$3D96`). The list is at `$3F94` (header word 20; `order_hire`, game `$A3F1`, reads it at game `$A424`), and the character's 256-byte record is copied whole (game `$A42C-$A433`); the NPC number is the high nibble of the encounter record's byte +9.
- Exits (class 10, list `$3F2F`; `square_exit`, game `$89A3`): to Guardian Citadel, map 35 (exit 3, to 4 west and 22 north of its square, asking first); to Guardian Citadel, the Inner Sanctum, map 42 (exit 5, to 10 east and 6 south of its square, asking first); 6 within the map (exits 0-2, 4, 6 and 7; 2 of them relative to the party's square). No square, and no change the squares lead to, names exit 6.

## Its own code

- `$3F2C` `sanctum_blast`, routine 0, run by action records 1 (`$3F1E`: `00 02 14`), 2 (`$3F21`: `00 02 0A`), 3 (`$3F24`: `00 02 15`) and 4 (`$3F27`: `00 04 0A`). It is a `JMP` to `screen_shake` (engine `$044C`), an explosion's sound and shaking screen. It returns with the carry that `random_byte`'s last addition left (engine `$24EC`), so whether `run_action` redraws the view afterwards (game `$8872`) is left to chance. The records then make the square check square 20, 10 or 21, or tile square 10, which runs at once (`run_square_action`, game `$ACCE-$ACD1`).

### Four blasts

- Check squares 10, 20 and 21 have skill 37 at difficulty 4 as their only pair (`04 25`), and the first conscious member decides (flags `$D0`). Of the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party, only Dan Citrine's holds skill 37 (map-06 `$44A0`; `skill_level`, engine `$1392`), so for any other first member they fail, and their effect hits every member (flag bit 4).
- The hidden switch. Check square 19 (`$3C5F`) at (23,5) tests every conscious member on arrival against Perception 4, IQ 5 and LK 8, and each must pass one (flags `$E0`; game `$8EF6-$8F28`). If anyone fails, the square becomes action square 1, the blast, and then check square 20 (`$3C70`): "Someone stepped on a hidden switch and triggered a fiery explosion in this secton of hallway!" (message 63), 12d6 of CON for every member, less each member's armour roll (`1D 8C`; flag bit 0 clear, game `$90AF-$90B4`), and plain ground.
- The bomb on the Guardian. Tile square 24 at (29,21) becomes check square 8 (`$3BC9`) when the party steps on it, and that runs at once and tests every conscious member against AGL 5, Acrobat 4, Perception 5, IQ 6 and LK 7; each one who passes none takes 11d6 of CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), with "A hidden Guardian erupts from behind a partition and sprays you with laser fire!" (message 40). Either way the square becomes encounter 7 (`$3D06`), one Monk Russ (monster 13), and wiping it out leaves loot bag 8 (`$3E77`: two Laser pistols and 4 Power packs). Emptied, the bag becomes tile square 14 (`$3DFA`: "The dead Guardian's body looks odd to you for some reason.", message 41, tile 7), which shows its message and becomes check square 9 (`$3BDE`).
- Check square 9 runs no check on arrival (flags `$80`). Perception 4 Used on it shows "You detect a strange bulge on the Guardian's waistline. It could be a bomb." (message 43) and makes it check square 11 (`$3BF8`). A failed Use shows "You see light glint off a gold and onyx ring on his hand." (message 42) and makes it loot bag 9 (`$3E7E`, an Onyx ring), which, emptied, becomes action square 2.
- Check square 11 runs no check on arrival either. Bomb disarm 5 or Demolitions 7 Used on it shows "It was nerve-wracking, but you did it. The bomb has been successfully disarmed." (message 46) and makes it loot bag 10 (`$3E83`: an Onyx ring and 1 to 7 Plastic explosives), which, emptied, becomes tile square 25 (`$3E06`, tile 57). A failed Use makes it action square 2.
- Action square 2 is the blast, and then check square 10 (`$3BEB`): "The bundle of plastic explosive hidden on the Guardian's abdomen detonates!" (message 44), then "***BOOM*** Shards of armor piercing shrapnel sizzle through the air!" (message 45) and 7 CON for every member (`9D 87`, a fixed amount) less each member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), and tile square 25.
- The satchel charge. The door at (28,11) is check square 5 (`$3B70`): "This door has a curious sign on it. "I am meditating. Disturb me at the peril of your life."" (message 26). It refuses a step (flags `$08`; game `$8DEC-$8E0E`) and gives each pair its own change (`$3B91-$3BA6`): a Plastic explosive, LAW rocket, Mangler, Sabot rocket, RPG-7 or TNT makes it tile square 7 (`$3DEB`, message 18), Picklock 1 or ST 6 tile square 8 (`$3DEF`: "Open doorway.", message 27), and a Crowbar, Sledge hammer or Proton ax tile square 9 (`$3DF3`, message 19).
- A step onto any of the three makes it check square 6 (`$3BA7`), which runs at once: "You hear a loud *BOOM* as a gently lofted satchel charge lands at your feet and explodes." (message 28). Every conscious member must pass AGL 6, Acrobat 4 or LK 7 (flags `$E0`).
- If all pass: "You manage to leap back from the doorway as the explosion flames the whole junction of corridors there." (message 29), then action square 4: the blast, and tile square 10 (`$3DF7`: "Splinters and fragments of wood hanging upon fireblack hinges are all that remain of the door that once was here.", message 18, tile 54).
- If anyone fails: action square 3, the blast, and check square 21 (`$3C7D`), whose failure takes 16d6 of CON from every member, less each member's armour roll (`1D 90`; flag bit 0 clear, game `$90AF-$90B4`) and shows message 29 too (`$3C80`: `1D`), the same leap back from the doorway. Then tile square 10.
