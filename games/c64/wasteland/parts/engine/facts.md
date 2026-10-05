# Engine — verified technical facts

The resident engine, the code every program of the game calls. It holds two tables of jumps, the routines and the engine's own text at `$0200-$30FF`, the sector buffer and a page of tables at `$5A00-$5BFF`, and the font with the track and key tables and the sound player at `$C600-$C9FF`. Under the I/O area it has the map window's scroll copy, `$DD80-$DDFF`. `$EE00-$FBFF` is work space and the game state, of which it saves `$F400-$FBFF`, and `$FC00-$FFFF` is the fast loader with the hardware vectors. It stays in memory from the boot onward, and every program is loaded beside it. What spans the parts (the memory layout, the loader's disk format, the save, the text format, the screen and the controls) is in the game's `facts.md`. This file holds what is true inside the engine. Addresses are the engine's own unless a part is named.

## Load and layout

- `$0200-$30FF` is side 1's T34/L10 and the 46 sectors that follow it as the loader steps, 47 pages, byte for byte at the hand-over (`entry.vsf`).
- The boot file `2.0` carries the page at `$5B00` at its own `$C17B`, and the scroll copy at `$DD80` at its own `$C27A`, byte for byte.
- The font is `$C600-$C92F`: 102 glyphs for codes `$20-$85`, eight bytes each. A code *c* is drawn from `$C600` + 8 × ((*c* − `$20`) AND `$7F`) (draw_char_advance `$1F86`, draw_glyph `$2217`), so a key code with bit 7 set draws the same glyph as the code without it. After the font come the track table `$C930`, the key table `$C953-$C992`, play_sound `$C993-$C9BB` and its sound table `$C9BC-$C9DC`. The 35 bytes `$C9DD-$C9FF` are read only by play_sound's indexed loads with an X above 22, which no caller passes.
- unpack_stream (`$0524-$053A`) reads the unpacker from T35/L16 over `$C800-$C8FF`, calls it at `$C800` and reads T35/L11 back over it. That page holds glyphs `$60-$7F`, the font's third page; glyphs `$80-$85` at `$C900` stay in place.
- The unpacker is the same 256 bytes on all four sides. It compares its output page with the limit's high byte `$CD` (at `$C834`), uses `$CE` and `$E1-$E5`, and never reads `$CC`.

## Jump tables

- Table 1 is `$0202-$044E`: 181 three-byte `JMP`s from `$0204`, and 46 bytes between them that are not entries.
  - 30 are the game's variables, which only the game reads or writes: `$0215`, `$0216`, `$021D`, `$021E`, `$0225`, `$0226`, `$022D`, `$022E`, `$0235`, `$0236`, `$0245`, `$0246`, `$024A`, `$024B`, `$0252`, `$0253`, `$025A`, `$025B`, `$0262`, `$0263`, `$026A`, `$026B`, `$0272`, `$0273`, `$027A`, `$027B`, `$0282`, `$0283`, `$028A` and `$02AA`.
  - Four are the engine's: picture_ticks_left `$028B`, newline_wait_count `$0292`, scroll_step_count `$0293` and write_page_count `$029B`.
  - Twelve are not used: `$0202-$0203`, `$020D-$020E`, `$023D-$023E`, `$029A`, `$02A2-$02A3` and `$0446-$0448`. The only instruction in any part's code that names `$02A2` is the `BIT $02A2` at `$1874`, which hides an `LDX #$02`.
- `$0200-$0201` holds `$29E4`, the address of the engine's text block.
- Table 2 is `$04CF-$0504`: 18 `JMP`s with no gaps. `$04F6` and `$04F9` are the NMI and IRQ entries that the RAM vectors at `$FFFA` and `$FFFE` name; no `JSR` or `JMP` in any part goes to them.
- Two pairs of entries lead to one routine: `$02CC` and `$02D5` to check_side_1 `$1895`, and `$0332` and `$033B` to view_character `$0DFC`.
- Sixteen entries of table 1 are the target of no `JSR` or `JMP` in the code of any part: `$0257`, `$026C`, `$0277`, `$027C`, `$0294`, `$02C0`, `$02CC`, `$02D2`, `$0332`, `$0368`, `$0395`, `$03B3`, `$03D7`, `$0431`, `$0443` and `$0449`. A byte scan of every part finds `20 CC 02` once, inside map 26's text block (map-26 `$53EE`). All their routines but do_nothing `$2421` (entry `$0257`) are used inside the engine, called or fallen into.

## Dice and checks

- roll_d6 `$24D6` takes random_byte AND 7, throws again on 6 or 7, and adds 1.
- The dice are not even. random_byte (`$24E3`) makes each byte from the last one and the raster line and timer, which move a fixed number of cycles between two calls, so a draw that roll_d6 takes again at once (`$24DD`) follows from the one it threw away: after a draw of 7 the die comes out 2 or 3 39.6% of the time, and after a 6 it comes out 1 18.2% of the time and is thrown again 18.2%.
  - The engine's own code run on the kit's 6502 simulator from 2,000,000 random moments (raster line, cycle, timer value and seed each random): roll_d6 gave 1 to 6 17.63%, 17.77%, 17.37%, 15.88%, 15.63% and 15.72% of the time; the first pair of roll_2d6_open (`$0845`) was a double 20.39% of the time and under 5 13.07% (fair dice: 16.67% and 11.11%).
  - In play, 5,000 dice from the Ranger Center's attribute rolls came out 1,043 ones and 869, 786, 727, 749 and 826 of 2 to 6, where even dice give 833 each (*live*, the game's `facts.md`).
- random_1_to_a `$24C4` takes random bytes until one is below A, then adds 1: 1 to A. With A = 0 it returns 0.
- roll_2d6_open `$0845` adds two d6. While the two dice are equal it throws two more and adds them. The total is eight bits; X returns 0.
  - A total below 5 comes only from a first throw of 1 and 2 or 1 and 3, in either order: with even dice 4 of 36, exactly 1/9.
  - With even dice the mean is 8.4. No throw totals 2, a total of 12 comes about once in a hundred, and totals above 12 come 11.4% of the time (the distribution worked out from the rule).
- target_15_plus_5x `$0867` gives 15 + 5X in A (low) and X (high).
- skill_check `$0C29` takes A = skill and X = difficulty and works to the target 15 + 5X.
  - Its roll, skill_roll_total `$0C6A`, is the open 2d6, plus the attribute that skill_attribute_table `$0DD8` names for the skill, plus 4 × the skill's level (skill_level `$1392`, times_four `$087D`).
  - Dice below 5 fail at once (`$0C73-$0C75`). Otherwise the dice alone, not the roll, are added to experience, pass or fail (`$0C41-$0C49`), and a roll at or above the target passes and goes on to skill_improve_roll (`$0C4C-$0C57`).
- The attribute of each skill (skill_attribute_table `$0DD8`, a record offset per skill; entry 0 is 0):

| Attribute | Skills |
|---|---|
| ST (`+$0E`) | 5 Pugilism, 7 Swim |
| IQ (`+$0F`) | 9, 20, 22, 24, 25, 27, 28, 30, 31, 32, 33, 35 |
| LK (`+$10`) | 1 Brawling, 14 Gamble |
| SP (`+$11`) | 17 Combat shooting |
| AGL (`+$12`) | 2 Climb, 13 Acrobat, 16 Silent move |
| DEX (`+$13`) | 3, 4, 6, 8, 10, 11, 12, 15, 19, 21, 26, 29, 34 |
| CHR (`+$14`) | 18 Confidence, 23 Bureaucracy |

- skill_improve_roll `$0CA2` acts only when the skill's level is at least 1, below the rank (`+$24`) and below the difficulty X (`$0CA8-$0CB8`). Then a d10 of at most (X − level) / 2 + 1, halved down, raises the level by one (`$0CBA-$0CE9`).
  - It prints messages 158 and 159 around the skill's name and the new level: "<name> raised his/her <skill> skill to level *n*." (`$0CD8-$0D00`).
  - The text window is opened for it, and the "(RETURN)" prompt follows only when the window was not open before (`$0CD2-$0D06`).
- attribute_check `$0D0A` takes A = value and Y = a record offset.
  - Y = `$18`, the sex, passes when the byte equals A.
  - Y = `$24`, the rank, passes when the rank is at least A.
  - Any other byte is rolled: the open 2d6 + the byte against 15 + 5A. Dice below 5 fail, and the dice are added to experience before the comparison (`$0D18-$0D4B`).
- npc_obey_check `$0D61` takes A = the asker's value and Y = an offset in the selected character, its refusal byte.
  - A refusal byte of `$FF` always refuses.
  - Otherwise the target is 15 + 5 × the byte, and the roll is A + the open 2d6.
  - Dice below 5 refuse and raise the byte by one (char_byte_increment `$0DB4`, which leaves exactly 10 alone). A roll below the target refuses and leaves the byte.
  - A pass lowers the byte by one with a chance of 1 in 20 (char_byte_decrement `$0DAA`, never below 0).
- weapon_skill_bonus `$0DC0` is 4 × the level of the skill named by the weapon's item record byte 5. With no weapon it uses item 0, Fists, whose byte 5 names skill 5, Pugilism (`$0DC3`).
- unjam_weapon `$14FD` gives no experience: it rolls without add_experience (`$1520-$1539`).

## Characters

- Record *n* is at `$F400` + 256*n*. select_character `$1201` points `$66/$67` at it and copies its sex byte to `$BB`; select_member `$11F7` does the same for party position A of the current party.
- The bytes the engine reads and writes:

| Offset | What | Where |
|---|---|---|
| `+$00` | the name, ended by 0 | print_name `$173A` |
| `+$0E-$14` | ST, IQ, LK, SP, AGL, DEX, CHR | print_attributes `$10EE` |
| `+$15-$17` | cash, 24 bits | cash_add `$1366` |
| `+$18` | sex: 0 male, 1 female | `$120A`, `$0FD5` |
| `+$19` | nationality, 0-4 | `$0FE4` |
| `+$1A` | armour class | equip_toggle `$10C9` |
| `+$1B-$1C` | MAXCON | con_is_full `$1493` |
| `+$1D-$1E` | CON, signed | con_subtract `$088E` |
| `+$1F` | weapon slot, 0 for none | `$1276` |
| `+$20` | skill points | `$1113` |
| `+$21-$23` | experience, 24 bits | add_experience `$0825` |
| `+$24` | rank | `$0CAD` |
| `+$25` | armour slot, 0 for none | `$1273` |
| `+$28` | the disease bits, 0 for none (module-0's facts); any set prints MAXCON in reverse | `$16AC` |
| `+$29` | not 0 for a non-player character | `$0F63` |
| `+$2E` | refusal byte for trading | `$0F7F` |
| `+$32` | the rank's name | `$111B` |
| `+$80-$BB` | 30 skill pairs: skill, level | skill_pair_offset `$14F3` (2A + `$7E`) |
| `+$BD-$F8` | 30 item pairs: item, count byte | item_slot_offset `$14F8` (2A + `$BB`) |

- print_character_sheet `$0FC5` opens the text window and prints messages 137 (the name), the attributes, 138 with 162 + sex (Male, Female) and 139 with 145 + nationality (U.S., Russian, Mexican, Indian, Chinese).
- print_attributes `$10EE` takes no argument: its first instruction is `JSR flush_line`. It prints ST to CHR, SKP (`+$20`) and the rank's name from the labels at `$1152`.
- add_experience `$0825` adds `$1C-$1E` and holds at `$FFFFFF`; cash_add `$1366` does the same for cash.
- is_conscious `$17E9`: carry clear only for CON above 0.
- con_heal_one `$08A5` adds 1 to CON and returns carry clear when CON then equals MAXCON (con_is_full `$1493`), set otherwise.
- condition_index `$1475` names the state of a CON of 0 or less, for the roster's CON column (roster_con_field `$16CD`, words at `$16FA`).
  - CON 0 prints message 132, a space and glyph `$7F`.
  - A negative CON is judged by its low byte alone against condition_thresholds `$148E`: −1 to −10 UNC, −11 to −19 SER, −20 to −29 CRT, −30 to −39 MRT, −40 to −256 COM (messages 133, 154-157). A CON below −256 is judged by its low byte, as if it were 256 higher.
- count_conscious `$08B4` counts the conscious members from position `$07` down to 1. With `$07` = 0 it makes 256 passes, position 0 and then 255 down to 1, reading far past the party's 14-byte table.

## Items

- An item's record is eight bytes at `$3108` + 8*n* (item_record `$0BCD`). Its name is message 36 + *n* (print_item_name `$0BDC`), from 36 Fists to 130 Cash, item 94.
  - item_class `$144A` is byte 3 shifted right three times.
  - item_effect `$1454` is byte 3 AND 7, through the word table at `$1469`: 0 is an `RTS` (`$1474`), 1 is screen_shake `$0746`. The table holds only those two words; 2-7 would take the code bytes from `$146D` on as addresses.
  - class_is_ranged `$08D0` (the list `$08E8`) counts classes 2-13 as ranged. equip_toggle `$10A2` treats class 15 as armour.
- The four item files (T35/L15: entries 0 and 1 on side 1 at T26/L5 and T26/L2, entry 2 on side 2 at T33/L16, entry 4 on side 4 at T33/L16; entry 3 is empty) have the same eight-byte header, `60 60 60 00 37 08 F8 39`.
  - Items 0-93 have effect 0 or 1 in all four. Effect 1 is on items 6-12: Grenade, Plastic explosive, TNT, Mangler, Sabot rocket, LAW rocket and RPG-7.
  - Record 94, Cash, is the file's last eight bytes, and differs from file to file: its effect bits read 3 in files 0-2 and 0 in file 4.
  - The files differ only in byte 2 of some records and in record 94.
- An item pair's count byte holds rounds or charges in bits 0-5; bit 7 marks a jammed weapon. The game jams one by writing `$80` (game `$A5B5-$A5BB`).
- use_item_charge `$14A5` takes Y = an item pair. A count of 0 is not counted down. The last charge unequips the slot and clears the pair (`$14C9-$14D7`). Either way the item's effect runs (item_effect_of `$1451`).
- reload_weapon `$1281` refuses a jammed weapon with message 152, "Your weapon is jammed." Otherwise it clears the clip's pair and sets the count to (count AND `$C0`) OR the weapon's record byte 4, so rounds left in the weapon are lost (`$128F-$12A4`).
- unjam_weapon `$14FD` takes Y = the weapon's pair.
  - The target is 15 + 5 × the failed tries before it (count bits 0-5), against the open 2d6 + IQ (`+$0F`) + weapon_skill_bonus. Dice below 5 fail.
  - Success prints message 160 and writes 0 to the count byte: unjammed and empty (`$153E-$1548`).
  - Failure prints message 161 and adds 1 to the count byte up to `$85` (`$154F-$155F`).
- item_action_menu `$0EA6` offers what fits the slot.
  - When the slot holds the item named by the weapon's record byte 7, its clip, it asks "Reload (Y/N)?" (message 141). Y reloads; N or left-arrow goes on to the next offer; other keys are ignored (`$0EC2-$0ECD`).
  - When the slot's count byte has bit 7 set, it asks "Unjam (Y/N)?" with the Y drawn as glyph `$7C` (message 134). get_key_not_n `$1562` sets carry only for N and left-arrow, so any other key tries to unjam (`$0EDD-$0EE8`).
    - Otherwise, or after N or left-arrow at either question, it offers D)rop, T)rade and unE)quip (message 142); left-arrow at that menu leaves (`$0EF6`).
- item_drop `$0F04` clears the pair, then unequips the slot.
- equip_toggle `$10A2` unequips a slot that is the weapon or the armour. A class 15 item becomes the armour (`+$25`) and sets the armour class `+$1A` to its record byte 6; any other item becomes the weapon (`+$1F`).
- unequip_slot `$10D8` clears `+$1F`, or `+$25` and `+$1A`.
- weapon_record `$1268` gives item 0's record, Fists, when no weapon is equipped (`$126B-$1270`). Item 0's byte 7, its clip, is 0, so with no weapon no slot is offered Reload (`$0EB5-$0EBB`), and the game's L)oad finds no clip (game `$A39C-$A39F`).
- item_trade `$0F1F`:
  - With one member it prints message 143, "No one to trade with." With two, the other member takes the item: position EOR 3 (`$0F2F-$0F32`). With more, message 144, "Who wants it?", and pick_member, asked again while it names the giver; left-arrow leaves (`$0F44-$0F4E`).
  - A giver with `+$29` set who is conscious must pass npc_obey_check with the taker's CHR against its own `+$2E`, or the trade stops with message 135, "<name> doesn't want to trade." (`$0F63-$0F85`).
  - A taker with no free slot gets message 150, "<name> can't carry any more." Otherwise the pair goes to the taker's first free slot and item_drop clears it from the giver (`$0F88-$0FA8`).
- count_items `$1211` counts the occupied item pairs, and count_items_of_classes `$1214` those whose class is in the list at `$9D`. Both return X = the count and `$D1` = the last such slot.
- find_free_slot `$124A` and find_item `$124C` return Y = the pair, or Y = `$FF` with carry set when there is none.
- The item list (item_list_show `$1060`) offers slots 1-30 (`$4D` = `$1F`). print_item_row `$11C6` shows the equipped weapon and armour in reverse.
- Item reorder, R on the item list (item_reorder `$1005`):
  - It clears `$5A00-$5A3B` and moves each picked pair to the next place in it (move_pair_to_buffer `$143B`, which zeroes the source). There is no way out until every item is picked (`$1015-$1021`).
  - When the list is empty it writes the operands at `$1026` and `$102C` to `+$1F` and `+$25` and copies the 60 bytes back to `+$BD-$F8` (`$1023-$103A`).
  - Those operands get the new slot only when the picked slot is the weapon or the armour (`$103E-$104F`). They take the count kept at `$103F`, which goes up on every pass, including the passes on which RETURN, space, R or left-arrow came back instead of a pick (`$1015`, `$101F-$1021`).
- Skill reorder, R on the skills page (skill_reorder `$13B7`), copies the 30 skill pairs to `$5A00-$5A3B` first and writes the picks over that copy from its start (`$13B7-$13C2`, `$13E2-$13F0`). A place the picks do not reach keeps the copied pair. Left-arrow does not leave: only the empty list does (`$13CB-$13D1`).
- The skills page (skill_list_show `$13F5`) scans 31 pairs, `+$80-$BD`, and lists a pair whose skill byte is from 1 to `$23`.

## Parties and the roster

- party_table_ptr `$1768` points `$68/$69` at `$F400` + 0, 14, 28 or 42 for parties 0-3 (`$1778`).
- party_size `$1759` counts the positions from 1 that hold a record, up to the first empty one: A = the count and Y = the first free position, 8 for a full party.
- party_add `$174C` stores the record at Y and increments `$07`, with no check for room. A full party gets the record in its table's byte 8, and `$07` becomes 8.
- pick_member `$177C` takes the keys 1 to the party size `$07`; left-arrow gives 0.
- find_party_of `$1795` searches tables 0-3 in turn for a record, and returns 3 both for party 3 and for a record in no party.
- remove_member `$17F8` takes a position R in the current party.
  - It copies records above R's record down one (copy_character `$171B` copies record A over record X, and does nothing when X = 0), closes up positions R+1 to 7, and decrements `$07` and `$0A`.
  - In every table from `$0B` down to 0 it lowers by one each entry at or above the removed record (`$1835-$1854`), and leaves `$68/$69` on table 0.
- pool_cash `$157E` moves every other member's cash to member A, adding with saturation at `$FFFFFF`.
- D in view_character (view_divide_cash `$0E2A`) divides the viewed member's own cash, not the party's, by the party size. Every member gets the quotient and the viewed member also gets the remainder (divide_24_by_8 `$06E8`).
- roster_show `$17CA` sets `$6A` and draws the roster. The header, message 136, is on row 15 (`$15FC-$1605`), and position *n* is on row 15 + *n* (roster_line_cursor `$1857`).
  - The columns are AC at 18, AMM at 22, MAX at 25, CON at 29 and the weapon at 33 (roster_line_fields `$1664-$16F7`).
  - The widths are 2 for AC and AMM and 3 for MAX and CON (`$167C`, `$16B9`; print_bcd_field `$1CB1` prints the last digits only), so a MAX or CON of 1,000 or more shows only its last three digits.
  - AMM is the weapon's count bits 0-5 when its class is ranged and it is not jammed, otherwise 0 (`$1685-$16A9`).
  - The weapon's name is in reverse when it is jammed (print_weapon_name `$1700`).

## Maps and the view

- map_class_at `$0953` takes X = column and Y = row; an even column is the high nibble.
  - It works the row's address out only when the row differs from the one in `$63`, by shifting: the row times half the width's lowest set bit, which is half the width for a power of two from 4 up, the maps' 32 and 64.
  - A width with bit 0 or 1 set keeps the previous row's address (`$0962-$0968`).
- map_number_row `$098E` starts the number layer at height × width / 2. set_class_at `$0A57` stores the class nibble without masking the value.
- alter_square `$0A00` takes A = an offset in the record at `($5F)`; the class byte and number byte there replace the square at X, Y.
  - Every call copies the square at X, Y to `$AD/$AE` before it writes.
  - A class byte of `$FE` writes the square held in `$AD/$AE` instead, so the map's square and the one held trade places (`$0A28-$0A30`); `$FD` does the same and returns carry clear.
  - Any other class byte with bit 7 set writes nothing and returns carry clear. Carry is set when a square was written (`$0A06-$0A56`).
- distance_to_party `$08F5` returns, for the square at X, Y, the entry of distance_table `$0921` at 10 × |dy| + |dx|, with no bound on the index.
  - Of the table's 50 entries, 45 are ten times the straight-line distance, rounded.
  - The other five are 2 for the party's own square; 31 for |dy| 1, |dx| 3 and for |dy| 3, |dx| 1 (31.6); 44 for |dy| 2, |dx| 4 (44.7, where |dy| 4, |dx| 2 gives 45); and 92 for |dy| 1, |dx| 9 (90.6).
- draw_square `$0B53` draws the square at X, Y.
  - Off the map it draws the tile in the header's `+$33`.
  - Class 5 draws tile 5, and class 4 draws the record's byte 1 AND `$7F`.
  - Class 9 lowers `$9F` to its distance from the party when that is smaller (`$0B74-$0B7E`), and draws tile 8 when the hour `$0E` is below 6 or 18 and above, its ground otherwise (`$0B80-$0B8A`; *live*, the game's facts, "The maps").
  - Every other square draws its byte of the tile layer, read with all RAM in (`$0B9D-$0BAB`).
- square_to_screen `$0B2B` gives column 2 × (X − `$02`) and pixel line 16 × (Y − `$03`).
- draw_tile_cells `$22EA` draws the 2 × 2 cells of tile *n* from `$D000` + 32*n*, with its colours from `$DC00` + 4*n*. It draws only cells in columns 1-36 and lines 8-135.
- draw_geiger_gauge `$0AA1` fills columns 38-39 from row 17 up to row 0, two glyphs a row.
  - Its lowest 18 − `$9F`/8 rows are glyphs `$80` and `$82` in colour `$62`, and the rest glyphs `$7E` and `$5B` in the text colour `$EB`. A `$9F` of 144 or more gives no rows of the first kind (`$0AB5-$0AC8`).
  - The two pairs are the same shape: `$80`/`$82` are in `%10` pixels, the colour byte's low nibble; `$7E`/`$5B` have `%01` edges round a `%11` core.
- enter_map `$25BD` does nothing for the map already in memory (`$91`). Otherwise:
  - It saves the map in memory (save_map `$2856`) and loads the new one's pages (load_map_pages `$2603`).
  - It sets the view to 19 columns (`$54`), height and width (`$55`, `$56`) to the header's `+$2C`, and the party's place in the window to column 9, row 4 (`$59`, `$5A`). It clears `$D2`, unpacks the map's stream to `$DE00`, and marks the class row cache empty.
  - It unpacks the header's tile set (`+$30`) when it differs from the one loaded, kept in the operand at `$25F1`, and ends with `JMP save_game`.
- load_map_pages `$2603` reads T35/L8. The header is at `$4C00` when that sector's byte for the map is `$40`, and at `$3A00` otherwise. A map number of `$80` or more is replaced by that sector's byte at that index (`$261C-$2624`); for such a number the header is at `$3A00`.

## Loads and saves

- load_portrait `$2631` does nothing when picture A AND `$7F` is already in memory (`$0505`); otherwise it unpacks the picture from the stream directory T35/L10 and returns carry set.
  - A picture with bit 7 set goes to `$E000`, limit `$F000`.
  - Without bit 7 it goes to `$CA00`, limit `$D000`, and marks the module cache `$26BC` empty.
  - It keeps `$AC` at 0 during the unpack, so the animation does not run (`$2666-$2675`).
- load_module `$2691` unpacks module A from T34/L16 to `$CA00`, limit `$D000`, and marks the picture cache `$0505` empty. It skips the load when A equals `$26BC`, but the only store to `$26BC` in any part is the `$FF` at `$2644`, so a module is unpacked on every call.
- unpack_map_stream `$26E7` unpacks the map's stream (T35/L13) to `$DE00`, limit `$EE00`, with all RAM in.
  - It marks the picture cache empty only when `$BA` is `$DE`. The stores to `$BA` found are engine `$2680` (`$CA` or `$E0`), module-4 `$CCB3` (`$34`) and startup `$7FE2` (`$8A`).
  - A map number of `$80` or more is looked up in T35/L8 as in load_map_pages (`$26F2-$26FE`).
- unpack_tile_set `$2722` unpacks tile set `$09` (T35/L12) to `$D000`, limit `$DE00`, with all RAM in. It pushes the 128 bytes of `$DD80` on the stack first and pulls them back after (`$2725-$274C`), since the limit would let the set run over them.
- unpack_entry `$2759` finds a stream's first sector by stepping a count of logical sectors from the base in `$5AFE/$5AFF` (next_logical_sector `$FD0B`). Then it calls unpack_stream with the start byte and the destination.
- read_dir_entry `$2790`:
  - Entries 64 and up are read from the logical sector after the directory's.
  - It calls the side check with the entry's side byte until it passes, then reads the directory sector again, since the check uses the same buffer (`$27C1-$27C8`).
- load_item_table `$26BD` loads item file `$75` to `$3100` when it is not the one in `$76`. save_item_table `$26D6` writes back file `$76`.
- disk_io `$27E8` keeps `$FD-$FF` for its retries (`$27F1-$27FD`). It prints "Write protected" for loader status `$2B` and "I/O ERROR" for any other, at column 0, row 23, then message 167, waits, redraws the menu bar and tries again.
- read_pages `$284A` reads a run of pages in one loader call. write_pages `$2866` writes one sector per loader call, stepping the logical sector and the page itself.
- load_program `$2890`:
  - It points the menu texts at `$28BD`, a bar with no items (`$03 $00`).
  - It reads the file's first sector to `$5A00`, loads the whole file to the address in its bytes 3-4 for the pages in its byte 5, and jumps through `$5A03`, to the file's first byte.
- check_disk_side `$1897` redraws the menu bar after its prompt.
- save_game `$18EA` is as the game's facts say. It writes pages 0 to 7 in that order and leaves `$66/$67` on `$FB00`, record 7 (`$1901-$1913`).
- read_save_page `$1872` and write_save_page `$1874` read or write record page A, T35 logical sector 7 − A, through disk_io.

## Pictures

- show_picture `$055F` stores the picture number in `$AB`, loads it (load_portrait), sets `$AC` to 1, draws the picture window and its caption, and starts the picture.
  - The window is picture_window_open `$12CF`.
  - The caption is the string at `$F4D0`, at column 1, row 13 (`$0571-$057D`).
- start_picture `$0586` reads the picture's header at `($B9)`.
  - Bytes 0-3 are the first column, top line, last column and bottom line (`$C1`, `$BF`, `$C2`, `$C0`).
  - Word +4 is the offset of the first frame, and words +6, +8, +10 and +12 the offsets of four channel scripts.
  - It sets each channel's countdown in `$DA-$DD` to 1 and draws the first frame stored, not XORed (`$064E`).
- animate_picture_tick `$05C5` does nothing while `$AC` is 0. Otherwise:
  - Unless `$C5` is set, it reloads the picture when a load has replaced it (load_portrait, then start_picture), and redraws the window when `$B8` AND `$DF` is 0 (`$05C9-$05D8`).
  - The prescaler `$B1/$B2` lets the channels move once in 512 calls (`$05DA-$05E4`).
  - A channel moves when its enable byte in anim_channel_enables `$5BFB` and its script offset are not 0 and its countdown runs out (`$05EB-$060B`). Then it reads the next script entry: a delay and a frame offset; a delay of `$FF` restarts the script. The frame is XORed onto the bitmap (`$0648`).
- decode_picture_frame `$0651` draws a frame into the bitmap at `$6000` column by column.
  - Byte 0 is a count of bytes to write first with the value of the run decoded last (`$065A`, `$06A8`). Then come blocks of column, line and escape value; `$FF` as the column ends the frame.
  - Each block is followed by data bytes written down the column, wrapping from the bottom line to the top at the next column. Writing the last column's bottom line also ends the frame (`$06B3-$06C3`).
  - A data byte equal to the escape value is followed by a count and a value, a run. In XOR mode a 0 data byte starts a new block.
- Waits run the animation as well: read_key gives one tick a poll (`$2534`), each scroll step 192 (`$215F`), and each slow-scroll pause round 3 (`$210A`).

## Text output

- print_engine_msg `$0519` points `$43/$44` at the engine's block, `$29E4`.
- find_message `$1E0E` takes the group word n/4 from the table after the alphabet, then skips n AND 3 messages.
- print_char_dispatch `$1F0B` handles each character:
  - With `$A1` set it prints nothing.
  - Otherwise it passes the code through the his/her filter, the three-way filter and the plural filter, in that order, when each is active (`$1F0F-$1F21`). Then it calls the handler from print_controls_direct `$1F42` or print_controls_wrapped `$1F64`: one word each for codes 0-15, and the 17th for every code from `$10`.
  - After every character it runs speed_keys `$253A`.
- The filters:
  - The plural form is a common start, then `$0A`, the singular ending, `$0A`, the plural ending, `$0A`, as in message 37, "Ax{0A}{0A}es{0A}". A count `$38` of 1 keeps the singular ending, any other the plural (filter_plural `$2063`).
  - The his/her form keeps the first of its two parts for sex 0, the second otherwise (filter_sex `$2099`). The three-way form keeps part `$CA`, 0-2 (filter_choice `$20C3`).
- ctl_print_count `$1F9D`, code `$0F`, prints a count of 0 as 1.
- Code `$06` (ctl_return_prompt `$1FC3`) prints "(RETURN)" at column 23, row 13 and waits for RETURN, space or back-arrow (wait_return `$2501`). Code `$07` opens the text window (`$12B0`). Code `$09` moves the cursor right by the next byte (`$1FAE`).
- In wrapped output, letters go to the line buffer at `$F49C` (`$1FEA`). A line is drawn up to its last space, and the rest is carried to the next line (draw_buffered_line `$200C`).
- The windows:
  - The text window's frame is columns 13-39, rows 1-14 (text_window_open `$12B0`).
  - The picture window's frame is columns 0-12, rows 1-14 (picture_window_open `$12CF`), cleared in colour `$26`.
  - Both are cleared on rows 2-13, pixel lines `$10-$6F` (window_clear `$1300`, clear_window `$22A9`).
  - The frames are glyphs `$81` and `$83` (top corners), `$84` (sides), `$85` and `$7D` (bottom corners) and `$5C` (top and bottom) (draw_frame `$130B`).
- show_message `$1E60` prints a message in the window of rows 18-22, pixel lines `$90-$B7`, columns 0-39. It goes on from the column and row where the last message ended, kept in the operands at `$1E78` and `$1E7C` (column 0, row 22 in play-map.vsf). It holds `$A8` at 0 and sets `$B0` while it prints.
- newline `$20F9`:
  - With `$B0` set it counts lines in `$AF`. At 6 it prints the bar's "(RETURN)" (bar_return_prompt `$21E8`, row 23, text `$220A`), whose code `$05` waits for RETURN, space or back-arrow. read_key clears `$AF` on every key.
  - On the window's last row it scrolls the window up eight lines.
  - With slow scrolling (`$A8` set), each new line first pauses newline_pause_counts `$21E1` rounds of delay_a(11) and three animation ticks. The scroll is then scroll_step_counts `$21D3` steps of scroll_step_lines `$21DA` lines each, both indexed by the speed `$0F`.
  - Without slow scrolling there is no pause, and the scroll is one step of eight lines (`$213B`).

| Speed `$0F` | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| pause rounds | 255 | 1 | 192 | 1 | 192 | 1 | 1 |
| steps × lines | 8 × 1 | 8 × 1 | 4 × 2 | 4 × 2 | 2 × 4 | 2 × 4 | 1 × 8 |

- speed_keys `$253A` works only while `$A8` is set: `$8A` (CRSR down) lowers the speed number and `$95` (CRSR right, or C=) raises it, within 0-6, and the key is taken. The game sets `$A8` and the speed around its slow square messages (game `$914D-$915D`, `$9144-$914C`).

## Lists, menus and line input

- list_choose `$1975` reads a key.
  - A digit picks a line it showed (`$19A4-$19BD`).
  - `$88` (DEL), `$8B` or I shows the page before; `$95`, `$8A` or K the page after.
  - Left-arrow returns `$FF`, the extra key in `$BE` returns `$FE`, and RETURN or space returns `$FD`, all with carry set (`$1990-$19A2`).
- The page is nine lines (list_page_setup `$1A7A`). Paging works when the count `$4E` is above 9 (list_fits_page `$19E3`), and the MORE line shows when it is above 10 (`$1A94-$1A99`). The engine's lists keep `$4E` one above the number of items (`$1066`, `$13FC`), so a list of nine can be paged with no MORE line, and the MORE line comes from ten.
- list_line_label `$1AB4` prints the line's digit and `>`, or `_` for the marked item `$D1`.
- menu_key `$1BBF`:
  - `,` and `.` move the selection back and on, wrapping. RETURN runs the selected item.
  - A key equal to an item's first letter with bit 7 set runs that item. The characters after the bar text's 0 are hidden items, numbered on from the last bar item (`$1BEC-$1C0A`).
  - run_menu_item `$1C55` calls the handler and then redraws the bar.
- draw_menu_bar `$1B36` draws the bar on row 23 in reverse, and the selected item in normal video.
- input_line `$1D06`:
  - It clears the buffer's max + 1 bytes and blinks `_` with delay_a(`$30`).
  - Left-arrow returns `$FF`. DEL or `$FF` deletes. RETURN removes trailing spaces and returns 0.
  - It takes only codes from `$A0` up, and stores them AND `$7F`.
  - On a line of spaces alone the trimming also tests the byte at buffer + 255 (`$1D93-$1D9C`).
- input_line_x `$1D00` differs from input_line only in a flag that chooses between two identical `JSR read_key` (`$1D2D-$1D35`).

## Numbers

- num1 (`$6F/$70`) and num2 (`$71/$72`) are added to by num1_add_clamped `$079D` and num2_add_clamped `$07C6`, which hold the sum at `$FFFF` or at 0 by the sign of the high byte added. compare_num1_num2 `$07FC` returns carry set for num1 ≥ num2.
- binary_to_bcd `$243B` turns the 24 bits in `$1C-$1E` into eight digits in `$1F-$22`, by subtracting powers of ten.
- print_bcd_field `$1CB1` prints the last `$30` of the eight digits, with leading zeros as the pad character `$2E`; print_bcd `$1CA9` sets eight digits and no pad.
- divide_24_by_8 `$06E8` divides `$073F/X/A` by Y, 24 steps of shift and subtract, with the remainder in `$D3`. divide_16_by_8 `$06E1` clears the high byte first.

## Keyboard, random numbers and delays

- irq_handler `$2947` saves A, X, Y and `$01`, sets `$01` to `$35`, acknowledges the VIC with `LSR $D019`, scans the keyboard only when that was a raster interrupt, reads `$DC0D`, and restores.
- scan_keyboard `$2967`:
  - It masks CTRL (row 7, column 2), right SHIFT (row 6, column 4) and left SHIFT (row 1, column 7) with key_row_masks `$29D4`.
  - A row takes a new key only when it held none (key_row_state `$29DC`).
  - It stops at the first new key.
- In the key table `$C953`, DEL gives `$88`, RETURN `$8D`, CRSR right and C= both `$95`, CRSR down `$8A`, F1, F3, F5 and F7 `$F1`, `$F3`, `$F5` and `$F7`, RUN/STOP `$98`, left-arrow `$9B` and SPACE `$A0`. £, HOME, ↑, CTRL and both SHIFTs give 0, which is not stored. No key gives `$8B` or `$FF`.
- read_key `$2514` makes a random byte and runs speed_keys on every poll. On a key it clears `$AF` and `$B5`. Then it waits delay_a(4) and gives one animation tick.
- wait_key `$24F2` waits for a key and returns carry set for left-arrow. wait_return `$2501` waits for RETURN or space, or left-arrow with carry set.
- random_byte `$24E3` increments its seed, the operand at `$24ED`, and adds the raster line `$D012`, CIA 1 timer A's low byte `$DC04` and the seed, with the carries; the sum is the new seed.
- delay_a `$242B` runs an inner loop A + (A − 1) + … + 1 times. A = 255 takes 166,022 cycles counting its `JSR` and `RTS`, and A = 0 returns at once.

## Sound and the screen shake

- play_sound `$C993`, X = 0, 11 or 22:
  - It clears voice 1's control and sets `$D418` to `$0F`.
  - It writes record bytes 0-6 to `$D406` down to `$D400`, bytes 7-9 to `$D417`, `$D416` and `$D415`, and byte 10 to `$D404`.
- The three records, from the table at `$C9BC`:

| X | Attack/decay | Sustain/release | Pulse | Frequency | Control | Called by |
|---|---|---|---|---|---|---|
| 0 | `$1A` | `$00` | `$07F3` | `$2000` | `$85`: noise, gate | screen_shake `$0746` (entry `$044C`, item effect 1) |
| 11 | `$00` | `$60` | `$06A4` | `$2000` | `$A4`: gate clear, so silent | play_sound_1 `$241C` (entry `$0232`) |
| 22 | `$00` | `$00` | `$0000` | `$1000` | `$81`: noise, gate | play_sound_16 `$0741` (entry `$04D2`) |

- Record 0's filter bytes (cutoff `$22`/`$4E`, `$D417` = `$F0`) route no voice through the filter.
- screen_shake `$0746` plays sound 0. Then twelve times it waits delay_a(`$80`) and writes random fine scroll bits into `$D011` and `$D016`, keeping their other bits as read (random_fine_scroll `$077A`). At the end it writes both registers back as they read at the start and silences voice 1 (`$076C-$0776`).
- The raster interrupt is set to line 0. The boot file `2.0` writes `$D011` = 0 and `$D012` = 0 from its table at `$C14C` (its loop at `$C126-$C135`), and the start-up writes `$D011` = `$37` (startup `$7F55`, `$7F91`). In the 74 snapshots of all the parts, no other instruction stores to `$D012` by an absolute or indexed address.

## The loader's computer side

- loader_main `$FF00` takes A = the command, X = the sector and Y = the track, and the buffer in `$FE/$FF`.
  - Command 0 reads one sector. Command 1 reads sectors to successive pages until the page in `$FD`. Command 2 writes one. Command 3 or more only sends the command and takes the status.
  - It runs with `$01` = `$35`, and sets `$34` around each byte stored to or read from the buffer (`$FF30-$FF39`, `$FF68-$FF71`), so a buffer under the I/O area works.
  - The status byte goes to `$FC`. loader_exit `$FF87` restores `$01` and compares the status with 1, so carry is clear only for status 0.
- next_logical_sector `$FD0B` takes X = track and Y = sector, the other way round from loader_main. read_sector_xy `$FD1D` reads one sector to `$5A00` through disk_io (the jump at `$03AA`), so its errors are retried.
- loader_send_byte `$FD2C` sends bit 7 first on `$DD00` bit 5, with bit 4 as the clock. loader_send_command `$FD63` sends the command, the track and the physical sector.
- loader_receive_byte `$FD9E` waits for a raster line whose entry in the table at `($F6)` is not 0, so no character row can stretch the timed read. Then it reads `$DD00` four times, two bits a read, corrects with `$F4` and decodes through the table at `$FE00`.
- The RAM vectors: NMI `$04F6`, RESET `$0000`, IRQ `$04F9` (`$FFFA-$FFFF`).

## The scroll copier

- scroll_copy_row `$DD80` copies one character row of the map window for the game's scrolls (game `$BE26`, `$BE44`, `$BE74`, `$BE90`). It runs only with the I/O banked out.
  - First the screen matrix colours, with addresses, indexes, end and steps patched in by the game (game `$BECC-$BF32`, from the tables at `$DDE4-$DDF0`).
  - Then the bitmap: copy_cells `$DD9D` copies `$20` groups of eight bytes, then two or four more (the operand at `$DD9C`, patched at game `$BE4B` and `$BEC0`): 34 cells for a scroll left or right, 36 for one up or down.
- set_copy_direction `$DDC9` patches the first index, the page step and the eight `INY`/`DEY` slots for a forward or backward copy.
- `$DDFB-$DDFF` are five zero bytes that only the save and restore around a tile-set unpack read.

## Code nothing reaches, and oddities

- `$1CFD`, `A9 FF 2C`, would start input_line with digits only (`$1D4C-$1D56`). Nothing calls it.
- Item reorder stores the wrong weapon and armour slots in two cases (`$1015-$104F`):
  - The slot count goes up on passes with no pick, so after RETURN, space, R or left-arrow during a reorder, an equipped weapon or armour picked after it is stored one slot too high for each such pass.
  - A member with no weapon (or no armour) gets the slot left in the operand by the last reorder that moved one. The operands are 0 at the start, and 0 in play-map.vsf.
  - Neither path changes the armour class `+$1A`.
- unjam_weapon's test for six or more tries (`$1515-$1517`) cannot be reached from the `$80` the game writes when a weapon jams: failures stop adding at `$85`, five tries.
- remove_member does not check that the position holds a member. With an empty position the record number is 0.
  - It copies record 0, page `$F4`, over page `$F3` (copy_character with X = `$FF`), then records 2-7 down over 1-6.
  - It lowers every entry of every table, so empty positions become `$FF` (`$1807-$1854`).
- square_to_screen sets carry, "not on screen", for any pixel line of 14 or more when the roster is shown (`$0B3F-$0B48`). Its lines are 16 × the row, so draw_square then draws only the view's top row. The game's own test is the same (game `$AD3F-$AD45`).
- draw_geiger_gauge with `$9F` = 0 would draw its first kind 256 times, the row counting down from 17 and wrapping past 0: rows 17-0, then 255 down to 25, which are off the screen, then 24-18. Its 18 rows of the second kind would then cover rows 17-0 (`$0AB5-$0AB7`, `$0AD2-$0B00`).
  - The stores to `$9F` found give it `$FF` (game `$AF7E-$AF80`, `$B190-$B192`; module-4 `$CB20-$CB22`; utils `$7E18-$7E1A`), the start-up's `$FF` and `$40` down to 1 (set_gauge, startup `$8149`), and draw_square's distances, which are at least 2 for the squares of the view.
  - The utilities' send_report zeroes `$90-$AF` (utils `$8649`), but nothing reaches it, and it copies zero page back before it ends.
- screen_shake writes `$D011` back with bit 7 as it read it. Bit 7 is the raster line's ninth bit when read and the interrupt line's when written. A shake that starts on raster line 256 or later leaves the raster interrupt on line 256 instead of 0, still once a frame.
- list_choose's `$8B` and input_line's `$FF` are codes no key produces.
- The `INC $32` at `$1E26`, for a group word beyond the table's first page, is never reached: the word index is (n/4) × 2, at most 126.
