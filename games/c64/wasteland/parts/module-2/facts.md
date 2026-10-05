# Location module 2 — verified technical facts

Module 2 is the library, where a character spends skill points on
skills. It is entry 2 of the module directory at T34/L16, a packed
stream stored on sides 2, 3 and 4; the engine's `load_module` unpacks it
to `$CA00`, and its own bytes are `$CA00-$CDA5`. The game runs it when
the party stands on a square of class 6 whose record starts with `$82`
(game `$8845`, A = 2). It reads the rest of that record through
`$5F/$60` and returns with the carry set, so the game redraws the screen
(game `$8872`) and then changes the square from the record's bytes 1-2
(game `$8840`).

## Load and extent

- On sides 2, 3 and 4 the stream's first 847 packed bytes are the same,
  and they alone fix the output `$CA00-$CDA5` (934 bytes). Decoded from
  side 2, the stream gives `entry.vsf`'s `$CA00-$CF3E` byte for byte.
- The text's last message ends in `$CDA4`, and nothing reads `$CDA5` or
  anything after it: no instruction operand lies in `$CD00-$CFFF`, and
  the one computed pointer, `$CC6C` + A (`$CC2A`), cannot pass `$CD6B`.
- Module 2 sits at a different place on side 3 (directory entry `99 03 04
  03`) than on sides 2 and 4 (`4C 07 04`), and picture 2, which the
  library shows, is stored on the same three sides. Every library is on a
  map of side 2, 3 or 4.

## The library's record

| Byte | Meaning | Where |
|---|---|---|
| 0 | `$82` | game `$8845` |
| 1-2 | the class and number the square takes afterwards; `$FD $FD` puts the saved square back | game `$8840` |
| 3 | the greeting, a message of the map's own text | `$CA1D-$CA21` |
| 4-15 | the name, copied to the picture caption `$F4D0` | `$CA06-$CA13` |
| 16 on | the skills offered, ended by `$FF`; list line *n* is byte `$0F` + *n* | `$CB5D-$CB66`, `$CC45` |

## Entering and leaving

- The library keeps the picture state `$AB/$AC` on the stack, copies its
  name to the caption and shows picture 2 from the buffer at `$E000`
  (`$CA00-$CA17`).
- Each round shows the roster and the greeting and asks "Who wants to
  enter?", whatever the party's size (`$CA1A-$CA2E`). Back-arrow leaves:
  `$AB/$AC` come back, the map's tile layer is unpacked again and the
  carry is set (`$CA40-$CA49`).
- A member whose CON is 0 or below gets "*name* is in no condition to
  learn." (`$CA33-$CA3D`).
- The library never saves the game: its code has no call to the engine's
  `save_game` (every `JSR` and `JMP` in `$CA00-$CC6B`).

## Refusals

Before the list, in this order (`$CA59-$CA7D`):

- no skill points (`+$20` = 0): "You have too much on your mind to learn
  anything.";
- no empty skill pair among the 30 (`+$80-+$BB`, `$CC1A`): "Not even
  Einstein can learn anymore.", which also stops a member from raising a
  skill already known;
- no offered skill whose minimum IQ is at most the member's IQ (`+$0F`):
  "*name* is not smart enough to learn anything here." (`$CAC0`).

## The list

- The header "IQ PTS LVL SKILL" (`$CA82`), then a line for each offered
  skill whose minimum IQ is at most the member's IQ (`$CB95-$CBA7`): the
  minimum IQ, the cost of the member's next level, the member's level in
  it (0 when not known) and the skill's name, engine message *n* through
  the engine's text pointer at `$0200` (`$CBA9-$CBF0`). "Skill points =
  *n*" is shown above (`$CB84`).
- `$4E` is the number of shown skills + 1 and `$D1` the last shown
  (`$CB57-$CB7C`).

## Skill table

- `$CC6C` holds a byte for each skill 0-35: the minimum IQ in bits 3-7,
  the base cost in bits 0-2 (`$CC36`, `$CC3D`).

| Skills | Byte | Minimum IQ | Base cost |
|---|---|---|---|
| 1-7 | `$19` | 3 | 1 |
| 8-9 | `$31` | 6 | 1 |
| 10-12 | `$49` | 9 | 1 |
| 13-16 | `$51` | 10 | 1 |
| 17 | `$FF` | 31 | 7 |
| 18 | `$59` | 11 | 1 |
| 19 | `$61` | 12 | 1 |
| 20-21 | `$69` | 13 | 1 |
| 22-23 | `$71` | 14 | 1 |
| 24-26 | `$7A` | 15 | 2 |
| 27 | `$82` | 16 | 2 |
| 28 | `$8A` | 17 | 2 |
| 29 | `$9B` | 19 | 3 |
| 30-31 | `$A3` | 20 | 3 |
| 32 | `$AB` | 21 | 3 |
| 33 | `$B3` | 22 | 3 |
| 34 | `$BB` | 23 | 3 |
| 35 | `$C3` | 24 | 3 |

- Skill 17 is Combat shooting (engine message 17). Its entry, `$FF`, asks
  for IQ 31, and no library lists skill 17, so no library teaches it.
  Entry 0 (`$09`) belongs to no skill.

## Training

- The cost of a skill's next level is the base cost × 2 to the power of
  the level, 255 when that passes 255 (`$CBF7`, called with X = level +
  1); run for base costs 1-7 and every level 0-254, it gives exactly that.
- A choice first needs its base cost to be no more than the skill points,
  compared unsigned (`$CA9C-$CAAB`); otherwise "Not enough skill points!",
  the engine's sound 1, which starts no note, and a pause of seven
  `delay_x_times` rounds (`$CAAD-$CABD`).
- A new skill goes into the first empty pair at level 1 for its base cost
  (`$CB1C-$CB3C`).
- Raising a known skill is refused at level 255, "You know it all."
  (`$CAE8-$CAEC`), and when the level is not below the member's rank
  `+$24`, "Need more experience." (`$CAEE-$CAF2`). Otherwise the cost is
  taken and the remainder tested with `BMI`, not the carry (`$CB03-$CB07`).
- So a level cost at least 129 above the points is accepted, and the
  subtraction wraps the points upward: a cost of 255 adds one point, 192
  adds 64, as long as the result stays below 128. The same test refuses a
  training the member can afford when 128 points or more would be left.
- Each success flashes the line (`$CB16`, `$CB3E`), and the list returns
  while points remain (`$CB41-$CB4A`).

## The eight libraries

Every record of the library's shape on the 42 maps (each map's snapshot
searched byte by byte for `$82`, a printable name and a list of skills
1-35 ended by `$FF`):

| Map (side) | Record | Name | Greeting | Skills | Entrance |
|---|---|---|---|---|---|
| 7 (4) | `$3BBC` | Clone prep. | "You look at the book." | 33 | class 10 number 0, at 21,30 |
| 12 (3) | `$4F22` | Vegas Lib. | "You are in the remains of the Las Vegas library." | 1-16, 18-28, 30-32, 34 | number 9, at 61,59 |
| 13 (4) | `$3D5B` | Books | "Shelves full of books stand before you." | 1-16, 18-28, 30-32, 34, 35 | number 5, at 4,13, 5,13, 6,13, 1,20 and 2,20 |
| 15 (4) | `$3C33` | Chopper Sim | "Chopper simulation module." | 29 | none: the square 28,22 is the class-6 square itself |
| 21 (4) | `$3C50` | Library | "Darwin Branch Library." | 1-16, 18-28, 31-33 | number 22, at 24,20 |
| 26 (2) | `$4D11` | New Thought | "Quiet please! You are in a center of higher learning." | 1-16, 18-28, 30-32 | number 26, at 43,8 |
| 36 (3) | `$3F05` | Technical | "There are many books to read here." | 20, 22, 24, 30, 31, 33-35 | number 7, made during play |
| 38 (3) | `$3F7A` | Knowledge | "Welcome to the Center of Holy Knowledge." | 1-16, 18-28, 30-32, 34 | number 9, at 28,26 to 28,29 |

- Map 36 has no square of its entrance's class 10 number 7. Its square
  9,2 is class 1 number 14, whose record (`$3AA1`, `A6 0A 07`) shows map
  message 38, "You've found the technical section of the library!", and
  then turns the square into class 10 number 7.
- The Chopper Sim's bytes 1-2 are `$0A $02`, class 10 number 2 (`$3C9B`,
  `80 00 FE 0F FD 80`); the other seven have `$FD $FD`.

## Text

- The packed text block is at `$CC90` (`$CC58-$CC5E`), with a group table
  at `$CCCC` whose first three words are used (`+$08`, `+$5C`, `+$9F`)
  and messages 0-10: 0 empty, 1 "You have too much on your mind to learn
  anything.", 2 "Not even Einstein can learn anymore.", 3 the list
  header, 4 "Skill points = ", 5 "Who wants to enter?", 6 "*name* is in
  no condition to learn.", 7 "Not enough skill points!", 8 "You know it
  all.", 9 "*name* is not smart enough to learn anything here.", 10 "Need
  more experience.".
- The group table's fourth word, `$74A6`, would point outside the block;
  no message number above 10 is ever passed.
