# Map 15, Sleeper Base, level 3 — verified technical facts

Level 3 of Sleeper Base: its ladder reads "A ladder is here. 1) Climb up to lvl 1. 2) Climb up to lvl 2. 3) Remain on lvl 3." (message 47), and the ladders of levels 1 and 2 offer "3) Climb down to lvl 3." (map 7's message 27, map 13's message 60). It holds the base commander's desk (message 31), a power control panel, a geothermal generator behind a fence (message 18) and the "Chopper Simulator" (message 37). It is 32 x 32 squares, stored on side 4 of the disks as 20 pages from T23/L5 (track 23, logical sector 5), entry 15 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$47FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 7 (tiles-7). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 7 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 0 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 612 blocking squares (class 11), 387 of class 0, 16 check squares (2), 3 encounters (3), 3 question squares (8), 1 tile square (4), 1 loot bag (5) and 1 action square (6). No exit, message square or remote change stands on the map as stored; changes make them.
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 20 check squares, 7 message squares, 5 exits, 4 tile squares, 4 loot bags, 4 question squares, 3 encounters, 3 blocking squares, 2 remote changes and 1 action square. Check square 11 (`$3B48`, a door for Secpass B) is named by no square, no change and no code.
- Text: messages 0-97, packed from `$3D8F` (header word 0, engine `select_map_text` `$1E4F`); 65-97 are the combat phrases the header's bytes +`$37`-+`$5B` name. Message 59, "8", is named by nothing.
- Monsters: the names from `$3D2E` (header word 1, game `print_monster_name` `$9E5D`) are 1 Turbo Meson Cannon, 2 Master Cylinder and 3 Titanium Clawer; name 0 is empty. The four monster records start at `$3D6F` (game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$3A28`), the NPC list, is $0000.
- No code: header word 19 (`$3A26`), the code list, holds `$3D2E`, the monster names' address, as does word 18, the class-15 list. The one action record's byte 0 is `$82`, a module, and game `run_action` reads the code list only for an action below `$80` (game `$8845-$885E`).
- The walls answer a bump with "Bang your head!" (blocking square 2, `$3CB6`, message 60, on 596 squares), and the fence at (24,1)-(27,4) with "A protective fence keeps you back from the geothermal generator in the corner." (blocking square 1, `$3CB4`).

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 7, Sleeper Base, level 1, and map 13, level 2: exits 0 (`$3C91`) and 1 (`$3C96`), each to (1,30). No square holds them; the ladder at (1,28), question square 0 (`$3C4F`), makes them. Its question, message 47, is answered with one key: 1 makes the square exit 0, 2 makes it exit 1 and 3 changes nothing. Each exit's change, `$FD`, trades the question back (engine `alter_square`, `$0A00`).
- In the Chopper Simulator: exits 2, 6 and 7 (`$3C9B`, `$3CA0`, `$3CA6`) move the party a row or two, relative to its square (below).

## The power panel

- The panel at (27,5), question square 2 (`$3C5A`), asks "Power Control Panel: Turn power ON (Y/N)?" (message 54), and only Y does anything. It gives remote change 0 (`$3CBC`), "Power on." (message 62), which makes the floor squares (24,26) to (29,26) check squares 1, 2, 2, 3, 4 and 5, (30,29) check square 19, (30,27) and (29,30) check square 6, (24,22) check square 18, and the panel question square 3 (`$3C61`), "Power Control Panel: Turn power OFF (Y/N)?" (message 63).
- Y there gives remote change 1 (`$3CF5`), "Power off." (message 5). The seven floor squares become tile square 3 (`$3C10`, tile 91), "The floor is steel and very shiny" (message 8); (30,27) and (29,30) become blocking square 0 (`$3CB2`) and (24,22) tile square 2 (`$3C0D`, tile 56, a tile square that blocks), all three "This looks like a security door, but it is unresponsive to any attempt to open it." (message 17); and the panel is question square 2 again.
- As stored, the seven floor squares are plain (class 0, tile 63), (30,27) and (29,30) are already check square 6, and (24,22) is tile square 2. So the doors at (30,27) and (29,30) open before the power is first turned on, and (24,22) only while it is on.
- With the power on, the doors are check squares 6 (`$3B05`, a Use of Secpass 3) and 18 (`$3BBB`, Secpass A); each opens into tile square 3 with "The door slides up into the ceiling." (message 1).
- The floor squares are check squares 1-5 (`$3AC4`, `$3AD1`, `$3ADE`, `$3AEB`, `$3AF8`, flags `$D1`) and 19 (`$3BC8`). On arrival the first conscious member decides (game `$8E3A-$8E44`), on skill 37 at difficulty 2, or difficulty 0 on check square 19, and a failure costs everybody (flag bit 4, game `apply_effect_to_all` `$90F5`) CON with armour not counting (flag bit 0): 1d6 on (24,26), 2d6 on (25,26) and (26,26), 4d6 on (27,26), 8d6 on (28,26), 16d6 on (29,26) and 8d6 on (30,29). The messages climb from "The air fairly crackles with electricity!" and "*Sizzle*" (messages 6 and 7) to "*Sizzle* *Pop* *Fry* *Crackle* *Snap*" (message 14); on (30,29) a failure says "This section of the corridor is hot." (message 48). A pass changes nothing and costs nobody anything.
- Skill 37 is the marker only Dan Citrine's record holds (map-06 `$44A0` + `$BA`/`$BB`), so anyone else first fails. On check square 19, at difficulty 0, having the skill is a pass, with no roll (game `$8EA9-$8EAE`). On check squares 1-5 he passes unless engine `skill_check` (`$0C29`) fails him at once on an open 2d6 roll under 5, which only 1 and 2 or 1 and 3 give (engine `skill_roll_total`, `$0C70-$0C75`); otherwise his level of 255, counted four times (engine `$0C92-$0C9B`), reaches any target.

## The Chopper Simulator

- At (28,20), check square 14 (`$3B87`): "This is the Chopper Simulator. It has a side panel open and a part that controls the computer to open the door seems to be missing." (message 37). A Use of a Rom board (item 80) gives message 38 and makes it check square 15 (`$3B94`), a door that a Use of Secpass A opens into tile square 1 (`$3C0A`, tile 51), "Chopper Simulation Pod." (message 40).
- At (28,21), check square 16 (`$3BA1`, flags `$40`), "An internal Iris door swirls open and you only see blackness beyond it." (message 44), passes when the party's size is 1 (game `$8E85-$8E8A`) and becomes check square 17 (`$3BAE`). A larger party gets "The door snaps shut before you can step in. The pod is only big enough for one person at a time." (message 46).
- Check square 17, "A blast of blue light strikes you like a wind. All of your muscles fire at once and you feel weak." (message 41), tests DEX 3. A pass ("Satisfactory reflexes. Proceed with training.", message 42) leads by exit 6 to (28,22). A failure costs 2d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`) and leads by exit 7 back to (28,20) ("Insufficient cochlear neural development. Reject.", message 43). Both exits put check square 16 back.
- At (28,22), action square 0 (`$3C33`) runs module 2, the library, named "Chopper Sim", with greeting message 4, "Chopper simulation module.", and one skill, 29, Helicopter pilot (module-2 `$CA06-$CA21`). Its change is exit 2 (`$3C9B`), which takes the party back to (28,20) and whose change, `$FD`, trades the action square back.

## Other squares

- Doors with a slot ("The door has no handle or sign on it, just a narrow slot on the right side.", message 3) open into tile square 0 (`$3C07`, tile 51) to a Use of Secpass 3 (check square 0, `$3AB7`, at (29,8) and (8,25)), Secpass 7 (check square 8, `$3B21`, at (8,10), (8,13), (7,18) and (27,18)) or Secpass A (check square 9, `$3B2E`, at (3,4) and (21,18)).
- The base commander's desk at (18,21), check square 12 (`$3B55`), opens to a Use of Picklock 2, ST 3, a Crowbar, a Pick ax, a Sledge hammer, Plastic explosive or a Grenade: loot bag 2 (`$3C25`), Secpass 7 and a Power converter (item 77), which map 13's Power Controller wants (map-13 `$3BD9`).
- The orange cabinet at (1,20), check square 13 (`$3B6E`), opens to Picklock 4, ST 5 or the same tools: loot bag 3 (`$3C2C`), a Power pack.
- The safe door at (21,26), check square 7 (`$3B12`), "the most solid safe door you have ever laid eyes on" (message 19), opens to Safecrack 4 or Picklock 6 into tile square 0. Loot bag 1 (`$3C20`) at (20,26) holds a Plasma coupler.
- At (24,21), check square 10 (`$3B3B`, flags `$E4`) tests every conscious member on Perception 4 and needs one pass: "You notice the hidden outline of a door in the south wall." (message 21), and the square becomes plain. The door is (24,22), tile square 2, which the power panel turns into check square 18.
- The info files at (1,1), question square 4 (`$3C68`), "Select info file:" (message 55), list seven officers from "Col. John Smith." to "Lt. Russel Heller."; answers 1-7 make the square message squares 8-14 (`$3A7A-$3A8E`), "Read paragraph" 52, 40, 100, 63, 70, 91 or 101 (messages 61 and 22-28), which trade the question back.
- The encounters: at (20,30) encounter 0 (`$3BDB`), one Turbo Meson Cannon, stationary, "A port slides open in the wall and a Turbo Meson Cannon, the auto-portable Mark VII model, rolls into view. Its fire coils are glowing." (message 49), which leaves loot bag 0 (`$3C1B`), a Fusion cell; at (20,28) encounter 1 (`$3BE7`), 1 to 3 Master Cylinders (message 29); and at (22,28) encounter 2 (`$3BF3`), 1 to 6 Titanium Clawers (message 30).
