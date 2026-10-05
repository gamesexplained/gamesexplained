# Map 34, Needles, police station, gas station, church — verified technical facts

Three buildings of Needles. Needles enters them with "Entering Police station." (map 26's message 3, on its exit 9, to (1,6)), "Entering Gas station." (map 26's message 4, on its exit 10, to (3,30)) and "Entering the Servants of the Mushroom Cloud Church." (map 26's message 2, on its exit 8, to (27,27)), and the ways back say "Leaving Police station." (message 18, exit 3), "Leaving Gas station." (message 25, exit 2) and "Leaving the Servants of the Mushroom Cloud Church." (message 33, exits 5 and 6). It is a map of 32 by 32 squares. It is stored on side 2 of the disks from track 7, logical sector 9, 30 pages: entry 34 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$51FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 2 draws it (part tiles-2). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 2: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 34 of the stream directory, T35/L13. The unpack runs on to `$E23B`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 100 to 132 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 410 | | | |
| 1 message | 27 | `$3A5C` | 39, 6 null | 33 |
| 2 check | 16 | `$3AF9` | 17, 5 null | 12 |
| 3 encounter | 7 | `$3C01` | 33, 1 null | 32 |
| 4 tile | 0 | `$3DC3` | 6 | 6 |
| 5 loot bag | 4 | `$3DE2` | 7 | 7 |
| 8 question | 1 | `$3E21` | 10 | 10 |
| 10 exit | 10 | `$3E96` | 7 | 7 |
| 11 blocking | 540 | `$3ECA` | 9, 2 null | 7 |
| 12 remote change | 9 | `$3EEA` | 18 | 18 |
| total | 1,024 | | | 132 |

- No code of its own: header word 19, `$3A26`, holds 0.
- The text, header word 0, is at `$41A9` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 34 group offsets at `$41E5`, and messages 0 to 132 in groups of four, `$4229-$51D6`. Message 132 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 41 bytes after it, `$51D7-$51FF`. Messages 10, 11, 19 and 85, below it, are named by none of them either.
- 4 monster names at `$4148` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4181`, monster *n* at `$4181` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Vandal, 2 Policeman, 3 Auto rifle and 4 City Slicker.
- Characters who can join: NPC 1, "MORT" (`$4048`), hired from encounter 31 (`$3DAB`). The list is at `$4044` (header word 20; `order_hire`, game `$A3F1`, reads it at game `$A424`), and the character's 256-byte record is copied whole (game `$A42C-$A433`); the NPC number is the high nibble of the encounter record's byte +9.
- Exits (class 10, list `$3E96`; `square_exit`, game `$89A3`): to Las Vegas, map 12 (exit 1, to (61,61)); to Needles, map 26 (exits 2, 3, 5 and 6, to (23,28), (43,14), (54,60) and (54,60); exits 2, 3 and 6 ask first); 2 within the map (exits 0 and 4). No square, and no change the squares lead to, names exit 0.
- Remote-change square 15 (`$4014`) stands at (1,17), walled in on every side. Map 0's exit 21 (map-00 `$4E56`), where the jeep's road ends, brings the party there (the jeep, below).

### The Bloodstaff

- The square at (26,21) in the church is check square 0 (`$3B1B`). A step onto it shows "Read paragraph 103." (message 9), and its flags, `$80`, run no check. A Ruby ring (item 82) Used on it shows "Read paragraph 150." (message 12) and makes it remote-change square 0 (`$3F0E`), which the party then steps onto (game `$8CBA-$8CBC`) and which makes the party's square check square 1 (`$3B28`). The ring is not used up: a ring taken from a loot bag gets the item record's byte +4 as its count (`loot_pick_member`, game `$928C-$929B`), which is 0 for item 82 (game `$339C`), and `use_item_charge` (engine `$14A5`) takes nothing from a count of 0 (engine `$14B0-$14B2`).
- Check square 1 shows "So, you have returned. Where is the Bloodstaff?" (message 13) when the party steps onto it. Its two pairs, items 62 and 63, both named Bloodstaff, each have their own change (flags `$89`; `$3B37-$3B3A`).
- Item 62 Used on it gives remote-change square 1 (`$3F15`): "Thank you so much for returning the Bloodstaff. I hear that there is trouble in Las Vegas. To show you my appreciation, here are some items that may help you survive in Las Vegas." (message 16). It puts loot bag 4 (`$3E06`) on (25,21), with 1 to 2 AK 97 assault rifles, 1 to 2 M1989A1 Nato assault rifles, 1 to 20 9mm clips, 1 to 20 7.62mm clips, a Kevlar suit, 1 to 10 TNT and an Engine, and it makes the party's square question square 8 (`$3E80`). Only check square 1's change leads to remote-change square 1, so the reward comes once.
- Item 63 Used on it gives message square 3 (`$3AB0`): ""What are you trying to pull? This isn't the real Bloodstaff." He breaks it over your heads and throws you out." (message 15). Exit 5 (`$3EBF`) follows at once, with message 33, to Needles, map 26, at (54,60), and leaves check square 1 behind it.
- Either staff is used up. A staff taken from a loot bag has a count of 1, the item record's byte +4 (game `$32FC`, game `$3304`), a Use that matches a pair takes a charge (game `$8FAD`), and the last charge removes the item (`use_item_charge`, engine `$14A5`).
- Question square 8 asks "What can I do for you, my child?" (message 17) and takes a typed word (`$3E80-$3E8D`). BUZZARD (message 27) or PASTEL (message 28) gives message square 9 (`$3AC0`) and then loot bag 6 (`$3E1C`, one item 63); DIPSTICK (message 21) gives message square 4 (`$3AB3`) and then loot bag 5 (`$3E17`, one item 62). Both message squares show "Please be careful with it." (message 30).
- Any other word gives message square 5 (`$3AB6`): "I am sorry. I cannot help you with that." (message 31). Its `$FE` change puts the question back (`alter_square`, engine `$0A28`), and since `set_square` then returns carry set (engine `$0A3D`), the question asks again at once (`run_square_action`, game `$ACCE-$ACD1`).
- Emptied, loot bag 5 or 6 becomes remote-change square 8 (`$3FB6`), which makes the square question square 9 (`$3E8E`). It asks the same question; DIPSTICK gives message square 7 (`$3ABB`): "The Bloodstaff has been borrowed." (message 32), and any other word message square 5, and both put the question back the same way. No record but remote-change square 1 makes question square 8, so one staff is lent, once.

### The jeep

- Remote-change square 15 puts the broken jeep, tile square 4 (`$3DDC`: "This jeep is broken and needs to be fixed.", message 4, tile 68, a blocking tile), on (4,26), message square 8 (`$3ABD`) on (3,30) and message square 6 (`$3AB8`) on (12,30). It makes the party's square exit 4 (`$3EBA`), which runs at once and takes the party to (3,30) of this map; an exit returns with carry set (game `$8A34`), so the square there runs at once too.
- Message square 8 shows "After a long journey, your jeep sputters and wheezes and finally stops (luckily) in a gas station." (message 34) and becomes message square 0, the garage's own description (message 2).
- On (12,30) the map stores message square 1, the attendant asleep: "You see a sleeping attendant. He wears a hat that says "Bug off!" No matter how hard you try, he cannot be awakened." (message 6). Message square 6 shows "The attendant awakens when you approach." (message 20) and becomes question square 0 (`$3E35`), which asks at once: ""I see your jeep is busted. Want me to fix it?" (Y/N)" (message 23).
- Y (message 22) gives check square 4 (`$3B3B`): "After checking the jeep briefly, he tells you it needs a new engine." (message 24). Every conscious member is tested for an Engine (item 46), one pass enough (flags `$E4`), and each one who carries an Engine passes and loses a charge of it (game `$8E65-$8E70`, game `$8EF6-$8F11`); an Engine taken from a loot bag has a count of 1 (game `$327C`), so it is gone. With one: ""I see that you already have one." He takes it from you." (message 8). Without one: ""But engines are scarce these days."" (message 26).
- No Engine, N or no answer gives remote-change square 11 (`$3FE6`): ""I'll hold the jeep for you til you do want it fixed."" (message 37), and the attendant's square becomes message square 6 again.
- With the Engine, check square 14 (`$3BD8`) runs at once: ""That'll be $100."" (message 7). A first conscious member with less than 100 in cash passes (pair `80 64`) and hears "Come back when you have the cash." (message 90), and the square stays check square 14 (change `$FF $FF`). One with 100 or more fails, pays 100 (the effect, `95 E4`) and hears ""Thank you."" (message 89).
- Then remote-change square 13 (`$3FFF`): ""Your jeep is now fixed. Be careful where you drive it. There have been some strange murders in these parts lately. If you see anyone suspicious, report it to the police. Bye!" He goes back to sleep." (message 91). It makes (4,26) tile square 3 (`$3DD8`, tile 68, not blocking) and the attendant's square message square 1 again.
- A step onto the fixed jeep makes it check square 16 (`$3BF4`), which runs at once. Its only pair is skill 38 at difficulty 0, so a conscious member who has the skill at all passes (game `$8EA2-$8EAE`; flags `$E4`). Of the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party, only Ace's holds skill 38: NPC 2 of map 4 (map-04 `$44B8`), at level `$FF` in the record's last skill pair (`skill_level`, engine `$1392`). Without him: "The jeep is too complicated for you to use." (message 99), and remote-change square 16 (`$4026`) puts tile square 3 back.
- With him, question square 1 (`$3E3D`) asks "Your jeep is here, fixed and Ace is ready to go. Do you want to leave Needles right now? (Y/N)" (message 29). Y gives exit 1 (`$3EAA`): "You drive to Vegas but just as you get there some bandits surprise you, steal your jeep and leave you stranded." (message 5), to Las Vegas, map 12, at (61,61), and the jeep's square becomes plain ground. N or no answer gives remote-change square 16.
