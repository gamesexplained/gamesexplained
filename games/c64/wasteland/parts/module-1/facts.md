# Location module 1 — verified technical facts

Module 1 is the shop. It is entry 1 of the module directory at T34/L16,
a packed stream stored on sides 1, 2 and 4; the engine's `load_module`
unpacks it to `$CA00`, and its own bytes are `$CA00-$CE24`. The game
runs it when the party stands on a square of class 6 whose record starts
with `$81` (game `$8839`, `$8845`: `JSR $03BF` with A = 1, then `JSR
$CA00`). It reads the rest of that record through `$5F/$60`, trades with
one member at a time and returns with the carry set, so the game redraws
the screen (game `$8872`) and then changes the square from the record's
bytes 1-2 (game `$8840`).

## Load and extent

- On sides 1, 2 and 4 the stream's first 947 packed bytes are the same,
  and they alone fix the output `$CA00-$CE24` (1,061 bytes); the next
  output byte needs packed byte 948, which differs between the sides.
  Decoded from side 1, the stream gives `entry.vsf`'s `$CA00-$CE78` byte
  for byte.
- The text's last message ends in `$CE23`, and nothing reads `$CE24` or
  anything after it: no instruction can reach `$CE24`, `$CE25`, `$CE50`
  or `$CE78` (`opcodes.py --refs`, reach 255), and the only pointer the
  code builds into `$CDxx` is the text base `$CD3D` (`$CD04-$CD0A`).
- Side 3's directory names side 1 for module 1, and picture 1, which the
  shop shows, is stored on the same three sides. Every shop is on a map
  of side 1, 2 or 4, so a shop never asks for a disk.

## The shop's record

The square's record, read through `$5F/$60`:

| Byte | Meaning | Where |
|---|---|---|
| 0 | `$81` | game `$8845` |
| 1-2 | the class and number the square takes afterwards; `$FD $FD` puts the saved square back | game `$8840` |
| 3 | the buy shift, to `$74` | `$CA3B-$CA3F` |
| 4 | the sell shift, to `$73` | `$CA41-$CA45` |
| 5 | the greeting, a message of the map's own text | `$CA47-$CA4B`, `$CA59-$CA5B` |
| 6 | the item table, an entry of the directory at T35/L15, loaded to `$3100` | `$CA00-$CA06` |
| 7-18 | the name, copied to the picture caption `$F4D0` | `$CA0F-$CA1C` |
| 19 on | the item classes the shop deals in, ended by `$FF` (`$9D/$9E`) | `$CA28-$CA33` |

## Entering and leaving

- The shop loads its item table, keeps the picture state `$AB/$AC` on
  the stack, copies its name to the caption and shows picture 1 from the
  buffer at `$E000` (`$CA00-$CA20`).
- Each round shows the roster and the greeting, then asks "Who wants to
  enter?" unless the party has one member (`$07` = 1, `$CA63-$CA67`); a
  back-arrow there leaves (`$CA73`). A member whose CON is 0 or below gets
  "*name* can't buy anything." and the round starts again (`$CA78-$CA82`,
  engine `$17E6`).
- "Do you want to B)uy or S)ell?" takes B, S or back-arrow and ignores
  other keys (`$CAA7-$CAB9`).
- Leaving through "Who wants to enter?" saves the game when anything was
  bought or sold (`$CA85-$CA8A`). Then `$AB/$AC` come back, the map's tile
  layer is unpacked again over what the picture used (`$CA93`), and the
  carry is set (`$CA96`).
- A party of one leaves by back-arrow at "B)uy or S)ell?", which jumps
  past the save (`$CA98-$CA9C`): a party of one never saves in a shop.
- A party of one whose member has CON 0 or below cannot leave: the round
  never asks a question with a way out, and repeats after each RETURN
  (`$CA4E-$CA82`).

## Selling

- The sell list holds the trading member's slots whose item's class is in
  the shop's list (`$CB63-$CB77`); with none, "You don't have anything
  they want!" (`$CAC7-$CADB`). The equipped weapon (`+$1F`) and armour
  (`+$25`) are shown in inverse (`$CB92-$CBA0`).
- A sale unequips the slot (`$CB0C`), zeroes its item and count
  (`$CB10-$CB1D`), adds the sell price to the member's cash (`$CB20-$CB26`)
  and raises the item's stock, byte 2 of its record, by one unless it is
  255 (`$CB2C-$CB37`). The count in the slot does not enter the price: a
  loaded gun or a part-used box of matches sells for the same.

## Buying

- The buy list offers items 1-93 whose stock is not 0 and whose class the
  shop sells (`$CC5D-$CC95`); item 94, the table's last, is never looked
  at (`$CC7F-$CC84`). With none: "We are temporarily out of stock."
  (`$CBCC-$CBD5`). With all 30 slots full before the list: "Your
  inventory is full." (`$CBAE-$CBBA`).
- A price above the member's cash gives "That costs too much!", the
  engine's sound 1, which starts no note, and a pause of seven
  `delay_x_times` rounds (`$CBF8-$CBFB`, `$CC4A-$CC5A`).
- A purchase puts the item into the first empty slot with byte 4 of its
  record as the count (`$CBFD-$CC0A`), so a gun comes loaded: 7 rounds for
  the M1911A1 .45 (item 13), 18 for the VP91Z 9mm (item 16), and Matches
  (item 52) come as 40. It takes the price from the cash (`$CC0C`) and
  lowers the stock by one with no floor test (`$CC12-$CC19`): a stock of
  255 drops to 254, while a sale stops at 255.
- The buy list sets `$4E` to the plain number of items (`$CBD7`), where
  the engine's lists expect that number + 1, as the sell list gives it
  (`$CAE3-$CAE4`). Paging is right; with exactly ten items on offer the
  MORE line (engine `$1A94-$1A99`) is missing.

## Prices

- An item's price is bytes 0-1 of its record (`$CD18`). The sell price
  is the price less the price shifted right by the record's byte 4, the
  buy price the same with byte 3, in 24 bits; a shift of 0 leaves the
  price whole (`$CCC7-$CCF7`). Run for every seventh price from 0 to
  65,535 with shifts 0-3, both routines give exactly that in all 74,904
  runs.
- So a shift of 1 pays 50 % of the price and 2 pays 75 %, the shifted part
  rounded down and the payment so rounded up.

## Stock, pooling and the item tables

- When anything was traded, the item table is written back to its file on
  leaving the list (`$CB51-$CB56`, `$CC38-$CC3D`, engine `$03C2`), except
  after a purchase that sells out the shop's stock, which leaves the buy list
  through message 1 without writing it (`$CBD3`, `$CBBA`); the
  party only on leaving the shop (`$CA85-$CA8A`). Selling and then
  resetting before leaving the shop keeps the items in both places.
- P in either list moves every other member's cash to the trading member
  (`$BE` = `$D0`, `$CAEA`, `$CBC0`; `$CB5A`, `$CC40`); the line above the
  list shows "P)ool Money = $" and that member's cash (`$CD28`).
- The directory at T35/L15 names four three-page item tables: entry 0,
  T26/L5 on side 1 (the one the start-up loads); 1, T26/L2 on side 1; 2,
  T33/L16 on side 2; 4, T33/L16 on side 4; entry 3 is empty. The four
  files are the same but for byte 2 of each record (the stock) and the
  record of item 94.
- In those files every item a shop can stock is at 0 or 255 except two in
  table 4: LAW rocket (item 11) at 20 and Howitzer shell (item 33) at 2.

## The seven shops

Every record of the shop's shape on the 42 maps (each map's snapshot
searched byte by byte for `$81`, an item table 0-4, a printable name and
a class list ended by `$FF`):

| Map (side) | Record | Name | Table | Pays | Greeting | Classes | Entrance |
|---|---|---|---|---|---|---|---|
| 1 (2) | `$3BD4` | Q. Emporium | 2 | 50 % | "Welcome to the Quartz Emporium." | 1-17 | class 10 number 4, at 1,26 |
| 8 (1) | `$3CE0` | Trading car | 0 | 75 % | "The Trading Car" | 16 | number 0, at 17,2 |
| 9 (1) | `$3D12` | AG. store | 0 | 75 % | "Agricultural Station general store." | 17 | number 0, at 26,13 once made during play |
| 10 (1) | `$3F6F` | Store | 1 | 75 % | "Welcome to the shop." | 16, 17 | number 8, at 30,24 |
| 21 (4) | `$3C17` | Market | 4 | 50 % | "The Darwin general store." | 16, 17 | number 19, at 2,21 |
| 21 (4) | `$3C2D` | Blackmarket | 4 | 50 % | "The Black Market." | 1-15 | number 20, at 26,3 |
| 32 (2) | `$3DF0` | Thrift shop | 2 | 50 % | "Leroy's arms counter." | 1-17 | number 6, at 10,28 |

- Each entrance is an exit record whose last two bytes turn the square
  into the shop's class-6 square: stepping on it prints "Entering ..."
  and the shop runs.
- The buy shift is 0 in all seven, so every shop sells at full price.
- The Blackmarket's bytes 1-2 are `$0A $0A`; the other six have `$FD
  $FD`.
- Shops that share a table share their stock: the Emporium and the Thrift
  shop (table 2), the Market and the Blackmarket (table 4), the Trading
  car and the AG. store (table 0).
- The AG. store's entrance is made during play. No square of the stored
  map 9 is class 10 number 0; its remote-change record 2 (map-09
  `$3DD3`) shows message 52, "The Old Man is pleased to see that you
  have killed Harry. ...", and turns 26,13, a blocking square, into one.
  That record runs when loot bag 1 (class 5 number 1, map-09 `$3CF6`)
  is emptied, the bag that the encounter with Harry (class 3 number 1,
  map-09 `$3BF5`) leaves when it is wiped out (map-09 `$3BFF`; game
  `$BA71`, `$92D6`).
- The item classes are byte 3 of an item's record shifted right three
  times (engine `$144A`): 1-4 and 6-13 weapons and explosives, 14
  ammunition, 15 armour, 16 gear, 17 Clay pot, Fruit and Jewelry, 18
  quest items, which no shop lists. No item has class 5, though the
  Emporium, the Blackmarket and the Thrift shop list it.

## Text

- The packed text block is at `$CD3D` (`$CD04-$CD0A`), with a group
  table of three words at `$CD79` and messages 0-9: 0 empty, 1 "We are
  temporarily out of stock.", 2 "Who wants to enter?", 3 "*name* can't
  buy anything.", 4 "P)ool Money = $", 5 "You don't have anything they
  want!", 6 "Do you want to B)uy or S)ell?", 7 the list header "$$$
  ITEM", 8 "Your inventory is full.", 9 "That costs too much!".
  Alphabet entries `$24-$3B` are `$7F`.
- Every message the code prints is a number from 1 to 9 in A before one
  of the three print entries (`$CCF8`, `$CCFF`, `$CD03`).
