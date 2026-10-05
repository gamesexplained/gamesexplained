# Location module 0 — verified technical facts

Module 0 is the doctor: healing, an examination and cures for diseases,
sold to one member of the party at a time. It is entry 0 of the module
directory at T34/L16, a packed stream stored on all four sides; the
engine's `load_module` unpacks it to `$CA00`, and its own bytes are
`$CA00-$CDE6`. The game runs it when the party stands on a square of
class 6 whose record starts with `$80` (game `$8845`: `JSR $03BF` with
A = 0, then `JSR $CA00`). It reads the rest of that record through
`$5F/$60` and returns with the carry set, so the game redraws the screen
(game `$8872`) and then changes the square from the record's bytes 1-2
(game `$8840`).

## Load and extent

- The stream is 921 packed bytes on every side, from T25/L15 byte 0 on
  side 1, T33/L13 byte 0 on sides 2 and 4 and T33/L16 byte 0 on side 3,
  up to the start of the next stream in the directory (module 1's on
  sides 1, 2 and 4, module 2's on side 3). The four copies are the same,
  and their 7,368 bits decode to `$CA00-$CDE6`, 999 bytes. Decoded from
  side 1, the stream gives `entry.vsf`'s `$CA00-$CE53` byte for byte.
- `$CDE6` is `$20`, from the stream's last four bits, the code of entry
  0 of its value table. The text's last message ends in bit 0 of
  `$CDE5`, and nothing reads `$CDE6`: no operand of the code is above
  `$CC61`, and the only pointer it builds is the text base `$CC78`
  (`$CC4E-$CC54`).
- The directory entry is `00 00 04` *side* on all four sides, and so is
  entry 0 of the picture directory T35/L10, the doctor's picture: a
  visit never asks for a disk.

## The doctor's record

| Byte | Meaning | Where |
|---|---|---|
| 0 | `$80` | game `$8845` |
| 1-2 | the class and number the square takes afterwards; `$FD $FD` in all seven doctors, which puts the saved square back | game `$8840` |
| 3 | the greeting, a message of the map's own text | `$CA29-$CA2D` |
| 4 | the price of one CON point | `$CAE0`, `$CB2A` |
| 5 | the price of the exam | `$CAA2`, `$CBD4` |
| 6 | the price of one cure | `$CB6A`, `$CB9C` |
| 7-18 | the name, eleven characters and a zero, copied to the picture caption `$F4D0` | `$CA06-$CA13` |

- Every price is one byte: doctor_price puts it in `$1C` with `$1D/$1E`
  = 0 for the engine's spend_cash (`$CC37-$CC41`), so no treatment costs
  more than $255.

## The patient

- The doctor keeps the picture state `$AB/$AC` on the stack, copies its
  name to the caption and shows picture 0 from the buffer at `$E000`
  (`$CA00-$CA17`).
- Each round shows the roster and the greeting, asks "Who wants
  treatment?" whatever the party's size, and waits for a member's number
  (`$CA1A-$CA35`). Back-arrow leaves: `$AB/$AC` come back, the map's
  tile layer is unpacked again over what the picture used, and the carry
  is set (`$CA4F-$CA59`).
- A member whose CON is exactly 0, which the roster shows as a skull, is
  told "*name* is beyond my help." (`$CA42-$CA4C`, engine `$17DE`). Any
  other CON, the negative ones of the unconscious and worse included,
  can be treated.
- The doctor never saves the game and makes no sound: its calls are 24
  of the engine's entries, none of them save_game or a sound (every
  `JSR` and `JMP` in `$CA00-$CC77`).

## The offers

- Every pick of a patient, the same patient again included, puts the
  exam back on offer and withdraws curing and healing (`$CA1D-$CA26`).
  A patient who backs out of the menu pays for a new exam before a cure.
- Curing is offered only once the exam has been paid for, and only when
  the disease byte `+$28` is not 0 (`$CA5A-$CA69`), so the exam and
  curing are never on the menu together.
- Healing is offered while CON differs from MAXCON: the engine's
  con_is_full compares the two words for equality, not for order
  (`$CA6B-$CA72`, engine `$1493`). With nothing on offer the doctor asks
  "Who wants treatment?" again (`$CA7E`).
- The menu: "Well *name*, I would recommend:", then C)uring, E)xam
  $*price* and H)ealing, each while offered, and the cash line "P)ool
  Money = $" (`$CA89-$CAB6`, `$CC61-$CC75`). Back-arrow returns to the
  question; C, E and H do nothing unless offered; other keys are ignored
  (`$CAB9-$CAD9`, `$CB59`, `$CBCC`).
- P on the menu, the heal screen or the cure screen moves every other
  member's cash to the patient (engine pool_cash, `$CA81-$CA86`,
  `$CB50`, `$CBC3`).
- A price above the patient's cash gives "You don't have enough money."
  and takes nothing (`$CBFC`, engine `$0BFB`).

## Healing

- The heal screen reads "Healing costs $*price* per CON point. You need
  to heal *n* points. Press Y to heal 1 point.", where *n* is MAXCON −
  CON as a 16-bit number, or "alot more" while CON is 0 or below
  (`$CADB-$CB15`). Back-arrow returns to the offers (`$CB20`, through the
  `BEQ` at `$CB7E`).
- Each Y pays byte 4 and adds one CON point (engine heal_one,
  `$CB2A-$CB34`). When that point leaves CON at exactly 0, a second point
  is added free (`$CB38-$CB3D`), so a patient at −1 does not end on the
  skull.
- The screen comes back unless the paid point brought CON to MAXCON, a
  test taken before the free point and kept across it (`PHP` at `$CB37`,
  `PLP` at `$CB46`); otherwise healing is withdrawn and the offers are
  shown. Run on the 6502 simulator for MAXCON 1-60 and CON −30 up to
  MAXCON + 2, all 3,750 payments do exactly that.
- So with MAXCON 1 or less, a patient healed from −1 passes MAXCON: from
  −1 at MAXCON 1 the free point lands on 1, the screen comes back with
  "You need to heal 0 points", and each further payment raises CON past
  MAXCON, the screen then asking for 65,535 points (run). The Ranger
  Center creates characters with MAXCON 21 to 36 (ranger `$7FE9-$7FF5`).

## The exam and cures

- The exam costs byte 5 and shows "You have no diseases." or "You're
  inflicted with:" and a line "*n*> *name*" for each set bit of `+$28`,
  lowest first; then the exam is no longer offered (`$CBCC-$CBF9`,
  `$CC04-$CC36`).
- The diseases are the module's messages 1-8 for bits 0-7: Radiation
  poisoning, Wasteland Herpes, Bug byte, Sewer rot, Desert dust, Rabies,
  "D6" and "D7" (`$CCC2-$CCFC`).
- The cure screen lists them with "Enter # to cure at $*price* each."
  (`$CB59-$CB76`). Keys 1-8 pick a bit, a disease the patient does not
  have is ignored, and each payment of byte 6 clears one bit
  (`$CB84-$CBB1`, masks at `$CC59`). The list comes back while any bit
  is set; then curing is withdrawn (`$CBBB-$CBC0`).

## The seven doctors

Every record of the doctor's shape on the 42 maps (each map's snapshot
searched byte by byte for `$80` and an eleven-character name ended by a
zero at byte 18) is one of these, each word of its map's class-6 list:

| Map (side) | Record | Name | Greeting | Heal | Exam | Cure | Entrance |
|---|---|---|---|---|---|---|---|
| 1 (2) | `$3BC1` | Q Emergency | "Dr. Quack's emergency clinic." | 5 | 30 | 70 | class 10 number 3, at 7,8 |
| 10 (1) | `$3F5C` | Infirmary | "Welcome to the infirmary." | 5 | 25 | 50 | number 7, at 13,29 |
| 12 (3) | `$4F0F` | Infirmary | "You are in the Vegas Hospital." | 10 | 100 | 200 | number 8, at 21,3, 21,5 and 17,49 |
| 13 (4) | `$3D8C` | Sickbay | "The Doctor is in." | 25 | 200 | 200 | number 6, at 1,13 and 5,20 |
| 21 (4) | `$3C04` | Patch em up | "Dr. Jekyll's body shop." | 20 | 250 | 250 | number 21, at 24,27 |
| 26 (2) | `$4CFE` | Old Doc Bob | "Welcome to Old Doc Bob's." | 8 | 50 | 80 | number 25, at 53,9 |
| 38 (3) | `$3F67` | Nuclear Aid | "Welcome to Nuclear First Aid." | 15 | 90 | 150 | number 8, at 25,28 |

- Each entrance is an exit record whose first byte has bits 7 and 6
  set, offsets from the party's square and a question first, with
  offsets 0, 0, the map itself and bytes 4-5 6, *n*: after Y to "Enter
  new location (Y/N)?" the square becomes the doctor's class-6 square,
  which runs at once (game `$89A3-$8A35`). Its message names the place,
  "Entering Dr. Quack's emergency clinic." or "Entering the Vegas
  Hospital where the rich get well, and the poor die young." (map 12's
  message 37).

## Text

- The packed text block is at `$CC78` (`$CC4E-$CC54`), with a group
  table of seven words at `$CCB4` and messages 0-24: 0 empty, 1-8 the
  diseases, 9 "*name* is beyond my help.", 10 the menu's first line, 11
  "E)xam $", 12 "H)ealing", 13 "C)uring", 14-16 the heal screen, 17 "You
  have no diseases.", 18 "You don't have enough money.", 19 "You're
  inflicted with:", 20-21 the cure line, 22 "alot more", 23 "Who wants
  treatment?", 24 "P)ool Money = $".
- Every message from 1 to 24 is printed: each call of the two print
  entries (`$CC42`, `$CC49`) has its number in A, and the disease list
  prints *n* + 1 for bit *n* (`$CC23-$CC28`).
