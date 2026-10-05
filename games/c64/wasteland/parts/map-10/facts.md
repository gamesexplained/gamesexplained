# Map 10, Highpool — verified technical facts

Highpool, the settlement of the mutant kids by Highpool Creek: map 0's exit 8 says "Entering Highpool." (map 0's message 4) and leads in at (7,1), message square 1: "You are in the desert north of the settlement of Highpool." (message 10); and the way out says "Leaving Highpool." (message 12). It is 32 x 32 squares, stored on side 1 of the disks as 36 pages from T14/L4 (track 14, logical sector 4), entry 10 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$57FF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 1 (tiles-1). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 1 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 58 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 0, never (game `random_encounter`, `$B017`); `$3A31` and `$3A32` are 0 as well.
- `$3A34`/`$3A35`, the time a step takes: half a minute (fraction 128, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 2 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 8th step (game `$AF75-$AF7B`).
- Squares, 1,024: 561 blocking squares (class 11), 297 of class 0, 126 message squares (1), 21 exits (10), 16 check squares (2), 2 encounters (3) and 1 remote-change square (12).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 56 message squares, 18 loot bags, 18 remote changes, 16 check squares, 14 blocking squares, 13 encounters, 9 exits, 5 question squares, 3 tile squares and 2 action squares.
- Text: messages 0-150, packed from `$4401` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$4361` (header word 1, game `print_monster_name` `$9E5D`) are 1 Brat, 2 Chubby Kid, 3 Red Ryder, 4 Rabid Dog, 5 Spiked Mut, 6 Bobby and 7 Juvenile; name 0 is empty. The eight monster records start at `$43C1` (game `monster_record` `$9EA4`).
- One character can join, from the NPC list at `$3E54` (header word 20, `$3A28`): NPC 1, Jackie (`$3E58`). A Hire copies the 256-byte record of the NPC that a peaceful group's encounter record names in the high nibble of byte +9 (game `order_hire` `$A3F1`, `$A418-$A433`); here that is encounter 11 (`$3D8A`, monster 7, peaceful and stationary) at (28,1), deep in the cave: "Please help me get out of here." (message 116).
- The last skill pair of Jackie's record (+`$BA`/+`$BB`, `$3F12`) holds 41, a number above the 35 skills, at level `$FF`. No check square on any of the 42 maps tests skill 41 (a scan of every check square's pairs up to its `$FF`).

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 0, the world map: exit 0 (`$4000`) on (1,0)-(14,0), to (47,58), message 12, "Leaving Highpool.", asking first.
- Into the cave: exit 1 (`$4005`), to (26,9), message 58, "You tie your rope to the tree limb and climb down into the darkness.", which no square holds (below). Out of it: exit 2 (`$400B`) on (26,8), to (2,22), message 24, "You exit the cave.".
- Between the buildings, without a message: exit 3 (`$4010`) on (12,21) to (26,27), exit 4 (`$4015`) on (25,27) to (11,21), exit 5 (`$401A`) on (9,29) to (26,17), and exit 6 (`$401F`) on (25,17) to (8,29).
- The infirmary and the shop: exit 7 (`$4024`) on (13,29), "Entering the infirmary." (message 25), and exit 8 (`$402A`) on (30,24), "Entering the shop." (message 39), both asking first. Each leads to the party's own square (relative, +0,+0), and its change makes the square action square 0 (`$3F5C`) or 1 (`$3F6F`). Engine `enter_map` does nothing for the map in memory (engine `$25BF`) and the exit returns the carry set (game `$8A34`), so game `run_square_action` (`$ACC1`) runs the action square at once: record byte 0 `$80` is module 0, the doctor, named " Infirmary ", and `$81` module 1, the shop, named "   Store   ". Each change, `$FD`, trades the exit back.

## The cave

- At (1,22), check square 4 (`$3BEA`, flags `$80`) needs a Use: Perception 2 makes it check square 6 (`$3C04`), "You find a deep hole to a dark cave. A short strand of frayed rope, about 3 inches long, dangles from a tree limb." (message 57). A Use of a Rope there makes it question square 4 (`$3FE6`), "Your rope is tied to the tree. Want to slide down into the cave? (Y/N)" (message 115), and Y makes it exit 1. Exit 1's change puts question square 4 back, so the rope stays tied.
- Inside, encounter 8 (`$3D66`) at (26,6) is a Rabid Dog, stationary: "A huge dog lunges from a dark corner, jaws foaming." (message 61).

## Its own code

The code list, header word 19 (`$3A26`), is at `$3F85` and has one entry, `$3F87`.

- `$3F87` unused_stub: SEC, RTS. Nothing runs it. Only game `run_action` reads the code list (game `$885C`), and it runs entry n for an action record whose byte 0 is n, below `$80` (game `$8845-$885E`); this map's two action records start with `$80` and `$81` and run modules 0 and 1. A search of the map's snapshot for every JSR or JMP to engine `api_map_class_entry` (`$0428`), engine `action_record` (`$09B8`) and game `square_record_of` (`$BB83`) finds no other caller that passes Y = `$10`, the code list's class.
