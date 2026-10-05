# Map 38, Las Vegas, the Mushroom Cloud temple — verified technical facts

"This is the Temple of the Servants of the Mushroom cloud. Faded posters line the walls." (message 1). Las Vegas enters it with "Entering the Temple of the Servants of the Mushroom Cloud." (map 12's message 39, on its exit 10, to (17,30)), and exit 0 leads back to Las Vegas, map 12. The Las Vegas sewers, map 24, lead up into it ("Leaving this scumhole.", map 24's message 9, on its exit 4, to (1,3)), and exit 1 leads down to them. It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 13, logical sector 18, 37 pages: entry 38 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$58FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 5 draws it (part tiles-5). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 5: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 64, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes 2 minutes: `$3A34` holds 0, in 256ths of a minute, and `$3A35` 2 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 4 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 38 of the stream directory, T35/L13. The unpack runs on to `$E2E0`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 119 to 151 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 270 | | | |
| 1 message | 62 | `$3A5C` | 41, 1 null | 40 |
| 2 check | 43 | `$3B0C` | 23, 2 null | 21 |
| 3 encounter | 30 | `$3CE7` | 35 | 35 |
| 4 tile | 1 | `$3ED1` | 10, 2 null | 8 |
| 5 loot bag | 2 | `$3EFD` | 10 | 10 |
| 6 action | 1 | `$3F61` | 3 | 3 |
| 8 question | 1 | `$3FE2` | 7, 2 null | 5 |
| 9 radiation | 16 | `$4023` | 3 | 3 |
| 10 exit | 10 | `$4032` | 10 | 10 |
| 11 blocking | 583 | `$4080` | 11 | 11 |
| 12 remote change | 5 | `$40AC` | 24 | 24 |
| total | 1,024 | | | 170 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the doctor, module 0 "Nuclear Aid" (`$3F67`); 1 the library, module 2 "Knowledge" (`$3F7A`); 2 the map's routine 0 (`$3FAA`).
- The code list, header word 19, is at `$3FAE` (`run_action` reads it at game `$885C`): routine 0 `$3FB0`.
- The text, header word 0, is at `$471E` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 39 group offsets at `$475A`, and messages 0 to 151 in groups of four, `$47A8-$58C5`. Message 151 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 58 bytes after it, `$58C6-$58FF`. Messages 91, 92, 95, 96 and 107, below it, are named by none of them either.
- 9 monster names at `$4644` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$46CE`, monster *n* at `$46CE` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Meditator, 2 Radiation Angel, 3 Acolyte, 4 Temple Guardian, 5 Nuclear Techie, 6 Doctor, 7 Follower, 8 Worshipper and 9 Charmaine.
- Characters who can join: NPC 1, "DR. MIKE SCOT" (`$4544`), hired from encounter 15 (`$3DE1`). The list is at `$4540` (header word 20; `order_hire`, game `$A3F1`, reads it at game `$A424`), and the character's 256-byte record is copied whole (game `$A42C-$A433`); the NPC number is the high nibble of the encounter record's byte +9.
- Exits (class 10, list `$4032`; `square_exit`, game `$89A3`): to Las Vegas, map 12 (exit 0, to (57,25), asking first); to Las Vegas sewers, map 24 (exit 1, to (20,1), asking first); 8 within the map (exits 2-9; all relative to the party's square). No square, and no change the squares lead to, names exits 4-7.

## Its own code

- `$3FB0` `temple_turns_hostile`, routine 0, run by action record 2 (`$3FAA`: `00 0C 04 01`). It keeps `$5F/$60` on the stack, takes the record's byte +3 into `$3FE1` `temple_new_flags` (`$3FB0-$3FBA`), and for each encounter record from 16 up to 33, counted in `$3FE0` `temple_encounter_number`, finds the record through `action_record` (engine `$0428`, Y = 3) and writes that byte into its +9, the encounter's flags (`$3FBD-$3FD6`). It puts `$5F/$60` back and returns with carry clear (`$3FD8-$3FDF`). The record's change then makes the square remote-change square 4. (run on the map's snapshot: the 18 flag bytes `$3DF6`, `$3E02` ... `$3EC2` went from 3 to 1)
- `$3FE0` `temple_encounter_number` starts at 16 (`$3FBD-$3FBF`), goes up by one at `$3FCE` and stops at 34 (`CMP #$22`, `$3FD4`), so encounter 34, the priestess, keeps her own flags, `$03` (`$3ECE`). `$3FE1` `temple_new_flags` is read at `$3FC9`. Both are 0 as stored.
- Bit 1 of an encounter's +9 marks it peaceful (`encounter_is_peaceful`, game `$9EF6`) and bit 0 shows the monsters' own names. The 18 records start at `$03`, and record byte +3 is 1, so the whole congregation turns hostile at once.

### The congregation

- Encounters 16 to 19 are one Radiation Angel each: "This woman glows with a purple-white radiance." (message 26). Wiped out, each leaves radiation square 0 (`$4029`): "All that is left of the Radiation Angel is a pile of glowing dust." (message 43) and 2d6 of CON and Radiation poisoning, bit 0 of +$28, for each member not wearing a Rad suit (`square_radiation`, game `$82E0-$8328`).
- Encounters 20 to 23 are one Acolyte each: "A robed and bald young lad looks at you." (message 27). Encounters 24 to 26 are one Follower each and 27 to 29 one Worshipper each: "A raggedly group of religious zealots face you." (message 97). Encounters 30 to 33 are Temple Guardians, 4, 3, 7 and 4, and 6 and 9 in two lines: "Hideous almost human Temple guards face you." (message 28).
- Action square 2 stands at (11,4) as stored, beside a blocking tile square at (10,4): tile square 3 (`$3EEE`: `00 87 FF`), which draws tile 7, the tile `draw_party_marker` draws for the party (game `$AF1D`).
- After `temple_turns_hostile`, remote-change square 4 (`$415F`) puts encounter 34 (`$3EC5`) on (10,4): one Charmaine (monster 9), "The tall lovely priestess pulls a laser pistol from her robes." (message 98). It makes (12,4), (14,2), (17,2), (14,4), (19,4) and (16,5) plain ground, the message squares of her warning and of the chanting ("Nrc Nrc Nrc.", message 32; "You hear in the distance, "Nuke 'em till they glow, and shoot 'em in the dark."", message 33), and the party's square message square 0, which shows nothing.
- Three other squares lead to action square 2: answer FAT FREDDY to question square 6, message square 40 (`$3B09`) for the false Bloodstaff (below), and message square 6 (`$3ABC`): "So, you are part of that scum's gang. Get em'" (message 116). No square, change or code names message square 6 (the map's squares, every record's changes and the code list were searched).

### Charmaine and the Bloodstaff

- Message square 34 at (12,4) shows ""STOP THERE! Do not come any closer!" Charmaine demands. Even though she is glowing purple, she has got to be the most beautiful woman you have ever seen." (message 100) and becomes question square 4 (`$400E`), which asks at once: ""Do you seek the Great Glow (Y/N)?"" (message 37).
- N (message 39) gives message square 36 (`$3AFD`): ""Go to the meditation rooms and learn."" (message 102), and remote-change square 21 (`$451B`): ""Leave us now."" (message 109), which puts message square 34 back on the party's square.
- Y (message 38) gives question square 6 (`$4018`): ""Who sent you?"" (message 113), answered by typing. FAT FREDDY (message 114) gives action square 2. FARAN BRYGO (message 115) gives message square 19 (`$3ADA`, "Read paragraph 129.", message 103) and remote-change square 0 (`$40DC`), which makes the party's square check square 22 (`$3CD4`). No answer or another gives message square 36.
- Check square 22 shows ""Let me see the Bloodstaff."" (message 111) when the party steps onto it, runs no check (flags `$8A`), and gives each of its two pairs, items 62 and 63, both named Bloodstaff, its own change (`$3CE3-$3CE6`).
- Item 62 gives remote-change square 22 (`$4522`): ""Thank you for the Bloodstaff." Read paragraph 76." (message 104). It makes the walls at (3,3) and (4,18) tile square 2 (`$3EEB`: "An open door.", message 31) and check squares 4 and 3 beside them, at (4,3) and (5,18), plain ground; those two show "You have spotted a hidden door in the wall." (message 13) when a member passes Perception 5 on arrival (flags `$E4`). The party's square becomes message square 22: ""I do not want to see anyone right now."" (message 105).
- Item 63 gives message square 40: ""Imposters! That is not the true Bloodstaff."" (message 110), and action square 2.
- Anything else Used on it shows ""I see that you do not have the Bloodstaff."" (message 106; flags bit 1, game `$8DC8-$8DD3`), then message square 37 (`$3B00`): ""That's not a bloodstaff. How stupid do you think I am?"" (message 117), and question square 4 again.
- Either staff is used up. A staff taken from a loot bag has a count of 1, the item record's byte +4 (game `$32FC`, game `$3304`), a Use that matches a pair takes a charge (game `$8FAD`), and the last charge removes the item (`use_item_charge`, engine `$14A5`).
