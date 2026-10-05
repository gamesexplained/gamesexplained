# Map 3, Quartz, the Stagecoach Inn — verified technical facts

The Stagecoach Inn in Quartz: "Welcome to Stagecoach Inn." (message 35), and "Leaving Stagecoach Inn." (message 58) on the way out; map 1's exit 16 says "Entering Stage Coach Inn.". It is 32 x 32 squares, stored on side 2 of the disks as 38 pages from T23/L5 (track 23, logical sector 5), entry 3 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$59FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 2 (tiles-2). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 2 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 58 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 577 of class 0, 269 blocking squares (class 11), 87 message squares (1), 68 check squares (2), 10 encounters (3), 6 remote-change squares (12), 4 exits (10), 2 tile squares (4) and 1 question square (8).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 63 message squares, 33 check squares, 22 loot bags, 17 encounters, 17 remote changes, 9 blocking squares, 8 tile squares, 4 exits, 3 action squares and 3 question squares.
- Text: messages 0-188, packed from `$432C` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$421D` (header word 1, game `print_monster_name` `$9E5D`) are 1 Gunman, 2 Outlander, 3 Cutthroat, 4 Spiker, 5 Rottweiler, 6 Squint, 7 Clerk, 8 Mongrel, 9 Mulefoot, 10 Laurie, 11 Housekeeper, 12 Bum and 13 Madman; name 0 is empty, and no encounter names monster 4. The 14 monster records start at `$42BC` (game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$3A28`), the NPC list, is $0000.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 1, Quartz: exit 0 (`$40CD`) on (0,29) and (0,30), to (15,15), message 58, "Leaving Stagecoach Inn.".
- To map 6, the courthouse: exit 7 (`$40DC`) on (30,1), to (16,29), message 7, "Going into a tunnel.".
- On this map: exit 1 (`$40D2`) on (31,1) and exit 2 (`$40D7`) both lead to (29,1); exit 1 shows message 4, "As you exit the from the tunnel, you startle a sleeping hobo and he runs off.". Remote change 15 (`$4203`), the square (29,1), makes (31,1) exit 2, (30,1) exit 7 and (28,1) tile square 0.

## Its own code

The code list, header word 19 (`$3A26`), is at `$407F` and has one entry, `$4081`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$4081` booby_trap_blast, action 0: a jump to engine `api_screen_shake` (`$044C`), the explosion: engine `screen_shake` (`$0746`) plays sound 0 and jolts the screen twelve times. It returns the carry that random_byte's last ADC left (engine `$24EC`; nothing after the last jolt at engine `$0764` changes it), so whether the view is redrawn after the blast (game `$8872`) is chance.
- Action squares 0, 1 and 2 (`$4076`, `$4079`, `$407C`) run it, the inn's three booby traps. Their changes make the square check square 6, 12 or 30, which deal the damage.

### The file cabinet

- Walking into (1,24), check square 5 (`$3C6F`, flags `$40`), shows message 31, "This file cabinet is locked.", and tests Perception 1 or LK 2 (and, past them, check square 6's pairs, as the next point says); a pass also shows message 32, "You notice a twist of wire and suspect that doing the wrong thing will blow it.". Either way the square becomes check square 35 (`$3E5E`).
- Check square 5 has no `$FF` after its two pairs (`$3C79-$3C7C`), so when both fail game `square_checks` reads on into check square 6's bytes up to the `$FF` at `$3C81`. Their pair `D0 00` is kind 6, an item carried, item 0, which `find_item` (engine `$124C`) matches in any empty slot: a member with an empty slot passes, and `use_item_charge` on that slot changes nothing. Only a member with no free slot reaches `00 00`, skill 0, and fails it unless a skill pair numbered 0 has a level.
- Check square 35 (flags `$08`, a change for each pair) is opened by a Use (game `use_on_square` `$8BEF`). Perception 1 makes it message square 3, which shows the wire again and trades back. Bomb disarm 1, Safecrack 2 or LK 3 makes it message square 19: message 33, "Fortunately, you traced the right wire and disarmed it.", then check square 36 (`$3E79`), where a Use of Picklock 1 opens loot bag 5 (`$3FE6`: a Plastic explosive, a Book and cash 250).
- Any other Use, or a failed one, changes the square by its +6/+7 to action square 0 and the party steps into it (game `use_failed` `$8CC7`, `try_move_party` `$ADD1`): the trap goes off. Its change is check square 6 (`$3C7D`, flags `$D0`): the first conscious member decides (game `$8E3A-$8E44`), its only pair is skill 37 at difficulty 1, and the effect, 4d6 CON less each member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), falls on everybody (flag bit 4, game `apply_effect_to_all` `$90F5`). Skill 37 is the marker only Dan Citrine's record holds (map-06 `$44A0` + `$BA`/`$BB`), so anyone else fails. He passes unless engine `skill_check` (`$0C29`) fails him at once on an open 2d6 roll under 5, which only 1 and 2 or 1 and 3 give (engine `skill_roll_total`, `$0C70-$0C75`); otherwise his level of 255, counted four times (engine `$0C92-$0C9B`), reaches any target. On a pass nobody is hurt and the square stays as it is; on a failure it becomes tile square 4 (`$3F8E`), "The floor is blasted open." (message 126).

### Room 18

The door at (12,5) is check square 10 (`$3CB3`, flags `$08`): walking into it shows "The door is locked." (message 1). What a Use opens it with decides the rest (its changes, `$3CDA-$3CF5`):

- Room key #18 (item 81): remote change 6 (`$41A2`), message 118, "You startle a woman in a wheelchair. "Hi, I am Laurie," she says.", which makes (12,4) question square 1 (`$4095`), her question.
- A Passkey, Picklock 2 or a Crowbar: remote change 9 (`$41C4`), message 140, "A voice says, "If you step inside, you will be blown to Kingdom Come."". It makes (12,4) action square 1 and the doorway check square 13 (`$3D10`), "You have 2 chances to convince me not to shoot you," (message 143); a Use of CHR 2, Confidence 1 or Bureaucracy 1 there brings her question, and check square 14 (`$3D21`) is the second chance.
- ST 3, a Pick ax, a Sledge hammer or any of seven explosives: message square 45 (`$3B53`), messages 71, 72 and 70: the door splinters, and Laurie, behind it, dies.
- Action square 1 at (12,4) is a booby trap too. Its change, check square 12 (`$3D03`, flags `$E0`), tests every conscious member against skill 37 at difficulty 1, and each who fails, everyone but Dan Citrine and he on a roll under 5 (above), loses 6d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), message 141, "From the room a grenade is lobbed at your feet.". Its failure change, remote change 10 (`$41CC`), puts encounter 6 (`$3EF0`, monster 10, Laurie) at (12,1), tile square 1 at (12,5) and tile square 4 under the party.

### The dingy bed

- At (1,1), check square 28 (`$3DF1`, flags `$E4`): message 15, "A dingy bed leans on the wall. Its legs barely hold it up.", and Perception 1 or LK 2 from any member shows the wire (message 32). Either way it becomes check square 29 (`$3E00`, flags `$88`), which needs a Use.
- Bomb disarm 1 or Safecrack 2 gives message square 54: message 86, "You cut the right wire and disarmed the booby trap.", then loot bag 16 (`$403B`: TNT, five 45 clips and cash 300). LK 3 gives message square 53: message 84, "You are extremely fortunate. You fail to disarm it but it does not blow up.", and the square is check square 29 again.
- A Use of Perception, which check square 29 does not list, only shows "You see nothing special." (game `$8C32-$8C45`) and changes nothing. Any other Use makes it action square 2 and the party steps in. Its change, check square 30 (`$3E17`, flags `$E0`), message 127, "You blew it -- literally!", costs every conscious member who fails skill 37 at difficulty 1 4d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`), and the square becomes tile square 4.
