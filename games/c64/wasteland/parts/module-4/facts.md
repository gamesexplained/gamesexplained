# Location module 4 — verified technical facts

Module 4 is the destruction of Base Cochise, the game's ending. It is
entry 4 of the module directory at T34/L16, stored on side 4 only; the
engine's `load_module` unpacks it to `$CA00`, and its own bytes are
`$CA00-$CFFA`. No map square leads to it: the game runs it, `LDA #$84`
into the module call at game `$8845` (game `$82DA-$82DC`), when the
self-destruct countdown that map 20 starts runs out. It kills the
parties still in the base, shows the ending, and returns with the carry
set when a party is left, so play goes on, or with the carry clear when
none is, and the game then loads the death screen (game `$7ED5`).

## Load and extent

- Side 4's directory entry is `9B 0A 06 04`: the stream starts at
  T33/L3 byte 155 and the unpacker may read six pages. Sides 1-3 have
  `00 00 00 04`, which names side 4.
- The module's bytes `$CA00-$CFFA` take the stream's first 11,399 bits,
  1,424 bytes and 7 bits of the next; every input byte after that is 0,
  and the unpacker turns them into `$00` up to its `$D000` limit, after
  1,431 bytes. Decoded from side 4, the stream gives `entry.vsf`'s
  `$CA00-$CFFF` byte for byte.
- `$CFFA` is `$20`, a code of the stream's value table after the text's
  last message, which ends in bit 3 of `$CFF9`. Nothing reads it: no
  absolute operand of the code is above `$CD28`, and the only pointers
  it builds are `$CD4A`, `$CD56` and `$CC78`.

## How the ending is reached

- Map 20's code starts the countdown (map 20 `$406B-$4088`): it copies
  the elapsed-time count `$04-$06` to `$F4FA-$F4FC`, sets `$F4F9` to 1,
  sets map 20's chance of a random encounter (header `+$2F`) to 0, which
  the game reads as never (game `$B015`), and shakes the screen twice.
- On every pass of its main loop the game checks: when `$F4F9` is set
  and `$04-$06` is `$F0` or more past `$F4FA-$F4FC`, it writes the map
  back and runs module 4 (game `$82B5-$82DC`, called at `$7ED2`). The
  check does not look at where the party is.
- Map 20's clock shows the time left, `$F0` less the units passed, as
  hours, minutes and seconds, a unit being 15 seconds (map 20
  `$408B-$4101`, seconds table `$4102`): the countdown is an hour. A step
  on maps 17-20 adds one unit (header `+$36`), four steps a minute; on
  map 16 a step adds two.
- No class-6 record on the 42 maps has the action `$84` (every word of
  every map's class-6 list).

## The blast

- The module first writes the current map back and sets bit 0 of byte
  `+$4B` in every character record 1 to `$0A` (`$CA00-$CA1C`), which the
  radio's reward reads (radio `$7EC9`).
- It shows picture 0, a domed base among mountains, with the caption
  "  Cochise  " under it, waits, shakes the screen with the engine's
  explosion sound (`$CA4C`, engine `$0746`) and prints message 1, four
  screens beginning "Shuddering explosions rock the base, fire blossoms
  throughout every doorway." (`$CA1E-$CA66`).
- Every party whose map (table byte `+$0A`) is 16 to 20, the five maps of Base Cochise (the outside, 16, and the levels
  inside, 17-20), dies (`$CA73-$CA82`): picture 1, a dark figure against a
  white glare, then for each member CON set to 0, "*name* was killed in
  the blast." and the engine's remove_member, which deletes the record
  (`$CA87-$CABA`). The party's table is removed and the tables after it
  move down (`$CABC-$CB16`). Members of parties elsewhere survive.

## The hilltop and the closing text

- With characters left, the module frames the map and text windows,
  draws the Geiger gauge empty, asks for side 4 and reads two pages from
  T3/L4 as they are (`$CB19-$CB3A`): 64 glyphs, swapped in for the
  font's glyphs `$20-$5F`, which print a vertical "WASTELAND" logo at
  columns 33-36, rows 1-16 (`$CB3D-$CB81`). Beside it comes picture 2,
  a ranger with a rifle on a hilltop and the base below with smoke
  rising, its last column cut from 36 to 32 (`$CB84`, `$CCD7`).
- The closing text goes in the message area: message 6, "The following
  is an excerpt from the dedication to The History of the Rangers, Vol.
  II, by Karl Allard, 2095, Allard Press, Desert Center, Hardbound pp ii,
  $10 gold.", messages 4 and 5, the rangers on a hilltop watching the
  base burn, and message 3, the tribute to the rangers who gave their
  lives, only when someone died in the blast; then "(RETURN)" and a key
  (`$CB89-$CBB8`, `$CC55-$CC77`).
- With no character left there is no hilltop scene, and messages 6 and
  3 go in the text window, each followed by a (RETURN) prompt
  (`$CB19-$CB1B`, `$CBA0-$CBA8`, `$CC7A-$CC84`).
- The three pictures are side 4's T3/L2, T2/L12 and T1/L20, unpacked to
  `$3400`, over the map the module has written back (`$CC92-$CCE2`,
  tables `$CCE5-$CCF0`). Drawn with the engine's own picture code on the
  6502 simulator, from side 4's sectors, they are the scenes named here.

## After the blast

- The module clears `$F4F9`, enters the world map afresh, makes its
  square at column 2, row 3 class 4 number 2 and writes the world map
  back (`$CBBA-$CBE2`). That record, `1A AB FF` at `$4D50` in map 0,
  shows message 26, "The debris littered here is the fireblackened ruins
  of Base Cochise.", and is drawn as tile `$2B`; the square was number 1,
  `00 20 FF`, drawn as tile `$20`.
- The party that was current goes back to its map and position, party 0
  when that party died, and the module returns with the carry set
  (`$CBE5-$CC23`). With no party left it returns with the carry clear,
  and the game's end test then finds no character and loads the death
  screen (`$CC14-$CC25`, game `$7ED5`).
- Entering the party's map, the module unpacks the map's tile layer a
  second time, straight after `enter_map` has done it (`$CC1C-$CC1F`).
- It leaves `$C5` at 1 (`$CCE0`), which stops the engine's animation
  tick from reloading a picture that something has replaced (engine
  `$05C9`). In the program parts only the start-up writes `$C5`
  otherwise (startup `$800C`, `$830B`), so after an ending with
  survivors that reload stays off until the machine is started again
  (traced; its effect on later pictures was not tested).

## Text

- The packed text block is at `$CD56` (`$CC4A-$CC50`), with a group
  table of three words at `$CD92` and messages 0-8: 0 empty, 1 the
  explosion, 2 "*name* was killed in the blast.", 3-6 the closing text,
  7 a (RETURN) prompt and a fresh window, 8 "(RETURN)". The code prints
  each of 1-8 (`$CA5D`, `$CAA6`, `$CAB3`, `$CB89-$CBAA`, `$CC7E`).
- Messages go to the message area through the engine's
  show_map_message, with `$61/$62` pointed for the call at a one-word
  stand-in for a map header, the word `$CD56` at `$CC78`
  (`$CC5F-$CC75`); with no character left, to the text window
  (`$CC45-$CC57`).
