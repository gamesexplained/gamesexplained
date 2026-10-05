# Map 41, Las Vegas, Spade's Casino — verified technical facts

Spade's Casino in Las Vegas: "This hallway is shabby and well used. It looks more like the entrance to a fort than the legendary Spade's Casino." (message 1). Las Vegas enters it with "Step inside Spade's Casino, high roller." (map 12's message 44, on its exit 26, to (2,30)). Exit 0 leads back with "High rollers are always welcome at Spade's casino. Please come again." (message 46, to Las Vegas at (11,38)), and exit 5 with "Ah fresh air! You can breathe again as you climb out through a one-way passage from under Spade's Casino." (message 51, to (13,35)). It is a map of 32 by 32 squares. It is stored on side 3 of the disks from track 9, logical sector 9, 34 pages: entry 41 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$55FF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 4 draws it (part tiles-4). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 4: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`).
- A step takes a quarter of a minute: `$3A34` holds 64, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 1 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 41 of the stream directory, T35/L13. The unpack runs on to `$E2C0`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 94 to 126 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 278 | | | |
| 1 message | 37 | `$3A5C` | 16, 3 null | 13 |
| 2 check | 72 | `$3A99` | 35 | 35 |
| 3 encounter | 31 | `$3DC6` | 38, 1 null | 37 |
| 4 tile | 10 | `$3FCE` | 8 | 8 |
| 5 loot bag | 0 | `$3FF6` | 47, 1 null | 46 |
| 6 action | 0 | `$41C0` | 12 | 12 |
| 8 question | 6 | `$4290` | 5 | 5 |
| 10 exit | 4 | `$42CE` | 11 | 11 |
| 11 blocking | 579 | `$4321` | 3 | 3 |
| 12 remote change | 7 | `$432D` | 23, 1 null | 22 |
| total | 1,024 | | | 192 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$41D8`); 1 the map's routine 0 (`$41DD`); 2 the map's routine 0 (`$41E2`); 3 the map's routine 0 (`$41E7`); 4 the map's routine 0 (`$41EC`); 5 the map's routine 0 (`$41F1`); 6 the map's routine 0 (`$41F6`); 7 the map's routine 0 (`$41FB`); 8 the map's routine 0 (`$4200`); 9 the map's routine 0 (`$4205`); 10 the map's routine 0 (`$420A`); 11 the map's routine 1 (`$420F`).
- The code list, header word 19, is at `$4213` (`run_action` reads it at game `$885C`): routine 0 `$4217`; routine 1 `$4271`.
- The text, header word 0, is at `$462B` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 33 group offsets at `$4667`, and messages 0 to 126 in groups of four, `$46A9-$5577`. Message 126 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 136 bytes after it, `$5578-$55FF`. Message 83, below it, is named by none of them either.
- 14 monster names at `$44F3` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$45B3`, monster *n* at `$45B3` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Drunk, 2 Lady, 3 Man, 4 Card Shark, 5 Rich Dandy, 6 Roving Guard, 7 Casino Thug, 8 Guard Leader, 9 Young Man, 10 Young Woman, 11 Casino Worker, 12 Barkeep, 13 Kutie and 14 Al.
- Characters who can join: none. Header word 20, `$3A28`, holds 0.
- Exits (class 10, list `$42CE`; `square_exit`, game `$89A3`): to Las Vegas, map 12 (exits 0 and 5, to (11,38) and (13,35), each asking first); 9 within the map (exits 1-4 and 6-10).

## Its own code

- `$4217` `refill_payout_bag`, routine 0, run by action records 0 to 10 (`$41D8-$420E`, five bytes each: `00 08`, the question square that follows, the template bag 30 + *k* and the bag *k* to fill). It takes the record's byte +3 into `$426F` `payout_template_bag` and +4 into `$4270` `payout_target_bag` (`$4217-$4222`) and keeps `$5F/$60` on the stack. It finds the template bag through `action_record` (engine `$0428`, Y = 5) and points `$14/$15` at it (`$422B-$4239`), finds the bag to fill the same way (`$423B-$4240`), and copies item and count bytes from +2 up to an `$FF`, which it copies too (`$4243-$425B`). A cash entry, `$5E` or `$DE`, has its two amount bytes copied and ends the copy, so the bag's own `$FF` after them is relied on (`$425D-$4265`). It puts `$5F/$60` back and returns with carry clear (`$4267-$426E`), so `run_action` does not redraw the view (game `$8872`). The record's change then makes the square the game's question square again, which asks at once (`square_action`, game `$8840`; `run_square_action`, game `$ACCE-$ACD1`). (run on the map's snapshot: with loot bag 0 emptied, `$4056` = 0 and `$4057` = 23, action record 0 wrote back `$5E` and 50; with bag 9 emptied, `$408C` = 0, action record 9 wrote back `$DE`)
- `$426F` `payout_template_bag` and `$4270` `payout_target_bag` are data bytes, written at `$421B` and `$4222` and read at `$422B` and `$423B`. Both are 0 as stored.
- `$4271` `set_gun_girl_flags`, routine 1, run by action record 11 (`$420F`: `01 0C 0D 01`). It keeps `$5F/$60` on the stack, takes the record's byte +3, finds encounter 34 (`$3F9E`) through `action_record` (engine `$0428`, A = 34, Y = 3) and writes the byte into its +9, the encounter's flags (`$4271-$4286`). It puts `$5F/$60` back and returns with carry clear (`$4288-$428F`). The record's change then makes the square remote-change square 13. (run on the map's snapshot: `$3FA7` went from 3 to 1)

### The games

- The slot machines are question squares 0 (`$429A`), at (7,20), (7,21) and (5,26), 1 (`$42A4`), at (7,19) and (1,23), and 2 (`$42AE`), at (11,24): "Would you like to play the slot machine at $10 per pull (Y/N)?" (message 37), one key. Y (message 38) gives check square 3, 6 or 8. N, another key or none writes nothing (`$FF`), and the question waits for the next step onto the machine.
- Those three checks, like check squares 11 and 14 below, have flags `$40`, which would refuse a step onto them, but `run_square_action` tests that only for the square the party arrives on and not for the changes that follow (game `$ACC1-$ACD1`), so each runs at once, and the first conscious member decides. A member with less than 10 in cash passes its one pair (`80 0A`) and reads "You don't have enough money to play." (message 10). Check squares 3 and 8 then put the question back with `$FD`, to wait for the next step (engine `$0A38-$0A3C`); check square 6 makes question square 1 again, which asks at once. A member with 10 or more fails, pays 10 (`95 8A`), and the machine's spin follows: check square 4, 7 or 9.
- A spin shows "Lights flash, bells ring and the bells, cherries and lemons go spinning around." (message 11) and tests the same member's LK at three difficulties in order, each pair with its own change to a payout bag (flags `$4A` and `$48`; game `$8F46-$8F59`). The first passed shows "A Winner!! Listen to the sound of coins in the tray." (message 12), and the bag opens at once. None passed: "Sorry, you lose. Try again. You are due to hit the jackpot anytime now." (message 13), and the machine's question asks again at once.

| Machine | Question square | Spin | LK pairs | Bags | Pays |
|---|---|---|---|---|---|
| 1 | 0 | check square 4 (`$3B41`) | 15, 10, 5 | 0, 1, 2 | 1 to 50, 1 to 25, 1 to 5 |
| 2 | 1 | check square 7 (`$3B74`) | 10, 7, 4 | 3, 4, 5 | 1 to 10, 1 to 7, 1 to 3 |
| 3 | 2 | check square 9 (`$3B98`) | 7, 5, 3 | 6, 7, 8 | 1 to 5 each |

- The payout bags hold an unopened cash entry, `$5E`, rolled from 1 to its amount when the bag is first opened and marked `$DE` (game `$91B8-$91BF`; `loot_roll_next_byte`, game `$92E1`): bags 0 to 8, `$4054-$4089`.
- Three card monty. The tables at (10,20) and (12,21) are check square 10 (`$3BAF`), which tests the party on arrival for exactly one member (`61 01`, flags `$C0`; game `$8E85-$8E8A`). A bigger party reads "Hey! Only one of you can play at a time, The rest watch!" (message 15). A party of one gets question square 3 (`$42B8`): "Would you like to play 3 card monty (Y/N)? Read paragraph 96." (message 40). Y gives check square 11 (`$3BBC`), which takes 10 as the slot machines do; with less, message 10 and check square 10 again, which asks the question again. Then check square 12 (`$3BC9`): "The cards are being shuffled." (message 67), and LK 10 or Gamble 8, either one passed, wins: "We have a winner. See folks, anyone can win." (message 69) and loot bag 9 (`$408A`), a cash entry marked opened, so a fixed 20 (`DE 14 00`; game `$91A9-$91AB`). A loss reads "Oops! Sorry you lose." (message 70) and gives check square 10, which asks again. N, another key or none gives remote-change square 5 (`$43AB`), which puts check square 10 back on both tables, so the game starts again at the next step onto one.
- High/Low. (4,22) is check square 13 (`$3BD8`), which tests for exactly one member on the move (flags `$40`): a bigger party reads "Sure you can play, but we only have room for one more." (message 71) and is refused (game `$8E07-$8E0E`), and a party of one steps on as the square becomes question square 4 (`$42C3`; game `$8DF2-$8E0C`): "Would you like to play High / Low (Y/N)? Read paragraph 139." (message 41). Y gives check square 14 (`$3BE5`), which takes 10, or with less gives message 10 and check square 13 again. Then check square 15 (`$3BF2`): LK 10 or Gamble 8 wins, "You won! Good betting on your part." (message 19) and loot bag 10 (`$4090`), a fixed 15 (`DE 0F 00`). A loss reads "You lose! Better luck next time." (message 20) and gives check square 13, which asks again. N, another key or none gives remote-change square 6 (`$43B7`), which puts check square 13 back on (4,22).
- Emptied, payout bag *k* becomes action square *k* (`$4054`: `06 00`, and so on to bag 10's `06 0A`), which runs `refill_payout_bag` with template bag 30 + *k* and then gives the game's question square, which asks again at once (game `$92D6-$92E0`). The templates, bags 30 to 40 (`$412E-$416F`), hold the same contents as bags 0 to 10 as stored. No square, change or code of the map names them except through these records' byte +3.

### The gun girl

- Encounter 34 (`$3F9E`) at (30,18) is Kutie (monster 13): "That Mac 17 looks awfully big in that cute girl's hand." (message 76). She starts peaceful (byte +9 `$03`; `encounter_is_peaceful`, game `$9EF6`), and wiped out she leaves loot bag 43 (`$4191`: a Mac 17 SMG, three 45 clips and a Knife).
- Message square 14 at (26,21), in the corridor that leads north into her room, shows ""Hey! Youse don't belong in here. Da game's down da hall."" (message 77) and becomes remote-change square 12 (`$43F2`). That makes (26,20), the next square on, action square 11, and (26,22), the square behind, remote-change square 10 (`$43E5`).
- A step on to (26,20) runs `set_gun_girl_flags` with 1: her flags lose bit 1, so she is no longer peaceful, and remote-change square 13 (`$43FE`) makes (26,20), (26,21), (26,22) and the party's square plain ground.
- A step back to (26,22) gives remote-change square 10 instead, which puts message square 0, which shows nothing, on (26,20) and the warning back on (26,21).
