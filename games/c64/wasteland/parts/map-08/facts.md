# Map 8, Desert Nomads — verified technical facts

The camp of the Desert Nomads, a train of cars with the clans' tents around it: map 0's exit 6 says "Entering Desert Nomads." (map 0's message 2) and leads in at (30,8), and every way out says "Leaving Nomads." (message 2). Its cars are named on the map: "Caboose.", "Hobo's Boxcar.", "Trading Car.", "Casino Car." and "Locomotive." (messages 11, 12, 15, 16 and 17). It is 32 x 32 squares, stored on side 1 of the disks as 27 pages from T16/L15 (track 16, logical sector 15), entry 8 of the map directory at T35/L14 (engine `point_at_maps`, `$28CE`). Engine `enter_map` (`$25BD`) loads it to `$3400-$4EFF` and unpacks its tile layer to `$DE00-$E1FF`. It is drawn with tile set 1 (tiles-1). Squares are given as (column, row). Every address here is this map's unless a part is named beside it.

## The map

- The class layer is `$3400-$35FF` and the number layer `$3600-$39FF`. The map record is at `$3A00`, since the map's byte in T35/L8 is not `$40` (engine `load_map_pages`, `$2606-$2616`).
- `$3A2C`, the size: 32 (engine `enter_map`, `$25D3`).
- `$3A30`, the tile set: 1 (engine `$25EE`).
- `$3A33`, the tile drawn off the map: 70 (engine `draw_square`, `$0B5E`).
- `$3A2F`, random encounters: 1 chance in 75 after each step (game `random_encounter`, `$B017`). `$3A31`: monster types 1 to 6 (game `$B047`). `$3A32`: the groups take the first 5 class-15 records (game `$B040`).
- `$3A34`/`$3A35`, the time a step takes: a quarter of a minute (fraction 64, minutes 0; game `advance_clock` `$AF32`).
- `$3A36`, ticks: 1 a step, added to `$D2` and to the elapsed count `$04-$06` (game `$AF58-$AF72`), so game `health_tick` (`$B795`) runs every 16th step (game `$AF75-$AF7B`).
- Squares, 1,024: 514 of class 0, 393 blocking squares (class 11), 102 exits (10), 7 message squares (1), 4 question squares (8), 2 remote-change squares (12), 1 check square (2) and 1 tile square (4).
- Records, named by the class lists of header words 3-18 (`$3A06-$3A25`, engine `action_record` `$09B8`): 27 message squares, 13 check squares, 12 loot bags, 12 blocking squares, 11 action squares, 9 exits, 8 encounters, 6 question squares, 5 random-encounter slots (class 15), 4 remote changes and 1 tile square.
- Text: messages 0-118, packed from `$401F` (header word 0, engine `select_map_text` `$1E4F`).
- Monsters: the names from `$3F01` (header word 1, game `print_monster_name` `$9E5D`) are 1 Dire Coyote, 2 Nuke Pooch, 3 Gila Monitor, 4 Rail Raider, 5 Rail Raider, 6 Rail Thief, 7 Topekan Man, 8 Topekan Woman, 9 Topekan Child, 10 Topekan Elder and 11 Baby Topeka; name 0 is empty, and names 4 and 5 are the same. The 12 monster records start at `$3FBF` (game `monster_record` `$9EA4`).
- Nobody can join here: header word 20 (`$3A28`), the NPC list, is $0000.

## Exits

Record byte 3 is the map an exit leads to (game `square_exit`, `$89A3`).

- To map 0, the world map, all with message 2, "Leaving Nomads.", and asking first: exit 4 (`$3DBD`) on column 31, rows 1-19, to (44,46); exit 5 (`$3DC2`) on column 0, rows 1-18, to (42,46); exit 6 (`$3DC7`) on row 0, columns 1-31, to (43,45); and exit 7 (`$3DCC`) on (0,0) and row 19, columns 0-30, to (43,47). They put the party on the four squares around map 0's exit 6.
- The Trading Car: exit 0 (`$3DB2`) at (17,2) shows message 6, "Entering The Trading Car", and asks. It leads to the party's own square (relative, +0,+0), and its change makes the square action square 0 (`$3CE0`). Engine `enter_map` does nothing for the map in memory (engine `$25BF`) and the exit returns the carry set (game `$8A34`), so game `run_square_action` (`$ACC1`) runs action square 0 at once: record byte 0 is `$81`, module 1, the shop, named "Trading car". Its change, `$FD`, trades the exit back.
- The caboose: at (29,2), message square 4 shows message 24, "The Brakeman meets you at the door of the caboose. ... he has something for you to deliver to the Head Crusher in Quartz.", and becomes question square 1 (`$3D41`), "He asks if you will deliver the message (Y/N)?". Y leads by way of message 28 to loot bag 10 (`$3CBB`), a Visa card; N gives message 29, "The Brakeman stiffens at your rejection...". The emptied bag and message 29 both make the square exit 11 (`$3DD1`), which moves the party to (30,2) and makes the square blocking square 0.
- The Topekans' tent: the guard at (14,7), question square 5 (`$3D69`), "requests that you state your business" (message 72), and welcomes CHAT, CATERPILLAR or ATCHISONS (messages 40-42; anything else, "What?"). Behind him, tile square 7 (`$3C51`) at (14,8) becomes exit 1 (`$3DB8`) when stepped on, into the tent at (13,27). There remote change 19 (`$3E54`) shows message 43, "You find yourself in a splendidly furnished tent. ... "Welcome to the Topeka Clan ... FOOLS!"", puts encounters 0 (a Baby Topeka), 5 (five Topekan Men), 6 (six Topekan Women), 7 (five Topekan Elders) and 8 (four Topekan Children) around the party, and makes (14,8) exit 12 (`$3DD7`), the same way in without the ambush. Exit 13 (`$3DDC`) on (13,24) leads back out to (14,6).

## Its own code

The code list, header word 19 (`$3A26`), is at `$3EC8` and has one entry, `$3ECA`. An action square whose record byte 0 is below `$80` runs it (game `run_action` `$8845`: engine `api_map_class_entry` `$0428` with Y = `$10` at game `$885E`, then game `jump_work_ptr` `$AC69`), entered with the carry clear (the ASL at engine `$09D5`). When the routine returns, a set carry has the view redrawn (game `$8872`); then the record's change at +1/+2 is applied to the party's square (game `$8840`, `alter_party_square` `$B105`), and a written change runs the new square at once (game `run_square_action`, `$ACC1`).

- `$3ECA` slot_machine_payout, actions 1-10: copies record bytes +3/+4, the prize, to payout_low and payout_high (`$3EFF`, `$3F00`), keeps `$5F`/`$60` on the stack, finds loot bag 9 (`$3CB5`) through engine `api_map_class_entry` (`$0428`) with A = 9 and Y = 5, and writes `$5E`, an unrolled cash entry, and the two prize bytes into the bag's bytes +2 to +4 (`$3EE5-$3EF5`). Returns the carry clear: no redraw.

### The slot machine

- The machine is question square 0 (`$3D37`) at (12,2): "This is a $10 slot machine. Try your luck (Y/N)?" (message 4), answered with one key. Y makes the square check square 16 (`$3B8F`).
- Check square 16 tests the first conscious member's cash: its one pair passes when the member has less than $10 (game `$8E73-$8E83`), which shows message 76, "Sorry, you don't have enough money to play.", and puts the question back. Otherwise the pair fails, the square's effect takes $10 (record bytes +8/+9, game `apply_square_effect` `$9039`), and the square becomes check square 17 (`$3B9C`).
- Check square 17, "Round and round and round she goes. Where she'll stop, nobody knows." (message 77), tests the first conscious member against ten pairs in turn: Gamble 10, LK 9, Gamble 8, LK 7, Gamble 6, LK 5, Gamble 4, LK 3, Gamble 2 and LK 1. The first pair passed decides (flag bit 3, game `$8F4C-$8F56`): pair k makes the square action square 10 - k, so Gamble 10 gives action square 10 and LK 1 action square 1. When none passes, message 79, "The one-armed bandit strikes again! You lose.", and the question comes back.
- Action squares 1 to 10 (`$3CF5-$3D26`) hold the prizes 2, 4, 6 and so on up to 20 dollars at +3/+4 and run slot_machine_payout; their change makes the square loot bag 9.
- Game `loot_square` rolls a cash entry the first time its bag is opened: it marks the entry `$DE` and replaces each of the two bytes with a number from 1 to itself, a 0 staying 0 (game `$91B4-$91BF`, `$92E1-$92E9`; engine `random_1_to_a`, `$24C4-$24D5`). So a prize of n dollars pays from 1 to n, and the best, from 1 to 20 against the $10 stake. Each payout writes `$5E` again, so every prize is rolled afresh.
- Loot bag 9's change when empty, its bytes +0/+1 (`$3CB5`), is question square 0: the machine is back.
