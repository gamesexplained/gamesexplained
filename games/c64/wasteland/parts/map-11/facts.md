# Map 11, Las Vegas, the beat-up buildings — verified technical facts

The run-down buildings of Las Vegas, one map for all of them: map 12's building exits say "Entering a small beat up building." (map 12's message 55), and this map's walls say "This building was very fancy when it was built a long time ago." (message 10). It is 32 x 32 squares, stored on side 3 of the disks as 20 pages from T25/L2 (track 25, logical sector 2), entry 11 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$47FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 4 (tiles-4). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`: engine `load_map_pages` puts it there for every map number of `$80` or more (engine `$260A`), and this map is only ever loaded by such a number.
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 4 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 0 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 639 blocking squares (class 11), 275 of class 0, 88 message squares (1), 16 check squares (2) and 6 exits (10).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 20 message squares, 17 check squares, 9 blocking squares, 7 action squares and 1 exit.
- Text: messages 0-57, packed from `$3C5A` (header word 0, engine `select_map_text` `$1E4F`).
- No monsters and nobody to hire: the map has no encounter records and no monster records; header word 2 holds the text's address `$3C5A`, and words 1 and 20 (`$3A02`, `$3A28`) hold `$3C59`, the byte before it.

## Loaded for many numbers, never saved

- Engine `load_map_pages` replaces a map number of `$80` or more with its byte in T35/L8 (engine `$261C-$2624`); that byte is 11 for `$C0-$FC` on all four sides. Map 12's 53 building exits use 53 of those numbers, from `$C0` to `$F9`, one each, and no other map's exits use any.
- Engine `enter_map` keeps the number as given in `$91` (engine `$25C6-$25C8`), and engine `save_map` returns at once when it has bit 7 (engine `$2856-$2858`). So a building is never written back to the disk, and every visit starts from the disk's copy.

## Exits

- Exit 0 (`$3BE7`), on (28,0), (0,7), (0,8), (31,23), (1,31) and (7,31), leads back to the return point (record byte 3 is `$FF`, game `$89EE`), the square of Las Vegas the party came in by, with message 53, "Ah! Fresh air and open spaces once again.".

## Its own code

The code list, header word 19 (`$3A26`), is at `$3C3A` and has one entry, `$3C3C`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). The record's change at +1/+2 is applied to the party's square afterwards (game `$8840`, `alter_party_square` `$B105`).

- `$3C3C` infect_first_member, action 0, map 5's routine with its own table address: selects party position 1 (engine `api_select_member` `$0335` with A = 1) and ORs into its byte +`$28` the mask for disease number record +3, from `$3C51` (`$3C41-$3C4D`). Returns the carry clear: no redraw (game `$8872`).
- `$3C51` disease_masks: `01 02 04 08 10 20 40 80`, the mask of bit n for disease n.
- The bits are the doctor's diseases (module-0 `$CCC2-$CCFC`): 2 Bug byte, 4 Desert dust, 5 Rabies. Any set bit of +`$28` stops a character healing (game `con_heal_one` `$B854-$B858`), and bits 4-7 cost a point of CON whenever `$D2` AND 63 is 0 (game `health_tick`, `$B7A2-$B7A8`, `$B816-$B81A`).
- Record byte 3 is not checked; every record here holds 2, 4 or 5.

### The creatures

Check squares 3, 5, 7, 9, 11, 15 and 31 (flags `$C1`) test the first conscious member (game `$8E3A-$8E44`) against Perception 3 or LK 3 on arrival; a member who fails loses CON, armour not counted (flag bit 0), and the square becomes one of the action squares (`$3C1E-$3C39`), whose change is class 0: the creature does not come back.

| Check square | Where | Failure message | Damage | Action square | Disease |
|---|---|---|---|---|---|
| 3 (`$3AEC`) | (2,3) | 30, a snake | 1d6 | 0 (`$3C1E`) | 4, Desert dust |
| 5 (`$3B08`) | (8,5) | 32, blue spiders | 1 | 1 (`$3C22`) | 2, Bug byte |
| 7 (`$3B24`) | (29,13) | 34, yellow spiders | 1 | 2 (`$3C26`) | 2, Bug byte |
| 9 (`$3B40`) | (1,25) | 36, a glowing spider | 1 | 3 (`$3C2A`) | 2, Bug byte |
| 11 (`$3B4F`) | (24,19) | 38, a scorpion | 1 | 4 (`$3C2E`) | 2, Bug byte |
| 15 (`$3B6D`) | (9,10) | 42, a rabid rat | 1d6 | 5 (`$3C32`) | 5, Rabies |
| 31 (`$3BD6`) | (4,19) | 57, a centipede | 1d6 | 6 (`$3C36`) | 2, Bug byte |
