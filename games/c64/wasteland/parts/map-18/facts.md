# Map 18, Base Cochise, the testing facility — verified technical facts

A level of Base Cochise with "the Environmental Testing facility" (message 20), a combat simulator (message 35), a room of oily pipes over hot oil (message 2), a floor of steel sheets laid with mines (messages 13-16) and the controls of four vault doors (messages 8, 17, 33 and 37). Map 19's exit 1 leads in at (3,1) and map 20's exit 0 at (2,30). It is 32 x 32 squares, stored on side 4 of the disks as 18 pages from T19/L18 (track 19, logical sector 18), entry 18 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$45FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 8 (tiles-8). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 8 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 0 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 1 chance in 75 after each step (game `random_encounter`, `$B017`). `$3A31`: monster types 1 to 3 (game `$B047`). `$3A32`: the groups take the first 8 class-15 records (game `$B040`).
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 656 blocking squares (class 11), 168 of class 0, 93 check squares (2), 68 message squares (1), 20 action squares (6), 9 exits (10), 5 encounters (3), 4 question squares (8) and 1 tile square (4).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 27 remote changes, 16 check squares, 10 exits, 9 message squares, 9 action squares, 8 random-encounter slots (class 15), 6 encounters, 5 blocking squares, 4 tile squares and 4 question squares. No square or change names encounter 1 (`$3B89`, Silicon Snipers with "Intruder alert! Intruder alert!", message 34) or blocking square 2 (`$3C90`).
- Text: messages 0-71, packed from `$3F83` (header word 0, engine `select_map_text` `$1E4F`); 39-71 are the combat phrases the header's bytes +`$37`-+`$5B` name.
- Monsters: the names from `$3E74` (header word 1, game `print_monster_name` `$9E5D`) are 1 Titanium Clawer, 2 Steel Reaver, 3 Killer, 4 Hunter, 5 Silicon Sniper, 6 Silver Strangler, 7 VTOL Auto-fire Robot, 8 Threshing Crawler, 9 Xenon Laser Cannon and 10 Octotron; name 0 is empty. The 11 monster records start at `$3F2B` (game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$3A28`), the NPC list, is $0000.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 19, robot assembly: exit 0 (`$3C50`) on (3,0), to (18,1), asking first.
- To map 20, the reactor: exit 9 (`$3C7D`), to (16,16), asking first, which vault door 4 puts on (2,31) (below).
- On this map, without a message, four pairs of doorways: exit 1 (`$3C55`) on (5,3) to (16,3) and exit 2 (`$3C5A`) on (15,3) to (4,3); exit 3 (`$3C5F`) on (0,10) to (30,11) and exit 4 (`$3C64`) on (31,11) to (1,10); exit 5 (`$3C69`) on (5,16) to (16,18) and exit 6 (`$3C6E`) on (15,18) to (4,16); exit 7 (`$3C73`) on (0,26) to (30,27) and exit 8 (`$3C78`) on (31,27) to (1,26).

## Its own code

The code list, header word 19 (`$3A26`), is at `$3C07` and has one entry, `$3C09`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$3C09` land_mine_blast, action squares 0-8: a jump to engine `api_screen_shake` (`$044C`), the explosion: engine `screen_shake` (`$0746`) plays sound 0 and jolts the screen twelve times. It returns the carry that random_byte's last ADC left (engine `$24EC`; nothing after the last jolt at engine `$0764` changes it), so whether the view is redrawn after the blast (game `$8872`) is chance.

### The mines

- At (30,11), message square 3 (`$3A74`): "This room is rather plain except for the 10' x 10' steel sheets covering the floor." (message 13). The mines are action squares 0-8 (`$3BEC-$3C06`) in nine groups among the plain floor (message square 0, which shows nothing): 0 on (28,10)-(28,12); 1 on (26,9)-(26,11); 2 on (24,11) and (24,12); 3 on (24,9) and (25,9); 4 on (22,9) and (22,10); 5 on (22,12); 6 on (20,10), (21,10) and (20,12); 7 on (18,10) and (18,11); 8 on (17,10) and (17,11).
- Stepping on one runs land_mine_blast. Action square n's change is remote change 18 + n (`$3DA8-$3E03`), which makes the group's spotting squares message square 0, without a redraw, and the party's square check square 3 (`$3AC9`, flags `$E0`): "You step on a land mine and set it off." (message 16). It tests every conscious member against skill 37 at difficulty 3, and each who fails loses 12d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`): everyone but Dan Citrine, and he only on a roll under 5. Skill 37 is the marker only his record holds (map-06 `$44A0` + `$BA`/`$BB`); engine `skill_check` (`$0C29`) fails him at once on an open 2d6 roll under 5, which only 1 and 2 or 1 and 3 give (engine `skill_roll_total`, `$0C70-$0C75`), and otherwise his level of 255, counted four times (engine `$0C92-$0C9B`), reaches any target. Pass or fail, the square becomes remote change 17 (`$3DA1`), which leaves a crater: tile square 1 (`$3BD0`, tile 43), "You stumble on a small crater." (message 18).
- The spotting squares are check squares 2 and 4-11 (`$3ABC`, `$3AD6-$3B3D`, flags `$E4`), one group each, beside the mines: (29,9)-(29,12), (27,9), (25,12), (25,10), (23,10), (23,11), (21,11), (19,11), and (18,9) with (17,12). Each says "The steel sheets are slippery." (message 14) and tests every conscious member on Perception, difficulty 3 for groups 0-2, 4 for 3 and 4, 5 for 5 and 6 and 6 for 7 and 8; one pass is enough. A pass gives "You spot some land mines." (message 15) and remote change 2 + n (`$3CDA-$3D76`), which shows the group's mines as tile square 2 (`$3BD3`, tile 44) and makes the spotting squares message square 0.
- Tile square 2's change is action square 0, so a spotted mine of any group, stepped on, goes off as group 0's: through remote change 18, which empties (29,9)-(29,12), group 0's spotting squares.
- Remote change 20, group 2's blast, names (25,11) (`$3DC8`), a plain square beside the group's spotting square (25,12), so check square 5 (`$3AE3`) stays after the blast. Passed, it shows the mines on (24,11) and (24,12) again as tile square 2, over a crater.

## The vault doors

- Four control panels ask "Do you want to O)pen or C)lose vault door #1?" and so on for doors 2, 3 and 4 (messages 8, 17, 33 and 37), answered with one key: question squares 0-3 (`$3C14`, `$3C1E`, `$3C28`, `$3C32`) at (30,2), (15,10), (30,17) and (16,25). O and C give remote changes 0 and 1, 11 and 12, 13 and 14, or 15 and 16 (`$3CCC`, `$3CD3`, `$3D77-$3DA0`), which change one square without a redraw and trade the panel back (`$FD`).
- Doors 1-3 are (2,6), (3,13) and (1,20): open, tile square 0 (`$3BCD`, tile 0); closed, blocking square 3 (`$3C92`), "A large immovable steel panel blocks the corridor. Centered on it is the Base Cochise logo." (message 1), which is how all three stand as stored.
- Door 4 is (2,31): open, exit 9, to map 20; closed, tile square 3 (`$3BD7`, tile 57, a tile square that blocks), with message 1, which is how it stands as stored.

## The pipes

- At (16,1)-(16,4), message square 1 (`$3A70`): "You see oily pipes running the length of the room over to a ledge where some kind of control panel is located. Below the pipes is hot, bubbling oil. It doesn't look like everyone can make it across at once." (message 2). The ledge holds panel 1 at (30,2) and message square 2 (`$3A72`) at (30,3), "There is a control panel here." (message 11).
- The pipes are check square 0 (`$3AA0`, flags `$D0`) on (17,1)-(30,4), 54 squares: "You take a step." (message 3). A party of more than one gets "You all fumble and get scorched by the oil." (message 5) and 5d6 CON each less the member's armour roll (flag bit 4; flag bit 0 clear, game `$90AF-$90B4`). A single character passes with "This pipe sure is slippery." (message 4) and the square becomes check square 1 (`$3AAD`, flags `$C0`): Climb 4 or AGL 4 passes; a failure costs 5d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), "You slip into the oil but manage to hang on." (message 6). Either way its change, `$FD`, puts check square 0 back.

## The testing rooms

- At (16,18), message square 4 (`$3A76`), "Entering the Environmental Testing facility." (message 20). Three rooms follow, each edged on two sides by its own message squares (5, 6 and 7, `$3A78-$3A7D`): "You hear lightning.", "It's very windy here." and "It's very cold here." (messages 21, 25 and 29).
- Their floors are check squares 12, 13 and 14 (`$3B3E`, `$3B4B`, `$3B58`, flags `$E1`), 8 squares each, which test every conscious member on LK 4, LK 3 and LK 3. Each who fails loses CON, armour not counting (flag bit 0): 3d6 for "You get hit and your hair is fried to a crisp.", 1d6 for "You are blown off your feet." and 2d6 for "It is so cold that you are getting frostbite." (messages 24, 28 and 32).
- At (30,27), message square 8 (`$3A7E`), "Entering combat simulator." (message 35). The barriers say "Don't hit the barriers." (blocking square 1, `$3C8E`, and check square 15, `$3B65`, flags `$00`, at (24,28) and (25,28), message 36). Check square 15's pair list names item 255 and has no `$FF` before the next record. Encounters 2-5 (`$3B95-$3BC4`) at (26,24), (24,31), (20,24) and (15,29) are three Xenon Laser Cannons each, stationary, and each becomes blocking square 0 (`$3C8C`), "The cold steel walls are very smooth." (message 12), when wiped out. Encounter 0 (`$3B7D`) at (3,19) is three more.
