# Map 12, Las Vegas — verified technical facts

The ruins of Las Vegas, the town map: map 0's exits 13-20 say "Entering Las Vegas." (map 0's message 6), and every way out says "Leaving Las Vegas." (message 51). Its streets carry their names, from "Tropicana Ave" to "Boulder Highway" (messages 1-11). It is 64 x 64 squares, stored on side 3 of the disks as 38 pages from T24/L0 (track 24, logical sector 0), entry 12 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$59FF` and unpacks its tile layer to `$DE00-$EDFF`. It is drawn with tile set 6 (tiles-6). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$3BFF` (a nibble a square) and the number layer `$3C00-$4BFF` (a byte a square). The map record is at `$4C00` because the map's byte in T35/L8 is `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$4C2C`, the size: 64, the width and the height (engine `enter_map`, `$25D3`).
- `$4C30`, the tile set: 6 (engine `$25EE`).
- `$4C33`, the tile drawn off the map: 35 (engine `draw_square`, `$0B5E`).
- `$4C2F`, random encounters: 1 chance in 50 after each step (game `random_encounter`, `$B017`). `$4C31`: monster types 1 to 7 (game `$B047`). `$4C32`: the groups take the first 5 class-15 records (game `$B040`).
- `$4C34`/`$4C35`, the time a step takes: half a minute (fraction 128, minutes 0; game `advance_clock` `$AF32`).
- `$4C36`, ticks: 2 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 8th step (game `$AF75-$AF7B`).
- Squares, 4,096: 2,809 of class 0, 694 blocking squares (class 11), 303 exits (10), 153 check squares (2), 119 message squares (1) and 18 encounters (3).
- Records, named by the class lists of header words 3-18 (`$4C06-$4C25`, engine `action_record` `$09B8`): 77 exits, 24 message squares, 21 encounters, 12 loot bags, 6 check squares, 6 blocking squares, 5 random-encounter slots (class 15), 4 action squares, 2 remote changes and 1 tile square.
- Text: messages 0-89, packed from `$533E` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$521B` (header word 1, game `print_monster_name` `$9E5D`) are 1 Slicerdicer, 2 Thug, 3 Scavenger, 4 Chopter, 5 Sniperdroid, 6 Warroid Mark 1, 7 Warroid Mark 2, 8 Warroid Mark 3, 9 Scorpitron, 10 Gundroid, 11 Cyborg Commando and 12 RadAngel; name 0 is empty. The 13 monster records start at `$52D6` (game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$4C28`), the NPC list, is $0000.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`). All but exits 6 and 7 ask first (byte 0 bit 6, game `$8A3F`).

- To map 0, the world map: exits 30-41 (`$505E-$5099`) on the map's edges, 233 squares, message 51, "Leaving Las Vegas.". They lead to the twelve squares around map 0's exits into the town, from (21,15) round to (20,16).
- To map 11, the beat-up buildings: 53 exits among 42-99 (`$509A-$51A7`), one square or two each, with message 55, "Entering a small beat up building.", 27, "Entering a hellhole.", or 28, "This scumpit isn't fit for rats.". Their map bytes are `$C0` to `$F9`, one number each, which engine `load_map_pages` turns into map 11 (engine `$261C-$2624`), so each building is map 11 seen afresh (map-11 `$3A00`). They lead to (7,30), (28,1), (1,8) or (30,23) of map 11.
- To map 40, the jail and Fat Freddy's: exit 1 (`$5025`) on (61,3), to (6,1), message 20, "Entering the jail."; exit 2 (`$502A`) on (17,25), to (11,23), message 40, "Entering Fat Freddy's Place where even low rollers can have a ball."; and exits 3, 4 and 5 (`$502F-$503D`) on (46,13), (46,59) and (19,37), to (26,1), (24,30) and (1,17), message 55.
- To map 39, Faran Brygo's hideout: exit 51 (`$50C7`) on (43,10), to (16,31), with message 55 like the beat-up buildings.
- To map 38, the Temple of the Servants of the Mushroom Cloud: exit 10 (`$5054`) on (56,24) and (57,24), to (17,30), message 39.
- To map 41, Spade's Casino: exit 26 (`$5059`) on (11,37), to (2,30), message 44, "Step inside Spade's Casino, high roller.".
- The raceway: exit 6 (`$503E`) on (41,49), to (41,46) on this map, message 21, "A tunnel leads into the raceway."; exit 7 (`$5043`) on (41,47) leads back to the return point (record byte 3 is `$FF`, game `$89EE`), the square of the exit taken before it, with message 29, "The tunnel takes you back out.".
- The hospital and the library: exit 8 (`$5048`) on (21,3), (21,5) and (17,49), message 37, "Entering the Vegas Hospital where the rich get well, and the poor die young.", and exit 9 (`$504E`) on (61,59), message 38, "Entering the Las Vegas library.". Each leads to the party's own square (relative, +0,+0), and its change makes the square action square 0 (`$4F0F`) or 1 (`$4F22`). Engine `enter_map` does nothing for the map in memory (engine `$25BF`) and the exit returns the carry set (game `$8A34`), so game `run_square_action` (`$ACC1`) runs the action square at once: `$80`, module 0, the doctor, named " Infirmary ", or `$82`, module 2, the library, named "Vegas Lib.". Each change, `$FD`, trades the exit back.

## Its own code

The code list, header word 19 (`$4C26`), is at `$4F58` and has one entry, `$4F5A`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$4F5A` land_mine_blast, actions 2 and 3: a jump to engine `api_screen_shake` (`$044C`), the explosion: engine `screen_shake` (`$0746`) plays sound 0 and jolts the screen twelve times. It returns the carry that random_byte's last ADC left (engine `$24EC`; nothing after the last jolt at engine `$0764` changes it), so whether the view is redrawn after the blast (game `$8872`) is chance.

### The land mines

- The mines are check square 1 (`$4D26`, flags `$E0`) on 38 squares across the town, under ordinary tiles. Arriving on one tests every conscious member against Perception 3.
- When all pass, message 25, "You spot a cleverly laid land mine.", and remote change 1 (`$51CE`) puts action square 3 (`$4F55`) under the party without a redraw (entry flag bit 6). Stepping onto that square later sets it off, and its change is check square 7 (`$4D5A`), message 24, "You should be more careful when walking on land mines.".
- When anyone fails, the square becomes action square 2 (`$4F52`), which goes off at once; its change is check square 6 (`$4D4D`), message 26, "Unfortunately, not everyone spots it.".
- Check squares 6 and 7 (flags `$D0`) let the first conscious member decide (game `$8E3A-$8E44`) on skill 37 at difficulty 3, and the effect, 2d6 CON less each member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), falls on everybody (flag bit 4, game `apply_effect_to_all` `$90F5`). Skill 37 is the marker only Dan Citrine's record holds (map-06 `$44A0` + `$BA`/`$BB`), so anyone else fails. He passes unless engine `skill_check` (`$0C29`) fails him at once on an open 2d6 roll under 5, which only 1 and 2 or 1 and 3 give (engine `skill_roll_total`, `$0C70-$0C75`); otherwise his level of 255, counted four times (engine `$0C92-$0C9B`), reaches any target. Either way the square becomes tile square 0 (`$4E91`, tile 12).

### The cacti and the Sonic key

- The cacti are check square 0 (`$4D19`, flags `$E0`) on 114 squares, tile 21: "You've walked into a cactus." (message 16). Every conscious member is tested against skill 37 at difficulty 2, and each who fails loses 1d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`) (message 19, "The spines poke holes in you."): everyone but Dan Citrine, and he on a roll under 5 as above. The square stays a cactus.
- At (10,18), check square 2 (`$4D33`): "It looks like something is buried here." (message 30). A Use of a Shovel makes it check square 3 (`$4D40`), where the first conscious member's LK 4 finds loot bag 2 (`$4EBB`), the Sonic key ("It's the Sonic Key!", message 34), and a failure finds loot bag 3 (`$4EC0`), 1 to 5 RPG-7s, with message 35, "It's just some garbage.".
