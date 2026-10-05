# Map 7, Sleeper Base, level 1 — verified technical facts

The top level of Sleeper Base: map 0's exit 41 says "Entering Sleeper Base." (map 0's message 28) and leads in at (14,1), and its corridors are "Stainless steel corridors extend into the darkness." (message 1). A ladder joins it to the two levels below (message 27). It is 32 x 32 squares, stored on side 4 of the disks as 16 pages from T25/L15 (track 25, logical sector 15), entry 7 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$43FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 7 (tiles-7). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 7 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 35 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 575 of class 0, 410 blocking squares (class 11), 21 message squares (1), 9 check squares (2), 4 encounters (3), 4 exits (10) and 1 question square (8).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 11 check squares, 10 loot bags, 5 message squares, 4 encounters, 4 exits, 3 blocking squares, 1 tile square, 1 action square and 1 question square.
- Text: messages 0-68, packed from `$3C7C` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$3C0E` (header word 1, game `print_monster_name` `$9E5D`) are 1 Mailed Wolf, 2 Iron Wolf, 3 Warbot and 4 Large Scorparundi; name 0 is empty. The five monster records start at `$3C54` (game `monster_record` `$9EA4`). The four encounters stand at (9,1), (8,21), (11,29) and (29,30), one for each monster, and each leaves a loot bag when wiped out (bags 9, 6, 7 and 8).
- No code and nobody to hire: header words 19 and 20 (`$3A26`, `$3A28`), the code list and the NPC list, are both $0000. The one action square opens a module (below).
- The walls answer a bump with "OUCH!", "BAM!" or "KAPOW!" (blocking squares 0-2, `$3C08-$3C0D`, messages 33-35).

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 0, the world map: exit 7 (`$3BFD`) on (13,0), (14,0) and (15,0), to (60,7), asking first (byte 0 bit 6, game `$8A3F`).
- To map 13, Sleeper Base, level 2, and map 15, level 3: exits 1 (`$3BF3`) and 2 (`$3BF8`), each to (1,30). No square holds them; the ladder at (1,28), question square 0 (`$3BD0`), makes them. Its question is message 27, "A ladder is here. 1) Remain on lvl 1. 2) Climb down to lvl 2. 3) Climb down to lvl 3.", answered with one key: 1 changes nothing, 2 makes the square exit 1 and 3 makes it exit 2. Each exit's change, `$FD`, trades the question back (engine `alter_square`, `$0A00`).
- On this map: exit 0 (`$3BED`) at (21,30) shows message 24, "You have found a set of books entitled "Everything you always wanted to know about Clone Chemical Preparations."", and asks. It leads to the party's own square (relative, +0,+0), and its change makes the square action square 0 (`$3BBC`). Engine `enter_map` does nothing for the map in memory (engine `$25BF`) and the exit returns the carry set (game `$8A34`), so game `run_square_action` (`$ACC1`) runs action square 0 at once: record byte 0 is `$82`, module 2, the library, with greeting message 32, "You look at the book.", the name "Clone prep." and one skill, 33, Clone tech (module-2 `$CA06-$CA21`). Its change, `$FD`, trades the exit back.

## The doors and the finds

- The doors with a slot, check squares 3 (`$3AC5`) at (27,10), 5 (`$3AD2`) at (23,5) and 11 (`$3B24`) at (27,24), show message 10, "The door has no handle or sign on it, just a narrow slot on the right side.". A Use of Secpass 1 opens check square 3, and of Secpass 3 the other two: the square becomes tile square 0 (`$3B6B`, tile 51) with message 3, "The door slides up into the ceiling.". Flag bit 1 has a failed Use show message 4 (game `$8DCB`).
- The bulkhead at (5,10), check square 0 (`$3A88`), "looks as if it could be forced" (message 2): a Use of Picklock 2, ST 3, a Crowbar, a Pick ax, a Sledge hammer or one of seven explosives opens it the same way.
- The debris at (3,1), (1,4) and (18,21), check squares 1, 2 and 7 (`$3AAB`, `$3AB8`, `$3AEE`), is searched on arrival: one conscious member passing Perception 2 finds loot bag 0 (7.62mm clips), 1 (Secpass 1) or 3 (Secpass 3). A failed search leaves the square as it is.
- The weapons locker at (18,1), check square 6 (`$3ADF`), opens to a Use of Picklock 2 or ST 2: loot bag 2, two AK 97 assault rifles.
- The shining object at (17,9), check square 8 (`$3AFB`), tests the first conscious member against AGL 2 or DEX 2. A pass leads to check square 9 (LK 3), whose pass gives loot bag 4 (a Laser pistol and Power packs) and failure loot bag 5 (Power packs). A failure leads to check square 10 (LK 3), whose pass gives loot bag 5 and whose failure costs the first conscious member 3d6 CON less the member's armour roll (flag bit 0 clear, game `$90AF-$90B4`) (message 21, "A wall support lands heavily on your arm and pain shoots up into your head...") and empties the square.
