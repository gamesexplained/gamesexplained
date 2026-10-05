# Map 9, Agricultural Center — verified technical facts

The Agricultural Center, the farm of giant fruit and vegetables that the Veggies tend: map 0's exit 7 says "Entering Agricultural Center." (map 0's message 3) and leads in at (29,13), outside its sales booth, the "Agricultural Station general store." (message 22). It is 32 x 32 squares, stored on side 1 of the disks as 26 pages from T15/L9 (track 15, logical sector 9), entry 9 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$4DFF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 1 (tiles-1). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 1 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 70 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 1 chance in 50 after each step (game `random_encounter`, `$B017`). `$3A31`: monster types 1 to 4 (game `$B047`). `$3A32`: the groups take the first 5 class-15 records (game `$B040`).
- `$3A34`/`$3A35`, the time a step takes: half a minute (fraction 128, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 2 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 8th step (game `$AF75-$AF7B`).
- Squares, 1,024: 405 message squares (class 1), 326 blocking squares (11), 266 of class 0, 10 action squares (6), 6 check squares (2), 5 encounters (3), 3 loot bags (5), 2 exits (10) and 1 tile square (4).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 37 message squares, 19 encounters, 10 blocking squares, 10 remote changes, 6 exits, 5 check squares, 5 random-encounter slots (class 15), 4 tile squares, 4 loot bags, 3 action squares and 3 question squares.
- Text: messages 0-101, packed from `$3F7B` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$3EDD` (header word 1, game `print_monster_name` `$9E5D`) are 1 Bunny, 2 Desert Lizard, 3 Rat, 4 Opossum, 5 Prairie Dog, 6 Harry and 7 Deranged Farmer; name 0 is empty. The eight monster records start at `$3F3B` (game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$3A28`), the NPC list, is $0000.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 0, the world map: exit 2 (`$3D6D`) on (30,13), to (37,55), asking first.
- To map 29, the Root Cellar: exit 4 (`$3D77`) on (2,31), to (1,2), message 47, "You descend down a dark tunnel.", asking first; and exit 3 (`$3D72`), to (30,30), which the Old Man's question makes on a Y (below).
- On this map: exit 1 (`$3D67`), to (16,18), the walk to the vegetable field (below); exit 0 (`$3D61`), the store (below); and exit 5 (`$3D7C`), to (25,29), message 37, "The Old Man nods and leads you to Veggie Center, communal living quarters of the Veggies, where he smiles and leaves.", which no square holds and no change in the map's records or its code names.

## The farmers and Harry

- At (27,13), message square 21 puts question square 0 (`$3D32`) under the party: message 41, "What do you say? 1) Offer to help 2) Ask about payment 3) Just passing through", answered with one key. 2 gives message 48 and the question again (remote change 9, `$3E90`). 3 gives check square 0 (`$3B18`): a boy throws a tomato or a rock, the first conscious member dodges with LK 2 or AGL 2 or loses 1 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), and on a failure question square 1 asks "Do you seek revenge (Y/N)?" (message 45).
- 1 gives message 46, "Miguel is pleased. ... They lead you to the vegetable field.", and remote change 8 (`$3E79`) makes the party's square exit 1, which takes the party to (16,18). There message square 25 runs remote change 1 (`$3DC6`), which puts message square 26 at (5,19): message 51, "... This is Harry, the Bunny Master.", and then encounter 1 (`$3BF5`), Harry (monster 6) with 1 to 3 Bunnies, stationary.
- Wiping them out leaves loot bag 1 (`$3CF6`), cash 20 as stored. The emptied bag runs remote change 2 (`$3DD3`): message 52, "The Old Man is pleased to see that you have killed Harry. ...". It ends the bombardment (below), makes (26,13), the closed sales booth (blocking square 9, whose message 38 says the booth is closed on account of varmint attacks), exit 0, makes (18,18) blocking square 8, and puts question square 2 (`$3D4B`), "Do you want to see my Root Cellar (Y/N)?" (message 53), on the four squares beside it; a Y there makes the square exit 3.
- Exit 0 at (26,13) shows message 40, "Entering the Agricultural Station general store.", and asks. It leads to the party's own square (relative, +0,+0), and its change makes the square action square 2 (`$3D12`). Engine `enter_map` does nothing for the map in memory (engine `$25BF`) and the exit returns the carry set (game `$8A34`), so game `run_square_action` (`$ACC1`) runs action square 2 at once: record byte 0 is `$81`, module 1, the shop, named " AG. store ". Its change, `$FD`, trades the exit back.

## Its own code

The code list, header word 19 (`$3A26`), is at `$3D27` and has one entry, `$3D29`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$3D29` fruit_bomb_lands, actions 0 and 1: a jump to engine `api_screen_shake` (`$044C`), the impact: engine `screen_shake` (`$0746`) plays sound 0 and jolts the screen twelve times. It returns the carry that random_byte's last ADC left (engine `$24EC`; nothing after the last jolt at engine `$0764` changes it), so whether the view is redrawn after the impact (game `$8872`) is chance.

### The bombardment

- Action square 0 (`$3D0C`) stands on (13,13), (17,13), (19,13), (16,14) and (18,14), and action square 1 (`$3D0F`) on (9,13), (11,13), (7,14), (10,14) and (12,14). Each runs fruit_bomb_lands as the party steps on, and its change makes the square check square 3 (`$3BA1`) or 4 (`$3BB2`), which run at once.
- Both show message 54, "You hear a whistling noise overhead. It is getting louder.", and test every conscious member against Perception 2, LK 1 or AGL 1; each who passes none loses 1 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`). Check square 3 is a giant rotten tomato (messages 55 and 56) and check square 4 a giant pineapple, or a banana peel for those who fail (messages 57 and 58).
- Either way the check square becomes remote change 3 or 4 (`$3E26`, `$3E2D`), which puts the action square back under the party without a redraw (entry flag bit 6). So a fruit falls each time the party crosses one of the ten squares.
- Remote change 2, after Harry's death, makes all ten squares message square 41 (`$3B0C`), which shows message 0, nothing, and stays.
