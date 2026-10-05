# Ranger Center — verified technical facts

The program behind the Ranger Center's menu, Create, Delete and Start. Module 3 loads it from side 1, track 27, logical sector 7, to `$7E00` (module-3 `$CA1A-$CA22`). Its header asks for 72 pages, `$7E00-$C5FF`, of which its own file is the first eight, `$7E00-$85FF`. Start saves the game and loads the game program, track 31, logical sector 9, over it.

## Load and layout

- The file begins `JMP $7E06`, then the load address `$7E00` and the page count `$48`, 72 (`$7E00-$7E05`).
- The program is side 1's T27/L7-L0, `$7E00-$85FF`: code and strings to `$8501`, the skill table `$8502-$8526`, the text block `$8527-$85EF`, and the 16 bytes left in the last sector.
- The 72-page load reads the 64 sectors that follow on the disk as well, T26/L17 down to T23/L9: the 72 sectors read from the side-1 image with the loader's stepping equal `$7E00-$C5FF` at the hand-over, byte for byte. Start loads the game over all of it.

| Range | Side 1 | What |
|---|---|---|
| `$8600-$8FFF` | T26/L17-L8 | the radio program's file, never run here (the game's facts, "Build") |
| `$9000-$91FF` | T26/L7-L6 | filler: `$4B`, then 255 bytes of `$01`, in each sector |
| `$9200-$94FF` | T26/L5-L3 | item table file 0 (T35/L15 entry 0), equal to the table at `$3100` |
| `$9500-$97FF` | T26/L2-L0 | item table file 1 (entry 1): file 0 except byte 2 of items 46, 55 and 57 |
| `$9800-$99FF` | T25/L17-L16 | filler |
| `$9A00-$A1FF` | T25/L15-L8 | packed modules 0 (`$9A00`), 1 (`$9D99`) and 3 (`$A14C`), then 129 zeros and `$19 $11` |
| `$A200-$B4FF` | T25/L7-T24/L7 | packed tile sets 0 (`$A200`) and 1 (`$AB08`), then 157 zeros |
| `$B500-$C5FF` | T24/L6-T23/L9 | packed portraits 0 (`$B500`), 1 (`$B829`), 3 (`$BB64`), 6 (`$BED3`) and 8 (`$C260`), and the first 46 bytes of portrait 10 (`$C5D2`) |

- Each packed stream starts where side 1's directories (T34/L16, T35/L12, T35/L10) put it. Decoded from these copies, modules 0, 1 and 3 equal what the game unpacks to `$CA00` (the module parts' snapshots, every byte of each read window), tile sets 0 and 1 equal `$D000-$DD7F` of the tile-set parts, and portrait 3 equals the picture at `$E000` in play-ranger.
- Nothing reads `$8600-$C5FF` while the Ranger Center runs. Its code has no absolute operand above `$84EA`; the pointers it builds point at its own strings (`$8243-$8457`), its skill table, its text and `$5A00`; on play-skills, `opcodes.py --refs` (every index to 255) finds no instruction of the program or of the engine for `$85F0`, `$8600`, `$8800`, `$8F49`, `$9000`, `$9200`, `$9A00`, `$A211`, `$BB64`, `$C000` or `$C5FF`; and the range is the same in all four snapshots. At the hand-over only two engine operands point into it, both left from before: the loader's store at engine `$FF34` (`$C500`, the load's last page) and the picture reader at engine `$06C4` (`$A211`, in the title picture's old buffer), which moves to `$E000` when the portrait is shown.

## Menu

- The bar is "Create Delete Start" on row 23, items 0-2 (`$7E4D`, `$7E27-$7E4A`). Keys 1 to 7 ("1234567", `$7E61`) are hidden items 3-9.
- The handler table holds ten words: Create `$7F4E`, Delete `$83C6`, Start `$7E7E`, then keys 1-7, `$7F2A`, `$7F2D`, `$7F30`, `$7F33`, `$7F36`, `$7F39` and `$7F3C` (`$7E69`).
- Keys 1-7 show that member's character screen (engine view_character, through `$033B`) when the number is at most the party size `$07`, and do nothing otherwise (`$7F41-$7F4B`). Keys 2-7 enter in the operands of a chain of `BIT` instructions, each an `LDA #n` (`$7F2C-$7F3E`).
- On entry the program shows portrait 3 from the `$E000` buffer (`$7E13-$7E15`) under the caption module 3 has copied to `$F4D0` ("Ranger Ctr."), then the roster and the text window. It keeps the picture number `$AB` and the animation flag `$AC` (`$7E09-$7E10`) and puts them back before it leaves (`$7EE4-$7EEC`).

## Start

- With members in the current party, Start goes straight on to the game (`$7E7E-$7E80`).
- With the current party empty and no other party (`$0B` = 0), Start does nothing and the menu stays (`$7E82-$7E86`).
- With the current party empty among several, each later party table moves down one place, 14 bytes each (`$7E87-$7EB6`); table 3 is cleared, the last-party number `$0B` drops, party 0 becomes current, and its column, row and map (table bytes 8, 9 and 10) go to `$57`, `$58` and `$09`, the view corner `$02`/`$03` to column − `$59` and row − `$5A` (`$7EB8-$7EE2`).
- Then it saves the game (engine save_game, through `$02D8`), waits for side 1 (`$02D5`), sets `$92` to 0 and loads T31/L9, the game program (`$7EEE-$7F00`). The save comes before the side check. With `$92` at 0 the game program skips the call it makes when the start-up has set `$92` (game `$7E5C-$7E60`).

## Character creation

- Create refuses, with message 1, when four player characters exist: it counts the records 1 to `$0A` whose byte `+$29` is 0 (an NPC's is not) and compares the count with 4 (`$7F57-$7F85`). The count is over every record, not the current party.
- The new character is record `$0A` + 1: added to the current party (engine party_add_current, through `$02A4`), selected, and its 256 bytes zeroed (`$7F86-$7F9F`).
- Then come its gear, message 2 "Create a character.", the attributes, name, sex, nationality and skills, and "Keep this char (Y/N) ?" (`$7FA1-$81A8`). Left-arrow at the attributes, the name, the sex or the nationality, and N at the end, remove the record again (engine remove_member, `$8041-$8044`).
- One round of attributes rolls ST, IQ, LK, SP, AGL, DEX and CHR (`+$0E`-`+$14`), then one more roll + 18 for both MAXCON and CON (`+$1B`, `+$1D`), and sets rank 1 (`+$24`), skill points equal to IQ (`+$20`) and the rank name "Private" (`+$32`, from `$823B`), then prints the block (`$7FDD-$801F`).
- Four rounds run in a row each time, each printed, and the fourth stands (`$7FD8-$8025`). Then SPACE rolls four more rounds, RETURN accepts and left-arrow cancels; other keys are ignored (`$8032-$803F`).
- A roll is five d6 in `$83C1-$83C5` (filled from slot 4 down), an exchange sort, and the sum of slots 2, 3 and 4 (`$8382-$83C0`).
- The sort is broken. After an exchange the loop goes on comparing the value it started with, not the one now in its slot (the `BPL` at `$83AB` goes back to the `CMP` at `$839A`), so a later exchange overwrites the die just moved and copies the small one twice: thrown in the order 1, 2, 3, 4, 5, the slots end as 1 1 1 1 5 and the roll is 7, where the best three would give 12.
- Run on the 6502 simulator over all 7,776 throws, a roll is 3 to 18 with a mean of 10.62 (the best three of five would average 13.43, 3d6 10.5). Counts: 3: 1, 4: 260, 5: 268, 6: 334, 7: 633, 8: 743, 9: 652, 10: 938, 11: 769, 12: 790, 13: 743, 14: 638, 15: 386, 16: 396, 17: 144, 18: 81.
- *Live*: with a new character's attributes on the screen, SPACE rolled four more rounds, 32 rolls,
  with checkpoints after the five dice were thrown (`$8390`) and at the sum (`$83BE`). All 32 ended as the loop above predicts,
  slot for slot, and 21 of them came out below the best three of their five dice: 3 5 5 6 2 gave
  7 where the best three make 16, and 1 4 6 4 1 gave 6 against 14.
- MAXCON and CON start at 21 to 36; 21 comes only from the one throw in 7,776 that gives 3 (`$7FE9-$7FF5`).
- The name is at most 13 characters (`$35` = 13 at `$836C`), typed at column 14 into `$5A00` and copied to `+$00`-`+$0D` (`$8361-$8381`). The engine's line input stores key codes without bit 7, so the letters are capitals (engine `$1D58`).
- An empty name is asked for again (`$8059-$805D`). A name that another record from 1 to `$0A` has, compared exactly, gets "<name> is already in the game. Enter a new name." and a new input (`$81D0-$8236`), so "HELL RAZOR" is accepted beside the pre-made "Hell Razor".
- M stores 0 and F stores 1 in `+$18` (`$8064-$8084`). Keys 1 to 5 store 0 to 4 in `+$19`: U.S., Russian, Mexican, Indian, Chinese (`$8086-$80A5`, the menu at `$82DB`). Other keys are ignored.

## Starting gear

- A random 1 or 2 (engine random_1_to_a, through `$0242`) picks the .45 kit, the M1911A1 45 pistol and eight 45 clips (`$8243`), or the 9mm kit, the VP91Z 9mm pistol and eight 9mm clips (`$824D`) (`$7FA1-$7FC0`).
- Every character then gets a Rope, a Canteen, a Crowbar, a Knife, a Hand mirror and Matches (`$8257`, `$7FC3-$7FD0`).
- Each item's count byte is byte 4 of its item record (engine item_record and item_record_byte4, through `$03C8` and `$036E`): 7 for the M1911A1, 18 for the VP91Z, 1 for the Rope, 40 for the Matches and 0 for the clips and the rest (`$81AC-$81CE`).
- The pistol is not equipped: the weapon byte `+$1F` stays 0, where the four pre-made Rangers' is 1. The pre-made Rangers carry the same kits, two the .45 and two the 9mm, with the same counts.
- Live: in play-skills the new character "KIT" has F, IQ 12, 12 skill points, the .45 kit and `0D 07`, eight `1E 00`, then `36 01 2C 00 2D 00 04 00 31 00 34 28`; in play-create the same record holds the dice 1 1 1 1 3 of its MAXCON roll and MAXCON 23 (5 + 18).

## Skills

- The skill table has one byte per skill at `$8502` + n: minimum IQ in bits 3-7, base cost in bits 0-2 (`$8352`, `$8359`). Its 36 bytes equal module 2's (module-2 `$CC6C`); byte 0, `$09`, is not used.

| Skills | Minimum IQ | Base cost |
|---|---|---|
| 1-7: Brawling, Climb, Clip pistol, Knife fight, Pugilism, Rifle, Swim | 3 | 1 |
| 8-9: Knife throw, Perception | 6 | 1 |
| 10-12: Assault rifle, AT weapon, SMG | 9 | 1 |
| 13-16: Acrobat, Gamble, Picklock, Silent move | 10 | 1 |
| 17: Combat shooting (`$FF`) | 31 | 7 |
| 18: Confidence | 11 | 1 |
| 19: Sleight of hand | 12 | 1 |
| 20-21: Demolitions, Forgery | 13 | 1 |
| 22-23: Alarm disarm, Bureaucracy | 14 | 1 |
| 24-26: Bomb disarm, Medic, Safecrack | 15 | 2 |
| 27: Cryptology | 16 | 2 |
| 28: Metallurgy | 17 | 2 |
| 29: Helicopter pilot | 19 | 3 |
| 30-31: Electronics, Toaster repair | 20 | 3 |
| 32: Doctor | 21 | 3 |
| 33: Clone tech | 22 | 3 |
| 34: Energy weapon | 23 | 3 |
| 35: Cyborg tech | 24 | 3 |

- The names are engine messages 1-35. A rolled IQ is at most 18, so Combat shooting and skills 29-35 are never offered here.
- After the nationality the skill points are set to IQ again (`$80C0-$80C6`). The list shows only the skills whose minimum IQ is at most the IQ (`$8468-$8477`), each with its minimum IQ, the price of the next level, the level and the name (`$8479-$84C3`), and marks the last of them with "_" (`$8428-$842C`).
- Skills listed: 7 for IQ 3-5, 9 for 6-8, 12 for 9, 16 for 10, 17 for 11, 18 for 12, 20 for 13, 22 for 14, 25 for 15, 26 for 16, and 27 for 17 or 18.
- The price of the next level is base cost × 2^level, or 255 when that is larger (skill_price `$84C7`; run for base costs 1-7 at every level from 0 to 254).
- A choice is refused with "Not enough skill points!" when its base cost is above the points (`$80F8-$8112`). A new skill takes the first empty pair (skill, level) from `+$80` at level 1 for its base cost (`$8151-$8168`); a known one costs the price of its next level and goes up one (`$8123-$8149`). The chosen line flashes.
- A digit picks a line; RETURN or space goes to "Keep this char (Y/N) ?"; left-arrow shows the character sheet, then the list again (`$80CE-$80E5`, `$80AA-$80B2`). When the points reach 0 the keep prompt comes by itself (`$816D-$8171`); points not spent stay with the character.
- At "Keep this char (Y/N) ?" Y keeps the character, N removes it and left-arrow goes back to the list; other keys are ignored (`$8193-$81A8`).

## Delete

- Delete asks "Which player do you want to delete?", takes a member number (engine pick_member, through `$02AE`; left-arrow gives up), selects the member and asks "Are you sure you want to delete <name>?". Y removes the member (engine remove_member, through `$02C6`); any other key keeps it (`$83CF-$83F5`).
- It does not look at `+$29`, so an NPC can be deleted, and so can a party's last member; with the only party empty, Start then does nothing until a character is created.

## Text

- The packed text block is at `$8527`: a 60-byte alphabet, the group table at `$8563` (`$0006`, `$0043`, `$E0A4`) and messages 0-6 at `$8569-$85EF`.
- The program prints messages 1-6 (`$7F07`): 1 "You cannot create any more characters.", 2 "Create a character.", 3 "Keep this char (Y/N) ?", 4 the list's header "IQ PTS LVL SKILL", 5 "Which player do you want to delete?", 6 "Are you sure you want to delete <name>?".
- The table's third word, `$E0A4`, is no valid offset, and no message needs it. The byte `$85A5`, between the two groups, is not read.
- The other prompts are plain strings at `$825E-$8467`: "(SPACE) to roll again. (RETURN) to accept.", "Enter name", " is already in the game. Enter a new name.", "Enter sex (M/F)", the nationality menu, "You are not smart enough!", "Not enough skill points!" and "Skill points = ".

## Code nothing reaches, and oddities

- `$80B5` would zero the 30 skill pairs and the byte after them and give the points back. It runs only when the list returns `$FE` for the extra key in `$BE`, and the program puts `$92` there (`$83FE`), which no key produces: the 64-entry key table `$C953-$C992` holds no `$92`, and the engine writes the pending key `$EC` only from that table or as 0 (engine `$29D1`, `$2503`, `$2526`, `$2554`).
- "You are not smart enough!" (`$8179`) cannot appear: the engine's list takes only the digit of a line it showed (engine `$19A4-$19B5`), and the list shows only skills within the IQ.
- Raising a skill tests points − price with `BMI` (`$8138-$813C`), so a price of points + 129 or more would be accepted and the points would wrap. It cannot happen at creation: a price of 128 or more needs a skill already at level 6 or 7, which costs more than the 18 points a character can have.
- The search for a skill pair (`$8115-$8121`) has no bound; at creation no more than 18 skills can be bought, within the 30 pairs.
- `$4E` gets the plain number of listed skills (`$8410-$842A`), where the engine's list expects that number + 1. Paging is right; the MORE line (engine `$1A94-$1A99`) would be missing with exactly 10 skills, which no IQ gives.
- The counting loop reads `$8526` (`$EA`: IQ 29, cost 2) as a skill 36 and never counts it; the list itself offers skills 1-35, its limit `$4D` = `$24` being exclusive (`$842E-$8432`, engine `$1A18`).
- The count of player characters looks at record 1 even when `$0A` is 0 (`$7F6D-$7F77`).
- Create does not check the current party for room: the engine's party_add puts the record in the first free position, which in a full party of seven is the table's byte 8, the party's column (engine `$174C-$1753`).
- When the empty party Start removes is the last one (`$08` = `$0B`), table 3 is cleared instead of its own (`$7E87-$7E8B`, `$7EB8-$7EBA`); its members are already 0, and its other bytes stay beyond `$0B`.
- After a refusal the program plays the engine's sound 1 (`$0232`), whose control byte has the gate bit clear, so nothing is heard, then pauses seven rounds of delay_x_times: 1,162,211 cycles, about 1.2 seconds before interrupts (`$8188-$8190`).
- `$801C` hands print_attributes the new member's position in A, which it does not use (engine `$10EE`). `$844F` sets the width `$30` to 2 before print_byte, which sets it to 8 itself (engine `$1CA9`).
- `$7E7D` is an `RTS` nothing reaches, `$7F03` an entry nothing calls, and `$7F3F` an `LDA #$08` inside `BIT $08A9` that no handler names.
- `$85F1-$85FF`, after the text, equal the game program's bytes at the same addresses; `$85F0` is `$83` where the game program has `$D0`. Nothing reads them.
