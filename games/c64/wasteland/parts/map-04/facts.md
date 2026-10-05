# Map 4, Quartz, Ugly's hideout — verified technical facts

The hideout of Ugly's gang in Quartz: its door says, "I'm Ugly and you're not." (message 61), and one room is "Ugly's room." (message 72). Map 1's exit 17 leads in, with "This doesn't look like a safe place to enter.". It is 32 x 32 squares, stored on side 2 of the disks as 31 pages from T21/L5 (track 21, logical sector 5), entry 4 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$52FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 2 (tiles-2). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 2 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 58 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 510 blocking squares (class 11), 403 of class 0, 48 check squares (2), 41 encounters (3), 13 message squares (1), 4 loot bags (5), 3 exits (10), 1 tile square (4) and 1 question square (8).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 47 encounters, 43 loot bags, 24 message squares, 23 check squares, 12 remote changes, 9 action squares, 7 tile squares, 6 question squares, 5 exits and 4 blocking squares.
- Text: messages 0-145, packed from `$467A` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$45B8` (header word 1, game `print_monster_name` `$9E5D`) are 1 Marksman, 2 Gunman, 3 Bouncer, 4 Pistolero, 5 Guard, 6 Coydog, 7 Widowmaker, 8 Ugly John, 9 Felicia and 10 Ace; name 0 is empty, and no encounter names monster 3. The 11 monster records start at `$4622` (game `monster_record` `$9EA4`).
- Two characters can join, from the NPC list at `$43B2` (header word 20, `$3A28`). A Hire copies the 256-byte record of the NPC that a peaceful group's encounter record names in the high nibble of byte +9 (game `order_hire` `$A3F1`, `$A418-$A433`).
  - NPC 1, Felicia (`$43B8`), offered by encounter 46 (`$3F72`, monster 9), which check square 16 puts on the map.
  - NPC 2, Ace (`$44B8`), offered by encounter 47 (`$3F7E`, monster 10) at (1,27).
  - The last skill pair of each record (+`$BA`/+`$BB`) holds a number above the 35 skills at level `$FF`: 39 for Felicia, 38 for Ace. Engine `skill_level` (`$1392`) searches all 30 pairs, so a check on skill 38 finds Ace: check square 16 here, map 0's jeep (map-00 `$4C82`) and a check on map 34.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 1, Quartz: exit 1 (`$428D`) on (0,2), to (24,14), and exit 4 (`$429C`) on (21,0), to (26,13), with message 6, ""Let's get the hell outta here!"".
- On this map: exit 3 (`$4297`) on (4,30), to (30,19), message 59, "Going up."; exit 2 (`$4292`), to (3,30), message 58, "Going down to the cellar.", which check square 11 (Perception 2) makes; and exit 0 (`$4287`), ten columns east of the party, message 13, "You leap through the broken glass to the floor below.", which action square 0 and tile square 7 make.

## Its own code

The code list, header word 19 (`$3A26`), is at `$4193` and has four entries: 0 `$419B`, 1 `$4203`, 2 `$4206`, 3 `$41D9`. An action square whose record byte 0 is below `$80` runs entry n (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$419B` set_gang_encounters, action 0: writes record byte +3 (a monster) into byte +3, the first line's monster, and record byte +4 (flags) into byte +9 of encounter records 29 down to 0 (`$41B0-$41CC`), each found through engine `api_map_class_entry` (`$0428`) with Y = 3 (`$41B5`). It keeps `$5F`/`$60` on the stack meanwhile and returns the carry clear.
- `$41D6` gang_record_number, `$41D7` gang_monster and `$41D8` gang_flags: its working bytes (`$41D6` serves alert_kennel_dogs too); all 0 as loaded.
- `$41D9` alert_kennel_dogs, action 3: sets byte +9 of encounter records 33 to 40 to 1 (`$41E1-$41F9`), names shown and no longer peaceful (bit 1, game `encounter_is_peaceful` `$9EF6`). Returns the carry clear.
- `$4203` bomb_blast, action 1: a jump to engine `api_screen_shake` (`$044C`), the explosion. It returns the carry that random_byte's last ADC left (engine `$24EC`), so whether the view is redrawn after the blast (game `$8872`) is chance.
- `$4206` swap_everyones_sex, action 2: flips bit 0 of byte +`$18`, the sex, in every character record from 1 to records_in_use (`$0A`; engine `api_select_character` `$0338`), every party and hired NPC alike. Its line `$4217` is the operand of the LDA # at `$4216` that holds the record number. Returns the carry clear.

### The gang

Six action records use set_gang_encounters, each with its own monster and flags at +3/+4 (`$416D-$418D`):

| Record | Number | +3, +4 | Run after |
|---|---|---|---|
| `$416D` | 0 | 2 Gunman, 1 hostile | the skylight breaks: check square 5 (flags `$00`), (5,8)-(5,20), opened by a Use of ST 3, a Crowbar, an Ax, a Pick ax or a Sledge hammer; its change is exit 0, the leap down |
| `$4172` | 1 | 4 Pistolero, 3 peaceful | the password KAPUT at the guard, question square 0 at (21,2) (`$422F`), "Hey Joe, no one gets in or out without the password.", or after swap_everyones_sex |
| `$4181` | 4 | 4 Pistolero, 3 peaceful | any of the five section leaders' names at question square 1 (`$4240`), "Who is your section leader?" |
| `$4177` | 2 | 4 Pistolero, 1 hostile | a wrong password at question square 0 |
| `$417C` | 3 | 4 Pistolero, 1 hostile | any of loot bags 0-28 emptied, what a fallen gang member leaves |
| `$4189` | 6 | 4 Pistolero, 1 hostile | a wrong section leader, through remote change 2 (`$434B`), "Who are you trying to kid?" |

### The kennel

- Encounter records 33-40 are the eight Coydogs (monster 6), at (19,2), (17,2), (18,1), (15,2), (14,3), (15,4), (14,5) and (15,6); they start at peace (flags 3).
- The fence, (16,1)-(16,6) and (17,3)-(19,3), is check square 6 (`$3B77`, flags `$00`): walking into it shows message 37, and a Use of Climb 2 passes, with message 38. Success makes the square action square 8 (`$4191`), which runs alert_kennel_dogs; its change `$FD` then trades the check square back.

### Felicia's bomb

- Check squares 14 and 15 (`$3C53`, `$3C62`, flags `$90`) are the bomb: check square 14 shows message 79, "You see Felicia's bomb flashing yellow and red lights.", and check square 15 message 82, "The red light is still flashing."; both are disarmed by a Use of Demolitions 2 or Bomb disarm 2. Question square 4 (`$4267`), "Enter bomb code:", takes 11-27-57-04-30 (message 88). Success ends at message square 21: message 83, "You successfully disarm the bomb. Felicia is very grateful.".
- A failure at check square 14 or 15, or a wrong code, makes the square action square 5 (`$4186`), which runs bomb_blast. Its change, check square 17 (`$3C7E`, flags `$D0`), lets the first conscious member decide (game `$8E3A-$8E44`) on skill 37 at difficulty 2, and its effect, 3d6 CON less each member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), falls on everybody (flag bit 4) with message 81, "BOOM!". Skill 37 is the marker only Dan Citrine's record holds (map-06 `$44A0` + `$BA`/`$BB`), so anyone else fails. He passes unless engine `skill_check` (`$0C29`) fails him at once on an open 2d6 roll under 5, which only 1 and 2 or 1 and 3 give (engine `skill_roll_total`, `$0C70-$0C75`); otherwise his level of 255, counted four times (engine `$0C92-$0C9B`), reaches any target. With him first and a pass, nobody is hurt.

### The passwords that change sex

- Question square 0 takes four answers (`$422F`): AZRAEL (message 111) and MORS (112) make the square action square 7 (`$418E`), which runs swap_everyones_sex; KAPUT (20) makes it action square 1; THANATOS (21) makes it message square 6.
- Action square 7's change is action square 1, so after the sex change set_gang_encounters runs as well and the gang is at peace, as with KAPUT.
