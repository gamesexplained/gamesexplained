# Map 6, Quartz, the courthouse — verified technical facts

The courthouse of Quartz, which holds the town's jail: map 1's exit 20 says "Entering the Courthouse." (map 1's message 16) and leads to its door at (30,30), and the way out says "Leaving the courthouse." (message 41); inside, "A sign hangs from the ceiling by rusty chains. Quartz City Jail." (message 82). It is 32 x 32 squares, stored on side 2 of the disks as 38 pages from T16/L17 (track 16, logical sector 17), entry 6 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$59FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 2 (tiles-2). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 2 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 58 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 1 chance in 80 after each step as stored on the disk (game `random_encounter`, `$B017`; save_map, engine `$2856`, from enter_map `$25C3`, writes the header back when the party leaves, so a lowered chance stays); the map's own code lowers it (below). `$3A31`: monster types 1 to 5 (game `$B047`). `$3A32`: the groups take the first 4 class-15 records (game `$B040`).
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 488 blocking squares (class 11), 299 of class 0, 137 message squares (1), 80 check squares (2), 15 exits (10), 3 remote-change squares (12), 1 tile square (4) and 1 question square (8). No square holds an encounter as loaded; changes place them.
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 37 encounters, 33 message squares, 30 loot bags, 29 check squares, 21 remote changes, 11 exits, 7 tile squares, 7 blocking squares, 4 question squares, 4 random-encounter slots (class 15) and 3 action squares.
- Text: messages 0-165, packed from `$46B7` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$45D8` (header word 1, game `print_monster_name` `$9E5D`) are 1 Marksman, 2 Gunman, 3 Knifer, 4 Pistolero, 5 Coydog, 6 Huey, 7 Dewey, 8 Louie, 9 Mayor Pedros, 10 Citrine and 11 Wacko Prisoner; name 0 is empty. The 12 monster records start at `$4657` (game `monster_record` `$9EA4`).
- Two characters can join, from the NPC list at `$439A` (header word 20, `$3A28`). A Hire copies the 256-byte record of the NPC that a peaceful group's encounter record names in the high nibble of byte +9 (game `order_hire` `$A3F1`, `$A418-$A433`).
  - NPC 1, Mayor Pedros (`$43A0`), offered by encounter 35 (`$3FF3`, monster 9), which remote change 3 puts at (30,1) when his cell is opened.
  - NPC 2, Dan Citrine (`$44A0`), offered by encounter 34 (`$3FE7`, monster 10), which check square 20 puts at (30,13).
  - The last skill pair of each record (+`$BA`/+`$BB`) holds a number above the 35 skills at level `$FF`: 36 for Mayor Pedros (`$445A`), 37 for Dan Citrine (`$455A`). Engine `skill_level` (`$1392`) searches all 30 pairs, so a check on skill 36 or 37 finds that character when he is the member tested; on a square whose flags lack bit 5 that is only the first conscious member (game `$8E3A-$8E44`).

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 1, Quartz: exit 0 (`$41B8`) on (31,28), (31,29), (31,30) and (27,31)-(31,31), to (23,20), message 41, "Leaving the courthouse.".
- To map 3, the Stagecoach Inn: exit 1 (`$41BD`) on (16,31), to (31,1), message 21, "A hidden tunnel disappears under some rocks.". Map 3's exit 7 leads back to (16,29).
- The stairs, exits 2-7 (`$41C2-$41DF`): (12,26) to (11,12), message 27, "You climb the stairs to the second floor."; (12,12) to (11,26), message 30, "You descend to the first floor."; (12,14) to (12,2), message 31, "You climb to the third floor."; (12,1) to (11,14), message 34, "You descend to the second floor."; (6,1) to (12,29), message 30; and (12,28) to (7,1), message 35, "You climb to the top.".
- Exits 8, 9 and 10 (`$41E0`, `$41E5`, `$41EA`) stand on no square; the vines make them. Exit 8 leads eleven rows north of the party's square and exit 10 eleven rows south (byte 0 bit 7, relative, game `$89E3`); exit 9 leads to (16,27), message 42, "You fall and land hard!".
- The vines are check squares 8-11 (`$3BCE-$3C11`, tile 37), climbed by a Use of AGL 2 or Climb 1. Check square 8, six squares in rows 26 and 27 ("You see vines that climb up.", message 39), becomes exit 8, and a Use of a Rope there gives message 40, "You can't tie a rope here.". Check square 9, seven squares in rows 15 and 16, becomes exit 8, or exit 9 on a failure. Check squares 10, (15,16)-(17,16), and 11, (15,5)-(17,5), become exit 10, or exit 9 on a failure. A member who fails loses 1d6, 3d6, 2d6 or 4d6 CON, by check square, less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`).

## Its own code

The code list, header word 19 (`$3A26`), is at `$4155` and has two entries: 0 `$4159`, 1 `$4167`. An action square whose record byte 0 is below `$80` runs entry n (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$4159` more_random_encounters, action 0: subtracts 2 from header byte +`$2F` (`$4159-$415E`), the N of a random encounter 1 step in N, and stores the result only when it is neither 0 nor negative (the BMI and BEQ at `$4160-$4162`). From 80, N falls by 2 each time and stops at 2. The BMI would also refuse a result of 128 or more, which N never reaches here. With N at 2 or more the SBC leaves the carry set, so the view is redrawn.
- `$4167` sound_the_alarm, actions 1 and 2: stores 20 in +`$2F` (`$4167-$416B`), a random encounter 1 step in 20. It leaves the carry as entered, clear: no redraw.
- Engine `enter_map` writes the map back to the disk before it loads another (engine `save_map`, `$2856-$288F`, all 38 pages from `$3400`, the record at `$3A00` among them), so a lowered chance stays with the courthouse on later visits.

### The glass walls

- Check square 1 (`$3B49`, flags `$08`) is the glass wall on 36 squares: walking into it shows message 10, "This is a ceiling to floor glass wall.". A Use breaks it, with a change for each pair (`$3B72-$3B8F`):
  - ST 3, a Sledge hammer, a Shovel, a Pick ax, a Knife, a Crowbar, a Club or an Ax: check square 2 (`$3B90`), where every conscious member is tested against LK 1 and each who fails loses 3d6 CON less the member's armour roll, flag bit 0 being clear (game `$90AF-$90B4`; "The unlucky ones are picking chunks of glass out of themselves.", message 14). Either way it becomes check square 15 (`$3C89`), which tests every conscious member against LK 2. When all pass, message 54, "Amazingly, no one heard you.", and the square becomes tile square 0 (`$4019`), the broken glass ("Your boots crunch on the debris.", message 15). When one fails, message 55, "You made so much noise that you'll be lucky if no one comes after you.", and the square becomes action square 0 (`$414C`).
  - A Grenade, Plastic explosive, TNT, a LAW rocket, a Mangler, a Sabot rocket or an RPG-7: action square 0 at once.
- Action square 0 runs more_random_encounters, and its change is tile square 0.

### The vault and the Mayor's cell

- The steel vault door at (7,3) is check square 13 (`$3C45`, flags `$08`), message 48, "This is a locked steel vault door.". A Use of Picklock 3, Safecrack 2 or ST 1 makes it tile square 1 (`$401C`, tile 58). Any of the seven explosives makes it action square 1 (`$414F`), which runs sound_the_alarm and then becomes tile square 1.
- Mayor Pedros' cell at (28,2) is check square 31 (`$3DCE`, flags `$08`), message 99, "The cell is locked.". A Use of Picklock 3, Safecrack 2 or Alarm disarm 2 makes it remote change 3 (`$4260`). ST 10 or any of the seven explosives makes it message square 33 (`$3AF3`), "You open the cell and set off an alarm. Uh oh!" (message 107), then action square 2 (`$4152`), which runs sound_the_alarm and then becomes remote change 3. Remote change 3 puts encounter 35, the Mayor, at (30,1), and the party's square becomes tile square 1.

### Dan Citrine

- Behind the door at (24,16), check square 16 (`$3C96`), a guard sleeps (message 57). The first conscious member is tested against LK 2, Silent move 1 or AGL 2; a pass opens the door (message 58), and stepping onto (24,15), tile square 2 (`$401F`), makes it check square 17 (`$3CA7`), where ST 2, LK 2, Silent move 1 or AGL 2 from the first conscious member knocks the guard out (message 60). Remote change 13 (`$432E`) then puts check square 18 at (30,13).
- A failure at either, "He was pretending to sleep! He starts yelling for help!" (message 59), is remote change 12 or 4 (`$4312`, `$4268`): encounters 21, 22, 23 and 25 appear, and (30,13) becomes blocking square 4 (`$4205`), "A dead man, the victim of torture, is tied to a chair." (message 70).
- Check square 18 (`$3CBA`, flags `$00`) is "A tortured and dying man is sitting in the chair. He needs a drink fast." (message 71). A Use of a Canteen or Snake squeezin revives him (message 72), and message square 25 (`$3AE0`) gives his name: "I am Danny Citrine. The triplets wanted our cash. Dad and I hid it under their noses." (message 75). A failed Use makes the square check square 19 (`$3CC9`): one conscious member passing LK 1 puts check square 18 back; when none does, he dies (message 74) and the square becomes tile square 4.
- After message 75 the square becomes check square 20 (`$3CD6`), which looks for skill 36, the Mayor, in every conscious member: message 76, "I see you've rescued Mayor Pedros, I will help you get him out of here if you wish.", or message 77 without him. Either way the square becomes encounter 34, Dan Citrine, peaceful.
- With him in the party, skill 37 counts at four check squares, each testing every conscious member:
  - the thugs in the hall at (17,18), check square 21 (`$3CE3`): skill 37 ("Taking Danny back to his cell? Go on. It's down there.", message 78), LK 1, CHR 1, Confidence 1 or Bureaucracy 1 lets the party by; otherwise question square 3 asks for the password;
  - the fat guard at (16,7), check square 23 (`$3D11`): skill 37, Confidence 2, Bureaucracy 2 or LK 3 makes him open the door at (17,7) (remote change 17, `$4370`); otherwise encounter 29;
  - (14,7), check square 22 (`$3D02`): skill 37 or 36 makes a recruit say "I bet we could break the glass and climb down the plants." (message 129);
  - the bed at (30,7), check square 30 (`$3DC1`), "A man leaps out of the bed." (message 104): with skill 37 his father hands over the money (message 105) and the square becomes loot bag 29 (`$4140`), one cash entry of 1,000 as stored, which the game rolls when the bag is first opened (game `$91B4-$91BF`); without it he runs off (message 106).

### The password

- The door at (30,30) is question square 0 (`$4176`): "Outlaws and guard dogs emerge from a secret hiding place. "Who sent you?"" (message 1). MUERTE (message 2) is remote change 0 (`$4235`), "They nod and let you pass." (message 6), which leaves the question in place. UGLY leads to question square 1 (`$4187`), "You're just troublemakers. What's the word?", by way of message 7. SQUINT or MULEFOOT is check square 0 (`$3B38`), a bluff that one conscious member passes with LK 3, Confidence 1 or Bureaucracy 1.
- MUERTE is also the answer at question square 1, at question square 2 (`$4192`), "I don't know you. What's the word?", and at question square 3 (`$419A`, message 80), the guards' question for a party that fails check square 21. A wrong answer brings encounters: remote change 1 (`$423C`, encounters 0 and 1), remote change 11 (`$42ED`, "Hey, Stinger, we got intruders!", encounters 17, 19 and 20) and remote change 14 (`$433B`, encounters 26, 27 and 28).
