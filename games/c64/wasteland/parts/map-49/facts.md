# Map 49, Savage Village — verified technical facts

The Junk Master's village ("Welcome to the Junk Master's village.", message 36): "You see a strange collection of buildings. All of them made of junk, and old car parts found in the desert. Few, if any, have doors. A big building in the North East corner looks a lot like a barn." (message 61). The world map enters it with "Entering Savage Village." (map 0's message 8, on its exit 26, to (15,30)), and exit 1 leaves with "Leaving the Savage Village." (message 60, to the world map at (13,59)). It is a map of 32 by 32 squares. It is stored on side 1 of the disks from track 10, logical sector 14, 25 pages: entry 49 of the map directory, T35/L14. `enter_map` (engine `$25BD`) loads it to `$3400-$4CFF` and unpacks its tile layer to `$DE00-$E1FF`. Tile set 1 draws it (part tiles-1). Every address here is this map's unless a part is named beside it.

## The map

- The map record is at `$3A00`, where `load_map_pages` (engine `$2603`) points `$61/$62`: 22 address words (`$3A00-$3A2B`), 11 setting bytes (`$3A2C-$3A36`) and 37 combat phrase numbers (`$3A37-$3A5B`).
- 32 by 32 squares: `$3A2C` holds 32, which `enter_map` reads at engine `$25D3` as both the height and the width.
- Tile set 1: `$3A30`, which `enter_map` reads at engine `$25EE`. Off the edge of the map it draws tile 58, `$3A33`, which `draw_square` reads at engine `$0B5E`.
- No random encounters: `$3A2F` holds 0, on which `random_encounter` returns at once (game `$B019`). `$3A31` holds 3 and `$3A32` 0; the routine reads them only past that test (game `$B040` and game `$B047`).
- A step takes half a minute: `$3A34` holds 128, in 256ths of a minute, and `$3A35` 0 whole minutes (`advance_clock`, game `$AF32`). `$3A36` adds 2 to `$D2` and to the count `$04-$06` (game `$AF58`).
- The tile layer, `$DE00-$E1FF`, is a byte a square (`map_tile_row`, engine `$0B06`), unpacked by `unpack_map_stream` (engine `$26E7`) from entry 49 of the stream directory, T35/L13. The unpack runs on to `$E298`; the layer is its first 1,024 bytes, the rows below the height that `map_tile_row` reads.
- The combat phrases, `$3A37-$3A5B`, name messages 74 to 106 of the map's text (`show_map_msg_at`, game `$BCE5`, and `show_map_msg_pair`, game `$BCE1`).
- Squares by class as the map is stored (class layer `$3400-$35FF`, a nibble a square, `map_class_at` at engine `$0953`; number layer `$3600-$39FF`, `map_number_row` at engine `$098E`), and the records of each class's list (header words 3-18, `$3A06-$3A25`; `action_record`, engine `$09B8`). A null word, 0, names no record:

| Class | Squares | List | Words | Records |
|---|---|---|---|---|
| 0 plain | 594 | | | |
| 1 message | 3 | `$3A5C` | 16, 1 null | 15 |
| 2 check | 30 | `$3AA4` | 11, 2 null | 9 |
| 3 encounter | 14 | `$3BDD` | 26, 3 null | 23 |
| 4 tile | 1 | `$3D25` | 8 | 8 |
| 5 loot bag | 3 | `$3D4D` | 21, 3 null | 18 |
| 6 action | 2 | `$3E03` | 6, 2 null | 4 |
| 8 question | 3 | `$3E74` | 4 | 4 |
| 10 exit | 34 | `$3EA5` | 3, 1 null | 2 |
| 11 blocking | 340 | `$3EB6` | 8 | 8 |
| 12 remote change | 0 | `$3ED6` | 17, 6 null | 11 |
| total | 1,024 | | | 102 |

- Action records (class 6; `square_action`, game `$8839`, and `run_action`, game `$8845`): 0 the map's routine 0 (`$3E0F`); 1 the map's routine 0 (`$3E13`); 2 the map's routine 0 (`$3E17`); 5 the map's routine 3 (`$3E1B`).
- The code list, header word 19, is at `$3E1F` (`run_action` reads it at game `$885C`): routine 0 `$3E27`; routine 1 null; routine 2 null; routine 3 `$3E57`.
- The text, header word 0, is at `$40AD` (`select_map_text`, engine `$1E4F`): an alphabet of 60 characters, a table of 28 group offsets at `$40E9`, and messages 0 to 106 in groups of four, `$4121-$4CED`. Message 106 is the last that a record, the map's code or a combat phrase names, and none of them names a message in the 18 bytes after it, `$4CEE-$4CFF`. Messages 16, 39, 49, 50 and 59, below it, are named by none of them either.
- 8 monster names at `$4003` (header word 1; `print_monster_name`, game `$9E5D`, reads it at game `$9E78`) and their eight-byte records at `$4065`, monster *n* at `$4065` + 8*n* (header word 2; `monster_record`, game `$9EA4`, reads it at game `$9EA7`): 1 Dog, 2 Pack Rat, 3 Desert Scav, 4 Reclaimer, 5 Woman, 6 Kid, 7 Junk Master and 8 Lizard.
- Characters who can join: none. Header word 20, `$3A28`, holds `$4003`, the address of the monster names, and no encounter record names an NPC (byte +9, high nibble).
- Exits (class 10, list `$3EA5`; `square_exit`, game `$89A3`): to the world map, map 0 (exit 1, to (13,59), asking first); 1 within the map (exit 2). No square, and no change the squares lead to, names exit 0.

## Its own code

- `$3E27` `village_turns_hostile`, routine 0, run by action records 0 (`$3E0F`: `00 00 00 01`), 1 (`$3E13`: `00 01 01 01`) and 2 (`$3E17`: `00 01 03 01`). It keeps `$5F/$60` on the stack, takes the record's byte +3 into `$3E56` `village_new_flags` (`$3E27-$3E31`), and for each encounter record from 9 down to 0, counted in `$3E55` `village_encounter_number`, finds the record through `action_record` (engine `$0428`, Y = 3) and writes that byte into its +9, the encounter's flags (`$3E34-$3E4B`). It puts `$5F/$60` back and returns with carry clear (`$3E4D-$3E54`), so `run_action` does not redraw the view (game `$8872`). All three records give 1: names shown, and neither peaceful (bit 1, `encounter_is_peaceful`, game `$9EF6`) nor stationary (bit 2, game `$8428`), so the whole village attacks. (run on the map's snapshot: the flags of encounters 0 and 1, `$3C1A` and `$3C26`, went from 7 to 1, and those of encounters 2 to 9, `$3C32` to `$3C86`, from 3 to 1)
- `$3E55` `village_encounter_number` is written at `$3E36`, reread at `$3E45` and lowered by one until it goes below 0 (`$3E48-$3E4B`). `$3E56` `village_new_flags` is written at `$3E31` and read at `$3E40`. Both are 0 as stored.
- The code list at `$3E1F` holds 0 for routines 1 and 2 (`$3E21-$3E24`: `00 00 00 00`); the map's four action records name routines 0 and 3 only.
- `$3E57` `poison_needle_disease`, routine 3, run by action record 5 (`$3E1B`: `03 05 10 04`). It loads `$BD` and makes that party position the current member (`select_member`, engine `$0335`; `$3E57-$3E59`), ORs the mask for disease *n*, *n* the record's byte +3, into the member's +$28 through the masks at `$3E6C` (`$3E5C-$3E68`), and returns with carry clear (`$3E6A-$3E6B`). `$BD` holds the member whose Use has just failed: `use_on_square` puts the member, `$12`, into the operand at game `$8CCB` (game `$8BF8-$8BFA`), and `use_failed` stores it in `$BD` (game `$8CCA-$8CCC`) before the square's failure change brings the party here. In the code traced in every part, that `STA` is the only write to `$BD` and this `LDA` the only read. With +3 = 4 the disease is bit 4, Desert dust (module-0 `$CC04`: bit *n* is its message *n*+1). The record's change then makes the square loot bag 16, which opens at once. (run on the map's snapshot: with `$BD` set to 1, 2, 3 and 4 in turn, bit 4 was set in +$28 of records 1 to 4, engine `$F528`, engine `$F628`, engine `$F728` and engine `$F828`)
- `$3E6C` `needle_disease_masks`: `$01`, `$02`, `$04` up to `$80` (`$3E6C-$3E73`), read at `$3E61` with X = the record's byte +3.

### The village

- Encounters 0 to 9 (`$3C11-$3C88`) are the villagers. Encounters 0 and 1 start peaceful and stationary (byte +9 `$07`), 2 to 9 peaceful (`$03`), and each, wiped out, leaves loot bag 0 to 9.
- Action square 1 stands at (5,5), the armory, and action square 2 at (1,11), the ammo hut. A step onto either runs `village_turns_hostile` and leaves message square 1 ("A village armory. Weapons are kept here.", message 11) or 3 ("This is the ammo storage hut.", message 13).
- Action square 0 runs it too and leaves plain ground. Loot bags 0 to 9, 17, 18 and 20 become it when they are emptied, so taking a villager's loot turns the village hostile. Remote-change squares 4, 5, 8, 9 and 13 put it down as well: on the party's square when the party answers N to "Will you drop your weapons (Y/N)?" (message 35; remote-change square 4, `$3F2F`), on (15,27) and (16,27), just inside the main gates, when the gates are blown, burned or pushed down (remote-change squares 5, 8 and 9, `$3F5A`, `$3F8B`, `$3FAB`), and on (17,6), inside the Junk Master's hut, when its door at (18,6), check square 10 (`$3BC0`), is forced open with an explosive, ST 5, a Sledge hammer or a Proton ax (remote-change square 13, `$3FDF`: "Now you've made a really big mistake!", message 63).
- No record, code or combat phrase of the map names message 50, "The whole village has been alerted. You are in trouble now!" (the count above).

### The chest

- The chest at (3,12) is check square 5 (`$3B27`). Stepping onto it shows "This chest is locked. The message painted on the top says "Warning! Death to all thieves!"" (message 45) and runs no check (flags `$89`). Its fourteen pairs each have their own change (`$3B4E-$3B69`):
  - Perception 3 Used on it gives message square 5 (`$3A88`): "You see that the chest is ambushed with poison needles." (message 22), whose `$FD` puts the chest back (engine `$0A38-$0A3C`).
  - Picklock 5, Bomb disarm 2, ST 5, a Crowbar, a Pick ax or a Sledge hammer gives message square 13 (`$3A9E`): "You safely opened the chest." (message 38), then loot bag 16 (`$3DE3`: a Mac 17 SMG and 1 to 100 in cash).
  - A Plastic explosive, Grenade, TNT, LAW rocket, Mangler, Sabot rocket or RPG-7 makes it tile square 0 (`$3D35`, tile 54), which shows no message, and the bag is never reached. Message 39, "The chest exploded in your face. What ever was inside is history now.", is named by no record, code or combat phrase of the map (the count above).
- Any other Use, or a pair failed, shows "You feel a sudden stab of pain. You've been hit by a poisoned needle." (message 46; `use_failed`, game `$8CDC`) and takes 2d6 of CON from the member who made the Use (`1D 82`), armour not counted (flags bit 0; game `$90AF-$90B4`). The chest becomes action square 5 (`$3B2D-$3B2E`: `06 05`), which then runs (game `$8CFA-$8D02`, game `$8CBA-$8CC3`): `poison_needle_disease` gives that member Desert dust, and the square becomes loot bag 16, which opens at once, so the needle does not keep the party from the contents.
- Desert dust, bit 4 of +$28, stops the member's natural healing (game `$B7A2-$B7A8`) and costs a conscious member 1 CON, and one who is not conscious 2, each time `health_tick` runs while the step count, `$D2`, is a multiple of 64 (game `$B816-$B83F`). A step runs `health_tick` when it leaves `$D2` at a multiple of 16 (game `$AF75-$AF7B`), and every battle round runs it as well (game `$B396`).

### The Junk Master

- The square before the Junk Master's door, (19,6), is question square 2 (`$3E92`): ""Who's there?"" (message 34), answered by typing. REDHAWK or RED HAWK (messages 23 and 47) gives remote-change square 10 (`$3FCB`): ""Come in! We like visitors."" (message 65), which makes the hut's door at (18,6), check square 10 as stored, tile square 1 (`$3D38`, tile 58, not blocking) and (15,4), inside, check square 2. Any other word gives question square 3 (`$3E9D`): "Did you bring a gift for the Junk Master (Y/N)?" (message 66). Y gives remote-change square 10 as well; anything else gives remote-change square 11 (`$3FD8`): ""Go away and leave me alone!"" (message 64), which puts question square 2 back on (19,6).
- Check square 2 (`$3B14`) shows ""Let me see your gift while you tell me about the adventures you have had."" (message 42) on arrival and tests every conscious member, in party order, against two pairs, each with its own change (flags `$6C`): skill 48 at difficulty 0 (`00 30`), then a Grazer bat fetish carried (item 69, `20 45`). The first pass decides. Of the 14 NPC records of the 42 maps and the records of the four Rangers of the starting party, only Redhawk's holds skill 48, at level `$FF` in his last skill pair (NPC 1 of map 36, map-36 `$3F98`; `skill_level`, engine `$1392`).
- Skill 48 gives message square 7 (`$3A8D`): "Red Hawk says, "Father, I have returned. The Rangers helped me escape. We must guide them to the home of the Deadly Robots."" (message 40) and "Read paragraph 30." (message 41). The fetish gives message square 8 (`$3A91`): "The Junk Master accepts your Grazer bat fetish as a gift." (message 43) and message 41, and the member loses a charge of it (game `$8E65-$8E70`), the only one a fetish taken from a loot bag has (game `$3334`). Both message squares then leave plain ground. With neither: "For some reason the Junk Master won't listen to you." (message 44), and the square waits for the next step.
