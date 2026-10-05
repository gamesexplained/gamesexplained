# Map 5, Quartz, the abandoned buildings — verified technical facts

The abandoned buildings of Quartz, one map for all of them: "This building hasn't been used in almost a hundred years." (message 6). Map 1's 64 building exits, 21-84, lead here, with "An old abandoned shack.", "It looks dark in here." and "This doesn't look like a safe place to enter.". It is 32 x 32 squares, stored on side 2 of the disks as 17 pages from T19/L12 (track 19, logical sector 12), entry 5 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$44FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 2 (tiles-2). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`: engine `load_map_pages` puts it there for every map number of `$80` or more (engine `$260A`), and this map is only ever loaded by such a number.
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 2 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 0 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 615 blocking squares (class 11), 339 of class 0, 51 message squares (1), 14 check squares (2) and 5 exits (10).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 22 check squares, 17 message squares, 11 remote changes, 6 blocking squares, 4 action squares and 1 exit.
- Text: messages 0-45, packed from `$3CBC` (header word 0, engine `select_map_text` `$1E4F`).
- No monsters and nobody to hire: the map has no encounter records and no monster records; header word 2 holds the text's address `$3CBC`, and words 1 and 20 (`$3A02`, `$3A28`) hold `$3CBB`, the byte before it.

## Loaded for many numbers, never saved

- Engine `load_map_pages` replaces a map number of `$80` or more with its byte in T35/L8 (engine `$261C-$2624`); that byte is 5 for `$80-$BF` on all four sides. Map 1's exits 21-84 use those 64 numbers, one each, and no other map's exits do.
- Engine `enter_map` keeps the number as given in `$91` (engine `$25C6-$25C8`), and engine `save_map` returns at once when it has bit 7 (engine `$2856-$2858`). So a building is never written back to the disk, and every visit, to the same building or another, starts from the disk's copy.

## Exits

- Exit 0 (`$3C04`), on (0,7), (31,7), (25,18), (26,18) and (6,31), leads back to the return point (record byte 3 is `$FF`, game `$89EE`), the square of Quartz the party came in by, with message 5, "Getting out of here.".

## Its own code

The code list, header word 19 (`$3A26`), is at `$3C9C` and has one entry, `$3C9E`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). The record's change at +1/+2 is applied to the party's square afterwards (game `$8840`, `alter_party_square` `$B105`).

- `$3C9E` infect_first_member, action 0: selects party position 1 (engine `api_select_member` `$0335` with A = 1) and ORs into its byte +`$28` the mask for disease number record +3, from `$3CB3` (`$3CA3-$3CAF`). Returns the carry clear: no redraw (game `$8872`).
- `$3CB3` disease_masks: `01 02 04 08 10 20 40 80`, the mask of bit n for disease n.
- Line `$3CA9`, m05_bit_skip_3CA9: the low byte of the operand of the LDA at `$3CA8`. Its label comes from the game's `BIT $3CA9` at game `$81DE`, which hides the `LDA #$3C` at game `$81DF`. The BIT also runs, in melee_monster_attacks for a target whose order is not 5, and reads this byte, but its flags are replaced before anything tests them (game `$81E1`, engine `$07D5`), so the byte's value never matters.
- The bits are the doctor's diseases (module-0 `$CCC2-$CCFC`): 2 Bug byte, 4 Desert dust, 5 Rabies. Any set bit of +`$28` stops a character healing (game `con_heal_one` `$B854-$B858`), and bits 4-7 cost a point of CON whenever `$D2` AND 63 is 0 (game `health_tick`, `$B7A2-$B7A8`, `$B816-$B81A`).
- Record byte 3 is not checked; every record here holds 2, 4 or 5.

### The creatures

Check squares 1, 3, 9 and 11 (flags `$C1`) test the first conscious member (game `$8E3A-$8E44`) against Perception 1 or LK 3 on arrival; a member who fails loses 1d6 CON, armour not counted (flag bit 0). Their failure changes are the four action squares (`$3C8C-$3C9B`):

| Check square | Where | Failure message | Action square | Disease | Then |
|---|---|---|---|---|---|
| 1 (`$3ACE`) | (10,30), (20,30) | 17, a desert snake | 0 (`$3C8C`) | 4, Desert dust | remote change 0 |
| 3 (`$3AEA`) | (25,4), (22,19) | 19, a desert spider | 1 (`$3C90`) | 2, Bug byte | remote change 1 |
| 11 (`$3B5A`) | (2,1) | 25, a rabid rat | 2 (`$3C94`) | 5, Rabies | remote change 5 |
| 9 (`$3B3E`) | (23,21) | 34, a flying scorpion | 3 (`$3C98`) | 2, Bug byte | remote change 4 |

Each remote change (`$3C37-$3C83`) puts the check square back under the party, so the creature is there again on the next visit to the square. A pass leads to the next check square (2, 4, 10 or 12), whose only pair is skill 37 with the effect experience + 5 on a failure.
